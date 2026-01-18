return workflow('59a8WDMIKKo9faYP', 'Posting', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ triggerAtHour: 22 }] } }, position: [0, 135] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4',
        cachedResultName: 'GPT-4'
      },
      options: {},
      messages: {
        values: [
          {
            content: 'Create a 50 character title of a topic related to very specific problem related to n8n or automation.'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [220, 135], name: 'Message a model' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'chatgpt-4o-latest',
        cachedResultName: 'CHATGPT-4O-LATEST'
      },
      options: {},
      messages: {
        values: [
          {
            content: '=Based on the title: {{ $json.message.content }}\nWrite a tweet that breaks this topic down.\n\nBe solution oriented and make it easily readable with easy vocabulary\n\nAdd some hashtags too '
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [580, -140], name: 'Message a model1' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Title: '={{ $json.message.content }}',
          Description: '={{ $json.message.content }}'
        },
        schema: [
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Image',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Image',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Title'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1P18TjyEEsgUey_gqXoNsE5GlsaGDmJYVl0ZWVzxCU7U/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1P18TjyEEsgUey_gqXoNsE5GlsaGDmJYVl0ZWVzxCU7U',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1P18TjyEEsgUey_gqXoNsE5GlsaGDmJYVl0ZWVzxCU7U/edit?usp=drivesdk',
        cachedResultName: 'Automation inbound content'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [940, -15], name: 'Append or update row in sheet1' } }))
  .add(node({ type: 'n8n-nodes-base.twitter', version: 2, config: { parameters: { text: '={{ $json.Description }}', additionalFields: {} }, credentials: {
      twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' }
    }, position: [1160, 185], name: 'Create Tweet' } }))
  .add(node({ type: 'n8n-nodes-base.linkedIn', version: 1, config: { parameters: { additionalFields: {} }, position: [1160, -15], name: 'Create a post' } }))
  .add(node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: { options: {} }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [1160, 385] } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      prompt: '=Based on the title: {{ $json.message.content }}\nGenerate a japanese anime style image ',
      options: {},
      resource: 'image'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [940, 385], name: 'Generate an image' } }))