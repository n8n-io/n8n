import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class SchedulingBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.SCHEDULING;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Scheduling Workflows

## Workflow Design

Structure scheduled workflows to perform focused, well-defined tasks.

For recurring tasks, use Schedule Trigger node with clear naming (e.g., "Daily 08:00 Trigger", "Every 6h Cron").

Prevent overlapping executions by ensuring worst-case execution time < schedule interval. For frequent schedules, implement mutex/lock mechanisms using external systems if needed.

CRITICAL: Always save and activate workflows with Schedule Trigger nodes - scheduled workflows only run in active mode. Manual execution works during development but activation is required for automatic runs.

## Scheduling Patterns

### Recurring Schedules

Use Schedule Trigger in two modes:
- **Interval Mode**: User-friendly dropdowns for common schedules (every X minutes, daily at 09:00, weekly on Mondays)
- **Cron Expression Mode**: Complex patterns using 5-field syntax (m h dom mon dow) with optional seconds field. Example: \`0 9 * * 1\` triggers every Monday at 09:00

Multiple schedules can be combined in single Schedule Trigger node using multiple Trigger Rules. Useful when same logic applies to different timings.

### One-Time Events

For event-relative scheduling, use Wait node to pause workflow until specified time/date.

Note: Cron expressions with specific dates (e.g., \`0 12 22 10 *\` for Oct 22 at 12:00) will repeat annually on that date.

### Conditional Scheduling

PREFER conditional logic over complex cron expressions. Use IF/Switch nodes after Schedule Trigger for runtime conditions:
- Check if today is last day of month before running monthly reports
- Skip execution on holidays by checking against a holiday list in a data table
- Route to "weekday" vs "weekend" processing based on current day

This approach is more readable and maintainable than complex cron patterns.

## Time Zone Handling

When building scheduled workflows:
- If user specifies a timezone, set it in the Schedule Trigger node's timezone parameter
- If user mentions times without timezone, use the schedule as specified (instance default will apply)
- For Wait nodes, be aware they use server system time, not workflow timezone

## Recommended Nodes

### Schedule Trigger (n8n-nodes-base.scheduleTrigger)

Primary node for running workflows on schedule. Supports interval mode for simple schedules and cron mode for complex patterns.

### Wait (n8n-nodes-base.wait)

Pause workflow execution until specified time or duration.

Use Cases:
- Delay actions relative to events
- One-off timers per data item
- Follow-up actions after specific duration

Best Practices:
- Use n8n Data Tables for waits longer than 24 hours (store scheduled time, check periodically)
- Avoid wait times longer than 7 days - use a polling pattern instead

### IF (n8n-nodes-base.if)

Add conditional logic to scheduled workflows.

Use Cases:
- Check date conditions (last day of month using expression: \`{{ $now.day === $now.endOf('month').day }}\`)
- Skip execution based on external data (e.g., holiday check)
- Route to different actions conditionally

Best Practices:
- Enable "Convert types where required" for comparisons
- Prefer IF nodes over complex cron expressions for readability

### Switch (n8n-nodes-base.switch)

Multiple conditional branches for complex routing.

Use Cases:
- Different actions based on day of week (e.g., \`{{ $now.weekday }}\` returns 1-7)
- Time-based routing (morning vs afternoon processing)
- Multi-path conditional execution

### n8n Data Tables (n8n-nodes-base.n8nTables)

Purpose: Store scheduling state and pending tasks

Use Cases:
- Track last execution time for catch-up logic
- Store list of pending one-time tasks with scheduled times
- Implement custom scheduling queue with polling

Best Practices:
- Query efficiently with proper filters
- Clean up completed tasks periodically

## Common Pitfalls to Avoid

### Missed Schedules During Downtime

**Problem**: Scheduled runs missed when n8n instance is down. No automatic catch-up for missed triggers.

**Solution**: Design idempotent workflows with catch-up logic:
- Store last successful run timestamp in n8n Data Tables
- On each run, check if enough time has passed since last run
- Example: For a task that should run once per 24 hours, schedule it every 4 hours but only execute if last run was >20 hours ago

### Overlapping Executions

**Problem**: Next scheduled run starts before previous completes, causing race conditions or resource conflicts.

**Solution**:
- Increase interval to exceed worst-case execution time
- Implement mutex/lock using n8n Data Tables (check/set "running" flag at start, clear at end)
- Add execution check at workflow start

### Wait Node Timezone Confusion

**Problem**: Wait node uses server system time, ignoring workflow timezone setting. Wait until "10:00" may not match expected timezone.

**Solution**:
- Account for server timezone when setting Wait times
- Use relative durations (e.g., "wait 2 hours") instead of absolute times when possible
- Prefer Schedule Trigger for timezone-aware scheduling

### First Execution Timing

**Problem**: First execution after activation doesn't match expected schedule. Activation time affects next run calculation.

**Solution**:
- Use manual execution for immediate first run if needed
- Understand that schedule recalculates from activation moment

### Cron Syntax

n8n supports both 5-field and 6-field (with seconds) cron syntax. Use 6 fields if you want to specify seconds (e.g., prefix with 0 for seconds: \`0 0 9 * * *\` for 9 AM daily).

For simple schedules, prefer Interval mode over cron for better readability.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
