return workflow('LPUpZtHK7gGRA5wa', 'Automated AI YouTube Shorts Factory for ASMR (Seedance)', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] }
    }, position: [1500, 220] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: 'Generate one short, trendy, and viral ASMR video idea. Describe the core concept in less than 10 words. Do not explain it, just state the idea.',
      options: {
        systemMessage: 'You are an AI that specializes in identifying viral trends on platforms like TikTok and YouTube Shorts. Your job is to brainstorm a single, simple, and satisfying ASMR video concept. You must only return the idea as a single line of plain text. Do not add any extra words, formatting, or explanation.'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: { model: { __rl: true, value: 'gpt-4.1' } }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model1' } }) }, position: [1800, 220], name: '1. Generate Trendy Idea' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '=Take the following trendy ASMR idea and expand it into a full production plan using your required JSON format. Use the examples below for inspiration on how to format the "Idea" field.\n\nThe short ASMR idea is:\n[[\n{{ $json.output }}\n]]\n\nHave your final expanded "Idea" field be in this format: "(color/style) (object) being (action)". \nExamples for your inspiration: layered rainbow kinetic sand being sliced, sparkly purple soap being scooped, neon green slime being pressed.\n\nUse the Think tool to review your output.',
      options: {
        systemMessage: '=**Role**: You are an AI designed to generate 1 immersive, satisfying idea based on a user-provided topic. Your output must be formatted as a JSON array (single line) and follow all the rules below exactly.\n\n***\nRULES:\n\nOnly return 1 idea at a time.\n\nThe user will provide a key topic (e.g. "kinetic sand slicing," "satisfying sand scooping," "ASMR sand sounds").\n\nThe Idea must:\n\nBe under 13 words.\n\nDescribe an interesting and viral-worthy moment, action, or event related to the provided topic.\n\nThe Caption must be:\n\nShort, punchy, and viral-friendly.\n\nInclude one relevant emoji.\n\nInclude exactly 12 hashtags in this order:\n** 4 topic-relevant hashtags\n** 4 all-time most popular hashtags\n** 4 currently trending hashtags\n\nAll hashtags must be lowercase.\n\nSet Status to "for production" (always).\n\nThe Environment must:\n\nBe under 20 words.\n\nMatch the action in the Idea exactly.\n\nClearly describe:\n\nWhere the event is happening (e.g. minimalist white surface, clean studio table)\nKey visuals or background details (e.g. bright lighting, subtle glitter)\nStyle of scene (e.g. macro close-up, cinematic slow-motion)\n\nThe Sound must:\n\nBe under 15 words.\n\nDescribe the primary sound that makes sense to happen in the video. This will be fed to a sound model later on.\n\n\n***\nOUTPUT FORMAT (single-line JSON array):\n\n[\n  {\n    "Caption": "That crunch! 🤤 #kineticsand #satisfyingvideos #asmrsand #sand #oddlysatisfying #viral #fyp #explore #trending #tiktok #diy #crafts",\n    "Idea": "Slicing through a block of layered rainbow kinetic sand",\n    "Environment": "Macro close-up on a clean, bright white surface, cinematic slow-motion",\n    "Sound": "Crisp, crunchy slicing sounds with a soft, gentle hiss",\n    "Status": "for production"\n  }\n]'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1, config: { name: 'Think' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '[\n  {\n    "Caption": "Diver Removes Nets Off Whale 🐋 #whalerescue #marinelife #oceanrescue #seahelpers #love #nature #instagood #explore #viral #savenature #oceanguardians #cleanoceans",\n    "Idea": "Diver carefully cuts tangled net from distressed whale in open sea",\n    "Environment": "Open ocean, sunlight beams through water, diver and whale, cinematic realism",\n    "Sound": "Primary sound description under 15 words",\n    "Status": "for production"\n  }\n]\n'
        }, name: 'Parser' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: { model: { __rl: true, value: 'gpt-4.1' } }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [2200, 220], name: '2. Enrich Idea into Plan' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          idea: '={{ $json.output[0].Idea }}',
          caption: '={{ $json.output[0].Caption }}',
          production: 'In Progress',
          sound_prompt: '={{ $json.output[0].Sound }}',
          environment_prompt: '={{ $json.output[0].Environment }}'
        },
        mappingMode: 'defineBelow'
      },
      options: {},
      operation: 'append',
      sheetName: { __rl: true, value: 'YOUR_SHEET_NAME' },
      documentId: { __rl: true, value: 'YOUR_GOOGLE_SHEET_ID' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [2560, 220], name: '3. Log New Idea to Sheet' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '=Give me 3 video prompts based on the previous \n\nUse the Think tool to review your output',
      options: {
        systemMessage: '=Role: You are a prompt-generation AI specializing in satisfying, ASMR-style video prompts for kinetic sand. Your task is to generate a multi-scene video sequence that vividly shows a tool (like a knife, scoop, or press) interacting with kinetic sand in a clean, high-detail setting.\n\nYour writing must follow this style:\n\nSatisfying, tactile realism.\nMacro-level detail with a tight focus on the tool interacting with the sand\'s unique texture.\nThe tool must always be in motion — slicing, scooping, pressing, or crumbling the sand. Never idle or static.\nCamera terms are allowed (e.g. macro view, top-down shot, slow-motion).\n\nEach scene must contain all of the following, expressed through detailed visual language:\n\n✅ The kinetic sand (from the Idea)\n✅ The environment or surface (from the Environment)\n✅ The texture, structure, and behavior of the sand as it\'s being manipulated\n✅ A visible tool (knife, scoop, mold) actively interacting with the sand\n\nDescriptions should show:\n\nThe physical makeup of the sand — is it layered with different colors, sparkly, smooth, or matte? Emphasize its granular, yet cohesive structure.\nHow the sand responds to the tool — clean slicing, soft crumbling, perfect imprints, satisfying deformation, or a cascading collapse.\nThe interaction between the tool and the sand — sand grains momentarily sticking to the tool, the smooth surface left behind, the crisp edges of a cut.\nAny ASMR-relevant sensory cues like the satisfying crunch, the soft hiss of falling grains, or the shimmer of glitter, but always shown visually — not narrated.\n\nTone:\n\nSatisfying, mesmerizing, tactile.\nNo poetic metaphors, emotion, or storytelling.\nAvoid fantasy or surreal imagery.\nAll description must feel physically grounded and visually appealing.\n\nLength:\n\nEach scene must be between 1,000 and 2,000 characters.\nNo shallow or repetitive scenes — each must be immersive, descriptive, and specific.\nEach scene should explore a distinct phase of the action, a different camera perspective, or a new behavior of the sand.\n\nInputs:\n\nIdea: "{{ $json.idea }}"\nEnvironment: "{{ $json.environment_prompt }}"\nSound: "{{ $json.sound_prompt }}"\n\nFormat:\n\nIdea: "..."\nEnvironment: "..."\nSound: "..."\n\nScene 1: "..."\nScene 2: "..."\nScene 3: "..."\n(and so on)'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1, config: { name: 'Think' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n  "Idea": "An obsidian rock being sliced with a shimmering knife",\n  "Environment": "Clean studio table, subtle light reflections",\n  "Sound": "Crisp slicing, deep grinding, and delicate crumbling",\n  "Scene 1": "Extreme macro shot: a razor-sharp, polished knife blade presses into the dark, granular surface of an obsidian rock, just beginning to indent.",\n  "Scene 2": "Close-up: fine, iridescent dust particles erupt from the point of contact as the blade cuts deeper into the obsidian, catching the studio light.",\n  "Scene 3": "Mid-shot: the knife, held perfectly steady, has formed a shallow, clean groove across the obsidian\'s shimmering surface, revealing a new, smooth texture."\n}'
        }, name: 'Parser2' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: { model: { __rl: true, value: 'gpt-4.1' } }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [2720, 220], name: 'Prompts AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'function findSceneEntries(obj) {\n  const scenes = [];\n\n  for (const [key, value] of Object.entries(obj)) {\n    if (key.toLowerCase().startsWith("scene") && typeof value === "string") {\n      scenes.push(value);\n    } else if (typeof value === "object" && value !== null) {\n      scenes.push(...findSceneEntries(value));\n    }\n  }\n\n  return scenes;\n}\n\nlet output = [];\n\ntry {\n  const inputData = items[0].json;\n  const scenes = findSceneEntries(inputData);\n\n  if (scenes.length === 0) {\n    throw new Error("No scene keys found at any level.");\n  }\n\n  output = scenes.map(scene => ({ description: scene }));\n} catch (e) {\n  throw new Error("Could not extract scenes properly. Details: " + e.message);\n}\n\nreturn output;\n'
    }, position: [3060, 220], name: 'Unbundle Prompts' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.wavespeed.ai/api/v3/bytedance/seedance-v1-lite-t2v-480p',
      body: '={\n  "aspect_ratio": "9:16",\n  "duration": 10,\n  "prompt": "VIDEO THEME: {{ $(\'Prompts AI Agent\').item.json.output.Idea }} | WHAT HAPPENS IN THE VIDEO: {{ $json.description }} | WHERE THE VIDEO IS SHOT: {{ $(\'Prompts AI Agent\').item.json.output.Environment }}"\n}\n',
      method: 'POST',
      options: { batching: { batch: { batchSize: 1, batchInterval: 3000 } } },
      sendBody: true,
      contentType: 'raw',
      authentication: 'genericCredentialType',
      rawContentType: 'application/json',
      genericAuthType: 'httpHeaderAuth'
    }, position: [3260, 220], name: 'Create Clips' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 120 }, position: [3480, 220], name: 'Wait for Clips' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.wavespeed.ai/api/v3/predictions/{{ $json.data.id }}/result',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [3780, 220], name: 'Get Clips' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/mmaudio-v2 ',
      body: '= {\n        "prompt": "ASMR Soothing sound effects. {{ $(\'Prompts AI Agent\').item.json.output.Sound }}",\n        "duration": 10,\n        "video_url": "{{ $json.data.outputs[0] }}"\n  }\n',
      method: 'POST',
      options: { batching: { batch: { batchSize: 1, batchInterval: 2000 } } },
      sendBody: true,
      contentType: 'raw',
      authentication: 'genericCredentialType',
      rawContentType: 'application/json',
      genericAuthType: 'httpHeaderAuth'
    }, position: [3260, 440], name: 'Create Sounds' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 60 }, position: [3480, 440], name: 'Wait for Sounds' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/mmaudio-v2/requests/{{ $json.request_id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [3780, 440], name: 'Get Sounds' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'return [\n  {\n    video_urls: items.map(item => item.json.video.url)\n  }\n];'
    }, position: [3060, 640], name: 'List Elements' } }))
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
    }, position: [3260, 640], name: 'Sequence Video' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 60 }, position: [3480, 640], name: 'Wait for Final Video' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/ffmpeg-api/requests/{{ $json.request_id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [3780, 640], name: 'Get Final Video' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      key: 'idea',
      value: '={{ $(\'Update Final Video to Sheet\').item.json.idea }}',
      columns: {
        value: {
          production: 'Done',
          youtube_url: '=',
          final_output: '={{ $json.video_url }}'
        },
        mappingMode: 'defineBelow'
      },
      operation: 'update',
      sheetName: { __rl: true, value: 'YOUR_SHEET_NAME' },
      documentId: { __rl: true, value: 'YOUR_GOOGLE_SHEET_ID' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [4120, 640], name: 'Update Final Video to Sheet' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $(\'Get Final Video\').item.json.video_url }}',
      options: { response: { response: 'file' } }
    }, position: [4120, 820], name: 'Download Final Video' } }))
  .then(node({ type: 'n8n-nodes-base.youTube', version: 1, config: { parameters: {
      title: '=AI ASMR : {{ $(\'Update Final Video to Sheet\').item.json.idea }}',
      options: {
        tags: '=asmr, viral, asmrai, n8n, automation',
        description: '=AI-Generated Video Idea: {{ $(\'Update Final Video to Sheet\').item.json.idea }}\n\nThis video was created automatically using our automated workflow #asmrai #asmr #n8n',
        privacyStatus: 'public',
        notifySubscribers: true
      },
      resource: 'video',
      operation: 'upload'
    }, credentials: {
      youTubeOAuth2Api: { id: 'credential-id', name: 'youTubeOAuth2Api Credential' }
    }, position: [4320, 820], name: 'Upload to YouTube' } }))
  .add(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      sendTo: 'user@example.com',
      message: '=✅ Your new video is ready!  **Title:** {{ $(\'Update Final Video to Sheet\').item.json.idea }}  Watch it here: https://www.youtube.com/watch?v={{ $(\'Upload to YouTube\').item.json.id }}',
      options: { senderName: 'Bilsimaging -n8n Automation' },
      subject: '✅ Your new video is ready!'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [4600, 1000], name: 'Gmail Notification' } }))
  .add(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=✅ Your new video is ready!  **Title:** {{ $(\'Update Final Video to Sheet\').item.json.idea }}  \nWatch it here: \nhttps://www.youtube.com/watch?v={{ $(\'Upload to YouTube\').item.json.id }}',
      chatId: 'YOUR_CHAT_ID',
      additionalFields: { parse_mode: 'HTML' }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [4600, 820], name: 'Telegram Notification' } }))
  .add(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      key: 'idea',
      value: '={{ $(\'Update Final Video to Sheet\').item.json.idea }}',
      columns: {
        value: {
          youtube_url: '=https://www.youtube.com/watch?v={{ $(\'Upload to YouTube\').item.json.id }}'
        },
        mappingMode: 'defineBelow'
      },
      operation: 'update',
      sheetName: { __rl: true, value: 'YOUR_SHEET_NAME' },
      documentId: { __rl: true, value: 'YOUR_GOOGLE_SHEET_ID' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [4600, 640], name: 'Update Sheet with Youtube Link' } }))
  .add(sticky('### Step 1: AI Brainstorms an Idea\nThis workflow starts with a Schedule Trigger. The first AI agent generates a simple, trendy ASMR concept. The second agent expands this into a full production plan (caption, environment, etc.).', { name: 'Note: AI Ideation', color: 3, position: [1520, 0], width: 940, height: 180 }))
  .add(sticky('### Step 2: Scene Generation & Video Creation\nThe plan is used to generate detailed scene descriptions. Then, we call the Wavespeed AI (Seedance) and Fal AI APIs to create the video clips and sound effects in parallel.', { name: 'Note: Asset Generation', color: 3, position: [2560, 0], width: 600, height: 180 }))
  .add(sticky('### Step 3: Final Assembly\nThe video clips are stitched together.', { name: 'Note: Final Assembly', color: 3, position: [3260, 0], width: 660, height: 180 }))
  .add(sticky('### Step 4: Distribution & Logging\nThe final video is uploaded to YouTube, the Google Sheet is updated, and notifications are sent.', { name: 'Note: Distribution', color: 3, position: [4040, 0], width: 960, height: 180 }))
  .add(sticky('//ASMR AI Workflow By Bilsimaging.com\n### How It Works\n\nThis workflow is a fully autonomous content factory that creates and publishes satisfying ASMR-style YouTube Shorts without any human intervention. It\'s a powerful example of chaining multiple AI services together to generate unique media.\n\nThe process runs in four main stages:\n\n1.  **AI Ideation:** A schedule trigger kicks off the workflow. The first AI agent brainstorms a simple, trendy ASMR concept. A second agent then enriches this concept into a detailed JSON production plan, including a viral-style caption, environment description, and sound profile.\n\n2.  **Asset Generation:** The workflow generates detailed scene-by-scene prompts. It then calls the ByteDance Seedance API (via Wavespeed) to create the video clips and the Fal AI API to generate corresponding sound effects.\n\n3.  **Final Assembly:** The clips are sequenced into a final video. \n\n4.  **Distribution & Logging:** The final video is downloaded, uploaded to a designated YouTube channel, the original row in a Google Sheet is updated with the new YouTube link and a "Done" status, and notifications are sent via Telegram and Gmail.\n\n### Set Up Steps\n\nThis is an advanced workflow that requires several credentials. \n\nYou will need to create credentials for the following services:\n\n*   **OpenAI:** For the AI agents.\n*   **Wavespeed AI:** For the Seedance video model.\n*   **Fal AI:** For sound generation and video sequencing.\n*   **Google OAuth:** For both the Google Sheets and YouTube nodes. You will need to enable the Google Sheets API and YouTube Data API v3 in your Google Cloud project.\n*   **Telegram Bot:** For the final notification.\n*   **Gmail (Optional):** If you want email notifications.\n\nYou will also need to create a **Google Sheet** to log the ideas and final outputs. A template can be easily created with columns for `id`, `idea`, `caption`, `production_status`, `environment_prompt`, `sound_prompt`, `final_output`, and `youtube_url`.\n\n### Features\n\n*   **Fully Autonomous Content Creation:** Runs on a schedule to generate and publish content without any manual input.\n*   **Two-Stage AI Ideation:** Uses a "creative" AI and a "planning" AI to produce more dynamic and well-structured ideas.\n*   **Multi-Modal AI:** Chains together text-to-text, text-to-video, and text-to-audio models in a single, cohesive flow.\n*   **Closed-Loop System:** Logs the initial idea to a Google Sheet and updates the *same row* with the final links and status, creating a perfect production log.\n*   **Spreadsheet as a CMS:** Manage your entire content pipeline from a simple Google Sheet.\n*   **Real-time Notifications:** Get immediate alerts on Telegram or Gmail as soon as a new video is live.\n\n### Pro-Tips & How to Handle APIs\n\n*   **API Rate Limits:** If you run the workflow very frequently, some APIs might temporarily block you. To avoid this, you can adjust the **Schedule Trigger** to run less often (e.g., every 30 minutes instead of every 10). For more advanced control, you can add a `batchInterval` in the settings of the HTTP Request nodes.\n\n\n*   **Cost Management:** Remember that AI API calls cost money. It is highly recommended to set up **budget alerts** in your OpenAI, Fal AI, and Wavespeed AI account dashboards to avoid any surprise bills.\n\n*   **Customization:** The creative core of this workflow is in the **Prompts AI Agent** and **Enrich Idea into Plan** nodes. To change the style, tone, or type of videos created, simply edit the `systemMessage` in the options of these nodes.\n\nFor any help or tips on handling the APIs, don\'t hesitate to contact me at **bilsimaging@gmail.com**.', { name: 'SUBMISSION GUIDE', width: 1320, height: 1240 }))