return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {
        buttonLabel: 'Scrape',
        appendAttribution: false,
        respondWithOptions: { values: { formSubmittedText: 'Scraping started 🔎' } }
      },
      formTitle: 'Maps Extractor',
      formFields: {
        values: [
          {
            fieldLabel: 'Location URL',
            placeholder: 'https://www.google.com.br/maps/@-27.0969036,-52.6273034,14z?hl=pt-BR&entry=ttu&g_ep=EgoyMDI1MDcwOS4wIKXMDSoASAFQAw%3D%3D',
            requiredField: true
          },
          {
            fieldLabel: 'Keyword Search',
            placeholder: 'Restaurant',
            requiredField: true
          },
          {
            fieldLabel: 'Country',
            placeholder: 'US',
            requiredField: true
          },
          {
            fieldLabel: 'My company\'s segment',
            placeholder: 'Marketing Agency',
            requiredField: true
          }
        ]
      },
      formDescription: 'Use this form to scrape businesses from Google Maps, based on a starting location.\n\nMake sure to copy the URL from your browser address bar. DO NOT use the Share feature in Google Maps.'
    }, position: [-2736, 384], name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '3210b179-d62e-458a-a265-c8ecdb21423f',
            name: 'latitude',
            type: 'string',
            value: '={{ $json[\'Location URL\'].match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/)[1] }}'
          },
          {
            id: 'b2c0c095-08a1-434e-86cd-a68901666d1a',
            name: 'longitude',
            type: 'string',
            value: '={{ $json[\'Location URL\'].match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/)[2] }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [-2528, 384], name: 'Extract latitude and logitude from URL' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.brightdata.com/datasets/v3/trigger',
      method: 'POST',
      options: {},
      jsonBody: '=[\n  {\n    "country": "{{ $json.Country }}",\n    "zoom_level": "14",\n    "keyword": "{{ $json[\'Keyword Search\'] }}",\n    "lat": "{{ $json.latitude }}",\n    "long": {{ $json.longitude.toNumber() }}\n  }\n]',
      sendBody: true,
      sendQuery: true,
      specifyBody: 'json',
      authentication: 'predefinedCredentialType',
      queryParameters: {
        parameters: [
          { name: 'dataset_id', value: 'gd_m8ebnr0q2qlklc02fz' },
          { name: 'include_errors', value: 'true' },
          { name: 'type', value: 'discover_new' },
          { name: 'discover_by', value: 'location' }
        ]
      },
      nodeCredentialType: 'brightdataApi'
    }, credentials: {
      brightdataApi: { id: 'credential-id', name: 'brightdataApi Credential' }
    }, position: [-2304, 384], name: 'Bright Data | Request data' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'ef3259b8-3818-4584-ad70-72ea81dafda2',
            name: 'count',
            type: 'number',
            value: 0
          }
        ]
      }
    }, position: [-2064, 384], name: 'Count1' } }))
  .then(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [-1840, 384], name: 'No Operation, do nothing4' } }))
  .then(node({ type: '@brightdata/n8n-nodes-brightdata.brightData', version: 1, config: { parameters: {
      resource: 'webScrapper',
      operation: 'monitorProgressSnapshot',
      snapshot_id: '={{ $(\'Bright Data | Request data\').item.json.snapshot_id }}',
      requestOptions: {}
    }, credentials: {
      brightdataApi: { id: 'credential-id', name: 'brightdataApi Credential' }
    }, position: [-1632, 384], name: 'Check status of data extraction' } }))
  .then(ifBranch([node({ type: '@brightdata/n8n-nodes-brightdata.brightData', version: 1, config: { parameters: {
      resource: 'webScrapper',
      operation: 'downloadSnapshot',
      snapshot_id: '={{ $(\'Bright Data | Request data\').item.json.snapshot_id }}',
      requestOptions: {}
    }, credentials: {
      brightdataApi: { id: 'credential-id', name: 'brightdataApi Credential' }
    }, position: [-1168, 384], name: 'Download the snapshot content' } }), node({ type: 'n8n-nodes-base.if', version: 2.2, config: { parameters: {
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
            id: 'f118e0f7-8+1234567890-f0f31b4cdfd6',
            operator: { type: 'number', operation: 'equals' },
            leftValue: '={{ $(\'No Operation, do nothing4\').last().json.count }}',
            rightValue: 10
          }
        ]
      }
    }, position: [-1824, 640], name: 'Reached retry limit' } })], { version: 2.2, parameters: {
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
            id: 'ea3eb544-5ee9-49b4-85b2-3af89684ed61',
            operator: { type: 'string', operation: 'notEquals' },
            leftValue: '={{ $json.status }}',
            rightValue: '=running'
          }
        ]
      }
    }, name: 'Request finished' }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e695fad7-d55c-4d88-8ce8-f7940f0bb902',
            name: 'place_id',
            type: 'string',
            value: '={{ $json.place_id }}'
          },
          {
            id: '5ec77d22-6cae-49a2-9bad-16a542f0929c',
            name: '=company.google_url',
            type: 'string',
            value: '={{ $json.url }}'
          },
          {
            id: 'd318da82-27c7-431c-9fe0-dfd1819436e1',
            name: 'company.name',
            type: 'string',
            value: '={{ $json.name }}'
          },
          {
            id: '6b040b65-255c-4f3a-9bb8-e40eda983106',
            name: 'company.category',
            type: 'string',
            value: '={{ $json.category }}'
          },
          {
            id: '13ebb481-c965-4c2e-aa4f-da4a5a5f9de2',
            name: 'company.address',
            type: 'string',
            value: '={{ $json.address }}'
          },
          {
            id: 'eeebdad8-ca95-4b94-a7d1-f9a260b91844',
            name: 'company.description',
            type: 'string',
            value: '={{ $json.description }}'
          },
          {
            id: 'f4d61c24-1dea-48c8-b0c5-b34db06f434a',
            name: 'company.reviews_count',
            type: 'number',
            value: '={{ $json.reviews_count }}'
          },
          {
            id: '06cc04a8-dc98-4deb-aaa9-8d3258cefc31',
            name: 'company.rating',
            type: 'number',
            value: '={{ $json.rating }}'
          },
          {
            id: '5db1cdc7-e02f-4aa0-8a63-fac3b404ba5f',
            name: 'company.services_provided',
            type: 'array',
            value: '={{ $json.services_provided }}'
          },
          {
            id: '0d22b017-0cc9-4e04-9b1e-1cb15474f56c',
            name: 'company.open_website',
            type: 'string',
            value: '={{ $json.open_website }}'
          },
          {
            id: '2abb740f-0dcf-4d1b-96a9-408013eb76fe',
            name: 'company.phone_number',
            type: 'string',
            value: '={{ $json.phone_number }}'
          },
          {
            id: '11b1a2e5-c226-4585-a2cc-42d08918dcd8',
            name: 'company.top_reviews',
            type: 'array',
            value: '={{ $json.top_reviews }}'
          }
        ]
      }
    }, position: [-688, 384], name: 'Organize data' } }), node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 10 }, position: [-912, 592] } })], { version: 2.2, parameters: {
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
            id: '7095f725-e308-44a2-884b-23f64a38b5cf',
            operator: { type: 'string', operation: 'notEquals' },
            leftValue: '={{ $json.status }}',
            rightValue: 'building'
          }
        ]
      }
    }, name: 'Snapshot finished building' }))
  .then(node({ type: 'n8n-nodes-base.limit', version: 1, config: { parameters: { maxItems: 15 }, position: [-464, 384], name: 'Set Limit' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [-240, 384], name: 'Loop Over Items' } }))
  .then(ifBranch([node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      text: '=Use the tool \'scrape_as_markdown\' with the url:\n{{ $json.company.open_website }}',
      options: {
        systemMessage: '=You are a web-scraping AI agent equipped with the tool \'scrape_as_markdown\'.\n\n# TASK\nScrape the homepage of the provided website and generate a structured summary of the company based on the main content.\n\n## OBJECTIVES\n1. Scrape.\n2. Extract only the core content of the page.\n3. Identify key information:\n   - Company mission or vision\n   - Products or services offered\n   - Target audience or market\n   - Key messaging, branding, or positioning\n   - Any highlighted achievements, updates, or announcements\n\n## CONSTRAINTS\n- Prioritize meaningful textual content over visuals or layout elements.\n- Ensure clarity and neutrality in the summary.\n\n# OUTPUT REQUIREMENTS\nReturn a summary of 300-500 words in the following format:\n[Company Name]:\n\n[Summary of company in 300-500 words, clearly structured and written in neutral, informative language.]'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-5-mini',
            cachedResultName: 'gpt-5-mini'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'gpt-5-mini' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.mcpClientTool', version: 1.1, config: { parameters: {
          include: 'selected',
          endpointUrl: '=https://mcp.brightdata.com/mcp?token=YOUR_BRIGHT_DATA_TOKEN',
          includeTools: ['scrape_as_markdown'],
          serverTransport: 'httpStreamable'
        }, name: 'scrape_as_markdown' } })] }, position: [272, 0], name: 'Scrape & Summarize' } }), node({ type: 'n8n-nodes-base.merge', version: 3.2, config: { position: [880, 384] } })], { version: 2.2, parameters: {
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
            id: '48807393-7b5c-4403-9d00-7dff6d9b1a5b',
            operator: { type: 'string', operation: 'exists', singleValue: true },
            leftValue: '={{ $json?.company?.open_website }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'Company website exists' }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'aacc7f04-f2db-4dbd-8089-21a11ce5eaa4',
            name: 'summary',
            type: 'string',
            value: '={{ $json.output }}'
          },
          {
            id: '9011fbcc-142b-4366-ad43-5462b4d1a4c1',
            name: 'company',
            type: 'object',
            value: '={{ $(\'Set Limit\').item.json.company }}'
          },
          {
            id: '84077369-7220-47d3-b072-72e7f976b20a',
            name: 'place_id',
            type: 'string',
            value: '={{ $(\'Set Limit\').item.json.place_id }}'
          }
        ]
      }
    }, position: [640, 0], name: 'Set Fields' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.7, config: { parameters: {
      text: '={{ JSON.stringify($json) }}',
      batching: {},
      messages: {
        messageValues: [
          {
            message: '=You are a business development assistant helping an entrepreneur prepare for a cold call to a business lead.\n\nTake into account that my company segment is: {{ $(\'On form submission\').first().json[\'My company\\\'s segment\'] }}\n\n# TASK\nYou will receive structured data about a business, including basic info, services, reviews, and contact details.\n\nYour job is to generate:\n1. A short cold call opening message the entrepreneur can use to start the conversation.\n2. A list of supportive talking points or insights the entrepreneur can use during the call to sound informed and build rapport.\n\n# OUTPUT STRUCTURE\n1. Opening Message (Spoken Script):\n- 2–4 sentences.\n- Friendly, confident, respectful tone.\n- Show that the caller is familiar with the business.\n- Mention something specific (e.g. high rating, food quality, atmosphere, community praise).\n- Introduce the caller’s intention (e.g. connect, collaborate, learn more).\n\n2. Call Support Notes (Bullet List):\n- Provide 3–5 relevant talking points about the business based on reviews, services, and offerings.\n- Suggest areas the entrepreneur can mention or ask about (e.g. “Your place seems popular with tourists and locals alike — how do you approach that balance?”)\n- Avoid quoting reviews verbatim — instead, summarize sentiment or praise.\n\n# INSTRUCTIONS\n- Generate a personalized cold call opening message\n- Generate a list of insightful, natural talking points to help the entrepreneur carry the conversation confidently\n\n# GUIDELINES\n- Output only the results, without any intro or outro text.'
          }
        ]
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.5-pro' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [1088, 384], name: 'Message Generator' } }))
  .then(node({ type: 'n8n-nodes-base.postgres', version: 2.6, config: { parameters: {
      table: {
        __rl: true,
        mode: 'list',
        value: 'business_scraping_result',
        cachedResultName: 'business_scraping_result'
      },
      schema: { __rl: true, mode: 'list', value: 'public' },
      columns: {
        value: {
          name: '={{ $(\'Merge\').item.json.company.name }}',
          rating: '={{ $(\'Merge\').item.json.company.rating }}',
          address: '={{ $(\'Merge\').item.json.company.address }}',
          website: '={{ $(\'Merge\').item.json.company.open_website }}',
          category: '={{ $(\'Merge\').item.json.company.category }}',
          place_id: '={{ $(\'Merge\').item.json.place_id }}',
          google_url: '={{ $(\'Merge\').item.json.company.google_url }}',
          description: '={{ $(\'Merge\').item.json.company.description }}',
          top_reviews: '={{ { "reviews": $(\'Merge\').item.json.company.top_reviews } }}',
          page_summary: '={{ $(\'Merge\').item.json.summary }}',
          phone_number: '={{ $(\'Merge\').item.json.company.phone_number }}',
          sales_helper: '={{ $json.text }}',
          reviews_count: '={{ $(\'Merge\').item.json.company.reviews_count }}',
          services_provided: '={{ $(\'Merge\').item.json.company.services_provided }}'
        },
        schema: [
          {
            id: 'place_id',
            type: 'string',
            display: true,
            removed: false,
            required: true,
            displayName: 'place_id',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'page_summary',
            type: 'string',
            display: true,
            required: false,
            displayName: 'page_summary',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'name',
            type: 'string',
            display: true,
            required: false,
            displayName: 'name',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'category',
            type: 'string',
            display: true,
            required: false,
            displayName: 'category',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'address',
            type: 'string',
            display: true,
            required: false,
            displayName: 'address',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'description',
            type: 'string',
            display: true,
            required: false,
            displayName: 'description',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'google_url',
            type: 'string',
            display: true,
            required: false,
            displayName: 'google_url',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'website',
            type: 'string',
            display: true,
            required: false,
            displayName: 'website',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'phone_number',
            type: 'string',
            display: true,
            required: false,
            displayName: 'phone_number',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'reviews_count',
            type: 'number',
            display: true,
            required: false,
            displayName: 'reviews_count',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'rating',
            type: 'number',
            display: true,
            required: false,
            displayName: 'rating',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'services_provided',
            type: 'array',
            display: true,
            required: false,
            displayName: 'services_provided',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'top_reviews',
            type: 'object',
            display: true,
            required: false,
            displayName: 'top_reviews',
            defaultMatch: false,
            canBeUsedToMatch: false
          },
          {
            id: 'sales_helper',
            type: 'string',
            display: true,
            required: false,
            displayName: 'sales_helper',
            defaultMatch: false,
            canBeUsedToMatch: false
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['place_id'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'upsert'
    }, credentials: {
      postgres: { id: 'credential-id', name: 'postgres Credential' }
    }, position: [1456, 384], name: 'Supabase | Upsert row' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 60 }, position: [-1584, 640], name: 'Wait5' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'd05a51e9-98b5-4f27-a9bc-a7a2a7a16c8d',
            name: '=count',
            type: 'number',
            value: '={{ $(\'No Operation, do nothing4\').last().json.count + 1}}'
          }
        ]
      }
    }, position: [-1408, 640], name: 'Count Increment1' } }))
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-2720, -96], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.postgres', version: 2.6, config: { parameters: {
      query: 'CREATE TABLE business_scraping_result (\n    place_id text PRIMARY KEY,\n    page_summary TEXT,\n    name TEXT,\n    category TEXT,\n    address TEXT,\n    description TEXT,\n    google_url TEXT,\n    website TEXT,\n    phone_number TEXT,\n    reviews_count INTEGER,\n    rating NUMERIC(2,1),\n    services_provided TEXT[],\n    top_reviews JSONB,\n    sales_helper TEXT\n);\n',
      options: {},
      operation: 'executeQuery'
    }, credentials: {
      postgres: { id: 'credential-id', name: 'postgres Credential' }
    }, position: [-2448, -96], name: 'Create Table' } }))
  .add(sticky('## Retry logic\nRetries until the extraction is ready or until the retry limit is reached', { name: 'Sticky Note', color: 7, position: [-2096, 272], width: 848, height: 592 }))
  .add(sticky('### ☝️ Bright Data MCP\nPlace your token here', { name: 'Sticky Note1', color: 3, position: [480, 352], width: 192, height: 80 }))
  .add(sticky('## Run this to create your Supabase table', { name: 'Sticky Note2', color: 4, position: [-2768, -336], width: 528, height: 432 }))
  .add(sticky('The `zoom_level` controls the radius of your search. A lower zoom means a higher radius.\n\nThe `dataset_id` refers to the [Google Maps scraper](https://brightdata.com/cp/scrapers/api/gd_m8ebnr0q2qlklc02fz/location/) from BrightData', { name: 'Sticky Note3', color: 7, position: [-2384, 224], width: 256, height: 336 }))
  .add(sticky('Limit the amount of items to save in your database, if you\'d like.', { name: 'Sticky Note4', color: 7, position: [-528, 304], width: 224, height: 224 }))
  .add(sticky('A loop is used here to ensure that even if an error occurs with one of the items, all previous items will still be saved in the database.', { name: 'Sticky Note6', color: 7, position: [-288, 240], width: 208, height: 288 }))
  .add(sticky('To connect to Supabase using Postgres credentials, just click the `Connect` button in Supabase header and use the `Transaction pooler` parameters.\n\n[Official documentation](https://supabase.com/docs/guides/database/connecting-to-postgres)', { name: 'Sticky Note7', color: 7, position: [1376, 224], width: 272, height: 320 }))
  .add(sticky('To connect to Supabase using Postgres credentials, just click the `Connect` button in Supabase header and use the `Transaction pooler` parameters.\n\n[Official documentation](https://supabase.com/docs/guides/database/connecting-to-postgres)', { name: 'Sticky Note8', color: 7, position: [-2544, -256], width: 272, height: 320 }))
  .add(sticky('### This n8n workflow automates lead extraction from Google Maps, enriches data with AI, and stores results for cold outreach.\n\nIt uses the [Bright Data](https://brightdata.com/) community node and Bright Data MCP for scraping and AI message generation.\n\n### **How it works**\n1. **Form Submission**\n    \n    User provides Google Maps starting location, keyword and country.\n    \n2. **Bright Data Scraping**\n    \n    [Bright Data](https://brightdata.com/) community node triggers a Maps scraping job, monitors progress, and downloads results.\n    \n3. **AI Message Generation**\n    \n    Uses Bright Data MCP with LLMs to create a personalized cold call script and talking points for each lead.\n    \n4. **Database Storage**\n    \n    Enriched leads and scripts are upserted to Supabase.\n    \n\n### **How to use**\nSet up all the credentials, create your Postgres table and submit the form. The rest happens automatically.\n\n### **Requirements**\n- LLM account (OpenAI, Gemini…) for API usage.\n- [Bright Data](https://brightdata.com/) account for API and MCP usage.\n- Supabase account (or other Postgres database) to store information.', { name: 'Sticky Note5', position: [-3216, -336], width: 416, height: 848 }))
  .add(sticky('# Author\n![Solomon](https://gravatar.com/avatar/79aa147f090807fe0f618fb47a1de932669e385bb0c84bf3a7f891ae7d174256?r=pg&d=retro&size=200)\n### Solomon\n🎓 AI & Automation Educator - Follow me on [LinkedIn](https://www.linkedin.com/in/guisalomao/)\n\nFor business inquiries:\n- automations.solomon@gmail.com\n- [Telegram](https://t.me/salomaoguilherme)\n- [LinkedIn](https://www.linkedin.com/in/guisalomao/)\n\n\n### Check out my other templates\n### 👉 https://n8n.io/creators/solomon/\n', { name: 'Sticky Note10', color: 7, position: [1680, -112], width: 660, height: 664 }))
  .add(sticky('### 💡 **Want to learn advanced n8n skills and earn money building workflows?**\n‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎Check out [Scrapes Academy](https://www.skool.com/scrapes/about?ref=21f10ad99f4d46ba9b8aaea8c9f58c34)', { name: 'Sticky Note16', color: 4, position: [1696, 448], width: 620, height: 80 }))