return workflow('d43MQMcUi1o2LV9P', 'ProBanana: AI Product Mockup Generator using Gemini 2.5 Flash Image (Nano Banana)', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.3, config: { parameters: {
      options: {},
      formTitle: 'Nano Banana ',
      formFields: {
        values: [
          {
            fieldType: 'file',
            fieldLabel: 'Upload your product image',
            requiredField: true,
            acceptFileTypes: '.jpg, .png, .jpeg'
          },
          {
            fieldType: 'file',
            fieldLabel: 'Upload your template/playground image',
            requiredField: true,
            acceptFileTypes: '.jpg, .png, .jpeg'
          },
          {
            fieldLabel: 'Pls describe what you want to do?',
            placeholder: 'Prompt',
            requiredField: true
          }
        ]
      }
    }, position: [-272, -48], name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: {
      options: {},
      operation: 'binaryToPropery',
      binaryPropertyName: '=Upload_your_product_image'
    }, position: [-48, -48], name: 'User Asset Base64' } }))
  .then(node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: {
      options: {},
      operation: 'binaryToPropery',
      binaryPropertyName: '=Upload_your_template_playground_image'
    }, position: [176, -48], name: 'Template Base64' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '4208831c-38dc-44ce-a7a0-f832a3c8c148',
            name: 'promptText',
            type: 'string',
            value: '={{ $(\'On form submission\').item.json[\'Pls describe what you want to do?\'] }}'
          },
          {
            id: '5cb7a52f-2e3f-4b1e-972e-e07f31c5c3a2',
            name: 'assetBase64',
            type: 'string',
            value: '={{ $(\'User Asset Base64\').item.json.data }}'
          },
          {
            id: '60ac2edd-25de-4fda-a12b-fa0fd321e188',
            name: 'templateBase64',
            type: 'string',
            value: '={{ $json.data }}'
          }
        ]
      }
    }, position: [400, -48], name: 'Assemble Final Data' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "google/gemini-2.5-flash-image-preview:free",\n  "messages": [\n    {\n      "role": "user",\n      "content": [\n        {\n          "type": "text",\n          "text": "{{ $json.promptText }}"\n        },\n        {\n          "type": "image_url",\n          "image_url": {\n            "url": "data:image/jpeg;base64,{{ $json.assetBase64 }}"\n          }\n        },\n        {\n          "type": "image_url",\n          "image_url": {\n            "url": "data:image/jpeg;base64,{{ $json.templateBase64 }}"\n          }\n        }\n      ]\n    }\n  ]\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'openRouterApi'
    }, credentials: {
      openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [624, -48] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '84544a25-271b-4c63-ade5-06af10150d12',
            name: 'outputfile',
            type: 'string',
            value: '={{ $json.choices[0].message.images[0].image_url.url.split(",")[1] }}'
          }
        ]
      }
    }, position: [848, -48], name: 'Edit Fields' } }))
  .then(node({ type: 'n8n-nodes-base.convertToFile', version: 1.1, config: { parameters: {
      options: {},
      operation: 'toBinary',
      sourceProperty: 'outputfile'
    }, position: [1072, -48], name: 'Convert to File' } }))
  .add(sticky('## Workflow Initiation\n### Form to take the user asset image and the template image along with the prompt(describing of what is to be done)', { name: 'Sticky Note2', position: [-576, -160], width: 448, height: 240 }))
  .add(sticky('## Final Output\n![image](https://n3wstorage.b-cdn.net/n3witalia/result_sport.jpeg)', { name: 'Sticky Note3', color: 4, position: [1008, 112], width: 244, height: 364 }))
  .add(sticky('## Core AI Generation Step\n### Sends a `POST` request to the OpenRouter API with a multimodal prompt containing:\n### 1. The user\'s text instruction.\n### 2. The user\'s asset image (Base64).\n### 3. The template image (Base64).\n\n### Uses the `google/gemini-2.5-flash-image-preview` model to generate the new image.', { name: 'Sticky Note4', position: [544, -480], width: 256, height: 592 }))
  .add(sticky('## Template Model\n![image](https://n3wstorage.b-cdn.net/n3witalia/model.jpg)', { name: 'Sticky Note5', color: 6, position: [112, 112], width: 228, height: 364 }))
  .add(sticky('## Product (User Asset)\n![image](https://n3wstorage.b-cdn.net/n3witalia/tshirt.jpg)', { name: 'Sticky Note6', color: 5, position: [-112, -432], width: 232, height: 364 }))