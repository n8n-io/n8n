return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 1, config: { parameters: { path: 'banner-v7158-2025', options: {}, httpMethod: 'POST' }, position: [-992, 608], name: 'LINE Webhook1' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 1, config: { parameters: {
      jsCode: '// LINE Webhook parsing\nconst body = items[0].json.body;\n\nif (!body.events || !Array.isArray(body.events) || !body.events[0]) {\n  throw new Error("No LINE events found");\n}\n\nconst event = body.events[0];\n\nreturn [\n  {\n    json: {\n      replyToken: event.replyToken,\n      userId: event.source.userId,\n      message: event.message.text,\n      timestamp: event.timestamp\n    }\n  }\n];'
    }, position: [-800, 608], name: 'Extract Data1' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.googleGemini', version: 1, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'models/gemini-2.0-flash-lite',
        cachedResultName: 'models/gemini-2.0-flash-lite'
      },
      options: {},
      messages: {
        values: [
          {
            content: '"You are an expert Marketing Creative Director for Japanese market.\\nThe user will send you details for an ad banner in Japanese (Product, Target Audience, Catch Copy).\\nYour goal is to write a highly detailed English prompt for Nano Banana Pro (Gemini 3 Pro Image).\\n\\nIMPORTANT RULES:\\n1. Analyze the target audience and suggest appropriate color palette, mood, and design style.\\n2. Describe the visual composition with clear space for text overlay.\\n3. Include the specific Japanese Catch Copy text, instructing to render it clearly and legibly.\\n4. Specify camera angle, lighting, product placement, and overall aesthetic.\\n5. Keep the prompt focused and under 500 characters for optimal generation.\\n6. Output ONLY the English prompt text, nothing else - no explanations, no meta-commentary.\\n7. NEVER use double quotes (\\") in your response. Use \'single quotes\' or [brackets] for emphasis instead.\\n\\nExample format:\\n\'Professional product photography, [product description], featuring Japanese text [キャッチコピー] in bold modern font, [composition details], [lighting style], [color palette], negative space for additional text, high quality, 8K resolution\'\\n\\nRemember: Output ONLY the prompt text, nothing before or after. NO DOUBLE QUOTES."'
          },
          { content: '={{ $json.message }}' }
        ]
      },
      jsonOutput: true
    }, credentials: {
      googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
    }, position: [-624, 608], name: 'Optimize Prompt (Marketing)1' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Extract the actual prompt text from Gemini\'s response\nconst response = items[0].json;\n\nlet promptText = "";\n\n// Check if we have the content structure from Gemini\nif (response.content && response.content.parts && response.content.parts[0]) {\n  let text = response.content.parts[0].text;\n  \n  // Parse the JSON array if it\'s a string\n  try {\n    const parsed = JSON.parse(text);\n    // If it\'s an array, get the first element\n    if (Array.isArray(parsed) && parsed.length > 0) {\n      promptText = parsed[0];\n    } else if (typeof parsed === \'string\') {\n      promptText = parsed;\n    } else {\n      promptText = text; // Use as is if not parseable\n    }\n  } catch (e) {\n    // If JSON parsing fails, clean the text manually\n    promptText = text\n      .replace(/^\\[|\\]$/g, \'\') // Remove brackets\n      .replace(/^["\']|["\']$/g, \'\') // Remove quotes\n      .replace(/\\\\n/g, \'\') // Remove newlines\n      .trim();\n  }\n}\n\n// Clean any remaining escape characters\npromptText = promptText.replace(/\\\\"/g, \'"\').trim();\n\nreturn [{\n  json: {\n    prompt: promptText,\n    userId: $(\'Extract Data\').item.json.userId,\n    taskId: response.taskId || null\n  }\n}];'
    }, position: [-224, 608], name: 'Code1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: 'https://api.kie.ai/api/v1/jobs/createTask',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "nano-banana-pro",\n  "input": {\n    "prompt": "{{ $json.prompt }}",\n    "aspect_ratio": "1:1",\n    "resolution": "2K",\n    "output_format": "png"\n  }\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, position: [-48, 608], name: 'Submit to Nano Banana Pro1' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 10 }, position: [112, 608], name: 'Wait1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.kie.ai/api/v1/jobs/recordInfo',
      options: {},
      sendQuery: true,
      sendHeaders: true,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      queryParameters: {
        parameters: [
          { name: 'taskId', value: '={{ $json.data.taskId }}' },
          { name: 'recordId', value: '={{ $json.data.recordId }}' }
        ]
      },
      headerParameters: { parameters: [{}] }
    }, position: [272, 608], name: 'Check Job Status' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1, config: { parameters: { unit: 'seconds', amount: 10 }, position: [448, 608], name: 'Wait for Generation1' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 1, config: { parameters: {
      jsCode: '// Parse response and extract image URL\nconst response = items[0].json;\nconst data = Array.isArray(response) ? response[0] : response;\n\nif (data.code === 200 && data.data) {\n  const taskData = data.data;\n  \n  if (taskData.state === \'success\') {\n    let imageUrl = null;\n    try {\n      const resultData = JSON.parse(taskData.resultJson);\n      const resultUrls = resultData.resultUrls || [];\n      if (resultUrls.length > 0) {\n        imageUrl = resultUrls[0];\n      }\n    } catch (e) {\n      throw new Error(\'Failed to parse resultJson\');\n    }\n    \n    if (imageUrl) {\n      return [{\n        json: {\n          imageUrl: imageUrl,\n          taskId: taskData.taskId,\n          status: \'completed\'\n        }\n      }];\n    }\n  } else if (taskData.state === \'fail\') {\n    throw new Error(`Image generation failed: ${taskData.failMsg}`);\n  } else {\n    // Loop back if processing\n    return [{\n        json: { status: \'processing\' }\n    }];\n  }\n}'
    }, position: [608, 608], name: 'Parse Result1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: '={{ $json.imageUrl }}',
      options: { response: { response: { responseFormat: 'file' } } }
    }, position: [800, 608], name: 'Download Image1' } }))
  .then(node({ type: 'n8n-nodes-base.awsS3', version: 2, config: { parameters: {
      fileName: '={{ \'banner-\' + Date.now() + \'.png\' }}',
      operation: 'upload',
      bucketName: 'banners-bot-v7158',
      additionalFields: {}
    }, credentials: { aws: { id: 'credential-id', name: 'aws Credential' } }, position: [1120, 608], name: 'Upload to S' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.line.me/v2/bot/message/reply',
      method: 'POST',
      options: {},
      jsonBody: '={\n "replyToken": "{{ $(\'LINE Webhook\').item.json.body.events[0].replyToken }}",\n  "messages": [\n    {\n      "type": "image",\n      "originalContentUrl": "{{ $(\'Upload to S3\').item.json.Location }}",\n      "previewImageUrl": "{{ $(\'Upload to S3\').item.json.Location }}"\n    }\n  ]\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [1312, 608], name: 'HTTP Request2' } }))
  .add(sticky('# Instant Ad Banner Generator\n\nThis workflow generates professional marketing banners from a simple text description using **Gemini** (for prompt engineering) and **Nano Banana Pro** (for high-quality image generation).\n\n### How it works\n1. **Input:** Receives a product/concept via LINE.\n2. **Optimization:** Gemini creates a detailed marketing prompt.\n3. **Generation:** Submits job to Nano Banana Pro and polls for completion.\n4. **Delivery:** Hosts image on S3 and sends to LINE.\n\n### Setup Steps\n1. **Credentials:** Add LINE, Google Gemini, AWS S3, and Kie.ai (Header Auth).\n2. **S3:** Ensure your bucket has public read access.\n3. **Webhook:** Add the URL to LINE Developers console.', { name: 'Main Sticky Note', position: [-1504, 480], width: 350, height: 596 }))
  .add(sticky('## 1. Receive & Refine\n1. Extract text from LINE webhook.\n2. Use Gemini to optimize prompt for Japanese marketing.\n3. Generate professional, marketing-focused image prompt.', { name: 'Sticky Note ', color: 7, position: [-1056, 480], width: 680, height: 345 }))
  .add(sticky('## 2. Async Generation (Nano Banana)\n1. Submit task to Nano Banana Pro (via Kie API).\n2. Wait loop (10s) to allow processing.\n3. Check status and extract the final Image URL.', { name: 'Sticky Note 4', color: 7, position: [-272, 480], width: 1260, height: 345 }))
  .add(sticky('## 3. Host & Deliver\n1. Download the generated image.\n2. Upload to AWS S3 (Public Read).\n3. Push the image back to the user via LINE.', { name: 'Sticky Note 5', color: 7, position: [1088, 480], width: 420, height: 345 }))