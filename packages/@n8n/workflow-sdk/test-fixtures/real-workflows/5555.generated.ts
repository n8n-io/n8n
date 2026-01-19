return workflow('WrK2POhl0j01MouD', 'Apify_lead_generation', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-580, 460], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'enter apify (get run)',
      method: 'POST',
      options: {},
      jsonBody: '{\n    "includeWebResults": false,\n    "language": "en",\n    "locationQuery": "Toronto",\n    "maxCrawledPlacesPerSearch": 12,\n    "maxImages": 0,\n    "maximumLeadsEnrichmentRecords": 0,\n    "scrapeContacts": true,\n    "scrapeDirectories": false,\n    "scrapeImageAuthors": false,\n    "scrapePlaceDetailPage": false,\n    "scrapeReviewsPersonalData": true,\n    "scrapeTableReservationProvider": false,\n    "searchStringsArray": [\n        "barber"\n    ],\n    "skipClosedPlaces": false\n}',
      sendBody: true,
      specifyBody: 'json'
    }, position: [-360, 460], name: 'Start Results (Apify)' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes', amount: 1 }, position: [-100, 460], name: 'Wait for all results' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: { url: 'enter (get dataset url)', options: {} }, position: [100, 460], name: 'Get Results (Apify)' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: {
      include: 'selectedOtherFields',
      options: {},
      fieldToSplitOut: 'title',
      fieldsToInclude: 'address, state, neighborhood, phone, emails'
    }, position: [400, 460], name: 'Split Out into Google Sheets' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          phone: '={{ $json.phone.replace(\'+\', \'\') }}',
          state: '={{ $json.state }}',
          title: '={{ $json.title }}',
          emails: '={{ $json.emails }}',
          address: '={{ $json.address }}',
          neighborhood: '={{ $json.neighborhood }}'
        },
        schema: [
          {
            id: 'title',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'address',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'address',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'state',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'state',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'neighborhood',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'neighborhood',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'phone',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'phone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'emails',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'emails',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['title'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1EdMrBVfX_aHipnjdngetJ2fapohi6pLqULL5Onv-KpA/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: { __rl: true, mode: 'id', value: 'dssdd' }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [580, 460], name: 'Update Scraped Information' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'copy get run URL from Apify',
      method: 'POST',
      options: {},
      jsonBody: '{\n    "includeWebResults": false,\n    "language": "en",\n    "locationQuery": "Toronto",\n    "maxCrawledPlacesPerSearch": 12,\n    "maxImages": 0,\n    "maximumLeadsEnrichmentRecords": 0,\n    "scrapeContacts": true,\n    "scrapeDirectories": false,\n    "scrapeImageAuthors": false,\n    "scrapePlaceDetailPage": false,\n    "scrapeReviewsPersonalData": true,\n    "scrapeTableReservationProvider": false,\n    "searchStringsArray": [\n        "barber"\n    ],\n    "skipClosedPlaces": false\n}',
      sendBody: true,
      specifyBody: 'json'
    }, position: [0, 60], name: 'Get Results (Apify)1' } }))
  .add(sticky('## Business Lead Generation with Apify Web Scraping and Google Sheets Storage\n- Use this tool for larger amount of leads (over 100)', { name: 'Sticky Note', color: 7, position: [-700, 240], width: 1560, height: 480 }))
  .add(sticky('## Start the Apify Web Scraper Tool', { name: 'Sticky Note1', position: [-640, 380], width: 460, height: 260 }))
  .add(sticky('## Get Results from Apify ', { name: 'Sticky Note2', color: 4, position: [-160, 380], width: 440, height: 260 }))
  .add(sticky('## Small amount lead generation\n**Use for a smaller amount of lead Scraping**\n- Apify HTTP request', { name: 'Sticky Note3', color: 6, position: [-140, -60], width: 400, height: 280 }))
  .add(sticky('## Add & Organize Results Into Google Sheet', { name: 'Sticky Note4', color: 5, position: [300, 380], width: 500, height: 260 }))