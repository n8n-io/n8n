import type { NodeTypeGuide } from '../types';

export const GMAIL_GUIDE: NodeTypeGuide = {
	patterns: ['n8n-nodes-base.gmail', 'n8n-nodes-base.gmailTrigger'],
	content: `
### Gmail Node Updates

#### Common Parameters
- **resource**: message, draft, label, thread
- **operation**: send, get, list, etc.
- **to**: Recipient email address
- **subject**: Email subject line
- **message**: Email body/content
- **authentication**: OAuth2 or Service Account

#### Simplify Option (CRITICAL)
- **simplify: false** - Returns FULL email with body, attachments, headers
- **simplify: true** - Returns LIMITED data (subject, snippet only, NO body)

ALWAYS set simplify to FALSE when:
- Workflow needs to analyze email content/body
- AI Agent will process or summarize emails
- Email content is used for decision making
- Attachments need to be accessed

#### Gmail Filter Queries
For Gmail Trigger nodes, use comprehensive search filters with OR operators:
- Multiple keywords: "subject:(delivery OR shipment OR package OR tracking)"
- From specific senders: "from:example@domain.com"
- With attachments: "has:attachment"
- Unread only: "is:unread"

Example for package tracking: "subject:(delivery OR shipment OR package OR tracking OR shipped)"
NOT just: "subject:delivery" (misses many relevant emails)

#### Common Patterns
1. **Sending Email**:
   - Set resource to "message"
   - Set operation to "send"
   - Configure to, subject, and message fields

2. **Reading Emails for AI Analysis**:
   - Set simplify to false (required for full email body)
   - Configure appropriate filter query
   - Pass full email data to AI Agent

3. **Using Expressions**:
   - Can use expressions: "={{ $('Previous Node').item.json.email }}"
   - Can reference previous node data for dynamic values
`,
};
