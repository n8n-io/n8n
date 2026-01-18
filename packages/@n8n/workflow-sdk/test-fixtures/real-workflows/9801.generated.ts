return workflow('7O3XDyjnKZuQ1iOB', 'Email_Summarizer', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.googleDriveTrigger', version: 1, config: { parameters: {
      event: 'fileCreated',
      options: {},
      pollTimes: { item: [{ mode: 'everyHour' }] },
      triggerOn: 'specificFolder',
      folderToWatch: {
        __rl: true,
        mode: 'list',
        value: '1IsQ3KyyfiexcYPlOiAkzYaH4MHI4VBPZ',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1IsQ3KyyfiexcYPlOiAkzYaH4MHI4VBPZ',
        cachedResultName: 'GraphRag'
      }
    }, position: [416, -32] } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [864, -128], name: 'Download file' } }), node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: {
        __rl: true,
        mode: 'id',
        value: '={{ $(\'Google Drive Trigger\').item.json.parents[0] }}'
      },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [864, 64], name: 'Download file1' } })], { version: 2.2, parameters: {
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
            id: '14105474-d15e-477a-8916-cef9313887f7',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.fileExtension }}',
            rightValue: 'pdf'
          }
        ]
      }
    }, name: 'If' }))
  .then(node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'pdf' }, position: [1088, -128], name: 'Extract from File' } }))
  .then(merge([node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'pdf' }, position: [1088, -128], name: 'Extract from File' } }), node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'text' }, position: [1088, 64], name: 'Extract from File1' } })], { version: 3.2 }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      text: '={{ $json.text }}',
      options: {
        systemMessage: 'You are a helpful You are a rigorous meeting assistant. Convert the provided meeting text into a project plan.\nReturn ONLY strict JSON with these keys and types:\n- summary: string (<= 40 words)\n- decisions: string[]\n- notes: string[]\n- meeting_sentiment: one of {"positive","neutral","negative"}\n- tasks: array of objects {\n   description: string,\n   owner: string | "TBD",\n   deadline: ISO date string | "TBD",\n   sentiment: one of {"positive","neutral","negative"}\n}\nConstraints:\n- No prose, no markdown, no code fences.\n- If unknown, use empty list or "TBD".\n- Infer dates only if clearly stated; otherwise "TBD".\nassistant'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [1536, -32], name: 'AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '/**\n * Robust parser for different upstream shapes:\n * - n8n AI Agent:        item.json.output (string)\n * - OpenAI Chat (HTTP):  item.json.body.choices[0].message.content\n * - OpenAI Chat (direct):item.json.choices[0].message.content\n * - Already an object:   item.json (if the LLM node already parsed JSON)\n */\nconst outputs = [];\n\nfor (const item of items) {\n  let content;   // string with JSON\n  let data;      // parsed object\n\n  // 1) Try common shapes\n  if (typeof item.json?.output === \'string\') {\n    // n8n "AI Agent" node output\n    content = item.json.output;\n  } else if (typeof item.json?.choices?.[0]?.message?.content === \'string\') {\n    // direct Chat Completions shape\n    content = item.json.choices[0].message.content;\n  } else if (typeof item.json?.body?.choices?.[0]?.message?.content === \'string\') {\n    // HTTP Request node -> body -> choices\n    content = item.json.body.choices[0].message.content;\n  } else if (typeof item.json === \'string\') {\n    // just a raw string\n    content = item.json;\n  } else if (typeof item.json === \'object\' && item.json !== null && (\n             item.json.summary || item.json.tasks || item.json.decisions || item.json.notes)) {\n    // already parsed into an object with expected keys\n    data = item.json;\n  }\n\n  // 2) If we still need to parse, do it\n  if (!data) {\n    if (typeof content !== \'string\') {\n      throw new Error(\'Could not locate LLM text output in upstream node. Check: output, choices[0].message.content, or body.choices...\');\n    }\n    try {\n      data = JSON.parse(content);\n    } catch {\n      throw new Error(\'LLM did not return valid JSON. Verify the system prompt and response_format=json_object.\');\n    }\n  }\n\n  // 3) Normalize the schema\n  if (typeof data.summary !== \'string\') data.summary = \'\';\n  if (!Array.isArray(data.decisions)) data.decisions = [];\n  if (!Array.isArray(data.notes)) data.notes = [];\n  if (![\'positive\',\'neutral\',\'negative\'].includes(data.meeting_sentiment)) {\n    data.meeting_sentiment = \'neutral\';\n  }\n  if (!Array.isArray(data.tasks)) data.tasks = [];\n\n  data.tasks = data.tasks.map(t => ({\n    description: t?.description ?? \'\',\n    owner: t?.owner ?? \'TBD\',\n    deadline: t?.deadline ?? \'TBD\',\n    sentiment: [\'positive\',\'neutral\',\'negative\'].includes(t?.sentiment) ? t.sentiment : \'neutral\'\n  }));\n\n  // Optional grouped and totals\n  const grouped = { positive: [], neutral: [], negative: [] };\n  for (const t of data.tasks) grouped[t.sentiment].push(t);\n  data.tasks_grouped = grouped;\n  data.totals = {\n    positive: grouped.positive.length,\n    neutral: grouped.neutral.length,\n    negative: grouped.negative.length\n  };\n\n  outputs.push({ json: data });\n}\n\nreturn outputs;\n'
    }, position: [1888, -32], name: 'Data Validation' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// This Code node expects your previous node to output ONE item\n// with keys: summary, decisions[], notes[], meeting_sentiment,\n// tasks_grouped{positive[],neutral[],negative[]}, totals{...}.\n\n// helper funcs\nconst esc = (s) => String(s ?? \'\')\n  .replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\')\n  .replace(/"/g,\'&quot;\').replace(/\'/g,\'&#39;\');\n\nconst li = (s) => `<li>${esc(s)}</li>`;\nconst liTask = (t) =>\n  `<li><strong>${esc(t.description)}</strong> — ${esc(t.owner)} <em>(Deadline: ${esc(t.deadline)})</em></li>`;\n\n// read current item\nconst d = $json;\n\n// fallbacks if any section is missing\nconst decisions = Array.isArray(d.decisions) ? d.decisions : [];\nconst notes     = Array.isArray(d.notes) ? d.notes : [];\nconst tg        = d.tasks_grouped || { positive: [], neutral: [], negative: [] };\nconst totals    = d.totals || {\n  positive: tg.positive?.length ?? 0,\n  neutral:  tg.neutral?.length  ?? 0,\n  negative: tg.negative?.length ?? 0\n};\n\n// build section HTML safely\nconst decisionsHtml = decisions.map(li).join(\'\');\nconst notesHtml     = notes.map(li).join(\'\');\nconst posHtml       = (tg.positive || []).map(liTask).join(\'\');\nconst neuHtml       = (tg.neutral  || []).map(liTask).join(\'\');\nconst negHtml       = (tg.negative || []).map(liTask).join(\'\');\n\n// MINIMAL, COMPATIBLE HTML (no handlebars, no fancy CSS needed)\nconst html = `<!DOCTYPE html>\n<html>\n  <body style="font-family: Arial, Helvetica, sans-serif; color:#1f2937; line-height:1.55; margin:0; padding:16px;">\n    <h2 style="margin:0 0 8px 0;">📝 Meeting Summary</h2>\n    <p style="margin:0 0 8px 0;">${esc(d.summary || \'\')}</p>\n\n    <p style="margin:8px 0;">\n       <strong>Positive:</strong> ${totals.positive}\n      &nbsp;•&nbsp; <strong>Neutral:</strong> ${totals.neutral}\n      &nbsp;•&nbsp; <strong>Negative:</strong> ${totals.negative}\n    </p>\n\n    ${decisionsHtml ? `\n      <h3 style="margin:16px 0 6px;">💡 Key Decisions</h3>\n      <ul style="margin:0 0 12px 18px;">${decisionsHtml}</ul>\n    ` : \'\'}\n\n    ${notesHtml ? `\n      <h3 style="margin:16px 0 6px;">🗒️ Notes</h3>\n      <ul style="margin:0 0 12px 18px;">${notesHtml}</ul>\n    ` : \'\'}\n\n    ${posHtml ? `\n      <h3 style="margin:16px 0 6px;">✅ Positive Tasks</h3>\n      <ul style="margin:0 0 12px 18px;">${posHtml}</ul>\n    ` : \'\'}\n\n    ${neuHtml ? `\n      <h3 style="margin:16px 0 6px;">⚪ Neutral Tasks</h3>\n      <ul style="margin:0 0 12px 18px;">${neuHtml}</ul>\n    ` : \'\'}\n\n    ${negHtml ? `\n      <h3 style="margin:16px 0 6px;">❌ Negative Tasks</h3>\n      <ul style="margin:0 0 12px 18px;">${negHtml}</ul>\n    ` : \'\'}\n\n    <p style="font-size:12px; color:#6b7280; margin-top:16px;">Sent by n8n • AI Meeting Assistant</p>\n  </body>\n</html>`;\n\n// output same data + ready-to-send html\nreturn [{ json: { ...d, email_html: html } }];\n'
    }, position: [2112, -32], name: 'Data Preparation' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      sendTo: '={{ $(\'Google Drive Trigger\').item.json.lastModifyingUser.emailAddress }}',
      message: '={{ $json.email_html }}',
      options: {},
      subject: '=Meeting Summary — {{$json.meeting_sentiment}} tone'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [2336, -32], name: 'Send a message' } }))
  .add(sticky('## 🧩 AI Meeting Summary & Email Automation\n\nAutomatically turn meeting files (PDF or TXT) uploaded to Google Drive into structured summaries with decisions, notes, and action items — then email them beautifully formatted via Gmail.\n\n---\n\n### 🧠 How It Works\n1. Watch a Google Drive folder for new files  \n2. Extract text (from PDF or TXT)  \n3. Send content to OpenAI GPT-4o-mini  \n4. Parse and group tasks by sentiment  \n5. Build an HTML summary  \n6. Email it automatically\n\n---\n\n### ⚙️ Setup\n1. Connect Google Drive, OpenAI, and Gmail credentials  \n2. Point the Drive Trigger to your “Meetings” folder  \n3. Paste the system prompt into the AI node  \n4. Set Gmail message field to `{{$json.email_html}}`  \n5. Drop a file in the folder — everything runs end-to-end!\n\n---\n\n💡 *Perfect for team syncs, standups, sprint reviews, or client calls.*\n', { position: [-16, -432], width: 384, height: 832 }))
  .add(sticky('## Google Drive Trigger + File Routing\n\n**Watch New Files (Meeting Notes Folder)**  \nStarts the workflow whenever a new file appears in your Drive folder.\n\n**Check File Type (PDF or Text)**  \nRoutes files by MIME type:  \n- ✅ `application/pdf` → PDF extraction path  \n- ✅ `text/plain` → TXT extraction path  \n\n---\n\n💡 *Keeps the workflow flexible for multiple file formats.*\n', { name: 'Sticky Note1', color: 6, position: [360, -496], width: 432, height: 624 }))
  .add(sticky('## AI Summarization\n\nThis step is where the AI does all the heavy lifting.  \nIt takes the extracted meeting text and uses **OpenAI GPT-4o-mini** to:\n\n- Read through the entire meeting transcript  \n- Identify and summarize key decisions and discussion points  \n- Extract important notes and insights  \n- Detect overall **meeting sentiment** (positive, neutral, or negative)  \n- Generate structured **tasks** with owners, deadlines, and sentiment tags  \n\nThe output is a **strict JSON object**, which ensures the next nodes can automatically parse, format, and send the results without manual cleanup.\n', { name: 'Sticky Note2', color: 6, position: [1472, -448], width: 352, height: 416 }))
  .add(sticky('##  Validate & Structure Output\n\n**Normalize AI Output (Code Node)**  \n- Parses JSON safely  \n- Groups tasks by sentiment (`positive`, `neutral`, `negative`)  \n- Builds a `totals` object for quick statistics  \n- Prevents null/undefined errors in next step\n\n---\n\n💡 *Ensures every summary email is structured and reliable.*\n', { name: 'Sticky Note3', color: 6, position: [1840, 112], height: 384 }))
  .add(sticky('## Generate HTML Summary\n\n**Generate HTML Report (Code Node)**  \nConverts the normalized JSON into a professional email-ready layout.\n\nIncludes:\n- 📝 Summary  \n- 💡 Key Decisions  \n- 🗒️ Notes  \n- ✅ / ⚪ / ❌ grouped tasks  \n- Inline CSS for Gmail readability\n\n---\n\n📄 Output variable: `email_html`\n', { name: 'Sticky Note4', color: 6, position: [2048, -368], width: 256, height: 320 }))
  .add(sticky('##  Send AI-Generated Report\n\n**Send AI Meeting Summary Email (Gmail)**  \n- **Email Type:** HTML  \n- **Message:** `{{$json.email_html}}`  \n- **Subject Example:**  \n  `AI Summary – {{$json.meeting_sentiment}} | ✅{{$json.totals.positive}} ⚪{{$json.totals.neutral}} ❌{{$json.totals.negative}}`\n\n---\n\n📬 *Delivers the final meeting digest automatically to your inbox.*\n', { name: 'Sticky Note5', color: 6, position: [2560, -128], width: 320, height: 352 }))