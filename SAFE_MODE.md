# n8n Safe Mode

Safe Mode prevents workflow execution and activation when n8n detects repeated crashes, allowing for system recovery and debugging.

## How it works

- **Automatic activation**: Enters safe mode after 3 consecutive crashes
- **Manual activation**: Set `N8N_SAFE_MODE=true` environment variable
- **Exit on shutdown**: Automatically exits when n8n is gracefully stopped
- **UI indicator**: Shows banner with highest priority when active

## What's disabled in Safe Mode

- Queued executions (`runEnqueuedExecutions()`)
- Scheduled workflows (`activeWorkflowManager.init()`)
- All workflow triggers and polling

## What still works

- n8n API and web interface
- Manual workflow execution
- Configuration and settings
- All other n8n functionality

## Testing

1. **Queue flooding**: Queue webhook requests with low concurrency, then kill instance repeatedly
2. **Scheduled workflows**: Create cron jobs, kill instance during execution
3. **Process killing**: Kill the n8n process repeatedly to simulate crashes

## Files

- Crash journal: `~/.n8n/crash.journal`
- Crash counter: `~/.n8n/crash.counter`
- Implementation: `packages/cli/src/crash-counter.utils.ts`
