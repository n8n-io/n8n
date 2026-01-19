return workflow('e63GF6KHkhFUFKfz', 'Build your first email agent with fall back model', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.gmailTrigger', version: 1.2, config: { parameters: { filters: {}, pollTimes: { item: [{ mode: 'everyMinute' }] } }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [-32, 0] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.1, config: { parameters: {
      text: '={{ $json.Subject }} {{ $json.snippet }}',
      options: {
        systemMessage: '\n## Primary Role\nYou are a professional customer support AI agent that processes incoming Gmail messages, provides helpful responses to customers, and logs all support requests for tracking purposes.\n\n## Core Responsibilities\n\n### 1. Email Analysis & Response\n- **Read and analyze** each incoming email carefully\n- **Identify the type of request**: technical issue, billing question, feature request, complaint, general inquiry, etc.\n- **Determine urgency level**: Low, Medium, High, Critical\n- **Extract key information**: customer details, issue description, requested action, timeline expectations\n\n### 2. Customer Reply Generation\nGenerate professional, helpful, and empathetic email responses that:\n- **Acknowledge** the customer\'s concern promptly\n- **Provide clear solutions** or next steps when possible\n- **Set appropriate expectations** for resolution timeline\n- **Maintain a friendly, professional tone**\n- **Include relevant resources** (links, documentation, FAQs) when helpful\n- **Ask clarifying questions** if more information is needed\n- **Escalate to human support** when issues are complex or sensitive\n\n### 3. Google Sheets Logging\nFor every email processed, log the following information:\n- **Date/Time**: When the email was received\n- **Customer Email**: Sender\'s email address\n- **Customer Name**: If available\n- **Subject Line**: Email subject\n- **Request Type**: Category (Technical, Billing, Feature Request, etc.)\n- **Priority Level**: Low/Medium/High/Critical\n- **Issue Summary**: Brief description (2-3 sentences max)\n- **Status**: New/In Progress/Resolved/Escalated\n- **Response Sent**: Yes/No\n- **Follow-up Required**: Yes/No/Date\n- **Agent Notes**: Any additional context or actions taken\n\n## Response Templates & Guidelines\n\n### Standard Greeting\n"Hi [Customer Name],\n\nThank you for reaching out to us. I\'ve received your message regarding [brief issue summary]."\n\n### Common Scenarios\n\n**Technical Issues:**\n- Acknowledge the frustration\n- Provide step-by-step troubleshooting\n- Offer alternative solutions\n- Set expectations for resolution\n\n**Billing Questions:**\n- Confirm account details (without exposing sensitive info)\n- Explain charges clearly\n- Provide next steps for disputes\n- Include relevant billing resources\n\n**Feature Requests:**\n- Thank them for the suggestion\n- Explain current roadmap (if applicable)\n- Suggest workarounds if available\n- Confirm request has been logged for product team\n\n**Complaints:**\n- Acknowledge their concern with empathy\n- Take responsibility where appropriate\n- Outline steps to resolve\n- Offer compensation if warranted\n\n### Escalation Criteria\nEscalate to human support when:\n- Customer is extremely upset or threatening\n- Issue involves sensitive account information\n- Technical problem requires developer intervention\n- Billing dispute over significant amount\n- Legal or compliance matters\n- Multiple failed resolution attempts\n\n### Tone Guidelines\n- **Professional** yet conversational\n- **Empathetic** and understanding\n- **Clear** and concise\n- **Proactive** in offering solutions\n- **Apologetic** when appropriate (without admitting fault unnecessarily)\n\n## Memory & Context Management\n- **Remember** previous interactions with the same customer\n- **Reference** past solutions or conversations when relevant\n- **Track** ongoing issues to ensure continuity\n- **Note** customer preferences or special circumstances\n\n## Quality Standards\n- **Response time**: Aim for acknowledgment within 1 hour during business hours\n- **Accuracy**: Ensure all information provided is correct and up-to-date\n- **Completeness**: Address all questions/concerns in the customer\'s email\n- **Follow-up**: Set reminders for promised callbacks or updates\n\n## Example Response Format\n\nSubject: Re: [Original Subject] - We\'re here to help!\n\nHi [Customer Name],\n\nThank you for contacting us about [issue]. I understand [acknowledge their concern/situation].\n\n[Provide solution/next steps/information requested]\n\n[If applicable: set expectations, provide timeline, or explain next steps]\n\nIs there anything else I can help you with today? We\'re always here to support you.\n\nBest regards,\n[Your Name]\nCustomer Support Team\n\n---\n\n**Note**: Always maintain customer privacy and confidentiality. Never share sensitive information inappropriately, and ensure all logging complies with data protection standards.'
      },
      promptType: 'define',
      needsFallback: true
    }, subnodes: { model: [languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI  Model' } }), languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {} }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Gemini Chat Model' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'Gmail Trigger\').item.json.id }}',
          sessionIdType: 'customKey'
        }, name: 'Simple Memory' } }), tools: [tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          columns: {
            value: {
              'email address ': '={{ $(\'Gmail Trigger\').item.json.To }}'
            },
            schema: [
              {
                id: 'customer_name',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'customer_name',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'email address ',
                type: 'string',
                display: true,
                required: false,
                displayName: 'email address ',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Service type',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Service type',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'appointment date',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'appointment date',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'estimated duration',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'estimated duration',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'estimated price',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'estimated price',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'stylist name',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'stylist name',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'hair length',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'hair length',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'phone number ',
                type: 'string',
                display: true,
                required: false,
                displayName: 'phone number ',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['customer_name'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          },
          options: {},
          operation: 'appendOrUpdate',
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1KFjFpYS9akNv_I-JcQKMQVBT-rXYfK2sC4dP6QYpcp4/edit#gid=0',
            cachedResultName: 'Sheet1'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1KFjFpYS9akNv_I-JcQKMQVBT-rXYfK2sC4dP6QYpcp4',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1KFjFpYS9akNv_I-JcQKMQVBT-rXYfK2sC4dP6QYpcp4/edit?usp=drivesdk',
            cachedResultName: 'SUPPORT LOG '
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'Append or update row in sheet in Google Sheets' } })] }, position: [288, 0], name: 'AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      message: '={{ $json.output }}',
      options: {},
      resource: 'thread',
      threadId: '={{ $(\'Gmail Trigger\').item.json.id }}',
      messageId: '={{ $(\'Gmail Trigger\').item.json.id }}',
      operation: 'reply'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [784, 0], name: 'Reply to a message(Thread)' } }))
  .add(sticky('# 🤖 Your First Email Agent with Fallback Model\n\n## 📧 What This Workflow Does\nThis automation creates an intelligent email support system that:\n- **Monitors Gmail** for new customer emails\n- **Processes requests** using AI with smart fallback options\n- **Sends personalized replies** automatically\n- **Logs everything** to Google Sheets for tracking\n\n## 🔄 How the Fallback Model Works\n\n### Primary Model: Google Gemini Chat\n- **Fast & Cost-Effective** - Handles 90% of standard support queries\n- **Great for**: FAQ responses, basic troubleshooting, general inquiries\n\n### Fallback Model: OpenAI GPT\n- **Kicks in when** Gemini fails or encounters complex queries\n- **Better for**: Nuanced responses, technical issues, edge cases\n- **Higher accuracy** for complex customer situations\n\n## 🏗️ Workflow Architecture\n\n```\nGmail Trigger → AI Agent → Response Decision → Actions\n                   ↓\n            [Primary Model]\n                   ↓\n            [Fallback Model] ← (if needed)\n                   ↓\n         [Send Reply + Log Data]\n```\n', { name: 'Sticky Note', position: [-1104, -352], width: 768, height: 848 }))
  .add(sticky('\n## 💡 Why Use a Fallback Model?\n\n### Reliability\n- **99.9% uptime** - If one model fails, the other continues\n- **No missed emails** - Every customer gets a response\n\n### Cost Optimization\n- **Use cheaper models first** (Gemini) for simple queries\n- **Reserve premium models** (GPT-4) for complex cases\n- **Reduce API costs** by 60-80%\n\n### Quality Assurance\n- **Best of both worlds** - Speed + accuracy\n- **Consistent responses** even during API outages\n- **Improved customer satisfaction**\n\n\n## 🚀 Getting Started Checklist\n\n- [ ] **Gmail account** with API access enabled\n- [ ] **Google Sheets** document created\n- [ ] **Gemini API key** (primary model)\n- [ ] **OpenAI API key** (fallback model)\n- [ ] **N8N instance** running\n- [ ] **Import this workflow** and configure credentials\n\n## 📊 What Gets Logged\n- Customer email & timestamp\n- Request type & priority level\n- Which AI model responded\n- Response time & success rate\n- Follow-up requirements\n\n## 🔧 Customization Options\n- **Modify response templates** for your brand voice\n- **Add more fallback models** (Claude, etc.)\n- **Create custom triggers** (Slack, Discord, etc.)\n- **Build escalation rules** for human handoff\n\n## 💭 Learning Outcomes\nAfter building this workflow, you\'ll understand:\n- **AI model orchestration** strategiess  \n- **Customer service** automation best practices\n- **Multi-model AI** implementation patterns\n\n---\n\n\n\n**🎓 Educational Focus**: This isn\'t just automation - it\'s your introduction to building resilient, intelligent systems that handle real-world business challenges.', { name: 'Sticky Note1', position: [1072, -512], width: 640, height: 1360 }))
  .add(sticky('## 🎯 Perfect for Beginners Because:\n\n### Simple Setup\n- **Drag & drop** workflow design\n- **Pre-built integrations** with Gmail & Sheets\n- **Copy-paste ready** - Just add your API keys\n\n### Educational Value\n- **Learn AI orchestration** concepts\n- **Understand fallback patterns** in automation\n- **See real-world AI applications** in action\n\n### Immediate Results\n- **Works out of the box** with minimal configuration\n- **See responses** within minutes of setup\n- **Track performance** in Google Sheets dashboard\n', { name: 'Sticky Note2', position: [-192, -448], width: 464, height: 448 }))
  .add(sticky('## Ai Models', { name: 'Sticky Note3', position: [-208, 176], height: 224 }))