return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.gmailTrigger', version: 1, config: { parameters: {
      simple: false,
      filters: { labelIds: ['CATEGORY_PERSONAL'] },
      options: { downloadAttachments: false },
      pollTimes: { item: [{ mode: '=everyHour', minute: 59 }] }
    }, position: [-600, 1600] } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const items = [];\n\nfor (const item of $input.all()) {\n  const emailData = item.json;\n  \n  // Handle sender information (unchanged)\n  let senderEmail = \'\';\n  let senderName = \'\';\n\n  if (emailData.from?.value?.[0]) {\n    senderEmail = emailData.from.value[0].address || \'\';\n    senderName = emailData.from.value[0].name || senderEmail;\n  } else if (emailData.from?.text) {\n    const emailMatch = emailData.from.text.match(/<([^>]+)>/) || \n                      emailData.from.text.match(/([^\\s]+@[^\\s]+)/);\n    senderEmail = emailMatch ? emailMatch[1] : emailData.from.text;\n    \n    const nameMatch = emailData.from.text.match(/^([^<]+)/);\n    senderName = nameMatch ? nameMatch[1].trim().replace(/\\"/g, \'\') : senderEmail;\n  }\n\n  // Format date (unchanged)\n  const receivedDate = new Date(emailData.date || emailData.receivedTime);\n  const formattedDate = receivedDate.toLocaleString(\'en-US\', {\n    year: \'numeric\',\n    month: \'2-digit\',\n    day: \'2-digit\',\n    hour: \'2-digit\',\n    minute: \'2-digit\',\n    hour12: true\n  });\n\n  // FIXED CONTENT EXTRACTION\n  let emailContent = \'\';\n  \n  // 1. First priority: Plain text version\n  if (emailData.text) {\n    emailContent = emailData.text;\n  } \n  // 2. Second priority: HTML version (convert to plain text)\n  else if (emailData.html) {\n    emailContent = emailData.html\n      .replace(/<style[^>]*>.*?<\\/style>/gs, \'\')  // Remove CSS\n      .replace(/<[^>]*>/g, \' \')                   // Strip HTML tags\n      .replace(/\\s+/g, \' \')                       // Collapse whitespace\n      .trim();\n  }\n  // 3. Fallback to other possible fields\n  else if (emailData.body || emailData.textPlain || emailData.textHtml) {\n    emailContent = emailData.body || emailData.textPlain || emailData.textHtml;\n  }\n\n  // Truncate content if too long\n  const maxContentLength = 5000;\n  if (emailContent.length > maxContentLength) {\n    emailContent = emailContent.substring(0, maxContentLength) + \'... [truncated]\';\n  }\n\n  // Create row data\n  const rowData = {\n    \'Date\': formattedDate,\n    \'Sender Name\': senderName,\n    \'Sender Email\': senderEmail,\n    \'Subject\': emailData.subject || \'No Subject\',\n    \'Content\': emailContent,\n    //\'Message ID\': emailData.messageId || \'\',\n    \'Has Attachments\': emailData.attachments?.length > 0 ? \'Yes\' : \'No\'\n  };\n  \n  items.push({ json: rowData });\n}\n\nreturn items;'
    }, position: [-260, 1600], name: 'info1' } }))
  .then(ifBranch([node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=Please read this email "{{ $json.Content }}" and provide a very short, concise summary containing only the most important information. Keep the summary as brief as possible without losing essential details. ',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGroq', version: 1, config: { parameters: { model: 'llama-3.1-8b-instant', options: {} }, name: 'Groq Chat Model1' } }) }, position: [400, 1500], name: 'AI Agent1' } }), null], { version: 2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 1,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'c1d2e3f4-g5h6-i7j8-k9l0-m1n2o3p4q5r6',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $json["Sender Name"] }}',
            rightValue: 'YOUR_SENDER_NAME_FILTER'
          }
        ]
      }
    }, name: 'Check Valid Email' }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4, config: { parameters: {
      columns: {
        value: {
          Date: '={{ $(\'info1\').item.json.Date }}',
          summary: '={{ $json.output }}',
          'subject ': '={{ $(\'info1\').item.json.Subject }}',
          'sender name': '={{ $(\'info1\').item.json["Sender Name"] }}',
          'sender email': '={{ $(\'info1\').item.json["Sender Email"] }}'
        },
        schema: [
          {
            id: 'sender name',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'sender name',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'sender email',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'sender email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'subject ',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'subject ',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'summary',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'summary',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Date',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Date',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['sender name'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'YOUR_GOOGLE_SHEETS_URL',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'url',
        value: 'YOUR_GOOGLE_SHEETS_DOCUMENT_ID'
      }
    }, position: [980, 1560], name: 'Log to Google Sheets1' } }))
  .add(sticky('## 🧪 TEST BEFORE DEPLOYING\n1. Send test email\n2. Check Sheets output\n3. Verify summary quality\n4. Adjust filters/prompt as needed', { name: 'Test Note', color: 6, position: [1360, 1460], width: 300, height: 220 }))
  .add(sticky('## 🔑 Step 1: Add Gmail Credentials 👇', { name: 'Sticky Note7', color: 5, position: [-680, 1380], width: 260, height: 400 }))
  .add(sticky('## 📧 Step 2: Email Processing Node\n', { name: 'Sticky Note8', color: 5, position: [-340, 1380], width: 260, height: 400 }))
  .add(sticky('## ⚙️ Step 3: Sender Filter\n• Replace \'YOUR_SENDER_NAME_FILTER\'\n• Only emails from this sender will proceed\n• Supports multiple conditions', { name: 'Sticky Note9', color: 5, position: [-20, 1380], width: 260, height: 400 }))
  .add(sticky('## ✍️ Step 4: Customize AI Prompt\n• Default: Short email summary\n• Change tone/formality as needed', { name: 'Sticky Note10', color: 5, position: [360, 1360], width: 360, height: 420 }))
  .add(sticky('## 🤖 Step 5: AI Configuration\n1. Add Groq API key\n2. Or replace with other AI model\n', { name: 'Sticky Note11', color: 5, position: [-40, 1900], width: 260, height: 220 }))
  .add(sticky('## 📊 Step 6: Google Sheets Setup\n1. Add Google credentials\n2. Paste Sheet URL\n3. Select target sheet\n4. Columns auto-map to email data', { name: 'Sticky Note12', color: 4, position: [800, 1380], width: 500, height: 400 }))
  .add(sticky('## ✅ Expected Output Format\nColumns: Sender | Date | Email | Subject | Summary\n\n![Example Table](https://cdn.ablebits.com/_img-blog/google-sheets-create-table/table-format.webp)', { name: 'Sticky Note13', color: 4, position: [720, 1840], width: 700, height: 420 }))