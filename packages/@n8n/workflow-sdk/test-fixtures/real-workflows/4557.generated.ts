return workflow('MKPGGcZ4kNS2VaAd', 'Auto Gmail Labeling (Powered by OpenAI)', {
    callerPolicy: 'workflowsFromSameOwner',
    errorWorkflow: '9GaFMSfyUS2pdk24',
    executionOrder: 'v1'
  })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: { interval: [{ field: 'minutes', minutesInterval: 2 }] }
    }, position: [-2340, -580] } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      limit: 20,
      simple: false,
      filters: { readStatus: 'both' },
      options: {},
      operation: 'getAll'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [-2120, -580], name: 'Gmail - Get All Messages' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const excludedLabelIds = [\n  "Label_5",   // Newsletter\n  "Label_21",  // Inquiry\n  "Label_11",  // Invoice\n  "Label_9",   // Proposal\n  "Label_52",  // Action Required\n  "Label_55",  // Follow-up Reminder\n  "Label_53",  // Task\n  "Label_44",  // Personal\n  "Label_54",  // Urgent\n  "Label_12",  // Bank\n  "Label_3",   // Job Update\n  "Label_42",  // Spam / Junk\n  "Label_7",   // Social / Networking\n  "Label_8",   // Receipt\n  "Label_2",   // Event Invite\n  "Label_10",  // Subscription Renewal\n  "Label_4"    // System Notification\n];\n\n\nreturn items.filter(item => {\n  const labels = item.json.labelIds || [];\n  // Exclude if ANY excluded label is present\n  return !labels.some(label => excludedLabelIds.includes(label));\n});\n'
    }, position: [-1900, -580], name: 'Filter Emails Without Excluded Labels' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [-1580, -560], name: 'Loop Over Items' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      simple: false,
      options: {},
      messageId: '={{ $json.id }}',
      operation: 'get'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [-1340, -640], name: 'Gmail - Single Message' } }))
  .add(node({ type: 'n8n-nodes-base.if', version: 2.2, config: { parameters: {
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
            id: '2f466934-e257-4315-8a7f-5e3dde987430',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.labelIds[2] }}',
            rightValue: '={{ $json.labelIds[2] }}'
          }
        ]
      }
    }, position: [-1140, -600] } }))
  .then(merge([node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      simple: false,
      options: {},
      messageId: '={{ $json.id }}',
      operation: 'get'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [-1340, -640], name: 'Gmail - Single Message' } }), node({ type: 'n8n-nodes-base.if', version: 2.2, config: { parameters: {
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
            id: '2f466934-e257-4315-8a7f-5e3dde987430',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.labelIds[2] }}',
            rightValue: '={{ $json.labelIds[2] }}'
          }
        ]
      }
    }, position: [-1140, -600] } })], { version: 3.1 }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '2e246278-eccb-4cd5-8c93-7daa824066e3',
            name: 'id',
            type: 'string',
            value: '={{ $json.id }}'
          },
          {
            id: '06e5dde5-dfce-4d4d-859d-b364301cb5aa',
            name: 'from',
            type: 'string',
            value: '={{ $json.headers.from }}'
          },
          {
            id: 'e10231b9-fbb1-447a-a3fc-3ba8e5a9d314',
            name: 'headers.subject',
            type: 'string',
            value: '={{ $json.headers.subject }}'
          },
          {
            id: '6a472d41-0f6e-4803-8d94-4b4f8272e66c',
            name: 'text',
            type: 'string',
            value: '={{ $json.text }}'
          }
        ]
      }
    }, position: [-700, -700], name: 'Extract Email Data' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Here is the email details:\nFrom: { $(\'Merge\').item.json.headers.from }}\nSubject line: {{ $json.headers.subject }}\nEmail Body: \n{{ $json.text }}',
      options: {
        systemMessage: 'You are my Personal Email Labeler.  \nWhen I feed you the subject and body of a new email, you must assign exactly one label—no extra text.\n\nAvailable labels:\n- Newsletter  \n- Inquiry  \n- Invoice  \n- Proposal  \n- Action Required  \n- Follow-up Reminder  \n- Task  \n- Personal  \n- Urgent  \n- Bank  \n- Job Update  \n- Spam / Junk  \n- Social / Networking  \n- Receipt  \n- Event Invite  \n- Subscription Renewal  \n- System Notification  \n\nLabel definitions:\n1. Newsletter  \n   • Subscription updates, promotions, digests.  \n   • No reply needed—just file away.  \n2. Inquiry  \n   • Sender asks a question or requests information.  \n   • Prioritize and suggest replying.  \n3. Invoice  \n   • Billing, receipts, payment requests.  \n   • Flag if payment is due.  \n4. Proposal  \n   • Business offers, contracts, collaboration pitches.  \n   • Flag for review; consider acknowledging receipt.  \n5. Action Required  \n   • Requests that demand you do something (book, confirm, complete).  \n   • Mark and suggest a reminder.  \n6. Follow-up Reminder  \n   • Emails reminding you of something pending or that you already acted on.  \n   • Suggest checking status or pinging again.  \n7. Task  \n   • Contains to-do items or project steps.  \n   • Extract tasks, prioritize by deadline.  \n8. Personal  \n   • From friends or family; non-work.  \n   • Keep accessible but low urgency unless marked urgent.  \n9. Urgent  \n   • Critical deadlines, emergencies, time-sensitive.  \n   • Bump to top of your inbox; reply ASAP.  \n10. Bank  \n    • Statements, alerts, transaction notices, fraud warnings from your bank.  \n    • Flag if action is needed (e.g., verify, transfer, dispute).  \n11. Job Update  \n    • Direct messages from recruiters/HR or alerts from job portals (LinkedIn, Naukri, etc.).  \n    • Flag as relevant opportunity; suggest acknowledging or bookmarking.  \n12. Spam / Junk  \n    • Unwanted bulk mail, phishing attempts, obvious ads.  \n    • Auto-archive or delete.  \n13. Social / Networking  \n    • Notifications from social sites (GitHub, Twitter, forums) not job-related.  \n    • File separately from Job Update.  \n14. Receipt  \n    • E-commerce order confirmations, tickets, one-off purchase receipts.  \n    • Archive after processing.  \n15. Event Invite  \n    • Calendar invitations or RSVPs (Google Meet, Zoom, Outlook).  \n    • Accept/decline or add to calendar.  \n16. Subscription Renewal  \n    • Reminders for software licenses, memberships, domain renewals.  \n    • Flag for manual renewal.  \n17. System Notification  \n    • Alerts from monitoring tools, CI/CD, cloud services, security scanners.  \n    • Triage or forward to team channel.\n\nRules:\n- Read subject + body.  \n- Choose the single best label.  \n- Output **only** that label.'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1-nano',
            cachedResultName: 'gpt-4.1-nano'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [-480, -800], name: 'Categorize Email with AI' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '2494d69d-3e5e-42ba-88d2-b76ca1962881',
            name: 'output',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [-100, -700], name: 'Store AI Category' } }))
  .add(node({ type: 'n8n-nodes-base.compareDatasets', version: 2.3, config: { parameters: {
      options: { multipleMatches: 'first' },
      fuzzyCompare: true,
      mergeByFields: { values: [{ field1: 'output', field2: 'name' }] }
    }, position: [340, -720], name: 'Check if Label Exists' } }))
  .add(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      name: '={{ $(\'Store AI Category\').item.json.output }}',
      options: {},
      resource: 'label',
      operation: 'create'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [560, -800], name: 'Apply New Label' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      labelIds: '={{ $json.id }}',
      messageId: '={{ $(\'Extract Email Data\').item.json.id }}',
      operation: 'addLabels'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [780, -800], name: 'Create New Label' } }))
  .then(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [1000, -600], name: 'Replace Me' } }))
  .add(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      labelIds: '={{ $json.different.id.inputB }}',
      messageId: '={{ $(\'Extract Email Data\').item.json.id }}',
      operation: 'addLabels'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [780, -600], name: 'Apply Label to Email' } }))
  .add(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: { resource: 'label', returnAll: true }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [120, -600], name: 'List All Gmail Labels' } }))
  .add(sticky('## Auto Gmail Labeling (Powered by OpenAI)', { name: 'Sticky Note', position: [-2440, -960], width: 3820, height: 740 }))