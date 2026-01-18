return workflow('zcYVtmH3JmlnFoOB', 'Jarvis template', { executionOrder: 'v1' })
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.mcpTrigger', version: 1, config: { parameters: { path: '906a5e01-3f46-444e-a3b7-51d2105eac16' }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          filters: {
            q: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Search\', ``, \'string\') }}',
            receivedAfter: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Received_After\', ``, \'string\') }}',
            receivedBefore: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Received_Before\', ``, \'string\') }}'
          },
          operation: 'getAll',
          returnAll: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Return_All\', ``, \'boolean\') }}',
          descriptionType: 'manual',
          toolDescription: 'Retrieve multiple email messages based on filters. AI-configurable parameters: Return_All (boolean) - whether to return all matching messages; Search (string) - Gmail query string to filter messages; Received_After (string) - datetime (RFC3339) after which messages are received; Received_Before (string) - datetime before which messages are received; Sender (string) - email address of the sender.'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Get Emails' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          resource: 'label',
          returnAll: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Return_All\', ``, \'boolean\') }}',
          descriptionType: 'manual',
          toolDescription: 'Retrieve a list of labels. AI-configurable parameters: Return_All (boolean) - whether to return all labels.'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Get Labels' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'To\', ``, \'string\') }}',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: { appendAttribution: false },
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Send Email' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {
            ccList: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'CC\', ``, \'string\') }}',
            sendTo: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'To_Email\', ``, \'string\') }}',
            bccList: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'BCC\', ``, \'string\') }}'
          },
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}',
          resource: 'draft',
          emailType: 'html',
          descriptionType: 'manual',
          toolDescription: 'Create an email draft. AI-configurable parameters: Subject (string) - the subject of the draft; Message (string) - the body of the draft; Attachment_Field_Name__in_Input_ (string) - input field name containing attachments; BCC (string) - comma-separated BCC recipients; CC (string) - comma-separated CC recipients.'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Draft Email' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {
            ccList: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'CC\', ``, \'string\') }}',
            bccList: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'BCC\', ``, \'string\') }}',
            threadId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Thread_ID\', ``, \'string\') }}'
          },
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}',
          resource: 'draft',
          emailType: 'html',
          descriptionType: 'manual',
          toolDescription: 'Draft a reply to an email. Use the thread_id parameter to pass the thread for which the email must be drafted'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Draft Email Reply' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {
            ccList: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'CC\', ``, \'string\') }}',
            bccList: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'BCC\', ``, \'string\') }}',
            attachmentsUi: {
              attachmentsBinary: [
                {
                  property: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Attachment_Field_Name\', ``, \'string\') }}'
                }
              ]
            },
            appendAttribution: false
          },
          emailType: 'text',
          messageId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message_ID\', ``, \'string\') }}',
          operation: 'reply',
          descriptionType: 'manual',
          toolDescription: 'Reply to an email message. AI-configurable parameters: Message_ID (string) - the ID of the message; Message (string) - the reply content; Attachment_Field_Name (string) - input field name containing attachments; BCC (string) - comma-separated BCC recipients; CC (string) - comma-separated CC recipients.'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Reply to an Email' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          labelIds: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Label_Names_or_IDs\', ``, \'string\') }}',
          messageId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message_ID\', ``, \'string\') }}',
          operation: 'addLabels',
          descriptionType: 'manual',
          toolDescription: 'Add one or more labels to an email message. AI-configurable parameters: Message_ID (string) - the ID of the message to label; Label_Names_or_IDs (string) - comma-separated label names or IDs to apply.'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Add Label to Email' } })] }, position: [400, 1008], name: 'Gmail MCP Server' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.mcpTrigger', version: 1, config: { parameters: { path: '64e72cc1-3df0-4090-9522-d534c3f245aa' }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          eventId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Event_ID\', `Pass the event id`, \'string\') }}',
          options: {},
          calendar: {
            __rl: true,
            mode: 'list',
            value: 'user@example.com',
            cachedResultName: 'user@example.com'
          },
          operation: 'get',
          descriptionType: 'manual',
          toolDescription: 'Get an event in Google Calendar'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Get Event' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          options: {
            orderBy: 'startTime',
            timeZone: {
              __rl: true,
              mode: 'list',
              value: 'Asia/Kolkata',
              cachedResultName: 'Asia/Kolkata'
            },
            recurringEventHandling: 'expand'
          },
          timeMax: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Before\', ``, \'string\') }}',
          timeMin: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'After\', `Should be a future date and time`, \'string\') }}',
          calendar: {
            __rl: true,
            mode: 'list',
            value: 'user@example.com',
            cachedResultName: 'user@example.com'
          },
          operation: 'getAll',
          returnAll: true,
          descriptionType: 'manual',
          toolDescription: 'Get future events on Google Calendar'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Get all Events' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          end: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'End\', ``, \'string\') }}',
          start: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Start\', ``, \'string\') }}',
          calendar: {
            __rl: true,
            mode: 'list',
            value: 'user@example.com',
            cachedResultName: 'user@example.com'
          },
          descriptionType: 'manual',
          toolDescription: 'Create an event on Google Calendar',
          additionalFields: {
            summary: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Summary\', ``, \'string\') }}',
            visibility: 'default',
            description: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Description\', ``, \'string\') }}'
          },
          useDefaultReminders: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Use_Default_Reminders\', ``, \'boolean\') }}'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Create an event' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          eventId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Event_ID\', `Pass the id of the event to reschedule or update`, \'string\') }}',
          calendar: {
            __rl: true,
            mode: 'list',
            value: 'user@example.com',
            cachedResultName: 'user@example.com'
          },
          operation: 'update',
          updateFields: {
            end: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'End\', ``, \'string\') }}',
            start: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Start\', ``, \'string\') }}',
            attendeesUi: {
              values: {
                mode: 'replace',
                attendees: [
                  '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'attendees0_Attendees\', ``, \'string\') }}'
                ]
              }
            },
            sendUpdates: 'all'
          },
          descriptionType: 'manual',
          toolDescription: 'Update an event on Google Calendar',
          useDefaultReminders: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Use_Default_Reminders\', ``, \'boolean\') }}'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Reschedule Event' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          options: {
            timezone: {
              __rl: true,
              mode: 'list',
              value: 'Asia/Kolkata',
              cachedResultName: 'Asia/Kolkata'
            }
          },
          timeMax: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'End_Time\', ``, \'string\') }}',
          timeMin: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Start_Time\', ``, \'string\') }}',
          calendar: {
            __rl: true,
            mode: 'list',
            value: 'user@example.com',
            cachedResultName: 'user@example.com'
          },
          resource: 'calendar',
          descriptionType: 'manual',
          toolDescription: 'Check if a slot is available on my calendar'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Check Availability' } }), tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.3, config: { parameters: {
          eventId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Event_ID\', `Pass the event id of the event to delete`, \'string\') }}',
          options: {},
          calendar: {
            __rl: true,
            mode: 'list',
            value: 'user@example.com',
            cachedResultName: 'user@example.com'
          },
          operation: 'delete',
          descriptionType: 'manual',
          toolDescription: 'Delete Calendar Event'
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Delete Calendar Event' } })] }, position: [-352, 880], name: 'Calendar MCP Server' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.mcpTrigger', version: 2, config: { parameters: { path: '7bf1c961-4feb-4c31-919e-ff300c40406d' }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleTasksTool', version: 1, config: { parameters: {
          task: 'MDM1NDg1NzcxMjIyNzg5NzQ1ODI6MDow',
          taskId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Task_ID\', ``, \'string\') }}',
          operation: 'get'
        }, credentials: {
          googleTasksOAuth2Api: {
            id: 'credential-id',
            name: 'googleTasksOAuth2Api Credential'
          }
        }, name: 'Get a Task' } }), tool({ type: 'n8n-nodes-base.googleTasksTool', version: 1, config: { parameters: {
          task: 'MDM1NDg1NzcxMjIyNzg5NzQ1ODI6MDow',
          title: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Title\', ``, \'string\') }}',
          additionalFields: {
            notes: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Notes\', ``, \'string\') }}',
            dueDate: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Due_Date\', `Always use future dates`, \'string\') }}'
          }
        }, credentials: {
          googleTasksOAuth2Api: {
            id: 'credential-id',
            name: 'googleTasksOAuth2Api Credential'
          }
        }, name: 'Create a Task' } }), tool({ type: 'n8n-nodes-base.googleTasksTool', version: 1, config: { parameters: {
          task: 'MDM1NDg1NzcxMjIyNzg5NzQ1ODI6MDow',
          taskId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Task_ID\', ``, \'string\') }}',
          operation: 'delete'
        }, credentials: {
          googleTasksOAuth2Api: {
            id: 'credential-id',
            name: 'googleTasksOAuth2Api Credential'
          }
        }, name: 'Delete a Task' } }), tool({ type: 'n8n-nodes-base.googleTasksTool', version: 1, config: { parameters: {
          task: 'MDM1NDg1NzcxMjIyNzg5NzQ1ODI6MDow',
          operation: 'getAll',
          returnAll: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Return_All\', ``, \'boolean\') }}',
          descriptionType: 'manual',
          toolDescription: 'Get tasks from Google Tasks',
          additionalFields: {
            showCompleted: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Show_Completed\', ``, \'boolean\') }}'
          }
        }, credentials: {
          googleTasksOAuth2Api: {
            id: 'credential-id',
            name: 'googleTasksOAuth2Api Credential'
          }
        }, name: 'Get many Tasks' } }), tool({ type: 'n8n-nodes-base.googleTasksTool', version: 1, config: { parameters: {
          task: 'MDM1NDg1NzcxMjIyNzg5NzQ1ODI6MDow',
          taskId: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Task_ID\', `Pass the task_id of the task to be completed`, \'string\') }}',
          operation: 'update',
          updateFields: {
            status: 'completed',
            completed: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Completion_Date\', `Pass the date when the task is completed`, \'string\') }}'
          }
        }, credentials: {
          googleTasksOAuth2Api: {
            id: 'credential-id',
            name: 'googleTasksOAuth2Api Credential'
          }
        }, name: 'Complete a Task' } })] }, position: [-1024, 736], name: 'Task Manager MCP' } }))
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-960, 416] } }))
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
            id: '74570957-ff95-4df8-bbc2-043c4973a733',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.message.chat.username }}',
            rightValue: 'jackman8'
          }
        ]
      }
    }, position: [-752, 416], name: 'Only allow me' } }))
  .then(switchCase([node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      text: '={{ $json.message.text }}\n\n{{ $json.text }}',
      options: {
        systemMessage: '=You are Jarvis, an intelligent productivity assistant designed to help manage daily tasks, communications, and schedules efficiently. You have access to multiple tools and should use them proactively to assist the user.\n\n## Core Identity\n- You are professional, helpful, and proactive\n- Always maintain a personal assistant tone - attentive but not overly casual\n- Use "Jitesh Dugar" as the user\'s name in all communications\n- Current date and time: {{ $now }}\n- Timezone: Asia/Kolkata\n\n## Available Capabilities\n\n### Email Management (Gmail MCP)\n- Read, send, reply to, and draft emails\n- Organize emails with labels\n- Search and filter emails by various criteria\n- Always use well-formatted HTML for email composition\n- Include proper signatures with "Jitesh Dugar"\n- If you\'re asked to send an email, just use the \'Google Contacts MCP\' to get their email address first, then confirm from the user\n\n### Calendar Management (Calendar MCP)\n- Check availability and schedule conflicts\n- Create, update, reschedule, and delete events\n- Retrieve upcoming events and meetings\n- Handle meeting requests and confirmations\n\n### Task Management (Google Tasks MCP)\n- Create, update, complete, and delete tasks\n- Retrieve task lists with filtering options\n- Set due dates and add detailed notes\n- Mark tasks as completed with timestamps\n\n### Finance Tracking (Finance Manager MCP)\n- Log expenses with categories and descriptions\n- Retrieve expense reports and summaries\n- Delete or modify expense entries\n- Track spending patterns\n\n### Contact Management (Google Contacts MCP)\n- Search and retrieve contact information\n- Access email addresses and phone numbers for communications\n\n## Communication Guidelines\n\n### Email Composition\n- Use professional HTML formatting\n- Include clear subject lines\n- Structure emails with proper greetings and closings\n- Always sign emails as "Jitesh Dugar"\n- No placeholder text - ask for clarification if information is missing\n\n### Response Style\n- Be concise but complete in responses\n- Proactively suggest related actions when appropriate\n- Confirm actions taken and provide relevant details\n- If multiple steps are involved, explain what you\'re doing\n\n## Operational Rules\n\n### Data Handling\n- Always use specific, actionable parameters\n- For dates, use future dates when creating tasks/events unless specified otherwise\n- When scheduling, check for conflicts before confirming\n- Validate email addresses before sending\n\n### Error Management\n- If information is incomplete, ask specific questions\n- Don\'t use placeholders or generic text\n- Confirm understanding before executing actions\n- Provide clear feedback on completed actions\n\n### Privacy & Security\n- Handle all personal information with appropriate discretion\n- Confirm sensitive actions before executing\n- Maintain professional boundaries in all communications\n\n## Task Prioritization\n1. **Urgent**: Time-sensitive items (meetings, deadlines)\n2. **Important**: High-impact tasks and communications\n3. **Routine**: Regular maintenance and organization\n4. **Optional**: Enhancement and optimization tasks\n\n## Example Interactions\n\n**Calendar Query**: "What meetings do I have today?"\n→ Check calendar for today\'s events, provide detailed schedule with times and attendees\n\n**Email Task**: "Send a follow-up email to the marketing team about the quarterly review"\n→ Ask for specific details if needed, compose professional HTML email, confirm before sending\n\n**Task Creation**: "Add a reminder to prepare the presentation for next week"\n→ Create task with appropriate due date, ask for specific deadline if unclear\n\n**Expense Logging**: "I spent $45 on lunch at the restaurant"\n→ Log expense with date, amount, category (Food/Dining), and description\n\n## Always Remember\n- You represent Jitesh professionally in all communications\n- Double-check important details before executing actions\n- Provide clear confirmations of completed tasks\n- Be proactive in suggesting helpful follow-up actions\n- Maintain context across conversations using the memory system'
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1.1, config: { name: 'Think' } }), tool({ type: '@n8n/n8n-nodes-langchain.mcpClientTool', version: 1.1, config: { parameters: { endpointUrl: 'https://n8n.exildraw.com/mcp/gmail-mcp/sse' }, name: 'Gmail MCP' } }), tool({ type: '@n8n/n8n-nodes-langchain.mcpClientTool', version: 1.1, config: { parameters: {
          endpointUrl: 'https://n8n.exildraw.com/mcp/google-calendar/sse'
        }, name: 'Calendar MCP' } }), tool({ type: '@n8n/n8n-nodes-langchain.mcpClientTool', version: 1.1, config: { parameters: {
          endpointUrl: 'https://n8n.exildraw.com/mcp/finance-manager/sse'
        }, name: 'Finance Tracker' } }), tool({ type: '@n8n/n8n-nodes-langchain.mcpClientTool', version: 1.1, config: { parameters: { endpointUrl: 'https://n8n.exildraw.com/mcp/google-contacts' }, name: 'Google Contacts' } }), tool({ type: '@n8n/n8n-nodes-langchain.mcpClientTool', version: 1.1, config: { parameters: {
          endpointUrl: 'https://n8n.exildraw.com/mcp/task-YOUR_OPENAI_KEY_HERE'
        }, name: 'Google Tasks MCP' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'Telegram Trigger\').item.json.message.chat.username }}',
          sessionIdType: 'customKey'
        }, name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1-mini',
            cachedResultName: 'gpt-4.1-mini'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [368, 320], name: 'Jarvis' } }), node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      fileId: '={{ $json.message.voice.file_id }}',
      resource: 'file',
      additionalFields: {}
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-304, 512], name: 'Get a file' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'Text',
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
                  id: '3421ce54-2c7c-4c87-ab7f-a4598eaa7f6b',
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.message.text }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Audio',
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
                  id: '85c06561-3e1d-4871-af64-f08e5f657b24',
                  operator: { type: 'string', operation: 'notExists', singleValue: true },
                  leftValue: '={{ $json.message.text }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'c707ac04-2237-4cc4-991a-6aa22b1cef81',
            name: 'message',
            type: 'string',
            value: '={{ $json.output || $json.error }}'
          }
        ]
      }
    }, position: [976, 320], name: 'Set Reply Message' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $(\'Set Reply Message\').item.json.message.replace(/[_*\\[\\]()~`>#+=\\-|{}.!\\\\]/g, \'\\\\$&\') }}',
      chatId: '={{ $(\'Telegram Trigger\').item.json.message.chat.id }}',
      additionalFields: { parse_mode: 'MarkdownV2', appendAttribution: false }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [1392, 128], name: 'Send a text message' } }), node({ type: '@elevenlabs/n8n-nodes-elevenlabs.elevenLabs', version: 1, config: { parameters: {
      text: '={{ $(\'Set Reply Message\').item.json.message }}',
      voice: {
        __rl: true,
        mode: 'list',
        value: 'MF4J4IDTRo0AxOO4dpFR',
        cachedResultName: 'Devi - Clear Hindi pronunciation'
      },
      resource: 'speech',
      requestOptions: {},
      additionalOptions: {}
    }, credentials: {
      elevenLabsApi: { id: 'credential-id', name: 'elevenLabsApi Credential' }
    }, position: [1392, 368], name: 'Convert text to speech' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'Text',
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
                  id: '9f763ec1-25e5-4a4d-88fa-70156851ff2a',
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $(\'Telegram Trigger\').item.json.message.text }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Audio',
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
                  id: '12be0a10-540d-423c-82de-00d0e9e9e501',
                  operator: { type: 'string', operation: 'notExists', singleValue: true },
                  leftValue: '={{ $(\'Telegram Trigger\').item.json.message.text }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'Check Text or Audio' }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      chatId: '={{ $(\'Telegram Trigger\').item.json.message.chat.id }}',
      operation: 'sendAudio',
      binaryData: true,
      additionalFields: {
        caption: '={{ $(\'Set Reply Message\').item.json.message.replace(/[_*\\[\\]()~`>#+=\\-|{}.!\\\\]/g, \'\\\\$&\') }}',
        fileName: 'Jarvis\'s Reply'
      }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [1584, 320], name: 'Send an audio file' } }))
  .then(node({ type: '@elevenlabs/n8n-nodes-elevenlabs.elevenLabs', version: 1, config: { parameters: {
      resource: 'speech',
      operation: 'speechToText',
      requestOptions: {},
      additionalOptions: {}
    }, credentials: {
      elevenLabsApi: { id: 'credential-id', name: 'elevenLabsApi Credential' }
    }, position: [-80, 512], name: 'Transcribe audio or video' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.mcpTrigger', version: 1.1, config: { parameters: { path: 'f226741c-0f79-4f23-96bf-d8eb47206bcf' }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          columns: {
            value: {
              Date: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Date\', ``, \'string\') }}',
              Amount: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Amount\', ``, \'string\') }}',
              Category: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Category\', ``, \'string\') }}',
              Description: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Description\', ``, \'string\') }}'
            },
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
                id: 'Description',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Description',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Category',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Category',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Amount',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Amount',
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
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs/edit?usp=drivesdk',
            cachedResultName: 'Expense Tracker'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Create Expense' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          clear: 'specificRows',
          operation: 'clear',
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs/edit?usp=drivesdk',
            cachedResultName: 'Expense Tracker'
          },
          startIndex: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Start_Row_Number\', ``, \'number\') }}',
          rowsToDelete: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Number_of_Rows_to_Delete\', ``, \'number\') }}'
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Delete Expense' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1QCS8_RA5neEDAmgotpzgbBbeEjdYi-LAmCSJVeNWVxs/edit?usp=drivesdk',
            cachedResultName: 'Expense Tracker'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Get all Expenses' } })] }, position: [1104, 688], name: 'Finance Manager MCP Server' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.mcpTrigger', version: 2, config: { parameters: { path: '01e90a0b-6f53-40d0-a8d3-a05c34a46fbb' }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleContactsTool', version: 1, config: { parameters: {
          query: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Query\', ``, \'string\') }}',
          fields: ['names', 'emailAddresses'],
          options: {},
          rawData: true,
          useQuery: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Use_Query\', ``, \'boolean\') }}',
          operation: 'getAll'
        }, credentials: {
          googleContactsOAuth2Api: {
            id: 'credential-id',
            name: 'googleContactsOAuth2Api Credential'
          }
        }, name: 'Get Contacts' } })] }, position: [1216, 1216], name: 'Google Contacts MCP' } }))
  .add(sticky('## Jarvis 🤖\nYour AI-powered personal assistant.  \n- Orchestrates tasks, calendar, emails, contacts & expenses  \n- Uses memory + OpenAI model for smart decisions  \n- Sends results back to Telegram  ', { name: 'Sticky Note1', position: [144, 144], width: 720, height: 704 }))
  .add(sticky('## Gmail MCP 📧\nFull email management.  \n- Send & draft messages  \n- Reply, label, and fetch emails  ', { name: 'Sticky Note4', color: 3, position: [224, 880], width: 768, height: 640 }))
  .add(sticky('## Finance Manager MCP 💵\nTrack personal or business expenses.  \n- Create new expenses  \n- Get expense reports  \n- Delete outdated entries  ', { name: 'Sticky Note5', color: 4, position: [1024, 528], width: 496, height: 544 }))
  .add(sticky('## Google Contacts MCP 👥\nAccess and manage your contact list.  \n- Fetch contacts for quick communication  ', { name: 'Sticky Note6', color: 6, position: [1056, 1088], width: 448, height: 416 }))
  .add(sticky('## Calendar MCP 📅\nYour scheduling hub.  \n- Check availability  \n- Create, reschedule, or delete events ', { name: 'Sticky Note3', color: 5, position: [-512, 720], width: 624, height: 704 }))
  .add(sticky('## Task Manager MCP ✅\nManages to-dos with ease:  \n- Create / Complete / Delete tasks  \n- Retrieve individual or bulk tasks ', { name: 'Sticky Note2', color: 6, position: [-1104, 592], width: 560, height: 624 }))