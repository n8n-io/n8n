return workflow('mP0xzDliHhlMDrkO', 'ElevenLabs AI Voice Cloning from YouTube', { availableInMCP: false, executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-112, 224], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      options: {},
      filtersUI: { values: [{ lookupColumn: 'ELEVENLABS VOICE ID' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1pZt5RZy6JkcnnxoSG1MFuIrNTLa0P4pVCptuk8uFJdI/edit#gid=0',
        cachedResultName: 'Foglio1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1pZt5RZy6JkcnnxoSG1MFuIrNTLa0P4pVCptuk8uFJdI',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1pZt5RZy6JkcnnxoSG1MFuIrNTLa0P4pVCptuk8uFJdI/edit?usp=drivesdk',
        cachedResultName: 'ElevenLabs Clone voice from Yotubue'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [128, 224], name: 'Get videos' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [416, 224], name: 'Loop Over Items' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const url = $json[\'YOUTUBE VIDEO\'];\n\nconst regex = /(?:youtube\\.com\\/(?:watch\\?v=|embed\\/|v\\/)|youtu\\.be\\/)([^&?/]+)/;\n\nlet match = url.match(regex);\nlet video_id = match ? match[1] : null;\n\nreturn [\n  {\n    json: {\n      video_id\n    }\n  }\n];\n'
    }, position: [736, 240], name: 'Get Video ID' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: '=https://youtube-mp3-2025.p.rapidapi.com/v1/social/youtube/audio',
      method: 'POST',
      options: {},
      sendBody: true,
      sendHeaders: true,
      bodyParameters: {
        parameters: [{ name: 'id', value: '={{ $json.video_id }}' }]
      },
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'youtube-mp3-2025.p.rapidapi.com'
          },
          { name: 'x-rapidapi-key', value: 'XXX' }
        ]
      }
    }, position: [1008, 240], name: 'From video to audio' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: '={{ $json.linkDownload }}',
      options: { response: { response: { responseFormat: 'file' } } }
    }, position: [1360, 240], name: 'Download audio' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { parameters: {
      url: 'https://api.elevenlabs.io/v1/voices/add',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'name', value: 'Teresa Mannino' },
          {
            name: 'files',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          }
        ]
      },
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [736, 576], name: 'Create voice' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          row_number: '={{ $(\'Loop Over Items\').item.json.row_number }}',
          'ELEVENLABS VOICE ID': '={{ $json.voice_id }}'
        },
        schema: [
          {
            id: 'YOUTUBE VIDEO',
            type: 'string',
            display: true,
            required: false,
            displayName: 'YOUTUBE VIDEO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'VOICE NAME',
            type: 'string',
            display: true,
            required: false,
            displayName: 'VOICE NAME',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'ELEVENLABS VOICE ID',
            type: 'string',
            display: true,
            required: false,
            displayName: 'ELEVENLABS VOICE ID',
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
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1pZt5RZy6JkcnnxoSG1MFuIrNTLa0P4pVCptuk8uFJdI/edit#gid=0',
        cachedResultName: 'Foglio1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1pZt5RZy6JkcnnxoSG1MFuIrNTLa0P4pVCptuk8uFJdI',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1pZt5RZy6JkcnnxoSG1MFuIrNTLa0P4pVCptuk8uFJdI/edit?usp=drivesdk',
        cachedResultName: 'ElevenLabs Clone voice from Yotubue'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [1360, 576], name: 'Update row in sheet' } }))
  .add(sticky('## STEP 1\n[Clone this Sheet](https://docs.google.com/spreadsheets/d/1pZt5RZy6JkcnnxoSG1MFuIrNTLa0P4pVCptuk8uFJdI/edit?usp=sharing) and fill the columns "Youtube Video" and "Voice Name"', { color: 7, position: [64, 128], width: 560, height: 272 }))
  .add(sticky('## STEP  2\nSet your [Rapid API Key with FREE Trial](https://rapidapi.com/nguyenmanhict-MuTUtGWD7K/api/youtube-mp3-2025) and enter it in the "x-rapidapi-key" field.', { name: 'Sticky Note1', color: 7, position: [672, 128], width: 592, height: 272 }))
  .add(sticky('## STEP 3\nGo to Developers, create your [ElevenLabs API Key](https://try.elevenlabs.io/ahkbf00hocnu). Set Header Auth (Name: xi-api-key, Value: YOUR_API_KEY)', { name: 'Sticky Note2', color: 7, position: [672, 448], width: 592, height: 288 }))
  .add(sticky('## Automated AI Voice Cloning from YouTube videos to ElevenLabs & Google Sheets\nThis workflow automates the process of **creating cloned voices** in **ElevenLabs** using audio extracted from **YouTube** videos. It processes a list of video URLs from Google Sheets, converts them to audio, submits them to [ElevenLabs for voice cloning](https://try.elevenlabs.io/ahkbf00hocnu)*, and records the generated voice IDs back to the spreadsheet.\n\n*ONLY FOR STARTER, CREATOR, PRO PLAN\n\n\n### **How it works:**\n\nThis workflow automates the end-to-end process of cloning voices in ElevenLabs using YouTube videos listed in a Google Sheet. It first retrieves rows without an “ELEVENLABS VOICE ID,” extracts the YouTube video ID, and converts the video to audio via RapidAPI. The resulting M4A file is downloaded and uploaded to the ElevenLabs `/v1/voices/add` endpoint to generate a new cloned voice. Finally, the generated `voice_id` is written back to the corresponding row in the Google Sheet, completing the automation loop.\n\n### **Setup steps:**\n\nStart by duplicating the Google Sheets template and filling in the "YOUTUBE VIDEO" and "VOICE NAME" columns. Obtain and configure API keys: use a RapidAPI key for the YouTube-to-audio conversion node and an ElevenLabs key in the "Create voice" node under `xi-api-key`. Optionally, replace the hardcoded voice name with a dynamic reference from your sheet. Once configured, execute the workflow to automatically create voices and update the sheet with their generated IDs.\n', { name: 'Sticky Note3', position: [64, -368], width: 1200, height: 448 }))
  .add(sticky('## MY NEW YOUTUBE CHANNEL\n👉 [Subscribe to my new **YouTube channel**](https://youtube.com/@n3witalia). Here I’ll share videos and Shorts with practical tutorials and **FREE templates for n8n**.\n\n[![image](https://n3wstorage.b-cdn.net/n3witalia/youtube-n8n-cover.jpg)](https://youtube.com/@n3witalia)', { name: 'Sticky Note4', color: 7, position: [1296, -656], width: 736, height: 736 }))