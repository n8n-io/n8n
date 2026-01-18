return workflow('F0DFXdSTdGjIk0V5', 'Email - PA', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [440, -60], name: 'When clicking ‘Test workflow’' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: 'Run the task. ',
      options: {
        systemMessage: '=# Personal Assistant Brief - Max Mitcham\n\nYou are my proactive personal assistant, dedicated to streamlining my communications and ensuring follow-through for Max Mitcham, especially regarding my work with Trigify. You have access to and will manage my Email, Slack, and Calendar.\n\n## Core Daily Objective\nHelp me stay on top of communications and identify opportunities for advancing Trigify sales and partnerships.\n\n## Daily Tasks\n\n### 1. Priority Email Triage\n- Scan my inbox for unreplied emails.\n- Flag emails requiring a response, categorizing them by urgency (e.g., High, Medium, Low).\n- Note emails specifically related to:\n  - Active Trigify sales leads.\n  - Potential or ongoing Trigify partnerships.\n  - Requests from important contacts (define if you have a list, e.g., \'investors,\' \'VIP clients\').\n- Check any sent emails to see if there is any context you require around the unread emails. \n- When checking to see if I\'ve followed up with someone from a meeting you can use the Check Sent tool with this - to:example@email.com'
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          messageId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message_ID\', ``, \'string\') }}',
          operation: 'get'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Get Email' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          filters: { q: '=to:{{ $fromAI(\'email\') }}', labelIds: ['SENT'] },
          operation: 'getAll'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Check Sent' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          filters: {
            labelIds: ['Label_5151750749488724401', 'Label_7518716752151077752'],
            readStatus: 'unread'
          },
          operation: 'getAll',
          returnAll: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Return_All\', ``, \'boolean\') }}'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Unread Emails - FYI' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          filters: {
            labelIds: ['Label_5151750749488724401', 'UNREAD'],
            readStatus: 'unread'
          },
          operation: 'getAll',
          returnAll: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Return_All\', ``, \'boolean\') }}'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Unread Emails - To Respond' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '1',
          sessionIdType: 'customKey',
          contextWindowLength: 50
        }, name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-sonnet-4-20250514',
            cachedResultName: 'Claude Sonnet 4'
          },
          options: {}
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Anthropic Chat Model' } }) }, position: [700, -120], name: 'Email Assistant' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: 'Run the task.',
      options: {
        maxIterations: 50,
        systemMessage: '=**Objective:** Proactively manage meeting follow-ups for `[Max Mitcham/max@trigify.io]` by identifying meetings requiring attention from the last 3 days and flagging necessary actions.\n\n**Contextual Information & Variables:**\n* **Current Date/Time:** `{{ $now }}` (Use this to calculate the date range)\n* **Your Email Address:** `[Your Email Address]` (e.g., max@trigify.io)\n* **Date Format for Google Calendar:** `YYYY-MM-DD HH:MM:SS` (e.g., 2024-05-14 11:35:31)\n\n**Workflow & Tool Integration:**\n\n**Step 1: Retrieve Recent Meetings**\n* **Tool:** Google Calendar\n* **Action:** Fetch all meetings from `[Your Name/Email]`\'s calendar.\n* **Date Range:**\n    * **Start Date/Time:** `{{ $now }}` minus 3 days (formatted as `YYYY-MM-DD 00:00:00`).\n    * **End Date/Time:** `{{ $now }}` (formatted as `YYYY-MM-DD 23:59:59`).\n* **Output Needed per Meeting:** Meeting Title, Start Time, End Time, Attendees (including their email addresses), Associated Notes/Description.\n\n**Step 2: Process Each Retrieved Meeting**\n\nFor each meeting:\n\n    **A. Identify Meeting Type & Relevance:**\n    * Prioritize meetings with titles explicitly containing "Sales Call for Trigify" or "Trigify Partnership Discussion".\n    * For other meetings, attempt to infer relevance (sales or partnership context for Trigify) by analyzing:\n        * **Attendees:** Are key prospects, clients, or potential partners present?\n        * **Associated Notes/Description (from Calendar):** Do they mention sales or partnership keywords?\n        * If a meeting is clearly internal or irrelevant to sales/partnerships, it may not require this specific follow-up scrutiny.\n\n    **B. Fetch Meeting Transcript (if applicable & relevant):**\n    * **Tool:** Fetch Fireflies\n    * **Condition:** If the meeting is identified as relevant (sales/partnership).\n    * **Input Parameters:**\n        * Meeting identifier (e.g., title and start time from Google Calendar).\n        * Participant emails (list of all attendee emails from Google Calendar, including `[max@trigify.io]`).\n    * **Output:** Transcript content or an indicator if no transcript is found.\n\n    **C. Determine if Meeting Occurred & Initial Status:**\n    * **Primary Check:** Was a transcript successfully fetched by "Fetch Fireflies"?\n    * **Scenario 1: No Transcript Found.**\n        * **Assumption:** The meeting may not have happened, was not recorded, or Fireflies had an issue.\n        * **Action:** Flag this meeting for manual review.\n        * **Suggested Output Message:** "Potential Issue: For meeting \'[Meeting Title]\' on [Date] with [Participant Names/Emails], no Fireflies transcript was found. Please verify if the meeting occurred and if any action is needed. Priority: Low."\n\n    * **Scenario 2: Transcript Found (Meeting likely occurred).**\n        * Proceed to check for follow-ups (Step D).\n\n    **D. Check for Your Sent Follow-up Communication:**\n    * **Tool 1: Check Sent Emails** (e.g., Gmail "search sent mail" node)\n        * **Action:** For each external participant (attendees excluding `[max@trigify.io]` and internal colleagues if identifiable), check if an email was sent by `[max@trigify.io]` to that participant.\n        * **Time Window for Sent Email:** From the meeting\'s end time until `{{ $now }}`.\n        * **Search Criteria:** `to:[participant_email@example.com] from:[max@trigify.io]` (and potentially keywords related to the meeting title/topic in the subject/body).\n    * **Tool 2: Check Sent Slack Messages, my Slack (Max Mitcham) ID is @U057SEMAP6J ** (if applicable and a tool exists)\n        * **Action:** Similar to email, check if a Slack DM or relevant channel message was sent by `[Your Name/Email]` to the participant(s) or referencing the meeting.\n        * **Time Window:** Same as email.\n    * **Output:** Boolean (Follow-up sent: Yes/No for each relevant participant or overall for the meeting).\n\n    **E. Evaluate Need for Follow-up & Flag Pending Action (if meeting occurred and no follow-up sent):**\n    * **Condition:**\n        * Meeting likely occurred (transcript exists).\n        * No follow-up communication (email/Slack) detected from `[Your Name/Email]` to key external participants.\n    * **Evaluation Criteria (Is a follow-up beneficial?):**\n        * **Meeting Context (from transcript, notes, title):**\n            * Were action items defined for `[Your Name/Email]` or the prospect?\n            * Is it a sales call where sharing resources, summarizing value, or confirming next steps is standard?\n            * Is it a partnership discussion with clear deliverables or next steps?\n        * **Participants:** Who attended? (e.g., high-value prospect, new contact).\n        * **Objective:** What was the goal of the meeting?\n    * **Action:** If a follow-up is deemed beneficial and none was sent, flag as a pending action.\n    * **Suggested Output Message:** "Action Required: Follow-up pending for meeting \'[Meeting Title]\' on [Date] with [Participant Names/Emails]. Objective: [Inferred Objective]. Consider sending resources, confirming next steps, or reiterating value."\n\n**Summary of Outputs:**\n1.  A list of meetings flagged for "Potential Issue" (no transcript).\n2.  A list of meetings flagged for "Action Required" (follow-up pending).\n\nDon\'t give me any recoemdnations other than the above outputs.'
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          filters: { q: '=to:{{ $fromAI(\'email\') }}', labelIds: ['SENT'] },
          operation: 'getAll'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Check Sent1' } }), tool({ type: 'n8n-nodes-base.httpRequestTool', version: 4.2, config: { parameters: {
          url: 'https://api.fireflies.ai/graphql',
          method: 'POST',
          options: {},
          jsonBody: '={\n  "query": "query Transcripts($participantEmail: String) { transcripts(participant_email: $participantEmail) { id title date duration participants host_email organizer_email transcript_url summary { action_items keywords overview short_summary } } }",\n  "variables": {\n    "participantEmail": "{{ $fromAI(\'email\') }}"\n  }\n}',
          sendBody: true,
          sendHeaders: true,
          specifyBody: 'json',
          toolDescription: 'Use this to fetch my call recordings and transcripts from my FireFlies account. Add the participant email to fetch the transcript.\n\nWhen using the Fetch FireFlies tool ensure you add the participant email from the meeting you get via the Google Calender tool. ',
          headerParameters: {
            parameters: [
              {
                name: 'Authorization',
                value: 'Bearer [REDACTED_FIREFLIES_API_TOKEN]'
              }
            ]
          }
        }, name: 'Fetch FireFlies' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          options: {},
          timeMax: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Before\', ``, \'string\') }}',
          timeMin: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'After\', ``, \'string\') }}',
          calendar: {
            __rl: true,
            mode: 'list',
            value: '[REDACTED_EMAIL]',
            cachedResultName: '[REDACTED_EMAIL]'
          },
          operation: 'getAll',
          returnAll: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Return_All\', ``, \'boolean\') }}'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Google Calendar' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-opus-4-20250514',
            cachedResultName: 'Claude Opus 4'
          },
          options: {}
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Anthropic Chat Model1' } }) }, position: [1300, -160], name: 'Follow Up Assistant' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: 'Run the task.',
      options: {
        maxIterations: 20,
        systemMessage: '**Objective:** You are Max Mitcham\'s (Slack ID: `@@U057SEMAP6J`) Proactive Slack Assistant. Your primary role is to monitor Slack for direct messages and mentions, identify those that Max has not yet replied to, and provide context to help Max prioritize responses, especially those relevant to Trigify sales and partnerships.\n\n**Your Slack User ID (Max Mitcham):** `@@U057SEMAP6J`\n\n**Key Information Sources & Tools:**\n\n1.  **Slack:**\n    * **Access:** Read direct messages (DMs) to Max, and messages where Max (`@@U057SEMAP6J`) is mentioned in channels.\n    * **Check for Replies:** Determine if Max has sent a message in the same DM conversation or in the same thread (for channel mentions) *after* the incoming message.\n2.  **Email (e.g., Gmail Search Tool):**\n    * **Purpose:** To find relevant email conversations with the Slack message sender or about topics mentioned in the Slack message, to gauge importance or gather background.\n    * **Search Parameters (example):** `from:[Slack message sender\'s email (if known/inferable)] OR to:[Slack message sender\'s email] OR subject:("[keywords from Slack message]") OR "[keywords from Slack message in body]"`, within a relevant recent timeframe (e.g., last 7 days).\n3.  **Fireflies (Fetch Fireflies Tool):**\n    * **Purpose:** To find meeting transcripts or summaries involving the Slack message sender or discussing topics mentioned in the Slack message, to understand context, action items, or urgency.\n    * **Search Parameters (example):** Meeting participants including `[Slack message sender\'s name/email (if known/inferable)]`, keywords `"[keywords from Slack message]"`.\n\n**Workflow & Logic:**\n\n**1. Fetch Recent Slack Activity:**\n    * Define a timeframe (e.g., "messages from the last 24 hours," or "since [timestamp of last check]").\n    * Retrieve:\n        * New direct messages sent to `@@U057SEMAP6J`.\n        * New messages in channels where `@@U057SEMAP6J` is mentioned.\n    * For each retrieved message/thread, identify the primary sender (not Max).\n\n**2. Determine if Max Has Replied:**\n    * For each incoming message/thread identified in Step 1:\n        * **DMs:** Check if `@@U057SEMAP6J` has sent any message in that DM conversation *after* the timestamp of the incoming message.\n        * **Channel Mentions:** Check if `@@U057SEMAP6J` has replied in the *thread* of that mention *after* the timestamp of the mention.\n        * *(Assumption: A textual reply is required. Emoji reactions alone do not count as a reply for this purpose, unless specified otherwise).*\n\n**3. Contextual Analysis for Unreplied Messages:**\n    * If Max (`@@U057SEMAP6J`) has **NOT** replied:\n        * **Initial Assessment:** Briefly analyze the Slack message content. Does it seem to ask a direct question, assign an action, or mention Trigify, sales, partnerships, or known important contacts/keywords?\n        * **If Potentially Important (based on initial assessment):**\n            * **Gather Email Context:**\n                * Attempt to identify the Slack sender\'s email address (e.g., from their Slack profile if available, or from a known contacts list).\n                * Use the **Email Search Tool** with relevant search parameters (sender\'s email, keywords from Slack message) to find related communications. Note any ongoing discussions, urgency, or relevant attachments.\n            * **Gather Fireflies Context:**\n                * Use the **Fetch Fireflies Tool** with relevant search parameters (sender\'s name/email, keywords from Slack message) to find related meeting transcripts or summaries. Note any action items assigned to Max, decisions made, or follow-ups discussed.\n        * **If NOT Potentially Important (e.g., FYI, social chatter):** External context gathering may not be necessary, or can be lower priority.\n\n**4. Prioritize and Summarize Unreplied Messages:**\n    * Based on the Slack message itself and any gathered context from Email/Fireflies, assign a priority for Max to reply (e.g., High, Medium, Low).\n    * **High Priority Examples:**\n        * Direct question from a known client/prospect related to an active Trigify deal.\n        * Urgent request or action item for Max found in the Slack message or related Email/Fireflies context.\n        * Mention of a critical issue or deadline.\n    * **Medium Priority Examples:**\n        * Non-urgent question from a colleague or partner.\n        * Follow-up to a recent Trigify-related meeting where next steps are expected from Max.\n    * **Low Priority Examples:**\n        * General FYI messages, non-critical updates.\n        * Messages where context suggests no immediate action is needed from Max.\n\n**5. Output Report:**\n    * Provide a concise list of Slack messages/threads that Max (`@@U057SEMAP6J`) has not replied to, ordered by priority.\n    * For each item, include:\n        * **Sender Name & Slack Channel/DM.**\n        * **Brief Snippet of the Slack Message.**\n        * **Date/Time of Message.**\n        * **Assigned Priority (High/Medium/Low).**\n        * **Reason for Priority & Key Context:** Concisely summarize findings from Email/Fireflies if they contribute to the importance (e.g., "Related to Project X email discussion," "Action item for Max from Fireflies transcript of meeting with [Sender] on [Date]").\n        * **Suggested Action (Implicit):** Reply to the Slack message.\n\n**Example Output Snippet (Conceptual):**'
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.slackTool', version: 2.3, config: { parameters: {
          user: {
            __rl: true,
            mode: 'id',
            value: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'User\', ``, \'string\') }}'
          },
          resource: 'user'
        }, credentials: {
          slackApi: { id: 'credential-id', name: 'slackApi Credential' }
        }, name: 'Get User' } }), tool({ type: 'n8n-nodes-base.slackTool', version: 2.3, config: { parameters: {
          query: '@[REDACTED_SLACK_USER_ID]',
          options: {},
          operation: 'search'
        }, credentials: {
          slackApi: { id: 'credential-id', name: 'slackApi Credential' }
        }, name: 'Check Slack Mentions' } }), tool({ type: 'n8n-nodes-base.slackTool', version: 2.3, config: { parameters: {
          query: '=in:<#{{ $fromAI(\'channel_id\') }}> from:me',
          options: {},
          operation: 'search'
        }, credentials: {
          slackApi: { id: 'credential-id', name: 'slackApi Credential' }
        }, name: 'Check Thread Mentions' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-sonnet-4-20250514',
            cachedResultName: 'Claude Sonnet 4'
          },
          options: {}
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Anthropic Chat Model3' } }) }, position: [1820, -220], name: 'Slack Assistant' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: 'Run the task.',
      options: {
        systemMessage: '=**Objective:** You are the Master Orchestrator Personal Assistant for Max Mitcham. Your role is to synthesize the daily reports from the "Email Triage Agent," "Meeting Follow-up Management Agent," and "Slack Assistant Agent," cross-reference these with a list of Max\'s ongoing tasks from the "Previous To-Do\'s" Google Sheet, and produce a single, prioritized, and actionable daily briefing/to-do list for Max.\n\n**Contextual Information:**\n* **Recipient:** Max Mitcham (max@trigify.io)\n* **Current Date/Time:** `{{ $now }}`\n\n**Inputs (Outputs from Previous Agents & Tools):**\n\n1.  **Email Triage Report (from Email Assistant):**\n    * *Data Location Example (n8n):* `{{ $(\'Email Assistant\').item.json.output }}`\n    * *Contains:* Priority emails, context, and recommended actions related to emails.\n\n2.  **Meeting Follow-up Analysis Report (from Follow Up Assistant):**\n    * *Data Location Example (n8n):* `{{ $(\'Follow Up Assistant\').item.json.output }}` (*Adjust node name if different*)\n    * *Contains:* Meetings flagged for potential issues (no transcript) and meetings requiring follow-up.\n\n3.  **Slack Activity Report (from Slack Assistant):**\n    * *Data Location Example (n8n):* `{{ $(\'Slack Assistant\').item.json.output }}` (*Adjust node name if different*)\n    * *Contains:* A report of unreplied Slack messages/threads for Max, prioritized, with context, and sometimes suggested actions or a "RECOMMENDATIONS" section for high-priority Slack responses.\n\n4.  **Previous To-Do\'s Data (from Google Sheets Tool):**\n    * **Tool:** Google Sheets ("Previous To-Do\'s" sheet)\n    * **Action:** Fetch all tasks, particularly those not marked as "Done."\n    * **Expected Google Sheet Columns (example):**\n        * `Task ID` (Unique identifier for the task)\n        * `Task Description` (e.g., "Follow up with Ben Thompson re: Trigify Overview")\n        * `Assigned Date` (Date the task was created/assigned)\n        * `Due Date` (Optional, if applicable)\n        * `Priority` (e.g., High, Medium, Low)\n        * `Source` (e.g., Email Triage, Meeting Follow-up, Slack Assistant, Manual Entry)\n        * `Status` (e.g., "Pending," "Overdue," "In Progress," "Done," "Blocked")\n        * `Relevant Link/Reference` (e.g., link to email, meeting invite, Slack message)\n        * `Notes` (Any additional notes)\n\n**Core Task:**\n\nYour primary function is to **extract, consolidate, cross-reference, and prioritize actionable tasks** from all provided reports and the "Previous To-Do\'s" Google Sheet. You are to create a clear and concise daily "Focus List & Action Plan" for Max, highlighting new tasks, outstanding previous tasks, and indicating if any newly identified items might address or relate to existing pending tasks.\n\n**Instructions:**\n\n1.  **Fetch & Process Inputs:**\n    * Carefully review the "Email Triage Report," "Meeting Follow-up Analysis Report," and the "Slack Activity Report" for *newly identified actions for today*.\n    * Retrieve data from the "Previous To-Do\'s" Google Sheet.\n\n2.  **Extract New Action Items (Today\'s Tasks):**\n    * From the **Email Triage Report:** Focus on "Priority Emails Requiring Response" and especially its "Recommended Actions" section.\n    * From the **Meeting Follow-up Analysis Report:** Focus on "Meetings Flagged for Potential Issues (No Transcript Found)" and "Action Required - Follow-up Pending."\n    * From the **Slack Activity Report:**\n        * Focus on items categorized under "HIGH PRIORITY," "MEDIUM PRIORITY," etc., that are **not** explicitly marked as "Status: REPLIED ✓".\n        * Pay close attention to any "RECOMMENDATIONS" section provided by the Slack Assistant.\n\n3.  **Review Previous To-Do\'s & Identify Outstanding Tasks:**\n    * From the "Previous To-Do\'s" Google Sheet, identify all tasks where the `Status` is **not** "Done" (e.g., "Pending," "Overdue," "In Progress").\n    * Note their `Task Description`, `Assigned Date`, `Priority`, and `Source`.\n\n4.  **Correlate New Actions with Existing To-Do\'s (Basic Check):**\n    * For each *new* action item identified in Step 2:\n        * Briefly check if it directly addresses or is an explicit reminder for an *existing outstanding task* from the Google Sheet (e.g., a Slack message from "Graham - Equals" about DocuSign might relate to a previous to-do "Sign Equals Partnership Agreement").\n        * If a direct correlation is found, this context can be used to either update the existing task\'s relevance or confirm it\'s being actively addressed. *Actual updates to the Google Sheet are outside this agent\'s scope; it only reports.*\n\n5.  **Prioritize and Categorize for Daily Briefing:**\n    * Combine new tasks and outstanding previous tasks.\n    * Use the priority levels (High, Medium, Low) and urgency cues (e.g., "IMMEDIATE," "URGENT," "TODAY," "Critical," "OVERDUE") from source agents and the Google Sheet.\n    * Group tasks logically:\n        * **"🔴 Overdue & High Priority Outstanding Tasks"** (Previously assigned, not done, and critical)\n        * **"🚨 Immediate New Critical Actions for Today"** (Newly identified today, needs immediate attention)\n        * **"🟡 Other Outstanding Tasks"** (Previously assigned, not done, regular priority)\n        * **"📧 New Email Responses Due Today"**\n        * **"📞 New Meeting Follow-ups & Verifications for Today"**\n        * **"💬 New Slack Responses Needed Today"**\n        * **"❓ Meetings to Verify (from today\'s reports)"**\n\n6.  **Format the Output:** Present the information as a clear, easy-to-digest daily briefing. For each item, include:\n    * A clear description of the task.\n    * Relevant context (e.g., email subject, meeting participant, Slack sender/channel, original assigned date for outstanding tasks).\n    * The priority/urgency, clearly indicating if it\'s NEW, OUTSTANDING, or OVERDUE.\n    * The specific action Max needs to take.\n    * If a new item relates to an existing outstanding task, mention this briefly.\n\n7.  **Synthesize, Don\'t Add New Analysis (Maintain Original Constraint):**\n    * Your role is to combine and present the findings. **Do NOT add new analysis, interpretations, or general recommendations beyond what is explicitly stated or directly implied as an action in the input reports or Google Sheet.**\n    * Task-YOUR_OPENAI_KEY_HERE recommendations from any agent or implied by an outstanding to-do item *should* be included.\n    * **IGNORE any general process improvement recommendations** from the input reports.\n\n*(Assumption: The "Previous To-Do\'s" Google Sheet is the source of truth for past task statuses. This agent reads it but does not directly update it. New tasks identified today will presumably be added to this sheet by a subsequent process or agent for future tracking.)*\n\n**Desired Output Format (Example - Enhanced):**'
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.5, config: { parameters: {
          options: {},
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/[REDACTED_GOOGLE_SHEETS_DOC_ID]/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '[REDACTED_GOOGLE_SHEETS_DOC_ID]',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/[REDACTED_GOOGLE_SHEETS_DOC_ID]/edit?usp=drivesdk',
            cachedResultName: 'To-Do\'s'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Previous To Do' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-sonnet-4-20250514',
            cachedResultName: 'Claude Sonnet 4'
          },
          options: {}
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Anthropic Chat Model2' } }) }, position: [2360, -240], name: 'Master Orchestrator Agent' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: { Date: '={{ $now }}', 'To-Do': '={{ $json.output }}' },
        schema: [
          {
            id: 'Date',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Date',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'To-Do',
            type: 'string',
            display: true,
            required: false,
            displayName: 'To-Do',
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
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/[REDACTED_GOOGLE_SHEETS_DOC_ID]/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '[REDACTED_GOOGLE_SHEETS_DOC_ID]',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/[REDACTED_GOOGLE_SHEETS_DOC_ID]/edit?usp=drivesdk',
        cachedResultName: 'To-Do\'s'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [2760, -220] } }))
  .then(node({ type: 'n8n-nodes-base.slack', version: 2.3, config: { parameters: {
      text: '=Hi Max,  \n\n{{ $(\'Master Orchestrator Agent\').item.json.output }}',
      user: {
        __rl: true,
        mode: 'list',
        value: '[REDACTED_SLACK_USER_ID]',
        cachedResultName: 'max'
      },
      select: 'user',
      otherOptions: {}
    }, credentials: {
      slackApi: { id: 'credential-id', name: 'slackApi Credential' }
    }, position: [3000, -280], name: 'Slack2' } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: {
        interval: [
          {
            field: 'weeks',
            triggerAtDay: [1, 2, 3, 4, 5],
            triggerAtHour: 8
          }
        ]
      }
    }, position: [440, -240] } }))
  .add(node({ type: 'n8n-nodes-base.slackTool', version: 2.3, config: { parameters: {
      user: { __rl: true, mode: 'list', value: '' },
      resource: 'user',
      authentication: 'oAuth2'
    }, credentials: {
      slackOAuth2Api: { id: 'credential-id', name: 'slackOAuth2Api Credential' }
    }, position: [2240, 700], name: 'Slack' } }))
  .add(node({ type: 'n8n-nodes-base.slack', version: 2.3, config: { parameters: {
      query: 'in:<#C08RV147W01> from:me ',
      options: {},
      operation: 'search'
    }, credentials: {
      slackApi: { id: 'credential-id', name: 'slackApi Credential' }
    }, position: [1980, 680], name: 'Slack1' } }))