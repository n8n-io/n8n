import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class SchedulingBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.SCHEDULING;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Scheduling Workflows

## Workflow Design

Structure scheduled workflows to perform focused, well-defined tasks. Use modular sub-workflows via Execute Workflow node for complex operations (database cleanup, report generation) to isolate failures and improve maintainability.

For recurring tasks, use Schedule Trigger node with clear naming (e.g., "Daily 08:00 Trigger", "Every 6h Cron"). Document schedule purpose in workflow description.

Prevent overlapping executions by ensuring worst-case execution time < schedule interval. For frequent schedules, implement mutex/lock mechanisms using external systems if needed.

CRITICAL: Always save and activate workflows with Schedule Trigger nodes - scheduled workflows only run in active mode. Manual execution works during development but activation is required for automatic runs.

## Scheduling Patterns

### Recurring Schedules

Use Schedule Trigger in two modes:
- **Interval Mode**: User-friendly dropdowns for common schedules (every X minutes, daily at 09:00, weekly on Mondays)
- **Cron Expression Mode**: Complex patterns using 5-field syntax (m h dom mon dow) with optional seconds field. Example: \`0 9 * * 1\` triggers every Monday at 09:00

Multiple schedules can be combined in single Schedule Trigger node using multiple Trigger Rules. Useful when same logic applies to different timings.

### One-Time Events

For one-time future runs, use cron expression with exact date/time (e.g., \`0 12 22 10 *\` for Oct 22 at 12:00).
IMPORTANT: Deactivate workflow after execution to prevent yearly recurrence.

For event-relative scheduling, use Wait node to pause workflow until specified time/date. Workflow state persists across n8n restarts.

### Conditional Scheduling

Use IF/Switch nodes after Schedule Trigger for runtime conditions:
- Check if today is last day of month before running monthly reports
- Skip execution on holidays or based on external data
- Route different tasks based on conditions

Better than complex cron expressions and provides flexibility for dynamic requirements.

## Time Zone Configuration

CRITICAL: Explicitly set timezone to avoid scheduling confusion.

By default n8n will:
- Attempts to detect local timezone at signup, defaults to GMT if unsure
- Set instance timezone via Admin Panel
- Override per-workflow as needed

Schedule Trigger uses workflow timezone if set, otherwise instance timezone. Cron schedules automatically adjust for DST when using region timezones (Europe/London, America/New_York).

WARNING: Wait node uses server system time, ignoring workflow timezone settings. Account for this when using Wait with specific clock times.

## Error Handling & Monitoring

Build robust error handling for unattended execution:
- Use Error Trigger for global error workflow
- Implement retry logic with Wait node for transient failures
- Add email/Slack notifications for failures
- Log timestamps with Console node to detect timing issues

Monitor Executions list regularly for:
- Expected trigger times
- Duplicates or gaps
- Failed executions
- Long-running workflows

## Recommended Nodes

### Schedule Trigger (n8n-nodes-base.scheduleTrigger)

Purpose: Primary node for running workflows on schedule

Modes:
- Interval: Simple recurring schedules via UI
- Cron: Complex patterns via expressions

Best Practices:
- Activate workflow for schedule to work
- Use descriptive names including schedule
- Test with manual execution during development
- Consider DST impacts for region timezones

### Wait (n8n-nodes-base.wait)

Purpose: Pause workflow execution until specified time

Use Cases:
- Delay actions relative to events
- One-off timers per data item
- Follow-up actions after specific duration

Best Practices:
- Use external database (PostgreSQL) for long waits
- Avoid extremely long wait times
- Remember Wait uses server time, not workflow timezone
- State persists across n8n restarts

### IF (n8n-nodes-base.if)

Purpose: Add conditional logic to scheduled workflows

Use Cases:
- Check date conditions (last day of month)
- Skip execution based on external data
- Route to different actions conditionally

Best Practices:
- Enable "Convert types where required" for comparisons
- Document condition logic clearly
- Prefer IF nodes over complex cron expressions

### Switch (n8n-nodes-base.switch)

Purpose: Multiple conditional branches for complex routing

Use Cases:
- Different actions based on day of week
- Time-based routing within workflow
- Multi-path conditional execution

### Error Trigger (n8n-nodes-base.errorTrigger)

Purpose: Global error handling for failed scheduled executions

Use Cases:
- Send notifications on workflow failure
- Log errors to external systems
- Implement global retry logic

Best Practices:
- Create dedicated error workflow
- Include workflow name and timestamp in notifications
- Consider severity levels for different failures

### Execute Workflow (n8n-nodes-base.executeWorkflow)

Purpose: Call sub-workflows for modular scheduling

Use Cases:
- Break complex scheduled tasks into modules
- Reuse common scheduled operations
- Isolate failures to specific components

Best Practices:
- Pass parameters for configuration
- Handle sub-workflow errors appropriately
- Use for maintainable, focused workflows

### Database Nodes

Purpose: Check pending tasks or store execution history

- MySQL (n8n-nodes-base.mySql)
- Postgres (n8n-nodes-base.postgres)
- MongoDB (n8n-nodes-base.mongoDb)

Use Cases:
- Store list of pending one-time tasks
- Log execution history
- Implement custom scheduling queue

Best Practices:
- Query efficiently with proper indexes
- Clean up old execution logs periodically
- Use for dynamic scheduling requirements

### HTTP Request (n8n-nodes-base.httpRequest)

Purpose: Call external APIs or monitoring services

Use Cases:
- Send heartbeat to monitoring service
- Check external conditions before execution
- Trigger external scheduled jobs

### Email/Slack

- Email (n8n-nodes-base.emailSend)
- Slack (n8n-nodes-base.slack)

Purpose: Send notifications for scheduled workflow events

Use Cases:
- Daily report delivery
- Failure notifications
- Completion confirmations

## Common Pitfalls to Avoid

### Time Zone Mismatch

**Problem**: Workflows run at wrong time due to incorrect timezone configuration. Schedule set for 08:00 runs at 07:00 or 09:00.

**Solution**:
- Explicitly set workflow or instance timezone
- Verify timezone after DST changes
- Use UTC for consistency if timezone complexity is problematic
- Remember self-hosted defaults to America/New_York

### Daylight Saving Time Issues

**Problem**: Missed or duplicate executions during DST transitions. Jobs may not run or run twice when clocks change.

**Solution**:
- Use region timezones for automatic DST handling
- Test critical schedules around DST dates
- Consider fixed-offset timezone for year-round consistency
- Update n8n version for latest timezone database

### Duplicate Trigger Executions

**Problem**: Workflows triggering multiple times at scheduled time, especially in multi-instance setups.

**Solution**:
- Upgrade to n8n ≥1.107.0 (fixes duplicate cron registrations)
- Configure N8N_MULTI_MAIN_PROCESS=true for multi-instance setups
- Disable and re-enable workflow if duplicates persist
- Restart n8n process if issues occur after editing

### Missed Schedules During Downtime

**Problem**: Scheduled runs missed when n8n instance is down. No automatic catch-up for missed triggers.

**Solution**:
- Ensure high availability for critical schedules
- Design idempotent workflows that check for missed work
- Use daily check pattern instead of exact timing when possible
- Implement external monitoring for uptime

### Overlapping Executions

**Problem**: Next scheduled run starts before previous completes, causing race conditions or resource conflicts.

**Solution**:
- Increase interval to exceed worst-case execution time
- Implement mutex/lock using database or external system
- Add execution check at workflow start
- Configure single worker for workflow in queue mode

### Wait Node Timezone Confusion

**Problem**: Wait node uses server system time, ignoring workflow timezone setting. Wait until "10:00" may not match expected timezone.

**Solution**:
- Account for server timezone when setting Wait times
- Use UTC timestamps for clarity
- Run server in target timezone if possible
- Prefer Schedule Trigger for timezone-aware scheduling

### First Execution Timing

**Problem**: First execution after activation doesn't match expected schedule. Activation time affects next run calculation.

**Solution**:
- Plan activation timing carefully
- Use manual execution for immediate first run
- Understand that schedule recalculates from activation moment
- Document expected first run time

### Cron Syntax Errors

**Problem**: Invalid cron expression prevents trigger activation. Missing fields or incorrect format causes silent failures.

**Solution**:
- Use crontab.guru to validate expressions
- Remember n8n supports 5 or 6 field syntax
- n8n supports both 5-field and 6-field (with seconds) cron syntax; use 6 fields if you want to specify seconds (e.g., prefix with 0 for seconds: \`0 0 * * * *\`)
- Use interval mode for simple schedules
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
