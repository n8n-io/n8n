# Changes: Node Execution Item Count Refactoring

## Overview

Refactored how node execution item counts are stored and rendered during workflow execution. Instead of generating placeholder items in the `nodeExecuteAfter` handler, we now store the raw item count data in `useWorkflowState` and use it in `useCanvasMapping` to render iterations and total number of items.

## Changes Made

### 1. `useWorkflowState.ts` - Added Item Count Storage

- **Added `executionItemCountsByNodeName` ref**: Stores item count by connection type for each node during execution
  - Type: `Record<string, Partial<Record<NodeConnectionType, number[]>>>`

- **Added `setExecutionItemCountsForNode()` method**: Sets the item count for a specific node
  - Parameters: `nodeName`, `itemCountByConnectionType`

- **Added `clearExecutionItemCounts()` method**: Clears all stored item counts

- **Updated `resetState()`**: Now calls `clearExecutionItemCounts()` to clean up state

- **Updated `markExecutionAsStopped()`**: Now calls `clearExecutionItemCounts()` when execution stops

### 2. `nodeExecuteAfter.ts` - Store Item Counts

- **Added storage logic**: Before generating placeholders, we now store the `itemCountByConnectionType` data in `workflowState` using `setExecutionItemCountsForNode()`

- **Preserved existing behavior**: The handler still generates placeholder items as before to maintain compatibility with the rest of the system

### 3. `useCanvasMapping.ts` - Use Stored Item Counts

- **Updated `nodeExecutionRunDataOutputMapById` computation**:
  - Changed to watch both `nodeExecutionRunDataById` and `workflowState.executionItemCountsByNodeName`
  - **Primary path**: If stored item counts exist for a node, use them to generate the output map
  - **Fallback path**: If no stored item counts exist (e.g., for completed executions loaded from history), fall back to calculating from run data as before

- **Benefits**:
  - Displays item counts immediately when a node finishes executing, without waiting for full data
  - More efficient as it doesn't require generating placeholder items just to count them
  - Separates concerns: item counting is separate from data storage

### 4. `nodeExecuteAfter.test.ts` - Updated Tests (5 tests)

- **Added test assertions**: All tests now verify that `setExecutionItemCountsForNode` is called with the correct data

- **Test cases updated**:
  - Verifies item counts are stored for single and multiple connection types
  - Verifies empty object is stored when `itemCountByConnectionType` is empty
  - Verifies invalid connection types are still stored (filtering happens in placeholder generation)

### 5. `useWorkflowState.test.ts` - New Tests (10 new tests, 25 total)

Added comprehensive test coverage for the new item count functionality:

- **`setExecutionItemCountsForNode()` tests**:
  - Store item counts for a node with single/multiple connection types
  - Handle empty object when no item counts provided
  - Overwrite existing item counts for the same node
  - Store item counts for multiple nodes independently

- **`clearExecutionItemCounts()` tests**:
  - Clear all stored item counts
  - Safe to call when no item counts exist

- **Integration tests**:
  - Verify item counts are cleared when `resetState()` is called
  - Verify item counts are cleared when `markExecutionAsStopped()` is called (with and without stopData)

### 6. `useCanvasMapping.test.ts` - New Tests (6 new tests, 86 total)

Added tests for the new dual-path `nodeExecutionRunDataOutputMapById` computation:

- **Primary path (using stored item counts)**:
  - Use stored item counts when available (no run data yet)
  - Handle multiple connection types from stored counts
  - Prefer stored item counts over run data when both exist

- **Fallback path (calculating from run data)**:
  - Fall back to calculating from run data when no stored item counts
  - Handle empty stored item counts object (falls back to run data)

- **Mixed scenarios**:
  - Handle multiple nodes with mixed stored/calculated data (some nodes use stored counts, others calculate from run data)

## Test Coverage Summary

All tests pass successfully:

- **`useWorkflowState.test.ts`**: 25 tests (10 new) - 100% pass rate
- **`nodeExecuteAfter.test.ts`**: 5 tests (5 updated) - 100% pass rate
- **`useCanvasMapping.test.ts`**: 86 tests (6 new) - 100% pass rate
- **Total**: 116 tests - 100% pass rate

## Behavior

### Before
1. `nodeExecuteAfter` event received
2. Generate placeholder items based on `itemCountByConnectionType`
3. Store placeholders in workflow store
4. `useCanvasMapping` counts items from placeholder data
5. Display counts on canvas

### After
1. `nodeExecuteAfter` event received
2. Store `itemCountByConnectionType` in `workflowState`
3. Generate placeholder items (for compatibility)
4. Store placeholders in workflow store
5. `useCanvasMapping` uses stored counts directly (or falls back to counting from data)
6. Display counts on canvas

## Backward Compatibility

- All existing tests pass
- Placeholder generation is still performed to maintain compatibility
- Fallback to calculating from run data ensures old executions still display correctly
- No breaking changes to public APIs

## Future Improvements

Once this pattern is proven, we could potentially:
- Remove placeholder generation entirely if nothing else depends on it
- Use this pattern for other execution metadata
- Improve performance by reducing the size of data stored in the workflow store
