return workflow('W9fdydWJuXntSK9c', '💥 Automate video ads with NanoBanana, Seedream 4, ChatGPT Image and Veo 3 - VIDE', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [672, 272], name: 'Trigger: Receive Idea via Telegram' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      fileId: '={{ $json.message.photo[2].file_id }}',
      resource: 'file',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [944, 272], name: 'Telegram: Get Image File' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $(\'Trigger: Receive Idea via Telegram\').item.json.message.photo[2].file_unique_id }}',
      driveId: { __rl: true, mode: 'id', value: '=' },
      options: {},
      folderId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1232, 272], name: 'Google Drive: Upload Image' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const text = $(\'Trigger: Receive Idea via Telegram\').first().json.message.caption;\nconst parts = text.split(\';\').map(part => part.trim());\nreturn {\nimagePrompt: parts[0],\nvideoPrompt: parts[1]\n};\n'
    }, position: [1664, 272], name: 'Parse Idea Into Prompts' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      text: '=Your task is to create an image prompt following the system guidelines.  \nEnsure that the reference image is represented as **accurately as possible**, including all text elements.  \n\nUse the following inputs:  \n\n- **User’s description:**  \n{{ $json.imagePrompt }}\n',
      options: {
        systemMessage: '=You are a helpful assistantROLE: UGC Image Prompt Builder  \n\nGOAL:  \nGenerate one concise, natural, and realistic image prompt (≤120 words) from a given product or reference image. The prompt must simulate authentic UGC (user-generated content) photography.  \n\nRULES:  \nYou must always create a professional background for the product image. You must never return the image with a plain white or empty background. The background must always enhance and highlight the product in the photo.\n\n- Always output **one JSON object only** with the key:  \n  - `image_prompt`: (string with full description)  \n- Do **not** add commentary, metadata, or extra keys. JSON only.  \n- User node think to be creative\n\nSTYLE GUIDELINES:  \n- Tone: casual, unstaged, lifelike, handheld snapshot.  \n- Camera cues: include at least 2–3 (e.g., phone snapshot, handheld framing, off-center composition, natural indoor light, soft shadows, slight motion blur, auto exposure, unpolished look, mild grain).  \n- Realism: embrace imperfections (wrinkles, stray hairs, skin texture, clutter, smudges).  \n- Packaging/Text: preserve exactly as visible. Never invent claims, numbers, or badges.  \n- Diversity: if people appear but are unspecified, vary gender/ethnicity naturally; default age range = 21–38.  \n- Setting: default to real-world everyday spaces (home, street, store, gym, office).  \n- User node think to be creative\nYou must always create a professional background for the product image. You must never return the image with a plain white or empty background. The background must always enhance and highlight the product in the photo.\n\nSAFETY:  \n- No copyrighted character names.  \n- No dialogue or scripts. Only describe scenes.  \n\nOUTPUT CONTRACT:  \n- JSON only, no prose outside.  \n- Max 120 words in `image_prompt`.  \n- Must cover: subject, action, mood, setting, background, style/camera, colors, and text accuracy.  \n\nCHECKLIST BEFORE OUTPUT:  \n- Natural handheld tone?  \n- At least 2 camera cues included?  \n- Product text preserved exactly?  \n- Only JSON returned?  \n\n---  \n\n### Example  \n\nGood Example :  \n```json\n{ "image_prompt": "a young adult casually holding a skincare tube near a bathroom mirror; action: dabs small amount on the back of the hand; mood: easy morning; setting: small apartment bathroom with towel on rack and toothbrush cup; background: professional-looking bathroom scene that enhances the product, never plain white or empty, always styled to highlight the tube naturally; style/camera: phone snapshot, handheld framing, off-center composition, natural window light, slight motion blur, mild grain; colors: soft whites and mint label; text accuracy: keep every word on the tube exactly as visible, no added claims" }\n'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1.1, config: { name: 'Think' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'o4-mini',
            cachedResultName: 'o4-mini'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: { jsonSchemaExample: '{\n	"image_prompt": "string"\n}' }, name: 'Structured Output Parser' } }) }, position: [2064, 272], name: 'Generate Image Prompt' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'output.image_prompt' }, position: [2528, 272], name: 'Split out – iterate image_prompt' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/nano-banana/edit',
      method: 'POST',
      options: {},
      jsonBody: '={\n	"prompt": "{{ $json["output.image_prompt"].replace(/\\"/g, \'\\\\\\"\').replace(/\\n/g, \'\\\\n\') }}",\n"image_urls": ["{{ $(\'Google Drive: Upload Image\').item.json.webContentLink }}"]\n\n} ',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2816, 96], name: 'NanoBanana: Create Image' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 4 }, position: [3104, 96], name: 'Wait – NanoBanana job' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.response_url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [3440, 96], name: 'NanoBanana – fetch edited image' } }))
  .then(merge([node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.response_url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [3440, 96], name: 'NanoBanana – fetch edited image' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '04c7d6bf-430a-4423-bd36-d76f8a6ff1c9',
            name: 'url_video',
            type: 'string',
            value: '={{ ($json.data.resultJson.match(/https:\\/\\/tempfile\\.aiquickdraw\\.com\\/r\\/[^\\s"\']+\\.(?:png|jpg|jpeg|mp4|webm)/i)?.[0] || \'\').trim() }}\n\n\n\n'
          }
        ]
      }
    }, position: [3696, 272], name: 'Set – select Seedream image URL' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.kie.ai/api/v1/gpt4o-image/record-info?taskId={{ $json.data.taskId }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [3440, 448], name: 'ChatGPT Image – fetch generated image' } })], { version: 3.2, parameters: { mode: 'chooseBranch', numberInputs: 3 }, name: 'Merge – collect image sources (3 providers)' }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          STATUS: 'CREATE IMAGES',
          'ID IMAGE': '={{ $(\'Trigger: Receive Idea via Telegram\').first().json.message.photo[2].file_unique_id }}',
          'URL IMAGE SOURCE': '={{ $(\'Google Drive: Upload Image\').first().json.webContentLink }}',
          'URL IMAGE CHATGPT': '={{ $(\'ChatGPT Image – fetch generated image\').first().json.data.response.resultUrls[0] }}',
          'URL IMAGE SENDREAM': '={{ $(\'Set – select Seedream image URL\').first().json.url_video }}',
          'URL IMAGE NANOBANANA': '={{ $(\'NanoBanana – fetch edited image\').item.json.images[0].url }}'
        },
        schema: [
          {
            id: 'ID IMAGE',
            type: 'string',
            display: true,
            required: false,
            displayName: 'ID IMAGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SOURCE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL IMAGE SOURCE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE NANOBANANA',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL IMAGE NANOBANANA',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SENDREAM',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL IMAGE SENDREAM',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE CHATGPT',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'URL IMAGE CHATGPT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 1',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 2',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 3',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL FINAL VIDEO',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL FINAL VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ADS TEXT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'ADS TEXT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'STATUS',
            type: 'string',
            display: true,
            required: false,
            displayName: 'STATUS',
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
      sheetName: { __rl: true, mode: 'id', value: '=' },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [4192, 272], name: 'Google Sheets – save image URLs' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'cc2e0500-57b1-4615-82cb-1c950e5f2ec4',
            name: 'json_master',
            type: 'string',
            value: '={\n  "description": "Brief narrative description of the scene, focusing on key visual storytelling and product transformation.",\n  "style": "cinematic | photorealistic | stylized | gritty | elegant",\n  "camera": {\n    "type": "fixed | dolly | Steadicam | crane combo",\n    "movement": "describe any camera moves like slow push-in, pan, orbit",\n    "lens": "optional lens type or focal length for cinematic effect"\n  },\n  "lighting": {\n    "type": "natural | dramatic | high-contrast",\n    "sources": "key lighting sources (sunset, halogen, ambient glow...)",\n    "FX": "optional VFX elements like fog, reflections, flares"\n  },\n  "environment": {\n    "location": "describe location or room (kitchen, desert, basketball court...)",\n    "set_pieces": [\n      "list of key background or prop elements",\n      "e.g. hardwood floors, chain-link fence, velvet surface"\n    ],\n    "mood": "describe the ambient atmosphere (moody, clean, epic...)"\n  },\n  "elements": [\n    "main physical items involved (product box, accessories, vehicles...)",\n    "include brand visibility (logos, packaging, texture...)"\n  ],\n  "subject": {\n    "character": {\n      "description": "optional – physical description, outfit",\n      "pose": "optional – position or gesture",\n      "lip_sync_line": "optional – spoken line if there’s a voiceover"\n    },\n    "product": {\n      "brand": "Brand name",\n      "model": "Product model or name",\n      "action": "description of product transformation or assembly"\n    }\n  },\n  "motion": {\n    "type": "e.g. transformation, explosion, vortex",\n    "details": "step-by-step visual flow of how elements move or evolve"\n  },\n  "VFX": {\n    "transformation": "optional – describe style (neon trails, motion blur...)",\n    "impact": "optional – e.g. shockwave, glow, distortion",\n    "particles": "optional – embers, sparks, thread strands...",\n    "environment": "optional – VFX affecting the scene (ripples, wind...)"\n  },\n  "audio": {\n    "music": "optional – cinematic score, trap beat, ambient tone",\n    "sfx": [\n      "list of sound effects (zip, pop, woosh...)"\n    ],\n    "ambience": "optional – background soundscape (traffic, wind...)",\n    "voiceover": {\n      "delivery": "tone and style (confident, whisper, deep...)",\n      "line": "text spoken if applicable"\n    }\n  },\n  "ending": "Final shot description – what is seen or felt at the end (freeze frame, logo pulse, glow...)",\n  "text": "none | overlay | tagline | logo pulse at end only",\n  "format": "16:9 | 4k | vertical",\n  "keywords": [\n    "brand",\n    "scene style",\n    "motion type",\n    "camera style",\n    "sound mood",\n    "target theme"\n  ]\n}\n'
          },
          {
            id: '3c6ea609-e426-46d3-8617-2e289a833a64',
            name: 'model',
            type: 'string',
            value: 'veo3_fast'
          },
          {
            id: 'f15acf81-840c-4e09-9ff3-1647b634875f',
            name: 'aspectRatio',
            type: 'string',
            value: '9:16'
          }
        ]
      }
    }, position: [672, 736], name: 'Set Master Prompt' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=Create a BEFORE/AFTER transformation video prompt using the provided idea.\n\n**Inputs**\n\n- idea : {{ $(\'Parse Idea Into Prompts\').first().json.videoPrompt }}\n\n**Rules**\n- The style must be cinematic, visually striking, and optimized for vertical 9:16 TikTok content.\n- Explicitly include: BEFORE scene, AFTER scene, TRANSITION style, CAMERA movement, LIGHTING, COLOR PALETTE, and MOOD.\n- Default model: `veo3_fast` (unless otherwise specified).\n- Output only one valid JSON object.\n\n- The JSON object must contain the following keys: title, final_prompt, final_prompt_2, final_prompt_3.\n\n- Create 3 different scenarios for the same product/topic.\n\n- Place each scenario in a separate key:\nfinal_prompt → Scenario 1\nfinal_prompt_2 → Scenario 2\nfinal_prompt_3 → Scenario 3\n\n- Use the Think tool to review your output\n',
      options: {
        systemMessage: '=system_prompt:\n  ## SYSTEM PROMPT: Structured Safe Video Prompt Generator\n  A - Ask:\n    Generate a structured short video prompt for VEO 3 cinematic generation, strictly based on the master schema provided in: {{ $json.json_master }}.\n    Write 3 scenarios for 3 short videos (VEO 3), each lasting about 8 seconds.\n\nThe first scenario should highlight a visual "problem atmosphere" (e.g., dull colors, lack of energy, flat lighting) that sets the stage for the product to improve the scene.\n\nThe second scenario should show a "visual enhancement" instead of a physical transformation (e.g., scene becomes brighter, colors more vibrant, light reflections intensify, foam glows more under sunlight).\n\nThe third scenario should show another "creative enhancement" with a different cinematic angle (e.g., abstract visuals like water, foam, or product bottle under glowing light that shifts into a fresh, uplifting ambiance).\n\n- The final result must be a JSON object with exactly four top-level keys:\n\ntitle → summarizes the overall concept.\nfinal_prompt → contains Scenario 1.\nfinal_prompt_2 → contains Scenario 2.\nfinal_prompt_3 → contains Scenario 3.\n\n  G - Guidance:\n    role: Creative Director\n    output_count: 1\n    character_limit: None\n    constraints:\n      - The output must be valid JSON.\n      - The `title` field should contain a short, descriptive and unique title (max 15 words).\n      - The `final_prompt`, `final_prompt_2`, and `final_prompt_3` fields must contain a **single-line JSON string** that follows the exact structure of {{ $json.json_master }} with all fields preserved.\n      - All final prompts must clearly describe: SCENE, VISUAL ENHANCEMENT (instead of "before/after"), TRANSITION, CAMERA, LIGHTING, PALETTE, STYLE, and SOUND.\n      - Do not include people’s physical traits or body/hair transformations.\n      - Avoid sensitive or restricted terms (e.g., frizzy, smooth, body, face, before/after physical changes).\n      - The focus must be on cinematic visuals, light, environment, abstract product representation, and positive ambiance.\n      - Do not include any explanations, markdown, or extra text — only the JSON object.\n      - Escape all inner quotes in the `final_prompt` string so it is valid as a stringified JSON inside another JSON.\n    tool_usage:\n      - Ensure consistent alignment across all fields (camera, lighting, transition, palette, etc.).\n      - Maintain full structure even for optional fields (use "none", "", or [] as needed).\n\n  N - Notation:\n    format: JSON\n    expected_output:\n      {\n        "title": "A unique short title for the enhancement concept",\n        "final_prompt": "Scenario 1 description here...",\n        "final_prompt_2": "Scenario 2 description here...",\n        "final_prompt_3": "Scenario 3 description here..."\n      }\n'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1, config: { name: 'Think1' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model1' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: {
          jsonSchemaExample: '{\n  "title": "string",\n  "final_prompt": "string",\n  "final_prompt_2": "string",\n  "final_prompt_3": "string"\n}\n'
        }, name: 'Structured Output Parser1' } }) }, position: [880, 736], name: 'AI Agent: Generate Video Script' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// On récupère les prompts depuis l\'agent IA\nconst prompts = items[0].json.output;\n\n// On récupère les images depuis le node "Save Ad Data to Google Sheets1"\nconst urls = $(\'Google Sheets – save image URLs\').first().json;\n\nreturn [\n  { \n    json: { \n      final_prompt: prompts.final_prompt,\n      image_url: urls[\'URL IMAGE NANOBANANA\']\n    } \n  },\n  { \n    json: { \n      final_prompt: prompts.final_prompt_2,\n      image_url: urls[\'URL IMAGE SENDREAM\']\n    } \n  },\n  { \n    json: { \n      final_prompt: prompts.final_prompt_3,\n      image_url: urls[\'URL IMAGE CHATGPT\']\n    } \n  }\n];\n'
    }, position: [1168, 736], name: '3 prompts' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [1424, 784], name: 'Loop Over Items - Split In Batches' } }))
  .add(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: { options: {}, aggregate: 'aggregateAllItemData' }, position: [2576, 768], name: 'Aggregate – gather 3 video URLs' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          'ID IMAGE': '={{ $(\'Google Sheets – save image URLs\').first().json[\'ID IMAGE\'] }}',
          'URL VIDEO 1': '={{ $json.data[0].data.response.resultUrls[0] }}',
          'URL VIDEO 2': '={{ $json.data[1].data.response.resultUrls[0] }}',
          'URL VIDEO 3': '={{ $json.data[2].data.response.resultUrls[0] }}'
        },
        schema: [
          {
            id: 'ID IMAGE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'ID IMAGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SOURCE',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SOURCE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE NANOBANANA',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE NANOBANANA',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SENDREAM',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SENDREAM',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE CHATGPT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE CHATGPT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 1',
            type: 'string',
            display: true,
            required: false,
            displayName: 'URL VIDEO 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 2',
            type: 'string',
            display: true,
            required: false,
            displayName: 'URL VIDEO 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 3',
            type: 'string',
            display: true,
            required: false,
            displayName: 'URL VIDEO 3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL FINAL VIDEO',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL FINAL VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ADS TEXT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'ADS TEXT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'STATUS',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'STATUS',
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
        matchingColumns: ['ID IMAGE'],
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
    }, position: [2848, 768], name: 'Update row in sheet' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://fal.run/fal-ai/ffmpeg-api/merge-videos',
      body: '={\n  "video_urls": [\n    "{{ $json[\'URL VIDEO 1\'] }}",\n    "{{ $json[\'URL VIDEO 2\'] }}",\n    "{{ $json[\'URL VIDEO 3\'] }}"\n  ],\n  "resolution": "portrait_16_9",\n  "output": {\n    "format": "mp4"\n  }\n}\n',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'raw',
      authentication: 'genericCredentialType',
      rawContentType: 'application/json',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [3120, 768], name: 'Merge 3 Videos' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 2 }, position: [3408, 768], name: 'Wait: Merge Process' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          STATUS: 'VIDEO CREATED',
          'ID IMAGE': '={{ $(\'Google Sheets – save image URLs\').first().json[\'ID IMAGE\'] }}',
          'URL FINAL VIDEO': '={{ $json.video.url }}'
        },
        schema: [
          {
            id: 'ID IMAGE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'ID IMAGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SOURCE',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SOURCE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE NANOBANANA',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE NANOBANANA',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SENDREAM',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SENDREAM',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE CHATGPT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE CHATGPT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 1',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 2',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 3',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL FINAL VIDEO',
            type: 'string',
            display: true,
            required: false,
            displayName: 'URL FINAL VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ADS TEXT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'ADS TEXT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'STATUS',
            type: 'string',
            display: true,
            required: false,
            displayName: 'STATUS',
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
        matchingColumns: ['ID IMAGE'],
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
    }, position: [3680, 768], name: 'Update URL Final video' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json[\'URL FINAL VIDEO\'] }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [3936, 768], name: 'Check Merge Status' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $(\'Trigger: Receive Idea via Telegram\').first().json.message.photo[2].file_unique_id }}',
      driveId: { __rl: true, mode: 'id', value: '=' },
      options: {},
      folderId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [4192, 768], name: 'Upload Final Video to Google Drive' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      options: {},
      sheetName: { __rl: true, mode: 'id', value: '=' },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [672, 1344], name: 'Read Brand Settings' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const allRows = $input.all();\nreturn [{\njson: {\nproductName: allRows[0].json.col_2,\nproductCategory: allRows[1].json.col_2,\nmainOffer: allRows[2].json.col_2,\nkeyFeature1: allRows[3].json.col_2,\nkeyFeature2: allRows[4].json.col_2,\nwebsiteURL: allRows[5].json.col_2\n}\n}];'
    }, position: [912, 1344], name: 'Extract Brand Info' } }))
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
            content: '=You are an expert ad copywriter for social media campaigns.\nYour task: Create compelling ad copy following this exact\nstructure:\n🚨 [Attention-grabbing headline with product benefit]\n✔ [Primary offer/benefit]\n✔ [Key product feature/quality]\n✔ [Trust/credibility element]\n[Call to action] → [website/link]\n# Input Variables:\nProduct Name: {{ $json.productName }}\nProduct Category: {{ $json.productCategory }}\nMain Offer: {{ $json.mainOffer }}\nKey Feature 1: {{ $json.keyFeature1 }}\nKey Feature 2: {{ $json.keyFeature2 }}\nWebsite URL: {{ $json.websiteURL }}\nRules:\n- Keep headline under 35 characters\n- Each checkmark line under 40 characters\n- Use power words that create urgency\n- Include specific product benefits, not generic claims\n- CTA must be action-oriented (Shop Now, Get Yours, Claim Offer,\netc.)\n- Output ONLY the ad copy text, no explanations\n- No quotes around the text\n- Maintain the emoji structure exactly as shown'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [1312, 1344], name: 'Message a model' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          'ADS TEXT': '={{ $json.message.content }}',
          'ID IMAGE': '={{ $(\'Trigger: Receive Idea via Telegram\').first().json.message.photo[2].file_unique_id }}'
        },
        schema: [
          {
            id: 'ID IMAGE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'ID IMAGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SOURCE',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SOURCE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE NANOBANANA',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE NANOBANANA',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SENDREAM',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SENDREAM',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE CHATGPT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE CHATGPT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 1',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 2',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 3',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL FINAL VIDEO',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL FINAL VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ADS TEXT',
            type: 'string',
            display: true,
            required: false,
            displayName: 'ADS TEXT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'STATUS',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'STATUS',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['ID IMAGE'],
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
    }, position: [1840, 1344], name: 'Save Ad Data to Google Sheets' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=Url VIDEO :   {{ $(\'Update URL Final video\').first().json[\'URL FINAL VIDEO\'] }}',
      chatId: '={{ $(\'Trigger: Receive Idea via Telegram\').first().json.message.chat.id }}',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [2080, 1344], name: 'Send Video URL via Telegram' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      file: '={{ $(\'Update URL Final video\').first().json[\'URL FINAL VIDEO\'] }}',
      chatId: '={{ $(\'Trigger: Receive Idea via Telegram\').first().json.message.chat.id }}',
      operation: 'sendVideo',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [2304, 1344], name: 'Send a video' } }))
  .then(node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      mediaUrl: '={{ $(\'Update URL Final video\').first().json[\'URL FINAL VIDEO\'] }}',
      resource: 'media'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [2544, 1344], name: 'Upload Video to BLOTATO' } }))
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
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3232, 1152], name: 'Tiktok' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'linkedin',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1446',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1446',
        cachedResultName: 'Samuel Amalric'
      },
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3424, 1152], name: 'Linkedin' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
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
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3600, 1152], name: 'Facebook' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      accountId: {
        __rl: true,
        mode: 'list',
        value: '11892',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/11892',
        cachedResultName: 'doc.firass'
      },
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3232, 1328], name: 'Instagram' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'twitter',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '1289',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1289',
        cachedResultName: 'Docteur_Firas'
      },
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3424, 1328], name: 'Twitter (X)' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'youtube',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '8047',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/8047',
        cachedResultName: 'DR FIRASS (Dr. Firas)'
      },
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}',
      postCreateYoutubeOptionTitle: '={{ $(\'AI Agent: Generate Video Script\').first().json.output.title }}',
      postCreateYoutubeOptionPrivacyStatus: 'private',
      postCreateYoutubeOptionShouldNotifySubscribers: false
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3600, 1328], name: 'Youtube' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'threads',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '2280',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/2280',
        cachedResultName: 'doc.firass'
      },
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3232, 1536], name: 'Threads' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'bluesky',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '6012',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/6012',
        cachedResultName: 'formationinternet.bsky.social'
      },
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3424, 1536], name: 'Bluesky' } }), node({ type: '@blotato/n8n-nodes-blotato.blotato', version: 2, config: { parameters: {
      options: {},
      platform: 'pinterest',
      accountId: {
        __rl: true,
        mode: 'list',
        value: '363',
        cachedResultUrl: 'https://backend.blotato.com/v2/accounts/363',
        cachedResultName: 'formationinternet2022'
      },
      postContentText: '={{ $(\'Save Ad Data to Google Sheets\').item.json[\'ADS TEXT\'] }}',
      pinterestBoardId: { __rl: true, mode: 'id', value: '1146658823815436667' },
      postContentMediaUrls: '={{ $json.url }}'
    }, credentials: {
      blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' }
    }, position: [3600, 1536], name: 'Pinterest' } })], { version: 3.2, parameters: { mode: 'chooseBranch', numberInputs: 9 }, name: 'Merge1' }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          STATUS: 'DONE',
          'ID IMAGE': '={{ $(\'Trigger: Receive Idea via Telegram\').first().json.message.photo[2].file_unique_id }}'
        },
        schema: [
          {
            id: 'ID IMAGE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'ID IMAGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SOURCE',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SOURCE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE NANOBANANA',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE NANOBANANA',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE SENDREAM',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE SENDREAM',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL IMAGE CHATGPT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL IMAGE CHATGPT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 1',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 2',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL VIDEO 3',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL VIDEO 3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL FINAL VIDEO',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'URL FINAL VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ADS TEXT',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'ADS TEXT',
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
        matchingColumns: ['ID IMAGE'],
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
    }, position: [4176, 1328], name: 'Update Status to "DONE"' } }))
  .add(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const structuredPrompt = $input.first().json.final_prompt;\nimage = $input.first().json.image_url;\nreturn {\n  json: {\n    prompt: JSON.stringify(structuredPrompt), // this escapes it correctly!\n    model: "veo3_fast",\n    image_url : image,\n    aspectRatio: "9:16"\n  }\n}'
    }, position: [1648, 880], name: 'Format Prompt' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.kie.ai/api/v1/veo/generate',
      body: '=\n\n{\n  "prompt": {{ $json.prompt }},\n  "model": "{{ $json.model }}",\n  "imageUrls": [ "{{ $json.image_url }}" ],\n  "aspectRatio":  "{{ $json.aspectRatio }}"\n}\n',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'raw',
      authentication: 'genericCredentialType',
      rawContentType: 'application/json',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [1872, 880], name: 'Generate Video with VEO3' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 3 }, position: [2112, 880], name: 'Wait for VEO3 Rendering' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.kie.ai/api/v1/veo/record-info',
      options: {},
      sendQuery: true,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      queryParameters: {
        parameters: [
          {
            name: 'taskId',
            value: '={{ $(\'Generate Video with VEO3\').item.json.data.taskId }}'
          }
        ]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2304, 880], name: 'Download Video from VEO3' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.kie.ai/api/v1/jobs/createTask',
      body: '={\n  "model": "bytedance/seedream-v4-text-to-image",\n  "input": {\n    "prompt": "{{ $(\'Parse Idea Into Prompts\').item.json.videoPrompt }}",\n    "image_size": "portrait_16_9",\n    "image_resolution": "1K"\n  }\n}\n',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'raw',
      authentication: 'genericCredentialType',
      rawContentType: 'application/json',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2816, 272], name: 'Seedream: Generate image from texte' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 4 }, position: [3104, 272], name: 'Wait – image rendering' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.kie.ai/api/v1/jobs/recordInfo?taskId={{ $json.data.taskId }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [3440, 272], name: 'Download image from Seedream' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.kie.ai/api/v1/gpt4o-image/generate',
      body: '={\n  "prompt": "{{ $(\'Parse Idea Into Prompts\').item.json.videoPrompt }}",\n  "size": "2:3"\n}\n',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'raw',
      authentication: 'genericCredentialType',
      rawContentType: 'application/json',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2816, 448], name: 'Generate 4o Image（GPT IMAG 1）' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 4 }, position: [3104, 448], name: 'Wait – image rendering II' } }))
  .add(sticky('# 1️⃣  →  Step 1 — Generate prompts from Telegram input\n## Automate video ads with NanoBanana, Seedream 4, ChatGPT Image and Veo 3 (By Dr. Firas)\n### What problem is this workflow solving? / Use case\nCreating video ads usually requires multiple tools and a lot of time: writing scripts, designing product visuals, editing videos, and publishing them across platforms.  \nThis workflow **automates the entire pipeline** — from idea to ready-to-publish ad video — ensuring brands can quickly test campaigns and boost engagement without production delays.', { name: 'Sticky Note5', color: 7, position: [560, 0], width: 1948, height: 624 }))
  .add(sticky('# 4️⃣  → Step 4 — Merge videos into a final ad', { name: 'Sticky Note8', color: 7, position: [2480, 656], width: 1884, height: 432 }))
  .add(sticky('# 5️⃣  → Step 5 — Publish the final ad to multiple social platforms with Blotato', { name: 'Sticky Note9', position: [560, 1120], width: 3804, height: 608 }))
  .add(sticky('# 2️⃣  → Step 2 — Create product images with : 🌊 Seedream 4.0 +  🍌 NanoBanana + 🤖 ChatGPT image', { name: 'Sticky Note11', color: 3, position: [2480, 0], width: 1884, height: 624 }))
  .add(sticky('# 3️⃣  → Step 3 — Produce video ads with Veo 3', { name: 'Sticky Note1', color: 7, position: [560, 656], width: 1920, height: 432 }))
  .add(sticky('### 🎥 Watch This Tutorial\n\n@[youtube](E17rYpMRvgA)\n\n### 📥  [Open full documentation on Notion](https://automatisation.notion.site/Automate-video-ads-with-NanoBanana-Seedream-4-ChatGPT-Image-and-Veo-3-27e3d6550fd9800dbe46e6192bae60a9?source=copy_link)\n---\n### 1. Set Up OpenAI Connection\n#### Get Your API Key\n1. Visit the [OpenAI API Keys](https://platform.openai.com/api-keys) page.  \n2. Go to [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview).  \n3. Add funds to your billing account.  \n4. Copy your API key into your **OpenAI credentials** in n8n (or your chosen platform).  \n\n---\n### 2. Setup\n1. Import this workflow into your n8n instance.  \n2. Connect your Google Sheets, Gmail, and Google Calendar credentials. Tutorial: [Configure Your Google Sheets, Gmail, Calendar Credentials](https://youtu.be/fDzVmdw7bNU)  \n3. Connect Your Data in Google Sheets. Data must follow this format: [Sample Sheets Data](https://docs.google.com/spreadsheets/d/1SpahDHWishtviYiivRlShgIi_vtHUFLvtlxcxuXp1XU/copy)  \n4. Test the workflow using the **Connected Chat Trigger** node to start conversations with the AI Agent.  \n\n---\n### 3. Integrate 🤖 VEO 3 (Kie) into n8n\n1. Sign up or log in to the **Kie (VEO 3)** dashboard.  \n2. Go to **API Keys** → **Create new key** → copy the key (keep it secret).  \n3. Base API URL: `https://api.kie.ai/api/v1/veo/generate`.  \n\n---\n### 4. Integrate 🍌 NanoBanana\n1. Go to the [NanoBanana API](https://fal.ai/models/fal-ai/nano-banana/edit/api).  \n2. Sign in with your **FAL.ai** account.  \n3. Create a new API key and copy it.  \n4. In n8n, create new credentials → **HTTP Header Auth**.  \n5. Add header: `Authorization: Bearer <YOUR_API_KEY>`.  \n\n---\n### 5. Integrate 🌊 Seedream 4.0\n1. Visit the [Seedream API](https://kie.ai/seedream-api).  \n2. Sign in and create an API key from your dashboard.  \n3. Base API endpoint: `https://api.kie.ai/api/v1/seedream/generate`.  \n4. In n8n, add credentials → **HTTP Header Auth** with `Authorization: Bearer <YOUR_API_KEY>`.  \n\n---\n### 6. Integrate 🤖 ChatGPT Image\n1. Visit the [ChatGPT Image API documentation](https://docs.kie.ai/4o-image-api/get-4-o-image-details).  \n2. Log in with your Kie.ai account.  \n3. Generate a new API key.  \n4. Base endpoint: `https://api.kie.ai/api/v1/image/generate`.  \n5. Add this key in n8n under **HTTP Header Auth** → `Authorization: Bearer <YOUR_API_KEY>`.  \n\n---\n### 7. Install the Blotato [Blotato](https://blotato.com/?ref=firas) Node in n8n (Community Nodes)\n1. In n8n, open **Settings → Community Nodes**.  \n2. Click **Install**, then add: `@blotato/n8n-nodes-blotato`.  \n3. Log in to **Blotato**.  \n4. Go to **Settings → API Keys**.  \n5. In n8n → **Credentials → New**.  \n6. Choose **Blotato API** (provided by the community node you installed).  \n\n---\n## 📬 Need Help or Want to Customize This?\n**Contact me for consulting and support:** [LinkedIn](https://www.linkedin.com/in/dr-firas/) / [YouTube](https://www.youtube.com/@DRFIRASS)  \n', { name: 'Sticky Note', width: 528, height: 1728 }))