import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class NotificationBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.NOTIFICATION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Notification Workflows

## Workflow Design

Structure notification workflows in a clear sequence: Trigger → Data Retrieval/Processing → Condition Check → Notification Action → Post-Notification (logging/tracking). Keep each part modular with nodes dedicated to specific purposes.

Choose between event-based triggers (webhooks, form submissions, CRM events) for immediate notifications or scheduled triggers (Cron) for periodic condition monitoring. Test Cron triggers in manual mode first to avoid unintended executions.

CRITICAL: Multi-channel notifications should branch from a single condition check to multiple notification nodes in parallel, not duplicate the entire workflow. This enables easy extension and maintenance.

Example pattern:
- Webhook/Schedule Trigger → Fetch Data → IF (threshold exceeded) → [Email + Slack + SMS nodes in parallel]
- Result: Single workflow handles all channels efficiently with consistent logic

## Condition Logic & Filtering

Use IF nodes for simple threshold checks without code. For complex conditions (multiple fields, array filtering), use Function nodes to script the logic and filter items that need alerts.

Always include empty notification prevention - check that alert-worthy items exist (items.length > 0) before proceeding to notification nodes. Route the false branch to end the workflow or log "no alert needed".

Store threshold values in environment variables or external sources (Google Sheets, database) rather than hardcoding. This enables adjustment without workflow modification.

## Message Construction

Use expressions to inject dynamic data into messages. The expression \`{{ $json.fieldName }}\` pulls data from input items. For email subjects and bodies, include key details like metric names, values, and timestamps.

Format messages appropriately for each channel:
- Email: Support HTML or plain text, use clear subject lines
- Slack: Use markdown-like formatting, \\n for newlines
- SMS: Keep concise due to character limits, plain text only

## Authentication & Permissions

Configure proper credentials for each service:
- Email: SMTP settings with correct host/port/auth (use App Passwords for Gmail)
- Slack: Bot token with chat:write scope, bot must be invited to target channel
- SMS (Twilio): Account SID, Auth Token, verified phone numbers

Store sensitive information in n8n credentials system or environment variables, never hardcode in workflows.

## Alert Management

Implement cooldown mechanisms to prevent notification floods. Record last alert time and check before sending duplicates. Consider alert aggregation - send one message listing multiple items rather than individual alerts.

Add logging nodes to track sent notifications for audit trails and duplicate prevention. Consider using error handling paths with Continue on Fail settings for redundancy.

## Recommended Nodes

### Trigger Nodes

**Webhook** (n8n-nodes-base.webhook):
- Purpose: Event-based notifications triggered by external systems
- Use cases: Form submissions, CRM events, API webhooks
- Best practice: Validate incoming data before processing

**Schedule Trigger** (n8n-nodes-base.scheduleTrigger):
- Purpose: Periodic monitoring and batch notifications
- Use cases: Daily reports, threshold monitoring, scheduled alerts
- Best practice: Test in manual mode first to avoid unintended executions

**Email Trigger IMAP** (n8n-nodes-base.emailReadImap):
- Purpose: Email-triggered alerts and auto-responses
- Use cases: Support ticket creation, email monitoring
- Best practice: Use filters to avoid processing every email

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
- Best practice: Test webhook URLs before production

### Logic & Processing

**IF** (n8n-nodes-base.if):
- Purpose: Simple threshold checks and condition routing
- Use cases: Check if metric exceeds threshold, validate data
- Best practice: Include empty notification prevention (items.length > 0)

**Switch** (n8n-nodes-base.switch):
- Purpose: Route notifications based on severity/type
- Use cases: Different channels for different alert levels
- Best practice: Always define Default case for unexpected values

**Function** (n8n-nodes-base.function):
- Purpose: Complex filtering and data transformation
- Use cases: Array filtering, complex conditions, message formatting
- Best practice: Keep logic focused and well-documented

**Merge** (n8n-nodes-base.merge):
- Purpose: Combine parallel notification branches
- Use cases: Track all notification attempts, consolidate logs
- Best practice: Use after parallel notification nodes

### Data Sources

**Database Nodes**:
- Postgres (n8n-nodes-base.postgres)
- MySQL (n8n-nodes-base.mySql)
- MongoDB (n8n-nodes-base.mongoDb)

Purpose: Fetch metrics, thresholds, and historical data
Best practice: Use queries with proper indexing for performance

**Google Sheets** (n8n-nodes-base.googleSheets):
- Purpose: Configuration storage and logging
- Use cases: Store thresholds, log notifications, track cooldowns
- Best practice: Use for non-critical configurations that need easy updates

**HTTP Request** (n8n-nodes-base.httpRequest):
- Purpose: API data retrieval
- Use cases: Fetch metrics from monitoring APIs, get user preferences
- Best practice: Handle API errors gracefully

### Utility Nodes

**Set** (n8n-nodes-base.set):
- Purpose: Prepare alert messages and structure data
- Use cases: Format notification content, add metadata
- Best practice: Use to centralize message construction logic

**Wait** (n8n-nodes-base.wait):
- Purpose: Delays between notifications
- Use cases: Rate limiting, cooldown periods, retry logic
- Best practice: Use for preventing notification floods

**Split In Batches** (n8n-nodes-base.splitInBatches):
- Purpose: Handle large datasets without overwhelming recipients
- Use cases: Bulk notifications with rate limiting
- Best practice: Combine with Wait node for controlled sending

## Common Pitfalls to Avoid

### Authentication Failures
**Problem**: Invalid or expired credentials are the most common cause of failed notifications.

**Solution**:
- Regularly verify API keys, OAuth tokens, and SMTP passwords
- Ensure bots have proper permissions (Slack bots need channel membership)
- Use n8n credentials system, never hardcode sensitive data
- Test authentication in isolation before deploying

### Notification Floods
**Problem**: Without proper controls, a threshold breach can trigger hundreds of identical alerts.

**Solution**:
- Implement cooldown periods using Wait node or tracking last alert time
- Use alert aggregation - send one message listing multiple items
- Use deduplication logic to prevent identical alerts
- Consider exponential backoff for repeated alerts
- Store last notification timestamp in database/sheets

### Incorrect Channel Configuration
**Problem**: Notifications fail due to misconfigured channels.

**Solution**:
- Slack requires channel IDs (starting with C) not names
- Email requires verified sender addresses
- SMS needs international format (+1234567890)
- Test each channel with sample data before production
- Validate configuration in node settings

### Data Type Mismatches
**Problem**: String-to-number comparisons fail silently ("5" > "10" is lexicographically true).

**Solution**:
- Always convert data types before comparisons
- Use Number() or parseInt() for numeric comparisons
- Escape special characters in messages to prevent formatting breaks
- Validate data types early in the workflow

### Missing Error Handling
**Problem**: A single failed notification can stop the entire workflow.

**Solution**:
- Configure error workflows using Error Trigger node
- Use "Continue on Fail" setting for redundancy
- Implement fallback channels (if Slack fails, send email)
- Log failed notification attempts for debugging
- Add retry logic with exponential backoff

### Rate Limit Violations
**Problem**: External services have posting limits that can block notifications.

**Solution**:
- Add delays between bulk sends using Wait node
- Monitor API quotas and adjust trigger frequency
- Use BCC for bulk emails when appropriate
- Implement batch processing with Split In Batches
- Check service documentation for rate limits
- Use webhook aggregation where possible
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
