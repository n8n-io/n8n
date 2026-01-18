return workflow('qhZvZVCoV3HLjRkq', 'Google Maps FULL', { executionOrder: 'v1' })
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [-400, -60], name: 'Trigger - When User Sends Message' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: {
      options: {
        systemMessage: '\' UNIFIED AND OPTIMIZED PROMPT FOR DATA EXTRACTION VIA GOOGLE MAPS SCRAPER\n\n\' --- 1. Task ---\n\' - Collect high-quality professional leads from Google Maps, including:\n\'   - Business name\n\'   - Address\n\'   - Phone number\n\'   - Website\n\'   - Email\n\'   - Other relevant contact details\n\' - Deliver organized, accurate, and actionable data.\n\n\' --- 2. Context & Collaboration ---\n\' - Tools & Sources:\n\'   * Google Maps Scraper: Extracts data based on location, business type, and country code \n\'     (ISO 3166 Alpha-2 in lowercase).\n\'   * Website Scraper: Extracts data from provided URLs (the URL must be passed exactly as received, without quotation marks).\n\'   * Google Sheets: Stores and retrieves previously extracted data.\n\'   * Internet Search: Provides additional information if the scraping results are incomplete.\n\' - Priorities: Accuracy and efficiency, avoiding unnecessary searches.\n\n\' --- 3. Ethical Guidelines ---\n\' - Only extract publicly accessible professional data.\n\' - Do not collect or store personal/sensitive data.\n\' - Adhere to scraping policies and data protection regulations.\n\' - Error Handling:\n\'   * In case of failure or incomplete results, suggest a retry, adjusted search parameters, or an alternative source.\n\'   * If Google Sheets is unavailable, notify the user and propose workarounds.\n\n\' --- 4. Constraints ---\n\' - Country codes must follow the ISO 3166 Alpha-2 format in lowercase (e.g., "fr" for France).\n\' - When using the Website Scraper, pass the URL exactly as provided, without quotation marks or modifications.\n\' - Validate and correctly format all data (no duplicates or errors).\n\' - Store results in Google Sheets in an organized and accessible manner.\n\n\' --- 5. Final Requirements & Quality Checks ---\n\' - Verification: Ensure the country code is always passed in lowercase to the Google Maps Scraper.\n\' - URL: If a URL is provided, forward it directly to the Website Scraper without adding quotation marks.\n\' - Existing Data: Check Google Sheets to see if the data is already available before performing new scraping.\n\' - Supplementary: In case of partial results, propose using Internet Search to complete the information.\n\n\' --- 6. Interaction ---\n\' - If data already exists in Google Sheets, retrieve and present it to the user instead of launching a new scrape.\n\' - If scraping fails or returns incomplete results, suggest alternative actions (e.g., web search, verifying the country code).\n\n\' --- 7. Examples ---\n\' BAD Example (Google Maps Scraper)\n\'   User: "Find coffee shops in Paris, France."\n\'   AI: "Extracting coffee shop data from Google Maps in France."\n\'   > Issue: The country code "fr" was not provided.\n\'\n\' GOOD Example (Google Maps Scraper)\n\'   User: "Find coffee shops in Paris, France."\n\'   AI:\n\'     - "Extracting coffee shop data from Google Maps in fr (France)."\n\'     - "Scraped 50 businesses with names, addresses, phone numbers, and websites."\n\'     - "Storing results in Google Sheets under Lead_Generation_Paris_FR."\n\'\n\' BAD Example (Website Scraper)\n\'   User: "Scrape data from https://www.example.com/"\n\'   AI: "Forwarding \'https://www.example.com/\' to the Website Scraper."\n\'   > Issue: Unnecessary quotation marks around the URL.\n\'\n\' GOOD Example (Website Scraper)\n\'   User: "Scrape data from https://www.example.com/"\n\'   AI:\n\'     - "Forwarding https://www.example.com to the Website Scraper."\n\'     - "Processing data extraction and storing results in Google Sheets."\n\n\' --- 8. Output Format ---\n\' - Responses should be concise and informative.\n\' - Present data in a structured manner (e.g., business name, address, phone, website, etc.).\n\' - If data already exists, clearly display the retrieved information from Google Sheets.\n\n\' --- Additional Context & Details ---\n\'\n\' You interact with scraping APIs and databases to retrieve, update, and manage lead information.\n\' Always pass country information using lowercase ISO 3166 Alpha-2 format when using the Google Maps Scraper.\n\' If a URL is provided, it must be passed exactly as received, without quotation marks, to the Website Scraper.\n\'\n\' Known details:\n\' You extract business names, addresses, phone numbers, websites, emails, and other relevant contact information.\n\'\n\' The URL must be passed exactly as provided (e.g., https://www.example.com/) without quotation marks or formatting changes.\n\' Google Maps Scraper requires location, business type, and ISO 3166 Alpha-2 country codes to extract business listings.\n\'\n\' Context:\n\' - System environment:\n\'   You have direct integration with scraping tools, Internet search capabilities, and Google Sheets.\n\'   You interact with scraping APIs and databases to retrieve, update, and manage lead information.\n\'\n\' Role:\n\' You are a Lead Generation & Web Scraping Agent.\n\' Your primary responsibility is to identify, collect, and organize relevant business leads by scraping websites, Google Maps, and performing Internet searches.\n\' Ensure all extracted data is structured, accurate, and stored properly for easy access and analysis.\n\' You have access to two scraping tools:\n\'   1. Website Scraper – Requires only the raw URL to extract data from a specific website.\n\'      - The URL must be passed exactly as provided (e.g., https://www.example.com/) without quotation marks or formatting changes.\n\'   2. Google Maps Scraper – Requires location, business type, and ISO 3166 Alpha-2 country codes to extract business listings.\n\n\' --- FINAL INSTRUCTIONS ---\n\' 1. Adhere to all the directives and constraints above when extracting data from Google Maps (or other sources).\n\' 2. Systematically check if data already exists in Google Sheets.\n\' 3. In case of failure or partial results, propose an adjustment to the query or resort to Internet search.\n\' 4. Ensure ethical compliance: only collect public data and do not store sensitive information.\n\'\n\' This prompt will guide the AI agent to efficiently extract and manage business data using Google Maps Scraper (and other mentioned tools)\n\' while adhering to the structure, ISO country code standards, and ethical handling of information.\n'
      }
    }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: { contextWindowLength: 50 }, name: 'Memory - Track Recent Context' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.1, config: { parameters: {
          name: 'Website_Content_Crawler',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'I7KceT8Mg1lW7BW4',
            cachedResultName: 'Google Maps - sous 2 - Extract Google'
          },
          description: 'Crawl websites and extract text content to feed AI models, LLM applications, vector databases, or RAG pipelines. The Actor supports rich formatting using Markdown, cleans the HTML, downloads files, and integrates well with 🦜🔗 LangChain, LlamaIndex, and the wider LLM ecosystem.',
          workflowInputs: {
            value: {},
            schema: [],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'Tool - Crawl Business Website' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolSerpApi', version: 1, config: { parameters: { options: {} }, credentials: {
          serpApi: { id: 'credential-id', name: 'serpApi Credential' }
        }, name: 'Fallback - Enrich with Google Search' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.1, config: { parameters: {
          name: 'extract_google_maps',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: '9rD7iD6sbXqDX44S',
            cachedResultName: 'Google Maps - sous 1 - Extract Google maps'
          },
          description: 'Extract data from hundreds of places fast. Scrape Google Maps by keyword, category, location, URLs & other filters. Get addresses, contact info, opening hours, popular times, prices, menus & more. Export scraped data, run the scraper via API, schedule and monitor runs, or integrate with other tools.',
          workflowInputs: {
            value: {
              city: '={{ $fromAI(\'city\', ``, \'string\') }}',
              search: '={{ $fromAI(\'search\', ``, \'string\') }}',
              countryCode: '={{ $fromAI(\'countryCode\', ``, \'string\') }}',
              'state/county': '={{ $fromAI(\'state_county\', ``, \'string\') }}'
            },
            schema: [
              {
                id: 'search',
                type: 'string',
                display: true,
                required: false,
                displayName: 'search',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'city',
                type: 'string',
                display: true,
                required: false,
                displayName: 'city',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'state/county',
                type: 'string',
                display: true,
                required: false,
                displayName: 'state/county',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'countryCode',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'countryCode',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'Tool - Scrape Google Maps Business Data' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'GPT-4o - Generate & Process Requests' } }) }, position: [-160, -60], name: 'AI Agent - Lead Collection' } }))
  .add(trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: {
      inputSource: 'jsonExample',
      jsonExample: '{\n  "search": "carpenter",\n  "city": "san francisco",\n  "state/county": "california",\n  "countryCode": "us"\n}'
    }, position: [-460, 520], name: 'Trigger - On Subworkflow Start' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.apify.com/v2/acts/2Mdma1N6Fd0y3QEjR/run-sync-get-dataset-items',
      method: 'POST',
      options: {},
      jsonBody: '={\n    "city": "{{ $json.city }}",\n    "countryCode": "{{ $json.countryCode }}",\n    "locationQuery": "{{ $json.city }}",\n    "maxCrawledPlacesPerSearch": 5,\n    "searchStringsArray": [\n        "{{ $json.search }}"\n    ],\n    "skipClosedPlaces": false\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Authorization', value: 'Bearer <token>' }
        ]
      }
    }, position: [-240, 520], name: 'Scrape Google Maps (via Apify)' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: '',
        cachedResultUrl: '',
        cachedResultName: ''
      },
      documentId: { __rl: true, mode: 'id', value: '=' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-20, 520], name: 'Save Extracted Data to Google Sheets' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: { options: {}, aggregate: 'aggregateAllItemData' }, position: [200, 520], name: 'Aggregate Business Listings' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.apify.com/v2/acts/aYG0l9s7dbB7j3gbS/run-sync-get-dataset-items',
      method: 'POST',
      options: {},
      jsonBody: '={\n    "aggressivePrune": false,\n    "clickElementsCssSelector": "[aria-expanded=\\"false\\"]",\n    "clientSideMinChangePercentage": 15,\n    "crawlerType": "playwright:adaptive",\n    "debugLog": false,\n    "debugMode": false,\n    "expandIframes": true,\n    "ignoreCanonicalUrl": false,\n    "keepUrlFragments": false,\n    "proxyConfiguration": {\n        "useApifyProxy": true\n    },\n    "readableTextCharThreshold": 100,\n    "removeCookieWarnings": true,\n    "removeElementsCssSelector": "nav, footer, script, style, noscript, svg, img[src^=\'data:\'],\\n[role=\\"alert\\"],\\n[role=\\"banner\\"],\\n[role=\\"dialog\\"],\\n[role=\\"alertdialog\\"],\\n[role=\\"region\\"][aria-label*=\\"skip\\" i],\\n[aria-modal=\\"true\\"]",\n    "renderingTypeDetectionPercentage": 10,\n    "saveFiles": false,\n    "saveHtml": false,\n    "saveHtmlAsFile": false,\n    "saveMarkdown": true,\n    "saveScreenshots": false,\n    "startUrls": [\n        {\n            "url": "{{ $json.query }}",\n            "method": "GET"\n        }\n    ],\n    "useSitemaps": false\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }
        ]
      }
    }, position: [-320, 1000], name: 'Scrape Website Content (via Apify)' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {},
        schema: [
          {
            id: 'url',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'url',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'crawl',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'crawl',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'metadata',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'metadata',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'screenshotUrl',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'screenshotUrl',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'text',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'text',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'markdown',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'markdown',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'debug',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'debug',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'autoMapInputData',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 1886744055,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1JewfKbdS6gJhVFz0Maz6jpoDxQrByKyy77I5s7UvLD4/edit#gid=1886744055',
        cachedResultName: 'MYWEBBASE'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1JewfKbdS6gJhVFz0Maz6jpoDxQrByKyy77I5s7UvLD4',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1JewfKbdS6gJhVFz0Maz6jpoDxQrByKyy77I5s7UvLD4/edit?usp=drivesdk',
        cachedResultName: 'GoogleMaps_LEADS'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-100, 1000], name: 'Save Website Data to Google Sheets' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: { options: {}, aggregate: 'aggregateAllItemData' }, position: [120, 1000], name: 'Aggregate Website Content' } }))
  .add(sticky('# AI-Powered Lead Generation Workflow\n\nThis workflow extracts business data from Google Maps and associated websites using an AI agent.\n\n## Dependencies\n- **OpenAI API**\n- **Google Sheets API**\n- **Apify Actors**: Google Maps Scraper \n- **Apify Actors**: Website Content Crawler\n- **SerpAPI**: Used as a fallback to enrich data\n\n## External Setup Guide\n**Notion** : [Guide](https://automatisation.notion.site/GOOGLE-MAPS-SCRAPER-1cc3d6550fd98005a99cea02986e7b05)\n', { position: [-780, -200], width: 1300, height: 540 }))
  .add(sticky('# 📍 Google Maps Extractor Subworkflow\n\nThis subworkflow handles business data extraction from Google Maps using the Apify Google Maps Scraper.\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Purpose\n- Automates the collection of business leads based on:\n  - Search term (e.g., plumber, agency)\n  - City and region\n  - ISO 3166 Alpha-2 country code', { name: 'Sticky Note1', color: 4, position: [-780, 380], width: 1300, height: 440 }))
  .add(sticky('# 🌐 Website Content Crawler Subworkflow\n\nThis subworkflow processes URLs to extract readable website content using Apify\'s Website Content Crawler.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Purpose\n- Extracts detailed and structured content from business websites.\n- Enhances leads with enriched, on-site information.', { name: 'Sticky Note2', color: 5, position: [-780, 860], width: 1300, height: 400 }))