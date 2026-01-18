return workflow('zMtPPjJ80JJznrJP', 'AI-Powered WhatsApp Chatbot for Text, Voice, Images & PDFs', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.whatsAppTrigger', version: 1, config: { parameters: { options: {}, updates: ['messages'] }, credentials: {
      whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' }
    }, position: [-700, 80], name: 'WhatsApp Trigger' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'c53cd9f9-77c1-4331-98ff-bfc9bdf95a3c',
            name: 'text',
            type: 'string',
            value: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].text.body }}'
          }
        ]
      }
    }, position: [1240, -520], name: 'Text' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].audio.id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [460, -180], name: 'Get Audio Url' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].image.id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [480, 120], name: 'Get Image Url' } }), node({ type: 'n8n-nodes-base.if', version: 2.2, config: { parameters: {
      options: {},
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
            id: 'f52d2aaa-e0b2-45e5-8c4b-ceef42182a0d',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.messages[0].document.mime_type }}',
            rightValue: 'application/pdf'
          }
        ]
      }
    }, position: [220, 480], name: 'Only PDF File' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      textBody: '=You can only send text messages, images, audio files and PDF documents.',
      operation: 'send',
      phoneNumberId: '470271332838881',
      additionalFields: {},
      recipientPhoneNumber: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].from }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [-260, 360], name: 'Not supported' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'Text',
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
                  id: '08fd0c80-307e-4f45-b1de-35192ee4ec5e',
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.messages[0].text.body }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Voice',
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
                  id: 'b7b64446-f1ea-4622-990c-22f3999a8269',
                  operator: { type: 'object', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.messages[0].audio }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Image',
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
                  id: '202af928-a324-411a-bf15-68a349e7bf9e',
                  operator: { type: 'object', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.messages[0].image }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Document',
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
                  id: 'c63299e9-6069-4bc6-afb9-7beebf6e3d69',
                  operator: { type: 'object', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.messages[0].document }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: { fallbackOutput: 'extra' }
    }, name: 'Input type' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: {
      text: '={{ $json.text }}',
      options: {
        systemMessage: 'You are an intelligent assistant. Your purpose is to analyze various types of input and provide helpful, accurate responses.\n\nCAPABILITIES:\n- Process and respond to text messages\n- Analyze uploaded files\n- Interpret and describe images\n- Transcribe and understand voice messages\n\nINPUT HANDLING:\n1. For text messages: Analyze the content, understand the intent, and provide a relevant response.\n2. For file analysis: Examine the file content, extract key information, and summarize important points also based on the questions asked.\n3. For image analysis: Describe what you see in the image, identify key elements, and respond to any questions about the image.\n4. For voice messages: Transcribe the audio, understand the message, and respond appropriately.\n\nRESPONSE GUIDELINES:\n- Be concise but thorough\n- Prioritize accuracy over speculation\n- Maintain a professional and helpful tone\n- When uncertain, acknowledge limitations\n- Format responses for easy reading on mobile devices\n- Include actionable information when appropriate\n\nLIMITATIONS:\n- Mention if you\'re unable to process certain file formats\n- Indicate if an image is unclear or if details are difficult to discern\n- Note if audio quality impacts transcription accuracy\n\nSECURITY & PRIVACY:\n- Do not store or remember sensitive information shared in files, images, or voice notes\n- Do not share personal information across different user interactions\n- Inform users about data privacy limitations when relevant\n\nAnalyze all inputs carefully before responding. Your goal is to provide value through accurate information and helpful assistance.'
      },
      promptType: 'define'
    }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '=memory_{{ $(\'WhatsApp Trigger\').item.json.contacts[0].wa_id }}',
          sessionIdType: 'customKey',
          contextWindowLength: 10
        }, name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [160, 1220], name: 'AI Agent1' } }))
  .then(ifBranch([node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      input: '={{ $(\'AI Agent1\').item.json.output }}',
      voice: 'onyx',
      options: {},
      resource: 'audio'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [840, 1080], name: 'Generate Audio Response' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      textBody: '={{ $json.output }}',
      operation: 'send',
      phoneNumberId: '470271332838881',
      additionalFields: {},
      recipientPhoneNumber: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].from }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [840, 1360], name: 'Send message' } })], { version: 2.2, parameters: {
      options: {},
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
            id: 'b9d1d759-f585-4791-a743-b9d72951e77c',
            operator: { type: 'object', operation: 'exists', singleValue: true },
            leftValue: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].audio }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'From audio to audio?' }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'for (const item of $input.all()) {\n  if (item.binary) {\n    const binaryPropertyNames = Object.keys(item.binary);\n    for (const propName of binaryPropertyNames) {\n      if (item.binary[propName].mimeType === \'audio/mp3\') {\n        item.binary[propName].mimeType = \'audio/mpeg\';\n      }\n    }\n  }\n}\n\nreturn $input.all();'
    }, position: [1040, 1080], name: 'Fix mimeType for Audio' } }))
  .then(node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      mediaPath: 'useMedian8n',
      operation: 'send',
      messageType: 'audio',
      phoneNumberId: '470271332838881',
      additionalFields: {},
      recipientPhoneNumber: '={{ $(\'Input type\').item.json.contacts[0].wa_id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [1260, 1080], name: 'Send audio' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [720, -180], name: 'Download Audio' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: { options: {}, resource: 'audio', operation: 'transcribe' }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [960, -180], name: 'Transcribe Audio' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '219577d5-b028-48fc-90be-980f4171ab68',
            name: 'text',
            type: 'string',
            value: '={{ $json.text }}'
          }
        ]
      }
    }, position: [1240, -180], name: 'Audio' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [720, 120], name: 'Download Image' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      text: '=You are an advanced image description AI assistant . Your primary function is to provide detailed, accurate descriptions of images submitted through WhatsApp.\n\nCORE FUNCTIONALITY:\n- When presented with an image, you will analyze it thoroughly and provide a comprehensive description in English.\n- Your descriptions should capture both the obvious and subtle elements within the image.\n\nIMAGE DESCRIPTION GUIDELINES:\n- Begin with a broad overview of what the image contains\n- Describe key subjects, people, objects, and their relationships\n- Note significant visual elements such as colors, lighting, composition, and perspective\n- Identify any text visible in the image\n- Describe the setting or environment\n- Mention any notable actions or events taking place\n- Comment on mood, tone, or atmosphere when relevant\n- If applicable, identify landmarks, famous people, or cultural references\n\nRESPONSE FORMAT:\n- Start with "Image Description:" followed by your analysis\n- Structure your description in a logical manner (general to specific)\n- Use clear, precise language appropriate for visual description\n- Format longer descriptions with paragraphs to enhance readability\n- End with any notable observations that might require special attention\n\nLIMITATIONS:\n- If the image is blurry, low resolution, or difficult to interpret, acknowledge these limitations\n- If an image contains potentially sensitive content, provide a factual description without judgment\n- Do not make assumptions about elements that cannot be clearly determined\n\nYour descriptions should be informative, objective, and thorough, enabling someone who cannot see the image to form an accurate mental picture of its contents.',
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o-mini',
        cachedResultName: 'GPT-4O-MINI'
      },
      options: { detail: 'auto' },
      resource: 'image',
      inputType: 'base64',
      operation: 'analyze'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [960, 120], name: 'Analyze Image' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '67552183-de2e-494a-878e-c2948e8cb6bb',
            name: 'text',
            type: 'string',
            value: '=User request on the image:\n{{ "Describe the following image" || $(\'WhatsApp Trigger\').item.json.messages[0].image.caption }}\n\nImage description:\n{{ $json.content }}'
          }
        ]
      }
    }, position: [1220, 120], name: 'Image' } }))
  .add(node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].document.id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [500, 460], name: 'Get File Url' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [720, 460], name: 'Download File' } }))
  .then(node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'pdf' }, position: [980, 460], name: 'Extract from File' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '67552183-de2e-494a-878e-c2948e8cb6bb',
            name: 'text',
            type: 'string',
            value: '=User request on the file:\n{{ "Describe this file" || $(\'Only PDF File\').item.json.messages[0].document.caption }}\n\nFile content:\n{{ $json.text }}'
          }
        ]
      }
    }, position: [1240, 460], name: 'File' } }))
  .add(node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      textBody: '=Sorry but you can only send PDF files',
      operation: 'send',
      phoneNumberId: '470271332838881',
      additionalFields: {},
      recipientPhoneNumber: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].from }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [500, 700], name: 'Incorrect format' } }))
  .add(sticky('## Text', { position: [120, -560], width: 1340, height: 240 }))
  .add(sticky('## Voice', { name: 'Sticky Note1', position: [120, -240], width: 1340, height: 240 }))
  .add(sticky('## Image', { name: 'Sticky Note2', position: [120, 80], width: 1340, height: 240 }))
  .add(sticky('## Document', { name: 'Sticky Note3', position: [120, 420], width: 1340, height: 240 }))
  .add(sticky('## Response', { name: 'Sticky Note4', color: 5, position: [120, 960], width: 1340, height: 600 }))
  .add(sticky('How to obtain Whatsapp API?\n\n\n### ✅ Prerequisites\nBefore you begin, make sure you have:\n- A **Meta Business Account**\n- A **Facebook Developer Account**\n- A **Verified Business**\n- A **Phone Number** to link to WhatsApp\n- Access to **Meta\'s Graph API Explorer** or **Meta for Developers portal**\n\n---\n\n### 🪜 STEP 1: Create a Meta App\n\n1. Go to [https://developers.facebook.com/apps](https://developers.facebook.com/apps)\n2. Click **“Create App”**\n3. Choose **"Business"** as the app type, then click **Next**\n4. Give your app a name and enter a contact email\n5. Choose your Business Account (or create one)\n6. Click **Create App**\n\n---\n\n### 🪜 STEP 2: Add WhatsApp Product\n\n1. In your app dashboard, scroll down to **"Add a Product"**\n2. Find **"WhatsApp"** and click **“Set Up”**\n3. Link your **Business Manager Account**\n\n---\n\n### 🪜 STEP 3: Create a WhatsApp Business Account (if needed)\n\n1. If you haven’t already, go to [https://business.facebook.com/](https://business.facebook.com/)\n2. Click **“Create Account”**, and complete your business information\n3. Go to **Business Settings > Accounts > WhatsApp Accounts**\n4. Add a **Phone Number** (you\'ll receive a verification code)\n\n---\n\n### 🪜 STEP 4: Generate a Temporary Access Token (for development)\n\n1. In the **App Dashboard**, go to **WhatsApp > Getting Started**\n2. Choose your test phone number\n3. Copy the **temporary access token** (valid for 24 hours)\n4. Copy the **Phone Number ID** and **WhatsApp Business Account ID**\n\n✅ Save these 3 values:\n- **Access Token**\n- **Phone Number ID**\n- **WABA ID**\n\n📝 Tip: For production, you will later need to create a **permanent token** (see step 7).\n\n---\n\n### 🪜 STEP 5: Set Up a Webhook URL (n8n)\n\n1. In n8n, set up a **Webhook node** (or use the `WhatsApp Trigger` node)\n2. Copy the webhook URL\n3. In the Meta Developer Dashboard:\n   - Go to **WhatsApp > Configuration**\n   - Click **“Edit Callback URL”**\n   - Paste your n8n webhook URL and add a random **verify token**\n4. In n8n, configure your webhook to respond to the verification request\n\n---\n\n### 🪜 STEP 6: Subscribe to Webhook Fields\n\n1. Still under **WhatsApp > Configuration**, click **"Manage Subscriptions"**\n2. Enable:\n   - `messages`\n   - `message_status`\n   - (Optionally `message_template_status_update`)\n\n---\n\n### 🪜 STEP 7: (Optional but recommended) Generate a Permanent Token\n\n1. Go to [https://developers.facebook.com/tools/access_token/](https://developers.facebook.com/tools/access_token/)\n2. Select your app\n3. Click **Get Token > System User Token**\n4. Select the permissions:\n   - `whatsapp_business_management`\n   - `whatsapp_business_messaging`\n   - `business_management`\n5. Click **Generate Token**\n6. Copy and securely store this token\n\n---\n\n### 🪜 STEP 8: Configure Credentials in n8n\n\n1. Go to **n8n > Settings > Credentials**\n2. Create new credentials of type **HTTP Header Auth**\n   - **Name:** WhatsApp\n   - **Header Name:** `Authorization`\n   - **Value:** `Bearer <your_access_token>`\n3. Save\n\nThen, in your workflows:\n- Use the HTTP Request node or WhatsApp node\n- Set the `phone_number_id` in the node parameters\n- Connect it to your WhatsApp credential\n\n---\n\n### 🧪 STEP 9: Test the Connection\n\n1. Use a WhatsApp number to send a message to your business phone\n2. Your n8n workflow should be triggered\n3. You can now send and receive messages programmatically 🎉\n', { name: 'Sticky Note5', color: 3, position: [-1580, -1140], width: 780, height: 2680 }))