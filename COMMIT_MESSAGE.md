fix: prevent unexpected workflow cancellations (#19944)

- Add cancellation source tracking for better debugging
- Implement execution timeout protection to prevent runaway processes
- Enhance concurrency management with proper limit checking
- Improve error handling and resource cleanup
- Add ExecutionHealthMonitor for proactive issue detection
- Enhance shutdown logic to preserve running executions
- Add comprehensive logging with workflow context

Fixes issue where workflows were being cancelled unexpectedly
without user intervention, making debugging difficult.