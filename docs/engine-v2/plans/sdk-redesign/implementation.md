# Engine v2 SDK & Graph Model Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the engine SDK to support batch processing, standalone sleep, cross-workflow triggering, sequential-by-default dependencies, and dynamic polling — replacing the current sleep-error/continuation mechanism.

**Architecture:** The SDK types define the author-facing API. The transpiler compiles scripts into a graph using sequential declaration order (not regex variable inference). The engine core executes the new primitives (batch via child steps, sleep as waiting-step, cross-workflow via execution linking). Old continuation/split-step mechanism is fully removed.

**Tech Stack:** TypeScript, ts-morph (AST), esbuild, TypeORM/PostgreSQL, Express, Vue 3, Vitest

**Spec:** `docs/superpowers/specs/2026-03-11-engine-v2-sdk-redesign.md`

**Test Policy:** No tests may be skipped. All tests must pass at each chunk boundary. The test DB must be running for integration tests (`pnpm test:db` or manual `docker compose -f docker-compose.test.yml up -d` + `pnpm test`). Every chunk ends with a verification gate that runs the full test suite and confirms 0 failures, 0 skips.

**Quality Gates:** Every verification gate includes linting (`pnpm format:check`), type checking (`pnpm typecheck`), and build (`pnpm build`). All three must pass with zero errors.

**Commit Policy:** Do NOT commit anything. All changes stay local as unstaged/staged changes for the user to review. The `git commit` commands in this plan are placeholders showing the logical grouping of changes — do not execute them.

---

## Progress Summary

> Updated 2026-03-12. Tracks incremental progress across PR #69 (sleep), PR #73 (examples/schemas/Docker), and this branch.

### What's been landed

**Sleep/wait (PR #69):**
- Graph types, transpiler detection, step processor, step planner, WorkflowGraph — all working end-to-end
- `SleepRequestedError` and `WaitUntilRequestedError` removed
- Tests: unit + integration for sleep/waitUntil

**Examples, schemas, validation, Docker (PR #73):**
- AST-based trigger extraction replacing regex in transpiler
- TypeScript typechecking of workflow source against SDK types at compile time
- Zod webhook schemas: body/query/headers validated at runtime with ajv, auto-generate test data with @faker-js/faker
- Type inference: `ctx.triggerData` automatically typed from Zod schema via generics
- 61 use-case examples ported from SDK v4 fixtures with real DummyJSON APIs
- Inline error markers in CodeEditor via @codemirror/lint
- Sleep node styling in both GraphCanvas and ExecutionGraph (clock icon, dashed border, duration label, shared utils)
- Docker: single Dockerfile with dev/web/build/prod targets, no monorepo root package.json needed
- Seed improvements: per-name idempotency, code-change detection, name extraction from source
- Webhook schema validation creates failed execution records for UI visibility
- 239 unit tests passing (including 12 zod-to-json-schema, 9 webhook validation, trigger extraction, typechecking)

### Gaps between current state and plan

1. **Sleep API signature**: Currently `ctx.sleep(ms)` / `ctx.waitUntil(date)`. Plan target is `ctx.sleep({ name, duration })` via `SleepConfig`.
2. **Sleep API signature**: Currently `ctx.sleep(ms)` / `ctx.waitUntil(date)`. Plan target is `ctx.sleep({ name, duration })` via `SleepConfig`. Keeping current API since it's working and examples use it.

### Chunk status

| Chunk | Status | Notes |
|-------|--------|-------|
| 0 — Fix existing test failures | Done | Fixed inline across PRs |
| 1 — SDK Types & Graph Types | Done | BatchConfig, BatchResult, TriggerWorkflowConfig, batch step overload, renamed getFanOutChildStepId→getBatchChildStepId |
| 2 — Transpiler | Done | Sequential-by-default ordering, batch detection (3-arg ctx.step), triggerWorkflow detection, AST trigger extraction, typechecking, Zod schema extraction |
| 3 — Engine Core | Done | Sleep (3.1), batch executor (3.2), adaptive polling (3.3), cross-workflow trigger (3.4) |
| 4 — Wiring & Cleanup | Done | BatchExecutor and WorkflowTrigger wired in main.ts, wake() connected to step planner |
| 5 — Examples | Done | 17 main examples + 61 use-cases with real APIs, Zod schemas, proper naming |
| 6 — Infrastructure | Done | Single Dockerfile, simplified Docker compose, @codemirror/lint, @faker-js/faker |
| 7 — UI Changes | Done | Sleep/trigger node styling (both canvases), trigger step visible in execution graph, CodeEditor lint markers, webhook tester faker. Batch node visuals TODO |
| 8 — Documentation | Not started | |
| 9 — Bug Fixes & Code Quality | Partial | NonRetriableError classification fixed, API stack trace leakage fixed, SQL interpolation fixed, event bus async error handling fixed, module cache LRU eviction added. Remaining: CLI factory extraction, graph cycle detection, processStep decomposition, WorkspaceView decomposition, graph layout dedup |
| 10 — Agent Integration | Not started | Deferred to separate PR |
| 10 — Agent Integration | Not started | Deferred to separate PR |

---

## Chunk 0: Fix Existing Test Failures

Before making any SDK changes, the existing test suite must be green. Current state (with test DB running):
- **Entity tests**: Some fail due to schema issues (tables dropped mid-suite by `dropSchema: true`)
- **Sleep/Wait tests**: Timeouts and failures from flaky event-driven timing
- **API tests**: Cascading failures from entity/schema issues
- **Retry/Versioning tests**: Timeouts from queue not processing steps in time

### Task 0.1: Fix Formatting and Lint Errors

**Files:** Any files with formatting/lint violations

- [ ] **Step 1: Run format check to see current state**

```bash
pushd packages/@n8n/engine && pnpm format:check 2>&1 | head -30 && popd
```

- [ ] **Step 2: Auto-fix formatting**

```bash
pushd packages/@n8n/engine && pnpm format 2>&1 && popd
```

- [ ] **Step 3: Verify format is clean**

```bash
pushd packages/@n8n/engine && pnpm format:check && popd
```

### Task 0.2: Fix Type Errors in Tests

**Files:** All test files with type errors

- [ ] **Step 1: Run typecheck to see all errors**

```bash
pushd packages/@n8n/engine && pnpm typecheck 2>&1 | tail -40 && popd
```

- [ ] **Step 2: Fix type errors in test files** — these may include:
  - Tests referencing old `StepDefinition` instead of `GraphStepConfig`
  - Tests using `retryConfig` vs `retry` inconsistently
  - Mock objects missing required fields after type changes
  - Import paths that changed

- [ ] **Step 3: Verify typecheck passes with 0 errors**

```bash
pushd packages/@n8n/engine && pnpm typecheck && popd
```

### Task 0.3: Fix Test Runtime Failures

**Files:**
- Modify: `src/database/__tests__/entities.test.ts`
- Modify: `test/helpers.ts`
- Modify: Any failing test files

- [ ] **Step 1: Start test DB and run entity tests in isolation**

```bash
pushd packages/@n8n/engine
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test pnpm test -- src/database/__tests__/entities.test.ts
popd
```

- [ ] **Step 2: Fix the root cause** — likely `dropSchema: true` in `createTestDataSource()` (test/helpers.ts line 17) interfering with concurrent test files. Ensure schema is only dropped once, not per-file.

- [ ] **Step 3: Run full test suite, fix any remaining runtime failures**

```bash
pushd packages/@n8n/engine && pnpm test 2>&1 | tail -10 && popd
```

Target: 0 failures, 0 skips.

### Task 0.4: Verify Clean Baseline

- [ ] **Step 1: Run format check**

```bash
pushd packages/@n8n/engine && pnpm format:check && popd
```

- [ ] **Step 2: Run typecheck**

```bash
pushd packages/@n8n/engine && pnpm typecheck && popd
```

- [ ] **Step 3: Run build**

```bash
pushd packages/@n8n/engine && pnpm build > /tmp/engine-build.log 2>&1 && echo "BUILD OK" || tail -20 /tmp/engine-build.log && popd
```

- [ ] **Step 4: Run unit tests (no DB needed)**

```bash
pushd packages/@n8n/engine && pnpm test:unit 2>&1 | tail -10 && popd
```

Expected: All unit tests pass. Integration tests skipped (no DATABASE_URL).

- [ ] **Step 5: Run full tests with DB**

```bash
pushd packages/@n8n/engine && pnpm test 2>&1 | tail -10 && popd
```

Expected: ALL tests pass. 0 failures. 0 skipped.

- [ ] **Step 6: If any tests are legitimately skipped (e.g., feature not implemented), document why in the test file with a TODO comment. No silent skips allowed.**

---

## Verification Gate Template

Every chunk must end with this verification:

```bash
# 1. Format check
pushd packages/@n8n/engine && pnpm format:check && popd

# 2. Typecheck
pushd packages/@n8n/engine && pnpm typecheck && popd

# 3. Build
pushd packages/@n8n/engine && pnpm build > /tmp/engine-build.log 2>&1 && echo "BUILD OK" || (tail -20 /tmp/engine-build.log; exit 1) && popd

# 4. Unit tests
pushd packages/@n8n/engine && pnpm test:unit && popd

# 5. Integration tests (requires test DB)
pushd packages/@n8n/engine
docker compose -f docker-compose.test.yml up -d
pnpm test
docker compose -f docker-compose.test.yml down
popd
```

All 5 must pass with 0 errors, 0 failures, and 0 skips before proceeding to the next chunk.

---

## File Structure

### Files to Create

| File | Responsibility |
|------|----------------|
| `src/engine/batch-executor.service.ts` | Batch fan-out: create child steps, enforce concurrency, aggregate results |
| `src/engine/workflow-trigger.service.ts` | Cross-workflow trigger: start child execution, await or fire-and-forget |
| `src/engine/__tests__/batch-executor.test.ts` | Unit tests for batch executor |
| `src/engine/__tests__/step-queue-adaptive.test.ts` | Unit tests for adaptive polling |
| `test/integration/batch.test.ts` | Integration tests for batch execution |
| `test/integration/trigger-workflow.test.ts` | Integration tests for cross-workflow trigger |
| `docker-compose.perf-single.yml` | Single-instance perf baseline |
| `docker-compose.perf-multi.yml` | 3-engine horizontal scaling |
| `docker-compose.perf-redis.yml` | 3-engine with Redis pub/sub |
| `docker-compose.perf-heavy-db.yml` | Beefy Postgres config |
| `docker-compose.perf-constrained.yml` | Resource-constrained engine |
| `perf/benchmark.sh` | Automated multi-config benchmark runner |
| `examples/18-batch-processing.ts` | Batch step example |
| `examples/19-trigger-workflow.ts` | Cross-workflow trigger example |
| `examples/20-order-routing.ts` | Ported from code-engine: webhook → if/else routing |
| `examples/21-product-catalog.ts` | Ported from code-engine: GET → switch/case |

### Files to Modify

| File | Lines | What Changes |
|------|-------|--------------|
| `src/sdk/types.ts` | 78 | Add `SleepConfig`, `BatchConfig`, `TriggerWorkflowConfig`; update `ExecutionContext`; remove `sleep(ms)`, `waitUntil(date)` |
| `src/sdk/errors.ts` | 27 | Remove `SleepRequestedError`, `WaitUntilRequestedError` |
| `src/sdk/index.ts` | 24 | Update exports |
| `src/sdk/__tests__/sdk.test.ts` | 145 | Update tests for new types, remove sleep/wait error tests |
| `src/graph/graph.types.ts` | 40 | Update `GraphNodeData.type` union; remove `continuationRef` from `GraphStepConfig`; add `batch?: BatchConfig` |
| `src/graph/workflow-graph.ts` | 92 | Remove `getContinuationStepId`, `getContinuationFunctionRef`, `isContinuationStep`; keep `getFanOutChildStepId` for batch |
| `src/graph/__tests__/workflow-graph.test.ts` | 445 | Remove continuation tests, add batch child ID tests |
| `src/transpiler/transpiler.service.ts` | 889 | Sequential-by-default edge building; detect `ctx.sleep()`, `ctx.triggerWorkflow()`, 3-arg `ctx.step()` for batch |
| `src/transpiler/__tests__/transpiler.test.ts` | 541 | Add tests for sequential ordering, new primitives |
| `src/engine/step-processor.service.ts` | 572 | Remove sleep/wait catch block (lines 131-168); remove continuation logic; add batch delegation; update `buildStepContext` |
| `src/engine/step-queue.service.ts` | 141 | Adaptive polling (Active 10ms / Idle 250ms / Standby 1000ms) |
| `src/engine/step-planner.service.ts` | 100 | Handle new node types in successor planning |
| `src/engine/completion.service.ts` | 146 | Handle batch parent completion |
| `src/engine/event-handlers.ts` | 246 | Remove `resolveParentStep` for sleep; add batch child completion handler |
| `src/engine/event-bus.types.ts` | 135 | Add `step:batch_progress` event type |
| `src/engine/engine.service.ts` | 257 | Add `startExecution` support for cross-workflow trigger |
| `src/database/enums.ts` | 47 | Add `StepType.Batch`, `StepType.Sleep`, `StepType.TriggerWorkflow` |
| `src/main.ts` | 79 | Wire new services (BatchExecutor, WorkflowTrigger) |
| `test/integration/test-engine.ts` | 329 | Expose new services on TestEngine |
| `test/fixtures.ts` | 146 | Add batch, sleep, trigger-workflow fixtures |
| `test/integration/sleep-wait.test.ts` | 627 | Full rewrite: sleep is now a simple waiting step, no continuations |
| `src/web/src/stores/execution.store.ts` | 210 | Handle `step:chunk` events for streaming PoC |
| `src/web/src/components/ExecutionGraph.vue` | 715 | Add batch/sleep/trigger-workflow node visuals |
| `src/web/src/components/StepCard.vue` | 322 | Add streaming chunk indicator, batch summary |
| `examples/01-hello-world.ts` through `examples/17-streaming-webhook.ts` | ~1093 total | Update to new SDK (remove in-step sleep, update signatures) |

---

## Chunk 1: SDK Types & Graph Types

Foundation layer — all other chunks depend on this.

### Task 1.1: Update SDK Types

**Files:**
- Modify: `src/sdk/types.ts`
- Test: `src/sdk/__tests__/sdk.test.ts`

- [ ] **Step 1: Update `StepDefinition` — remove `continuationRef`, add `batch`**

In `src/sdk/types.ts`, replace the full `StepDefinition` interface (lines 1-22):

```typescript
export interface BatchConfig {
	/** Behavior when an item fails */
	onItemFailure?: 'fail-fast' | 'continue' | 'abort-remaining';
}

export interface StepDefinition {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	stepType?: 'step' | 'approval' | 'condition';
	retry?: RetryConfig;
	timeout?: number;
	retriableErrors?: string[];
	retryOnTimeout?: boolean;
	/** Batch processing config — used when ctx.step() receives an array as 2nd arg */
	batch?: BatchConfig;
}
```

Key change: `continuationRef` removed, `batch` added.

- [ ] **Step 2: Add `SleepConfig` interface**

Add after `StepDefinition`:

```typescript
export interface SleepConfig {
	name: string;
	/** Sleep duration in ms — mutually exclusive with `until` */
	duration?: number;
	/** Absolute date to wait until — mutually exclusive with `duration` */
	until?: Date;
	description?: string;
	icon?: string;
}
```

- [ ] **Step 3: Add `TriggerWorkflowConfig` interface**

```typescript
export interface TriggerWorkflowConfig {
	workflowId: string;
	input?: Record<string, unknown>;
	timeout?: number;
}
```

- [ ] **Step 4: Update `ExecutionContext`**

Replace the interface (lines 54-66):

```typescript
export interface ExecutionContext {
	input: Record<string, unknown>;
	triggerData: Record<string, unknown>;
	executionId: string;
	stepId: string;
	attempt: number;
	/** Regular step (2 args) or batch step (3 args with items array) */
	step: {
		<T>(definition: StepDefinition, fn: () => Promise<T>): Promise<T>;
		<T, I>(definition: StepDefinition, items: I[], fn: (item: I, index: number) => Promise<T>): Promise<BatchResult<T>[]>;
	};
	/** Durable sleep — appears as a node in the graph */
	sleep: (config: SleepConfig) => Promise<void>;
	/** Trigger another workflow execution */
	triggerWorkflow: (config: TriggerWorkflowConfig) => Promise<unknown>;
	sendChunk: (data: unknown) => Promise<void>;
	respondToWebhook: (response: WebhookResponse) => Promise<void>;
	getSecret: (name: string) => string | undefined;
}

export interface BatchResult<T> {
	status: 'fulfilled' | 'rejected';
	value?: T;
	reason?: Error;
}
```

- [ ] **Step 5: Write tests for new types**

Update `src/sdk/__tests__/sdk.test.ts`:
- Remove `SleepRequestedError` tests (lines 83-106)
- Remove `WaitUntilRequestedError` tests (lines 108-134)
- Add test: `SleepConfig` requires `name` and either `duration` or `until`
- Add test: `BatchConfig` defaults — `concurrency` undefined, `onItemFailure` undefined
- Add test: `TriggerWorkflowConfig` requires `workflowId`

- [ ] **Step 6: Run tests**

```bash
pushd packages/@n8n/engine && pnpm test -- src/sdk/__tests__/sdk.test.ts && popd
```

- [ ] **Step 7: Logical checkpoint** — SDK types updated (do not commit, leave for user review)

### Task 1.2: Remove Sleep/Wait Error Classes — DONE (PR #63)

**Files:**
- Modify: `src/sdk/errors.ts`
- Modify: `src/sdk/index.ts`

- [x] **Step 1: Remove `SleepRequestedError` and `WaitUntilRequestedError` from `errors.ts`** — Done. Only `NonRetriableError` remains.

- [x] **Step 2: Update `index.ts` exports** — No change needed, `export * from './errors'` still works.

- [x] **Step 3: Verify no import errors** — Clean.

- [x] **Step 4: Logical checkpoint** — sleep/wait errors removed

### Task 1.3: Update Graph Types — PARTIALLY DONE (PR #60)

**Files:**
- Modify: `src/graph/graph.types.ts`
- Modify: `src/database/enums.ts`

**Note:** The remote introduced `GraphStepConfig` (separate from SDK `StepDefinition`) with `retryConfig` naming. We keep this convention — the graph config uses `retryConfig`, the SDK uses `retry`. The transpiler maps between them.

- [x] **Step 1: Update `GraphNodeData.type` union** — `'sleep'` added. Still need `'batch'` and `'trigger-workflow'`.

- [ ] **Step 1b: Update `GraphStepConfig` — remove `continuationRef`, add `batch`** — `continuationRef` removed. `sleepMs` and `waitUntilExpr` added as interim sleep config fields (will be replaced by proper `SleepConfig` mapping when Task 1.1 lands). `batch` not yet added.

- [ ] **Step 2: Update `StepType` enum** — `Sleep = 'sleep'` added. Still need `Batch`, `TriggerWorkflow`, `Approval`.

- [ ] **Logical checkpoint** — partially done. Sleep types in place; batch and trigger-workflow types still needed per plan.

### Task 1.4: Update WorkflowGraph Class — PARTIALLY DONE (PRs #62, #63)

**Files:**
- Modify: `src/graph/workflow-graph.ts`
- Modify: `src/graph/__tests__/workflow-graph.test.ts`

- [x] **Step 1: Remove continuation methods from `workflow-graph.ts`** — Removed `getContinuationStepId()`, `getContinuationFunctionRef()`, `isContinuationStep()`. Kept `getFanOutChildStepId()`.

- [ ] **Step 2: Add `getBatchChildStepId()` as an alias** — Not yet done. `getFanOutChildStepId` still uses the old name; rename when batch is implemented per plan.

- [x] **Step 3: Update tests** — Removed continuation tests. Added `getDataPredecessors` tests (direct predecessors, trace through sleep, trace through chained sleeps, empty predecessors). Still need to rename `getFanOutChildStepId` tests to `getBatchChildStepId` when Step 2 is done.

- [x] **Step 4: Run tests** — All passing.

> **Added in implementation (not in original plan):** `getDataPredecessors()` method on `WorkflowGraph` — traces through sleep nodes to find actual data-producing predecessors. Used by `gatherStepInput` in the step planner. Emerged from PR review feedback on scoping input gathering.

### Chunk 1 Verification Gate

- [ ] Run the full verification gate (typecheck, build, unit tests, integration tests with DB). 0 failures, 0 skips.

---

## Chunk 2: Transpiler — Sequential-by-Default

The transpiler is the most complex change. The dependency resolution model shifts from regex variable scanning to positional ordering.

> **Status:** Sleep primitive detection (Task 2.2 partial) is DONE (PR #61). Sequential-by-default (Task 2.1) and batch/triggerWorkflow detection are NOT started.

### Task 2.1: Refactor Dependency Resolution to Sequential-by-Default

**Files:**
- Modify: `src/transpiler/transpiler.service.ts`
- Test: `src/transpiler/__tests__/transpiler.test.ts`

- [ ] **Step 1: Write failing test for sequential ordering**

Add to `transpiler.test.ts`:

```typescript
describe('sequential-by-default', () => {
	it('creates edges based on script order, not variable references', () => {
		const source = `
			import { defineWorkflow } from '@n8n/engine/sdk';
			export default defineWorkflow({
				name: 'Sequential',
				async run(ctx) {
					await ctx.step({ name: 'A' }, async () => ({ a: 1 }));
					await ctx.step({ name: 'B' }, async () => ({ b: 2 }));
					await ctx.step({ name: 'C' }, async () => ({ c: 3 }));
				},
			});
		`;
		const result = transpiler.compile(source);
		expect(result.errors).toHaveLength(0);

		const edges = result.graph.edges;
		// trigger → A → B → C (sequential, not all from trigger)
		expect(edges).toContainEqual(expect.objectContaining({ from: 'trigger', to: expect.any(String) }));
		// Only ONE edge from trigger (to A), not three
		const triggerEdges = edges.filter(e => e.from === 'trigger');
		expect(triggerEdges).toHaveLength(1);
		// A → B edge exists
		const aNode = result.graph.nodes.find(n => n.name === 'A')!;
		const bNode = result.graph.nodes.find(n => n.name === 'B')!;
		const cNode = result.graph.nodes.find(n => n.name === 'C')!;
		expect(edges).toContainEqual(expect.objectContaining({ from: aNode.id, to: bNode.id }));
		expect(edges).toContainEqual(expect.objectContaining({ from: bNode.id, to: cNode.id }));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/engine && pnpm test -- src/transpiler/__tests__/transpiler.test.ts -t "sequential-by-default" && popd
```

Expected: FAIL — current transpiler connects all dependency-free steps directly to trigger.

- [ ] **Step 3: Rewrite `buildGraph()` method**

In `transpiler.service.ts`, replace `buildGraph()` (lines 717-789). The new algorithm:

1. Walk through the ordered `steps` array (which is already in declaration order from `findStepCalls`)
2. Track `previousNodeId` — starts as `'trigger'`
3. For each step:
   - Create the node
   - Create edge from `previousNodeId` to this node's ID
   - Update `previousNodeId` to this node's ID
4. For `Promise.all` groups: the transpiler needs to detect when multiple steps share the same `Promise.all` parent. Steps in a `Promise.all` all get edges from the node BEFORE the `Promise.all`, and the node AFTER the `Promise.all` gets edges from all of them
5. Conditional edges: keep existing condition expression tagging on edges

The key change in `findStepCalls()`: track which steps are inside a `Promise.all` by checking if the `ctx.step()` call's ancestor is an `ArrayLiteralExpression` passed to `Promise.all`.

- [ ] **Step 4: Run all transpiler tests**

```bash
pushd packages/@n8n/engine && pnpm test -- src/transpiler/__tests__/transpiler.test.ts && popd
```

Fix any existing tests that assumed the old behavior (e.g., parallel tests that expected both steps to connect from trigger — they now connect from the previous step unless in `Promise.all`).

- [ ] **Logical checkpoint** — sequential-by-default dependency resolution in transpiler (do not commit)

### Task 2.2: Detect New Primitives in AST — SLEEP PARTIALLY DONE (PR #61), batch/triggerWorkflow TODO

**Files:**
- Modify: `src/transpiler/transpiler.service.ts`
- Test: `src/transpiler/__tests__/transpiler.test.ts`

> **Sleep detection is working end-to-end.** The transpiler detects `ctx.sleep(ms)` and `ctx.waitUntil(date)` calls via ts-morph AST, creates sleep graph nodes with `sleepMs` or `waitUntilExpr` config, and generates edges through sleep nodes. Implicit ordering edges are created via `buildPrecedingStepMap()` when adjacent steps have no data dependency. Tests cover: sleep node generation, `waitUntilExpr`, multiple sleeps, implicit ordering edges.
>
> **Note:** Current sleep API uses `ctx.sleep(ms)` / `ctx.waitUntil(date)` (simple arguments). The plan targets `ctx.sleep({ name, duration })` via `SleepConfig` — the transpiler detection will need updating when Task 1.1 Step 2 changes the SDK signature.

- [x] **Step 1: Write failing test for `ctx.sleep()` detection** — Done with interim `ctx.sleep(ms)` signature. Will need updating to match `SleepConfig` API when Task 1.1 lands:

```typescript
describe('sleep primitive', () => {
	it('creates a sleep node in the graph', () => {
		const source = `
			import { defineWorkflow } from '@n8n/engine/sdk';
			export default defineWorkflow({
				name: 'WithSleep',
				async run(ctx) {
					await ctx.step({ name: 'Before' }, async () => ({ data: 1 }));
					await ctx.sleep({ name: 'Wait', duration: 5000 });
					await ctx.step({ name: 'After' }, async () => ({ data: 2 }));
				},
			});
		`;
		const result = transpiler.compile(source);
		expect(result.errors).toHaveLength(0);
		const sleepNode = result.graph.nodes.find(n => n.type === 'sleep');
		expect(sleepNode).toBeDefined();
		expect(sleepNode!.name).toBe('Wait');
		// Edges: trigger → Before → Wait → After
		const beforeNode = result.graph.nodes.find(n => n.name === 'Before')!;
		const afterNode = result.graph.nodes.find(n => n.name === 'After')!;
		expect(result.graph.edges).toContainEqual(
			expect.objectContaining({ from: beforeNode.id, to: sleepNode!.id })
		);
		expect(result.graph.edges).toContainEqual(
			expect.objectContaining({ from: sleepNode!.id, to: afterNode.id })
		);
	});
});
```

- [ ] **Step 2: Write failing test for batch step detection (3-arg `ctx.step`)**

```typescript
describe('batch primitive', () => {
	it('creates a batch node when ctx.step receives 3 arguments', () => {
		const source = `
			import { defineWorkflow } from '@n8n/engine/sdk';
			export default defineWorkflow({
				name: 'WithBatch',
				async run(ctx) {
					const items = [1, 2, 3];
					const results = await ctx.step(
						{ name: 'Process Items', batch: { concurrency: 2 } },
						items,
						async (item) => item * 2
					);
				},
			});
		`;
		const result = transpiler.compile(source);
		expect(result.errors).toHaveLength(0);
		const batchNode = result.graph.nodes.find(n => n.type === 'batch');
		expect(batchNode).toBeDefined();
		expect(batchNode!.name).toBe('Process Items');
	});
});
```

- [ ] **Step 3: Write failing test for `ctx.triggerWorkflow()` detection**

```typescript
describe('triggerWorkflow primitive', () => {
	it('creates a trigger-workflow node', () => {
		const source = `
			import { defineWorkflow } from '@n8n/engine/sdk';
			export default defineWorkflow({
				name: 'WithTrigger',
				async run(ctx) {
					await ctx.step({ name: 'Prepare' }, async () => ({ id: '123' }));
					const result = await ctx.triggerWorkflow({
						workflowId: 'abc-123',
						input: { id: '123' },
					});
				},
			});
		`;
		const result = transpiler.compile(source);
		expect(result.errors).toHaveLength(0);
		const triggerNode = result.graph.nodes.find(n => n.type === 'trigger-workflow');
		expect(triggerNode).toBeDefined();
	});
});
```

- [ ] **Step 4: Implement primitive detection**

In `transpiler.service.ts`, extend `findStepCalls()` (or create a new `findAllPrimitives()` method) to detect:

- `ctx.sleep(config)` — recognized by `isCtxSleepCall()` check (callee is `ctx.sleep`)
- `ctx.step(def, items, fn)` — 3 arguments where 2nd is not a function → batch
- `ctx.triggerWorkflow(config)` — recognized by `isCtxTriggerWorkflowCall()`

Each detected call creates an entry in the ordered primitives list with its type.

Update `buildGraph()` to emit the correct node `type` for each primitive.

- [ ] **Step 5: Run all tests**

```bash
pushd packages/@n8n/engine && pnpm test -- src/transpiler/__tests__/transpiler.test.ts && popd
```

- [ ] **Logical checkpoint** — detect sleep, batch, and triggerWorkflow primitives in transpiler (do not commit)

### Chunk 2 Verification Gate

- [ ] Run the full verification gate (typecheck, build, unit tests, integration tests with DB). 0 failures, 0 skips.

---

## Chunk 3: Engine Core — Sleep, Batch, Dynamic Polling

> **Status:** Task 3.1 (sleep execution) is DONE (PRs #62, #63, #66). Tasks 3.2–3.4 not started.

### Task 3.1: Simplified Sleep Execution — DONE (PRs #62, #63, #66)

**Files:**
- Modify: `src/engine/step-processor.service.ts`
- Modify: `src/engine/event-handlers.ts`
- Test: `test/integration/sleep-wait.test.ts`

- [x] **Step 1: Remove sleep/wait catch block from `processStep()`**

In `step-processor.service.ts`, delete the entire sleep/wait handling block (lines 131-168):

```typescript
// DELETE: if (error instanceof SleepRequestedError || error instanceof WaitUntilRequestedError) { ... }
```

Also remove the `SleepRequestedError` and `WaitUntilRequestedError` imports (line 8).

- [x] **Step 2: Remove sleep/waitUntil from `buildStepContext()`** — Done. Runtime stubs throw errors explaining they're transpiler-handled. Will be updated to accept `SleepConfig` when Task 1.1 changes the SDK signature.

- [x] **Step 3: Add sleep step processing in `processStep()`**

Add a new code path at the top of `processStep()`, after the cancel check:

```typescript
// Handle sleep steps — no function to execute, just wait
if (stepJob.stepType === StepType.Sleep) {
	await this.updateStepAndEmit(stepJob, execution, {
		status: StepStatus.Completed,
		completedAt: new Date(),
		durationMs: 0,
		output: null,
	});
	return;
}
```

The sleep step is already picked up by the queue poller only after `waitUntil <= NOW()`, so by the time `processStep` runs, the sleep duration has elapsed. We just mark it completed.

- [x] **Step 4: Update `startExecution()` in `engine.service.ts`** — Sleep steps are queued normally by the step planner. The step processor handles the two-pass logic: first pass computes `waitUntil` and marks Waiting; second pass (after timer fires) marks Completed.

- [x] **Step 5: Remove `resolveParentStep` for sleep from event-handlers.ts** — Sleep no longer uses parent/child relationships. The old continuation catch block and `resolveParentStep` for sleep are removed. Parent/child is preserved only for fan-out (will be reused for batch).

- [x] **Step 6: Rewrite sleep-wait integration tests** — 6 integration tests cover: `ctx.sleep()`, `ctx.waitUntil()`, multiple sleeps, data flow through sleep, sleep lifecycle, sleep passthrough. Test signatures will need updating when `SleepConfig` API lands.

- [x] **Step 7: Run integration tests** — All passing.

- [x] **Logical checkpoint** — sleep execution working end-to-end as standalone waiting step

### Task 3.2: Batch Executor Service

**Files:**
- Create: `src/engine/batch-executor.service.ts`
- Create: `src/engine/__tests__/batch-executor.test.ts`
- Create: `test/integration/batch.test.ts`
- Modify: `src/engine/step-processor.service.ts`
- Modify: `src/engine/event-handlers.ts`
- Modify: `src/engine/event-bus.types.ts`

- [ ] **Step 1: Define batch progress event type**

In `event-bus.types.ts`, add:

```typescript
export interface StepBatchProgressEvent {
	type: 'step:batch_progress';
	executionId: string;
	stepId: string;
	completed: number;
	failed: number;
	total: number;
}
```

Add to `StepEvent` union and `EngineEvent`.

- [ ] **Step 2: Create `BatchExecutorService`**

Create `src/engine/batch-executor.service.ts`:

```typescript
export class BatchExecutorService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly eventBus: EngineEventBus,
	) {}

	/**
	 * Fan out a batch step into N child step executions.
	 * Each child gets its own retry/timeout from the parent's config.
	 */
	async fanOut(
		parentStep: WorkflowStepExecution,
		execution: WorkflowExecution,
		items: unknown[],
		graph: WorkflowGraph,
	): Promise<void> { ... }

	/**
	 * Called when a batch child completes or fails.
	 * Checks the onItemFailure strategy and either:
	 * - continues (wait for all)
	 * - fails the parent (fail-fast)
	 * - completes with partial results (abort-remaining)
	 */
	async onChildCompleted(
		childStep: WorkflowStepExecution,
		parentStepId: string,
	): Promise<void> { ... }
}
```

Key implementation details:
- `fanOut()` creates N child step executions with `parentStepExecutionId`, `metadata: { batchIndex, batchItem }`, `stepType: StepType.Step`
- All children are inserted with `status: 'queued'` immediately — no per-batch concurrency control. The engine's queue `maxConcurrency` naturally throttles how many run at once.
- `onChildCompleted()` checks how many children are done, applies the `onItemFailure` strategy, and when all are terminal, aggregates results into the parent's output

- [ ] **Step 3: Write unit tests for BatchExecutorService**

Test:
- `fanOut` creates correct number of child steps with correct metadata
- `fanOut` enqueues all children immediately (no concurrency limiting)
- `onChildCompleted` with `continue` strategy waits for all items
- `onChildCompleted` with `fail-fast` cancels remaining on first failure
- `onChildCompleted` with `abort-remaining` cancels remaining, parent gets partial results

- [ ] **Step 4: Integrate batch into `processStep()`**

In `step-processor.service.ts`, add a code path for batch steps:

```typescript
if (stepJob.stepType === StepType.Batch) {
	// The step function returns the items array
	const items = await stepFn(ctx);
	if (!Array.isArray(items)) {
		throw new Error('Batch step function must return an array');
	}
	await this.batchExecutor.fanOut(stepJob, execution, items, graph);
	// Don't mark parent as completed — BatchExecutor handles that
	return;
}
```

- [ ] **Step 5: Wire batch child completion in event handlers**

In `event-handlers.ts`, update the `step:completed` handler:

```typescript
if (event.parentStepExecutionId) {
	await batchExecutor.onChildCompleted(/* child step */, event.parentStepExecutionId);
	return;
}
```

- [ ] **Step 6: Write integration tests**

Create `test/integration/batch.test.ts`:
- 3 items, all succeed → parent completed with 3 fulfilled results
- 3 items, 1 fails with `continue` → parent completed with 2 fulfilled + 1 rejected
- 3 items, 1 fails with `fail-fast` → parent failed, remaining cancelled
- 3 items, 1 fails with `abort-remaining` → parent completed with partial results
- All children enqueued immediately (no per-batch concurrency)
- Per-item retry: item fails then succeeds on retry
- Steps after batch receive batch results as input

- [ ] **Step 7: Run integration tests**

```bash
pushd packages/@n8n/engine && pnpm test:db -- test/integration/batch.test.ts && popd
```

- [ ] **Logical checkpoint** — implement batch executor with fan-out, concurrency, and failure strategies (do not commit)

### Task 3.3: Wake-on-Insert + Exponential Decay Polling

**Files:**
- Modify: `src/engine/step-queue.service.ts`
- Modify: `src/engine/step-planner.service.ts` (add `queue.wake()` call after inserting steps)
- Modify: `src/engine/engine.service.ts` (add `queue.wake()` call after `startExecution`)
- Create: `src/engine/__tests__/step-queue-adaptive.test.ts`

- [ ] **Step 1: Write failing test for adaptive polling**

```typescript
describe('wake-on-insert polling', () => {
	it('starts in idle state with 1000ms interval', () => { ... });
	it('wake() immediately triggers a poll and resets interval to 10ms', () => { ... });
	it('doubles interval after each empty poll (10 → 20 → 40 → ... → 1000ms cap)', () => { ... });
	it('resets to 10ms when work is found', () => { ... });
	it('reports current interval', () => { ... });
});
```

- [ ] **Step 2: Implement wake-on-insert polling in `StepQueueService`**

Replace the fixed `setInterval` in `start()` (line 26) with a recursive `setTimeout` pattern:

```typescript
private currentIntervalMs = 1000; // start idle
private static readonly MIN_INTERVAL = 10;
private static readonly MAX_INTERVAL = 1000;

/** Called by StepPlanner and EngineService when new steps are queued */
wake(): void {
	this.currentIntervalMs = StepQueueService.MIN_INTERVAL;
	// Clear existing timer and poll immediately
	if (this.timer) clearTimeout(this.timer);
	this.pollAndReschedule();
}

private scheduleNextPoll(): void {
	if (!this.running) return;
	this.timer = setTimeout(() => this.pollAndReschedule(), this.currentIntervalMs);
}

private async pollAndReschedule(): Promise<void> {
	const workFound = await this.poll();
	if (workFound) {
		this.currentIntervalMs = StepQueueService.MIN_INTERVAL;
	} else {
		// Exponential decay: double interval up to cap
		this.currentIntervalMs = Math.min(this.currentIntervalMs * 2, StepQueueService.MAX_INTERVAL);
	}
	this.scheduleNextPoll();
}
```

Update `poll()` to return `boolean` indicating whether work was found.

- [ ] **Step 3: Wire `wake()` calls into StepPlanner and EngineService**

In `StepPlannerService.planNextSteps()`, after inserting queued steps, call `this.queue.wake()`.
In `EngineService.startExecution()`, after planning initial steps, call `this.queue.wake()`.
This requires passing the queue reference to these services (via constructor or method param).

- [ ] **Step 3: Run tests**

```bash
pushd packages/@n8n/engine && pnpm test -- src/engine/__tests__/step-queue-adaptive.test.ts && popd
```

- [ ] **Logical checkpoint** — adaptive polling — Active 10ms, Idle 250ms, Standby 1000ms (do not commit)

### Task 3.4: Cross-Workflow Trigger

**Files:**
- Create: `src/engine/workflow-trigger.service.ts`
- Create: `test/integration/trigger-workflow.test.ts`
- Modify: `src/engine/step-processor.service.ts`
- Modify: `src/engine/event-handlers.ts`

- [ ] **Step 1: Create `WorkflowTriggerService`**

```typescript
export class WorkflowTriggerService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly engineService: EngineService,
		private readonly eventBus: EngineEventBus,
	) {}

	async triggerAndAwait(
		parentStep: WorkflowStepExecution,
		config: TriggerWorkflowConfig,
	): Promise<void> {
		// Start child execution
		const childExecution = await this.engineService.startExecution(
			config.workflowId,
			config.input,
			'production',
		);
		// Store reference in parent metadata
		await this.dataSource.getRepository(WorkflowStepExecution).update(parentStep.id, {
			status: StepStatus.Waiting,
			metadata: { ...parentStep.metadata, childExecutionId: childExecution.executionId },
		});
		// Listen for child completion
		// (event handler resolves parent when child reaches terminal state)
	}

	async triggerFireAndForget(config: TriggerWorkflowConfig): Promise<void> {
		await this.engineService.startExecution(config.workflowId, config.input, 'production');
	}
}
```

- [ ] **Step 2: Add child execution completion handler**

In `event-handlers.ts`, add handler for `execution:completed` and `execution:failed` that checks if any step is waiting for this execution:

```typescript
eventBus.on('execution:completed', async (event) => {
	// Check if any step in ANY execution is waiting for this child execution
	const waitingStep = await dataSource.getRepository(WorkflowStepExecution)
		.createQueryBuilder('wse')
		.where("wse.status = :status", { status: StepStatus.Waiting })
		.andWhere("wse.metadata->>'childExecutionId' = :childId", { childId: event.executionId })
		.getOne();
	if (waitingStep) {
		// Resolve parent step with child's result
		await dataSource.getRepository(WorkflowStepExecution).update(waitingStep.id, {
			status: StepStatus.Completed,
			output: event.result,
			completedAt: new Date(),
		});
		eventBus.emit({ type: 'step:completed', executionId: waitingStep.executionId, ... });
	}
});
```

- [ ] **Step 3: Write integration tests**

Create `test/integration/trigger-workflow.test.ts`:
- Trigger workflow and await result — parent step gets child result
- Trigger workflow fire-and-forget — parent step completes immediately
- Child workflow fails — parent step fails
- Timeout on child execution

- [ ] **Step 4: Run integration tests**

```bash
pushd packages/@n8n/engine && pnpm test:db -- test/integration/trigger-workflow.test.ts && popd
```

- [ ] **Logical checkpoint** — cross-workflow triggering with await and fire-and-forget modes (do not commit)

### Chunk 3 Verification Gate

- [ ] Run the full verification gate (typecheck, build, unit tests, integration tests with DB). 0 failures, 0 skips.

---

## Chunk 4: Service Wiring & Cleanup

### Task 4.1: Wire New Services

**Files:**
- Modify: `src/main.ts`
- Modify: `test/integration/test-engine.ts`

- [ ] **Step 1: Add `BatchExecutorService` and `WorkflowTriggerService` to `main.ts`**

In `main.ts` (lines 28-34), add:

```typescript
const batchExecutor = new BatchExecutorService(dataSource, eventBus);
const workflowTrigger = new WorkflowTriggerService(dataSource, engineService, eventBus);
```

Pass them to `registerEventHandlers()` and inject `batchExecutor` into `StepProcessorService`.

- [ ] **Step 2: Update `TestEngine` in `test-engine.ts`**

Add `batchExecutor` and `workflowTrigger` to the `createTestEngine()` function and expose them on the returned engine object.

- [ ] **Step 3: Update `registerEventHandlers()` signature**

Add `batchExecutor` and `workflowTrigger` parameters.

- [ ] **Step 4: Run full integration test suite**

```bash
pushd packages/@n8n/engine && pnpm test:db && popd
```

- [ ] **Logical checkpoint** — wire BatchExecutor and WorkflowTrigger services (do not commit)

### Task 4.2: Build and Typecheck

- [ ] **Step 1: Run typecheck**

```bash
pushd packages/@n8n/engine && pnpm typecheck 2>&1 | tail -20 && popd
```

Fix any remaining type errors from the refactoring.

- [ ] **Step 2: Run full build**

```bash
pushd packages/@n8n/engine && pnpm build > /tmp/engine-build.log 2>&1 && echo "OK" || tail -20 /tmp/engine-build.log && popd
```

- [ ] **Step 3: Run ALL tests**

```bash
pushd packages/@n8n/engine && pnpm test && popd  # unit tests
pushd packages/@n8n/engine && pnpm test:db && popd  # integration tests
```

- [ ] **Step 4: Logical checkpoint** — all type errors and test failures from SDK redesign resolved (do not commit)

### Chunk 4 Verification Gate

- [ ] Run the full verification gate (typecheck, build, unit tests, integration tests with DB). 0 failures, 0 skips. This is the critical gate — all core engine changes are complete.

---

## Chunk 5: Examples Overhaul

### Task 5.1: Update Existing Examples

**Files:**
- Modify: all 17 files in `examples/`

- [ ] **Step 1: Update examples that use `ctx.sleep()`**

Files to change:
- `11-sleep-and-resume.ts`: Replace `await ctx.sleep(5000)` with `await ctx.sleep({ name: 'Wait', duration: 5000 })`
- `12-multi-wait-pipeline.ts`: Replace all `ctx.sleep()` and `ctx.waitUntil()` calls

- [ ] **Step 2: Verify all examples compile**

For each example:
```bash
pushd packages/@n8n/engine && node dist/cli/index.js run examples/01-hello-world.ts 2>&1 | tail -5 && popd
```

Run through all 17 examples, fix any that fail due to SDK changes.

- [ ] **Logical checkpoint** — update all examples to new SDK (sleep config, no in-step sleep) (do not commit)

### Task 5.2: Add New Examples

**Files:**
- Create: `examples/18-batch-processing.ts`
- Create: `examples/19-trigger-workflow.ts`
- Create: `examples/20-order-routing.ts`
- Create: `examples/21-product-catalog.ts`

- [ ] **Step 1: Create batch processing example**

`examples/18-batch-processing.ts`:
```typescript
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Batch Processing',
	async run(ctx) {
		const orders = await ctx.step(
			{ name: 'Fetch Orders', icon: 'database', color: '#3b82f6' },
			async () => [
				{ id: 1, amount: 100 },
				{ id: 2, amount: 200 },
				{ id: 3, amount: 300 },
			],
		);

		const results = await ctx.step(
			{
				name: 'Process Order',
				icon: 'package',
				color: '#8b5cf6',
				batch: { onItemFailure: 'continue' },
				retry: { maxAttempts: 2, baseDelay: 500 },
			},
			orders,
			async (order) => ({
				orderId: order.id,
				processed: true,
				total: order.amount * 1.1,
			}),
		);

		return await ctx.step(
			{ name: 'Generate Report', icon: 'file-text', color: '#10b981' },
			async () => ({
				totalOrders: results.length,
				succeeded: results.filter(r => r.status === 'fulfilled').length,
				failed: results.filter(r => r.status === 'rejected').length,
			}),
		);
	},
});
```

- [ ] **Step 2: Create order routing example (ported from code-engine)**

`examples/20-order-routing.ts` — translates the code-engine's `@POST('/orders')` → if/else → `processOrder`/`handleInquiry` pattern:

```typescript
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Order Routing',
	triggers: [webhook('/orders', { method: 'POST', responseMode: 'lastNode' })],
	async run(ctx) {
		const request = await ctx.step(
			{ name: 'Parse Request', icon: 'inbox', color: '#6366f1' },
			async () => ctx.triggerData,
		);

		if (request.body?.type === 'order') {
			return await ctx.step(
				{ name: 'Process Order', icon: 'shopping-cart', color: '#10b981' },
				async () => ({
					status: 'processed',
					orderId: request.body.id,
					total: request.body.amount * 1.1,
				}),
			);
		} else {
			return await ctx.step(
				{ name: 'Handle Inquiry', icon: 'message-circle', color: '#f59e0b' },
				async () => ({
					status: 'inquiry_received',
					message: `We received your inquiry: ${request.body?.message}`,
				}),
			);
		}
	},
});
```

- [ ] **Step 3: Create product catalog example (ported from code-engine)**

`examples/21-product-catalog.ts` — translates the code-engine's `@GET('/products')` → switch/case pattern:

```typescript
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Product Catalog',
	triggers: [webhook('/products', { method: 'GET', responseMode: 'lastNode' })],
	async run(ctx) {
		const params = await ctx.step(
			{ name: 'Parse Params', icon: 'search', color: '#6366f1' },
			async () => ctx.triggerData.query as Record<string, string>,
		);

		const category = params.category ?? 'all';

		switch (category) {
			case 'electronics':
				return await ctx.step(
					{ name: 'Get Electronics', icon: 'cpu', color: '#3b82f6' },
					async () => ({ products: ['Laptop', 'Phone', 'Tablet'], category }),
				);
			case 'books':
				return await ctx.step(
					{ name: 'Get Books', icon: 'book', color: '#8b5cf6' },
					async () => ({ products: ['TypeScript Handbook', 'Clean Code'], category }),
				);
			default:
				return await ctx.step(
					{ name: 'Get All Products', icon: 'list', color: '#10b981' },
					async () => ({ products: ['Laptop', 'Phone', 'TypeScript Handbook', 'Clean Code'], category: 'all' }),
				);
		}
	},
});
```

- [ ] **Step 4: Verify new examples run**

```bash
pushd packages/@n8n/engine
DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test \
  node dist/cli/index.js run examples/18-batch-processing.ts
DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test \
  node dist/cli/index.js run examples/20-order-routing.ts --input '{"body":{"type":"order","id":"123","amount":100}}'
popd
```

- [ ] **Logical checkpoint** — add batch, trigger-workflow, order-routing, product-catalog examples (do not commit)

### Chunk 5 Verification Gate

- [ ] Run the full verification gate. Additionally, run each new example via the CLI to verify they execute successfully.

---

## Chunk 6: Infrastructure — Docker & Performance

### Task 6.1: Multi-Config Docker Compose Files

**Files:**
- Create: `docker-compose.perf-single.yml`
- Create: `docker-compose.perf-multi.yml`
- Create: `docker-compose.perf-redis.yml`
- Create: `docker-compose.perf-heavy-db.yml`
- Create: `docker-compose.perf-constrained.yml`

- [ ] **Step 1: Create single-instance baseline**

`docker-compose.perf-single.yml`: 1 engine (built), 1 Postgres on tmpfs, InfluxDB, Grafana. Same as existing `docker-compose.perf.yml` but with explicit resource defaults.

- [ ] **Step 2: Create multi-instance config**

`docker-compose.perf-multi.yml`: 3 engine instances (engine-1, engine-2, engine-3), each polling the same Postgres. Different ports (3101, 3102, 3103). Validates `SELECT FOR UPDATE SKIP LOCKED` under multi-worker contention.

- [ ] **Step 3: Create Redis config**

`docker-compose.perf-redis.yml`: Same as multi but adds Redis 7 Alpine. Engine instances configured with `REDIS_URL=redis://redis:6379`. Broadcaster subscribes to Redis channels.

- [ ] **Step 4: Create heavy-db config**

`docker-compose.perf-heavy-db.yml`: 1 engine, 1 Postgres with `deploy.resources.limits: cpus: '4', memory: 2G` and tuned `shared_buffers`, `work_mem`.

- [ ] **Step 5: Create constrained config**

`docker-compose.perf-constrained.yml`: 1 engine with `deploy.resources.limits: cpus: '0.5', memory: 256M`, default Postgres.

- [ ] **Logical checkpoint** — add 5 docker compose configs for automated benchmarking (do not commit)

### Task 6.2: Automated Benchmark Script

**Files:**
- Create: `perf/benchmark.sh`

- [ ] **Step 1: Write the benchmark runner**

The script:
1. Iterates over each `docker-compose.perf-*.yml` file
2. For each: start → wait for ready → seed → run k6 → collect results → tear down
3. Outputs a markdown comparison table to `perf/results/YYYY-MM-DD-benchmark.md`

- [ ] **Step 2: Test with single config**

```bash
pushd packages/@n8n/engine && bash perf/benchmark.sh --config perf-single && popd
```

- [ ] **Logical checkpoint** — automated multi-config benchmark script with markdown report (do not commit)

### Chunk 6 Verification Gate

- [ ] Run the full verification gate. Docker compose files should be validated with `docker compose -f <file> config` for each config.

---

## Chunk 7: UI Changes

### Task 7.1: Streaming Chunk Indicator

**Files:**
- Modify: `src/web/src/stores/execution.store.ts`
- Modify: `src/web/src/components/StepCard.vue`

- [ ] **Step 1: Track chunk counts per step in execution store**

In `execution.store.ts`, add state:

```typescript
chunkCounts: {} as Record<string, number>,  // stepId -> chunk count
chunks: {} as Record<string, unknown[]>,     // stepId -> chunk data array
```

In the SSE `onmessage` handler, when event type is `step:chunk`:

```typescript
if (parsed.type === 'step:chunk') {
	const stepId = parsed.stepId;
	this.chunkCounts[stepId] = (this.chunkCounts[stepId] ?? 0) + 1;
	if (!this.chunks[stepId]) this.chunks[stepId] = [];
	this.chunks[stepId].push(parsed.data);
}
```

- [ ] **Step 2: Show chunk indicator on StepCard**

In `StepCard.vue`, when the step is running and has chunks:

```vue
<div v-if="chunkCount > 0" class="chunk-indicator" @click="showChunks = !showChunks">
  streaming ({{ chunkCount }} chunks)
</div>
<div v-if="showChunks" class="chunk-log">
  <pre v-for="(chunk, i) in chunks" :key="i">{{ JSON.stringify(chunk) }}</pre>
</div>
```

- [ ] **Logical checkpoint** — streaming chunk indicator on step cards (PoC) (do not commit)

### Task 7.2: New Node Type Visuals

**Files:**
- Modify: `src/web/src/components/ExecutionGraph.vue`
- Modify: `src/web/src/components/GraphCanvas.vue`
- Modify: `src/web/src/components/lucide-paths.ts`

- [ ] **Step 1: Add icons for new node types**

In `lucide-paths.ts`, add paths for `clock` (sleep), `layers` (batch), `external-link` (trigger-workflow) if not already present.

- [ ] **Step 2: Update node rendering in GraphCanvas and ExecutionGraph**

In both components, update the node rendering logic to:
- Sleep nodes: dashed border, clock icon, show duration text
- Batch nodes: stacked-layers icon, show item count badge in execution mode
- Trigger-workflow nodes: external-link icon, show target workflow name

- [ ] **Step 3: Add batch summary badge in ExecutionGraph**

When a batch node exists in execution mode, overlay a badge showing:
- While running: `47/100` (completed/total)
- When done: `97✓ 3✗`

The badge data comes from counting child step executions with matching `parentStepExecutionId`.

- [ ] **Logical checkpoint** — add visual treatment for sleep, batch, and trigger-workflow graph nodes (do not commit)

### Chunk 7 Verification Gate

- [ ] Run the full verification gate. Additionally, start the dev server (`pnpm dev` + `pnpm dev:web`) and manually verify the UI renders new node types and streaming indicator.

---

## Chunk 8: Documentation Updates

### Task 8.1: Update Module Documentation

Every module documentation file must be rewritten to reflect the final implemented
state — not the old PoC design. Each doc should accurately describe what exists in
the codebase after all chunks are complete.

**Files:**
- Modify: `src/sdk/SDK.md`
- Modify: `src/graph/GRAPH.md`
- Modify: `src/transpiler/TRANSPILER.md`
- Modify: `src/engine/ENGINE.md`
- Modify: `src/database/DATABASE.md`
- Modify: `src/api/API.md`
- Modify: `src/cli/CLI.md`
- Modify: `src/web/WEB.md`
- Modify: `test/TESTING.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update SDK.md**

- Document new `SleepConfig`, `BatchConfig`, `TriggerWorkflowConfig` interfaces
- Document approval step flow (step returns context, result has `approved` boolean)
- Update `ExecutionContext` documentation (new `sleep` signature, `triggerWorkflow`, batch overload of `step`)
- Remove `SleepRequestedError` and `WaitUntilRequestedError` sections
- Remove `continuationRef` from type docs
- Update data flow diagrams for sleep (standalone node, not error-based)
- Update data flow diagrams for approval (step function → waiting_approval → approve/decline → result)
- Document that `ctx.sleep()` and `ctx.waitUntil()` are no longer on ExecutionContext

- [ ] **Step 2: Update GRAPH.md**

- Document new node types (`approval`, `batch`, `sleep`, `trigger-workflow`)
- Document `stepFunctionRef: null` for sleep and approval nodes
- Remove continuation/fan-out method documentation
- Document `getBatchChildStepId()` replacing `getFanOutChildStepId()`
- Update the `GraphNodeData.type` union
- Update mermaid diagrams showing the new graph structure

- [ ] **Step 3: Update TRANSPILER.md**

- Document sequential-by-default algorithm (script order = edge order)
- Document new primitive detection (`ctx.sleep()`, 3-arg `ctx.step()`, `ctx.triggerWorkflow()`)
- Document approval step detection (`stepType: 'approval'` → `type: 'approval'` node)
- Document dynamic sleep duration handling
- Remove documentation of the old regex-based primary dependency resolution
- Remove documentation of SleepRequestedError/continuation splitting
- Update data flow diagrams

- [ ] **Step 4: Update ENGINE.md**

- Document `BatchExecutorService` and `WorkflowTriggerService`
- Document sleep execution flow (Wait node, no child steps, no error throwing)
- Document approval execution flow (step fn → waiting_approval → /approve → result)
- Document dual timeout mechanism (Promise.race + DB-level timeoutAt)
- Document wake-on-insert + exponential decay polling
- Remove continuation/resolveParentStep-for-sleep documentation (retain for batch)
- Document batch child step lifecycle
- Update all 8 data flow diagrams

- [ ] **Step 5: Update DATABASE.md**

- Document new `timeoutAt` column on `workflow_step_execution`
- Update `StepType` enum documentation (new values: `Batch`, `Sleep`, `TriggerWorkflow`)
- Update state machine diagrams for approval flow
- Update entity documentation to reflect removal of sleep-related child step patterns

- [ ] **Step 6: Update remaining docs**

- `API.md`: Document approval endpoint behavior with new flow, note batch step executions in GET /steps
- `CLI.md`: No structural changes, but verify commands work with new node types
- `WEB.md`: Document streaming PoC, batch badge, new node type visuals, paused vs skipped rendering
- `TESTING.md`: Document new integration test files (batch, trigger-workflow), updated sleep tests
- `CLAUDE.md`: Update module documentation table, add references to new services

- [ ] **Logical checkpoint** — all module documentation updated to reflect final implemented state (do not commit)

---

## Chunk 9: Bug Fixes & Code Quality (from PoC review)

Issues identified during the staff-level review of the engine v2 PoC. These are
addressed as part of the SDK redesign work since the code is being touched anyway.

### Task 9.1: SDK / Error Handling Fixes

- [ ] **NonRetriableError classification bypass** — Add `instanceof NonRetriableError`
  check in `buildErrorData()` (`src/engine/errors/error-classifier.ts`) before the
  unknown error fallthrough. Return `code: 'NON_RETRIABLE'`, `retriable: false`.
  Add tests.

- [ ] **triggerData getter returns wrong predecessor** — Fix `buildStepContext()` in
  `src/engine/step-processor.service.ts` to identify the trigger step's ID from the
  graph and return that specific predecessor's output instead of `inputRecord[keys[0]]`.

### Task 9.2: Transpiler Fixes

- [ ] **Silent esbuild failure fallback** — In `compileWithEsbuild()`
  (`src/transpiler/transpiler.service.ts`), catch the esbuild error, parse it, add
  to the `errors` array with line/column information. Never return raw TypeScript as
  compiled output.

- [ ] **Retry config parsed via regex** — Replace `parseRetryConfig()` with ts-morph
  AST extraction of property values from the retry object literal.

### Task 9.3: API Fix

- [ ] **Stack trace leakage** — In the global error handler (`src/api/server.ts`),
  remove `stack` from the response. Return only `{ error: message }`.

### Task 9.4: CLI Fix

- [ ] **Duplicated service wiring** — Extract a `createEngine(dataSource)` factory
  function. Replace the 5 duplicated initialization blocks in `execute.ts`, `run.ts`,
  `watch.ts`, `bench.ts`, and `main.ts` with a single call.

### Task 9.5: Graph Fix

- [ ] **No cycle detection** — Add `validate()` method to `WorkflowGraph` using
  topological sort (Kahn's algorithm). Call at construction time. Throw on cycle.
  Add tests.

### Task 9.6: Engine Core Fixes

- [ ] **Hardcoded stale recovery** — Replace the 330s hardcoded threshold in
  `recoverStaleSteps()` with per-step `timeoutAt` column checks. Each step's timeout
  is calculated at creation time from its config.

- [ ] **SQL interpolation** — Replace string interpolation in `recoverStaleSteps()`
  with parameterized query.

- [ ] **Async event handler unhandled rejections** — Wrap handler invocations in
  `emit()` (`src/engine/event-bus.service.ts`) with try/catch for async handlers.

- [ ] **Module cache unbounded growth** — Add TTL-based eviction to the `moduleCache`
  Map in `src/engine/step-processor.service.ts`. Purge entries not accessed within
  5 minutes. Add size limit as safety cap.

- [ ] **processStep decomposition** — Break the 298-line `processStep()` method into
  focused private methods: `loadExecutionContext()`, `executeWithTimeout()`,
  `handleStepError()`, `handleInfrastructureError()`, `traceErrorToSource()`.

### Task 9.7: Web UI Fixes

- [ ] **WorkspaceView decomposition** — Extract from 2,741-line god component into:
  composables (`useWorkflowEditor`, `useExecutionMonitor`, `useWebhookTester`,
  `usePaneResize`) and sub-components (`WorkflowSelector`, `WebhookTester`,
  `StepDetailPanel`, `ExecutionTimeline`).

- [ ] **Graph component deduplication** — Extract shared BFS layout logic from
  `GraphCanvas.vue` and `ExecutionGraph.vue` into a `useGraphLayout()` composable.

- [ ] **JsonViewer dark mode** — Replace hardcoded colors with CSS variables that
  respond to `prefers-color-scheme: dark`.

### Task 9.8: Testing Fixes

- [ ] **Flaky timing-dependent tests** — Use workflows with artificial delays
  (200ms+ per step) in pause/cancel tests. Subscribe to events BEFORE starting
  execution. Replace `setTimeout` synchronization with event-based coordination.

- [ ] **Inconsistent test infrastructure** — Extend `TestEngine` with optional
  `app` property for Express app creation. Migrate `approval.test.ts` and
  `webhook.test.ts` to use `TestEngine`.

- [ ] **Missing unit tests** — Add unit test files for `StepProcessorService`,
  `StepPlannerService`, `CompletionService`, `EngineService`, and
  `StepQueueService` with mocked DataSource and EventBus.

### Chunk 9 Verification Gate

- [ ] Run the full verification gate (format, typecheck, build, unit tests, integration tests with DB). 0 failures, 0 skips.

---

## Chunk 10: Agent Framework Integration

Integrate the `@n8n/agents` framework so that agents can be used as first-class steps in engine workflows. An agent step is a single graph node that encapsulates the full agentic loop (LLM calls, tool execution, suspend/resume). From the graph's perspective, it behaves like any other step — it gets invoked, may complete or suspend, and produces output that flows to successors.

**Depends on:** Chunks 1–4 (core engine primitives). Can be developed in parallel with Chunks 5–9.

**Key design decisions:**

- **Single graph node**: An agent appears as one node in the graph/UI. Internal tool calls and LLM turns are visible in the step detail panel, not as separate graph nodes.
- **Suspend = structured completion**: When an agent tool suspends, the agent step *completes* with a structured result containing a status, an opaque state blob, a human-readable suspend payload, and a resume condition. The engine persists the blob and arranges the resume condition.
- **Re-invocation on resume**: When the resume condition fires, the engine re-invokes the same agent node, passing back the state blob and the resume data. The agent reconstructs from the blob and continues.
- **Filesystem state persistence**: Agent state blobs are stored on the filesystem (`<data-dir>/agent-state/<executionId>/<stepId>.json`) for simplicity. Can be moved to DB or object storage later.
- **Stream bridging (TODO)**: Streaming support is deferred. When implemented, agent `StreamChunk`s will be piped through `ctx.sendChunk()` so the engine's SSE broadcaster delivers them to the UI in real time.

---

### Task 10.1: SDK Types for Agent Steps

**Files:**
- Modify: `src/sdk/types.ts`
- Modify: `src/graph/graph.types.ts`
- Modify: `src/database/enums.ts`

- [ ] **Step 1: Add `agent()` to `ExecutionContext`**

```typescript
export interface AgentStepConfig {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	/** Timeout for the entire agent invocation (default: 600_000ms / 10 min) */
	timeout?: number;
}

export interface AgentStepResult {
	/** 'completed' when the agent finished, 'suspended' when a tool needs external input */
	status: 'completed' | 'suspended';
	/** Final agent output (when status === 'completed') */
	output?: unknown;
	/** Opaque snapshot blob for restoring agent state on resume (when status === 'suspended') */
	snapshot?: unknown;
	/** What condition must be met before the engine resumes this step */
	resumeCondition?: ResumeCondition;
	/** Human-readable payload describing what the tool needs (when status === 'suspended') */
	suspendPayload?: unknown;
	/** Token usage for this invocation */
	usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
	/** Tool calls made during this invocation */
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
}

export type ResumeCondition =
	| { type: 'approval' }
	| { type: 'chat'; prompt?: string }
	| { type: 'webhook'; path?: string };
```

Add to `ExecutionContext`:
```typescript
/**
 * Run an agent as a workflow step. The agent is built from the @n8n/agents
 * framework and executed within the engine's lifecycle (suspend/resume,
 * credential resolution).
 *
 * When a tool suspends, the step completes with status 'suspended' and the
 * engine arranges the resume condition. On resume, this method is called again
 * with the agent's state restored.
 */
agent: (agent: BuiltAgent, input: string | AgentMessage[]) => Promise<AgentStepResult>;
```

- [ ] **Step 2: Add `'agent'` to graph node types**

In `src/graph/graph.types.ts`, add `'agent'` to the `GraphNodeData.type` union.

Add to `GraphStepConfig`:
```typescript
/** Agent-specific config — populated by the transpiler from ctx.agent() calls */
agentConfig?: {
	/** Default timeout override for agent steps (longer than regular steps) */
	timeout?: number;
};
```

- [ ] **Step 3: Add `StepType.Agent` to enums**

In `src/database/enums.ts`:
```typescript
Agent = 'agent',
```

- [ ] **Step 4: Add `StepStatus.Suspended` to enums**

A new status distinct from `WaitingApproval` — agent suspension is a general concept, not specifically approval:
```typescript
Suspended = 'suspended',
```

- [ ] **Step 5: Run typecheck**

```bash
pushd packages/@n8n/engine && pnpm typecheck 2>&1 | tail -20 && popd
```

Expected: Errors in step-processor (new types not yet implemented). Correct — fixed in Task 10.3.

- [ ] **Logical checkpoint** — agent types defined in SDK, graph, and enums

### Task 10.2: Transpiler — Detect `ctx.agent()` Calls

**Files:**
- Modify: `src/transpiler/transpiler.service.ts`
- Test: `src/transpiler/__tests__/transpiler.test.ts`

- [ ] **Step 1: Write failing test for `ctx.agent()` detection**

```typescript
describe('agent primitive', () => {
	it('creates an agent node in the graph', () => {
		const source = `
			import { defineWorkflow } from '@n8n/engine/sdk';
			import { Agent, Tool } from '@n8n/agents';

			const searchTool = new Tool('search')
				.description('Search the web')
				.input(z.object({ query: z.string() }))
				.handler(async ({ query }) => ({ results: [] }));

			export default defineWorkflow({
				name: 'With Agent',
				async run(ctx) {
					const result = await ctx.agent(
						new Agent()
							.model('anthropic', 'claude-sonnet-4-5')
							.instructions('You are a research assistant')
							.tool(searchTool),
						'What are the latest trends?',
					);
				},
			});
		`;
		const result = transpiler.compile(source);
		expect(result.errors).toHaveLength(0);
		const agentNode = result.graph.nodes.find(n => n.type === 'agent');
		expect(agentNode).toBeDefined();
		expect(agentNode!.config.agentConfig).toBeDefined();
	});

	it('preserves the agent builder expression in compiled code', () => {
		// The Agent() builder call must survive compilation so it can
		// be executed at runtime to produce the BuiltAgent instance
		const source = `...`; // same as above
		const result = transpiler.compile(source);
		expect(result.compiledCode).toContain('new Agent()');
	});

	it('creates sequential edges: step → agent → step', () => {
		const source = `
			import { defineWorkflow } from '@n8n/engine/sdk';
			import { Agent } from '@n8n/agents';

			export default defineWorkflow({
				name: 'Agent Pipeline',
				async run(ctx) {
					await ctx.step({ name: 'Prepare' }, async () => ({ question: 'hello' }));
					const result = await ctx.agent(
						new Agent().model('anthropic', 'claude-sonnet-4-5').instructions('...'),
						'hello',
					);
					await ctx.step({ name: 'Save' }, async () => result);
				},
			});
		`;
		const result = transpiler.compile(source);
		const prepNode = result.graph.nodes.find(n => n.name === 'Prepare')!;
		const agentNode = result.graph.nodes.find(n => n.type === 'agent')!;
		const saveNode = result.graph.nodes.find(n => n.name === 'Save')!;
		expect(result.graph.edges).toContainEqual(
			expect.objectContaining({ from: prepNode.id, to: agentNode.id }),
		);
		expect(result.graph.edges).toContainEqual(
			expect.objectContaining({ from: agentNode.id, to: saveNode.id }),
		);
	});
});
```

- [ ] **Step 2: Add `ctx.agent()` detection to transpiler**

Add a detection method similar to `getCtxSleepType()`:

```typescript
private isCtxAgentCall(call: CallExpression): boolean {
	const expr = call.getExpression();
	if (Node.isPropertyAccessExpression(expr)) {
		return expr.getName() === 'agent' && expr.getExpression().getText() === 'ctx';
	}
	return false;
}
```

In the main `compile()` pipeline, detect `ctx.agent()` calls alongside step and sleep calls. For each:
- Create an `agent` graph node
- The first argument (the Agent builder expression) is preserved verbatim in the compiled step function — it's runtime code, not config
- The compiled step function calls the builder to get a `BuiltAgent`, then invokes it
- Sequential edges are built using the same positional ordering as steps/sleeps

**Key difference from sleep**: Agent nodes have a `stepFunctionRef` (like regular steps) because they execute code. Sleep nodes don't. The compiled function wraps the agent builder + invocation.

- [ ] **Step 3: Handle `@n8n/agents` imports in esbuild**

The transpiler compiles workflow source with esbuild. `@n8n/agents` must be marked as external (not bundled) so it resolves at runtime:

```typescript
// In compileWithEsbuild(), add to external list:
external: ['@n8n/engine/sdk', '@n8n/agents'],
```

- [ ] **Step 4: Run transpiler tests**

```bash
pushd packages/@n8n/engine && pnpm test -- src/transpiler/__tests__/transpiler.test.ts && popd
```

- [ ] **Logical checkpoint** — transpiler detects `ctx.agent()` and creates agent graph nodes

### Task 10.3: Step Processor — Agent Execution Bridge

This is the core integration. The step processor handles agent nodes by bridging between the engine lifecycle and the agent framework runtime.

**Files:**
- Modify: `src/engine/step-processor.service.ts`
- Create: `src/engine/agent-bridge.service.ts`
- Test: `src/engine/__tests__/agent-bridge.test.ts`

- [ ] **Step 1: Create `AgentBridgeService`**

```typescript
import type { BuiltAgent, GenerateResult } from '@n8n/agents';
import type { EngineEventBus } from './event-bus.service';
// TODO: streaming support — import StreamChunk when implementing stream bridging

export interface AgentInvocation {
	executionId: string;
	stepId: string;
	agent: BuiltAgent;
	input: string | unknown[];
	/** Opaque state blob from a previous suspension (undefined on first invocation) */
	resumeState?: unknown;
	/** Resume data from the external caller (approval decision, user input, etc.) */
	resumeData?: unknown;
}

export interface AgentInvocationResult {
	status: 'completed' | 'suspended';
	/** Final output (when completed) */
	output?: unknown;
	/** Opaque snapshot blob for restoring agent state on resume (when suspended) */
	snapshot?: unknown;
	/** What condition must be met before the engine resumes this step */
	resumeCondition?: ResumeCondition;
	/** Human-readable payload for the UI/caller (when suspended) */
	suspendPayload?: unknown;
	/** Token usage */
	usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
	/** Tool calls made */
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
}

export class AgentBridgeService {
	constructor(
		private readonly eventBus: EngineEventBus,
		private readonly stateDir: string, // e.g., '<data-dir>/agent-state'
	) {}

	/**
	 * Execute an agent invocation, bridging suspend/resume.
	 * TODO: Add streaming support — use agent.stream() and pipe chunks through sendChunk.
	 */
	async invoke(invocation: AgentInvocation): Promise<AgentInvocationResult> {
		const { agent, input, executionId, stepId, resumeState, resumeData } = invocation;

		let result: GenerateResult;

		if (resumeState && resumeData) {
			// --- RESUME PATH ---
			// Load the saved state, inject it back into the agent, resume
			const state = await this.loadState(executionId, stepId);
			if (!state) throw new Error(`No saved agent state for ${executionId}/${stepId}`);

			result = await agent.resume(resumeData, {
				runId: state.runId,
				toolCallId: state.toolCallId,
			});
		} else {
			// --- FIRST INVOCATION ---
			result = await agent.generate(input);
		}

		// Check if agent suspended
		if (result.pendingSuspend) {
			const stateBlob = agent.getState();
			await this.saveState(executionId, stepId, {
				...stateBlob,
				runId: result.pendingSuspend.runId,
				toolCallId: result.pendingSuspend.toolCallId,
			});

			return {
				status: 'suspended',
				snapshot: { runId: result.pendingSuspend.runId, toolCallId: result.pendingSuspend.toolCallId },
				resumeCondition: { type: 'approval' },
				suspendPayload: result.pendingSuspend.suspendPayload,
				usage: result.usage,
				toolCalls: result.toolCalls,
			};
		}

		// Agent completed normally
		await this.deleteState(executionId, stepId);
		return {
			status: 'completed',
			output: result.structuredOutput ?? this.extractTextOutput(result),
			usage: result.usage,
			toolCalls: result.toolCalls,
		};
	}

	// --- Filesystem state persistence ---

	private async saveState(executionId: string, stepId: string, state: unknown): Promise<void> {
		const path = this.statePath(executionId, stepId);
		await fs.mkdir(dirname(path), { recursive: true });
		await fs.writeFile(path, JSON.stringify(state));
	}

	private async loadState(executionId: string, stepId: string): Promise<unknown> {
		const path = this.statePath(executionId, stepId);
		const data = await fs.readFile(path, 'utf-8');
		return JSON.parse(data);
	}

	private async deleteState(executionId: string, stepId: string): Promise<void> {
		const path = this.statePath(executionId, stepId);
		await fs.unlink(path).catch(() => {});
	}

	private statePath(executionId: string, stepId: string): string {
		return join(this.stateDir, executionId, `${stepId}.json`);
	}
}
```

- [ ] **Step 2: Add agent handling to `processStep()`**

In `step-processor.service.ts`, add a code path for agent nodes (after the sleep handler, before regular step execution):

```typescript
// 5c. Handle agent steps
if (node?.type === 'agent') {
	this.eventBus.emit({
		type: 'step:started',
		executionId: execution.id,
		stepId: stepJob.stepId,
		attempt: stepJob.attempt,
	});

	// Load and execute the step function — it returns a BuiltAgent + input
	const stepFn = this.loadStepFunction(/* ... */);
	const ctx = this.buildStepContext(stepJob, execution);
	const { agent, input } = await stepFn(ctx);

	// Invoke via the bridge
	const result = await this.agentBridge.invoke({
		executionId: execution.id,
		stepId: stepJob.stepId,
		agent,
		input,
		resumeState: stepJob.metadata?.agentSnapshot,
		resumeData: stepJob.metadata?.agentResumeData,
	});

	if (result.status === 'suspended') {
		// Mark step as suspended, persist metadata for resume
		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Suspended,
				output: {
					suspendPayload: result.suspendPayload,
					resumeCondition: result.resumeCondition,
					usage: result.usage,
					toolCalls: result.toolCalls,
				},
				metadata: {
					...stepJob.metadata,
					agentSnapshot: result.snapshot,
					agentResumeCondition: result.resumeCondition,
				},
			})
			.where('id = :id', { id: stepJob.id })
			.execute();

		this.eventBus.emit({
			type: 'step:waiting',
			executionId: execution.id,
			stepId: stepJob.stepId,
		});
	} else {
		// Agent completed — normal step completion
		await this.updateStepAndEmit(stepJob, execution, {
			status: StepStatus.Completed,
			output: result.output,
			completedAt: new Date(),
			durationMs: Date.now() - startTime,
		});
	}
	return;
}
```

- [ ] **Step 3: (TODO) Implement stream consumption with chunk forwarding**

> **TODO:** Streaming support is deferred. When implemented, add a `consumeStream()` method that reads the agent's `ReadableStream<StreamChunk>` and forwards each chunk through the engine's event bus as `step:chunk` events. Switch `invoke()` to use `agent.stream()` / `agent.resume('stream', ...)` instead of `agent.generate()` / `agent.resume()`.

- [ ] **Step 4: Write unit tests for AgentBridgeService**

Test:
- First invocation: agent completes → returns `{ status: 'completed', output }`
- First invocation: agent suspends → saves state to filesystem, returns `{ status: 'suspended', suspendPayload }`
- Resume invocation: loads state, calls `agent.resume()`, agent completes → deletes state file
- Resume invocation: agent suspends again → updates state file
- State file cleanup on completion

- [ ] **Step 5: Run tests**

```bash
pushd packages/@n8n/engine && pnpm test -- src/engine/__tests__/agent-bridge.test.ts && popd
```

- [ ] **Logical checkpoint** — agent bridge service handles execution and suspend/resume

### Task 10.4: Resume Endpoint

When an agent step is suspended, the engine needs an endpoint to receive the resume signal.

**Files:**
- Modify: `src/api/step-execution.controller.ts`
- Modify: `src/engine/step-queue.service.ts`

- [ ] **Step 1: Add resume endpoint**

Extend the existing step execution controller:

```typescript
// POST /api/workflow-step-executions/:id/resume
// Body: { data: unknown }  — the resume payload (approval decision, user input, etc.)
```

The handler:
1. Loads the step execution, verifies `status === 'suspended'`
2. Sets `metadata.agentResumeData` to the provided data
3. Re-queues the step by setting `status: 'queued'`
4. The step queue picks it up, the step processor detects the resume metadata, and invokes the agent bridge with the saved state

- [ ] **Step 2: Update step processor to detect resume invocation**

In the agent handler (Task 10.3 Step 2), check `stepJob.metadata?.agentSnapshot` to determine if this is a resume. If present, pass it to `AgentBridgeService.invoke()`.

- [ ] **Step 3: Write integration test**

```typescript
describe('agent suspend/resume', () => {
	it('suspends on tool interrupt and resumes with approval data', async () => {
		// 1. Create workflow with agent step that has an approval tool
		// 2. Start execution → agent calls tool → suspends
		// 3. Verify step status is 'suspended'
		// 4. Verify state file exists on disk
		// 5. POST /resume with approval data
		// 6. Agent resumes → completes
		// 7. Verify step status is 'completed'
		// 8. Verify state file cleaned up
	});
});
```

- [ ] **Logical checkpoint** — resume endpoint re-queues suspended agent steps

### Task 10.5: Credential Resolution

Agents need API keys for LLM providers. The engine should resolve these from its secret management and inject them into the agent before execution.

**Files:**
- Modify: `src/engine/agent-bridge.service.ts`
- Modify: `src/engine/step-processor.service.ts`

- [ ] **Step 1: Resolve credentials before agent invocation**

The agent framework's `.credential('name')` declares a requirement. At execution time, the engine resolves it:

```typescript
// In the agent handler, before calling agentBridge.invoke():
// The step function returns the agent builder. Before invoking,
// the engine resolves any declared credentials via ctx.getSecret()
// and injects the API key into the agent's model configuration.
```

The exact mechanism depends on how the Agent builder exposes credential injection. Options:
- The compiled step function uses `ctx.getSecret()` directly to build the model config
- The engine introspects the agent's declared credentials and injects them

Start with the simpler approach: the compiled step function uses `ctx.getSecret()`:

```typescript
// What the user writes:
await ctx.agent(
	new Agent()
		.model('anthropic', 'claude-sonnet-4-5')
		.credential('my-anthropic-key'),
	'Hello',
);

// What the transpiler compiles to:
const apiKey = ctx.getSecret('my-anthropic-key');
const agent = new Agent()
	.model({ id: 'anthropic/claude-sonnet-4-5', apiKey })
	.instructions('...');
```

- [ ] **Logical checkpoint** — credentials resolved at execution time via engine secrets

### Task 10.6: Agent Step Event Types

**Files:**
- Modify: `src/engine/event-bus.types.ts`

- [ ] **Step 1: Add agent-specific event types**

```typescript
export interface StepAgentSuspendedEvent {
	type: 'step:agent_suspended';
	executionId: string;
	stepId: string;
	suspendPayload: unknown;
	toolName: string;
}

export interface StepAgentResumedEvent {
	type: 'step:agent_resumed';
	executionId: string;
	stepId: string;
}
```

Add to the `StepEvent` union and `EngineEvent`.

Note: Token streaming is deferred (TODO). When implemented, it will reuse `step:chunk` events — no new event type needed. The chunk `data` field will carry the typed `StreamChunk` from the agent framework.

- [ ] **Logical checkpoint** — agent-specific events defined

### Task 10.7: Integration Tests

**Files:**
- Create: `test/integration/agent.test.ts`

- [ ] **Step 1: Write end-to-end integration tests**

```typescript
describe('agent steps', () => {
	it('executes a simple agent step and returns output', async () => {
		// Agent with no tools, simple generate
		// Verify: step completes, output contains agent response
	});

	// TODO: streaming test — when streaming is implemented:
	// it('streams agent tokens as step chunks', async () => {
	//     // Agent with streaming
	//     // Verify: step:chunk events emitted with text-delta data
	// });

	it('agent step receives predecessor output as input', async () => {
		// step → agent (agent input references step output)
		// Verify: agent receives correct input from predecessor
	});

	it('agent step output flows to successor steps', async () => {
		// agent → step (step input references agent output)
		// Verify: downstream step receives agent result
	});

	it('suspends when agent tool requires approval', async () => {
		// Agent with approval tool → tool suspends
		// Verify: step status = 'suspended', state file exists, suspendPayload in output
	});

	it('resumes after approval and completes', async () => {
		// Continue from above → POST /resume with approval
		// Verify: agent resumes, completes, state file cleaned up
	});

	it('handles agent errors gracefully', async () => {
		// Agent with invalid model → error
		// Verify: step fails with error data, no dangling state
	});

	it('respects timeout for agent steps', async () => {
		// Agent with very long execution + short timeout
		// Verify: step times out, agent aborted
	});
});
```

- [ ] **Step 2: Run integration tests**

```bash
pushd packages/@n8n/engine && pnpm test:db -- test/integration/agent.test.ts && popd
```

- [ ] **Logical checkpoint** — agent integration tests passing

### Task 10.8: Example Workflows

**Files:**
- Create: `examples/22-agent-step.ts`
- Create: `examples/23-agent-with-tools.ts`
- Create: `examples/24-agent-approval-flow.ts`

- [ ] **Step 1: Simple agent step example**

```typescript
import { defineWorkflow } from '@n8n/engine/sdk';
import { Agent } from '@n8n/agents';

export default defineWorkflow({
	name: 'Agent Step',
	async run(ctx) {
		const prep = await ctx.step({ name: 'Prepare Question' }, async () => ({
			question: 'What are the key benefits of TypeScript?',
		}));

		const answer = await ctx.agent(
			new Agent()
				.model('anthropic', 'claude-sonnet-4-5')
				.instructions('You are a helpful programming assistant. Be concise.'),
			prep.question,
		);

		return await ctx.step({ name: 'Format Response' }, async () => ({
			question: prep.question,
			answer: answer.output,
			tokensUsed: answer.usage?.totalTokens,
		}));
	},
});
```

- [ ] **Step 2: Agent with tools example**

Agent that uses custom tools (web search, calculation) within a workflow.

- [ ] **Step 3: Agent approval flow example**

Agent with an approval tool — demonstrates suspend/resume within a workflow pipeline.

- [ ] **Logical checkpoint** — agent examples added and verified

### Chunk 10 Verification Gate

- [ ] Run the full verification gate (format, typecheck, build, unit tests, integration tests with DB). 0 failures, 0 skips.
- [ ] Verify agent state files are cleaned up after completed executions.
- [ ] TODO: Verify streaming works end-to-end once streaming support is implemented.

---

## Execution Order

```
Chunk 0 (Fix existing test failures — MUST be green before proceeding)
    ↓
Chunk 1 (SDK Types & Graph)
    ↓
Chunk 2 (Transpiler)
    ↓
Chunk 3 (Engine Core: Sleep, Batch, Polling, Trigger)
    ↓
Chunk 4 (Wiring & Cleanup)
    ↓
Chunk 5 (Examples)         Chunk 6 (Infrastructure)     Chunk 7 (UI)       Chunk 10 (Agent Integration)
    ↓                           ↓                          ↓                     ↓
                    Chunk 8 (Documentation)
                           ↓
                    Chunk 9 (Bug Fixes & Code Quality)
```

Chunks 5, 6, 7, and 10 can be executed in parallel after Chunk 4.
Chunk 10 depends on Chunks 1–4 for the core engine primitives (types, transpiler, step processor patterns).
Chunk 9 can be interleaved with other chunks when touching the same files.

### Final Verification Gate

- [ ] Run the full verification gate one last time
- [ ] Run ALL examples via CLI: `for f in examples/*.ts; do node dist/cli/index.js run "$f" 2>&1 | tail -3; done`
- [ ] Confirm 0 test failures, 0 skipped tests
- [ ] Confirm `pnpm build` succeeds
- [ ] Confirm `pnpm typecheck` succeeds
