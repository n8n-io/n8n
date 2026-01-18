return workflow('21dF4yje1iQpP4jQ', '💥Clone a viral TikTok and auto-post it to 9 platforms using Perplexity & Blotato vide', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.1, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-620, -280], name: 'Trigger: Get TikTok URL via Telegram' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://tiktok-download-video1.p.rapidapi.com/getVideo?url={{ $json.message.text }}',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'tiktok-download-video1.p.rapidapi.com'
          },
          { name: 'x-rapidapi-key', value: 'YOUR_API_KEY' }
        ]
      }
    }, position: [-400, -280], name: 'Download TikTok Video (RapidAPI)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: { url: '={{ $json.data.origin_cover }}', options: {} }, position: [-180, -280], name: 'Extract Video Thumbnail' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.cloudinary.com/v1_1/YOUR_ID/image/upload',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          {
            name: 'file',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          },
          { name: 'upload_preset', value: 'n8n_clone' }
        ]
      },
      genericAuthType: 'httpBasicAuth'
    }, credentials: {
      httpBasicAuth: { id: 'credential-id', name: 'httpBasicAuth Credential' }
    }, position: [40, -280], name: 'Upload Thumbnail to Cloudinary' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'GPT-4O'
      },
      options: {},
      resource: 'image',
      imageUrls: '={{ $json.url }}',
      operation: 'analyze'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [260, -280], name: 'Analyze Thumbnail (GPT-4o Vision)' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'GPT-4O'
      },
      options: {},
      messages: {
        values: [
          {
            content: '=Identify the primary text located at the top of the image described above:\n{{ $json.content }}\n\nReturn only that specific top text as the output.\n\nDo not include any quotation marks.\n\nFocus only on the top section\'s text in the image and disregard any other content.'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [480, -280], name: 'Extract Overlay Text (GPT-4o)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $(\'Download TikTok Video (RapidAPI)\').item.json.data.music }}',
      options: {}
    }, position: [840, -280], name: 'Download TikTok Audio' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: { options: {}, resource: 'audio', operation: 'transcribe' }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [1060, -280], name: 'Transcribe Audio to Script (GPT)' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Utility to create a random alphanumeric ID\nfunction createUniqueId(length = 12) {\n  const characters = \'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\';\n  let id = \'\';\n  for (let i = 0; i < length; i++) {\n    const randomIndex = Math.floor(Math.random() * characters.length);\n    id += characters[randomIndex];\n  }\n  return id;\n}\n\n// Return the ID in the expected output structure\nreturn [\n  {\n    json: {\n      code: createUniqueId()\n    }\n  }\n];'
    }, position: [1280, -280], name: 'Generate Unique Template ID' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          Caption: '={{ $(\'Download TikTok Video (RapidAPI)\').item.json.data.title }}',
          'ID du modèle': '={{ $json.code }}',
          'Lien de la vidéo': '={{ $(\'Trigger: Get TikTok URL via Telegram\').item.json.message.text }}',
          'Modèle de script vidéo': '={{ $(\'Transcribe Audio to Script (GPT)\').item.json.text }}',
          'Modèle de texte superposé': '={{ $(\'Download TikTok Audio\').item.json.message.content }}'
        },
        schema: [
          {
            id: 'ID du modèle',
            type: 'string',
            display: true,
            required: false,
            displayName: 'ID du modèle',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Lien de la vidéo',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Lien de la vidéo',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Modèle de texte superposé',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Modèle de texte superposé',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Modèle de script vidéo',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Modèle de script vidéo',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Caption',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Caption',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1SoYJvZbVNn4L1FNfk9eFqx_vGlCsMxgw8bx0DVFgBLY/edit#gid=0',
        cachedResultName: 'Template'
      },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [1500, -280], name: 'Save Original Video to Google Sheets' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.perplexity.ai/chat/completions',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "sonar-reasoning",\n  "messages": [\n    {\n      "role": "user",\n      "content": "Suggest a content idea different from this video script: \\"{{ $json[\'Modèle de script vidéo\'] }}\\". It should be in the same niche and on the exact same topic or content idea but offer fresh value. You must pick one idea from your research that matches the topic idea of the video script exactly but is also different and unique from it so it would stand out on social media. Example: if the video script contains a list of tools, your topic must also be a list of tools in that video script topic but slightly different, maybe different tools etc. If the video\'s script is about a plan, strategies, or whatever, you must also make your topic about that. So you must maintain the nature of the topic in the video script. You absolutely must be specific as the original video script. You can\'t just mention generic tools or strategies if the original video script contains specific tools. Etc. That is the level of accuracy and perfect matching of the video script original topic. Make sure it appeals to a broad audience like the example."\n    }\n  ]\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [-620, 60], name: 'Suggest Similar Idea (Perplexity)' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Step 1: Pull raw input\nlet raw = $input.first().json.choices[0].message.content;\n// Step 2: Forcefully remove anything between <think> and </think>\nlet cleaned = raw.replace(/<think>(.|\\n)*?<\\/think>/gi,\n\'\').trim();\n// Optional cleanup: remove leading/trailing blank lines\ncleaned = cleaned.replace(/^\\s+|\\s+$/g, \'\');\n// Done\nreturn [\n{\njson: {\ncleanedResponse: cleaned\n}\n}\n];\n'
    }, position: [-380, 60], name: 'Clean Perplexity Response' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'GPT-4O'
      },
      options: {},
      messages: {
        values: [
          {
            content: '=You are rewriting a TikTok video script, caption, and overlay —\nnot inventing a new one. You must follow this format and obey\nthese rules strictly.\n---\n### CONTEXT:\nHere is the content idea to use:\n{{ $json.cleanedResponse }}\n\n---\n### STEP 1: Rewrite the original video script BELOW using the new\ntopic/context above but maintaiin as stubbornly as possible the\noriginal script structure and style:\nOriginal script: {{ $(\'Save Original Video to Google Sheets\').item.json[\'Modèle de script vidéo\'] }}\n\n\n🛑 DO NOT CHANGE the original structure or style but\nThis includes:\n- Numbered list\n- Sentence breaks\n- "I" or first-person narration\n- Colloquial/informal tone (like “you\'re gonna wanna...”)\n✂️ You MUST keep:\n- first person narration of the orignal script at all costs\n- MUST be under 700 characters (yes "Characters" not wordcount)\nthis is an absolute MUST, no more than 700 characters!!! But never\nchange the structure or narration style of the original script. It\nmust be an exact imitation.\n✏️ You MAY change:\n- Tool names\n- Use cases\n- Descriptions\n- Niche-specific keywords\n\n#Rule: never use any characers like "" in your generated video\nscript as this will yeild syntax errors.\n---\n### STEP 2: Rewrite the caption text using the new topic.\nKeep:\n- Same structure and tone\n- Same use of #hashtags but space between each hashtag\n- Similar sentence count and layout\nCaption:\n{{ $(\'Save Original Video to Google Sheets\').item.json.Caption }}\n\n---\n### STEP 3: Rewrite the text overlay (short version for the\nthumbnail or first screen)\nKeep:\n- EXACT Same length format, case, structure\n- Do NOT invent new words unless absolutely necessary\nOverlay:\n{{ $(\'Save Original Video to Google Sheets\').item.json[\'Modèle de texte superposé\'] }}\n---\n### FINAL OUTPUT FORMAT (no markdown formatting):\nText Overlay: [REWRITTEN TEXT OVERLAY]\nVideo Script: [REWRITTEN SCRIPT]\nCaption Text: [REWRITTEN CAPTION TEXT]\nDO NOT return any explanations. Only return the rewritten\nsections.'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-60, 60], name: 'Rewrite Script, Caption, Overlay (GPT-4o)' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Récupère le contenu du premier item\nconst input = $input.first().json.message.content;\n\n// On tolère les retours à la ligne réels (\\n) ou échappés (\\\\n)\n\n// Text Overlay\nconst textOverlayMatch = input.match(\n  /Text\\s*Overlay:\\s*(.+?)(?:\\r?\\n|\\\\n)/s\n);\n\n// Video Script\nconst videoScriptMatch = input.match(\n  /Video\\s*Script:\\s*(.+?)(?:\\r?\\n|\\\\n)Caption\\s*Text:/s\n);\n\n// Caption Text (jusqu\'à la fin)\nconst captionTextMatch = input.match(\n  /Caption\\s*Text:\\s*(.+)/s\n);\n\nreturn [\n  {\n    json: {\n      textOverlay:   textOverlayMatch   ? textOverlayMatch[1].trim()   : null,\n      videoScript:   videoScriptMatch   ? videoScriptMatch[1].trim()   : null,\n      captionText:   captionTextMatch   ? captionTextMatch[1].trim()   : null,\n    }\n  }\n];\n'
    }, position: [420, 60], name: 'Split Rewritten Content into Sections' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Utility to create a random alphanumeric ID\nfunction createUniqueId(length = 12) {\n  const characters = \'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\';\n  let id = \'\';\n  for (let i = 0; i < length; i++) {\n    const randomIndex = Math.floor(Math.random() * characters.length);\n    id += characters[randomIndex];\n  }\n  return id;\n}\n\n// Return the ID in the expected output structure\nreturn [\n  {\n    json: {\n      code: createUniqueId()\n    }\n  }\n];'
    }, position: [640, 60], name: 'Generate New Video ID' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          Sujet: '={{ $(\'Clean Perplexity Response\').first().json.cleanedResponse }}',
          Script: '={{ $(\'Split Rewritten Content into Sections\').item.json.videoScript }}',
          Caption: '={{ $(\'Split Rewritten Content into Sections\').item.json.captionText }}',
          'ID du modèle': '={{ $(\'Generate Unique Template ID\').first().json.code }}',
          'ID de la vidéo': '={{ $json.code }}',
          'Texte superposé': '={{ $(\'Split Rewritten Content into Sections\').item.json.textOverlay }}'
        },
        schema: [
          {
            id: 'ID du modèle',
            type: 'string',
            display: true,
            required: false,
            displayName: 'ID du modèle',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ID de la vidéo',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'ID de la vidéo',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Sujet',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Sujet',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Texte superposé',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Texte superposé',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Script',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Script',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Caption',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Caption',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL de la vidéo',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL de la vidéo',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Date de publication',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Date de publication',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Statut',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Statut',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: { __rl: true, mode: 'id', value: '=52679157' },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [820, 60], name: 'Save Rewritten Video to Google Sheets' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.captions.ai/api/creator/list',
      method: 'POST',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'x-api-key', value: 'YOUR_API_KEY' }
        ]
      }
    }, position: [-620, 440], name: 'Fetch Available Avatars' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.captions.ai/api/creator/submit',
      method: 'POST',
      options: {},
      jsonBody: '={\n"script": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Script }}",\n"creatorName": "{{ $json.supportedCreators[0] }}",\n"resolution": "fhd"\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'x-api-key', value: 'YOUR_API_KEY' }
        ]
      }
    }, position: [-380, 440], name: 'Generate Video with Avatar' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 3 }, position: [-180, 440], name: 'Wait for Avatar Rendering (3 min)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.captions.ai/api/creator/poll',
      method: 'POST',
      options: {},
      jsonBody: '={\n "operationId": "{{ $json["operationId"] }}"\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'x-api-key', value: 'YOUR_API_KEY' }
        ]
      }
    }, position: [20, 440], name: 'Fetch Avatar Video URL' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.json2video.com/v2/movies',
      method: 'POST',
      options: {},
      jsonBody: '=\n{\n"id": "qbaasr7s",\n"resolution": "instagram-story",\n"quality": "high",\n"scenes": [\n{\n"id": "qyjh9lwj",\n"comment": "Scene 1",\n"elements": []\n}\n],\n"elements": [\n{\n"id": "q6dznzcv",\n"type": "video",\n"src": "{{ $json.url }}",\n"resize": "cover"\n},\n{\n"id": "top-text",\n"type": "text",\n"text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json[\'Texte superposé\'] }}",\n"settings": {\n"font-family": "Arial",\n"font-size": "60px",\n"color": "#000000",\n"background-color": "#FFFFFF",\n"horizontal-position": "center",\n"vertical-position": "top",\n"margin-top": "100px",\n"word-break": "break-word",\n"overflow-wrap": "break-word",\n"font-weight": "bold",\n"text-align": "center",\n"width": "80%",\n"padding": "0px",\n"line-height": "1.2",\n"margin": "50px 0 0 0",\n"padding": "0 10px 0 10px",\n"border-radius": "15px"\n}\n},\n{\n"id": "q41n9kxp",\n"type": "subtitles",\n"settings": {\n"style": "classic",\n"position": "bottom",\n"font-family": "Arial",\n"font-size": "100px",\n"word-color": "#ffd700",\n"shadow-color": "#260B1B",\n"line-color": "#F1E7F4",\n"shadow-offset": 0,\n"box-color": "#260B1B",\n"outline-color": "#000000",\n"outline-width": 8\n},\n"language": "en"\n}\n]\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth'
    }, credentials: {
      httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' }
    }, position: [220, 440], name: 'Add Overlay Text with JSON2Video' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 2 }, position: [420, 440], name: 'Wait for Caption Rendering' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.json2video.com/v2/movies?id={{ $json.project }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth'
    }, credentials: {
      httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' }
    }, position: [620, 440], name: 'Fetch Final Video from JSON2Video' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          'ID de la vidéo': '={{ $(\'Save Rewritten Video to Google Sheets\').item.json[\'ID de la vidéo\'] }}',
          'URL de la vidéo': '={{ $json.movie.url }}'
        },
        schema: [
          {
            id: 'ID du modèle',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'ID du modèle',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ID de la vidéo',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'ID de la vidéo',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Sujet',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Sujet',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Texte superposé',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Texte superposé',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Script',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Script',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Caption',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Caption',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL de la vidéo',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL de la vidéo',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Date de publication',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Date de publication',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Statut',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Statut',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['ID de la vidéo'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 52679157,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1SoYJvZbVNn4L1FNfk9eFqx_vGlCsMxgw8bx0DVFgBLY/edit#gid=52679157',
        cachedResultName: 'MA VIDEO'
      },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [820, 440], name: 'Update Final Video URL in Sheet' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=Url VIDEO : {{ $json[\'URL de la vidéo\'] }}',
      chatId: '={{ $(\'Trigger: Get TikTok URL via Telegram\').item.json.message.chat.id }}',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-600, 920], name: 'Send Video URL via Telegram' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      file: '={{ $(\'Update Final Video URL in Sheet\').item.json[\'URL de la vidéo\'] }}',
      chatId: '={{ $json.result.chat.id }}',
      operation: 'sendVideo',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-400, 920], name: 'Send Final Video Preview' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      mode: 'raw',
      options: {},
      jsonOutput: '{\n  "instagram_id": "0000",\n  "youtube_id": "0000",\n  "threads_id": "0000",\n  "tiktok_id": "0000",\n  "facebook_id": "0000",\n  "facebook_page_id": "+1234567890",\n  "twitter_id": "0000",\n  "linkedin_id": "0000",\n  "pinterest_id": "0000",\n  "pinterest_board_id": "+1234567890000",\n  "bluesky_id": "0000"\n}\n'
    }, position: [-80, 920], name: 'Assign Social Media IDs' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/media',
      method: 'POST',
      options: {},
      sendBody: true,
      sendHeaders: true,
      bodyParameters: {
        parameters: [
          {
            name: 'url',
            value: '={{ $(\'Update Final Video URL in Sheet\').item.json[\'URL de la vidéo\'] }}'
          }
        ]
      },
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [140, 920], name: 'Upload Video to Blotato' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.instagram_id }}",\n    "target": {\n      "targetType": "instagram"\n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "instagram",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: '=YOUR_API_KEY' }]
      }
    }, position: [420, 680], name: 'INSTAGRAM' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.youtube_id }}",\n    "target": {\n      "targetType": "youtube",\n      "title": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json[\'Texte superposé\'] }}",\n      "privacyStatus": "unlisted",\n      "shouldNotifySubscribers": "false"\n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "youtube",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [640, 680], name: 'YOUTUBE' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.tiktok_id }}",\n    "target": {\n      "targetType": "tiktok",\n      "isYourBrand": "false", \n      "disabledDuet": "false",\n      "privacyLevel": "PUBLIC_TO_EVERYONE",\n      "isAiGenerated": "true",\n      "disabledStitch": "false",\n      "disabledComments": "false",\n      "isBrandedContent": "false"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "tiktok",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [840, 680], name: 'TIKTOK' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.facebook_id }}",\n    "target": {\n      "targetType": "facebook",\n      "pageId": "{{ $(\'Assign Social Media IDs\').item.json.facebook_page_id }}"\n\n      \n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "facebook",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [420, 920], name: 'FACEBOOK' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.threads_id }}",\n    "target": {\n      "targetType": "threads"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "threads",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [640, 920], name: 'THREADS' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.twitter_id }}",\n    "target": {\n      "targetType": "twitter"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "twitter",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: '=YOUR_API_KEY' }]
      }
    }, position: [840, 920], name: 'TWETTER' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.linkedin_id }}",\n    "target": {\n      "targetType": "linkedin"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "linkedin",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [420, 1160], name: 'LINKEDIN' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '= {\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.bluesky_id }}",\n    "target": {\n      "targetType": "bluesky"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "bluesky",\n      "mediaUrls": [\n        "https://pbs.twimg.com/media/GE8MgIiWEAAfsK3.jpg"\n      ]\n    }\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [640, 1160], name: 'BLUESKY' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://backend.blotato.com/v2/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.pinterest_id }}",\n    "target": {\n      "targetType": "pinterest",\n      "boardId": "{{ $(\'Assign Social Media IDs\').item.json.pinterest_board_id }}"      \n    },\n    "content": {\n      "text": "{{ $(\'Save Rewritten Video to Google Sheets\').item.json.Caption }}",\n      "platform": "pinterest",\n      "mediaUrls": [\n        "https://pbs.twimg.com/media/GE8MgIiWEAAfsK3.jpg"\n      ]\n    }\n  }\n}\n\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_KEY' }]
      }
    }, position: [840, 1160], name: 'PINTEREST' } }))
  .add(sticky('# 🟫 STEP 1 — Clone a viral TikTok video', { position: [-740, -380], width: 2460, height: 300 }))
  .add(sticky('# 🟦 STEP 2 — Suggest new content idea\n', { name: 'Sticky Note1', color: 4, position: [-740, -20], width: 1920, height: 320 }))
  .add(sticky('# 🟪 STEP 3 — Create the new video with your avatar\n\n', { name: 'Sticky Note2', position: [-740, 340], width: 1920, height: 300 }))
  .add(sticky('# 🟥 STEP 4 — Publish to 9 platforms\n', { name: 'Sticky Note3', color: 3, position: [-740, 660], width: 1920, height: 680 }))