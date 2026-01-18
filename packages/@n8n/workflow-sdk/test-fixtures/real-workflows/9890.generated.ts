return workflow('xD9CDu3GF1TNqfBQ', 'Automated B2B Lead Generation from Google Maps to Google Sheets using BrowserAct', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-16, 208], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-browseract-workflows.browserAct', version: 1, config: { parameters: {
      workflowId: '56755932300135031',
      inputParameters: {
        parameters: [
          { name: 'Location', value: 'Brooklyn' },
          { name: 'Bussines_Category', value: 'Baby Care ' },
          { name: 'Extracted_Data', value: '15' }
        ]
      },
      additionalFields: {}
    }, credentials: {
      browserActApi: { id: 'credential-id', name: 'browserActApi Credential' }
    }, position: [128, 208], name: 'Run a workflow task' } }))
  .then(node({ type: 'n8n-nodes-browseract-workflows.browserAct', version: 1, config: { parameters: {
      taskId: '={{ $json.id }}',
      operation: 'getTask',
      maxWaitTime: 600,
      waitForFinish: true,
      pollingInterval: 30
    }, credentials: {
      browserActApi: { id: 'credential-id', name: 'browserActApi Credential' }
    }, position: [288, 208], name: 'Get details of a workflow task' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Get the JSON string using the exact path provided by the user.\nconst jsonString = $input.first().json.output.string;\n\nlet parsedData;\n\n// Check if the string exists before attempting to parse\nif (!jsonString) {\n    // Return an empty array or throw an error if no string is found\n    // Throwing an error is usually better to stop the workflow if data is missing.\n    throw new Error("Input string is empty or missing at the specified path: $input.first().json.output.string");\n}\n\ntry {\n    // 1. Parse the JSON string into a JavaScript array of objects\n    parsedData = JSON.parse(jsonString);\n} catch (error) {\n    // Handle JSON parsing errors (e.g., if the string is malformed)\n    throw new Error(`Failed to parse JSON string: ${error.message}`);\n}\n\n// 2. Ensure the parsed data is an array\nif (!Array.isArray(parsedData)) {\n    throw new Error(\'Parsed data is not an array. It cannot be split into multiple items.\');\n}\n\n// 3. Map the array of objects into the n8n item format { json: object }\n// Each element in this array will be treated as a new item by n8n, achieving the split.\nconst outputItems = parsedData.map(item => ({\n    json: item,\n}));\n\n// 4. Return the new array of items\nreturn outputItems;'
    }, position: [528, 208], name: 'Code in JavaScript' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          Url: '={{ $json.Url }}',
          Name: '={{ $json.Name }}',
          Phone: '={{ $json.Phone }}',
          Rating: '={{ $json.Rating }}',
          Address: '={{ $json.Address }}',
          Category: '={{ $json.Category}}',
          LastSummary: '={{ $json.LastSummary }}'
        },
        schema: [
          {
            id: 'Name',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Name',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Phone',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Phone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Category',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Category',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Rating',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Rating',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Address',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Address',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Url',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Url',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'LastSummary',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'LastSummary',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Name'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 1084488211,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/18sw7io0yJOTDzvcknGmjBBqtK154CLk3k0FoWJZbfI0/edit#gid=1084488211',
        cachedResultName: 'Google Maps Local Lead Finder'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '18sw7io0yJOTDzvcknGmjBBqtK154CLk3k0FoWJZbfI0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/18sw7io0yJOTDzvcknGmjBBqtK154CLk3k0FoWJZbfI0/edit?usp=drivesdk',
        cachedResultName: 'Test For BrowserAct'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [784, 208], name: 'Append or update row in sheet' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $(\'Code in JavaScript\').item.json.Name }}\n{{ $(\'Code in JavaScript\').item.json.Address }}\n{{ $(\'Code in JavaScript\').item.json.LastSummary }}\n{{ $(\'Code in JavaScript\').item.json.Rating }}\n{{ $(\'Code in JavaScript\').item.json.Url }}\n{{ $(\'Code in JavaScript\').item.json.Category }}',
      chatId: '@shoaywbs',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [944, 208], name: 'Send a text message' } }))
  .add(sticky('## Try It Out!\n### This n8n template automates lead generation by scraping Google Maps for local businesses and notifying you in real-time.\n\n### How it works\n* The workflow is triggered **manually**. You can replace this with a **Cron** node to run searches on a schedule.\n* A **BrowserAct** node starts a scraping task on Google Maps with your specified inputs (e.g., \'Baby Care\' in \'Brooklyn\').\n* A second **BrowserAct** node waits for the scraping job to finish completely.\n* A **Code** node intelligently parses the raw scraped data, splitting the list of businesses into individual items for processing.\n* The structured leads are then saved to a **Google Sheet**, automatically avoiding duplicates.\n* Finally, a **Telegram** message is sent for each new lead, providing instant notification.\n\n### Requirements\n* **BrowserAct** API account for web scraping.\n* **Google Sheets** credentials for saving leads.\n* **Telegram** credentials for sending notifications.\n* Using BrowserAct template **“Google Maps Local Lead Finder”** in your BrowserAct account.\n\n### Need Help?\nJoin the [Discord](https://discord.com/invite/UpnCKd7GaU) or Visit Our [Blog](https://www.browseract.com/blog)!\n', { name: 'Sticky Note - Intro', position: [-640, -16], width: 592, height: 450 }))
  .add(sticky('## How to use\n\n1.  **Set up Credentials:** Add your credentials for **BrowserAct**, **Google Sheets**, and **Telegram** to the workflow.\n2.  **Set up BrowserAct Template:** Ensure you have the **“Google Maps Local Lead Finder”** template set up in your BrowserAct account.\n3.  **Customize Your Search:** In the **Run a workflow task** node, change the `Location`, `Bussines_Category`, and `Extracted_Data` values to find the leads you need.\n4.  **Activate Workflow:** Manually trigger the workflow by clicking \'Execute Workflow\' to test. For automation, replace the trigger with a `Cron` node and activate the workflow.', { name: 'Sticky Note - How to Use', position: [-640, 448], width: 592, height: 192 }))
  .add(sticky('### Need Help?\n* #### [How to Find Your BrowseAct API Key & Workflow ID](https://www.youtube.com/watch?v=pDjoZWEsZlE)\n\n* #### [How to Connect n8n to Browseract](https://www.youtube.com/watch?v=RoYMdJaRdcQ)\n\n* #### [How to Use & Customize BrowserAct Templates](https://www.youtube.com/watch?v=CPZHFUASncY)\n\n* #### [How to Use the BrowserAct N8N Community Node](https://youtu.be/j0Nlba2pRLU)\n\n* #### [AUTOMATE Local Lead Generation: Google Maps to Sheets & Telegram with n8n](https://youtu.be/--hqPhb83kg)', { name: 'Sticky Note - Need Help', position: [-32, 448], width: 592, height: 184 }))
  .add(sticky('### 🌐 1. Scrape & Wait\n\n* **Run a workflow task:** This node starts your Google Maps scraper. This is where you define your search criteria. You can easily change the `Location`, `Bussines_Category`, and the number of leads to extract (`Extracted_Data`).\n\n* **Get details...:** This node pauses the workflow until the scraping is 100% complete.', { name: 'Sticky Note - Scraping Stage', color: 5, position: [96, -16], width: 336, height: 184 }))
  .add(sticky('### 🧹 2. Parse & Split Data\n\nThis **Code** node is a crucial step. Scrapers often return a list of businesses as a single block of text.\n\nThis code takes that text, parses it, and correctly splits it into individual n8n items. This allows the following nodes to handle each business one by one.', { name: 'Sticky Note - Processing Stage', color: 6, position: [448, -16], width: 272, height: 180 }))
  .add(sticky('### 💾 3. Save & Notify\n\n* **Google Sheets:** This node adds each lead to your spreadsheet. The `appendOrUpdate` operation smartly prevents duplicate entries based on the business name.\n* **Telegram:** This node sends a real-time notification to your specified chat ID for every new lead that is successfully saved. Be sure to update the `Chat ID` parameter with your own.', { name: 'Sticky Note - Output Stage', color: 3, position: [736, 400], width: 384, height: 152 }))
  .add(sticky('', { color: 5, position: [96, 176], width: 336, height: 192 }))
  .add(sticky('', { name: 'Sticky Note1', color: 6, position: [448, 176], width: 272, height: 192 }))
  .add(sticky('', { name: 'Sticky Note2', color: 3, position: [736, 192], width: 384, height: 192 }))