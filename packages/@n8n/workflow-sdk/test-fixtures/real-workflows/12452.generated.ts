return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [2704, 7360], name: 'When clicking ‘Test workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      sheetName: { __rl: true, mode: 'list', value: '', cachedResultUrl: '' },
      documentId: { __rl: true, mode: 'list', value: '', cachedResultUrl: '' }
    }, position: [2912, 7360], name: 'Get new image' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'assign-image',
            name: 'image_url',
            type: 'string',
            value: '={{ $json[\'IMAGE_URL\'] }}'
          }
        ]
      }
    }, position: [3056, 7360], name: 'Set Data' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/hunyuan3d/v2',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "input_image_url": "{{ $json.image_url }}",\n  "num_inference_steps": 50,\n  "guidance_scale": 7.5,\n  "octree_resolution": 256,\n  "textured_mesh": true\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [3360, 7360], name: 'Submit to Hunyuan3D' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 30 }, position: [3584, 7360], name: 'Wait 30 sec' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/hunyuan3d/v2/requests/{{ $(\'Submit to Hunyuan3D\').item.json.request_id }}/status',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [3792, 7360], name: 'Check Status' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/hunyuan3d/v2/requests/{{ $(\'Submit to Hunyuan3D\').item.json.request_id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [4240, 7264], name: 'Get Final Result' } }), node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 30 }, position: [3584, 7360], name: 'Wait 30 sec' } })], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'condition-completed',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.status }}',
            rightValue: 'COMPLETED'
          }
        ]
      }
    }, name: 'Is Completed?' }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      operation: 'update',
      sheetName: { __rl: true, mode: 'list', value: '', cachedResultUrl: '' },
      documentId: { __rl: true, mode: 'list', value: '', cachedResultUrl: '' }
    }, position: [4464, 7264], name: 'Update Result' } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ field: 'minutes' }] } }, position: [2704, 7248] } }))
  .add(sticky('## How it works\n1. **Trigger:** Starts manually or on a 15-minute schedule.\n2. **Fetch Data:** Reads image URLs (e.g. fashion sketches, product photos) from Google Sheets.\n3. **Generate 3D:** Sends the image to Fal.ai (Hunyuan3D v2) for processing.\n4. **Poll Status:** Loops every 30 seconds to check if the 3D model is ready.\n5. **Update Sheet:** Retrieves the `.glb` file URL and saves it back to Google Sheets.\n\n## Setup steps\n1. **Google Sheet:** Create a sheet with headers `IMAGE_URL` and `RESULT_GLB`.\n2. **Credentials:** Set up Fal.ai (API Key) and Google Sheets OAuth2 credentials.\n3. **Configuration:** Select your specific Sheet ID in the \'Get new image\' and \'Update Result\' nodes.', { position: [2912, 6624], width: 551, height: 451 }))
  .add(sticky('### 1. Input & Data Setup\nWatches for new data on schedule or manual trigger, then fetches empty rows from Google Sheets.', { name: 'Sticky Note1', color: 7, position: [2656, 7152], width: 560, height: 380 }))
  .add(sticky('### 2. Generate & Poll Status\nSubmits the image to Hunyuan3D v2, then enters a 30s wait-loop until the generation status is \'COMPLETED\'.', { name: 'Sticky Note2', color: 7, position: [3264, 7184], width: 940, height: 380 }))
  .add(sticky('### 3. Save Result\nFetches the final .glb URL and updates the Google Sheet row.', { name: 'Sticky Note3', color: 7, position: [4224, 7184], width: 380, height: 380 }))
  .add(sticky('# Image-to-3D(.glb)\n\n\nThis workflow allows users to convert a 2D image into a 3D model by integrating multiple AI and web services. The process begins with a user uploading or providing an image URL, which is then sent to a generative AI model capable of interpreting the content and generating a 3D representation in .glb format.\n\n![image](https://res.cloudinary.com/dfzmjcdxt/image/upload/v1767540624/WhatsApp_Image_2026-01-04_at_8.28.26_PM_dtxhjt.jpg)', { name: 'Sticky Note4', position: [3552, 6544], width: 708, height: 584 }))