return workflow('ksAl8KwMcTo0Pq5S', 'Create Viral Selfie Videos With Celebrities Using Veo 3.1', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [208, 496], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      options: {},
      filtersUI: { values: [{ lookupColumn: 'MERGE' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit#gid=0',
        cachedResultName: 'Foglio1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit?usp=drivesdk',
        cachedResultName: 'Create, Extend and merge video'
      }
    }, credentials: {
      googleSheetsOAuth2Api: { id: 'JYR6a64Qecd6t8Hb', name: 'Google Sheets account' }
    }, position: [432, 496], name: 'Get prompts' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [640, 496], name: 'Loop Over Items' } }))
  .add(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      options: {},
      filtersUI: { values: [{ lookupValue: 'x', lookupColumn: 'MERGE' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit#gid=0',
        cachedResultName: 'Foglio1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit?usp=drivesdk',
        cachedResultName: 'Create, Extend and merge video'
      }
    }, credentials: {
      googleSheetsOAuth2Api: { id: 'JYR6a64Qecd6t8Hb', name: 'Google Sheets account' }
    }, position: [1024, 208], name: 'Get Video Url to merge' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Estrai tutti i VIDEO URL dall\'input\nconst videoUrls = $input.all().map(item => item.json["VIDEO URL"]);\n\n// Restituisci l\'array correttamente incapsulato\nreturn [{ \n  json: { \n    videos: videoUrls \n  } \n}];'
    }, position: [1312, 208], name: 'Set VideoUrls Json' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "video_urls": {{ JSON.stringify($json.videos) }},\n  "target_fps": 24\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'daOZafXpRXLtoLUV', name: 'Fal.run API' }
    }, position: [1648, 208], name: 'Merge Videos' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 30 }, position: [1968, 192], name: 'Wait 30 sec.' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/ffmpeg-api/requests/{{ $(\'Merge Videos\').item.json.request_id }}/status ',
      options: {},
      sendQuery: true,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      queryParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'daOZafXpRXLtoLUV', name: 'Fal.run API' }
    }, position: [2160, 192], name: 'Get status2' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/ffmpeg-api/requests/{{ $json.request_id }}',
      options: {},
      sendHeaders: true,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'daOZafXpRXLtoLUV', name: 'Fal.run API' }
    }, position: [2608, 176], name: 'Get final video url' } }), node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 30 }, position: [1968, 192], name: 'Wait 30 sec.' } })], { version: 2.2, parameters: {
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
    }, name: 'Completed?2' }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: { url: '={{ $json.video.url }}', options: {} }, position: [2912, 176], name: 'Get final video file' } }))
  .add(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $now.format(\'yyyyLLddHHmmss\') }}-{{ $(\'Get Clip Url\').item.json.video.file_name }}',
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      options: {},
      folderId: {
        __rl: true,
        mode: 'list',
        value: '1aHRwLWyrqfzoVC8HoB-YMrBvQ4tLC-NZ',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1aHRwLWyrqfzoVC8HoB-YMrBvQ4tLC-NZ',
        cachedResultName: 'Fal.run'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'HEy5EuZkgPZVEa9w',
        name: 'Google Drive account (n3w.it)'
      }
    }, position: [3264, -64], name: 'Upload Video' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.upload-post.com/api/upload',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'title', value: '=XXX' },
          { name: 'user', value: 'YOUR_USERNAME' },
          { name: 'platform[]', value: 'youtube' },
          {
            name: 'video',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          }
        ]
      },
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: {
        id: 'RfHIslxMFRjQZ043',
        name: 'Youtube Transcript Extractor API 1'
      }
    }, position: [3264, 176], name: 'Upload to Youtube' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
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
    }, credentials: { httpHeaderAuth: { id: 'GIEq2Y2xhJSgjqyG', name: 'Postiz' } }, position: [3280, 400], name: 'Upload to Postiz' } }))
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
                  content: '=XXX'
                }
              ]
            },
            integrationId: 'XXX'
          }
        ]
      },
      shortLink: true
    }, credentials: {
      postizApi: { id: 'c8iQxqMcfCXPbUHc', name: 'Postiz account' }
    }, position: [3520, 400], name: 'Upload to Social' } }))
  .add(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      options: {},
      filtersUI: { values: [{ lookupColumn: 'VIDEO URL' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit#gid=0',
        cachedResultName: 'Foglio1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit?usp=drivesdk',
        cachedResultName: 'Create, Extend and merge video'
      }
    }, credentials: {
      googleSheetsOAuth2Api: { id: 'JYR6a64Qecd6t8Hb', name: 'Google Sheets account' }
    }, position: [992, 752], name: 'Get prompt' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'c713d31f-9abd-496a-ac79-e8e2efe60aa0',
            name: 'prompt',
            type: 'string',
            value: '={{ $json.PROMPT }}'
          },
          {
            id: 'e8592b0f-4e8a-4922-a02a-d8d3cfb77ac8',
            name: 'duration',
            type: 'string',
            value: '={{ $json.DURATION }}'
          },
          {
            id: 'f44b3427-aaf1-405c-b79c-ba3e0f60955f',
            name: 'first_image',
            type: 'string',
            value: '={{ $json.START}}'
          },
          {
            id: 'd5c1a666-c47e-49c8-9b77-d8b4c3e2550e',
            name: 'last_image',
            type: 'string',
            value: '={{ $json.LAST}}'
          }
        ]
      }
    }, position: [1296, 752], name: 'Set params' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: 'https://queue.fal.run/fal-ai/veo3.1/fast/first-last-frame-to-video',
      method: 'POST',
      options: {},
      jsonBody: '={\n    "prompt": "{{ $json.prompt }}",\n    "aspect_ratio": "auto",\n    "duration": "{{ $json.duration }}s",\n    "resolution": "720p",\n    "generate_audio": false,\n    "first_frame_url": "{{ $json.first_image }}",\n    "last_frame_url": "{{ $json.last_image }}"\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpBearerAuth: { id: 'u75HwwBnJXHF7gx6', name: 'Runpods' },
      httpHeaderAuth: { id: 'daOZafXpRXLtoLUV', name: 'Fal.run API' }
    }, position: [1744, 752], name: 'Generate clip' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 60 }, position: [1984, 752], name: 'Wait 60 sec.' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/veo3.1/requests/{{ $(\'Generate clip\').item.json.request_id }}/status',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpBearerAuth: { id: 'u75HwwBnJXHF7gx6', name: 'Runpods' },
      httpHeaderAuth: { id: 'daOZafXpRXLtoLUV', name: 'Fal.run API' }
    }, position: [2176, 752], name: 'Get status clip' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://queue.fal.run/fal-ai/veo3.1/requests/{{ $(\'Generate clip\').item.json.request_id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpBearerAuth: { id: 'u75HwwBnJXHF7gx6', name: 'Runpods' },
      httpHeaderAuth: { id: 'daOZafXpRXLtoLUV', name: 'Fal.run API' }
    }, position: [2624, 736], name: 'Get Clip Url' } }), node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 60 }, position: [1984, 752], name: 'Wait 60 sec.' } })], { version: 2.2, parameters: {
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
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          MERGE: 'x',
          'VIDEO URL': '={{ $(\'Completed?\').item.json.video.url }}',
          row_number: '={{ $(\'Loop Over Items\').item.json.row_number }}'
        },
        schema: [
          {
            id: 'START',
            type: 'string',
            display: true,
            required: false,
            displayName: 'START',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'LAST',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'LAST',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PROMPT',
            type: 'string',
            display: true,
            required: false,
            displayName: 'PROMPT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'DURATION',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'DURATION',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'VIDEO URL',
            type: 'string',
            display: true,
            required: false,
            displayName: 'VIDEO URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'MERGE',
            type: 'string',
            display: true,
            required: false,
            displayName: 'MERGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'number',
            display: true,
            removed: false,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['row_number'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1MisBkHc1RmsYit1ndaPS7oOvSQV1VBMW7nyehTuiRQs/edit#gid=0',
        cachedResultName: 'Foglio1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit?usp=drivesdk',
        cachedResultName: 'Create, Extend and merge video'
      }
    }, credentials: {
      googleSheetsOAuth2Api: { id: 'JYR6a64Qecd6t8Hb', name: 'Google Sheets account' }
    }, position: [1456, 1200], name: 'Update video url' } }))
  .add(sticky('Set YOUR_USERNAME and TITLE for [Upload-Post]((https://www.upload-post.com/?linkId=lp_144414&sourceId=n3witalia&tenantId=upload-post-app))', { name: 'Sticky Note', color: 7, position: [3232, 112], width: 468, height: 200 }))
  .add(sticky('Set Channel_ID and TITLE for [Postiz](https://affiliate.postiz.com/n3witalia) (TikTok, Instagram, Facebook, X, Youtube)', { name: 'Sticky Note1', color: 7, position: [3232, 336], width: 468, height: 200 }))
  .add(sticky('Upload final video to Google Drive', { name: 'Sticky Note2', color: 7, position: [3232, -112], width: 468, height: 200 }))
  .add(sticky('## Create Viral Selfie Videos With Celebrities Using Veo 3.1 & Share Everywhere\n\nhis workflow demonstrates how to create **viral AI-generated selfie videos featuring famous characters** using a fully automated and platform-independent approach.\n\nThe process is designed to replicate the kind of celebrity selfie videos that are currently going viral on social media and YouTube, where a **realistic selfie-style video** appears to show the creator together with a well-known **public figure**.\n\nInstead of relying on a proprietary or closed platform, the workflow explains how to build the entire pipeline using direct access to **Google Veo 3.1** APIs, giving full control over generation, orchestration, and distribution.\n\n### **How it works:**\n\nThis workflow automates the end-to-end process of generating AI-based selfie-style videos featuring public figures. It begins by reading prompts and image data from a Google Sheet, then uses the **fal.ai VEO 3.1 API** to create individual video clips asynchronously. Each video’s completion status and URL are automatically updated back to the sheet. Once all clips are ready, they are merged into a single final video using the **fal.ai FFmpeg API**, and the completed file is optionally uploaded to platforms like Google Drive, YouTube, or Postiz for distribution. The workflow includes built-in polling, error handling, and content moderation checks to ensure reliable processing.\n\n\n\n### **Setup steps:**\n\nPrepare a Google Sheet with specific columns (`START`, `LAST`, `PROMPT`, `DURATION`, `VIDEO URL`, `MERGE`) and connect it to n8n via OAuth2. Configure **fal.ai API** access with a valid API key and set up HTTP Header authentication. Optionally, connect upload services like **Google Drive**, **YouTube/upload-post.com**, and **Postiz** with their respective credentials. Enable upload nodes once authentication is complete, and fine-tune wait intervals for video generation and merging. Finally, manually trigger the workflow and monitor execution, verifying video URLs and merge results directly in the Google Sheet.\n', { name: 'Sticky Note3', position: [944, -624], width: 1120, height: 592 }))
  .add(sticky('## STEP 1 - Prepare the Sheet\n- Clone [this sheet](https://docs.google.com/spreadsheets/d/1QLZmenUJ-vQAw2UzCe-zKTeWU9ybC1aVfi4ThVq3aUg/edit?usp=sharing) and fill the columns START, LAST, PROMPT and DURATION as in the current sheet\n\n**VERY IMPORTANT:** the image in the **LAST** column must be the same as the image in the **START** column of the following row!\n', { name: 'Sticky Note4', color: 7, position: [368, 256], width: 448, height: 464 }))
  .add(sticky('## STEP 2 - Generate videos based on the provided prompt\nFor each row in the sheet, the workflow calls the fal.ai VEO 3.1 API to generate a video clip based on the provided prompt, start image, end image, and duration. The clip is created asynchronously, so the workflow polls the API for status until completion.\n\nCreate an account [here](https://fal.ai/) and obtain API KEY.\nIn the HTTP\'s nodes set "Header Auth" and set:\n- Name: "Authorization"\n- Value: "Key YOURAPIKEY"', { name: 'Sticky Note5', color: 7, position: [944, 544], width: 1888, height: 464 }))
  .add(sticky('## STEP 3 - Update Sheet\nUpdate sheet with the generated video url', { name: 'Sticky Note6', color: 7, position: [944, 1040], width: 1888, height: 384 }))
  .add(sticky('## STEP 4 - Merge videos\nMerge the individual clips into a single, linear video using Fal AI’s ffmpeg API.\n\nIn the HTTP\'s nodes set "Header Auth" and set:\n- Name: "Authorization"\n- Value: "Key YOURAPIKEY"', { name: 'Sticky Note7', color: 7, position: [944, 16], width: 1888, height: 496 }))
  .add(sticky('## STEP 5 - Upload video\nUpload video to Google Drive and social media platforms', { name: 'Sticky Note8', color: 7, position: [3200, -208], width: 528, height: 784 }))
  .add(sticky('## MY NEW YOUTUBE CHANNEL\n👉 [Subscribe to my new **YouTube channel**](https://youtube.com/@n3witalia). Here I’ll share videos and Shorts with practical tutorials and **FREE templates for n8n**.\n\n[![image](https://n3wstorage.b-cdn.net/n3witalia/youtube-n8n-cover.jpg)](https://youtube.com/@n3witalia)', { name: 'Sticky Note9', color: 7, position: [2096, -768], width: 736, height: 736 }))