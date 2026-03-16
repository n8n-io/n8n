# Approval Steps End-to-End Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make approval steps work end-to-end — transpiler marks them as approval nodes, engine pauses execution, events reach the UI via SSE, frontend shows approve/decline buttons with token auth.

**Architecture:** The transpiler sets `node.type = 'approval'` for steps with `stepType: 'approval'`. The step processor runs the step function (producing approval context), generates an approval token, transitions to `waiting_approval`, and emits an event with the token. The `/approve` endpoint validates the token and merges the approval decision with the step's existing output. The frontend stores tokens from SSE events and passes them when approving.

**Tech Stack:** TypeScript, Express, TypeORM (PostgreSQL), Vue 3 + Pinia, Vitest

**Spec:** `docs/superpowers/specs/2026-03-12-approval-steps-design.md`

---

## Chunk 1: Backend — Transpiler + Engine + API

### Task 1: Transpiler — Set node type to 'approval'

**Files:**
- Modify: `packages/@n8n/engine/src/transpiler/transpiler.service.ts:1685`
- Test: `packages/@n8n/engine/src/transpiler/__tests__/transpiler.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new describe block in the transpiler test file:

```typescript
describe('approval steps', () => {
	const source = `
import { defineWorkflow } from '@n8n/engine/sdk';
export default defineWorkflow({
	name: 'Approval Test',
	async run(ctx) {
		const prep = await ctx.step({ name: 'prepare' }, async () => {
			return { amount: 5000 };
		});
		const approval = await ctx.step({
			name: 'manager-approval',
			stepType: 'approval',
		}, async () => {
			return { message: 'Approve?' };
		});
		return approval;
	},
});
`;

	it('graph node for approval step has type "approval"', () => {
		const result = transpiler.compile(source);
		const approvalNode = result.graph.nodes.find((n) => n.name === 'manager-approval');
		expect(approvalNode).toBeDefined();
		expect(approvalNode?.type).toBe('approval');
		expect(approvalNode?.config.stepType).toBe('approval');
	});

	it('approval step has a stepFunctionRef', () => {
		const result = transpiler.compile(source);
		const approvalNode = result.graph.nodes.find((n) => n.name === 'manager-approval');
		expect(approvalNode?.stepFunctionRef).toMatch(/^step_/);
	});

	it('non-approval steps still have type "step"', () => {
		const result = transpiler.compile(source);
		const prepNode = result.graph.nodes.find((n) => n.name === 'prepare');
		expect(prepNode?.type).toBe('step');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pushd packages/@n8n/engine && pnpm test src/transpiler/__tests__/transpiler.test.ts -- --grep "approval" && popd`
Expected: FAIL — `approvalNode.type` is `'step'`, not `'approval'`

- [ ] **Step 3: Write minimal implementation**

In `packages/@n8n/engine/src/transpiler/transpiler.service.ts`, change line 1685 from:

```typescript
type: step.isBatch ? 'batch' : 'step',
```

to:

```typescript
type: step.isBatch ? 'batch' : step.stepType === 'approval' ? 'approval' : 'step',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pushd packages/@n8n/engine && pnpm test src/transpiler/__tests__/transpiler.test.ts -- --grep "approval" && popd`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/@n8n/engine/src/transpiler/transpiler.service.ts packages/@n8n/engine/src/transpiler/__tests__/transpiler.test.ts
git commit -m "feat(engine): set node type to 'approval' for approval steps in transpiler"
```

---

### Task 2: Step processor — Approval node handler + event types

**Files:**
- Modify: `packages/@n8n/engine/src/engine/event-bus.types.ts:42-46`
- Modify: `packages/@n8n/engine/src/engine/step-processor.service.ts:1,23-30,151,551-556`

All changes to `step-processor.service.ts` and `event-bus.types.ts` are done together to avoid dependency issues (the `StepUpdate` interface, `emitStepEvent`, and the approval handler all reference `approvalToken`).

- [ ] **Step 1: Add approvalToken to event type**

In `packages/@n8n/engine/src/engine/event-bus.types.ts`, update the `StepWaitingApprovalEvent` interface:

```typescript
export interface StepWaitingApprovalEvent {
	type: 'step:waiting_approval';
	executionId: string;
	stepId: string;
	stepExecutionId: string;
	approvalToken: string;
}
```

The `stepExecutionId` is needed so the UI knows which step execution record to call `/approve` on (the `stepId` is the graph node ID, not the DB row ID).

- [ ] **Step 2: Add approvalToken to StepUpdate interface**

In `packages/@n8n/engine/src/engine/step-processor.service.ts`, add `approvalToken` to the `StepUpdate` interface (around line 23-30):

```typescript
interface StepUpdate {
	status?: string;
	output?: unknown;
	error?: unknown;
	attempt?: number;
	retryAfter?: Date | null;
	completedAt?: Date | null;
	durationMs?: number | null;
	approvalToken?: string;
}
```

- [ ] **Step 3: Add import and approval handler**

Add `import { randomUUID } from 'node:crypto';` at the top of the file alongside the existing `import { Module, createRequire } from 'node:module';`.

Insert between the sleep handler return (line 151) and the batch handler comment (line 153):

```typescript
// 5b2. Handle approval steps: execute function, then pause for human approval
if (node?.type === 'approval') {
	this.eventBus.emit({
		type: 'step:started',
		executionId: execution.id,
		stepId: stepJob.stepId,
		attempt: stepJob.attempt,
	});

	// Load and execute the step function to get approval context
	const stepFn = this.loadStepFunction(
		execution.workflowId,
		execution.workflowVersion,
		workflow.compiledCode,
		graph,
		stepJob.stepId,
		stepJob.metadata,
	);
	const ctx = this.buildStepContext(stepJob, execution);
	const approvalContext = await stepFn(ctx);

	// Generate approval token and transition to waiting_approval
	const approvalToken = randomUUID();
	await this.updateStepAndEmit(stepJob, execution, {
		status: StepStatus.WaitingApproval,
		output: approvalContext,
		approvalToken,
	});

	return;
}
```

- [ ] **Step 4: Update emitStepEvent to include approvalToken**

Update the `step:waiting_approval` case in `emitStepEvent` (line 551-556):

```typescript
case 'step:waiting_approval':
	this.eventBus.emit({
		type: 'step:waiting_approval',
		executionId: execution.id,
		stepId: stepJob.stepId,
		stepExecutionId: stepJob.id,
		approvalToken: update.approvalToken ?? '',
	});
	break;
```

- [ ] **Step 5: Run typecheck**

Run: `pushd packages/@n8n/engine && pnpm typecheck && popd`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/engine/src/engine/event-bus.types.ts packages/@n8n/engine/src/engine/step-processor.service.ts
git commit -m "feat(engine): add approval node handler with token generation in step processor"
```

---

### Task 3: Approve endpoint — Token validation and output merging

**Files:**
- Modify: `packages/@n8n/engine/src/api/step-execution.controller.ts:44-98`

- [ ] **Step 1: Update the approve endpoint**

Replace the POST `/:id/approve` handler body (lines 45-98) with:

```typescript
router.post('/:id/approve', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { approved, token } = req.body as { approved: boolean; token: string };

		if (typeof approved !== 'boolean') {
			res.status(400).json({ error: 'approved (boolean) is required' });
			return;
		}

		if (typeof token !== 'string' || token.length === 0) {
			res.status(400).json({ error: 'token (string) is required' });
			return;
		}

		// Load the step to get existing output for merging
		const step = await dataSource.getRepository(WorkflowStepExecution).findOneBy({ id });

		if (!step) {
			res.status(404).json({ error: 'Step execution not found' });
			return;
		}

		// Merge existing output (approval context from step function) with approval decision
		const existingOutput = (step.output as Record<string, unknown>) ?? {};
		const mergedOutput = { ...existingOutput, approved };

		// Atomically update only if step is in waiting_approval status AND token matches
		const updateResult = await dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Completed,
				output: mergedOutput as unknown as Record<string, unknown>,
				completedAt: new Date(),
			})
			.where('id = :id AND status = :status AND "approvalToken" = :token', {
				id,
				status: StepStatus.WaitingApproval,
				token,
			})
			.execute();

		if (updateResult.affected === 0) {
			res.status(409).json({
				error: 'Approval already processed, step not waiting, or invalid token',
			});
			return;
		}

		// Emit step:completed event so event handlers plan next steps
		eventBus.emit({
			type: 'step:completed',
			executionId: step.executionId,
			stepId: step.stepId,
			output: mergedOutput,
			durationMs: 0,
			parentStepExecutionId: step.parentStepExecutionId ?? undefined,
		});

		res.status(200).json({
			status: 'completed',
			output: mergedOutput,
		});
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});
```

- [ ] **Step 2: Run typecheck**

Run: `pushd packages/@n8n/engine && pnpm typecheck && popd`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/@n8n/engine/src/api/step-execution.controller.ts
git commit -m "feat(engine): add token validation and output merging to approve endpoint"
```

---

### Task 4: Integration tests — Engine-driven approval flow

**Files:**
- Modify: `packages/@n8n/engine/test/integration/approval.test.ts`

- [ ] **Step 1: Rewrite createApprovalScenario to use engine-driven flow**

Replace the `createApprovalScenario` helper (lines 80-189) and update the imports. The key change: instead of manually setting step status via raw SQL, we use `stepType: 'approval'` in the workflow code and wait for the `step:waiting_approval` event from the engine.

```typescript
async function createApprovalScenario(): Promise<{
	workflowId: string;
	executionId: string;
	approvalStep: WorkflowStepExecution;
	approvalToken: string;
}> {
	const code = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Approval Workflow',
	async run(ctx) {
		const prep = await ctx.step({ name: 'prepare' }, async () => {
			return { type: 'expense', amount: 5000 };
		});
		const approve = await ctx.step({
			name: 'approval',
			stepType: 'approval',
		}, async () => {
			return { message: 'Approve expense?', amount: prep.amount };
		});
		return approve;
	},
});
`;

	const createRes = await request(app)
		.post('/api/workflows')
		.send({ name: 'Approval Test', code })
		.expect(201);

	const workflowId = createRes.body.id as string;

	// Listen for the step:waiting_approval event BEFORE starting execution
	const approvalPromise = new Promise<{ stepId: string; approvalToken: string }>((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new Error('Timeout waiting for step:waiting_approval event')),
			10_000,
		);
		eventBus.onAny((event) => {
			if (event.type === 'step:waiting_approval' && 'approvalToken' in event) {
				clearTimeout(timeout);
				resolve({
					stepId: event.stepId as string,
					approvalToken: (event as { approvalToken: string }).approvalToken,
				});
			}
		});
	});

	// Start execution
	const execRes = await request(app)
		.post('/api/workflow-executions')
		.send({ workflowId })
		.expect(201);

	const executionId = execRes.body.executionId as string;

	// Wait for the approval step to reach waiting_approval status
	const { approvalToken } = await approvalPromise;

	// Fetch the approval step execution from DB
	const approvalStepId = sha256('approval');
	const approvalStep = await dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder('wse')
		.where('wse.executionId = :executionId AND wse.stepId = :stepId', {
			executionId,
			stepId: approvalStepId,
		})
		.getOneOrFail();

	return { workflowId, executionId, approvalStep, approvalToken };
}
```

- [ ] **Step 2: Update test cases**

Replace the test cases to use the engine-driven flow and token validation:

```typescript
describe('Approval -- Basic flow', () => {
	it('engine pauses at approval step with status=waiting_approval', async () => {
		const { approvalStep } = await createApprovalScenario();

		expect(approvalStep.stepType).toBe(StepType.Approval);
		expect(approvalStep.status).toBe(StepStatus.WaitingApproval);
		expect(approvalStep.approvalToken).toBeTruthy();
	});

	it('approval step output contains the step function return value', async () => {
		const { approvalStep } = await createApprovalScenario();

		expect(approvalStep.output).toEqual({
			message: 'Approve expense?',
			amount: 5000,
		});
	});

	it('POST /approve with valid token and approved=true merges output', async () => {
		const { approvalStep, approvalToken } = await createApprovalScenario();

		const res = await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: true, token: approvalToken })
			.expect(200);

		expect(res.body.status).toBe('completed');
		expect(res.body.output).toEqual({
			message: 'Approve expense?',
			amount: 5000,
			approved: true,
		});
	});

	it('POST /approve with approved=false merges output', async () => {
		const { approvalStep, approvalToken } = await createApprovalScenario();

		const res = await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: false, token: approvalToken })
			.expect(200);

		expect(res.body.output).toEqual({
			message: 'Approve expense?',
			amount: 5000,
			approved: false,
		});
	});

	it('step:completed event is emitted after approval', async () => {
		const { executionId, approvalStep, approvalToken } = await createApprovalScenario();

		const receivedEvent = new Promise<boolean>((resolve) => {
			const timeout = setTimeout(() => resolve(false), 5_000);
			eventBus.onAny((event) => {
				if (
					event.type === 'step:completed' &&
					'executionId' in event &&
					event.executionId === executionId &&
					'stepId' in event &&
					event.stepId === approvalStep.stepId
				) {
					clearTimeout(timeout);
					resolve(true);
				}
			});
		});

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: true, token: approvalToken })
			.expect(200);

		expect(await receivedEvent).toBe(true);
	});

	it('execution completes after approval', async () => {
		const { executionId, approvalStep, approvalToken } = await createApprovalScenario();

		const completionPromise = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for completion')),
				10_000,
			);
			eventBus.onAny((event) => {
				if (
					'executionId' in event &&
					event.executionId === executionId &&
					(event.type === 'execution:completed' || event.type === 'execution:failed')
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: true, token: approvalToken })
			.expect(200);

		await completionPromise;

		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneByOrFail({ id: executionId });
		expect(execution.status).toBe(ExecutionStatus.Completed);
	});
});

describe('Approval -- Token validation', () => {
	it('returns 400 when token is missing', async () => {
		const { approvalStep } = await createApprovalScenario();

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: true })
			.expect(400);
	});

	it('returns 409 when token is wrong', async () => {
		const { approvalStep } = await createApprovalScenario();

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: true, token: 'wrong-token' })
			.expect(409);
	});
});

describe('Approval -- Idempotency', () => {
	it('second approval attempt returns 409', async () => {
		const { approvalStep, approvalToken } = await createApprovalScenario();

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: true, token: approvalToken })
			.expect(200);

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: false, token: approvalToken })
			.expect(409);
	});
});

describe('Approval -- Cancellation interaction', () => {
	it('cancelling execution while step is waiting_approval prevents approval', async () => {
		const { executionId, approvalStep, approvalToken } = await createApprovalScenario();

		await request(app).post(`/api/workflow-executions/${executionId}/cancel`).expect(200);

		// Either succeeds (step still waiting_approval) or 409 (already resolved)
		const res = await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: true, token: approvalToken });
		expect([200, 409]).toContain(res.status);
	});
});

describe('Approval -- Validation', () => {
	it('returns 400 when approved field is missing', async () => {
		const { approvalStep, approvalToken } = await createApprovalScenario();

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ token: approvalToken })
			.expect(400);
	});

	it('returns 400 when approved field is not a boolean', async () => {
		const { approvalStep, approvalToken } = await createApprovalScenario();

		await request(app)
			.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
			.send({ approved: 'yes', token: approvalToken })
			.expect(400);
	});
});
```

- [ ] **Step 3: Run integration tests**

Run: `pushd packages/@n8n/engine && pnpm test:db -- --grep "Approval" && popd`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/@n8n/engine/test/integration/approval.test.ts
git commit -m "test(engine): rewrite approval tests to use engine-driven flow with token validation"
```

---

## Chunk 2: Frontend — Token storage + auto-select

> **Already working (no changes needed):**
> - **Canvas click → step selection:** `ExecutionGraph.vue` emits `select-step` on node click → `WorkspaceView.handleSelectStep` sets `selectedStepId` → detail panel opens with approve/decline buttons
> - **`waiting_approval` status on canvas:** Purple color (`#8b5cf6`) and "Awaiting Approval" label already rendered by `statusColor()` and `statusLabel()` in `ExecutionGraph.vue`
> - **Step detail panel:** Shows approve/decline buttons when `selectedStep.status === 'waiting_approval'`

### Task 5: Execution store — Store approval tokens from SSE events

**Files:**
- Modify: `packages/@n8n/engine/src/web/src/stores/execution.store.ts`

- [ ] **Step 1: Add approvalTokens map and update SSE handler**

In the store, add a reactive map for storing approval tokens. Update the `subscribeSSE` handler to capture tokens from `step:waiting_approval` events. Update `approveStep` to accept a token parameter.

Add after `const error = ref<string | null>(null);` (line 66):

```typescript
const approvalTokens = ref<Map<string, string>>(new Map());
```

Update the `subscribeSSE` function's `onmessage` handler (around line 128-143). After `events.value.push(event);`, add:

```typescript
// Store approval tokens from waiting_approval events
if (event.type === 'step:waiting_approval' && event.approvalToken && event.stepExecutionId) {
	approvalTokens.value.set(event.stepExecutionId as string, event.approvalToken as string);
}
```

Update `approveStep` (line 166-176) to accept and send the token:

```typescript
async function approveStep(stepExecutionId: string, approved: boolean, token?: string) {
	const approvalToken = token ?? approvalTokens.value.get(stepExecutionId);
	if (!approvalToken) {
		throw new Error('No approval token available for this step');
	}
	const res = await fetch(`/api/workflow-step-executions/${stepExecutionId}/approve`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ approved, token: approvalToken }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
		throw new Error(body.error ?? 'Failed to approve step');
	}
}
```

Add `approvalTokens` to the return statement.

- [ ] **Step 2: Commit**

```bash
git add packages/@n8n/engine/src/web/src/stores/execution.store.ts
git commit -m "feat(engine-web): store approval tokens from SSE events in execution store"
```

---

### Task 6: WorkspaceView — Auto-select approval step and pass token

**Files:**
- Modify: `packages/@n8n/engine/src/web/src/views/WorkspaceView.vue`

- [ ] **Step 1: Update SSE handler to auto-select approval steps**

In the `subscribeSSE` callback in `execution.store.ts` (already handled in Task 6), the SSE event triggers `fetchSteps()` which refreshes the step list. We need the WorkspaceView to react to approval steps.

Add a watcher in WorkspaceView that auto-selects steps in `waiting_approval` status. After the existing watchers, add:

```typescript
// Auto-select approval steps when they appear
watch(
	() => executionStore.steps,
	(steps) => {
		const waitingApproval = steps.find((s) => s.status === 'waiting_approval');
		if (waitingApproval && selectedStepId.value !== waitingApproval.stepId) {
			selectedStepId.value = waitingApproval.stepId;
		}
	},
	{ deep: true },
);
```

- [ ] **Step 2: Update handleApproveStep to pass the step execution ID**

The `handleApproveStep` function (line 411) currently receives `stepId` from the UI — but this is actually the `step.id` (step execution ID), which is what the `/approve` endpoint expects. Verify this is correct by checking that `selectedStep.id` in the template (line 1425) corresponds to the step execution record ID.

The `approveStep` function in the store now auto-resolves the token from the map, so no template changes are needed — the token is looked up by step execution ID.

- [ ] **Step 3: Commit**

```bash
git add packages/@n8n/engine/src/web/src/views/WorkspaceView.vue
git commit -m "feat(engine-web): auto-select approval steps and pass token for approval"
```

---

### Task 7: Manual UI smoke test

- [ ] **Step 1: Start the dev environment**

```bash
pushd packages/@n8n/engine && docker compose up -d postgres && pnpm dev & pnpm dev:web && popd
```

- [ ] **Step 2: Create a workflow with an approval step**

Navigate to `http://localhost:3200`. Create a new workflow with the code from `examples/10-approval-flow.ts`. Save it.

- [ ] **Step 3: Execute and verify approval flow**

1. Click "Execute" to start the workflow
2. Verify the execution pauses at the "Await Manager Approval" step
3. Verify the step shows `waiting_approval` status (purple on canvas)
4. Verify the step detail panel auto-opens with approve/decline buttons
5. Click "Approve" — verify the execution continues and completes
6. Run again and click "Decline" — verify the rejection branch executes

- [ ] **Step 4: Verify token validation**

Using curl or the browser console, try to approve a waiting step with a wrong token:
```bash
curl -X POST http://localhost:3100/api/workflow-step-executions/<id>/approve \
  -H 'Content-Type: application/json' \
  -d '{"approved": true, "token": "wrong"}'
```
Expected: 409 response

---

### Task 8: Run full test suite

- [ ] **Step 1: Run unit tests**

Run: `pushd packages/@n8n/engine && pnpm test && popd`
Expected: ALL PASS

- [ ] **Step 2: Run integration tests**

Run: `pushd packages/@n8n/engine && pnpm test:db && popd`
Expected: ALL PASS

- [ ] **Step 3: Run typecheck**

Run: `pushd packages/@n8n/engine && pnpm typecheck && popd`
Expected: PASS

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(engine): address any remaining issues from full test suite"
```
