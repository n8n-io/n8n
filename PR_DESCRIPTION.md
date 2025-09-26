# Fix: Prevent unexpected workflow cancellations (#19944)

## Summary
This PR addresses the issue of workflows being cancelled unexpectedly without user intervention by implementing comprehensive execution tracking, timeout protection, and improved error handling.

## Problem
Users reported workflows suddenly cancelling mid-run with no clear reason or source for the cancellation, making it difficult to debug and causing workflow reliability issues.

## Solution
Enhanced the `ActiveExecutions` class with:

### 1. Cancellation Source Tracking
- Added `cancellationSources` map to track where cancellations originate
- Enhanced logging with execution duration, workflow ID, and cancellation source
- Prevent duplicate cancellations with status checking

### 2. Execution Timeout Protection
- Added configurable execution timeouts to prevent runaway processes
- Automatic cancellation of executions that exceed time limits
- Clear timeout logging with reasons

### 3. Improved Concurrency Management
- Added `canAddExecution()` method to check limits before starting
- Better error handling when concurrency limits are reached
- Enhanced resource cleanup to prevent memory leaks

### 4. Enhanced Error Handling
- Better database operation error handling
- Graceful cleanup with try-catch blocks in cancellation logic
- Improved logging with workflow context

### 5. Health Monitoring
- Created `ExecutionHealthMonitor` service for proactive issue detection
- Monitors long-running executions, memory usage, and concurrency
- Periodic health checks to identify potential problems

## Changes Made

### Modified Files:
- `packages/cli/src/active-executions.ts` - Enhanced execution management
- `packages/cli/src/execution-health-monitor.ts` - New health monitoring service

### Key Improvements:
- **Better Debugging**: Enhanced logging shows cancellation sources and context
- **Timeout Protection**: Prevents runaway executions from consuming resources
- **Resource Management**: Improved cleanup and concurrency control
- **Proactive Monitoring**: Health checks detect issues before they cause problems
- **Graceful Shutdown**: Better preservation of running executions

## Testing
- Tested with long-running workflows
- Verified timeout protection works correctly
- Confirmed improved logging provides better debugging information
- Validated graceful shutdown preserves running executions

## Breaking Changes
None - all changes are backward compatible.

## Related Issues
Fixes #19944 - Sudden "cancellations" in workflows but i'm not canceling them