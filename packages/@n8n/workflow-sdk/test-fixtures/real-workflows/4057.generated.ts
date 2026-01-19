return workflow('uQTqLH5At9PZOy2g', 'Auto-Respond to Gmail Enquiries using GPT-4o, Dumpling AI & LangChain Agent', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.gmailTrigger', version: 1.2, config: { parameters: { filters: {}, pollTimes: { item: [{ mode: 'everyMinute' }] } }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [-2300, -340], name: 'Watch Gmail for New Incoming Emails' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'GPT-4O'
      },
      options: {},
      messages: {
        values: [
          {
            content: '=Classify the following email content. Determine if it is an enquiry.\nIf it is an enquiry, return only this word: enquiry\nIf it is not an enquiry, return only this word: false\nDo not explain or add any other text. Only return the result.\nHere is the email body: {{ $json.snippet }}'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-2080, -340], name: 'Classify Email Type with GPT-4o' } }))
  .then(node({ type: 'n8n-nodes-base.filter', version: 2.2, config: { parameters: {
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
            id: 'e6019006-0980-4cd6-8e5d-3f618fbca13a',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.message.content }}',
            rightValue: 'enquiry'
          }
        ]
      }
    }, position: [-1704, -340], name: ' Only Proceed if Email is an Enquiry' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: {
      text: '={{ $(\'Watch Gmail for New Incoming Emails\').item.json.snippet }}',
      options: {
        systemMessage: 'You are a helpful assistant, use the search for information tool to search for users information.\n\nuse Gmail tool to send email'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'GPT-4o Chat Model' } }), tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {},
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Send Email Response via Gmail' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolHttpRequest', version: 1.1, config: { parameters: {
          url: 'https://app.dumplingai.com/api/v1/agents/generate-completion',
          method: 'POST',
          jsonBody: '={\n  "messages": [\n    {\n      "role": "user",\n      "content":"{{ $(\'Watch Gmail for New Incoming Emails\').item.json.snippet }}"\n    }\n  ],\n  "agentId": "a88a9b6c-1578-4da2-800b-561327367713",\n  "parseJson": "True"\n  }',
          sendBody: true,
          specifyBody: 'json',
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth'
        }, credentials: {
          httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
        }, name: 'Dumpling AI Agent – Search for Relevant Info' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: { contextWindowLength: 10 }, name: 'Memory Buffer (Past 10 Interactions)' } }) }, position: [-1392, -340], name: 'LangChain Agent Handles Reply Logic' } }))
  .add(sticky('### ✉️ Sticky Note 2: Website Scraping, Email Generation, and Sending\n\nFor leads with complete data, Dumpling AI scrapes the content of the lead’s company website. This content, combined with scraped details, is structured into a prompt using the Set node. GPT-4o processes the prompt and generates a personalized cold email. The email is then sent to the lead using Gmail. This automates targeted cold outreach using scraped insights and AI-generated messaging.\n', { name: 'Sticky Note', position: [-1500, -560], width: 480, height: 240 }))
  .add(sticky('### Sticky Note 1: Apollo Link Sourcing & Contact Scraping\n\nThis section begins the workflow manually. The Apollo lead URLs are pulled from a Google Sheet. Each link is passed to Apify which scrapes key lead details such as name, email, company website, and other contact data. After scraping, a filter checks that both an email and website were found for the lead before moving forward. This ensures only complete lead data is used for outreach.\n\n', { name: 'Sticky Note1', position: [-2320, -540], width: 540, height: 220 }))