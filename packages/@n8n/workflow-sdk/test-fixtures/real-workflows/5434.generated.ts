return workflow('51mGQheuAtcpMIni', 'TikTok Influencer Scraper (URL Input) via Bright Data + n8n & Sheets', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'TikTok Scraper',
      formFields: { values: [{ fieldLabel: 'Search by Profile' }] }
    }, position: [-2480, -585], name: 'Search by Profile URL' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.brightdata.com/datasets/v3/trigger',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "input": [\n    {\n      "search_url": "https://www.tiktok.com/explore?lang=en",\n      "country": "US"\n    },\n    {\n      "search_url": "https://www.tiktok.com/search?lang=en&q=music&t=1685628060008",\n      "country": "FR"\n    }\n  ],\n  "custom_output_fields": [\n    "account_id",\n    "nickname",\n    "biography",\n    "like_engagement_rate",\n    "bio_link",\n    "is_verified",\n    "followers",\n    "following",\n    "likes",\n    "videos_count",\n    "id",\n    "url",\n    "profile_pic_url",\n    "profile_pic_url_hd",\n    "relation",\n    "open_favorite",\n    "top_videos",\n    "comment_engagement_rate",\n    "is_under_age_18",\n    "region"\n  ]\n}',
      sendBody: true,
      sendQuery: true,
      sendHeaders: true,
      specifyBody: 'json',
      queryParameters: {
        parameters: [
          { name: 'dataset_id', value: 'gd_l1villgoiiidt09ci' },
          { name: 'include_errors', value: 'true' },
          { name: 'type', value: 'discover_new' },
          { name: 'discover_by', value: 'search_url' },
          { name: 'limit_per_input', value: '2' }
        ]
      },
      headerParameters: {
        parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }]
      }
    }, position: [-2280, -580], name: 'Sends profile URLs to Bright Data to trigger scraping' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.brightdata.com/datasets/v3/progress/{{ $json.snapshot_id }}',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }]
      }
    }, position: [-2040, -585], name: 'Checks scraping progress from Bright Data' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 30 }, position: [-1820, -580], name: 'Waits 30 seconds before retrying snapshot check' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.brightdata.com/datasets/v3/snapshot/{{ $json.snapshot_id }}',
      options: {},
      sendQuery: true,
      sendHeaders: true,
      queryParameters: { parameters: [{ name: 'format', value: 'json' }] },
      headerParameters: {
        parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }]
      }
    }, position: [-1380, -585], name: 'Gets TikTok influencer details from Bright Data using snapshot ID' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.brightdata.com/datasets/v3/progress/{{ $json.snapshot_id }}',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }]
      }
    }, position: [-2040, -585], name: 'Checks scraping progress from Bright Data' } })], { version: 2.2, parameters: {
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
            id: '35ed620d-b5d5-4e97-bcc5-52b283d85616',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.status }}',
            rightValue: 'ready'
          }
        ]
      }
    }, name: 'IF condition to check if Bright Data returned ready status' }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {},
        schema: [
          {
            id: 'status',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'status',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'message',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'message',
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
      operation: 'appendOrUpdate',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 1469389487,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OeqtCFm4Wek9DI5YFOWQXTpQJS-SJxC10iAPKEKkmiY/edit#gid=1469389487',
        cachedResultName: 'TikTok profile by url'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1OeqtCFm4Wek9DI5YFOWQXTpQJS-SJxC10iAPKEKkmiY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OeqtCFm4Wek9DI5YFOWQXTpQJS-SJxC10iAPKEKkmiY/edit?usp=drivesdk',
        cachedResultName: 'TikTok Data'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-1160, -585] } }))
  .add(sticky('📝 Trigger – Start on TikTok profile form submit\n', { color: 2, position: [-2520, -660], width: 180, height: 240 }))
  .add(sticky('📤 Trigger API – Send TikTok profile to scrape', { name: 'Sticky Note1', color: 3, position: [-2320, -660], width: 200, height: 260 }))
  .add(sticky('⏳ Check Status – Is profile data ready?\n', { name: 'Sticky Note2', color: 4, position: [-2100, -660], width: 200, height: 260 }))
  .add(sticky('⏱️ Wait – Pause before retrying Bright Data\n', { name: 'Sticky Note3', color: 5, position: [-1860, -660], width: 200, height: 240 }))
  .add(sticky('✅ Is Ready? – Yes: proceed, No: retry\n', { name: 'Sticky Note4', color: 6, position: [-1640, -680], width: 200, height: 260 }))
  .add(sticky('📥 Get Data – Extract scraped influencer info\n', { name: 'Sticky Note5', color: 7, position: [-1420, -680], width: 200, height: 260 }))
  .add(sticky('📄 Save to Sheet – Write data to Google Sheet\n\n', { name: 'Sticky Note6', color: 2, position: [-1200, -680], width: 200, height: 260 }))