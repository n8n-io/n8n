return workflow('8dpOtivR6zGMa8Nf', 'Automated Lead Scraper: Apify to Google Sheets', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-1740, -300] } }))
  .add(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '4486360c-2296-41ad-a48f-706e24c49a4f',
            name: 'APIFY_TOKEN',
            type: 'string',
            value: 'YOUR_APIFY_API_TOKEN'
          },
          {
            id: '6e56b0e3-36ae-4f1e-b0e5-38767bbe8af9',
            name: 'APIFY_TASK_ID',
            type: 'string',
            value: 'YOUR_APIFY_TASK_ID'
          }
        ]
      }
    }, position: [-1500, -300], name: 'Variables' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 1, config: { parameters: {
      url: '={{ \'https://api.apify.com/v2/actor-tasks/\' + $json.APIFY_TASK_ID + \'/run-sync-get-dataset-items?token=\' +$json.APIFY_TOKEN}}',
      options: { splitIntoItems: true }
    }, position: [-1280, -300], name: 'Run Apify Scraper' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Clean scraped data before LLM processing\nreturn $input.all().map(item => ({\n  ...item.json,\n  phone: item.json.phone?.replace(/[^\\d+]/g, \'\') || \'\',\n  email: item.json.email?.toLowerCase().trim() || \'\'\n}));'
    }, position: [-1080, -300], name: 'Clean Data' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          phone: '={{ $json.phone }}',
          Address: '={{ $json.address }}',
          'company name': '={{ $json.title }}'
        },
        schema: [
          {
            id: 'company name',
            type: 'string',
            display: true,
            required: false,
            displayName: 'company name',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'website',
            type: 'string',
            display: true,
            required: false,
            displayName: 'website',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'phone',
            type: 'string',
            display: true,
            required: false,
            displayName: 'phone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Address',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Address',
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
        value: 'Sheet1',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1UHkd_OuK1Xzc0ZXo7FPrsd5M1JlsIY9pJDC3fsJ3oq8/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: 'YOUR_GOOGLE_SHEET_ID',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1UHkd_OuK1Xzc0ZXo7FPrsd5M1JlsIY9pJDC3fsJ3oq8/edit?usp=drivesdk',
        cachedResultName: 'leas list solar'
      }
    }, position: [-760, -300], name: 'Export to Google Sheets' } }))
  .add(sticky('## Automated Business Lead Scraper with Apify to Google Sheets\n**Purpose:** Automates scraping business leads using Apify, cleaning the data, and exporting them to Google Sheets.\n\n**Workflow Steps:**\n1. **Manual Trigger**: Starts the workflow manually.\n2. **Set API Credentials**: Add your `APIFY_TOKEN` and `APIFY_TASK_ID`.\n3. **Run Apify Scraper**: Fetches leads using Apify HTTP API.\n4. **Clean Data**: Formats phone numbers and emails.\n5. **Export to Google Sheets**: Appends data to your spreadsheet.\n\n**Google Sheet Requirements:**\n- Sheet name: `Sheet1`\n- Columns: `company name`, `phone`, `Address`\n\n**Customization Tips:**\n- Add more fields like `email`, `website` in Clean Data and mapping.\n- Add conditions or filters before exporting.\n- Add email alerts if needed.\n', { color: 7, position: [-1860, -820], width: 1660, height: 780 }))