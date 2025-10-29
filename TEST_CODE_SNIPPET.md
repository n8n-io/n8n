# PAY-3162 Test Code Implementation

## Component Fix Location
**File:** `/Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue`

**Lines 115-124:**
```vue
<N8nText
  v-if="executionUIDetails.name === 'running' && !execution.stoppedAt"
  :color="isActive ? 'text-dark' : 'text-base'"
  size="small"
  data-test-id="execution-time-in-status"
>
  {{ locale.baseText('executionDetails.runningTimeRunning') }}
  <!-- Just here to make typescript happy, since `startedAt` will always be defined for running executions -->
  <ExecutionsTime :start-time="execution.startedAt ?? execution.createdAt" />
</N8nText>
```

**Key Change:** Line 116 adds `&& !execution.stoppedAt` condition

---

## Test Implementation
**File:** `/Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.test.ts`

**Lines 203-302 - Complete Test Suite:**

```typescript
describe('Running execution time display (PAY-3162)', () => {
	test('displays "for" time when execution is running without stoppedAt', () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const startedAt = new Date('2024-09-27T12:05:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });

		const props: ComponentProps<typeof WorkflowExecutionsCard> = {
			execution: {
				id: '1',
				mode: 'manual',
				status: 'running',
				createdAt: createdAt.toISOString(),
				startedAt: startedAt.toISOString(),
				// stoppedAt is undefined - execution is truly running
			} as unknown as ExecutionSummary,
			workflowPermissions: { execute: true },
		};

		const { queryByTestId } = renderComponent({ props });

		// The "for" time indicator should be visible
		const executionTimeInStatus = queryByTestId('execution-time-in-status');
		expect(executionTimeInStatus).toBeVisible();
		expect(executionTimeInStatus?.textContent).toContain('for');
	});

	test('hides "for" time when execution has stoppedAt (even if status is running)', () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const startedAt = new Date('2024-09-27T12:05:00Z');
		const stoppedAt = new Date('2024-09-27T12:10:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });

		const props: ComponentProps<typeof WorkflowExecutionsCard> = {
			execution: {
				id: '2',
				mode: 'manual',
				status: 'running', // Status is still 'running' (race condition)
				createdAt: createdAt.toISOString(),
				startedAt: startedAt.toISOString(),
				stoppedAt: stoppedAt.toISOString(), // But execution has been stopped
			} as unknown as ExecutionSummary,
			workflowPermissions: { execute: true },
		};

		const { queryByTestId } = renderComponent({ props });

		// The "for" time indicator should NOT be visible
		const executionTimeInStatus = queryByTestId('execution-time-in-status');
		expect(executionTimeInStatus).toBeNull();
	});

	test('hides "for" time when execution status is not running', () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const stoppedAt = new Date('2024-09-27T12:10:00Z');

		const props: ComponentProps<typeof WorkflowExecutionsCard> = {
			execution: {
				id: '3',
				mode: 'manual',
				status: 'success', // Status is 'success'
				createdAt: createdAt.toISOString(),
				stoppedAt: stoppedAt.toISOString(),
			} as unknown as ExecutionSummary,
			workflowPermissions: { execute: true },
		};

		const { queryByTestId } = renderComponent({ props });

		// The "for" time indicator should NOT be visible for completed executions
		const executionTimeInStatus = queryByTestId('execution-time-in-status');
		expect(executionTimeInStatus).toBeNull();
	});

	test('shows running time for execution without startedAt but with running status', () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const now = new Date('2024-09-27T12:05:00Z');
		vitest.useFakeTimers({ now });

		const props: ComponentProps<typeof WorkflowExecutionsCard> = {
			execution: {
				id: '4',
				mode: 'webhook',
				status: 'running',
				createdAt: createdAt.toISOString(),
				// startedAt is undefined - it will fallback to createdAt
				// stoppedAt is undefined - execution is running
			} as unknown as ExecutionSummary,
			workflowPermissions: { execute: true },
		};

		const { queryByTestId } = renderComponent({ props });

		// The "for" time indicator should be visible and use createdAt as fallback
		const executionTimeInStatus = queryByTestId('execution-time-in-status');
		expect(executionTimeInStatus).toBeVisible();
		expect(executionTimeInStatus?.textContent).toContain('for');
	});
});
```

---

## Testing Approach

### 1. Test Framework & Tools
- **Framework:** vitest (Vue 3 component testing)
- **Component Renderer:** Custom `createComponentRenderer` from n8n test utilities
- **Mocking:** Vue Router and Pinia stores properly mocked
- **Timer Control:** `vitest.useFakeTimers()` for deterministic time calculations

### 2. Test Data Factory Pattern
Each test creates realistic ExecutionSummary objects with:
- Unique execution IDs
- Proper ISO timestamp formatting
- All necessary fields (mode, status, createdAt, startedAt, stoppedAt)
- Workflow permissions for component functionality

### 3. Behavior-Driven Testing
Tests verify the **rendered output** not implementation details:
- Uses `data-test-id="execution-time-in-status"` to query rendered element
- Checks visibility: `.toBeVisible()`
- Checks absence: `.toBeNull()`
- Checks content: `.toContain('for')`

### 4. Race Condition Testing
Critical test case explicitly models the race condition:
- Status field = 'running' (not yet updated)
- stoppedAt field = has value (already updated)
- Expected behavior: Hide "for" time indicator (fixed by PAY-3162)

---

## Test Execution Results

```
Test Files  1 passed (1)
     Tests  11 passed (11)
  Duration  8.58s

Breakdown:
- 5 parametrized retry button tests (existing)
- 1 new execution display test (existing)
- 1 createdAt fallback test (existing)
- 4 PAY-3162 running time display tests (NEW)
```

All tests pass with:
- No type errors (TypeScript)
- No linting errors
- Proper component rendering
- Correct conditional logic verification

---

## Key Assertions by Test

| Test | Assertion | Purpose |
|------|-----------|---------|
| Test 1 | `.toBeVisible()` + `.toContain('for')` | Verify happy path - normal running execution shows timer |
| Test 2 | `.toBeNull()` | **CRITICAL** - Race condition scenario doesn't render timer |
| Test 3 | `.toBeNull()` | Non-running status never shows running time |
| Test 4 | `.toBeVisible()` + `.toContain('for')` | Fallback to createdAt still shows timer when running |

---

## How to Run

```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3162/packages/frontend/editor-ui
pnpm test WorkflowExecutionsCard
```

Output:
```
✓ Running execution time display (PAY-3162) > displays "for" time when execution is running without stoppedAt
✓ Running execution time display (PAY-3162) > hides "for" time when execution has stoppedAt (even if status is running)
✓ Running execution time display (PAY-3162) > hides "for" time when execution status is not running
✓ Running execution time display (PAY-3162) > shows running time for execution without startedAt but with running status

4 new tests passing + 7 existing tests passing = 11 total tests passing
```
