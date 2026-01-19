return workflow('GLcUQFi471pOAy9l', 'Generate AI Videos (with audio), using Sora 2 and Upload to TikTok', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.3, config: { parameters: {
      options: {},
      formTitle: 'Generate AI Videos (with audio)',
      formFields: {
        values: [
          { fieldLabel: 'PROMPT', requiredField: true },
          {
            fieldType: 'number',
            fieldLabel: 'DURATION',
            requiredField: true
          }
        ]
      },
      formDescription: 'Generate AI Videos (with audio), using OpenAI Sora 2 and Upload to TikTok'
    }, position: [-112, 576], name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/sora-2/text-to-video',
      method: 'POST',
      options: {},
      jsonBody: '={\n     "prompt": "{{ $json.PROMPT }}. Duration of the video: {{ $json.DURATION }}"\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [240, 576], name: 'Create Video' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 60 }, position: [592, 576], name: 'Wait 60 sec.' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/sora-2/requests/{{ $(\'Create Video\').item.json.request_id }}/status ',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [832, 576], name: 'Get status' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/sora-2/requests/{{ $json.request_id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [-96, 832], name: 'Get Url Video' } }), node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 60 }, position: [592, 576], name: 'Wait 60 sec.' } })], { version: 2.2, parameters: {
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
            id: '383d112e-2cc6-4dd4-8985-f09ce0bd1781',
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
    }, name: 'Completed?' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o-mini',
        cachedResultName: 'GPT-4O-MINI'
      },
      options: {},
      messages: {
        values: [
          {
            content: '=Input: {{ $(\'Get new video\').item.json.PROMPT }}'
          },
          {
            role: 'system',
            content: 'You are a YouTube SEO expert specialized in creating engaging and optimized titles.\n\nYour task is to generate an effective title for a YouTube video based on the user\'s video description.\n\nGUIDELINES:\n- Maximum 60 characters to avoid truncation\n- Use relevant keywords for SEO\n- Make the title catchy and clickable\n- Avoid excessive or misleading clickbait\n- Consider the target audience of the content\n- Use numbers, questions, or power words when appropriate\n- IMPORTANT: Generate the title in the same language as the input description\n\nOUTPUT FORMAT:\nProvide only the title, without additional explanations.\n\nEXAMPLE:\nInput: "Tutorial video on how to cook perfect pasta carbonara"\nOutput: "PERFECT Carbonara in 10 Minutes - Chef\'s Secrets"'
          }
        ]
      }
    }, position: [192, 832], name: 'Generate title' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $(\'Get Url Video\').item.json.video.url }}',
      options: {}
    }, position: [544, 832], name: 'Get File Video' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.postiz.com/public/v1/upload',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          {
            name: 'file',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          }
        ]
      },
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [832, 832], name: 'Upload Video to Postiz' } }))
  .then(node({ type: 'n8n-nodes-postiz.postiz', version: 1, config: { parameters: {
      date: '={{ $now.format(\'yyyy-LL-dd\') }}T{{ $now.format(\'HH:ii:ss\') }}',
      posts: {
        post: [
          {
            value: {
              contentItem: [
                {
                  image: {
                    imageItem: [{ id: '={{ $json.id }}', path: '={{ $json.path }}' }]
                  },
                  content: '={{ $(\'Generate title\').item.json.message.content }}'
                }
              ]
            },
            integrationId: 'XXX'
          }
        ]
      },
      shortLink: true
    }, credentials: {
      postizApi: { id: 'credential-id', name: 'postizApi Credential' }
    }, position: [1152, 832], name: 'TikTok' } }))
  .add(sticky('# Generate AI Videos (with audio), using Sora 2 and Upload to TikTok\n\nThis workflow allows users to **generate AI videos** using model **OpenAI Sora 2**, save them to **Google Drive**, generate optimized YouTube titles with GPT-5, and **automatically upload them to TikTok** . The entire process is triggered from a Form that acts as the central interface for input and output.\n\nNOTE: This workflow contains community nodes that are only compatible with the self-hosted version of n8n.\n\n\n\n\n', { name: 'Sticky Note3', color: 3, position: [-144, -80], width: 740, height: 328 }))
  .add(sticky('## STEP 3 - MAIN FLOW\nStart the workflow manually or periodically by hooking the "Schedule Trigger" node. It is recommended to set it at 5 minute intervals.', { name: 'Sticky Note5', position: [640, 128], width: 740, height: 116 }))
  .add(sticky('## STEP 1 - GET API KEY (YOURAPIKEY)\nCreate an account [here](https://fal.ai/) and obtain API KEY.\nIn the node "Create Image" set "Header Auth" and set:\n- Name: "Authorization"\n- Value: "Key YOURAPIKEY"', { name: 'Sticky Note6', position: [-144, 288], width: 740, height: 172 }))
  .add(sticky('Set API Key created in Step 2', { name: 'Sticky Note7', position: [192, 528], width: 180, height: 200 }))
  .add(sticky('Set ChannelId Step 3', { name: 'Sticky Note', position: [1104, 784], width: 180, height: 200 }))
  .add(sticky('## STEP 2 - Upload video on TikTok\n- Create an account on [Postiz](https://postiz.com/?ref=n3witalia) FREE 7 days-trial\n- Get your API Key and set it in Postiz node and Upload Image node\n- In Calendar tab on [Postiz](https://postiz.com/?ref=n3witalia) click on "Add channel" and connect your social networks (TikTok)\n- Once connected, copy the "ChannelId" for each social network and insert the appropriate one into the Postiz nodes, replacing the "XXX" string. ', { name: 'Sticky Note8', position: [640, -80], width: 740, height: 184 }))