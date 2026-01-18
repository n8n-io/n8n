return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-208, 896], name: 'Run Workflow' } }))
  .add(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      options: {},
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4/edit?usp=drivesdk',
        cachedResultName: 'Sample Data'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [160, 736], name: 'Get Rows from Google Sheets' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '={{ $json.Topic }}',
      options: {
        systemMessage: 'Take in the topic and write a description. '
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model4' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: { jsonSchemaExample: '{\n	"description": "description"\n}' }, name: 'Structured Output Parser3' } }) }, position: [1232, 608], name: 'Write description' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Email: '={{ $(\'Get Rows from Google Sheets\').item.json.Email }}',
          Description: '={{ $json.output.description }}'
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
            id: 'Email',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Topic',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Topic',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Submitted',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Submitted',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Email'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4/edit?usp=drivesdk',
        cachedResultName: 'Sample Data'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [1712, 656], name: 'Update Sheets data' } }))
  .add(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '9bceded1-6f62-48a8-8727-6a6a1998d5d3',
            name: 'Name',
            type: 'string',
            value: 'Robert Breen'
          },
          {
            id: '038dac1c-919b-4a54-b3dd-aa5723bf1f1a',
            name: 'Email',
            type: 'string',
            value: 'user@example.com'
          },
          {
            id: 'e55a71f6-66d9-4da2-9dbb-0c45539c76a9',
            name: 'Topic',
            type: 'string',
            value: 'n8n workflows'
          },
          {
            id: '50999436-4b71-4ea8-b18a-bc193ab51ce9',
            name: 'Submitted',
            type: 'string',
            value: 'Yes'
          }
        ]
      }
    }, position: [480, 864], name: 'Generate 1 Row of Data' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Name: '={{ $json.Name }}',
          Email: '={{ $json.Email }}',
          Topic: '={{ $json.Topic }}',
          Submitted: '={{ $json.Submitted }}'
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
            id: 'Email',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Topic',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Topic',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Submitted',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Submitted',
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
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4/edit?usp=drivesdk',
        cachedResultName: 'Sample Data'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [752, 848], name: 'Append Data to google' } }))
  .add(sticky('### 0️⃣ Prerequisites\n- **Google Sheets**\n  1. Open **Google Cloud Console** → create / select a project.  \n  2. Enable **Google Sheets API** under *APIs & Services*.  \n  3. Create an OAuth **Desktop** credential and connect it in n8n.  \n  4. Share the spreadsheet with the Google account linked to the credential.\n- **OpenAI**\n  1. Create a secret key at <https://platform.openai.com/account/api-keys>.  \n  2. In n8n → **Credentials** → **New** → choose **OpenAI API** and paste the key.\n- **Sample sheet to copy** (make your own copy and use its link)  \n  <https://docs.google.com/spreadsheets/d/15i9WIYpqc5lNd5T4VyM0RRptFPdi9doCbEEDn8QglN4/edit?usp=sharing>\n\n---\n\n### 1️⃣ Trigger  \n**Manual Trigger** – lets you run on demand while learning.  \n*(Swap for a Schedule or Webhook once you automate.)*\n\n---\n\n### 2️⃣ Read existing rows  \n- **Node:** `Get Rows from Google Sheets`  \n- Reads every row from **Sheet1** of your copied file.\n\n---', { color: 5, position: [-272, 176], width: 600, height: 860 }))
  .add(sticky('### 5️⃣ Create a description with GPT-4o  \n1. **`OpenAI Chat Model`** – uses your OpenAI credential.  \n2. **`Write description`** (AI Agent) – prompt = the **Topic**.  \n3. **`Structured Output Parser`** – forces JSON like: `{ "description": "…" }`.\n\n---\n\n### 6️⃣ Update that same row  \n- **Node:** `Update Sheets data`  \n- Operation **update**.  \n- Matches on column **Email** to update the correct line.  \n- Writes the new **Description** cell returned by GPT-4o.\n\n---\n\n### 7️⃣ Why this matters  \n- Demonstrates the three core Google Sheets operations: **read → append → update**.  \n- Shows how to enrich sheet data with an **AI step** and push the result right back.  \n- Sticky Notes provide inline docs so anyone opening the workflow understands the flow instantly.\n\n---', { name: 'Sticky Note2', color: 4, position: [976, 176], width: 960, height: 860 }))
  .add(sticky('### 3️⃣ Generate a demo row  \n- **Node:** `Generate 1 Row of Data` (Set node)  \n- Pretends a form was submitted:  \n  - `Name`, `Email`, `Topic`, `Submitted = "Yes"`\n\n---\n\n### 4️⃣ Append the new row  \n- **Node:** `Append Data to Google`  \n- Operation **append** → writes to the first empty line.\n\n---', { name: 'Sticky Note1', color: 6, position: [352, 176], width: 600, height: 860 }))
  .add(sticky('## 📬 Need Help or Want to Customize This?\n📧 [robert@ynteractive.com](mailto:robert@ynteractive.com)  \n🔗 [LinkedIn](https://www.linkedin.com/in/robert-breen-29429625/)', { name: 'Sticky Note13', position: [-816, -96], width: 504 }))
  .add(sticky('## 🎥 Watch This Tutorial\n\n[![Watch the video](https://img.youtube.com/vi/86mJa1aSb3Q/maxresdefault.jpg)](https://www.youtube.com/watch?v=86mJa1aSb3Q)\n\n\n## 🌐 How to Connect Google Cloud to n8n\n\n[![Watch the video](https://img.youtube.com/vi/czxMethJv8s/maxresdefault.jpg)](https://www.youtube.com/watch?v=czxMethJv8s)\n', { name: 'Sticky Note3', position: [-816, 176], width: 496, height: 848 }))