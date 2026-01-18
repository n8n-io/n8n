import type { NodeTypeGuide } from '../types';

export const GMAIL_GUIDE: NodeTypeGuide = {
	patterns: ['n8n-nodes-base.gmail'],
	content: `
### Gmail Node Updates

#### Common Parameters
- **resource**: message, draft, label, thread
- **operation**: send, get, list, etc.
- **to**: Recipient email address
- **subject**: Email subject line
- **message**: Email body/content
- **authentication**: OAuth2 or Service Account

#### Common Patterns
1. **Sending Email**:
   - Set resource to "message"
   - Set operation to "send"
   - Configure to, subject, and message fields

2. **Using Expressions**:
   - Can use expressions: "={{ $('Previous Node').item.json.email }}"
   - Can reference previous node data for dynamic values
`,
};
