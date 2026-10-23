import type { NodeTypeGuide } from './types';

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
The parameter is named **simple**, not "simplify". Default: true.
- **simple: false** - Returns the FULL parsed email with body, attachments and headers. The sender is the object \`$json.from\`: read the address with \`$json.from.value[0].address\`. The body is in \`$json.text\` and \`$json.html\`.
- **simple: true** - Returns a LIMITED flat item (subject, snippet, labels, NO body). The sender is the string \`$json.From\`, for example "Sara Chen <sara@example.com>".

Read the sender from the field that matches the setting. \`$json.From\` is undefined when simple is false.

These shapes are for the **message** operations. For **thread:get**, both settings flatten the headers, so \`$json.From\` works. With simple false, thread:get returns the Gmail API payload: the body is encoded in base64url in \`payload.parts[].body.data\` (look through nested parts), and there is no \`$json.from\`, \`$json.text\` or \`$json.html\`.

Set simple to false only when:
- Workflow needs the email body to analyze or summarize it
- AI Agent will process the email text
- Attachments need to be accessed

Keep simple true when the workflow only filters or routes by sender, subject or labels.

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
   - Set simple to false (required for full email body) and read the sender from \`$json.from.value[0].address\`
   - Configure appropriate filter query
   - Pass full email data to AI Agent

3. **Using Expressions**:
   - Can use expressions: "={{ $('Previous Node').item.json.email }}"
   - Can reference previous node data for dynamic values
`,
};
