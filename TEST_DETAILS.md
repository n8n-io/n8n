# PAY-3162 Unit Test - Detailed Implementation Guide

## Quick Summary
Successfully created and verified 4 comprehensive unit tests for the PAY-3162 race condition fix in WorkflowExecutionsCard.vue component. All 11 tests pass (7 existing + 4 new).

---

## 1. What is PAY-3162?

### The Bug
When a workflow execution completes but there's a timing race condition:
- Backend has set `stoppedAt` timestamp (execution stopped)
- Frontend still shows status as 'running'
- Result: The "for" time indicator text concatenates incorrectly, showing "sin" (from substring operations)

### The Fix
Added an additional check to the v-if condition on line 116 of WorkflowExecutionsCard.vue:

**Before:**
```vue
v-if="executionUIDetails.name === 'running'"
```

**After:**
```vue
v-if="executionUIDetails.name === 'running' && !execution.stoppedAt"
```

Now the "for" time indicator only shows when:
1. Status is 'running' AND
2. There is NO stoppedAt timestamp (execution hasn't physically stopped yet)

---

## 2. Test File Location

```
/Users/csaba/Downloads/n8n-worktrees/pay-3162/
  packages/frontend/editor-ui/
    src/features/execution/executions/components/workflow/
      WorkflowExecutionsCard.test.ts        <- Tests here
      WorkflowExecutionsCard.vue            <- Component being tested
```

---

## 3. Test Implementation Details

### Test Framework: vitest

n8n uses **vitest** for Vue 3 component testing (not Jest for frontend).

Key imports in the test file:
```typescript
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowExecutionsCard from './WorkflowExecutionsCard.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { ExecutionSummary } from 'n8n-workflow';
```

### Test Structure

```typescript
describe('Running execution time display (PAY-3162)', () => {
  // 4 test cases grouped in this describe block
  // Lines 203-302 of WorkflowExecutionsCard.test.ts
});
```

---

## 4. Individual Test Cases

### Test 1: Happy Path - Running Execution Without stoppedAt

**File Location:** Lines 204-228

```typescript
test('displays "for" time when execution is running without stoppedAt', () => {
```

**Purpose:** Verify that normal running executions still show the "for" time indicator

**Test Setup:**
```
status: 'running'
startedAt: 12:05:00 (5 minutes after creation)
stoppedAt: undefined (not stopped yet)
Current time: 12:30:00 (25 minutes after start)
```

**Verification:**
```typescript
const executionTimeInStatus = queryByTestId('execution-time-in-status');
expect(executionTimeInStatus).toBeVisible();
expect(executionTimeInStatus?.textContent).toContain('for');
```

**What It Tests:**
- Normal executions that are truly running should display the "for" time indicator
- No regression in happy path behavior

---

### Test 2: CRITICAL - Race Condition with stoppedAt

**File Location:** Lines 230-254

```typescript
test('hides "for" time when execution has stoppedAt (even if status is running)', () => {
```

**Purpose:** This is the critical test for the PAY-3162 fix

**Test Setup:**
```
status: 'running' (not yet updated by backend)
startedAt: 12:05:00
stoppedAt: 12:10:00 (execution has been stopped)
Current time: 12:30:00
```

**Verification:**
```typescript
const executionTimeInStatus = queryByTestId('execution-time-in-status');
expect(executionTimeInStatus).toBeNull(); // Element should NOT exist
```

**Why This Matters:**
- This test specifically validates the race condition scenario
- It proves that when an execution is physically stopped (has stoppedAt),
  the UI won't try to render the running time indicator
- Without the `&& !execution.stoppedAt` fix, this test would FAIL

---

### Test 3: Completed Execution - Status is 'success'

**File Location:** Lines 256-276

```typescript
test('hides "for" time when execution status is not running', () => {
```

**Purpose:** Verify completed executions never show running time

**Test Setup:**
```
status: 'success' (not 'running')
stoppedAt: 12:10:00
```

**Verification:**
```typescript
const executionTimeInStatus = queryByTestId('execution-time-in-status');
expect(executionTimeInStatus).toBeNull();
```

**What It Tests:**
- Completed executions (success, error, etc.) never show "for" time
- The status check (`=== 'running'`) is working correctly

---

### Test 4: Edge Case - No startedAt but Running Status

**File Location:** Lines 278-301

```typescript
test('shows running time for execution without startedAt but with running status', () => {
```

**Purpose:** Test fallback behavior when startedAt is missing

**Test Setup:**
```
status: 'running'
createdAt: 12:00:00
startedAt: undefined (not set)
stoppedAt: undefined (not stopped)
Current time: 12:05:00
```

**Component Fallback Logic:**
```vue
<ExecutionsTime :start-time="execution.startedAt ?? execution.createdAt" />
```
Uses createdAt when startedAt is missing.

**Verification:**
```typescript
const executionTimeInStatus = queryByTestId('execution-time-in-status');
expect(executionTimeInStatus).toBeVisible();
expect(executionTimeInStatus?.textContent).toContain('for');
```

**What It Tests:**
- Fallback to createdAt still works correctly
- Component uses the coalescing operator correctly

---

## 5. Testing Techniques Used

### Technique 1: Fake Timers for Date Calculations

```typescript
vitest.useFakeTimers({ now: new Date('2024-09-27T12:30:00Z') });

// Later in afterEach:
vitest.useRealTimers();
```

**Why:** ExecutionsTime component calculates elapsed time. Fake timers make tests deterministic.

### Technique 2: Component Props Testing

Each test creates a realistic ExecutionSummary object:

```typescript
const props: ComponentProps<typeof WorkflowExecutionsCard> = {
  execution: {
    id: '1',
    mode: 'manual',
    status: 'running',
    createdAt: createdAt.toISOString(),
    startedAt: startedAt.toISOString(),
    stoppedAt: undefined, // Explicitly set for clarity
  } as unknown as ExecutionSummary,
  workflowPermissions: { execute: true },
};
```

### Technique 3: Query By Test ID

```typescript
const executionTimeInStatus = queryByTestId('execution-time-in-status');
```

The component renders:
```vue
<N8nText data-test-id="execution-time-in-status">
```

We query this specific element to verify it renders or doesn't render.

### Technique 4: Assertions

**Positive Assertions (element should exist):**
```typescript
expect(executionTimeInStatus).toBeVisible();
expect(executionTimeInStatus?.textContent).toContain('for');
```

**Negative Assertions (element should NOT exist):**
```typescript
expect(executionTimeInStatus).toBeNull();
```

---

## 6. Test Mocking Strategy

### Vue Router Mock
```typescript
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {},
  }),
  RouterLink: vi.fn(),
}));
```

The component uses `useRoute()` to get route params. This mock provides default empty params.

### Pinia Stores Mock
```typescript
const initialState = {
  [STORES.SETTINGS]: {
    settings: {
      templates: { enabled: true, host: 'https://api.n8n.io/api/' },
      license: { environment: 'development' },
      deployment: { type: 'default' },
      enterprise: {},
    },
  },
};

setActivePinia(createTestingPinia({ initialState }));
```

Component depends on SettingsStore. Testing Pinia provides a mock store.

### Component Renderer Setup
```typescript
const renderComponent = createComponentRenderer(WorkflowExecutionsCard, {
  global: {
    stubs: {
      RouterLink: { template: '<div><slot /></div>' },
    },
  },
});
```

Custom renderer from n8n test utilities. RouterLink is stubbed to a simple div.

---

## 7. Running the Tests

### Command
```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui
pnpm test WorkflowExecutionsCard
```

### Expected Output
```
RUN  v3.1.3 /Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui

✓ src/features/execution/executions/components/workflow/WorkflowExecutionsCard.test.ts (11 tests) 285ms

Test Files  1 passed (1)
     Tests  11 passed (11)
  Start at  17:03:45
  Duration  8.66s
```

### Test Names Shown
The 4 new tests appear as:
```
✓ Running execution time display (PAY-3162) > displays "for" time when execution is running without stoppedAt
✓ Running execution time display (PAY-3162) > hides "for" time when execution has stoppedAt (even if status is running)
✓ Running execution time display (PAY-3162) > hides "for" time when execution status is not running
✓ Running execution time display (PAY-3162) > shows running time for execution without startedAt but with running status
```

---

## 8. Quality Checks Passed

### TypeScript Typecheck
```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui
pnpm typecheck
# Result: No errors
```

### ESLint
```bash
pnpm lint src
# Result: No issues found
```

### All Tests
```
11 tests passing
- 7 existing tests (maintained)
- 4 new tests (added)
```

---

## 9. Key Files Modified

### 1. WorkflowExecutionsCard.vue
**File:** `/Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue`

**Change:** Line 116
```vue
<!-- OLD -->
v-if="executionUIDetails.name === 'running'"

<!-- NEW -->
v-if="executionUIDetails.name === 'running' && !execution.stoppedAt"
```

### 2. WorkflowExecutionsCard.test.ts
**File:** `/Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.test.ts`

**Changes:** 
- Added lines 203-302
- New describe block with 4 test cases
- No modifications to existing tests (lines 1-202)

---

## 10. Why These Tests Are Important

### Race Condition Coverage
The main test covers the exact scenario that caused the bug:
- Status field not yet updated to reflect completion
- stoppedAt field already has a value
- UI should handle this gracefully

### Backward Compatibility
Tests verify that:
- Normal running executions still work (Test 1)
- Completed executions still work (Test 3)
- Fallback behavior still works (Test 4)

### Prevention
If someone removes the `&& !execution.stoppedAt` condition, Test 2 will immediately fail, catching the regression.

---

## 11. Test Data Reference

### ExecutionSummary Properties Used
```typescript
id: string                    // Unique execution ID
mode: string                  // 'manual', 'webhook', 'evaluation'
status: string                // 'running', 'success', 'error', 'new'
createdAt?: string           // ISO timestamp when created
startedAt?: string           // ISO timestamp when started
stoppedAt?: string           // ISO timestamp when stopped (undefined if running)
retryOf?: string | null      // ID of execution this is a retry of
retrySuccessId?: string | null // ID of successful retry
annotation?: { vote: string } // Annotation data (optional)
```

---

## 12. Conclusion

The test suite for PAY-3162 provides:

1. **Comprehensive Coverage** - 4 test cases covering happy path, race condition, edge cases
2. **Race Condition Focus** - Critical test specifically validates the fix
3. **Backward Compatibility** - Existing tests still pass
4. **Best Practices** - Uses vitest, proper mocking, realistic test data
5. **Production Ready** - All type checks and linting pass

The tests prove that the `&& !execution.stoppedAt` condition effectively prevents the rendering bug while maintaining all existing functionality.
