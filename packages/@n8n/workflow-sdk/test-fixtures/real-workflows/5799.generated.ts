return workflow('cU2fwVR3z955Vuqt', 'Generate Ad Image Variations Using GPT-4, Dumpling AI & Google Drive', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'Ad Image Generator',
      formFields: {
        values: [
          { fieldLabel: 'Brand Name', requiredField: true },
          { fieldLabel: 'Brand Website', requiredField: true },
          {
            fieldType: 'file',
            fieldLabel: 'Ad Image',
            multipleFiles: false,
            requiredField: true
          }
        ]
      },
      formDescription: 'Provide brand and product info, and an optional reference image to generate image variations with AI.'
    }, position: [240, 55], name: 'Submit Brand Info + Image' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $json[\'Ad Image\'].filename }} (Original)',
      driveId: {
        __rl: true,
        mode: 'list',
        value: 'My Drive',
        cachedResultUrl: 'https://drive.google.com/drive/my-drive',
        cachedResultName: 'My Drive'
      },
      options: {},
      folderId: {
        __rl: true,
        mode: 'list',
        value: '1R5bTxrKmi9NDMFJIh3aQgbNuZwmCybLV',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1R5bTxrKmi9NDMFJIh3aQgbNuZwmCybLV',
        cachedResultName: 'n8n Testing'
      },
      inputDataFieldName: 'Ad_Image'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [460, 55], name: ' Upload Ad Image to Google Drive' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: {
        __rl: true,
        mode: 'id',
        value: '={{ $(\' Upload Ad Image to Google Drive\').item.json.id }}'
      },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [680, 55], name: 'Download Ad Image for Analysis' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      text: 'Describe the visual style, subject matter, and composition of this image. Is it a lifestyle image, a product-only shot, or a combination? Include lighting style and camera angle if possible.',
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'GPT-4O'
      },
      options: {},
      resource: 'image',
      inputType: 'base64',
      operation: 'analyze'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [900, 55], name: 'Describe Visual Style of Image' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4',
        cachedResultName: 'GPT-4'
      },
      options: {},
      messages: {
        values: [
          {
            content: '=You are a visual brand strategist and art director for direct-to-consumer (DTC) e-commerce brands.\n\nPlease analyze the following brand website. Focus **only** on the brand’s **visual aesthetic**, including:\n\n- Color palette\n- Photography style and lighting\n- Imagery themes (e.g. lifestyle vs. product shots)\n- Mood or tone evoked by visuals\n- Any repeating design elements or layout patterns\n\nBe descriptive but concise. The output will be used to help design consistent and creative AI-generated images for ad creatives — so focus entirely on the visual look and feel.\n\n\nBrand Website: {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Website\'] }}\nBrand Name: {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Name\'] }}\n'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [1120, 55], name: 'Analyze Brand Website Style' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Brand Name: {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Name\'] }}\nWebsite: {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Website\'] }}\nReference Ad Description: {{ $(\'Describe Visual Style of Image\').item.json.content }}\nVisual Style Overview: {{ $json.message.content }}',
      options: {
        systemMessage: '=Brand Name: {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Name\'] }}\nWebsite: {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Website\'] }}\nReference Ad Description: {{ $(\'Describe Visual Style of Image\').item.json.content }}\nVisual Style Overview: {{ $json.message.content }}\n\nYour task is to generate **10 tightly related visual variations** of a reference ad image — not new concepts. These prompts are for testing subtle creative changes on Facebook/Instagram ads (e.g., backdrop, mood, color, lighting) while preserving the original subject and composition.\n\n### Reference Materials:\n\n**Brand Info**: {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Name\'] }}\n**Website**:  {{ $(\'Submit Brand Info + Image\').item.json[\'Brand Website\'] }}\n**Visual Aesthetics Guideline**: {{ $json.message.content }}\n**Reference Image Description**: {{ $(\'Describe Visual Style of Image\').item.json.content }}\n\nUse the Reference Image Description to ground your concepts in visual reality — the new prompts should **feel like believable variations** of this original ad image in terms of camera angle, lighting, and context, while introducing fresh concepts or creative twists.\n\n### For each of the 10 prompts:\n\n- **Preserve** the reference image\'s subject (product, camera angle, core framing)\n- **Only vary** the background, environment, mood, lighting, or color treatment\n- Examples of variation types:\n  - Daylight vs sunset lighting\n  - Poolside vs marble countertop\n  - Lavender tones vs beach sand tones\n  - Summer vibe vs spa-like calm\n- Use vivid, sensory language to describe each variation\n- Always include **aspect ratio** (1:1 or 4:5)\n- Never introduce logos, overlays, or major subject changes\n\nThe goal is to create **subtle, performance-testable image variations**, not entirely new compositions.\n\nPlease return **only** a JSON array of 10 objects, each with a single property `"prompt"` containing the image prompt. Example output structure:\n\n[\n  {\n    "prompt": "Sun-drenched poolside shot of the product on a marble ledge at golden hour, with soft shadows and warm tones. Aspect ratio 1:1."\n  },\n  {\n    "prompt": "Cool lavender-tinted sunset beach backdrop behind the product, highlighting reflective metallic accents. Aspect ratio 4:5."\n  },\n  {\n    "prompt": "..."\n  }\n]'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '[\n  {\n    "prompt": "Sun-drenched poolside shot of the product on a marble ledge at golden hour, with soft shadows and warm tones. Aspect ratio 1:1."\n  },\n  {\n    "prompt": "Cool lavender-tinted sunset beach backdrop behind the product, highlighting reflective metallic accents. Aspect ratio 4:5."\n  },\n  {\n    "prompt": "..."\n  }\n]'
        }, name: 'Parse Prompts into JSON Array' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'GPT-4o (Connected to LangChain Agent)' } }) }, position: [1496, 55], name: 'LangChain Agent: Generate Variation Prompts' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'output' }, position: [1872, 55], name: 'Split: One Prompt per Item' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: {
        __rl: true,
        mode: 'id',
        value: '={{ $(\' Upload Ad Image to Google Drive\').item.json.id }}'
      },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [2092, 55], name: 'Download Base Image for Each Variation' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [2312, 55], name: 'Loop: Process Image Variations' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://app.dumplingai.com/api/v1/generate-ai-image',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "FLUX.1-pro",\n  "input": {\n    "prompt": "{{ $json.prompt }}"\n  }\n}\n',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2532, -20], name: 'Dumpling AI: Generate Image Variation' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: { 'Image URL': '={{ $json.url }}' },
        schema: [
          {
            id: 'Image URL',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Image URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Image URL'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/12bBSaMdX-jE7QtIlEX4CBUEGScmJx3xK7bwFtHWan64/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/12bBSaMdX-jE7QtIlEX4CBUEGScmJx3xK7bwFtHWan64/edit?usp=drivesdk',
        cachedResultName: 'Edited image '
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [2752, 55], name: ' Log Image Variation URLs to Google Sheets' } }))
  .add(sticky('### 🖼️ Ad Image Variation Generator (Using GPT-4 + Dumpling AI)\n\nThis workflow creates 10 subtle creative variations of a reference ad image  \nto test performance across visual styles, lighting, background, and tone —  \nwhile preserving the product\'s framing and subject.\n\n---\n\n### 🔧 How It Works\n\n1. User submits brand name, website, and reference ad image via a form.\n2. The image is uploaded to Google Drive.\n3. GPT-4o analyzes the image’s visual style (composition, subject, lighting).\n4. GPT-4 analyzes the brand website to understand overall visual identity.\n5. A LangChain AI Agent uses both to generate 10 variation prompts.\n6. Each prompt is passed to Dumpling AI to generate a new ad image.\n7. All image URLs are logged in Google Sheets.\n\n', { position: [300, -480], width: 780, height: 740 }))