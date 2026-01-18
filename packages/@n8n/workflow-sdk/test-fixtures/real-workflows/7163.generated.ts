return workflow('LCSqIlPZdq3OmgH0', 'Hyper-Personalize Email Outreach with AI, Gmail & Google Sheets', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [240, 920], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      options: {},
      sheetName: {
        __rl: true,
        mode: 'list',
        value: '{YOUR_SHEET_ID}',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/{YOUR_GOOGLE_SHEET_ID}/edit#gid=0',
        cachedResultName: '{YOUR_SHEET_NAME}'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '{YOUR_GOOGLE_DOCUMENT_ID}',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/{YOUR_GOOGLE_DOCUMENT_ID}/edit?usp=drivesdk',
        cachedResultName: 'n8nEmail'
      }
    }, position: [780, 920], name: 'Get row(s) in sheet' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs',
      options: {},
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'gmailOAuth2'
    }, position: [1320, 920] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: '{YOUR_OPENAI_MODEL}',
        cachedResultName: '{YOUR_OPENAI_MODEL_NAME}'
      },
      options: {},
      messages: {
        values: [
          {
            content: '=Write a professional and friendly email reply to {{ $(\'Get row(s) in sheet\').item.json[\'First Name\'] }} . Their intent is "{{ $(\'Get row(s) in sheet\').item.json.Intent }}". They wrote: "{{ $(\'Get row(s) in sheet\').item.json[\'Why They Sent Email\'] }}". Make the response specific to their message and helpful.No need to add the subject line. Generate in HTML formatting.\nThe footer signature should be of the following format\nThanks,\n{{ $json.sendAs[0].displayName }}\n'
          }
        ]
      }
    }, position: [1920, 920], name: 'Message a model' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      sendTo: '={{ $(\'Get row(s) in sheet\').item.json[\'Email ID\'] }}',
      message: '={{ $json.message.content }}',
      options: { appendAttribution: false },
      subject: '=Re:{{ $(\'Get row(s) in sheet\').item.json.Intent }}'
    }, position: [2700, 920], name: 'Send Personalized emails' } }))
  .add(sticky('### Step 1: Kickoff the Conversation! 🟢📬\n\nClick **“Execute Workflow”** to start the automation.\n\nWhat happens next?\n\n- 📄 It reads data from the sheet (Name, Email, Intent, and Message).\n- 🚀 Triggers the workflow to process each row individually.\n\nThis starts the process of sending personalized email to the end users\n', { color: 5, position: [60, 620], width: 440, height: 280 }))
  .add(sticky('### Step 2: Sheet Scanner Activated! 📄🔍\n\nThis node connects to your **Google Sheet** and reads all the rows in it.\n\nConfigure your **document** and specific **sheet** here\n\nWhat it fetches:\n\n- 🧑‍💼 First Name  \n- 📧 Email ID  \n- 🧠 Intent  \n- 💬 Why They Sent the Email\n\nThis node is crucial to fetch the details for the ***automated*** e-mail process \n\nEach row represents a unique lead or contact, ready to be processed and responded to. It’s your automation’s inbox—neatly structured and scalable.\n', { name: 'Sticky Note1', color: 3, position: [620, 1080], width: 380, height: 480 }))
  .add(sticky('### Step 4: Smart Email Writer ✍️🤖\n\nThis node uses **OpenAI** to craft a personalized email reply for each contact.\n\nUsing:\n\n- 🧠 **Intent** (e.g., Demo Request, Partnership Inquiry)\n- 💬 **Why They Sent the Email**\n\nIt generates a thoughtful, relevant, and human-like response tailored to each person’s message.\n\nNo templates. Just context-aware communication—written like a professional.\n', { name: 'Sticky Note2', color: 4, position: [1900, 1120], width: 420, height: 360 }))
  .add(sticky('### Step 5: Hitting Send ✉️📨\n\nThis node uses the **Gmail integration** to send the personalized email generated in the previous step.\n\nWhat it does:\n\n- ✅ Sends the message to the contact’s **Email ID**.\n- 💬 Includes the personalized content created by OpenAI.\n- 📅 Ensures timely, automated follow-up—without manual effort.\n\nThis node completes the automation process by sending the personalized emails to the end users.\n', { name: 'Sticky Note3', color: 6, position: [2520, 500], width: 380, height: 400 }))
  .add(sticky('### Step 3: Signature Sync 🖋️📛\n\nThis node connects to your **Gmail account** to fetch your display name.\n\nWhy this matters:\n\n- ✅ Ensures your name appears correctly in the email signature.\n- 📬 Maintains professionalism and brand consistency.\n- 🤝 Adds a personal touch to every automated reply.\n\nThis node ensures the email signature has your name on it instead of vague details\n', { name: 'Sticky Note4', position: [1100, 560], width: 420, height: 340 }))
  .add(sticky('## 🛠️ Prerequisites\n\nBefore running this workflow, make sure the following integrations are set up:\n\n1. **Google Account Setup**  \n   - Connect your Google account using **Client Credentials**.  \n   - Enable the following services:  \n     - 📄 Google Sheets \n     - 📂 Google Drive   \n     - 📧 Gmail \n\n2. **OpenAI Integration**  \n   - Add and configure your **OpenAI API Key**.  \n   - Required for generating context-aware, personalized email replies.\n\n\nThis will ensure the smooth execution of your personalised email sending workflow\n', { name: 'Sticky Note5', color: 4, position: [20, 0], width: 480, height: 520 }))
  .add(sticky('### Support\n\nFor further support, or to develop and custom workflow, reach out to:\n\n getstarted@intuz.com', { name: 'Sticky Note6', color: 6, position: [2740, 1120], width: 420 }))