import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class NotificationBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.NOTIFICATION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Notification Workflows

## Workflow Design

Structure notification workflows in a clear sequence. Keep each part modular with nodes dedicated to specific purposes.

\`\`\`mermaid
graph LR
    A[Trigger] --> B[Data Retrieval/Processing]
    B --> C[Condition Check]
    C --> D[Notification Action]
    D --> E[Post-Notification: logging/tracking]
\`\`\`

Choose between event-based triggers (webhooks, form submissions, CRM events) for immediate notifications or scheduled triggers (Cron) for periodic condition monitoring.

CRITICAL: Multi-channel notifications should branch from a single condition check to multiple notification nodes in parallel, not duplicate the entire workflow. This enables easy extension and maintenance.

Example pattern:
\`\`\`mermaid
graph LR
    A[Webhook/Schedule Trigger] --> B[Fetch Data]
    B --> C[If: threshold exceeded]
    C -->|true| D[Email]
    C -->|true| E[Slack]
    C -->|true| F[SMS]
    C -->|false| G[End/Log]
\`\`\`
Result: Single workflow handles all channels efficiently with consistent logic

## Condition Logic & Filtering

Use IF nodes for simple checks without code. For complex conditions (multiple fields, array filtering), use Function nodes to script the logic and filter items that need alerts.

Always include empty notification prevention - check that alert-worthy items exist (items.length > 0) before proceeding to notification nodes. Route the false branch to end the workflow or log "no alert needed".

## Message Construction

Use expressions to inject dynamic data into messages. The expression \`{{ $json.fieldName }}\` pulls data from input items.

Format messages appropriately for each channel:
- Email: Support HTML or plain text, use clear subject lines
- Slack: Use markdown-like formatting, \\n for newlines
- SMS: Keep concise due to character limits, plain text only

## Alert Management

Consider alert aggregation - send one message listing multiple items rather than individual alerts.

Add logging nodes to track sent notifications for audit trails and duplicate prevention. Consider using error handling paths with Continue on Fail settings for redundancy.

## Recommended Nodes

### Trigger Nodes

**Service-specific triggers** (e.g., n8n-nodes-base.googleSheetsTrigger, n8n-nodes-base.crmTrigger):
- Purpose: Direct integration with specific services for event-based notifications
- Use cases: New row in Google Sheets, CRM record updates
- When to use: When specific trigger node is available

**Webhook** (n8n-nodes-base.webhook):
- Purpose: Event-based notifications triggered by external systems
- Use cases: Form submissions, CRM events, API webhooks
- When to use: When there is no dedicated trigger node and external service supports webhooks

**Schedule Trigger** (n8n-nodes-base.scheduleTrigger):
- Purpose: Periodic monitoring and batch notifications
- Use cases: Daily reports, threshold monitoring, scheduled alerts
- When to use: For regular checks rather than immediate alerts, or as a polling mechanism when webhooks are not available

**Form Trigger** (n8n-nodes-base.formTrigger):
- Purpose: User-submitted data triggering notifications
- Use cases: Contact forms, feedback submissions
- When to use: For workflows initiated by user input via forms

### Notification Nodes

**Send Email** (n8n-nodes-base.emailSend):
- Purpose: Detailed alerts with attachments and HTML formatting
- Use cases: Reports, detailed notifications, formal communications
- Configuration: SMTP settings, use App Passwords for Gmail
- Best practice: Use clear subject lines with key information

**Slack** (n8n-nodes-base.slack):
- Purpose: Team notifications in channels or direct messages
- Use cases: Team alerts, status updates, incident notifications
- Configuration: Bot token with chat:write scope, bot must be invited to channel
- Best practice: Use markdown formatting, channel IDs (starting with C) not names

**Telegram** (n8n-nodes-base.telegram):
- Purpose: Instant messaging alerts to individuals or groups
- Use cases: Personal notifications, bot interactions
- Configuration: Bot token from BotFather
- Best practice: Use chat ID for direct messages

**Twilio** (n8n-nodes-base.twilio):
- Purpose: SMS/WhatsApp critical alerts
- Use cases: High-priority alerts, two-factor authentication, critical incidents
- Configuration: Account SID, Auth Token, verified phone numbers
- Best practice: Keep messages concise, use international format (+1234567890)

**HTTP Request** (n8n-nodes-base.httpRequest):
- Purpose: Custom webhooks (Microsoft Teams, Discord, custom APIs)
- Use cases: Integration with services without dedicated nodes

### Logic & Processing

**IF** (n8n-nodes-base.if):
- Purpose: Simple threshold checks and condition routing
- Use cases: Check if notification criteria met
- Best practice: Include empty notification prevention (items.length > 0)

**Switch** (n8n-nodes-base.switch):
- Purpose: Route notifications based on severity/type
- Use cases: Different channels for different alert levels
- Best practice: Always define Default case for unexpected values

**Set** (n8n-nodes-base.set):
- Purpose: Prepare alert messages and structure data
- Use cases: Format notification content, add metadata
- Best practice: Use to centralize message construction logic
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
