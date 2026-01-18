return workflow('dLrtZMRZzusZDlpa', 'GoogleVertex_template', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'Google Vertex AI',
      formFields: {
        values: [
          { fieldLabel: 'Prompt', requiredField: true },
          { fieldLabel: 'YOUR_ACCESS_TOKEN', requiredField: true }
        ]
      },
      formDescription: 'Google Vertex'
    }, position: [-300, 0], name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5cedc3de-6221-4d7e-a6c8-82f4cb9cf0e9',
            name: 'PROJECT_ID',
            type: 'string',
            value: '<YOUR_PROJECT_ID>'
          },
          {
            id: '90019751-e2d5-4764-9bf9-e13916dcc528',
            name: 'MODEL_VERSION',
            type: 'string',
            value: 'veo-3.0-generate-preview'
          },
          {
            id: '67ab205c-82b3-4263-99c4-c906a0ca6ae9',
            name: 'LOCATION',
            type: 'string',
            value: '<YOUR_LOCATION>'
          },
          {
            id: '413415fb-60c5-4d0d-ac45-1e6178a55227',
            name: 'TEXT_PROMPT',
            type: 'string',
            value: '={{ $json.Prompt }}'
          },
          {
            id: '91d09e20-87db-474f-91e1-6ed58b96dae5',
            name: 'IMAGE_COUNT',
            type: 'string',
            value: '1'
          },
          {
            id: '17954335-b96b-4813-9c4a-20817d675448',
            name: 'API_ENDPOINT',
            type: 'string',
            value: '<YOUR_LOCATION>-aiplatform.googleapis.com'
          },
          {
            id: 'bf0910e1-b757-4852-9341-a7792161f89b',
            name: 'ACCESS_TOKEN',
            type: 'string',
            value: '={{ $json.YOUR_ACCESS_TOKEN }}'
          }
        ]
      }
    }, position: [-80, 0], name: 'Setting' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://{{ $json.API_ENDPOINT }}/v1/projects/{{ $json.PROJECT_ID }}/locations/{{ $json.LOCATION }}/publishers/google/models/{{ $json.MODEL_VERSION }}:predictLongRunning',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "endpoint": "projects/n8n-project-440404/locations/us-central1/publishers/google/models/veo-3.0-generate-preview",\n  "instances": [\n    {\n      "prompt": {{ $json.TEXT_PROMPT }}\n    }\n  ],\n  "parameters": {\n    "aspectRatio": "16:9",\n    "sampleCount": 1,\n    "durationSeconds": "8",\n    "personGeneration": "allow_all",\n    "addWatermark": true,\n    "includeRaiReason": true,\n    "generateAudio": true\n  }\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          {
            name: 'Authorization',
            value: '=Bearer {{ $json.ACCESS_TOKEN }}'
          }
        ]
      }
    }, position: [180, 0], name: 'Vertex AI-VEO3' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 2 }, position: [360, 0] } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://{{ $(\'Setting\').item.json.API_ENDPOINT }}/v1/projects/{{ $(\'Setting\').item.json.PROJECT_ID }}/locations/{{ $(\'Setting\').item.json.LOCATION }}/publishers/google/models/{{ $(\'Setting\').item.json.MODEL_VERSION }}:fetchPredictOperation\n',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "operationName": "{{ $json.name }}"\n}\n',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          {
            name: 'Authorization',
            value: '=Bearer {{ $(\'On form submission\').item.json.YOUR_ACCESS_TOKEN }}'
          }
        ]
      }
    }, position: [540, 0], name: 'Vertex AI-fetch' } }))
  .then(node({ type: 'n8n-nodes-base.convertToFile', version: 1.1, config: { parameters: {
      options: {},
      operation: 'toBinary',
      sourceProperty: 'response.videos[0].bytesBase64Encoded'
    }, position: [760, 0], name: 'Convert to File' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $(\'On form submission\').item.json.submittedAt }}.mp4',
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
        value: '1tzpmwAWiUGolnKciZvcCghB5obhPoXzL',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1tzpmwAWiUGolnKciZvcCghB5obhPoXzL',
        cachedResultName: 'n8n_VertexAI'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [980, 0] } }))
  .add(sticky('### Setting GCP\n- PROJECT_ID\n- MODEL_VERSION\n- LOCATION\n- IMAGE_COUNT\n- API_ENDPOINT', { position: [-140, -160], height: 320 }))
  .add(sticky('## Veo3\n1. Sends the prompt to the Veo3 using Vertex AI’s predictLongRunning endpoint.\n2. Waits for the video rendering to complete.\n3. Fetches the final result', { name: 'Sticky Note1', color: 4, position: [120, -160], width: 580, height: 320 }))
  .add(sticky('### Convert to Video file\n\nBase64 Input Field:\n```response.videos[0].bytesBase64Encoded```', { name: 'Sticky Note2', color: 5, position: [720, -160], width: 200, height: 320 }))
  .add(sticky('### Upload Video to Google Drive', { name: 'Sticky Note3', color: 6, position: [940, -160], width: 180, height: 320 }))
  .add(sticky('### Accepts a text prompt and a GCP access token via form.\n\n\n', { name: 'Sticky Note4', color: 7, position: [-380, -160], width: 230, height: 320 }))
  .add(sticky('### Workflow Process\n![Alt text](https://drive.google.com/thumbnail?id=1L9KKkuS0hk5LW9hpGJ_FB9giKYFZpmy4&sz=w1000)', { name: 'Sticky Note5', color: 7, position: [-140, 180], width: 660, height: 400 }))
  .add(sticky('### Output\n![Alt text](https://drive.google.com/thumbnail?id=1Biq2vhbzaFLya1ZsF8PhGL1RRta7XkMK&sz=w1000)', { name: 'Sticky Note6', color: 7, position: [540, 180], width: 580, height: 400 }))
  .add(sticky('### How to get GCP Access Token\n\nUse this command in your VM/Cloud Shell:\n\n```bash\ngcloud auth print-access-token\n', { name: 'Sticky Note7', color: 7, position: [-380, 180], width: 230, height: 400 }))