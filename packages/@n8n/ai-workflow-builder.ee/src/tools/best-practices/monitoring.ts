import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class MonitoringBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.MONITORING;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Monitoring Workflows

## Workflow Design

Structure monitoring workflows with a Schedule Trigger for periodic checks, HTTP Request or appropriate check nodes for service status, and IF/Switch nodes for conditional alerting. Always enable error handling to prevent workflow crashes when services are down.

CRITICAL: Enable "Continue On Fail" or "Never Error" mode on check nodes - otherwise the workflow stops exactly when you need alerts. This is the most common monitoring mistake.

Example pattern for website monitoring:
- Schedule Trigger (every 5 minutes) → HTTP Request (check status) → IF (status != 200?) → Send alert
- Always test both success and failure paths during development

For monitoring multiple services, store URLs/endpoints in Google Sheets or databases and loop through them rather than duplicating workflows.

## Scheduling & Activation

Always activate the workflow after configuration - forgetting this means no monitoring occurs. Test schedules with manual execution before relying on them in production.

Configure appropriate check intervals based on criticality:
- Critical services: 1-5 minutes
- Important services: 10-15 minutes
- Non-critical: 30-60 minutes

Set correct time zones in Workflow Settings for daily/weekly schedules. Use crontab.guru to verify complex Cron expressions.

## Service Status Checking

Configure HTTP Request nodes with:
- Timeout: Set to a few seconds to prevent hanging
- Include Headers & Status: Access response codes for condition evaluation
- Retry on Fail: 2-3 retries with 1s delay to filter transient failures
- Authentication: Use credential system, never hardcode secrets

For non-HTTP monitoring:
- Databases: Use Query nodes (MySQL, Postgres) for health checks
- Systems: Execute Command node for ping or custom scripts
- APIs: Check specific endpoints, not just base URLs

## Alert Configuration

Implement multi-channel alerting for critical services to ensure visibility. Configure notifications with useful context.

Message content should include:
- Service name/URL
- Failure time: {{$now}}
- Error details: {{$json["statusCode"]}}
- Example: "⚠️ Website XYZ DOWN (status 500) at {{new Date().toISOString()}}"

Avoid alert storms by:
- Tracking state changes (only alert when status changes)
- Throttling repeated alerts (e.g., re-alert after 30 minutes)
- Storing last known status in Google Sheets or database

## Error Handling & Failsafes

Implement multiple layers of error handling:

1. Node-level: Enable "Continue On Fail" on check nodes
2. Workflow-level: Create Error Trigger workflow to catch monitoring failures
3. Heartbeat: Ping external service (healthchecks.io) to verify monitoring is running

Configure Error Workflow in settings to alert when monitoring itself fails - otherwise you have blind spots.

## Logging & State Management

Log check results for trend analysis and uptime calculation. Store in Google Sheets (append row) or database with:
- Timestamp
- Service identifier
- Status (up/down)
- Response time
- Error details if applicable

Maintain current status dashboard by updating a status table/sheet that shows at-a-glance health of all monitored services.

## Recommended Nodes

### Schedule Trigger (n8n-nodes-base.scheduleTrigger)

Purpose: Periodic workflow execution at fixed intervals or Cron schedules

Configuration:
- Set appropriate intervals based on service criticality
- Always activate the workflow after configuration

### HTTP Request (n8n-nodes-base.httpRequest)

Purpose: Check website/API availability and response codes

Critical settings:
- Enable "Continue On Fail" to handle errors gracefully
- Set timeout to prevent hanging (2-5 seconds typical)
- Configure retries for transient failure filtering

### IF (n8n-nodes-base.if)

Purpose: Evaluate service health and route to appropriate action

Common conditions:
- {{$json["statusCode"]}} equals 200 (service up)
- {{$json["statusCode"]}} not equals 200 (service down)

### Send Email (n8n-nodes-base.emailSend)

Purpose: Email alerts for service issues

Configure with SMTP credentials and clear subject lines for quick issue identification.

### Messaging Integration Nodes

- Slack (n8n-nodes-base.slack)
- Microsoft Teams (n8n-nodes-base.microsoftTeams)
- Telegram (n8n-nodes-base.telegram)
- Discord (n8n-nodes-base.discord)

Purpose: Real-time alerts to team communication channels

### Twilio (n8n-nodes-base.twilio)

Purpose: SMS/phone alerts for critical system failures requiring immediate attention

### Database & Storage Nodes

- Google Sheets (n8n-nodes-base.googleSheets)
- MySQL (n8n-nodes-base.mySql)
- PostgreSQL (n8n-nodes-base.postgres)

Purpose: Store monitoring configuration, log results, track state changes

### Execute Workflow (n8n-nodes-base.executeWorkflow)

Purpose: Modular monitoring design with sub-workflows for different service types

## Common Pitfalls to Avoid

### Forgetting to Activate Workflow

The #1 monitoring failure - creating the perfect monitoring workflow but forgetting to activate it. Always verify the workflow is active (toggle in top-right of editor).

### No Error Handling on Check Nodes

Without "Continue On Fail", the workflow crashes when services are down - exactly when you need alerts. This makes monitoring useless at the critical moment.

### Alert Storms

Sending alerts every check interval creates fatigue. Implement state tracking to alert only on status changes, not every failed check.

### Incorrect Schedule Configuration

Cron expression mistakes can cause workflows to run at wrong times or not at all. A Cron like "* * * * *" runs every minute (not every hour!). Always test schedules.

### Hardcoded Credentials

Never hardcode API keys, passwords, or sensitive URLs directly in nodes. Use n8n's credential manager for security and maintainability.

### Missing Recovery Notifications

Not sending "service recovered" messages leaves teams uncertain about incident resolution. Track state changes bidirectionally.

### Resource Exhaustion

Monitoring too many services in one workflow or setting intervals too frequent can overload n8n. Split large monitoring lists across multiple workflows.

### No Monitoring of Monitoring

If the monitoring workflow fails, you're blind to service issues. Implement Error Trigger workflows and external heartbeat monitoring for the monitoring system itself.`;

	getDocumentation(): string {
		return this.documentation;
	}
}
