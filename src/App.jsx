import React, { useState, useRef, useEffect } from 'react';
import { Send, Minus, Plus } from 'lucide-react';
import './index.css';  
//hi
const TherapyChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [plantHealth, setPlantHealth] = useState(50);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showTestControls, setShowTestControls] = useState(false);
  const chatEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lastSentimentChange, setLastSentimentChange] = useState(0);

  const onboardingMessages = [
    "Hi! I'm your CBT companion. I'm here to help you practice healthier thinking patterns. See that plant? It represents your thought patterns' health. Let's try something - could you share a negative thought you've had recently?",
    "Notice how the plant responded to that negative thought? Now, let's practice reframing. Can you try looking at this situation from a different angle? What's a more balanced way to view it?",
    "Great job! See how the plant grew when you practiced reframing? This is what CBT is all about - learning to recognize and adjust our thought patterns. Would you like to continue practicing?"
  ];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        text: onboardingMessages[0],
        sender: 'therapist',
        isOnboarding: true
      }]);
    }
  }, []);

  const analyzeSentiment = (message) => {
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'never', 'worst', 'hopeless'];
    const cbtPatterns = [
      'realize', 'perspective', 'evidence', 'thinking', 'rational',
      'reframe', 'alternative', 'practice', 'learn', 'growth'
    ];
    
    const hasNegative = negativeWords.some(word => message.toLowerCase().includes(word));
    const hasCBT = cbtPatterns.some(word => message.toLowerCase().includes(word));
    
    if (hasNegative) return -15;
    if (hasCBT) {
      const baseGrowth = 15;
      const remainingGrowth = 100 - plantHealth;
      return baseGrowth * (remainingGrowth / 100);
    }
    return 0;
  };

  const getLeafColor = (health) => {
    const brown = { r: 139, g: 69, b: 19 };
    const green = { r: 76, g: 175, b: 80 };
    
    const r = brown.r + (green.r - brown.r) * (health / 100);
    const g = brown.g + (green.g - brown.g) * (health / 100);
    const b = brown.b + (green.b - brown.b) * (health / 100);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user'
    };
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const requestBody = {
        model: "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
        messages: [
          {
            role: "system",
            content: `You are a CBT therapist helping users practice cognitive behavioral therapy. 
            For each user message, provide TWO things:
            1. A sentiment score from -10 to +10 based on thinking patterns:
               * -10 to -7: Very unhealthy (catastrophizing, black-and-white thinking)
               * -6 to -3: Moderately unhealthy (overgeneralization, emotional reasoning)
               * -2 to +2: Neutral or mixed thinking patterns
               * +3 to +6: Moderately healthy (balanced thinking, evidence-based)
               * +7 to +10: Very healthy (growth mindset, cognitive flexibility)
            2. A therapeutic response

            Format your response exactly like this:
            [SCORE]: <number>
            [RESPONSE]: <your therapeutic response>

            Keep responses concise, supportive, and focused on CBT techniques.`
          },
          {
            role: "user",
            content: inputValue
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      };

      console.log('Sending request...'); // Debug log

      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      const fullResponse = data.choices[0].message.content;
      
      console.log('Raw LLM response:', fullResponse); // Debug log

      // Updated parsing logic
      const scoreMatch = fullResponse.match(/\[([-\d.]+)\]:/);  // Changed from [SCORE] to just []

      if (scoreMatch) {
        const sentimentScore = parseFloat(scoreMatch[1]);
        console.log('Parsed score:', sentimentScore); // Debug log
        
        // Clean up the response text by removing both the score and any [RESPONSE]: tag
        const responseText = fullResponse
          .replace(/\[([-\d.]+)\]:/, '')  // Remove score
          .replace(/\[RESPONSE\]:?/i, '')  // Remove [RESPONSE]: tag (case insensitive)
          .trim();  // Remove extra whitespace

        adjustPlantHealth(sentimentScore);

        setMessages(prev => [...prev, {
          id: Date.now(),
          text: responseText,
          sender: 'therapist',
        }]);
      } else {
        throw new Error('Failed to parse LLM response');
      }

    } catch (error) {
      console.error('Full error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "I'm having trouble connecting. Let's keep focusing on your thoughts.",
        sender: 'therapist',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const adjustPlantHealth = (score) => {
    // Define how much to change the plant by
    const GROWTH_AMOUNT = 10;  // Plant grows/shrinks by 10% each time
    
    // Determine if sentiment is positive or negative
    const healthChange = score > 0 ? GROWTH_AMOUNT : -GROWTH_AMOUNT;
    
    setLastSentimentChange(healthChange);  // Store the change for visual feedback
    
    // Update plant health with limits
    setPlantHealth(prev => {
      const newHealth = Math.max(0, Math.min(100, prev + healthChange));
      return newHealth;
    });
  };

  // Adjust the growth scaling function
  const getSunflowerProgress = (health) => {
    if (health < 55) return 0;
    // More exponential growth curve
    return Math.pow((health - 55) / 45, 0.8); // Adjusted power for smoother growth
  };

  // Add these helper functions
  const getAdditionalPlants = (health) => {
    if (health < 80) return [];
    // Calculate number of additional plants (max 6)
    const extraPlants = Math.min(Math.floor((health - 80) / 3), 6);
    
    return [...Array(extraPlants)].map((_, i) => ({
      id: i,
      x: 40 + (Math.sin(i * 1.5) * 60) + (Math.random() * 20), // Distribute across soil
      scale: 0.6 + (Math.random() * 0.3), // Vary sizes
      progress: (health - 80) / 20, // Growth progress for additional plants
    }));
  };

  // Add helper function for additional flowers
  const getAdditionalFlowers = (health) => {
    if (health < 80) return [];
    const flowerCount = Math.min(Math.floor((health - 80) / 2), 10);
    
    // Array of flower colors
    const flowerColors = [
      '#FF69B4', // Pink
      '#9370DB', // Purple
      '#FF6347', // Tomato
      '#4169E1', // Royal Blue
      '#FF4500', // Orange Red
      '#BA55D3', // Medium Orchid
      '#FF1493', // Deep Pink
      '#1E90FF', // Dodger Blue
      '#FF8C00', // Dark Orange
      '#8A2BE2'  // Blue Violet
    ];

    return [...Array(flowerCount)].map((_, i) => ({
      id: i,
      x: 30 + (i * 15), // Space them horizontally
      color: flowerColors[i],
      progress: (health - 80 - (i * 2)) / 10 // Stagger the growth
    }));
  };

  // Add these helper functions
  const getSunflowerSize = (health) => {
    if (health < 55) return 0;
    return (health - 55) * 0.6;
  };

  // Add this helper function
  const getSwayClass = (health) => {
    return health >= 70 ? "plant-sway" : "";
  };

  // Add this helper function for the stem path
  const getStemPath = (health) => {
    const stemHeight = 120 - health;
    // Add a slight curve that moves side to side
    const swayAmount = health >= 70 ? Math.sin(Date.now() / 1000) * 10 : 0;
    return `M100,120 Q${100 + swayAmount},${120 - health/2} 100,${stemHeight}`;
  };

  // In your SVG, update the stem path:
  {/* Stem - simple straight version */}
  <path
    d={`M100,120 Q100,${120 - plantHealth} 100,${120 - plantHealth}`}
    stroke={getLeafColor(plantHealth)}
    strokeWidth="4"
    fill="none"
    className="transition-all duration-700"
  />

  return (
    <div className="flex h-screen bg-gray-100 p-4 gap-4">
      {/* Left Window - Plant Visualization */}
      <div className="w-1/2 flex flex-col">
        <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Growth Visualization</h2>
              <button
                onClick={() => setShowTestControls(!showTestControls)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showTestControls ? 'Hide Test Controls' : 'Show Test Controls'}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4">
            {/* SVG Container */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-80 h-80">
                <svg 
                  viewBox="0 0 200 250"
                  className="absolute inset-0 w-full h-full transition-all duration-1000"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Pot */}
                  <path
                    d="M50,170 L150,170 L175,120 L25,120 Z"
                    fill="#8B4513"
                  />
                  <path
                    d="M55,170 L145,170 L165,130 L35,130 Z"
                    fill="#A0522D"
                  />

                  {/* Stem */}
                  <path
                    d={`M100,120 Q100,${120 - plantHealth} 100,${120 - plantHealth}`}
                    stroke={getLeafColor(plantHealth)}
                    strokeWidth="4"
                    fill="none"
                    className="transition-all duration-700"
                  />

                  {/* Two Leaves */}
                  {[...Array(2)].map((_, i) => {
                    const yPos = 120 - (Math.min(plantHealth, 55) * (i + 1) / 3);
                    const rotation = Math.sin(i * 0.5) * 15;
                    const leafSize = 0.7 + (Math.sin(i * 1.5) * 0.2);
                    
                    return (
                      <g key={i} className="leaf-grow" style={{ animationDelay: `${i * 0.1}s` }}>
                        {/* Left Leaf */}
                        <path
                          d={`M100,${yPos} 
                             C${100 - 15 * leafSize},${yPos - 10 * leafSize} 
                              ${100 - 30 * leafSize},${yPos - 8 * leafSize} 
                              ${100 - 35 * leafSize},${yPos}
                             C${100 - 30 * leafSize},${yPos + 8 * leafSize}
                              ${100 - 15 * leafSize},${yPos + 10 * leafSize}
                              100,${yPos}`}
                          fill={getLeafColor(plantHealth)}
                          opacity={0.9}
                          transform={`rotate(${rotation}, 100, ${yPos})`}
                        />

                        {/* Right Leaf */}
                        <path
                          d={`M100,${yPos} 
                             C${100 + 15 * leafSize},${yPos - 10 * leafSize} 
                              ${100 + 30 * leafSize},${yPos - 8 * leafSize} 
                              ${100 + 35 * leafSize},${yPos}
                             C${100 + 30 * leafSize},${yPos + 8 * leafSize}
                              ${100 + 15 * leafSize},${yPos + 10 * leafSize}
                              100,${yPos}`}
                          fill={getLeafColor(plantHealth)}
                          opacity={0.9}
                          transform={`rotate(${-rotation}, 100, ${yPos})`}
                        />
                      </g>
                    );
                  })}

                  {/* Sunflower - appears at 55% health */}
                  {plantHealth >= 55 && (
                    <g transform={`translate(100,${120 - plantHealth})`}>
                      {/* Base layer of petals */}
                      <g className="sunflower-spin">
                        {[...Array(12)].map((_, i) => (
                          <path
                            key={`base-${i}`}
                            d={`M0,0 
                               C${5 + getSunflowerSize(plantHealth)},${-2} 
                                ${10 + getSunflowerSize(plantHealth)},${-4} 
                                ${15 + getSunflowerSize(plantHealth)},0
                               C${10 + getSunflowerSize(plantHealth)},${4} 
                                ${5 + getSunflowerSize(plantHealth)},${2} 
                                0,0`}
                            fill="#FFD700"
                            transform={`rotate(${i * 30})`}
                            className="transition-all duration-700"
                          />
                        ))}
                      </g>

                      {/* Second layer of petals offset */}
                      <g className="sunflower-spin" style={{ animationDelay: '-0.5s' }}>
                        {[...Array(12)].map((_, i) => (
                          <path
                            key={`offset-${i}`}
                            d={`M0,0 
                               C${5 + getSunflowerSize(plantHealth)},${-2} 
                                ${10 + getSunflowerSize(plantHealth)},${-4} 
                                ${15 + getSunflowerSize(plantHealth)},0
                               C${10 + getSunflowerSize(plantHealth)},${4} 
                                ${5 + getSunflowerSize(plantHealth)},${2} 
                                0,0`}
                            fill="#FFA000"
                            transform={`rotate(${15 + i * 30})`}
                            className="transition-all duration-700"
                          />
                        ))}
                      </g>

                      {/* Center of flower */}
                      <circle
                        r={8 + getSunflowerSize(plantHealth) * 0.3}
                        fill="#795548"
                        className="transition-all duration-700"
                      />

                      {/* Seed pattern */}
                      <g>
                        {[...Array(8)].map((_, i) => (
                          <circle
                            key={i}
                            r={1.5}
                            cx={Math.cos(i * Math.PI / 4) * 4}
                            cy={Math.sin(i * Math.PI / 4) * 4}
                            fill="#3E2723"
                            className="transition-all duration-700"
                          />
                        ))}
                      </g>
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Health Bar */}
            <div className="mt-4 w-full">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${plantHealth}%` }}
                />
              </div>
              <p className="text-center mt-2 text-sm text-gray-600">
                Plant Health: {plantHealth.toFixed(1)}%
              </p>
            </div>

            {/* Test Controls */}
            {showTestControls && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Test Controls</p>
                <div className="flex justify-between items-center gap-4">
                  <button
                    onClick={() => adjustPlantHealth(-15)}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Minus size={16} /> Wilt Plant
                  </button>
                  <button
                    onClick={() => adjustPlantHealth(15)}
                    className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Grow Plant
                  </button>
                </div>
                <div className="mt-2">
                  <input
                    type="range"
                    min="0"
                    max="99.9"
                    step="0.1"
                    value={plantHealth}
                    onChange={(e) => setPlantHealth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Window - Chat Interface */}
      <div className="w-1/2 flex flex-col">
        <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">CBT Therapy Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isOnboarding
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-gray-200'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="mb-4 flex justify-start">
                <div className="typing-indicator">
                  <div className="typing-circle"></div>
                  <div className="typing-circle"></div>
                  <div className="typing-circle"></div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 p-2 border rounded-lg"
                placeholder="Type your message..."
              />
              <button
                type="button"
                onClick={sendMessage}
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                disabled={!inputValue.trim()}
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TherapyChat;
