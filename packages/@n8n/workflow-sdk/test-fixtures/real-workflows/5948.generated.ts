return workflow('mV1Dg3cHIDTFuUAG', '4 Track Competitor Website Updates', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ triggerAtHour: 9 }] } }, position: [60, 0], name: '⏰ Trigger: Check Job Listings' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '94a104cf-e1fb-42b2-9613-f943e04547f3',
            name: 'url',
            type: 'string',
            value: 'https://clickup.com/pricing'
          }
        ]
      }
    }, position: [260, 0], name: '🛠️ Set Search Parameters' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      options: {},
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1olDNB5lFN8NGfVK8otJF2A8aYiR5jG6ve7cqwPyPXrY/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1olDNB5lFN8NGfVK8otJF2A8aYiR5jG6ve7cqwPyPXrY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1olDNB5lFN8NGfVK8otJF2A8aYiR5jG6ve7cqwPyPXrY/edit?usp=drivesdk',
        cachedResultName: 'Clickup Pricing'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [460, 0], name: 'Retrieve Pricing data' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=Scrape Plan name and pricing from the url below\nurl: {{ $(\'🛠️ Set Search Parameters\').item.json.url }}',
      options: {},
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: '🧠 OpenAI: LLM Brain' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserAutofixing', version: 1, config: { parameters: { options: {} }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n  "plans": [\n    {\n      "plan_name": "Free Forever",\n      "price": "Free",\n      "key_features": [\n        "60MB Storage",\n        "Unlimited Tasks",\n        "Unlimited Free Plan Members",\n        "Two-Factor Authentication",\n        "Collaborative Docs",\n        "Kanban Boards",\n        "Sprint Management",\n        "Calendar View",\n        "Custom Field Manager Basic",\n        "In-App Video Recording",\n        "24/7 Support",\n        "1 Form"\n      ]\n    },\n    {\n      "plan_name": "Unlimited",\n      "price": "$7 per user per month",\n      "key_features": [\n        "Everything in Free Forever plus",\n        "2GB Storage per user",\n        "Unlimited Folders and Spaces",\n        "Unlimited Integrations",\n        "Unlimited Gantt Charts",\n        "Unlimited Custom Fields",\n        "Unlimited Chat Messages",\n        "Unlimited Forms",\n        "Guests with Permissions",\n        "Email in ClickUp",\n        "3 Teams (User Group)",\n        "Native Time Tracking",\n        "Goals & Portfolios",\n        "Resource Management",\n        "AI Compatible"\n      ]\n    },\n    {\n      "plan_name": "Business",\n      "price": "$12 per user per month",\n      "key_features": [\n        "Everything in Unlimited, plus",\n        "Google SSO",\n        "Unlimited Storage",\n        "Unlimited Teams",\n        "Unlimited Message History",\n        "Unlimited Mind Maps",\n        "Unlimited Activity views",\n        "Unlimited Timeline views",\n        "Unlimited Dashboards",\n        "Unlimited Whiteboards",\n        "Sprint Points & Reporting",\n        "Automation Integrations",\n        "Custom Exporting",\n        "Private Whiteboards",\n        "Workload Management",\n        "SMS 2-Factor Authentication",\n        "More Automations"\n      ]\n    },\n    {\n      "plan_name": "Enterprise",\n      "price": "Custom pricing",\n      "key_features": [\n        "Everything in Business, plus",\n        "White Labeling",\n        "Conditional Logic in Forms",\n        "Team Sharing for Spaces",\n        "Custom Roles",\n        "Custom Capacity in Workload",\n        "Enterprise API",\n        "Unlimited Posts",\n        "Default Personal Views",\n        "Advanced Permissions",\n        "Advanced Public Sharing",\n        "MSA & HIPPA Available",\n        "Single Sign-On (SSO)",\n        "SCIM Provisioning",\n        "US, EU, & APAC Data Residency",\n        "Live Onboarding Training",\n        "Customer Success Manager",\n        "Access to Managed Services"\n      ]\n    }\n  ]\n}\n'
        }, name: 'Structured Output Parser' } }) }, name: 'Auto-fixing Output Parser' } }), tools: [tool({ type: 'n8n-nodes-mcp.mcpClientTool', version: 1, config: { parameters: {
          toolName: 'scrape_as_markdown',
          operation: 'executeTool',
          toolParameters: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Tool_Parameters\', ``, \'json\') }}',
          descriptionType: 'manual',
          toolDescription: 'Scrape a single webpage URL with advanced options for content extraction and get back the results in markdown.'
        }, credentials: {
          mcpClientApi: { id: 'credential-id', name: 'mcpClientApi Credential' }
        }, name: 'MCP Client to Scrape as markdown' } })] }, position: [780, 0], name: 'AI agent' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [1520, -140], name: 'No Operation, do nothing' } }), node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          '1 Plan': '={{ $json.output.plans[0].plan_name }}',
          '2 Plan': '={{ $json.output.plans[1].plan_name }}',
          '3 Plan': '={{ $json.output.plans[2].plan_name }}',
          '4 Plan': '={{ $json.output.plans[3].plan_name }}',
          '1 Pricing': '={{ $json.output.plans[0].price }}',
          '2 Pricing': '={{ $json.output.plans[1].price }}',
          '3 Pricing': '={{ $json.output.plans[2].price }}',
          '4 Pricing': '={{ $json.output.plans[3].price }}',
          row_number: '2',
          '1 Key Features': '={{ $json.output.plans[0].key_features }}',
          '2 Key Features': '={{ $json.output.plans[1].key_features }}',
          '3 Key Features': '={{ $json.output.plans[2].key_features }}',
          '4 Key Features': '={{ $json.output.plans[3].key_features }}'
        },
        schema: [
          {
            id: '1 Plan',
            type: 'string',
            display: true,
            required: false,
            displayName: '1 Plan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '1 Pricing',
            type: 'string',
            display: true,
            required: false,
            displayName: '1 Pricing',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '1 Key Features',
            type: 'string',
            display: true,
            required: false,
            displayName: '1 Key Features',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '2 Plan',
            type: 'string',
            display: true,
            required: false,
            displayName: '2 Plan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '2 Pricing',
            type: 'string',
            display: true,
            required: false,
            displayName: '2 Pricing',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '2 Key Features',
            type: 'string',
            display: true,
            required: false,
            displayName: '2 Key Features',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '3 Plan',
            type: 'string',
            display: true,
            required: false,
            displayName: '3 Plan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '3 Pricing',
            type: 'string',
            display: true,
            required: false,
            displayName: '3 Pricing',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '3 Key Features',
            type: 'string',
            display: true,
            required: false,
            displayName: '3 Key Features',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '4 Plan',
            type: 'string',
            display: true,
            required: false,
            displayName: '4 Plan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '4 Pricing',
            type: 'string',
            display: true,
            required: false,
            displayName: '4 Pricing',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: '4 Key Features',
            type: 'string',
            display: true,
            required: false,
            displayName: '4 Key Features',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: false,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['row_number'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1olDNB5lFN8NGfVK8otJF2A8aYiR5jG6ve7cqwPyPXrY/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1olDNB5lFN8NGfVK8otJF2A8aYiR5jG6ve7cqwPyPXrY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1olDNB5lFN8NGfVK8otJF2A8aYiR5jG6ve7cqwPyPXrY/edit?usp=drivesdk',
        cachedResultName: 'Clickup Pricing'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [1520, 120], name: 'Update google sheet' } })], { version: 2.2, parameters: {
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
            id: 'ecde1a05-35fd-4d57-880c-dc426f38f34f',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $(\'Retrieve Pricing data\').item.json[\'1 Pricing\'] }}',
            rightValue: '={{ $(\'AI agent\').item.json.output.plans[0].price }}'
          },
          {
            id: '96f46f31-2703-4f5f-9cf9-034527f19d38',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $(\'Retrieve Pricing data\').item.json[\'2 Pricing\'] }}',
            rightValue: '={{ $(\'AI agent\').item.json.output.plans[1].price }}1'
          },
          {
            id: '09861d6d-6553-4d1d-9533-334b5a7c55e1',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $(\'Retrieve Pricing data\').item.json[\'3 Pricing\'] }}',
            rightValue: '={{ $(\'AI agent\').item.json.output.plans[2].price }}'
          },
          {
            id: 'f5a9ca6e-205a-47c3-be52-8c935f4095e7',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $(\'Retrieve Pricing data\').item.json[\'4 Pricing\'] }}',
            rightValue: '={{ $(\'AI agent\').item.json.output.plans[3].price }}'
          }
        ]
      }
    }, name: 'If price changes' }))
  .add(sticky('## 🧩 **SECTION 1: Setup & Historical Data Fetch**\n\n### 🔁 1. **Trigger: Check Job Listings**\n\n🕒 **(Schedule Node)**\nThis starts the automation on a regular interval — daily, weekly, etc.\n\n**Use Case**: Ensures your workflow is constantly monitoring the latest ClickUp pricing updates without manual effort.\n\n---\n\n### 🛠️ 2. **Set Search Parameters**\n\n✏️ **(Set Node)**\nDefines static inputs like the page URL, service name ("ClickUp"), or brand being tracked. These parameters tell the agent what exactly to look for.\n\n**Use Case**: You can reuse this automation for other tools (Notion, Airtable, etc.) by just updating these search values.\n\n---\n\n### 📄 3. **Retrieve Pricing Data**\n\n📗 **(Google Sheet Read Node)**\nThis fetches the last known pricing saved in your Google Sheet, acting as the reference to detect future changes.\n\n**Use Case**: Maintains a historical record to compare against the freshly scraped data.\n\n---\n\n', { name: 'Sticky Note', color: 6, position: [20, -1260], width: 580, height: 1440 }))
  .add(sticky('## 🤖 **SECTION 2: AI Agent Scrapes Pricing**\n\n### 🤖 4. **AI Agent**\n\n💡 **(Agent Node Powered by OpenAI)**\nThe heart of the workflow. It does the intelligent part:\n\n* Uses Bright Data’s **MCP proxy** to bypass bot protections\n* Scrapes ClickUp’s pricing page\n* Parses it into structured plans using markdown + structured output\n\n**Sub-Nodes**:\n\n* 🔗 **MCP Client to Scrape as Markdown** – fetches page source via mobile proxy\n* 🧠 **LLM Brain (OpenAI)** – interprets content and extracts clean pricing details\n* 🧮 **Structured Output Parser** – formats data into structured JSON like:\n\n  ```json\n  { "plan_name": "Business", "price": "$12", "key_features": [...] }\n  ```\n\n**Use Case**: No scraping code required. AI handles extraction even if layout or structure changes slightly on the competitor website.\n\n---\n\n', { name: 'Sticky Note1', color: 2, position: [700, -920], width: 400, height: 1100 }))
  .add(sticky('## 🔄 **SECTION 3: Compare, Decide & Update**\n\n### 🧭 5. **If Price Changes**\n\n⚖️ **(IF Node)**\nSmart comparison logic:\n\n* Compares scraped price with saved price\n* If they **match**, nothing happens\n* If they **differ**, it triggers an update\n\n**Use Case**: Prevents unnecessary writes or noise. Only acts when something truly changed.\n\n---\n\n### ❌ 6. **No Operation, Do Nothing**\n\n🛑 **(Empty Node)**\nThis is the false branch of the IF check. If prices are the same, this path confirms that no update is needed.\n\n---\n\n### 📤 7. **Update Google Sheet**\n\n📗 **(Google Sheet Write Node)**\nIf there\'s a price change, this node updates your record with the new pricing info.\n\n**Use Case**: Keeps your competitor tracking spreadsheet always up-to-date — automatically.\n\n---\n\n', { name: 'Sticky Note2', color: 3, position: [1240, -1240], width: 440, height: 1520 }))
  .add(sticky('## I’ll receive a tiny commission if you join Bright Data through this link—thanks for fueling more free content!\n\n### https://get.brightdata.com/1tndi4600b25', { name: 'Sticky Note3', color: 7, position: [1760, -1240], width: 380, height: 240 }))
  .add(sticky('=======================================\n            WORKFLOW ASSISTANCE\n=======================================\nFor any questions or support, please contact:\n    Yaron@nofluff.online\n\nExplore more tips and tutorials here:\n   - YouTube: https://www.youtube.com/@YaronBeen/videos\n   - LinkedIn: https://www.linkedin.com/in/yaronbeen/\n=======================================\n', { name: 'Sticky Note9', color: 4, position: [-1640, -1260], width: 1300, height: 320 }))
  .add(sticky('## 🚀 **Track ClickUp Pricing Changes Automatically**\n\nA no-code automation using **n8n**, **Bright Data MCP**, and **Google Sheets** to monitor pricing changes on ClickUp and update the record only when something changes.\n\n---\n\n## 🧩 **SECTION 1: Setup & Historical Data Fetch**\n\n### 🔁 1. **Trigger: Check Job Listings**\n\n🕒 **(Schedule Node)**\nThis starts the automation on a regular interval — daily, weekly, etc.\n\n**Use Case**: Ensures your workflow is constantly monitoring the latest ClickUp pricing updates without manual effort.\n\n---\n\n### 🛠️ 2. **Set Search Parameters**\n\n✏️ **(Set Node)**\nDefines static inputs like the page URL, service name ("ClickUp"), or brand being tracked. These parameters tell the agent what exactly to look for.\n\n**Use Case**: You can reuse this automation for other tools (Notion, Airtable, etc.) by just updating these search values.\n\n---\n\n### 📄 3. **Retrieve Pricing Data**\n\n📗 **(Google Sheet Read Node)**\nThis fetches the last known pricing saved in your Google Sheet, acting as the reference to detect future changes.\n\n**Use Case**: Maintains a historical record to compare against the freshly scraped data.\n\n---\n\n## 🤖 **SECTION 2: AI Agent Scrapes Pricing**\n\n### 🤖 4. **AI Agent**\n\n💡 **(Agent Node Powered by OpenAI)**\nThe heart of the workflow. It does the intelligent part:\n\n* Uses Bright Data’s **MCP proxy** to bypass bot protections\n* Scrapes ClickUp’s pricing page\n* Parses it into structured plans using markdown + structured output\n\n**Sub-Nodes**:\n\n* 🔗 **MCP Client to Scrape as Markdown** – fetches page source via mobile proxy\n* 🧠 **LLM Brain (OpenAI)** – interprets content and extracts clean pricing details\n* 🧮 **Structured Output Parser** – formats data into structured JSON like:\n\n  ```json\n  { "plan_name": "Business", "price": "$12", "key_features": [...] }\n  ```\n\n**Use Case**: No scraping code required. AI handles extraction even if layout or structure changes slightly on the competitor website.\n\n---\n\n## 🔄 **SECTION 3: Compare, Decide & Update**\n\n### 🧭 5. **If Price Changes**\n\n⚖️ **(IF Node)**\nSmart comparison logic:\n\n* Compares scraped price with saved price\n* If they **match**, nothing happens\n* If they **differ**, it triggers an update\n\n**Use Case**: Prevents unnecessary writes or noise. Only acts when something truly changed.\n\n---\n\n### ❌ 6. **No Operation, Do Nothing**\n\n🛑 **(Empty Node)**\nThis is the false branch of the IF check. If prices are the same, this path confirms that no update is needed.\n\n---\n\n### 📤 7. **Update Google Sheet**\n\n📗 **(Google Sheet Write Node)**\nIf there\'s a price change, this node updates your record with the new pricing info.\n\n**Use Case**: Keeps your competitor tracking spreadsheet always up-to-date — automatically.\n\n---\n\n## 🎯 **Benefits for Beginners**\n\n| 🧠 **Smart**                            | 🚫 **No Coding Needed**     | 🔄 **Always Updated**                         |\n| --------------------------------------- | --------------------------- | --------------------------------------------- |\n| Uses AI to extract complex pricing info | Every part is drag-and-drop | Keeps your database aligned with live pricing |\n\n---\n\n## ✨ **Visual Summary**\n\n```\n[⏱ Trigger] ➝ [✏️ Set Params] ➝ [📄 Fetch Old Prices]\n        ⬇\n     [🤖 Agent Scrapes with AI & Bright Data MCP]\n        ⬇\n[⚖️ Compare Old vs New] → false → [🚫 Do Nothing]\n                     ↳ true → [📗 Update Google Sheet]\n```\n\n---\n\n## 🧩 Want to Extend This?\n\n* 🔔 **Slack Alerts**: Notify your team when pricing changes\n* 📊 **Charts**: Build dashboards from historical pricing\n* 📥 **Auto-Save Snapshots**: Save HTML or screenshots for compliance\n* 📌 **Multiple Competitors**: Track Airtable, Notion, Monday.com by duplicating this setup\n\n---\n', { name: 'Sticky Note4', color: 4, position: [-1640, -920], width: 1289, height: 3198 }))