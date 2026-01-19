return workflow('EPSFcDt1f8LdRzZU', 'Amazon Affiliate Marketing Automation', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.googleSheetsTrigger', version: 1, config: { parameters: {
      event: 'rowAdded',
      options: {},
      pollTimes: { item: [{}] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1unoIMG4dKLP1Fw0euo64deo_FyBJp4viN4_Sy4LT0Dc/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1unoIMG4dKLP1Fw0euo64deo_FyBJp4viN4_Sy4LT0Dc',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1unoIMG4dKLP1Fw0euo64deo_FyBJp4viN4_Sy4LT0Dc/edit?usp=drivesdk',
        cachedResultName: 'Affiliate Automation'
      }
    }, position: [-2000, 384] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: {
      text: '=You only have to give the asin number from this amazon product url:  {{ $json[\'Product Link\'] }}',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', version: 1, config: { parameters: { model: 'google/gemini-2.0-flash-exp:free', options: {} }, name: 'OpenRouter Chat Model2' } }) }, position: [-1680, 384], name: 'asin number' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://real-time-amazon-data.p.rapidapi.com/product-details?asin={{ $json.output }}&country=US',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'real-time-amazon-data.p.rapidapi.com'
          },
          { name: 'x-rapidapi-key', value: 'YOUR_API_KEY' },
          { name: 'country', value: 'US' }
        ]
      }
    }, position: [-1248, 144], name: 'Amazon Product Details' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: {
      text: '=You are a copywriter helping an Amazon affiliate marketer write high-converting, scroll-stopping Facebook captions.\n\nFor each product, generate a short and engaging caption (1–3 lines max) that:\n- Grabs attention fast\n- Focuses on the product’s top benefit or unique feature\n- Sounds casual and native to Facebook\n- Includes a CTA to buy\n- Ends with the affiliate link\n\nHere is the product name and features:\n\nProduct: {{ $(\'Amazon Product Details\').item.json.data.product_title }}\n\nAbout Product : {{ $(\'Amazon Product Details\').item.json.data.about_product[3] }}\n\nAffiliate Link: {{ $(\'Amazon Product Details\').item.json.data.product_url }}?tag=rakin114-20\n\n\nGive only 1 caption directly and don\'t contain any symbol. Add emojis and with the affiliate link add here\'s the poduct or purchase link any thing that goes well.',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', version: 1, config: { parameters: { model: 'google/gemini-2.0-flash-exp:free', options: {} }, name: 'OpenRouter Chat Model1' } }) }, position: [-976, 144], name: 'FB caption' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $(\'Amazon Product Details\').item.json.data.product_photo }}',
      options: {}
    }, position: [-576, 496], name: 'Product Image' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://generativelanguage.googleapis.com/upload/v1beta/files?key=YOUR_API_KEY',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'binaryData',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'X-Goog-Upload-Command',
            value: 'start,upload,finalize'
          },
          { name: 'X-Goog-Upload-Header-Content-Length', value: '123' },
          {
            name: 'X-Goog-Upload-Header-Content-Type',
            value: 'image/png'
          },
          { name: 'Content-Type', value: 'image/png' }
        ]
      },
      inputDataFieldName: 'data'
    }, position: [-368, 496], name: 'Image Upload To Server' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: {
      text: '=Create a very short prompt for an AI image generator that will be fed a photo of a product, to ultimately have professional product photography. \n\n- If the product is wearable you have to include the product worn by a human model, if it\'s not wearable then include a model holding it or doing something with it. The product should ALWAYS be with a human model, and with the model\'s face visible.\n\n- Make sure to include instructions to get the best realism, the best lighting, the best angle, the best colors, the best model positioning, etc. according to the type of product.\n\n- Always prompt it as referring to the product, eg. "this [PRODUCT]" so that the AI image generator knows that it\'s gonna be sent an input photo of the product.\n\n- Make sure to always instruct to include subtle grain for a cinematic look.\n\nThe description of the product will be sent to you. Only reply with the final prompt inside double quotes.\n\nThe prompt must be under 100 words and very simple.\n\n\nHere is the Product Description:\nProduct Title: {{ $(\'Amazon Product Details\').item.json.data.product_title }}\n\nAbout Product: {{ $(\'Amazon Product Details\').item.json.data.about_product[0] }}\n\n',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', version: 1, config: { parameters: { model: 'google/gemini-2.0-flash-exp:free', options: {} }, name: 'OpenRouter Chat Model' } }) }, position: [-96, 160], name: 'Image Prompt Generate' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "contents": [\n    {\n      "role": "user",\n      "parts": [\n        {\n          "fileData": {\n            "fileUri": "{{ $(\'Image Upload To Server\').item.json.file.uri }}",\n            "mimeType": "{{ $(\'Image Upload To Server\').item.json.file.mimeType }}"\n          }\n        },\n        {\n          "text": {{ $json.output }}\n        }\n      ]\n    }\n  ],\n  "generationConfig": {\n    "temperature": 1.4,\n    "topK": 40,\n    "topP": 0.95,\n    "maxOutputTokens": 8192,\n    "responseModalities": ["Text", "Image"]\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, position: [320, 464], name: 'ai image generator' } }))
  .then(node({ type: 'n8n-nodes-base.convertToFile', version: 1.1, config: { parameters: {
      options: {},
      operation: 'toBinary',
      sourceProperty: 'candidates[0].content.parts[0].inlineData.data'
    }, position: [528, 464], name: 'Convert to File' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 10 }, position: [736, 464] } }))
  .then(node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'photos',
      node: 'me',
      options: {
        queryParameters: {
          parameter: [
            {
              name: 'message',
              value: '={{ $(\'FB caption\').item.json.output }}'
            }
          ]
        }
      },
      sendBinaryData: true,
      graphApiVersion: 'v22.0',
      httpRequestMethod: 'POST',
      binaryPropertyName: 'data'
    }, position: [960, 464] } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          'Product Link': '={{ $(\'Google Sheets Trigger\').item.json[\'Product Link\'] }}',
          'Facebook Upload': 'Done ✅'
        },
        schema: [
          {
            id: 'Product Link',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Product Link',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Facebook Upload',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Facebook Upload',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
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
        matchingColumns: ['Product Link'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1unoIMG4dKLP1Fw0euo64deo_FyBJp4viN4_Sy4LT0Dc/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1unoIMG4dKLP1Fw0euo64deo_FyBJp4viN4_Sy4LT0Dc',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1unoIMG4dKLP1Fw0euo64deo_FyBJp4viN4_Sy4LT0Dc/edit?usp=drivesdk',
        cachedResultName: 'Affiliate Automation'
      }
    }, position: [1168, 464] } }))
  .add(sticky('---\n\n## 1️⃣ Purpose of This Agent\n\nThis workflow automates:\n\n* **Fetching Amazon product details** from a product link (via ASIN extraction).\n* **Generating Facebook captions** and **product images** with AI.\n* **Uploading** final creatives directly to **Facebook** and updating a **Google Sheet** for tracking.\n\n---\n', { name: 'Sticky Note', position: [-1088, -352], width: 528, height: 272 }))
  .add(sticky('\n## 2️⃣ How to Use\n\n* Add a **Product Link** to the connected **Google Sheet**.\n* The workflow will:\n\n  * **Extract** the ASIN number.\n  * **Fetch product details** via **RapidAPI**.\n  * **Generate Facebook captions** using OpenRouter AI.\n  * **Create product image prompts** and send them to **Google Gemini** image generator.\n  * **Upload** the generated creative to Facebook automatically.\n  * **Mark the sheet** as “Done ✅” once complete.\n\n---', { name: 'Sticky Note1', position: [-448, -400], width: 608, height: 320 }))
  .add(sticky('## 🛠 Setup Guide\n\n1. **Google Sheets**\n\n   * Connect your sheet to the **Google Sheets Trigger** node.\n   * Ensure columns: “Product Link” & “Facebook Upload” exist.\n\n2. **RapidAPI**\n\n   * Get your [RapidAPI Key](https://rapidapi.com/) and replace `YOUR_API_KEY` in the **Amazon Product Details** node.\n\n3. **OpenRouter**\n\n   * Add your OpenRouter credentials for AI caption generation.\n\n4. **Google Gemini API**\n\n   * Add your [Gemini API Key](https://aistudio.google.com/apikey) for image prompt generation & image creation.\n\n5. **Facebook Graph API**\n\n   * Connect your Facebook account to allow posting to your page/profile.\n\nOnce connected, the workflow is **ready to run automatically** every time you add a new product link to the sheet. 🚀\n\n---', { name: 'Sticky Note2', position: [272, -528], width: 896, height: 592 }))
  .add(sticky('## Start here: Step-by Step Youtube Tutorial :star:\n\n[![Amazon Affiliate Marketing Automation](https://img.youtube.com/vi/7Gz4C0XbBK8/sddefault.jpg)](https://youtu.be/7Gz4C0XbBK8?si=RtW-ATYRF07C3o7_)', { name: 'Sticky Note5', position: [-1584, -464], width: 387, height: 390 }))