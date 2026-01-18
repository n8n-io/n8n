return workflow('PpVBvs5fecatpTbx', '💥 Viral TikTok Video Machine: Auto-Create UGC with VEED Avatars -vide', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-2832, -304] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'id-1',
            name: 'elevenLabsApiKey',
            type: 'string',
            value: 'YOUR_ELEVENLABS_API_KEY'
          },
          {
            id: 'id-2',
            name: 'elevenLabsVoiceId',
            type: 'string',
            value: 'YOUR_VOICE_ID'
          },
          {
            id: 'id-3',
            name: 'falApiKey',
            type: 'string',
            value: 'YOUR_FAL_API_KEY'
          },
          {
            id: 'id-5',
            name: 'scriptMaxDuration',
            type: 'number',
            value: 30
          },
          {
            id: 'id-6',
            name: 'perplexityModel',
            type: 'string',
            value: 'sonar'
          }
        ]
      },
      includeOtherFields: true
    }, position: [-2560, -304], name: 'Workflow Configuration' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'id-1',
            name: 'photoUrl',
            type: 'string',
            value: '={{ $json.message.photo ? $json.message.photo[$json.message.photo.length - 1].file_id : \'\' }}'
          },
          {
            id: 'id-2',
            name: 'theme',
            type: 'string',
            value: '={{ $json.message.caption || $json.message.text || \'viral content\' }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [-2160, -304], name: 'Extract Photo and Theme' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      fileId: '={{ $json.photoUrl }}',
      resource: 'file',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-1920, -304], name: 'Get Photo File from Telegram' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://tmpfiles.org/api/v1/upload',
      method: 'POST',
      options: { response: { response: { responseFormat: 'json' } } },
      sendBody: true,
      contentType: 'multipart-form-data',
      bodyParameters: {
        parameters: [
          {
            name: 'file',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          }
        ]
      }
    }, position: [-1696, -304], name: 'Build Public Image URL' } }))
  .then(node({ type: 'n8n-nodes-base.perplexity', version: 1, config: { parameters: {
      model: '={{ $(\'Workflow Configuration\').first().json.perplexityModel }}',
      options: {},
      messages: {
        message: [
          {
            content: '={{ \n  "Find the top 3 current viral trends related to: " + $(\'Extract Photo and Theme\').item.json.message.caption + \n  ". Focus on trending topics, hashtags, and content styles that are performing well on TikTok right now. " + \n  "Be specific and actionable. Limit your response strictly to 3 results only — no more." \n}}'
          }
        ]
      },
      requestOptions: {}
    }, credentials: {
      perplexityApi: { id: 'credential-id', name: 'perplexityApi Credential' }
    }, position: [-2816, 128], name: 'Search Trends with Perplexity' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: { __rl: true, mode: 'id', value: 'gpt-4o-mini' },
      options: {},
      messages: {
        values: [
          {
            content: '=Based on these trends: {{ $json.choices[0].message.content }}\n\nCreate a viral 30-second maximum TikTok script about: {{ $(\'Extract Photo and Theme\').first().json.theme }}\n\nRequirements:\n- Maximum 30 seconds when spoken\n- Hook in first 2 seconds\n- Engaging and conversational\n- Optimized for voice synthesis\n- No special characters or formatting\n- Return ONLY the script text, nothing else'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-2560, 128], name: 'Generate Script with GPT-4' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ \'https://api.elevenlabs.io/v1/text-to-speech/\' + $(\'Workflow Configuration\').first().json.elevenLabsVoiceId }}',
      method: 'POST',
      options: {
        response: {
          response: { responseFormat: 'file', outputPropertyName: 'audio' }
        }
      },
      jsonBody: '={{ \n  {\n    "text": $json.message.content,\n    "model_id": "eleven_multilingual_v2",\n    "voice_settings": {\n      "stability": 0.5,\n      "similarity_boost": 0.75\n    }\n  } \n}}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          {
            name: 'xi-api-key',
            value: '={{ $(\'Workflow Configuration\').first().json.elevenLabsApiKey }}'
          },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'audio/mpeg' }
        ]
      }
    }, position: [-2160, 128], name: 'ElevenLabs Voice Synthesis' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'return items.map(item => {\n  const b = item.binary?.audio;            // <-- ta propriété binaire actuelle\n  if (!b) return item;\n\n  // clone sous un nouveau nom de propriété\n  item.binary.audio_mp3 = {\n    ...b,\n    fileName: (b.fileName || \'audio.mp3\').replace(/\\.mpga$/i, \'.mp3\'),\n    mimeType: \'audio/mpeg\'\n  };\n\n  // (optionnel) garder l’original:\n  // delete item.binary.audio;\n\n  return item;\n});\n'
    }, position: [-1920, 128], name: 'Convert .mpga to .mp3' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://tmpfiles.org/api/v1/upload',
      method: 'POST',
      options: { response: { response: { responseFormat: 'json' } } },
      sendBody: true,
      contentType: 'multipart-form-data',
      bodyParameters: {
        parameters: [
          {
            name: 'file',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'audio_mp3'
          }
        ]
      }
    }, position: [-1696, 128], name: 'Upload Audio to Public URL' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://queue.fal.run/veed/fabric-1.0',
      method: 'POST',
      options: {},
      jsonBody: '={{ { "image_url": $(\'Build Public Image URL\').first().json.data.url.replace(/^http:\\/\\/tmpfiles\\.org\\/(\\d+)\\/(.*)$/i, \'https://tmpfiles.org/dl/$1/$2\'), "audio_url": $json.data.url.replace(/^http:\\/\\/tmpfiles\\.org\\/(\\d+)\\/(.*)$/i, \'https://tmpfiles.org/dl/$1/$2\'), "resolution": "480p" } }}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          {
            name: 'Authorization',
            value: '={{ $(\'Workflow Configuration\').first().json.falApiKey }}'
          },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [-2816, 384], name: 'FAL.ai Video Generation' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 10 }, position: [-2576, 384], name: 'Wait for VEED' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/veed/fabric-1.0/requests/{{ $json.request_id }}',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'Authorization',
            value: '={{ $(\'Workflow Configuration\').first().json.falApiKey }}'
          },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [-2352, 384], name: 'Download VEED Video' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: { __rl: true, mode: 'id', value: 'gpt-4o-mini' },
      options: {},
      messages: {
        values: [
          {
            content: '=Create an engaging TikTok caption for a video about: {{ $(\'Extract Photo and Theme\').first().json.theme }}\n\nBased on these trends: {{ $(\'Search Trends with Perplexity\').first().json.choices[0].message.content }}\n\nRequirements:\n- Catchy hook in first line\n- Include 5-8 relevant trending hashtags\n- Keep it concise and engaging\n- Optimize for TikTok algorithm\n- Return ONLY the caption text with hashtags, nothing else'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-2160, 384], name: 'Generate Caption with GPT-4' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          IDEA: '={{ $(\'Extract Photo and Theme\').first().json.message.caption }}',
          CAPTION: '={{ $json.message.content }}',
          'URL AUDIO': '={{ $(\'Upload Audio to Public URL\').first().json.data.url }}',
          'URL IMAGE': '={{ $(\'Build Public Image URL\').first().json.data.url }}',
          'URL VIDEO': '={{ $(\'Download VEED Video\').item.json.video.url }}'
        },
        schema: [
          {
            id: 'IDEA',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'IDEA',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL IMAGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL AUDIO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL AUDIO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'CAPTION',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'CAPTION',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'STATUS',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'STATUS',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['IDEA'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: { __rl: true, mode: 'id', value: '=' },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-1696, 384], name: 'Save to Google Sheets' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      file: '={{ $json[\'URL VIDEO\'] }}',
      chatId: '={{ $(\'Telegram Trigger\').first().json.message.chat.id }}',
      operation: 'sendVideo',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-2816, 784], name: 'Send a video' } }))
  .then(node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      mediaUrl: '={{ $(\'Save to Google Sheets\').item.json[\'URL VIDEO\'] }}',
      resource: 'media'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2624, 784], name: 'Upload Video to BLOTATO' } }))
  .then(merge([node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'tiktok',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '2079',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/2079',
        cachedResultName: 'elitecybzcs'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2416, 608], name: 'Tiktok' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'linkedin',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1446',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1446',
        cachedResultName: 'Samuel Amalric'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2224, 608], name: 'Linkedin' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'facebook',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1759',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1759',
        cachedResultName: 'Firass Ben'
      },
      facebookPageId: {
        __rl: true,
        mode: 'list',
        value: '101603614680195',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1759/subaccounts/101603614680195',
        cachedResultName: 'Dr. Firas'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2048, 608], name: 'Facebook' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1687',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1687',
        cachedResultName: 'acces.a.vie'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2416, 784], name: 'Instagram' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'twitter',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1289',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1289',
        cachedResultName: 'Docteur_Firas'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2224, 784], name: 'Twitter (X)' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'youtube',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '8047',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/8047',
        cachedResultName: 'DR FIRASS (Dr. Firas)'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}',
      postCreateYoutubeOptionTitle: '={{ $(\'Save to Google Sheets\').item.json.IDEA }}',
      postCreateYoutubeOptionPrivacyStatus: 'private',
      postCreateYoutubeOptionShouldNotifySubscribers: false
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2048, 784], name: 'Youtube' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'threads',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '2280',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/2280',
        cachedResultName: 'doc.firass'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2416, 992], name: 'Threads' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'bluesky',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '6012',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/6012',
        cachedResultName: 'formationinternet.bsky.social'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2224, 992], name: 'Bluesky' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'pinterest',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '363',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/363',
        cachedResultName: 'formationinternet2022'
      },
      postContentText: '={{ $(\'Save to Google Sheets\').item.json.CAPTION }}',
      pinterestBoardId: { __rl: true, mode: 'id', value: '1146658823815436667' },
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [-2048, 992], name: 'Pinterest' } })], { version: 3.2, parameters: { mode: 'chooseBranch', numberInputs: 9 }, name: 'Merge1' }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          STATUS: 'DONE',
          'URL VIDEO': '={{ $(\'Save to Google Sheets\').item.json[\'URL VIDEO\'] }}'
        },
        schema: [
          {
            id: 'IDEA',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'IDEA',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL AUDIO',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL AUDIO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'CAPTION',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'CAPTION',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'STATUS',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'STATUS',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['URL VIDEO'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: { __rl: true, mode: 'id', value: '=' },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-1680, 784], name: 'Update Status to "DONE"' } }))
  .add(sticky('# 🚀 VIRAL TIKTOK CREATOR - SETUP GUIDE\n\n### 🎥 Watch This Tutorial\n\n@[youtube](YykmUeGVb9U)\n\n\nThis workflow transforms a photo + theme into viral TikTok content automatically.\n\n📋 WHAT YOU NEED:\n✓ Telegram Bot Token\n✓ ElevenLabs API Key + Voice ID\n✓ veed.io API Key with FAL.ai \n✓ Blotato API Key\n✓ Google Sheets Document\n✓ OpenAI API Key\n✓ Perplexity API Key\n\n## ⚡ Setup\n1. Import this workflow into your n8n instance.  \n2. Connect your Google Sheets, Gmail, and Google Calendar credentials. Tutorial: [Configure Your Google Sheets, Gmail, Calendar Credentials](https://youtu.be/fDzVmdw7bNU)  \n3. Connect Your Data in Google Sheets. Data must follow this format: [Sample Sheets Data](https://docs.google.com/spreadsheets/d/1G1hS5pEJb4PdPYuChl_ZLNCQNH8CaG6iSa-Ip9W1cTI/edit?usp=sharing/copy)  \n\n---\n## 📬 Need Help or Want to Customize This?\n**Contact me for consulting and support:** [LinkedIn](https://www.linkedin.com/in/dr-firas/) / [YouTube](https://www.youtube.com/@DRFIRASS)  ', { name: 'Setup Guide - Start Here', color: 4, position: [-3696, -432], width: 400, height: 1038 }))
  .add(sticky('# 📱 STEP 1: TELEGRAM BOT SETUP\n\n1. Create a Telegram Bot:\n   • Message @BotFather on Telegram\n   • Send /newbot command\n   • Follow prompts to name your bot\n   • Copy the API token provided\n\n2. Configure Telegram Trigger Node:\n   • Click the "Telegram Trigger" node\n   • Add Telegram credentials with your token\n   • Select "Updates" to trigger on: Message, Photo\n   • Save the node\n\n3. Test:\n   • Activate the workflow\n   • Send a photo with caption to your bot\n   • Caption = theme (e.g., "fitness motivation")\n\n✅ Ready when: Bot responds to messages', { name: 'Step 1 - Telegram Setup', color: 4, position: [-3264, -432], width: 1836, height: 524 }))
  .add(sticky('# 🔑 STEP 2: API KEYS CONFIGURATION\n\nConfigure the "Workflow Configuration" node with:\n\n1. ElevenLabs (Voice Synthesis):\n   • Sign up at elevenlabs.io\n   • Get API key from profile settings : https://fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3/api\n   • Create/clone a voice, copy Voice ID\n   • Replace: elevenLabsApiKey, elevenLabsVoiceId\n\n2. FAL.ai (Video Generation):\n   • Sign up at fal.ai\n   • Get API key from dashboard : https://fal.ai/models/veed/fabric-1.0/playground\n   • Replace: falApiKey\n\n✅ All keys added to Workflow Configuration node', { name: 'Step 2 - API Keys Configuration', color: 4, position: [-1520, -432], width: 380, height: 484 }))
  .add(sticky('# 🤖 STEP 3: AI PROCESSING SETUP\n\n1. Perplexity API (Trend Research):\n   • Sign up at perplexity.ai\n   • Get API key from settings\n   • Add credentials to "Search Trends" node\n   • Model: llama-3.1-sonar-large-128k-online\n\n2. OpenAI API (Script & Caption):\n   • Sign up at platform.openai.com\n   • Create API key\n   • Add credentials to both GPT-4 nodes:\n     - "Generate Script with GPT-4"\n     - "Generate Caption with GPT-4"\n   • Model: gpt-4o\n\n3. Use VEED : https://fal.ai/models/veed/fabric-1.0/api\n   • Sign up at https://fal.ai/\n   • Create fal API key', { name: 'Step 3 - AI Processing', color: 5, position: [-3264, 48], width: 1836, height: 484 }))
  .add(sticky('# 🎬 STEP 4: VOICE & VIDEO GENERATION\n\nThese nodes are pre-configured and work automatically:\n\n1. ElevenLabs Voice Synthesis: https://fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3/api\n   • Converts script to natural speech\n   • Uses your cloned voice\n   • Outputs MP3 audio file\n\n2. FAL.ai Video Generation:\n   • Takes your photo + audio\n   • Creates talking video (lip-sync)\n   • Uses VEED Fabric 1.0 model\n   • Syncs mouth movements to audio\n\n3. Download Generated Video:\n   • Retrieves final video file\n   • Prepares for publishing\n\n💡 NO CONFIGURATION NEEDED\n   Just ensure API keys are set in Step 2\n\n✅ Automatic processing - no action required', { name: 'Step 4 - Voice & Video Generation', color: 5, position: [-1520, 48], width: 380, height: 1136 }))
  .add(sticky('\n\n\n\n\n# 📤 STEP 5: PUBLISHING & TRACKING\n\n### Install the Blotato [Blotato](https://blotato.com/?ref=firas) Node in n8n (Community Nodes)\n1. In n8n, open **Settings → Community Nodes**.  \n2. Click **Install**, then add: `@blotato/n8n-nodes-blotato`.  \n3. Log in to **Blotato**.  \n4. Go to **Settings → API Keys**.  \n5. In n8n → **Credentials → New**.  \n6. Choose **Blotato API** \n(provided by the community node you installed).  \n\n2. TikTok Publishing (Blotato):\n   • Pre-configured to auto-publish\n   • Uses caption from GPT-4\n   • Privacy: Public\n   • Requires Blotato API key from Step 2', { name: 'Step 5 - Publishing', color: 5, position: [-3264, 528], width: 2124, height: 660 }))
  .add(sticky('# ⚡ HOW IT WORKS - WORKFLOW FLOW\n\n1️⃣ You send: Photo + Theme via Telegram\n   ↓\n2️⃣ Perplexity finds: Current viral trends\n   ↓\n3️⃣ GPT-4 creates: 10-second viral script\n   ↓\n4️⃣ ElevenLabs generates: Voice audio (MP3)\n   ↓\n5️⃣ FAL.ai creates: Talking video from photo\n   ↓\n6️⃣ GPT-4 writes: Optimized caption + hashtags\n   ↓\n7️⃣ Saves to: Google Sheets (tracking)\n   ↓\n8️⃣ Publishes to: TikTok automatically\n\n⏱️ TOTAL TIME: ~2-3 minutes\n🎯 RESULT: Viral TikTok video published!\n\n💡 USAGE:\n   Send photo with caption "fitness tips"\n   → Get viral fitness video on TikTok', { name: 'How It Works', color: 4, position: [-3696, 640], width: 396, height: 546 }))