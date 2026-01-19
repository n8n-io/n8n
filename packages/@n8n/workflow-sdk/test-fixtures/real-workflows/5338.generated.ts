return workflow('4nYklCFRD6OxVDKN', '💥 Generate AI Videos with Seedance & Blotato and Upload to TikTok, YouTube & Instagram - version II - vide', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{}] } }, position: [640, 0], name: 'Trigger: Start Daily Content Generation' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: 'Generate a creative concept involving:\n\n[[\nA solid, hard material or element being sliced cleanly with a sharp blade. Your response must follow this structure:\n\n"(Color) (Material) shaped like a (random everyday object)"\n\nFor inspiration, imagine examples like: obsidian shaped like a chess piece, quartz shaped like a coffee mug, sapphire shaped like a seashell, or titanium shaped like a leaf.\n\n]]\n\nReflect carefully before answering to ensure originality and visual appeal.\n\nUse the Think tool to review your output',
      options: {
        systemMessage: '=**Role:**  \nYou are an AI designed to generate **one immersive, realistic idea** based on a user-provided topic. Your output must be formatted as a **single-line JSON array** and follow the rules below exactly.\n\n---\n\n### RULES\n\n1. **Number of ideas**  \n   - Return **only one idea**.\n\n2. **Topic**  \n   - The user will provide a keyword (e.g., “glass cutting ASMR,” “wood carving sounds,” “satisfying rock splits”).\n\n3. **Idea**  \n   - Maximum 13 words.  \n   - Describe a viral-worthy, original, or surreal moment related to the topic.\n\n4. **Caption**  \n   - Short, punchy, viral-friendly.  \n   - Include **one emoji**.  \n   - Exactly **12 hashtags** in this order:  \n     1. 4 topic-relevant hashtags  \n     2. 4 all-time most popular hashtags  \n     3. 4 currently trending hashtags (based on live research)  \n   - All in lowercase.\n\n5. **Environment**  \n   - Maximum 20 words.  \n   - Must match the action in the Idea exactly.  \n   - Specify location (studio table, natural terrain, lab bench…), visual details (dust particles, polished surface, subtle reflections…), and style (macro close-up, cinematic slow-motion, minimalist…).\n\n6. **Sound**  \n   - Maximum 15 words.  \n   - Describe the primary sound for the scene (to feed into an audio model).\n\n7. **Status**  \n   - Always set to `"for production"`.\n\n---\n\n### OUTPUT FORMAT (single-line JSON array)\n\n```json\n[\n  {\n    "Caption": "Your short viral title with emoji #4_topic_hashtags #4_all_time_popular_hashtags #4_trending_hashtags",\n    "Idea": "Your idea under 13 words",\n    "Environment": "Your vivid setting under 20 words matching the action",\n    "Sound": "Your primary sound description under 15 words",\n    "Status": "for production"\n  }\n]\n'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-5-mini',
            cachedResultName: 'gpt-5-mini'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'LLM: Generate Raw Idea (GPT-5)' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1, config: { name: 'Tool: Inject Creative Perspective (Idea)' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '[\n  {\n    "Caption": "Diver Removes Nets Off Whale 🐋 #whalerescue #marinelife #oceanrescue #seahelpers #love #nature #instagood #explore #viral #savenature #oceanguardians #cleanoceans",\n    "Idea": "Diver carefully cuts tangled net from distressed whale in open sea",\n    "Environment": "Open ocean, sunlight beams through water, diver and whale, cinematic realism",\n    "Sound": "Primary sound description under 15 words",\n    "Status": "for production"\n  }\n]\n'
        }, name: 'Parse AI Output (Idea, Environment, Sound)' } }) }, position: [960, 0], name: 'Generate Creative Video Idea' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          id: '==ROW()-1',
          idea: '={{ $json.output[0].Idea }}',
          caption: '={{ $json.output[0].Caption }}',
          production: '={{ $json.output[0].Status }}',
          sound_prompt: '={{ $json.output[0].Sound }}',
          environment_prompt: '={{ $json.output[0].Environment }}'
        },
        schema: [
          {
            id: 'id',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'id',
            defaultMatch: true,
            canBeUsedToMatch: true
          },
          {
            id: 'idea',
            type: 'string',
            display: true,
            required: false,
            displayName: 'idea',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'caption',
            type: 'string',
            display: true,
            required: false,
            displayName: 'caption',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'production',
            type: 'string',
            display: true,
            required: false,
            displayName: 'production',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'environment_prompt',
            type: 'string',
            display: true,
            required: false,
            displayName: 'environment_prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'sound_prompt',
            type: 'string',
            display: true,
            required: false,
            displayName: 'sound_prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'final_output',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'final_output',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['id'],
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
    }, position: [1424, 0], name: 'Save Idea & Metadata to Google Sheets' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '=Give me 3 video prompts based on the previous idea\n\nUse the Think tool to review your output',
      options: {
        systemMessage: '=Role: You are a prompt-generation AI specializing in cinematic, ASMR-style video prompts. Your task is to generate a multi-scene video sequence that vividly shows a sharp knife actively cutting through a specific object in a clean, high-detail setting.\n\nYour writing must follow this style:\n\nSharp, precise cinematic realism.\n\nMacro-level detail with tight focus on the blade interacting with the object.\n\nThe knife must always be in motion — slicing, splitting, or gliding through the material. Never idle or static.\n\nCamera terms are allowed (e.g. macro view, tight angle, over-the-blade shot).\n\nEach scene must contain all of the following, expressed through detailed visual language:\n\n✅ The main object or subject (from the Idea)\n\n✅ The cutting environment or surface (from the Environment)\n\n✅ The texture, structure, and behavior of the material as it’s being cut\n\n✅ A visible, sharp blade actively cutting\n\nDescriptions should show:\n\nThe physical makeup of the material — is it translucent, brittle, dense, reflective, granular, fibrous, layered, or fluid-filled?\n\nHow the material responds to the blade — resistance, cracking, tearing, smooth separation, tension, vibration.\n\nThe interaction between the blade and the surface — light reflection, buildup of particles, contact points, residue or dust.\n\nAny ASMR-relevant sensory cues like particle release, shimmer, or subtle movement, but always shown visually — not narrated.\n\nTone:\n\nClean, clinical, visual.\n\nNo poetic metaphors, emotion, or storytelling.\n\nAvoid fantasy or surreal imagery.\n\nAll description must feel physically grounded and logically accurate.\n\nLength:\n\nEach scene must be between 1,000 and 2,000 characters.\n\nNo shallow or repetitive scenes — each must be immersive, descriptive, and specific.\n\nEach scene should explore a distinct phase of the cutting process, a different camera perspective, or a new behavior of the material under the blade.\n\nInputs:\n\nIdea: "{{ $json.idea }}"\nEnvironment: "{{ $json.environment_prompt }}"\nSound: "{{ $json.sound_prompt }}"\n\nFormat:\n\nIdea: "..."\nEnvironment: "..."\nSound: "..."\n\nScene 1: "..."\nScene 2: "..."\nScene 3: "..."\nScene 4: "..."\nScene 5: "..."\nScene 6: "..."\nScene 7: "..."\nScene 8: "..."\nScene 9: "..."\nScene 10: "..."\nScene 11: "..."\nScene 12: "..."\nScene 13: "..."\n\n'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1, config: { name: 'Tool: Refine and Validate Prompts1' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n  "Idea": "An obsidian rock being sliced with a shimmering knife",\n  "Environment": "Clean studio table, subtle light reflections",\n  "Sound": "Crisp slicing, deep grinding, and delicate crumbling",\n  "Scene 1": "Extreme macro shot: a razor-sharp, polished knife blade presses into the dark, granular surface of an obsidian rock, just beginning to indent.",\n  "Scene 2": "Close-up: fine, iridescent dust particles erupt from the point of contact as the blade cuts deeper into the obsidian, catching the studio light.",\n  "Scene 3": "Mid-shot: the knife, held perfectly steady, has formed a shallow, clean groove across the obsidian\'s shimmering surface, revealing a new, smooth texture."\n}'
        }, name: 'Parse Structured Video Prompt Output' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1',
            cachedResultName: 'gpt-4.1'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'LLM: Draft Video Prompt Details (GPT-4.1)' } }) }, position: [1760, 0], name: 'Generate Detailed Video Prompts' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'function findSceneEntries(obj) {\n  const scenes = [];\n\n  for (const [key, value] of Object.entries(obj)) {\n    if (key.toLowerCase().startsWith("scene") && typeof value === "string") {\n      scenes.push(value);\n    } else if (typeof value === "object" && value !== null) {\n      scenes.push(...findSceneEntries(value));\n    }\n  }\n\n  return scenes;\n}\n\nlet output = [];\n\ntry {\n  const inputData = items[0].json;\n  const scenes = findSceneEntries(inputData);\n\n  if (scenes.length === 0) {\n    throw new Error("No scene keys found at any level.");\n  }\n\n  output = scenes.map(scene => ({ description: scene }));\n} catch (e) {\n  throw new Error("Could not extract scenes properly. Details: " + e.message);\n}\n\nreturn output;\n'
    }, position: [688, 544], name: 'Extract Individual Scene Descriptions' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.wavespeed.ai/api/v3/bytedance/seedance-v1-pro-t2v-480p',
      method: 'POST',
      options: { batching: { batch: { batchSize: 1, batchInterval: 3000 } } },
      jsonBody: '={\n  "aspect_ratio": "9:16",\n  "duration": 10,\n  "prompt": "VIDEO THEME: {{$(\'Generate Detailed Video Prompts\').item.json.output.Idea}} | WHAT HAPPENS IN THE VIDEO: {{$json.description}} | WHERE THE VIDEO IS SHOT: {{$(\'Generate Detailed Video Prompts\').item.json.output.Environment}}"\n}\n',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [880, 544], name: 'Generate Video Clips (seedance)' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 4 }, position: [1088, 544], name: 'Wait for Clip Generation (Wavespeed AI)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.wavespeed.ai/api/v3/predictions/{{ $json.data.id }}/result',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [1280, 544], name: 'Retrieve Video Clips' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/mmaudio-v2 ',
      method: 'POST',
      options: { batching: { batch: { batchSize: 1, batchInterval: 2000 } } },
      jsonBody: '={\n  "prompt": "ASMR Soothing sound effects. {{$(\'Generate Detailed Video Prompts\').item.json.output.Sound}}",\n  "duration": 10,\n  "video_url": "{{$json.data.outputs[0]}}"\n}\n',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [1568, 544], name: 'Generate ASMR Sound (Fal AI)' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 4 }, position: [1760, 544], name: 'Wait for Sound Generation (Fal AI)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/mmaudio-v2/requests/{{ $json.request_id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [1968, 544], name: 'Retrieve Final Sound Output' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'return [\n  {\n    video_urls: items.map(item => item.json.video.url)\n  }\n];'
    }, position: [688, 800], name: 'List Clip URLs for Stitching' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/ffmpeg-api/compose',
      body: '={\n  "tracks": [\n    {\n      "id": "1",\n      "type": "video",\n      "keyframes": [\n        { "url": "{{ $json.video_urls[0] }}", "timestamp": 0, "duration": 10 },\n        { "url": "{{ $json.video_urls[1] }}", "timestamp": 10, "duration": 10 },\n        { "url": "{{ $json.video_urls[2] }}", "timestamp": 20, "duration": 10 }\n      ]\n    }\n  ]\n}',
      method: 'POST',
      options: { batching: { batch: { batchSize: 1, batchInterval: 2000 } } },
      sendBody: true,
      contentType: 'raw',
      authentication: 'genericCredentialType',
      rawContentType: 'application/json',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [880, 800], name: 'Merge Clips into Final Video (Fal AI)' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 4 }, position: [1088, 800], name: 'Wait for Video Rendering (Fal AI)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/ffmpeg-api/requests/{{ $json.request_id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [1280, 800], name: 'Retrieve Final Merged Video' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          idea: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.idea }}',
          production: 'done',
          final_output: '={{ $json.video_url }}'
        },
        schema: [
          {
            id: 'id',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'id',
            defaultMatch: true,
            canBeUsedToMatch: true
          },
          {
            id: 'idea',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'idea',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'caption',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'caption',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'production',
            type: 'string',
            display: true,
            required: false,
            displayName: 'production',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'environment_prompt',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'environment_prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'sound_prompt',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'sound_prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'final_output',
            type: 'string',
            display: true,
            required: false,
            displayName: 'final_output',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'number',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['idea'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: { __rl: true, mode: 'id', value: '=' },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [1968, 800], name: 'URL Final Video' } }))
  .then(node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: { mediaUrl: '={{ $json.final_output }}', resource: 'media' }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [688, 1568], name: 'Upload Video to BLOTATO' } }))
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
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1136, 1184], name: 'Tiktok' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'linkedin',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1446',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1446',
        cachedResultName: 'Samuel Amalric'
      },
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1328, 1184], name: 'Linkedin' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
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
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1504, 1184], name: 'Facebook' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      accountId: {
        __rl: true,
        mode: 'list',
        value: '11892',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/11892',
        cachedResultName: 'doc.firass'
      },
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1136, 1360], name: 'Instagram' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'twitter',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1289',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1289',
        cachedResultName: 'Docteur_Firas'
      },
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1328, 1360], name: 'Twitter (X)' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'youtube',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '8047',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/8047',
        cachedResultName: 'DR FIRASS (Dr. Firas)'
      },
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}',
      postCreateYoutubeOptionTitle: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.idea }}',
      postCreateYoutubeOptionPrivacyStatus: 'private',
      postCreateYoutubeOptionShouldNotifySubscribers: false
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1504, 1360], name: 'Youtube' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'threads',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '2280',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/2280',
        cachedResultName: 'doc.firass'
      },
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1136, 1568], name: 'Threads' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'bluesky',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '6012',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/6012',
        cachedResultName: 'formationinternet.bsky.social'
      },
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1328, 1568], name: 'Bluesky' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'pinterest',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '363',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/363',
        cachedResultName: 'formationinternet2022'
      },
      postContentText: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.caption }}',
      pinterestBoardId: { __rl: true, mode: 'id', value: '1146658823815436667' },
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [1504, 1568], name: 'Pinterest' } })], { version: 3.2, parameters: { mode: 'chooseBranch', numberInputs: 9 } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          idea: '={{ $(\'Save Idea & Metadata to Google Sheets\').first().json.idea }}',
          production: 'Publish'
        },
        schema: [
          {
            id: 'id',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'id',
            defaultMatch: true,
            canBeUsedToMatch: true
          },
          {
            id: 'idea',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'idea',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'caption',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'caption',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'production',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'production',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'environment_prompt',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'environment_prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'sound_prompt',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'sound_prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'final_output',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'final_output',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['idea'],
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
    }, position: [1968, 1376], name: 'Update Status to "DONE"' } }))
  .add(sticky('## | Step 1: Generate Clips (Seedance)\n', { name: 'Sticky Note10', color: 2, position: [592, 464], width: 880, height: 256 }))
  .add(sticky('## | Step 2: Generate Sounds (Fal AI)\n', { name: 'Sticky Note13', color: 2, position: [1504, 464], width: 640, height: 256 }))
  .add(sticky('## | INPUT: Starting Idea Section', { name: 'Sticky Note14', color: 7, position: [592, -96], width: 1560, height: 540 }))
  .add(sticky('## | Step 3: Stitch Video (Fal AI)', { name: 'Sticky Note', color: 3, position: [592, 752], width: 1560, height: 260 }))
  .add(sticky('## | Step 4 — Publish Video to Social Media\n', { name: 'Sticky Note2', color: 4, position: [592, 1040], width: 1560, height: 760 }))
  .add(sticky('# 🎬 Generate AI Videos with Seedance & Blotato, Upload to TikTok, YouTube & Instagram  \n\n---\n\n## 🎥 Full Tutorial  \n\n## [Video Tutorial](https://youtu.be/AzOgpdn8ngY)  \n@[youtube](AzOgpdn8ngY)\n\n---\n\n## 📘 Documentation  \nAccess detailed instructions, API guides, platform connections, and workflow customization:  \n\n📎 [Open full documentation on Notion](https://automatisation.notion.site/Generate-AI-Videos-with-Seedance-Blotato-and-Upload-to-TikTok-YouTube-Instagram-version-II-21d3d6550fd980218096d84f31bfae2d?source=copy_link)\n\n---\n\n## ⚙️ Requirements\n\n1. ✅ **OpenAI API Key** (added in LLM nodes)  \n2. 🎨 **Seedance AI & Wavespeed AI credentials** (for prompt and video clip generation)  \n3. 🔊 **Fal AI API Key** (for sound effects + stitching via ffmpeg API)  \n4. 📦 **n8n installed** (latest version recommended)  \n5. 📝 **Google Sheets connected** (used to log ideas and outputs)  \n   👉 [Google Sheet to copy](https://docs.google.com/spreadsheets/d/1Vd4XjcKZR_8cJ-2uqhOMZGc6GOULuHh_K3iDPvovw9E/copy)  \n6. ☁️ **Blotato API Key + configured social accounts** (TikTok, YouTube, Instagram, etc.)  \n7. ⏰ **Schedule Trigger setup** to define generation/publishing frequency  \n\n---\n\n## 📝 Workflow Steps in n8n\n\n1. **Trigger / Start Node**  \n   Example: scheduled trigger or manual execution.  \n\n2. **Content Creation**  \n   - OpenAI + LangChain generate creative ideas.  \n   - Seedance produces detailed video prompts.  \n   - Wavespeed AI generates video clips.  \n   - Fal AI adds sound + final editing (ffmpeg API).  \n\n3. **Logging & Upload**  \n   - Metadata + links saved in Google Sheets.  \n   - Automatic upload via **Blotato**.  \n   - Publish to TikTok, YouTube, Instagram, etc.  \n\n---\n\n## 🎛 Need help customizing?\n\n**Contact me for consulting and support:** [LinkedIn](https://www.linkedin.com/in/dr-firas/) / [YouTube](https://www.youtube.com/@DRFIRASS)  \n', { name: 'Sticky Note11', color: 6, position: [-128, -96], width: 700, height: 1892 }))