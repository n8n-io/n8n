return workflow('szS5RoHWF5QAzxqk', 'B2B AI Leads Automation', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'Contact us',
      formFields: {
        values: [
          {
            fieldLabel: 'What\'s your Full Name?',
            placeholder: 'e.g. John Wich',
            requiredField: true
          },
          {
            fieldType: 'email',
            fieldLabel: 'What is your email address?',
            placeholder: 'e.g. user@example.com',
            requiredField: true
          },
          {
            fieldType: 'number',
            fieldLabel: 'What\'s your phone number?',
            placeholder: 'e.g. 1234567890',
            requiredField: true
          },
          { fieldLabel: 'What\'s your Linkedin Profile URL' }
        ]
      },
      formDescription: 'get back to you'
    }, position: [-540, -20], name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.apollo.io/api/v1/people/match',
      method: 'POST',
      options: {},
      sendQuery: true,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      queryParameters: {
        parameters: [
          {
            name: 'name',
            value: '={{ $json[\'What\\\'s your Full Name?\'] }}'
          },
          {
            name: 'email',
            value: '={{ $json[\'What is your email address?\'] }}'
          },
          {
            name: 'reveal_phone_number',
            value: '={{ $json[\'What\\\'s your phone number?\'] }}'
          },
          {
            name: 'linkedin_url',
            value: '={{ $json[\'What\\\'s your Linkedin Profile URL\'] }}'
          }
        ]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [-320, -20] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=You are an expert lead qualifier.\n\nScore the lead from 1 to 10 based on these two criteria:\n\n— INDUSTRY MATCH (5 points max) —\n- 5 points: Industry is AI, Artificial Intelligence, Machine Learning, Data Science\n- 3-4 points: Industry is closely related (e.g., analytics, automation, enterprise AI tools)\n- 0-2 points: Unrelated industry\n\n— JOB TITLE MATCH (5 points max) —\n- 5 points: Decision-makers or influencers in AI (e.g., Head of AI, AI Director, CTO, AI Product Manager)\n- 3-4 points: Mid-level AI professionals (e.g., ML Engineer, Data Scientist)\n- 0-2 points: Not related to AI or junior roles\n\nReturn **only a single digit between 1 and 10** — no explanation, no labels, no extra text. and the data type must be a number\n\nLead details:\nName: {{ $json.person.name }}\nJob Title: {{ $json.person.title }}\nOrganization: {{ $json.person.employment_history[0].organization_name }}\n',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGroq', version: 1, config: { parameters: { options: {} }, credentials: {
          groqApi: { id: 'credential-id', name: 'groqApi Credential' }
        }, name: 'Groq Chat Model1' } }) }, position: [-100, -20], name: 'AI Agent1' } }))
  .then(ifBranch([node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=You are a professional B2B sales assistant.\n\nCompose a short, professional, and polite outreach email to schedule a call with the following lead.\n\nTone: concise and respectful. The goal is to open a conversation and set up a meeting.\n\nUse this format:\n---\nSend a message in Gmail:\nTo: {{ $(\'HTTP Request\').item.json.person.email }}\nSubject: Exploring Collaboration in AI Solutions\n\nHi {{ $(\'HTTP Request\').item.json.person.name }},\n\nI hope this message finds you well.\n\nI’m reaching out from ABC Pvt Ltd—we specialize in tailored IT solutions, including AI and machine learning services. Given your role at {{ $(\'HTTP Request\').item.json.person.employment_history[0].organization_name }}, I’d love to briefly connect and explore potential synergies.\n\nWould you be available for a quick call sometime this week?\n\nBest regards,  \nABC XYZ  \nABC Pvt Ltd\n---\n\nHere is the lead detail:\nName: {{ $(\'HTTP Request\').item.json.person.name }}\nEmail: {{ $(\'HTTP Request\').item.json.person.email }}\nJob Title: {{ $(\'HTTP Request\').item.json.person.title }}\nOrganization: {{ $(\'HTTP Request\').item.json.person.employment_history[0].organization_name }}\n\nInstructions:\nTools - Send a message in Gmail Tools for send mails',
      options: {},
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGroq', version: 1, config: { parameters: { options: {} }, credentials: {
          groqApi: { id: 'credential-id', name: 'groqApi Credential' }
        }, name: 'Groq Chat Model' } }), tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '={{ $(\'HTTP Request\').item.json.person.email }}',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {},
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}',
          emailType: 'text'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Send a message in Gmail' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { name: 'Structured Output Parser' } }) }, position: [520, -40], name: 'AI Agent' } }), null], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'or',
        conditions: [
          {
            id: 'eb511082-5f34-4027-993b-a787340fc4ea',
            operator: { type: 'number', operation: 'gte' },
            leftValue: '={{Number($json.output)}}',
            rightValue: 6
          }
        ]
      }
    }, name: 'If' }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Name: '={{ $(\'On form submission\').item.json["What\'s your Full Name?"] }}',
          Email: '={{ $(\'On form submission\').item.json["What is your email address?"] }}',
          Phone: '={{ $(\'On form submission\').item.json["What\'s your phone number?"] }}',
          'Job Title ': '={{ $(\'HTTP Request\').item.json.person.title }}',
          'Linkedin URL': '={{ $(\'On form submission\').item.json["What\'s your Linkedin Profile URL"] }}',
          Organization: '={{ $(\'HTTP Request\').item.json.person.employment_history[0].organization_name }}'
        },
        schema: [
          {
            id: 'Name',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Name',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Phone',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Phone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Email',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Job Title ',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Job Title ',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Organization',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Organization',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Linkedin URL',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Linkedin URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Lead Potential',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Lead Potential',
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
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1Z3BuYjWFsGjCjTmpyCUqtjL_gHPZDBriDzfMUudmArA/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1Z3BuYjWFsGjCjTmpyCUqtjL_gHPZDBriDzfMUudmArA',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1Z3BuYjWFsGjCjTmpyCUqtjL_gHPZDBriDzfMUudmArA/edit?usp=drivesdk',
        cachedResultName: 'N8N Leads'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [920, -40], name: 'Append row in sheet' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: { path: '17cfab42-90df-4af6-88ff-6ed925f861cc', options: {} }, position: [-540, 180] } }))
  .add(trigger({ type: 'n8n-nodes-base.googleSheetsTrigger', version: 1, config: { parameters: {
      event: 'rowAdded',
      options: {},
      pollTimes: { item: [{ mode: 'everyMinute' }] },
      sheetName: { __rl: true, mode: 'list', value: '' },
      documentId: { __rl: true, mode: 'list', value: '' }
    }, position: [-560, -240] } }))