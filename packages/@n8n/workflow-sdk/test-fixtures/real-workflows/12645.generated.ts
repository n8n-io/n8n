return workflow('dp5oMxNtiDV7ZQwO', '💥 Create scalable e-commerce product images using NanoBanana Pro', { availableInMCP: false, executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.4, config: { parameters: {
      options: { buttonLabel: 'Analyze Images' },
      formTitle: 'Upload 3 Images for Analysis ',
      formFields: {
        values: [
          {
            fieldName: 'image1',
            fieldType: 'file',
            fieldLabel: 'Image 1',
            multipleFiles: false,
            requiredField: true,
            acceptFileTypes: '.jpg, .jpeg, .png, .gif, .bmp, .webp'
          },
          {
            fieldName: 'Image2',
            fieldType: 'file',
            fieldLabel: 'Image 2',
            multipleFiles: false,
            requiredField: true,
            acceptFileTypes: '.jpg, .jpeg, .png, .gif, .bmp, .webp'
          },
          {
            fieldName: 'Image3',
            fieldType: 'file',
            fieldLabel: 'Image 3',
            multipleFiles: false,
            requiredField: true,
            acceptFileTypes: '.jpg, .jpeg, .png, .gif, .bmp, .webp'
          },
          { fieldName: 'notes', fieldLabel: 'Optional Notes' }
        ]
      },
      formDescription: 'Please upload exactly 3 images for AI-powered analysis'
    }, position: [-624, -320], name: 'Form Trigger (3 images)' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '065fa52e-70ee-4b41-8fa2-ad66ea218fe6',
            name: 'image0',
            type: 'object',
            value: '={{ $binary.image1 }}'
          },
          {
            id: '70b7494e-b43b-45ff-9da3-7b8e585b2a0d',
            name: 'image1',
            type: 'object',
            value: '={{ $binary.Image2 }}'
          },
          {
            id: '59862088-7957-4281-897b-9569d70a1c75',
            name: 'image2',
            type: 'object',
            value: '={{ $binary.Image3 }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [-144, -336], name: 'Normalize binary names' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '20d99650-4a2f-41cc-be31-2f4d1f436712',
            name: 'error',
            type: 'string',
            value: 'Please upload 3 images (image1, image2, image3).'
          }
        ]
      }
    }, position: [-144, -64], name: 'Error Response - Missing Files' } })], { version: 2.3, parameters: {
      options: {},
      conditions: {
        options: {
          version: 3,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'loose'
        },
        combinator: 'and',
        conditions: [
          {
            id: '330c555d-c5d5-4e14-af52-1d45ed2ac896',
            operator: { type: 'boolean', operation: 'exists', singleValue: true },
            leftValue: '={{ $binary.image1 }}',
            rightValue: ''
          },
          {
            id: '975e8e54-27fb-4513-ac45-d719ad1157b0',
            operator: { type: 'boolean', operation: 'exists', singleValue: true },
            leftValue: '={{ $binary.Image2 }}',
            rightValue: ''
          },
          {
            id: '02ec63f3-9dd8-4db1-986e-69cac26e245d',
            operator: { type: 'boolean', operation: 'exists', singleValue: true },
            leftValue: '={{ $binary.Image3 }}',
            rightValue: ''
          }
        ]
      },
      looseTypeValidation: true
    }, name: 'If' }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const item = items[0];\n\nif (\n  !item.binary ||\n  !item.binary.image1 ||\n  !item.binary.Image2 ||\n  !item.binary.Image3\n) {\n  throw new Error(\'Missing binary images (expected image1, image2, image3)\');\n}\n\nreturn [\n  {\n    json: { imageNumber: 1 },\n    binary: { image: item.binary.image1 }\n  },\n  {\n    json: { imageNumber: 2 },\n    binary: { image: item.binary.Image2 }\n  },\n  {\n    json: { imageNumber: 3 },\n    binary: { image: item.binary.Image3 }\n  }\n];'
    }, position: [64, -336], name: 'Split images' } }))
  .then(merge([node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{$binary.image.fileName}}',
      driveId: {
        __rl: true,
        mode: 'id',
        value: '=<__PLACEHOLDER_VALUE__Google DRIVE Document ID___>'
      },
      options: {},
      folderId: {
        __rl: true,
        mode: 'id',
        value: '=<__PLACEHOLDER_VALUE__Google DRIVE Document ID___>'
      },
      inputDataFieldName: 'image'
    }, credentials: {
      googleDriveOAuth2Api: { id: 'odf7JAwyqVFVZBhQ', name: 'Google Drive account' }
    }, position: [304, -576], name: 'Upload file' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
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
            inputDataFieldName: 'image'
          }
        ]
      }
    }, position: [304, -336], name: 'Build Public Image URL' } }), node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 2.1, config: { parameters: {
      text: 'Describe the image in detail. Include: objects, people, setting, actions, colors, and any text visible.',
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'GPT-4O'
      },
      options: {},
      resource: 'image',
      inputType: 'base64',
      operation: 'analyze',
      binaryPropertyName: 'image'
    }, credentials: {
      openAiApi: { id: 'HUbsD20wv3CFr7gN', name: 'OpenAi account' }
    }, position: [304, -64], name: 'Analyze image' } })], { version: 3.2, parameters: {
      mode: 'combine',
      options: {},
      combineBy: 'combineByPosition',
      numberInputs: 3
    } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'function extractOpenAIText(it) {\n  // Après Merge by position, OpenAI est sous la clé "0"\n  const openai = it.json?.["0"];\n\n  if (openai?.content && Array.isArray(openai.content)) {\n    const t = openai.content.map(x => x?.text).filter(Boolean).join("\\n");\n    if (t) return t;\n  }\n\n  // fallback\n  if (typeof openai?.text === "string" && openai.text.trim()) {\n    return openai.text.trim();\n  }\n\n  return null;\n}\n\nfunction extractDriveUrl(it) {\n  return it.json?.webContentLink || it.json?.webViewLink || null;\n}\n\nfunction formatTmpfilesPublicUrl(it) {\n  const raw = it.json?.data?.url;\n  if (!raw) return null;\n\n  return raw.replace(\n    /^http:\\/\\/tmpfiles\\.org\\/(\\d+)\\/(.*)$/i,\n    "https://tmpfiles.org/dl/$1/$2"\n  );\n}\n\nconst rows = items.map((it, idx) => ({\n  n: idx + 1,\n  desc: extractOpenAIText(it) || "No description",\n  url: extractDriveUrl(it) || "No link",\n  url_public: formatTmpfilesPublicUrl(it) || "No link",\n}));\n\nreturn [{\n  json: {\n    image1Description: rows[0]?.desc || "No description",\n    image2Description: rows[1]?.desc || "No description",\n    image3Description: rows[2]?.desc || "No description",\n\n    // URLs Drive\n    image1Url: rows[0]?.url || "No link",\n    image2Url: rows[1]?.url || "No link",\n    image3Url: rows[2]?.url || "No link",\n    imageUrls: rows.map(r => r.url).filter(u => u && u !== "No link"),\n\n    // URLs publiques formatées (tmpfiles → /dl/)\n    image1Url_public: rows[0]?.url_public || "No link",\n    image2Url_public: rows[1]?.url_public || "No link",\n    image3Url_public: rows[2]?.url_public || "No link",\n    imageUrls_public: rows\n      .map(r => r.url_public)\n      .filter(u => u && u !== "No link"),\n\n    allDescriptions: rows.map(r => `Image ${r.n}: ${r.desc}`).join("\\n\\n"),\n  }\n}];\n'
    }, position: [752, -336], name: 'Aggregate descriptions' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 3.1, config: { parameters: {
      text: '=Your task is to create an image prompt following the system guidelines.  \nEnsure that the reference image is represented as **accurately as possible**, including all text elements.  \n\nUse the following inputs:  \n\n- **IMAGES’s description:**  \n{{ $json.allDescriptions }}\n\n',
      options: {
        systemMessage: '=You output a prompt that is a variation of the prompt below. Follow this prompt exactly but just change:\n\n-the hand positioning based on what makes sense for the product\n-how the product is worn and where it is placed\n\neverything else stays the same\n\n***\n\nShow a high fashion studio photoshoot image of this reference character as a photorealistic model wearing the featured apparel and product, captured as a full body shot. The model looks slightly past the camera with a bored expression and raised eyebrows. One hand is lifted, with two fingers interacting with or touching the featured product in a natural, stylish way.\n\nThe setting is a clean studio environment with a solid color background that matches the primary color of the character. The featured product is intentionally prominent.\n\nThe image is shot from a low angle, looking up at the subject to emphasize presence and dominance.\n\nThe photo is captured on Fuji Velvia film using a 55mm prime lens with hard flash lighting. Light is concentrated on the subject and softly fades toward the edges of the frame. The image is intentionally overexposed, with visible film grain and heavy oversaturation. Skin appears shiny, almost oily, and the featured product shows harsh white reflections that highlight its surface and form.\n'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {},
          responsesApiEnabled: false
        }, credentials: {
          openAiApi: { id: 'HUbsD20wv3CFr7gN', name: 'OpenAi account' }
        }, name: 'OpenAI Chat Model' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: { jsonSchemaExample: '{\n	"image_prompt": "string"\n}' }, name: 'Structured Output Parser' } }) }, position: [976, -336], name: 'Generate Image Prompt' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: 'https://api.atlascloud.ai/api/v1/model/generateImage',
      method: 'POST',
      options: { response: { response: { responseFormat: 'json' } } },
      jsonBody: '={\n  "model": "google/nano-banana-pro/edit",\n  "aspect_ratio": "1:1",\n  "enable_base64_output": false,\n  "enable_sync_mode": false,\n  "images": {{ JSON.stringify($(\'Aggregate descriptions\').item.json.imageUrls_public) }},\n  "output_format": "png",\n"prompt": "{{ \n  ($json.output.image_prompt || \'\')\n    .replace(/\\r?\\n/g, \'\\\\n\')\n    .replace(/"/g, \'\\\\"\')\n}}",\n  "resolution": "2k"\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          {
            name: 'Authorization',
            value: 'Bearer <__PLACEHOLDER_VALUE__atlascloud Key__>'
          },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [1328, -336], name: 'NanoBanana: Create Image' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes' }, position: [1552, -336] } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: '=https://api.atlascloud.ai/api/v1/model/prediction/{{ $json.data.id }}',
      options: { response: { response: { responseFormat: 'json' } } },
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'Authorization',
            value: 'Bearer <__PLACEHOLDER_VALUE__atlascloud Key__>'
          },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [1776, -336], name: 'Download Edited Image' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: '={{ $json.data.outputs[0] }}',
      options: { response: { response: { responseFormat: 'file' } } }
    }, position: [2000, -336], name: 'Download Final PNG (binary)' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $json.data.id }}',
      driveId: {
        __rl: true,
        mode: 'id',
        value: '=<__PLACEHOLDER_VALUE__Google DRIVE Document ID___>'
      },
      options: {},
      folderId: {
        __rl: true,
        mode: 'id',
        value: '=<__PLACEHOLDER_VALUE__Google DRIVE Document ID___>'
      }
    }, credentials: {
      googleDriveOAuth2Api: { id: 'odf7JAwyqVFVZBhQ', name: 'Google Drive account' }
    }, position: [2224, -336], name: 'Upload file Nanobanana' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          status: 'nanobanana_done',
          image_1: '={{ $(\'Aggregate descriptions\').item.json.image1Url }}',
          image_2: '={{ $(\'Aggregate descriptions\').item.json.image1Url }}',
          image_3: '={{ $(\'Aggregate descriptions\').item.json.image3Url }}',
          description_all: '={{ $(\'Aggregate descriptions\').item.json.allDescriptions }}',
          image_nanobanana: '={{ $json.webContentLink }}'
        },
        schema: [
          {
            id: 'status',
            type: 'string',
            display: true,
            required: false,
            displayName: 'status',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'image_1',
            type: 'string',
            display: true,
            required: false,
            displayName: 'image_1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'image_2',
            type: 'string',
            display: true,
            required: false,
            displayName: 'image_2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'image_3',
            type: 'string',
            display: true,
            required: false,
            displayName: 'image_3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'description_all',
            type: 'string',
            display: true,
            required: false,
            displayName: 'description_all',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'image_nanobanana',
            type: 'string',
            display: true,
            required: false,
            displayName: 'image_nanobanana',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'image_contactsheet',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'image_contactsheet',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'new_image_1',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'new_image_1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'new_image_2',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'new_image_2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'new_image_3',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'new_image_3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'new_image_4',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'new_image_4',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'new_image_5',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'new_image_5',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'new_image_6',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'new_image_6',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'video_1',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'video_1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'video_2',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'video_2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'video_3',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'video_3',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'video_4',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'video_4',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'video_5',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'video_5',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'video_6',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'video_6',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Final video',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Final video',
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
        mode: 'id',
        value: '=<__PLACEHOLDER_VALUE__Sheet Tab Name__>'
      },
      documentId: {
        __rl: true,
        mode: 'id',
        value: '=<__PLACEHOLDER_VALUE__Google Sheets Document ID__>'
      }
    }, credentials: {
      googleSheetsOAuth2Api: { id: 'YlIXFU6zUDsqwmRG', name: 'Google Sheets account' }
    }, position: [2448, -336], name: 'Append row in sheet' } }))
  .add(sticky('## Step 1: Input Validation\n**Form Trigger** receives 3 images from user\n\n**If** node checks all 3 images exist\n- ✓ True: Continue to processing\n- ✗ False: Return error message\n\nFor each image in parallel:\n- **Upload file** → Google Drive (permanent storage)\n- **Analyze image** → GPT-4O describes content\n- **Build Public URL** → tmpfiles.org (public access)', { name: 'Note - Workflow Overview', color: 7, position: [-704, -768], width: 1376, height: 888 }))
  .add(sticky('## 🚀 AI Image Generation Workflow\n\nThis workflow generates studio-quality e-commerce product images from **exactly 3 reference photos** using AI vision and **NanoBanana Pro**.\n\n## 🔄 How it works\n\n1. A form collects **3 images**\n2. Inputs are validated (missing files → error)\n3. Images are processed in parallel:\n   - Stored in Google Drive  \n   - Analyzed with AI vision (GPT-4O)  \n   - Converted to public URLs\n4. Descriptions are aggregated\n5. An AI agent generates a photoshoot prompt\n6. NanoBanana Pro creates the final image\n7. The result is stored and logged\n\n**Flow:**  \nForm → Validation → Analysis → Prompt → Image → Storage\n\n## ⚙️ Setup steps\n\n1. Add credentials:\n   - Google Drive & Sheets (OAuth)  \n   - OpenAI API key  \n   - AtlasCloud API key\n2. Replace all `<__PLACEHOLDER_VALUE__>` fields\n3. Ensure Drive folders are writable\n4. Keep input limited to **3 images**\n\n#  📘 Documentation  \n- Access detailed setup instructions, API config, platform connection guides, and workflow customization tips:\n📎 [Open the full documentation on Notion](https://automatisation.notion.site/Create-scalable-e-commerce-product-images-from-photos-using-NanoBanana-Pro-2e33d6550fd9808e8891f7d606b49df7?source=copy_link)', { name: 'Sticky Note', position: [-1488, -768], width: 720, height: 880 }))
  .add(sticky('## Step 2:  Image Generation\n**Aggregate descriptions** combines all 3 image descriptions\n\n**AI Agent** (GPT-4.1-mini) creates a fashion photoshoot prompt:\n- Uses image descriptions as input\n- Outputs structured JSON with image_prompt field\n\n**NanoBanana: Create Image** sends request to API\n- Uses public image URLs and AI-generated prompt\n- API → www.atlascloud.ai', { name: 'Note - Workflow Overview1', color: 7, position: [704, -768], width: 1936, height: 888 }))