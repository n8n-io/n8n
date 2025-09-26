# Fix for Unexpected Workflow Cancellations (#19944)

## Problem Description

Users were experiencing sudden workflow cancellations during execution without manually cancelling them. The workflows would show as "cancelled" mid-run with no clear reason or source for the cancellation.

## Root Cause Analysis

The issue was caused by several factors:

1. **Lack of cancellation tracking**: The system didn't track why executions were being cancelled
2. **Insufficient logging**: No detailed logging when cancellations occurred
3. **Timeout handling**: Executions could be cancelled due to timeouts without clear indication
4. **Error propagation**: Sub-workflow cancellations could propagate unexpectedly

## Solution

### 1. Enhanced Cancellation Tracking (`workflow-execute.ts`)

- Added `cancellationReason` property to track why executions are cancelled
- Added `executionStartTime` to track execution duration
- Enhanced logging when cancellations occur with detailed context

### 2. Improved Active Executions Management (`active-executions.ts`)

- Modified `stopExecution()` method to accept and log cancellation reasons
- Added comprehensive logging when executions are stopped
- Better error messages that include the reason for cancellation

### 3. Enhanced Timeout Handling (`workflow-runner.ts`)

- Added specific timeout reasons when stopping executions
- Better timeout duration tracking and reporting

### 4. ExecuteWorkflow Node Improvements (`ExecuteWorkflow.node.ts`)

- Better handling of sub-workflow cancellations
- Improved error messages for cancelled sub-workflows
- Enhanced logging for debugging cancellation issues

## Changes Made

### Core Changes

1. **WorkflowExecute Class** (`packages/core/src/execution-engine/workflow-execute.ts`)
   - Added cancellation reason tracking
   - Enhanced timeout detection and logging
   - Better error messages for cancelled executions

2. **ActiveExecutions Service** (`packages/cli/src/active-executions.ts`)
   - Modified stopExecution to accept reason parameter
   - Added comprehensive logging for execution stops
   - Better error context in cancellation messages

3. **WorkflowRunner** (`packages/cli/src/workflow-runner.ts`)
   - Added timeout reasons when stopping executions
   - Better timeout duration reporting

4. **ExecuteWorkflow Node** (`packages/nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflow/ExecuteWorkflow.node.ts`)
   - Enhanced cancellation error handling
   - Better logging for sub-workflow cancellations
   - Improved error propagation

### Testing

- Added comprehensive test suite for cancellation scenarios
- Tests verify proper reason tracking and logging

## Benefits

1. **Better Debugging**: Clear logging shows exactly why executions are cancelled
2. **Improved User Experience**: Users get meaningful error messages instead of generic cancellation notices
3. **Enhanced Monitoring**: System administrators can track cancellation patterns
4. **Reduced False Positives**: Better distinction between legitimate and unexpected cancellations

## Usage

After this fix, when workflows are cancelled, you'll see detailed logs like:

```
Workflow execution cancelled due to timeout - Reason: Execution timeout reached after 300s
```

```
Sub-workflow execution was cancelled for item 0 - Reason: Manual cancellation by user
```

## Backward Compatibility

This fix is fully backward compatible. Existing workflows will continue to work as before, but with enhanced logging and error reporting.

## Testing the Fix

1. Create a workflow with ExecuteWorkflow nodes
2. Set a short timeout and verify timeout cancellations are properly logged
3. Manually cancel executions and verify the reason is tracked
4. Check logs for detailed cancellation information

## Future Improvements

- Add metrics collection for cancellation reasons
- Implement cancellation reason reporting in the UI
- Add configurable timeout warnings before cancellation