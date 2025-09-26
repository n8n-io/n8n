# Fix: Prevent unexpected workflow cancellations (#19944)

## Summary
This PR addresses the issue of workflows being cancelled unexpectedly without user intervention by implementing enhanced execution tracking and improved error handling.

## Problem
Users reported workflows suddenly cancelling mid-run with no clear reason or source for the cancellation, making it difficult to debug and causing workflow reliability issues.

## Solution
Enhanced the `stopExecution` method in `ActiveExecutions` class with:

### Key Changes:
1. **Cancellation Source Tracking** - Added `source` parameter to track where cancellations originate
2. **Duplicate Prevention** - Check execution status to prevent duplicate cancellations  
3. **Enhanced Logging** - Log execution duration, workflow ID, and cancellation context
4. **Better Error Handling** - Wrap cleanup in try-catch to prevent cascading failures
5. **Null Safety** - Add optional chaining for `workflowData` access

## Changes Made
- Modified `packages/cli/src/active-executions.ts`
- Enhanced `stopExecution()` method with better tracking and error handling
- Improved `has()` method performance using `in` operator
- Fixed typo in shutdown method comment
- Added null safety checks

## Testing
- Verified enhanced logging provides better debugging information
- Confirmed duplicate cancellation prevention works correctly
- Tested error handling during cleanup operations

## Breaking Changes
None - all changes are backward compatible. The `stopExecution` method signature is extended but maintains backward compatibility.

## Related Issues
Fixes #19944 - Sudden "cancellations" in workflows but i'm not canceling them