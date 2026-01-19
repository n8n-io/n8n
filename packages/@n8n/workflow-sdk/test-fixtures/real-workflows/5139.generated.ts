return workflow('REDACTED_WORKFLOW_ID', 'insta Reel publish', {
    timezone: 'UTC',
    callerPolicy: 'workflowsFromSameOwner',
    executionOrder: 'v1'
  })
  .add(trigger({ type: 'n8n-nodes-base.googleDriveTrigger', version: 1, config: { parameters: {
      event: 'fileCreated',
      options: {},
      pollTimes: { item: [{ mode: 'everyX', unit: 'minutes', value: 1 }] },
      triggerOn: 'specificFolder',
      folderToWatch: {
        __rl: true,
        mode: 'list',
        value: 'REDACTED_FOLDER_ID',
        cachedResultUrl: 'REDACTED_URL',
        cachedResultName: 'REDACTED_FOLDER_NAME'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [-864, -640], name: 'Post File Upload in Google Drive Folder  Trigger' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [-528, -304], name: 'Post File Download in N8N (Google Drive Node)' } }))
  .then(node({ type: 'n8n-nodes-base.readWriteFile', version: 1, config: { parameters: { options: {}, fileName: '/tmp/video.mp4', operation: 'write' }, position: [-352, -304], name: 'Read/Write Files from Disk' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Code (Function) Node Script - Focused on Input Debugging\nconst inputItem = items[0]; // Get the whole item, not just .json yet\n\n// Log the entire incoming item to see its structure, including binary properties if any\nconsole.log("Full Input Item to Code Node:", JSON.stringify(inputItem, null, 2));\n\nconst itemJson = inputItem.json; // Now get the JSON part\n\nlet fileId;\nlet fileName;\nlet webContentLink;\n\nif (typeof itemJson !== \'object\' || itemJson === null) {\n    console.error("Input item.json is not an object or is null. Input was:", JSON.stringify(inputItem, null, 2));\n    fileName = "Unknown Video (Input not an object)";\n} else {\n    // Try to access properties directly, assuming Google Drive File Resource structure\n    fileId = itemJson.id;\n    fileName = itemJson.name;\n    webContentLink = \'REDACTED_WEBHOOK_URL\'; // Fallback to webViewLink\n\n    console.log(`Attempting to extract: id=\'${fileId}\', name=\'${fileName}\', webContentLink=\'${webContentLink}\'`);\n\n    if (typeof fileName !== \'string\' || fileName.trim() === "") {\n        console.warn("fileName is missing or invalid in Code Node input. Actual item.json.name was:", itemJson.name, ". Setting to \'Unknown Video\'.");\n        fileName = "Unknown Video";\n    } else {\n        console.log("Successfully extracted fileName:", fileName);\n    }\n\n    if (typeof fileId !== \'string\' || fileId.trim() === "") {\n        console.warn("fileId is missing or invalid.");\n        // fileId remains as extracted or undefined\n    }\n\n    if (typeof webContentLink !== \'string\' || webContentLink.trim() === "") {\n        console.warn("webContentLink (and webViewLink) is missing or invalid.");\n        // webContentLink remains as extracted or undefined\n    }\n}\n\nconst outputData = {\n  processedFileId: fileId,\n  processedFileName: fileName,\n  processedWebContentLink: webContentLink\n};\n\nconsole.log("Output from Code Node:", JSON.stringify(outputData, null, 2));\n\n// Return structure expected by n8n\nreturn [{ json: outputData }];'
    }, position: [-208, -304] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=Generate an engaging Instagram caption for a video titled "{{ $json.processedFileName }}".\n\nHere\'s what to include:\n- 2-3 engaging sentences with appropriate emojis.\n- 3-5 relevant hashtags based on the video title.\n- A clear call-to-action encouraging comments.\n\nPlease keep the total caption under 150 characters.\n\nYou are skilled at writing clear, engaging, and detailed captions based on just a file name. Help viewers understand and appreciate the post. The tone should be relatable and suitable for an Instagram audience. Avoid using too many whimsical words or excessive adjectives. Focus on encouraging people to connect with the post and respond in the comments.',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [-144, -688], name: 'AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.airtable', version: 2.1, config: { parameters: {
      base: {
        __rl: true,
        mode: 'list',
        value: 'REDACTED_AIRTABLE_BASE_ID',
        cachedResultUrl: 'REDACTED_URL',
        cachedResultName: 'REDACTED_AIRTABLE_BASE_NAME'
      },
      table: {
        __rl: true,
        mode: 'list',
        value: 'REDACTED_AIRTABLE_TABLE_ID',
        cachedResultUrl: 'REDACTED_URL',
        cachedResultName: 'REDACTED_AIRTABLE_TABLE_NAME'
      },
      columns: {
        value: {
          URL: '={{ $(\'Code\').item.json.processedWebContentLink }}',
          Name: '={{ $(\'Code\').item.json.processedFileName }}',
          Caption: '={{ $json.output }}'
        },
        schema: [
          {
            id: 'Name',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Name',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Caption',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Caption',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'URL',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'URL',
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
      operation: 'create'
    }, credentials: {
      airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' }
    }, position: [208, -656], name: 'Airtable' } }))
  .then(node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'media',
      node: 'REDACTED_FACEBOOK_NODE_ID',
      options: {
        queryParameters: {
          parameter: [
            { name: 'video_url', value: '={{ $json.fields.URL }}' },
            { name: 'media_type', value: 'REELS' },
            {
              name: 'caption',
              value: '={{ $(\'AI Agent\').item.json.output }}'
            }
          ]
        }
      },
      graphApiVersion: 'v22.0',
      httpRequestMethod: 'POST'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [432, -656], name: 'container' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 90 }, position: [688, -624] } }))
  .then(node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'media_publish',
      node: 'REDACTED_FACEBOOK_NODE_ID',
      options: {
        queryParameters: {
          parameter: [{ name: 'creation_id', value: '={{ $json.id }}' }]
        }
      },
      graphApiVersion: 'v22.0',
      httpRequestMethod: 'POST'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [960, -592], name: 'Post to IG' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 20 }, position: [128, -144], name: 'Wait1' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: {
        __rl: true,
        mode: 'url',
        value: '={{ $(\'Post File Download in N8N (Google Drive Node)\').item.json.webViewLink }}'
      },
      options: {},
      operation: 'deleteFile'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [48, 128], name: 'Google Drive1' } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 6 }] } }, position: [-1264, -624], name: 'Schedule Trigger1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://www.googleapis.com/drive/v3/files',
      options: { response: { response: { responseFormat: 'json' } } },
      sendQuery: true,
      authentication: 'predefinedCredentialType',
      queryParameters: {
        parameters: [
          {
            name: 'q',
            value: '\'REDACTED_DRIVE_FOLDER_ID\' in parents and mimeType=\'video/mp4\' and trashed=false'
          },
          { name: 'fields', value: 'files(id, name, mimeType, parents)' },
          { name: 'supportsAllDrives', value: 'true' },
          { name: 'includeItemsFromAllDrives', value: 'true' }
        ]
      },
      nodeCredentialType: 'googleOAuth2Api'
    }, credentials: {
      googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' }
    }, position: [-1248, -384] } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const responseData = items[0].json;\n\nif (!responseData || !responseData.files || responseData.files.length === 0) {\n  console.warn("No files found in the source Google Drive folder via API or API response was unexpected.");\n  return [];\n}\n\nconst filesArray = responseData.files;\nconst randomIndex = Math.floor(Math.random() * filesArray.length);\nconst randomFile = filesArray[randomIndex];\n\nreturn [{ json: randomFile }];'
    }, position: [-1248, -160], name: 'Code1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://www.googleapis.com/drive/v3/files/{{ $json.id }}',
      method: 'PATCH',
      options: { response: { response: { responseFormat: 'json' } } },
      sendQuery: true,
      authentication: 'predefinedCredentialType',
      queryParameters: {
        parameters: [
          { name: 'addParents', value: 'REDACTED_PARENT_ID_TO_ADD' },
          {
            name: 'removeParents',
            value: 'REDACTED_PARENT_ID_TO_REMOVE'
          },
          {
            name: 'fields',
            value: 'id,name,parents,webContentLink,webViewLink,mimeType'
          }
        ]
      },
      nodeCredentialType: 'googleOAuth2Api'
    }, credentials: {
      googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' }
    }, position: [-1248, 112], name: 'HTTP Request1' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 20 }, position: [-848, -64], name: 'Wait2' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {
      path: 'REDACTED_WEBHOOK_PATH',
      options: {},
      responseMode: 'responseNode'
    }, position: [640, -32] } }))
  .then(node({ type: 'n8n-nodes-base.readWriteFile', version: 1, config: { parameters: { options: {}, fileSelector: '/tmp/video.mp4' }, position: [800, -32], name: 'Read/Write Files from Disk1' } }))
  .then(node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.4, config: { parameters: { options: {}, respondWith: 'binary' }, position: [976, -32], name: 'Respond to Webhook' } }))
  .add(sticky('## wait 20 seconds then trigger the insta posting workflow', { name: 'Sticky Note', color: 5, position: [-976, -384], width: 400, height: 720 }))
  .add(sticky('## Random file mover\n**For every 100 minutes this path of workflow will select and move a single video file from the G-drive fil named: Random video mover**', { name: 'Sticky Note1', position: [-1408, -800], width: 420, height: 1140 }))
  .add(sticky('## manual upload trigger\n\n**it will trigger the workflow whenever the video file as upload manually on the folder', { name: 'Sticky Note2', color: 3, position: [-976, -800], width: 400, height: 420 }))
  .add(sticky('## insta uploader', { name: 'Sticky Note4', color: 4, position: [-560, -800], width: 1880, height: 1140 }))
  .add(sticky('## Instagram automation workflow.....', { name: 'Sticky Note3', color: 6, position: [-1520, -880], width: 2920, height: 1320 }))
  .add(sticky('## **Webhook to serve the file** [it act as a public url for facebook Api](REDACTED_WEBHOOK_URL)', { name: 'Sticky Note5', position: [560, -128], width: 608, height: 288 }))