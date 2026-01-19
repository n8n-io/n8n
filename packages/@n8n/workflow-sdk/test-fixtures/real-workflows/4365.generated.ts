return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-1100, -880], name: 'userInput' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 2, config: { parameters: {
      values: {
        string: [
          {
            name: 'Mensaje',
            value: '={{ $(\'userInput\').item.json.message.text }}'
          },
          {
            name: 'sessionId',
            value: '={{ $(\'userInput\').item.json.message.chat.id }}'
          },
          {
            name: 'Lenguaje',
            value: '={{ $(\'userInput\').item.json.message.from.language_code }}'
          },
          {
            name: 'Username',
            value: '={{ $(\'userInput\').item.json.message.chat.username }}'
          }
        ]
      },
      options: {},
      keepOnlySet: true
    }, position: [-980, -880], name: 'sessionData' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.memoryManager', version: 1.1, config: { parameters: { options: { groupMessages: true } }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'sessionData\').item.json.sessionId }}',
          sessionIdType: 'customKey',
          contextWindowLength: 2
        }, name: 'memoryRetriever' } }) }, position: [-860, -880], name: 'conversationStore' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const allItems = $input.all();\nconst lastItem = allItems[allItems.length - 1];\n\nif (lastItem && Array.isArray(lastItem.json.messages)) {\n  const messages = lastItem.json.messages;\n  const count = messages.length;\n\n  if (count === 0) return [{ json: { message: "" } }];\n\n  const extractFirstLine = (text) => {\n    if (!text) return "";\n    return text.split(\'\\n\')[0].replace(/^Input from user:\\s*/, \'\');\n  };\n\n  const trimEndNewline = (text) => {\n    if (!text) return "";\n    return text.replace(/\\n+$/, \'\');\n  };\n\n  // Tomar los últimos dos o menos mensajes\n  const selectedMessages = (count === 1) ? [messages[0]] : messages.slice(-1);\n\n  // Construir el texto concatenado\n  const combinedMessage = selectedMessages.map((msg, idx) => {\n    return `Message ${idx + 1}:\\nhuman: ${extractFirstLine(msg.human)}\\nai: ${trimEndNewline(msg.ai)}`;\n  }).join(\'\\n\\n\');\n\n  return [{ json: { messages: combinedMessage } }];\n}\n\nreturn [{ json: { messages: "" } }];'
    }, position: [-580, -880], name: 'latestContext' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.6, config: { parameters: {
      text: '=1. Context\nYou are an intelligent assistant designed to analyze user requests accurately by considering both the current user input and prior conversation history (if available). Use this context to improve classification and response relevance. Only classify as "generate" if the request clearly meets all criteria. Never assume without certainty.\n\n2. General instructions\n- Use prior conversation history, if available, to interpret references, refinements, or corrections in the user’s message. \n- Apply updates directly when a previous request is being modified (e.g., changing part of a generated image).\n- Maintain context continuity unless the user explicitly shifts the topic.\n- When evaluating intention, prioritize the most recent relevant message to avoid using outdated context.\n- If the message is vague, nonsensical, or overly brief (e.g., a single word), do not classify it as "generate". Even if image requests occurred earlier. Only proceed if the current input clearly meets all criteria. Default to "other" unless the message includes clear direction.\n\n3. User Request: "{{ $(\'sessionData\').item.json.Mensaje }}"\n\n4. Conversation history:\n{{ $json.messages}}\n\n5. Intentions\nClassify the user\'s intention as exactly one of the following:\n- "generate": user requests the direct creation of new visual content (e.g., images or art) to be delivered. This includes implicit requests for physical or tangible objects (e.g., "give me a pet"), but only if the message contains clear intent or is supported by prior context. Single-word or vague inputs without clear directive or context should not be treated as generate.\n- "chat": user engages in meaningful conversational interaction, including requests to generate textual prompts, explanations, or dialogue that have clear context and intent.\n- "other": request does not fit into the above categories, or involves content that is restricted, inappropriate, irrelevant, nonsensical, or lacks clear context or intent distinct from conversational engagement.\n\n6. Data types\nWhen analyzing the user’s message, determine whether a request for a physical or tangible object should be interpreted as a visual content request. In general, treat requests for tangible items as image generation unless the context explicitly suggests otherwise. For intangible content, respond with text unless the user clearly asks for an image.\n\nBased on the intention and content of the request, select exactly one data type to return:\n\n- "text": a textual response such as an answer, explanation, dialogue, or prompt text.\n- "image": a visual response explicitly or implicitly requested as image generation.\n\nAssign "image" as typeData only if the intention is "generate". In all other cases, including when the intention is "other", assign "text".\n\n7. Output format\nRespond only with a JSON object in this exact format, with no additional text or explanation: {"intention": "value", "typeData": "value"}',
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'GeminiModel1' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n	"typeData": "text",\n	"intention": "generate"\n}'
        }, name: 'structuredOutput' } }) }, position: [-460, -880], name: 'inputProcessor' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '70c93816-7110-48e3-a105-568dd766bdf4',
            name: 'prompt',
            type: 'string',
            value: '=1.  General instructions\nCreate a prompt that generates only one response with no comments and no line breaks. Based on the input provided, generate a detailed visual description of the request in a clear and coherent manner. Avoid using quotation marks, apostrophes, or any other punctuation marks.\n\n2. Visual specifications\n- Composition: maintain a balanced and harmonious layout where all elements (images, shapes, and text) work together seamlessly. Ensure that no part of the image feels overcrowded, and the design directs the viewer’s attention naturally. Use a minimalistic approach, avoiding excessive detail or distractions.\n\n- Color palette: choose a color scheme that complements the overall theme and enhances the mood. The colors should be visually pleasing and work together harmoniously. Use no more than 3-4 main colors to maintain simplicity and coherence, ensuring they do not overpower the design.\n\n- Visual clarity: the image should be crisp and clear, with all elements legible and easy to interpret. Avoid blurry or pixelated visuals. Maintain sharp contrasts between key elements for emphasis and visual clarity.\n\n- Image size and resolution: the image should be sized to fit standard display requirements (e.g., social media, web posts). Ensure the resolution is high enough for clarity on both desktop and mobile devices. The image must maintain visual quality without losing sharpness or details when viewed on different screens.\n\n- Aesthetic appeal: aim for a design that is not only functional but also visually appealing. The overall style should be modern, clean, and aesthetically pleasing, with a consistent look that aligns with the intended mood or message. Ensure the design is pleasing to the eye, evoking the intended response from the viewer.\n\n- Visual balance: ensure the elements in the image are well-spaced, with no part feeling too heavy or too light. Create a natural flow of focus, guiding the viewer’s eye through the composition without distraction.'
          }
        ]
      }
    }, position: [0, -1040], name: 'generatePrompt' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'b3ce66e0-2b6f-4714-a672-59ef6e43ced9',
            name: 'prompt',
            type: 'string',
            value: '=1. Rules\n- Communicate formally, clearly, and respectfully at all times.\n- Be concise and precise, avoiding unnecessary details.\n- Maintain a positive, professional tone as a reliable and knowledgeable assistant.\n- Respect user boundaries and refrain from engaging in prohibited or inappropriate topics.\n- Keep the conversation engaging by encouraging user participation, but when requesting clarification or additional information, ask only one focused question at a time to avoid overwhelming the user. Avoid abrupt endings to the dialogue.\n- Follow user instructions precisely.\n- Do not include any additional text or explanations unless explicitly requested.\n\n2. Response instructions\n- Analyze the message and conversation history to maintain context and continuity.\n- If repetition is requested, return the message exactly as provided. Otherwise, respond clearly and appropriately based on intent and context.\n- If the message is vague, suggest an interpretation and ask for clarification while keeping the conversation active.'
          }
        ]
      }
    }, position: [0, -880], name: 'chatPrompt' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'd78c64d5-3c9e-4ffd-875e-973eb3c4d20a',
            name: 'prompt',
            type: 'string',
            value: '=1. Rules\n- Communicate formally, clearly, and respectfully at all times.\n- Be concise and precise, avoiding unnecessary details.\n- Maintain a positive, professional tone as a reliable and knowledgeable assistant.\n- Respect user boundaries and refrain from engaging in prohibited or inappropriate topics.\n- Keep the conversation engaging by encouraging user participation, but when requesting clarification or additional information, ask only one focused question at a time to avoid overwhelming the user. Avoid abrupt endings to the dialogue.\n- Follow user instructions precisely.\n- Do not include any additional text or explanations unless explicitly requested.\n\n2. General Instructions\n- If a message is unclear or lacks details, respond with your best understanding as a suggestion, and politely ask the user to confirm or provide more details if it is not what they meant.\n- If the request is inappropriate or irrelevant, respond politely and clearly refuse, maintaining respect and professionalism, and invite a valid request.\n- Always follow the established rules to maintain professionalism and accuracy.'
          }
        ]
      }
    }, position: [0, -720], name: 'otherPrompt' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'generate',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '24ab5811-2b6d-4f2f-8620-8697dadc2d4d',
                  operator: { type: 'string', operation: 'contains' },
                  leftValue: '={{ $json.output.intention }}',
                  rightValue: 'generate'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'chat',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '28759436-2f6a-4bb3-a9bf-924477241809',
                  operator: { type: 'string', operation: 'contains' },
                  leftValue: '={{ $json.output.intention }}',
                  rightValue: 'chat'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'other',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'de4b6e87-950e-461c-869f-d27c73f8d763',
                  operator: { type: 'string', operation: 'contains' },
                  leftValue: '={{ $json.output.intention }}',
                  rightValue: 'other'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'intentHandler' }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'f435e1c3-6ff9-4e68-852c-0a39a5903ebe',
            name: 'prompt',
            type: 'string',
            value: '={{ $json.prompt }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [140, -880], name: 'buildPrompt' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '=Input from user: {{ $(\'sessionData\').item.json.Mensaje }}\n\n{{ $json.prompt }}\n\nRespond only with the exact text requested, strictly following the instructions above. ',
      options: {
        systemMessage: '=You are a professional enterprise chatbot designed to assist users with clear, respectful, and accurate communication. You provide informative text responses and generate images only upon explicit user requests. Utilize available conversation history to maintain context and coherence. Adhere strictly to company rules to ensure appropriate and secure interactions.\n\nYou can chat with me to get answers and create custom images based on your instructions.\n\nPrioritize the most recent relevant message if multiple prior references exist. Always respond in Spanish when providing text-based chat replies. For image generation requests, respond in English. Keep responses as short as possible without compromising clarity or natural interaction. Do not force interaction with the user beyond what is necessary to respond clearly.'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash-001' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'GeminiModel' } }), memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'sessionData\').item.json.sessionId }}',
          sessionIdType: 'customKey',
          contextWindowLength: 10
        }, name: 'conversationMemory' } }) }, position: [280, -880], name: 'ChatCore' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'd11831d7-533b-4132-9849-612e093d6b32',
            name: 'prompt',
            type: 'string',
            value: '={{ $(\'ChatCore\').item.json.output }} It is mandatory to add a description of the image you are going to make.'
          }
        ]
      }
    }, position: [700, -980], name: 'errorPreprocessor' } }), node({ type: 'n8n-nodes-base.telegram', version: 1, config: { parameters: {
      text: '={{ $(\'ChatCore\').item.json.output }}',
      chatId: '={{ $(\'sessionData\').item.json.sessionId }}',
      additionalFields: { parse_mode: 'HTML', appendAttribution: false }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [1180, -780], name: 'sendTextMessage' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: '=Imagen',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '24ab5811-2b6d-4f2f-8620-8697dadc2d4d',
                  operator: { type: 'string', operation: 'contains' },
                  leftValue: '={{ $(\'intentHandler\').item.json.output.typeData }}',
                  rightValue: 'image'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Texto',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '28759436-2f6a-4bb3-a9bf-924477241809',
                  operator: { type: 'string', operation: 'contains' },
                  leftValue: '={{ $(\'intentHandler\').item.json.output.typeData }}',
                  rightValue: 'text'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'contentType' }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'let texto = $input.first().json.prompt.replace(/[\\n\\r\\t]/g, " ")  // Reemplaza saltos de línea, retorno de carro y tabulaciones por espacio\n  .replace(/[\'"\\\\]/g, "")      // Elimina comillas simples, dobles y barras invertidas\n  .replace(/\\s+/g, " ")        // Reemplaza múltiples espacios por un solo espacio\n  .trim();                     // Elimina los espacios en blanco al inicio y al final\n\nreturn {\n  text: texto\n}'
    }, position: [820, -980], name: 'textCleaner' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "contents": [\n    {\n      "role": "user",\n      "parts": [\n        {\n          "text": "{{ $json.text }}"\n        }\n      ]\n    }\n  ],\n  "generationConfig": {\n    "responseModalities": ["Text", "Image"]\n  }\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googlePalmApi'
    }, credentials: {
      googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
    }, position: [940, -980], name: 'imageGeneration' } }))
  .then(node({ type: 'n8n-nodes-base.convertToFile', version: 1.1, config: { parameters: {
      options: { fileName: 'generated_image.png' },
      operation: 'toBinary',
      sourceProperty: 'candidates[0].content.parts[1].inlineData.data'
    }, position: [1060, -980], name: 'imageBuilder' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1, config: { parameters: {
      chatId: '={{ $(\'sessionData\').item.json.sessionId }}',
      operation: 'sendPhoto',
      binaryData: true,
      additionalFields: { fileName: '=generated_image.png' }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [1180, -980], name: 'sendImage' } }))
  .add(sticky('### 2. Memory and Conversational Context\n\nRetrieves the necessary context to properly infer intentions.\n\n- conversationStore: stores the entire conversation history.\n\n- memoryRetriever: extracts relevant information according to the current need.\n\n- latestContext: formats and prepares the context to be useful in response generation.\n', { name: 'Sticky Note', color: 4, position: [-860, -1240], width: 380, height: 680 }))
  .add(sticky('### 1. Input and Session Management\n\nReceives messages from Telegram and manages the session to maintain context.\n\n- userInput: captures the user\'s message.\n\n- sessionData: saves and updates the session state.\n', { name: 'Sticky Note1', color: 5, position: [-1220, -1240], width: 340, height: 680 }))
  .add(sticky('### 3. Intent Processing and Prompt Generation\nAnalyzes the intention and selects appropriate prompts according to the user\'s intention.\n\n- inputProcessor: detects intention and type of content to send.\n\n- intentHandler: redirects the flow based on the intention.\n\n- generatePrompt, chatPrompt, otherPrompt, buildPrompt: select the prompts for the response.', { name: 'Sticky Note2', color: 6, position: [-460, -1240], width: 700, height: 680 }))
  .add(sticky('### 4. Core of Generation and Conversation Management\nGenerates responses using Google Gemini, integrating context for coherence.\n\n- ChatCore: orchestrates the generation and management of the conversation.\n\n- GeminiModel: creates the final response based on prompts.\n\n- conversationMemory: stores information to maintain coherence.', { name: 'Sticky Note3', color: 3, position: [260, -1240], width: 300, height: 680 }))
  .add(sticky('### 5. Content Classification and User Delivery\n\nDetermines the type of content and manages its delivery via Telegram.\n\n- contentType: defines the output format (text, image, etc.).\n\n- errorPreprocessor, textCleaner: clean and validate the content.\n\n- imageGeneration, imageBuilder: create visual content when necessary.\n\n- sendImage, sendTextMessage: send the content to the user.', { name: 'Sticky Note4', color: 7, position: [580, -1240], width: 800, height: 680 }))