return workflow('cmncRJ2rlecEwZxU', '[Agent Circle\'s N8N Workflow] Automated AI Image Creator', { executionOrder: 'v1' })
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [20, 200], name: 'When chat message received' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '4e04fec4-441e-45f7-acea-0017a4b5c104',
            name: 'model',
            type: 'string',
            value: 'flux'
          },
          {
            id: 'aa80cd68-1c82-4032-b1d7-e098856eec38',
            name: 'width',
            type: 'string',
            value: '1080'
          },
          {
            id: 'da6d305f-aece-49bd-ae02-52df59915c60',
            name: 'height',
            type: 'string',
            value: '1920'
          }
        ]
      }
    }, position: [240, 100], name: 'Fields - Set Values' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $(\'When chat message received\').item.json.chatInput }}',
      options: {
        systemMessage: '=You are an AI image‑prompt creation expert. Please create a post using the following JSON format:\nAI Image Generation Prompt Guidelines:\nObjective\nCreate highly realistic, high‐quality images\nEnsure the image content faithfully conveys the spirit of the original text\nIntegrate short text (10–20 characters) naturally into the image\nMaintain consistency and professionalism\n\nStandard Prompt Structure\n[Main Scene] | [Key Elements] | [Text Integration] | [Lighting & Atmosphere] | [Technical Parameters] | [Style Parameters]\n\nComponent Breakdown\n1. Main Scene (Weight ::8)\nDescribe the primary setting in line with the content.\nExamples:\nTech news: “modern tech office setting, minimalist workspace”\nEconomy news: “professional financial district, corporate environment”\nEducation news: “modern classroom, advanced learning environment”\n\n2. Key Elements (Weight ::8)\nList the main visual elements required.\nExamples:\n“large HD display showing text ‘AI Ethics’ in modern typography”\n“professional people in business attire discussing around interactive screen”\n“detailed infographic elements floating in augmented reality style”\n\n3. Text Integration (Weight ::7)\nHow to display text within the image:\ntext elements | elegant typography, clear readable text, integrated naturally into scene ::7\n\n4. Lighting & Atmosphere (Weight ::7)\nlighting | cinematic dramatic lighting, natural ambient light, professional studio setup ::7\nbackground | depth of field blur, clean professional environment ::6\n\n5. Technical Parameters\nparameters | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 16:9\nsettings | sharp focus, high detail, professional photography --s 1000 --q 2\nComplete Examples\nExample 1: AI Ethics News\nprofessional tech conference room | large display showing "AI Ethics Now" in modern typography, group of diverse executives in discussion ::8 | clean modern workspace, glass walls, tech atmosphere ::7 | cinematic lighting, natural window light ::7 | 8k resolution, hyperrealistic quality, octane render --ar 16:9 --s 1000 --q 2\nExample 2: Financial Market News\nmodern stock exchange environment | giant LED wall showing "Market Alert" in bold typography, professional traders in action ::8 | dynamic financial data visualization, sleek modern interior ::7 | dramatic lighting, blue-tinted atmosphere ::7 | 8k resolution, photorealistic quality --ar 16:9 --s 1000 --q 2\n\nAdditional Parameters\n--chaos [0–100]: Adjust randomness\n--stylize [0–1000]: Degree of stylization\n--seed [number]: Ensure consistency across generations\n--niji: Optimized for Asian‐style aesthetics\n--v 5.2: Use the latest model version\n\nImportant Notes\nText in Image\nKeep it short and legible\nUse professional fonts\nIntegrate naturally into the scene\n\nComposition\nFollow the rule of thirds\nEnsure a clear focal point\nBalance text and imagery\n\nColor\nMatch a professional tone\nProvide sufficient contrast for readability\nMaintain visual consistency\n\nTechnical Details\nAlways use high resolution (8k)\nEnsure professional lighting\nOptimize for sharpness and detail\n\nCommon Pitfalls to Avoid\nOverly generic prompts\nMissing text‐integration guidance\nFailing to specify composition rules\nOmitting key technical parameters\n\nThe structure is:\n{\n  prompt_image {prompt : "" , ...}\n}'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: {
          options: {
            topK: 40,
            topP: 1,
            temperature: 0.5,
            safetySettings: {
              values: [
                {
                  category: 'HARM_CATEGORY_HARASSMENT',
                  threshold: 'BLOCK_NONE'
                },
                {
                  category: 'HARM_CATEGORY_HATE_SPEECH',
                  threshold: 'BLOCK_NONE'
                },
                {
                  category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                  threshold: 'BLOCK_NONE'
                },
                {
                  category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                  threshold: 'BLOCK_NONE'
                }
              ]
            },
            maxOutputTokens: 65536
          },
          modelName: 'models/gemini-2.0-flash'
        }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [540, 100], name: 'AI Agent - Create Image From Prompt' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'function cleanAndExtractJSON(response) {\n    try {\n        const result = {\n            image_prompt: []\n        };\n\n        const lines = response.split(\'\\n\');\n        let currentPrompt = \'\';\n\n        for (const line of lines) {\n            if (line.includes(\'"prompt":\')) {\n                if (currentPrompt) {\n                    result.image_prompt.push(currentPrompt.trim());\n                }\n                currentPrompt = line.split(\'"prompt":\')[1].trim();\n            }\n        }\n\n        if (currentPrompt) {\n            result.image_prompt.push(currentPrompt.trim());\n        }\n\n        return { json: result };\n        \n    } catch (error) {\n        return { \n            json: {\n                image_prompt: []\n            }\n        };\n    }\n}\n\nconst response = $input.first().json.output;\nreturn cleanAndExtractJSON(response);'
    }, position: [980, 100], name: 'Code - Clean Json' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'return $input.first().json.image_prompt.map(prompt => ({\n  json: {\n    body: {\n      prompt: prompt,\n  "image_size": {\n    "width": $(\'Fields - Set Values\').first().json.width,\n    "height": $(\'Fields - Set Values\').first().json.height\n  },\n  "num_inference_steps": 12,\n  "guidance_scale": 3.5,\n  "num_images": 1,\n  "enable_safety_checker": true,\n}\n    }\n  }\n));'
    }, position: [1160, 100], name: 'Code - Get Prompt' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'for (let i = 0; i < items.length; i++) {\n  items[i].json.fileName = `images_${(i + 1).toString().padStart(3, \'0\')}.png`;\n}\nreturn items;'
    }, position: [1320, 100], name: 'Code - Set Filename' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://image.pollinations.ai/prompt/ {{ $(\'Code - Get Prompt\').item.json.body.prompt }}',
      options: {},
      jsonQuery: '={\n  "width": {{ $(\'Fields - Set Values\').item.json.width }},\n  "height": {{ $(\'Fields - Set Values\').item.json.height }},\n  "model": "{{ $(\'Fields - Set Values\').item.json.model }}",\n  "seed": 42,\n  "nologo": true\n}',
      sendQuery: true,
      sendHeaders: true,
      specifyQuery: 'json',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'application/json' }
        ]
      }
    }, position: [1600, 100], name: 'HTTP Request - Create Image' } }))
  .add(node({ type: 'n8n-nodes-base.readWriteFile', version: 1, config: { parameters: {
      options: {},
      fileName: '=/files/{{ $(\'Code\').item.json.fileName }}',
      operation: 'write'
    }, position: [1820, 200], name: 'Save Image To Disk' } }))
  .add(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      operation: 'sendPhoto',
      binaryData: true,
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [1820, 0], name: 'Telegram Response' } }))
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, position: [20, 0] } }))
  .add(sticky('## [Agent Circle\'s N8N Workflow] Automated AI Image Creator - Try It Out!\n\n**This n8n template demonstrates how to use AI to generate custom images from scratch - fully automated, prompt-driven, and ready to deploy at scale.**\n\nUse cases are many: You can use it for marketing visuals, character art, digital posters, storyboards, or even daily image generation for your personal purposes.\n\n## How It Works\n- The flow is triggered by a chat message in N8N or via Telegram. The default image size is 1080 x 1920 pixels. To use a different size, update the values in the **“Fields - Set Values”** node before triggering the workflow.\n- The input is parsed into a clean, structured prompt using a multi-step transformation process.\n- Our AI Agent sends the final prompt to Google Gemini’s image model for generation (you can also integrate with OpenAI or other chat models).\n- The raw image data created by the AI Agent will be run through a number of codes to make sure it\'s feasible for your preview if needed and downloading.\n- Then, we use an HTTP node to fetch the result so you can preview the image.\n- You can send it back to the chat message in N8N or Telegram, or save it locally to your disk.\n\n## How To Use\n- Download the workflow package.\n- Import the package into your N8N interface.\n- Set up the credentials in the following nodes for tool access and usability: **"Telegram Trigger"**; **"AI Agent - Create Image From Prompt"**; **"Telegram Response"** or **"Save Image To Disk"** (based on your wish).\n- Activate the **"Telegram Response"** OR **"Save Image To Disk"** node to specify where you want to save your image later.\n- Open the chat interface (via N8N or Telegram).\n- Type your image prompt or detailed descriptions and send.\n- Wait for the process to run and finish in a few seconds.\n- Check the result in your desired saving location.\n\n## Requirements\n- Google Gemini account with image generation access.\n- Telegram bot access and chat setup (optional).\n- Connection to local storage (optional).\n\n## How To Customize\n- We’re setting the default image size to 1080 x 1920 pixels and the default image model to "flux". You can customize both of these values in the **“Fields – Set Values”** node. Supported image model options include: "flux", "kontext", "turbo", and "gptimage".\n- In the **“AI Agent – Create Image From Prompt”** node, you can also change the AI chat model. By default, it uses Google Gemini, but you can easily replace it with OpenAI ChatGPT, Microsoft AI Copilot, or any other compatible provider.\n\n## Need Help?\nJoin our community on different platforms for support, inspiration and tips from others.\n\nWebsite: https://www.agentcircle.ai/\nEtsy: https://www.etsy.com/shop/AgentCircle\nGumroad: http://agentcircle.gumroad.com/\nDiscord Global: https://discord.gg/d8SkCzKwnP\nFB Page Global: https://www.facebook.com/agentcircle/\nFB Group Global: https://www.facebook.com/groups/aiagentcircle/\nX: https://x.com/agent_circle\nYouTube: https://www.youtube.com/@agentcircle\nLinkedIn: https://www.linkedin.com/company/agentcircle', { name: 'Sticky Note1', position: [-680, -760], width: 520, height: 1480 }))
  .add(sticky('## **1. Get The Inputs**\nWe’ll take your image idea from the text you send in the chat, along with any settings like image size or style. This information is parsed and prepared for the image generation step.\n\n', { color: 7, position: [-60, -200], width: 440, height: 620 }))
  .add(sticky('## **2. Use Google Gemini\'s Image Model To Generate The Image**\nYour prompt and settings are sent to Google Gemini’s Image Generation Model.\nPrefer a different model? You can easily swap in alternatives like OpenAI ChatGPT or Microsoft Copilot.\n\n', { name: 'Sticky Note2', color: 7, position: [460, -200], width: 420, height: 620 }))
  .add(sticky('## **4. Preview And Save The Image**\nOnce your image is ready in a downloadable format, you’ll be able to preview it. If you\'re happy with the result, you can save it in one of two ways by activating either of them before running the workflow:\n- As a reply in Telegram chat\n- To your local storage (disk)\n\n\n\n', { name: 'Sticky Note3', color: 7, position: [1540, -200], width: 540, height: 620 }))
  .add(sticky('## **3. Prepare The Final Image Feasible For Preview And Saving**\nThis stage helps to clean up the raw output from the AI Agent for your image request and format it into a complete, ready-to-view and downloadable format. \n', { name: 'Sticky Note4', color: 7, position: [940, -200], width: 520, height: 620 }))