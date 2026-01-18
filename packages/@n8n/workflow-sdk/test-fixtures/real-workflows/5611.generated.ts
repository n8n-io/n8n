return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.1, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-2864, -288], name: 'User message' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      fileId: '={{ $json.message.voice.file_id }}',
      resource: 'file'
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-2416, -384], name: 'Download File1' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'fe7ecc99-e1e8-4a5e-bdd6-6fce9757b234',
            name: 'text',
            type: 'string',
            value: '={{ $json.message.text }}'
          }
        ]
      }
    }, position: [-2304, -128], name: 'Text1' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'Voice',
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
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.message.voice.file_id }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Text',
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
                  id: '8c844924-b2ed-48b0-935c-c66a8fd0c778',
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.message.text }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'Voice or Text1' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.6, config: { parameters: { options: {}, resource: 'audio', operation: 'transcribe' }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-2208, -384], name: 'Transcribe1' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '={{ $json.text }}',
      options: {
        systemMessage: '=# Role\nYou are LeadChat. Your single job is to return a **JSON array of one object** that tells the sub-workflow what to scrape.\n\n# Required JSON schema\n```json\n[\n  {\n    "location": ["city+country"],      // lowercase, spaces→+\n    "business": ["industry"],          // lowercase, words→+\n    "job_title": ["role"]              // lowercase, words→+\n  }\n]\n'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1-nano',
            cachedResultName: 'gpt-4.1-nano'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model1' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n  "location": ["barcelona+spain"],\n  "business": ["ecommerce"],\n  "job_title": ["ceo"]\n}'
        }, name: 'Structured Output Parser' } }) }, position: [-1936, -288], name: 'Scraper agent' } }))
  .add(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      mode: 'raw',
      options: {},
      jsonOutput: '={\n  "query": {{ $json.output }}\n}\n\n'
    }, position: [-1536, -176], name: 'Generate query payload' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '/************************************************************\n * Build Apollo People-search URL from parser output\n * Handles both shapes:\n *   { query: [ { … } ] }      ← array\n *   { query: { … } }          ← object\n ************************************************************/\n\n// 1. Obtener el JSON que llega del nodo anterior\nconst inputData = $json;\n\n// 2. Normalizar para que paramsData siempre sea un objeto\nlet paramsData;\n\nif (Array.isArray(inputData.query)) {\n  // Caso antiguo: query es un array\n  paramsData = inputData.query[0];\n} else if (inputData.query) {\n  // Caso nuevo: query es un objeto\n  paramsData = inputData.query;\n} else {\n  throw new Error(\'Falta la propiedad "query" en el input\');\n}\n\n// 3. URL base de Apollo (interfaz web)\n//    Para llamar a la API REST cambia a https://api.apollo.io/v1/mixed_people/search\nconst baseURL = \'https://app.apollo.io/#/people\';\n\n// 4. Construir los parámetros dinámicos\nconst queryParts = [\n  \'sortByField=recommendations_score\',\n  \'sortAscending=false\',\n  \'page=1\',\n];\n\n// Helper para arrays → personTitles[]=ceo\nconst addArrayParams = (paramName, values) => {\n  values.forEach((val) => {\n    const decoded = val.replace(/\\+/g, \' \');          // “barcelona+spain” ⇒ “barcelona spain”\n    queryParts.push(`${paramName}[]=${encodeURIComponent(decoded)}`);\n  });\n};\n\n// job_title → personTitles[]\nif (Array.isArray(paramsData.job_title)) {\n  addArrayParams(\'personTitles\', paramsData.job_title);\n}\n\n// location → personLocations[]\nif (Array.isArray(paramsData.location)) {\n  addArrayParams(\'personLocations\', paramsData.location);\n}\n\n// business → qOrganizationKeywordTags[]\nif (Array.isArray(paramsData.business)) {\n  addArrayParams(\'qOrganizationKeywordTags\', paramsData.business);\n}\n\n// campos estáticos\nqueryParts.push(\'includedOrganizationKeywordFields[]=tags\');\nqueryParts.push(\'includedOrganizationKeywordFields[]=name\');\n\n// 5. Montar la URL final\nconst finalURL = `${baseURL}?${queryParts.join(\'&\')}`;\n\n// 6. Devolver resultado\nreturn [{ json: { finalURL } }];\n'
    }, position: [-1344, -208], name: 'Create URL' } }))
  .then(node({ type: '@apify/n8n-nodes-apify.apify', version: 1, config: { parameters: {
      build: 'latest',
      actorId: {
        __rl: true,
        mode: 'list',
        value: 'jljBwyyQakqrL1wae',
        cachedResultUrl: 'https://console.apify.com/actors/jljBwyyQakqrL1wae/input',
        cachedResultName: '🔥Apollo Scraper - Scrape upto 50k Leads'
      },
      timeout: 10000,
      operation: 'Run actor',
      customBody: '{\n    "getPersonalEmails": true,\n    "getWorkEmails": true,\n    "totalRecords": 500,\n    "url": "{{ $json.finalURL }}"\n}',
      waitForFinish: 60
    }, credentials: {
      apifyApi: { id: 'credential-id', name: 'apifyApi Credential' }
    }, position: [-1120, -208], name: 'Run an Actor' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '336074e3-b3b9-4dde-92d7-fb5af51b8ffa',
            name: 'firstName',
            type: 'string',
            value: '={{ $json.first_name }}'
          },
          {
            id: 'da8362c5-75a5-4431-847d-fd4e02112bcc',
            name: 'emailAddress',
            type: 'string',
            value: '={{ $json.email }}'
          },
          {
            id: '3c99e0e0-4184-4e85-baa0-8bb85e4e227b',
            name: 'linkedInURL',
            type: 'string',
            value: '={{ $json.linkedin_url }}'
          },
          {
            id: 'a45af1ff-7026-47a0-a42c-bdb3b27c8e3d',
            name: 'seniority ',
            type: 'string',
            value: '={{ $json.seniority }}'
          },
          {
            id: 'fa551406-a981-4fbb-babc-aa78ab10010d',
            name: 'jobTitle',
            type: 'string',
            value: '={{ $json.employment_history[0].title }}'
          },
          {
            id: '2e8d8d61-bd02-4f24-91f1-707152d99806',
            name: 'companyName',
            type: 'string',
            value: '={{ $json.employment_history[0].organization_name }}'
          },
          {
            id: '1295a702-636a-48bd-8bcd-df92162237fb',
            name: 'location',
            type: 'string',
            value: '={{ $json.city }}, {{ $json.state }}'
          },
          {
            id: '0072b657-0296-4858-b190-621831943816',
            name: 'country',
            type: 'string',
            value: '={{ $json.country }}'
          },
          {
            id: '22ce107c-30ef-4abe-9fab-8d49482da87c',
            name: 'Number',
            type: 'string',
            value: '={{ $json.organization.primary_phone && $json.organization.primary_phone.sanitized_number && $json.organization.primary_phone.sanitized_number ? $json.organization.primary_phone.sanitized_number : null }}'
          },
          {
            id: '302b9529-e16b-49ce-bbb6-ae2de90fed93',
            name: 'websiteURL',
            type: 'string',
            value: '={{ $json.organization_website_url }}'
          },
          {
            id: '13026de1-0927-44f7-8388-4d525f44974d',
            name: 'businessIndustry',
            type: 'string',
            value: '={{ $json.industry }}'
          },
          {
            id: '1a8ae803-f0bd-48d5-bf85-89b91c2e9c64',
            name: 'lastName',
            type: 'string',
            value: '={{ $json.last_name }}'
          },
          {
            id: '03cb9c0d-4c05-4d00-88a4-de33e34e7c16',
            name: 'emailStatus',
            type: 'string',
            value: '={{ $json.email_status }}'
          }
        ]
      }
    }, position: [-896, -208], name: 'Extract Info' } }))
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
            id: 'c49e7377-db5e-4458-bea5-9e297e19f620',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.emailStatus }}',
            rightValue: 'verified'
          }
        ]
      }
    }, position: [-688, -208], name: 'Only Keep Verified Emails ' } }))
  .then(node({ type: 'n8n-nodes-base.compareDatasets', version: 2.3, config: { parameters: { options: {}, mergeByFields: { values: [{}] } }, position: [-448, -240], name: 'Keep only the new leads' } }))
  .add(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [-96, -336], name: 'Already scraped' } }))
  .add(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      tableId: 'Leads_n-mail',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'firstName', fieldValue: '={{ $json.firstName }}' },
          { fieldId: 'emailAddress' },
          { fieldId: 'linkedInURL' },
          { fieldId: 'jobTitle', fieldValue: '={{ $json.jobTitle }}' },
          {
            fieldId: 'companyName',
            fieldValue: '={{ $json.companyName }}'
          },
          { fieldId: 'location', fieldValue: '={{ $json.location }}' },
          { fieldId: 'country', fieldValue: '={{ $json.country }}' },
          {
            fieldId: 'websiteURL',
            fieldValue: '={{ $json.websiteURL }}'
          },
          {
            fieldId: 'businessIndustry',
            fieldValue: '={{ $json.businessIndustry }}{{ $(\'Apollo Scraper\').item.json.organization.industry }}'
          },
          { fieldId: 'lastName', fieldValue: '={{ $json.lastName }}' }
        ]
      }
    }, position: [-160, -128], name: 'Create rows with new leads' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'feb577bf-b3fb-40da-b37b-41d82345c627',
            name: 'output',
            type: 'string',
            value: '={{ $input.all().length }} new contacts have been added to the Google Sheet!'
          }
        ]
      }
    }, position: [48, -128], name: 'Set Telegram message' } }))
  .then(node({ type: 'n8n-nodes-base.limit', version: 1, config: { position: [240, -128] } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $input.all().length }} new contacts have been added to the Google Sheet!',
      chatId: '123456789',
      additionalFields: { appendAttribution: false }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [464, -128], name: 'Confirmation message' } }))
  .add(node({ type: 'n8n-nodes-base.postgres', version: 2.6, config: { parameters: {
      table: {
        __rl: true,
        mode: 'list',
        value: 'Leads_n-mail',
        cachedResultName: 'Leads_n-mail'
      },
      schema: { __rl: true, mode: 'list', value: 'public' },
      options: { outputColumns: ['emailAddress'] },
      operation: 'select',
      returnAll: true
    }, credentials: {
      postgres: { id: 'credential-id', name: 'postgres Credential' }
    }, position: [-1136, -480], name: 'Select already scraped mails' } }))
  .add(sticky('# First step: recieve the message via audio or text', { color: 3, position: [-2880, -528], width: 860, height: 600 }))
  .add(sticky('# Create the json for the url', { name: 'Sticky Note1', position: [-2000, -528], width: 580, height: 600 }))
  .add(sticky('## Who’s it for\nGrowth hackers, SDR teams, and founders who collect lead requests via Telegram (voice or text) and want those leads scraped, verified, de-duplicated, and stored in a single Supabase table—hands-free.\n\n## How it works\n1. **Telegram trigger** captures a user’s text or voice note.  \n2. **OpenAI Whisper + GPT agent** parse the message and build a structured search query.  \n3. A **Code node** crafts a people-search URL, then an **HTTP request** calls the Apify Apollo-io Scraper to pull up to 500 contacts.  \n4. **Filters** keep only “verified” emails and compare them to a Postgres list of already-scraped addresses to avoid duplicates.  \n5. Fresh contacts are inserted into the Supabase table **Leads_n-mail**, and the bot replies with a count of new rows added. :contentReference[oaicite:0]{index=0}\n\n## How to set up\n1. Replace the hard-coded Apify token in **Apollo Scraper** with an environment variable.  \n2. Add OpenAI credentials for Whisper & GPT nodes.  \n3. Point the Postgres “dedupe” node at your existing email table (or skip it).  \n4. Update the Supabase connection and table name, then test with a sample voice note.\n\n### Supabase column headers  \n`firstName | lastName | emailAddress | linkedInURL | jobTitle | companyName | location | country | websiteURL | businessIndustry | seniority | number`\n\n## Requirements\n- Telegram Bot token  \n- OpenAI API key  \n- Apify account with Apollo-io Scraper actor  \n- Supabase project credentials (or swap for Airtable/Sheets)  \n- n8n v0.231+ self-hosted or Cloud\n\n## How to customize the workflow\n- **Change the prompt** to capture extra fields (e.g., funding stage).  \n- **Adjust totalRecords** in the HTTP node to pull more or fewer leads.  \n- **Swap storage**—write to Airtable, HubSpot, or Sheets instead of Supabase.  \n- **Add enrichment**—insert Clearbit or Hunter steps before the insert.\n\n', { name: 'Sticky Note2', color: 6, position: [-2864, 112], width: 1400, height: 800 }))
  .add(sticky('## Scrape the leads from apify actor', { name: 'Sticky Note3', color: 5, position: [-1376, -288], width: 880, height: 280 }))
  .add(sticky('## Insert the new leads to your database\n\n*can be airtable/sheets/supabase', { name: 'Sticky Note4', position: [-208, 48], height: 240 }))
  .add(sticky('## Need a tailor-made workflow? Tell me about your business and get a free proposal:\n\n**[Start here → Custom Automation Form](https://taskmorphr.com/contact)**\n\n---\n## 📈 Cost-Savings Snapshot  \nCurious what automation could save you?  \nRun the 60-second calculator:\n\n**[ROI / Cost Comparison](https://taskmorphr.com/cost-comparison)**\n\n---\n### ✉️ Reach me directly  \n`paul@taskmorphr.com`', { name: 'Sticky Note5', color: 3, position: [-1296, 64], width: 576, height: 560 }))
  .add(sticky('### 🛠️ Build it yourself  \nBrowse every ready-made workflow:  \n[Full Template Pack — coming soon](https://n8n.io/creators/diagopl/)\n', { name: 'Sticky Note6', color: 3, position: [-976, 464], width: 224, height: 128 }))