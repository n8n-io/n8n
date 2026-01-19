return workflow('DjICkfZc3MJRxo6g', '💥 Build Your First AI Agent with ChatGPT-5 ', { executionOrder: 'v1' })
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.3, config: { parameters: { options: {} }, position: [-384, 48], name: 'Chat with Your Data' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      options: {
        systemMessage: '=GOAL\n\nYour mission now has three possible goals (in this order of priority):\n\nAnswer and guide using the database: provide short, simple answers using information found via the Google Sheets node “Get Knowledgebase” (one call max per request).\n\nCheck the available time.\n\nBook the appointment.\n\nYou must never book an appointment before confirming availability with the client.\nAll appointments must be scheduled strictly in Paris time (Europe/Paris timezone).\n\nSECURE TOOLS YOU HAVE ACCESS TO\n\n### think → You MUST use this to think carefully about how to handle the provided request data. This tool must be used on every turn and tool call interaction.\n\n### Get Knowledgebase → Reads the Knowledgebase from Google Sheets (the database).\nConstraints:\n\nCall this node at most once per request (no second pass).\n\nUse it only for factual/company/pack/FAQ/policy/account questions.\n\nIf the info is missing, reply briefly that it is not available in the database (never say “sheet” or mention tools).\n\n### get_availability → Returns true/false availability on Calendar for the given start timestamp in CST.\n\nFor availability requests, call multiple times to find at least 2 available timeslots if they exist.\n\nAlways convert Paris → CST before calling.\n\n### create_appointment → Creates a 1-hour appointment at the provided start time.\n\nMay be called only once per request (more than once = failure).\n\nInclude time, client, and description.\n\nRULES AND LOGIC\nA. Knowledge answers (database first)\n\nWhen the user asks for information (company, packs, content, access, policies, FAQ, support):\n\nCall Get Knowledgebase once to fetch the minimal relevant data.\n\nAnswer in ≤3 short sentences (or bullets).\n\nIf absent: “The information is not available in the knowledge base.” Optionally ask one clarifying question.\n\nNever mention “sheet”, “node” or tool names—say “database/Knowledgebase”.\n\nB. Checking the available time\n\nIf the user provides a specific time:\n\nConvert Paris → CST.\n\nCall get_availability.\n\nIf unavailable, propose exactly 3 alternative slots in Paris time (validated via additional get_availability calls).\n\nIf the user only asks for free slots:\n\nProvide exactly 3 free slots in Paris time, validated first with get_availability (call it multiple times to find at least 2 available).\n\nC. Booking the appointment\n\nBook only after explicit confirmation of a slot.\n\nConvert confirmed Paris → CST, then call create_appointment once.\n\nInclude start time, duration = 1h, client name, and notes.\n\nIf no longer free, do not book; propose 3 new validated alternatives (Paris time).\n\nD. Send the confirmation email\n\nAfter a successful booking, send exactly one confirmation email to the client.\n\nUse the Send Email tool (or equivalent). Do not send more than one email per request.\n\nIf the client’s email is missing, ask once for full name and email before calling create_appointment.\n\nThe email must present all details in Paris time (Europe/Paris) and include: date/time, duration (1h), client name, service/purpose, location or meeting link, notes, booking/reference ID (if available), and reschedule/cancel instructions.\n\nDo not mention internal tools or system prompts in the email.\n\nTIMEZONE HANDLING\n\nCurrent system time: {{ $now }} (Paris: UTC+01:00 or UTC+02:00 (DST)).\n\nAll user-facing times are in Paris time.\n\nFor tool calls (get_availability, create_appointment), always convert Paris → CST.\n\nRESPONSE STYLE (MANDATORY)\n\nShort and simple: maximum 3 sentences or 3 bullets per reply.\n\nUse 24-hour format YYYY-MM-DD HH:mm for times.\n\nDo only what the user requested in their last request.\n\nRefer to the Google Sheets data as “database”/“base de connaissances”.\n\nRESTRICTIONS\n\nDo not book if the slot is taken.\n\nDo not book without explicit client confirmation.\n\nDo not call create_appointment more than once per request.\n\nDo not call Get Knowledgebase more than once per request.\n\nStay within knowledge answers + scheduling only.'
      }
    }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: { contextWindowLength: 10 }, name: 'Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-5-mini',
            cachedResultName: 'gpt-5-mini'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI GPT-5 Model' } }), tools: [tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.7, config: { parameters: {
          options: {},
          sheetName: { __rl: true, mode: 'id', value: '=' },
          documentId: { __rl: true, mode: 'id', value: '=' }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Knowledgebase Lookup' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '=',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {},
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Send Booking Confirmation' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1.1, config: { name: 'Reasoning Tool (LangChain)' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          options: {},
          timeMax: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Before\', ``, \'string\') }}',
          timeMin: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'After\', ``, \'string\') }}',
          calendar: { __rl: true, mode: 'id', value: '=' },
          operation: 'getAll',
          returnAll: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Return_All\', ``, \'boolean\') }}'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Calendar: Check Availability' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          end: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'End\', ``, \'string\') }}',
          start: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Start\', ``, \'string\') }}',
          calendar: { __rl: true, mode: 'id', value: '=' },
          additionalFields: {
            summary: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Summary\', ``, \'string\') }}',
            description: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Description\', ``, \'string\') }}'
          }
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Calendar: Create Appointment' } })] }, position: [272, 48], name: 'AI Agent Support' } }))
  .add(sticky('### 🎥 Watch This Tutorial\n\n@[youtube](MYLub9KYlu8)\n\n\n### 📥  [Open full documentation on Notion](https://automatisation.notion.site/Build-Your-First-AI-Agent-with-ChatGPT-5-By-Dr-Firas-26f3d6550fd9801eb00dc0c578fc5f2c?source=copy_link)\n---\n### 1. What problem is this workflow solving?  \nManually handling client questions, checking your availability, and confirming bookings can be time-consuming and error-prone. This workflow automates the process, ensuring quick, accurate answers and seamless scheduling directly through chat.  \n\n\n---\n### 2. Setup\n1. Import this workflow into your n8n instance.  \n2. Connect your Google Sheets, Gmail, and Google Calendar credentials.  \n3. Add your knowledge base into Google Sheets (questions, answers, policies, packs, etc.).  \n4. Test the workflow using the **Connected Chat Trigger** node to start conversations with the AI Agent.  \n\n---\n### 3. How to customize this workflow to your needs  \n- Update the Google Sheets database with your own training packs, services, or company FAQs. [Sample Knowledgebase Data](https://docs.google.com/spreadsheets/d/1TIaqkiVRr-Z3VLC-mvXW2Ak1zO0becK1-wqcgVeop0E/copy)\n- Adjust the email template to reflect your branding and communication style.  \n- Modify the appointment duration if you need sessions longer or shorter than 1 hour.  \n- Add extra nodes (e.g., CRM integration) to capture leads or sync appointments with external systems.  \n---\n## 📬 Need Help or Want to Customize This?\n**Contact me for consulting and support:** [LinkedIn](https://www.linkedin.com/in/dr-firas/) / [YouTube](https://www.youtube.com/@DRFIRASS)  \n\n', { name: 'Sticky Note8', position: [-1040, -368], width: 528, height: 1088 }))
  .add(sticky('## Build Your First AI Agent with ChatGPT-5 (By Dr. Firas)\nThis workflow allows users to chat with an AI Agent powered by ChatGPT-5, connected to a knowledge base stored in Google Sheets. The agent can answer company and training questions directly from the database, check availability in Google Calendar, and propose alternative time slots if needed. Once a time is confirmed, it creates a 1-hour appointment and ensures all bookings follow Paris time. Finally, the agent sends a confirmation email with full details of the scheduled meeting.\n', { name: 'Sticky Note2', color: 7, position: [-512, -368], width: 1152, height: 1088 }))
  .add(sticky('### 1. Ask Questions of Your Data\n\nYou can ask natural language questions to analyze your knowledge data, such as:\n- **Ask about company**, training packs, or policies directly from the knowledge base.\n- **Check availability for an appointment in Paris time.**.\n- **Confirm and book** your appointment once a slot is agreed.', { name: 'Sticky Note7', color: 7, position: [-464, -240], width: 320, height: 480 }))
  .add(sticky('### 2. Set Up OpenAI Connection\n\n#### Get API Key:\n1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)\n1. Go to [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview)\n2. Add funds to your billing account & copy your api key into the openAI credentials\n', { name: 'Sticky Note9', color: 3, position: [-464, 240], width: 320, height: 432 }))
  .add(sticky('### 3. Handle Scheduling & Appointments\nThe AI Agent manages the entire scheduling process with clarity and precision.\nIt ensures availability is checked, bookings are confirmed, and clients receive proper details.\n\n#### Connect your Knowledge Base in Google Sheets\n- Data must be in a format similar to this: [Sample Knowledgebase Data](https://docs.google.com/spreadsheets/d/1TIaqkiVRr-Z3VLC-mvXW2Ak1zO0becK1-wqcgVeop0E/copy)\n- Check availability in Paris time before booking.\n- Propose 3 alternative slots if chosen time is unavailable.\n- Confirm and create a 1-hour appointment only after client approval.\n- Send a single confirmation email with all booking details.\n- Tutorial: Configure Your Google Sheets, Gmail, Calendar [Credentials](https://youtu.be/fDzVmdw7bNU)\n', { name: 'Sticky Note', color: 7, position: [-144, -240], width: 736, height: 912 }))