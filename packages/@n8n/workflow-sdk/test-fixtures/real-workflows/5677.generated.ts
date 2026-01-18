return workflow('qgOiQsPSKD08eiB3', 'Extract Structured Data from HackerNews, Export to Google Docs with Google Gemini', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-380, 0], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '52ddafbb-536f-45d6-9697-7ddf5b9b3869',
            name: 'Count',
            type: 'string',
            value: '5'
          }
        ]
      }
    }, position: [-160, 0], name: 'Set the Input Fields' } }))
  .then(node({ type: 'n8n-nodes-base.hackerNews', version: 1, config: { parameters: {
      limit: '={{ $json.Count }}',
      resource: 'all',
      additionalFields: {}
    }, position: [60, 0] } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [280, 0], name: 'Loop Over Items' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '267f21f5-d483-4e74-9773-b1d8a02dd984',
            name: 'author',
            type: 'string',
            value: '={{ $json.author }}'
          },
          {
            id: '667a3ffb-a07c-4f66-b253-a7c64b2aa8e0',
            name: 'url',
            type: 'string',
            value: '={{ $json._highlightResult.url.value }}'
          }
        ]
      }
    }, position: [500, 20], name: 'Set the url, author' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: { url: '={{ $json.url }}', options: {} }, position: [720, 20], name: 'Create an HTTP Request' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.7, config: { parameters: {
      text: '=Extract a human readable content. \n\nHere\'s the context :\n\n{{ $json.data }}',
      batching: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash-exp' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [980, 20], name: 'Extract Human Readable Data' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      title: '={{ $(\'Set the url, author\').item.json.author }}-HackerNews',
      folderId: 'default'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [1320, 20], name: 'Create a Google Doc' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      actionsUi: {
        actionFields: [
          {
            text: '={{ $(\'Extract Human Readable Data\').item.json.text }}',
            action: 'insert'
          }
        ]
      },
      operation: 'update',
      documentURL: '={{ $json.id }}'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [1500, 20], name: 'Update Google Docs' } }))
  .add(sticky('## Step 1\n\nSet the input field with the "Count", how many record needs to be feteched.', { position: [200, -320] }))
  .add(sticky('## Step 2\n\nSet the Google Gemini Credentials as part of the human readable data extraction', { name: 'Sticky Note1', position: [460, -320] }))
  .add(sticky('## Extract Structured Data from Hacker News, Export to Google Docs with Google Gemini\n\nHacker news data extraction with Google Gemini. Export the clean data to Google Document.', { name: 'Sticky Note2', color: 6, position: [-360, -400], width: 540, height: 240 }))
  .add(sticky('## Step 3\n\nSet the Google Document Credentials for the Hacker News data export', { name: 'Sticky Note3', position: [720, -320] }))
  .add(sticky('## Hacker News Data Extraction', { name: 'Sticky Note4', color: 5, position: [200, -140], width: 1060, height: 520 }))
  .add(sticky('## LLM Usages\n\nGoogle Gemini -> Gemini 2.0 Flash Exp Model', { name: 'Sticky Note5', color: 3, position: [-360, -140], width: 540, height: 120 }))