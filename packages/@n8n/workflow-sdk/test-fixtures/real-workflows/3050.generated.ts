return workflow('', '')
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [20, -340], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      options: {
        maxIterations: 15,
        systemMessage: '=You are a helpful assistant.\nCurrent timestamp is {{ $now }}'
      }
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1, config: { name: 'Calculator' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2, config: { parameters: {
          name: 'records_by_date_and_or_status',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'a2BIIjr2gLBay06M',
            cachedResultName: 'Template | Your first AI Data Analyst'
          },
          description: 'Use this tool to get records filtered by date. You can also filter by status at the same time, if you want.',
          workflowInputs: {
            value: {
              status: '={{ $fromAI("status", "Status of the transaction. Can be Completed, Refund or Error. Leave empty if you don\'t need this now.", "string") }}',
              end_date: '={{ $fromAI("end_date", "End date in format YYYY-MM-DD", "string") }}',
              start_date: '={{ $fromAI("start_date", "Start date in format YYYY-MM-DD", "string") }}'
            },
            schema: [
              {
                id: 'start_date',
                type: 'string',
                display: true,
                required: false,
                displayName: 'start_date',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'end_date',
                type: 'string',
                display: true,
                required: false,
                displayName: 'end_date',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'status',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'status',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'Records by date' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.5, config: { parameters: {
          options: {},
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'url',
            value: 'https://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/edit?usp=sharing'
          },
          descriptionType: 'manual',
          toolDescription: 'Only use this as last resort, because it will pull all data at once.'
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Get all transactions' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.5, config: { parameters: {
          options: {},
          filtersUI: {
            values: [
              {
                lookupValue: '={{ $fromAI("transaction_status", "Transaction status can be Refund, Completed or Error", "string") }}',
                lookupColumn: 'Status'
              }
            ]
          },
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'url',
            value: 'https://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/edit?usp=sharing'
          },
          descriptionType: 'manual',
          toolDescription: 'Find transactions by status'
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Get transactions by status' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.5, config: { parameters: {
          options: {},
          filtersUI: {
            values: [
              {
                lookupValue: '={{ $fromAI("product_name", "The product name", "string") }}',
                lookupColumn: 'Product'
              }
            ]
          },
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'url',
            value: 'https://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/edit?usp=sharing'
          },
          descriptionType: 'manual',
          toolDescription: 'Find transactions by product.\nOur products are:\n- Widget A\n- Widget B\n- Widget C\n- Widget D'
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Get transactions by product name' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { name: 'Buffer Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: { temperature: 0.2 }
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [240, -340], name: 'AI Agent' } }))
  .add(trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: {
      workflowInputs: {
        values: [
          { name: 'start_date' },
          { name: 'end_date' },
          { name: 'status' }
        ]
      }
    }, position: [280, 640], name: 'When Executed by Another Workflow' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/gviz/tq',
      options: {},
      sendQuery: true,
      authentication: 'predefinedCredentialType',
      queryParameters: {
        parameters: [
          { name: 'sheet', value: 'Sheet1' },
          {
            name: 'tq',
            value: '=SELECT * WHERE A >= DATE "{{ $json.start_date }}" AND A <= DATE "{{ $json.end_date }}"'
          }
        ]
      },
      nodeCredentialType: 'googleSheetsOAuth2Api'
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [560, 640], name: 'Google Sheets request' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Ensure there\'s at least one input item.\nif (!items || items.length === 0) {\n  throw new Error("No input items found.");\n}\n\n// Our input is expected to have a \'data\' property containing the JSONP string.\nconst input = items[0].json;\n\nif (!input.data) {\n  throw new Error("Input JSON does not have a \'data\' property.");\n}\n\nconst rawData = input.data;\n\n// Use a regex to extract the JSON content from the Google Visualization JSONP response.\nconst regex = /google\\.visualization\\.Query\\.setResponse\\((.*)\\);?$/s;\nconst match = rawData.match(regex);\n\nif (!match) {\n  throw new Error("Input data does not match the expected Google Visualization JSONP format.");\n}\n\nconst jsonString = match[1];\n\n// Parse the extracted JSON string.\nlet parsed;\ntry {\n  parsed = JSON.parse(jsonString);\n} catch (error) {\n  throw new Error("Failed to parse JSON: " + error.message);\n}\n\n// Verify that the parsed JSON has the expected \'table\' structure with \'cols\' and \'rows\'.\nif (!parsed.table || !Array.isArray(parsed.table.cols) || !Array.isArray(parsed.table.rows)) {\n  throw new Error("Parsed JSON does not have the expected \'table\' structure with \'cols\' and \'rows\'.");\n}\n\nconst cols = parsed.table.cols;\nconst rows = parsed.table.rows;\n\n// Helper function to convert date string from "Date(YYYY,M,D)" to "YYYY-MM-DD"\nfunction formatDate(dateStr) {\n  const match = dateStr.match(/^Date\\((\\d+),(\\d+),(\\d+)\\)$/);\n  if (!match) return dateStr;\n  const year = parseInt(match[1], 10);\n  const month = parseInt(match[2], 10) + 1; // JavaScript months are 0-indexed\n  const day = parseInt(match[3], 10);\n  // Format with leading zeros\n  return `${year}-${String(month).padStart(2, \'0\')}-${String(day).padStart(2, \'0\')}`;\n}\n\n// Map each row into an object using the column labels as keys.\nconst newItems = rows.map(row => {\n  const obj = {};\n  cols.forEach((col, index) => {\n    let value = row.c && row.c[index] ? row.c[index].v : null;\n    // If the column type is "date" and the value is a string that looks like "Date(YYYY,M,D)"\n    if (col.type === "date" && typeof value === "string") {\n      value = formatDate(value);\n    }\n    obj[col.label] = value;\n  });\n  return { json: obj };\n});\n\n// Return the new array of items.\nreturn newItems;\n'
    }, position: [840, 640] } }))
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
            id: 'e50da873-bbbd-41d3-a418-83193907977c',
            operator: { type: 'string', operation: 'contains' },
            leftValue: '={{ $json.Status }}',
            rightValue: '={{ $(\'When Executed by Another Workflow\').item.json.status }}'
          }
        ]
      }
    }, position: [1060, 640], name: 'Filter by status' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: { options: {}, aggregate: 'aggregateAllItemData' }, position: [1280, 640] } }))
  .add(sticky('To send all the items back to the AI, we need to finish with everything aggregated into one single item.\n\nOtherwise it will respond with one item at a time, and the AI will only get the first item that arrives.', { name: 'Sticky Note', color: 7, position: [1220, 400], width: 220, height: 400 }))
  .add(sticky('This node sends a custom HTTP Request to the Google Sheets API.\n\nFiltering by date range in the Google Sheets API is very complicated.\n\nThis node solves that problem.\n\nBut doing the same in a database is much simpler. A tool could do it without needing a sub-workflow.', { name: 'Sticky Note1', color: 7, position: [460, 400], width: 300, height: 400 }))
  .add(sticky('The output from this complex request is also messy.\n\nSo we use some code generated by ChatGPT to transform the data into JSON objects.', { name: 'Sticky Note2', color: 7, position: [780, 400], width: 220, height: 400 }))
  .add(sticky('## Some questions to try\nThere\'s a red button on this page that you can click to chat with the AI.\n\nTry asking it these questions:\n\n- How many refunds in January and what was the amount refunded?\n\n- How many successful sales did we have in January 2025 and what was the final income of those?\n\n- What is the most frequent reason for refunds?', { name: 'Sticky Note3', color: 4, position: [-360, -340], width: 320, height: 340 }))
  .add(sticky('## Copy this Sheets file to your Google Drive\nhttps://docs.google.com/spreadsheets/d/18A4d7KYrk8-uEMbu7shoQe_UIzmbTLV1FMN43bjA7qc/edit?gid=0#gid=0', { name: 'Sticky Note4', color: 4, position: [-780, -340], width: 400 }))
  .add(sticky('### 👈\nThe Calculator is a tool that allows an agent to run mathematical calculations.', { name: 'Sticky Note5', color: 7, position: [940, 60], width: 200, height: 140 }))
  .add(sticky('### How to connect to Google Sheets?\nTo connect your n8n to your Google Sheets you\'re gonna need Google OAuth credentials\n\nSee documentation **[here](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/)**', { name: 'Sticky Note6', color: 4, position: [-780, -160], width: 400 }))
  .add(sticky('## 👆\nYou can use many models here, including the free Google Gemini options.\n\nMake sure to test it thoroughly. Some models are better for data analysis.', { name: 'Sticky Note7', color: 7, position: [120, 20], width: 170, height: 260 }))
  .add(sticky('## 👆\nThis is a short term memory. It will remember the 5 previous interactions during the chat', { name: 'Sticky Note8', color: 7, position: [340, 20], width: 150, height: 260 }))
  .add(sticky('The **AI Tools Agent** has access to all the tools at the same time. It uses the name and description to decide when to use each tool.\n\nNotice I\'m using `$fromAI` function in all of them.\n\nSee documentations **[here](https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/)**', { name: 'Sticky Note9', color: 7, position: [1160, -320], width: 340, height: 180 }))
  .add(sticky('## 👈 This is a special tool\nIt is used to call another workflow.\nThis concept is called sub-workflow.\n\nSee documentation [here](https://docs.n8n.io/flow-logic/subworkflows/).\n\nInstead of running a completely separate workflow, we are calling the one below.\n\nIt\'s contained in the same workflow, but we are using the trigger to define it will run only when called by this tool.', { name: 'Sticky Note11', color: 7, position: [1160, -120], width: 340, height: 320 }))
  .add(sticky('# Sub-workflow\nThe AI can call this sub-workflow anytime,\nby using the **Records by date** tool.\n\nThe sub-workflow automatically return\n the result of the last executed node to the AI.', { name: 'Sticky Note12', color: 7, position: [120, 340], width: 1380, height: 520 }))
  .add(sticky('## Change the URL of the Sheets file in all the Sheets tools 👇', { name: 'Sticky Note13', color: 4, position: [820, -540], width: 300 }))
  .add(sticky('## 👆 Change the URL of the Sheets file', { name: 'Sticky Note14', color: 4, position: [500, 820], width: 260, height: 100 }))
  .add(sticky('# Author\n![Solomon](https://gravatar.com/avatar/79aa147f090807fe0f618fb47a1de932669e385bb0c84bf3a7f891ae7d174256?r=pg&d=retro&size=200)\n### Solomon\nFreelance consultant from Brazil, specializing in automations and data analysis. I work with select clients, addressing their toughest projects.\n\nFor business inquiries, email me at automations.solomon@gmail.com\nOr message me on [Telegram](https://t.me/salomaoguilherme) for a faster response.\n\n### Check out my other templates\n### 👉 https://n8n.io/creators/solomon/\n', { name: 'Sticky Note10', color: 7, position: [-780, 20], width: 740, height: 640 }))
  .add(sticky('# Need help?\nFor getting help with this workflow, please create a topic on the community forums here:\nhttps://community.n8n.io/c/questions/', { name: 'Sticky Note15', position: [-780, 680], width: 740, height: 180 }))
  .add(sticky('### 💡 **Want to learn advanced n8n skills and earn money building workflows?**\n‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎Check out [Scrapes Academy](https://www.skool.com/scrapes/about?ref=21f10ad99f4d46ba9b8aaea8c9f58c34)', { name: 'Sticky Note16', color: 4, position: [-760, 560], width: 700, height: 80 }))