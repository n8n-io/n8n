# Agent memory OpenTelemetry attributes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `gen_ai.memory.*` OpenTelemetry span instrumentation for conversation-history query/save and episodic-memory query/save in the `@n8n/agents` SDK runtime.

**Architecture:** One new standalone helper, `withMemorySpan`, added to the existing `runtime/telemetry/runtime-telemetry.ts` (same shape as the file's existing `withRootSpan`/`withToolSpan`). Four call sites wrap their existing memory read/write logic with it: two in `MemoryOrchestrator` (conversation history), two in `episodic-memory.ts` (episodic recall + indexer save). No new files; no change to what gets stored — this is observability only.

**Tech Stack:** TypeScript, Vitest. No new dependencies.

**Ticket:** [TRUST-379](https://linear.app/n8n/issue/TRUST-379/add-opentelemetry-tracing-to-agent-memory-operations). Branch: `trust-379-add-opentelemetry-tracing-to-agent-memory-operations` (already checked out).

**Spec:** `docs/superpowers/specs/2026-07-31-agent-memory-otel-attributes-design.md`

## Global Constraints

- Package: `packages/@n8n/agents`. Run `pnpm test`/`pnpm typecheck`/`pnpm lint` from inside that directory (per AGENTS.md), not the repo root, until the final verification task.
- No raw memory content (message text, recalled entry content) in any span attribute — ids and fixed generic labels only.
- `gen_ai.memory.operations` values used: `'created'` (saves) and the local extension `'query_memory'` (reads) — see spec's "Deviations from the draft spec".
- `gen_ai.memory.store.types` is only set to `'in_memory'` when `memory.describe().constructorName === 'InMemoryMemory'`; omitted for every other backend.
- Existing call sites that don't pass the new optional fields (`agentName`, `telemetry`) must keep compiling and behaving exactly as today — these fields must be optional with a safe fallback (`agentName ?? 'agent'`), never required.
- No changes to existing error-handling semantics (best-effort try/catch in `persistInputMessages`/`persistTurnDelta`, propagation in `saveToMemory`) — `withMemorySpan` only adds observability around calls that already succeed/throw exactly as before.

---

## Task 1: `withMemorySpan` helper in `runtime-telemetry.ts`

**Files:**
- Modify: `packages/@n8n/agents/src/runtime/telemetry/runtime-telemetry.ts`
- Test: `packages/@n8n/agents/src/runtime/__tests__/runtime-telemetry.test.ts`

**Interfaces:**
- Produces (used by Tasks 2-5):
  - `export type MemoryOperation = 'created' | 'deleted' | 'pruned' | 'query_memory';`
  - `export interface MemorySpanAttributes { ids?: string[]; descriptions?: string[]; operations?: MemoryOperation[]; types?: MemoryScopeType[]; owners?: string[]; storeTypes?: MemoryStoreType[]; storeNames?: string[]; }`
  - `export function inferMemoryStoreAttributes(memory: BuiltMemory): Pick<MemorySpanAttributes, 'storeTypes' | 'storeNames'>`
  - `export async function withMemorySpan<T>(kind: 'query_memory' | 'save_memory', agentName: string, telemetry: BuiltTelemetry | undefined, initialAttributes: MemorySpanAttributes, fn: () => Promise<{ result: T; attributes?: MemorySpanAttributes }>): Promise<T>`

- [ ] **Step 1: Add the `BuiltMemory` import**

In `packages/@n8n/agents/src/runtime/telemetry/runtime-telemetry.ts`, change line 6:

```ts
import type { AttributeValue, BuiltProviderTool, BuiltTelemetry, BuiltTool } from '../../types';
```

to:

```ts
import type {
	AttributeValue,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTelemetry,
	BuiltTool,
} from '../../types';
```

- [ ] **Step 2: Write the failing tests**

Open `packages/@n8n/agents/src/runtime/__tests__/runtime-telemetry.test.ts`. It already defines local `fakeSpan()` and `fakeTracer(span)` helpers (top of the file) and a `builtTelemetry(overrides)` helper — reuse both. Change the import on line 4 from:

```ts
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
```

to:

```ts
import { RuntimeTelemetry, withMemorySpan } from '../telemetry/runtime-telemetry';
```

Then append this new `describe` block at the end of the file:

```ts
describe('withMemorySpan()', () => {
	it('falls through to fn() without starting a span when telemetry is disabled, undefined, or the tracer is not active-span-capable', async () => {
		const disabled = builtTelemetry({ enabled: false, tracer: fakeTracer(fakeSpan()) });
		await expect(
			withMemorySpan('query_memory', 'my-agent', disabled, {}, async () => ({
				result: 'ok',
			})),
		).resolves.toBe('ok');

		const noTracer = builtTelemetry();
		await expect(
			withMemorySpan('query_memory', 'my-agent', noTracer, {}, async () => ({
				result: 'ok',
			})),
		).resolves.toBe('ok');

		await expect(
			withMemorySpan('query_memory', 'my-agent', undefined, {}, async () => ({
				result: 'ok',
			})),
		).resolves.toBe('ok');
	});

	it('opens a span named query_memory with gen_ai.memory.* attributes from initialAttributes', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });

		const result = await withMemorySpan(
			'query_memory',
			'my-agent',
			telemetry,
			{ types: ['session'], owners: ['resource-1'], storeTypes: ['in_memory'], storeNames: ['memory'] },
			async () => ({ result: { entries: 3 } }),
		);

		expect(result).toEqual({ entries: 3 });
		expect(tracer.startActiveSpan).toHaveBeenCalledTimes(1);
		const [name, options] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('query_memory');
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toEqual({
			'gen_ai.operation.name': 'query_memory',
			'gen_ai.agent.name': 'my-agent',
			'gen_ai.memory.types': ['session'],
			'gen_ai.memory.owners': ['resource-1'],
			'gen_ai.memory.store.types': ['in_memory'],
			'gen_ai.memory.store.names': ['memory'],
		});
		expect(span.end).toHaveBeenCalledTimes(1);
	});

	it('merges post-hoc attributes returned by fn() onto the span, named save_memory', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });

		await withMemorySpan(
			'save_memory',
			'my-agent',
			telemetry,
			{ owners: ['resource-1'] },
			async () => ({
				result: undefined,
				attributes: { ids: ['m1', 'm2'], operations: ['created', 'created'] },
			}),
		);

		const [name] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('save_memory');
		expect(span.setAttributes).toHaveBeenCalledWith({
			'gen_ai.operation.name': 'save_memory',
			'gen_ai.agent.name': 'my-agent',
			'gen_ai.memory.ids': ['m1', 'm2'],
			'gen_ai.memory.operations': ['created', 'created'],
		});
	});

	it('does not call setAttributes when fn() returns no post-hoc attributes', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });

		await withMemorySpan('query_memory', 'my-agent', telemetry, {}, async () => ({
			result: 'ok',
		}));

		expect(span.setAttributes).not.toHaveBeenCalled();
	});

	it('records the exception, sets error status, ends the span, and rethrows when fn() throws', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });
		const error = new Error('memory boom');

		await expect(
			withMemorySpan('query_memory', 'my-agent', telemetry, {}, () => {
				throw error;
			}),
		).rejects.toThrow('memory boom');

		expect(span.recordException).toHaveBeenCalledWith(error);
		expect(span.setStatus).toHaveBeenCalledWith({ code: 2, message: String(error) });
		expect(span.end).toHaveBeenCalledTimes(1);
	});
});

describe('inferMemoryStoreAttributes()', () => {
	it("returns storeTypes: ['in_memory'] and storeNames from describe() for InMemoryMemory", async () => {
		const { InMemoryMemory } = await import('../memory/memory-store');
		const { inferMemoryStoreAttributes } = await import('../telemetry/runtime-telemetry');
		const memory = new InMemoryMemory();

		expect(inferMemoryStoreAttributes(memory)).toEqual({
			storeTypes: ['in_memory'],
			storeNames: ['memory'],
		});
	});

	it('omits storeTypes for a backend it cannot identify, but keeps storeNames', async () => {
		const { inferMemoryStoreAttributes } = await import('../telemetry/runtime-telemetry');
		const customMemory = {
			describe: () => ({ name: 'n8n', constructorName: 'N8nMemory', connectionParams: null }),
		} as unknown as import('../../types').BuiltMemory;

		expect(inferMemoryStoreAttributes(customMemory)).toEqual({ storeNames: ['n8n'] });
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/@n8n/agents && pnpm test runtime-telemetry.test.ts
```

Expected: FAIL — `withMemorySpan` and `inferMemoryStoreAttributes` are not exported from `runtime-telemetry.ts` yet.

- [ ] **Step 4: Implement `withMemorySpan` and `inferMemoryStoreAttributes`**

In `packages/@n8n/agents/src/runtime/telemetry/runtime-telemetry.ts`, add this block after the `buildGenAiRootAttributes` function (i.e. right before the `/** Owns all telemetry concerns... */` comment that precedes `export class RuntimeTelemetry`):

```ts
export type MemoryOperation = 'created' | 'deleted' | 'pruned' | 'query_memory';
export type MemoryScopeType =
	| 'session'
	| 'task'
	| 'action'
	| 'agent'
	| 'team'
	| 'organization'
	| 'external';
export type MemoryStoreType =
	| 'vector_db'
	| 'kv_store'
	| 'document_db'
	| 'graph_db'
	| 'file_system'
	| 'in_memory'
	| 'rdbms';

/**
 * gen_ai.memory.* attribute bag for withMemorySpan(). All fields are
 * index-aligned arrays per the draft OTel GenAI memory semantic conventions
 * (open-telemetry/semantic-conventions-genai#35): position i across every
 * array describes the same memory item. 'query_memory' in `operations` is a
 * local extension — the draft only defines write-lifecycle values
 * (created/deleted/pruned), with no value for a pure read.
 */
export interface MemorySpanAttributes {
	ids?: string[];
	descriptions?: string[];
	operations?: MemoryOperation[];
	types?: MemoryScopeType[];
	owners?: string[];
	storeTypes?: MemoryStoreType[];
	storeNames?: string[];
}

/**
 * Best-effort gen_ai.memory.store.* attributes from a BuiltMemory's
 * descriptor. Only positively identifies `InMemoryMemory`; any other backend
 * gets `storeNames` from its declared name but no `storeTypes` guess.
 */
export function inferMemoryStoreAttributes(
	memory: BuiltMemory,
): Pick<MemorySpanAttributes, 'storeTypes' | 'storeNames'> {
	const descriptor = memory.describe();
	return {
		...(descriptor.name ? { storeNames: [descriptor.name] } : {}),
		...(descriptor.constructorName === 'InMemoryMemory' ? { storeTypes: ['in_memory'] } : {}),
	};
}

function buildMemorySpanAttributes(
	kind: 'query_memory' | 'save_memory',
	agentName: string,
	attrs: MemorySpanAttributes,
): Record<string, AttributeValue> {
	return {
		'gen_ai.operation.name': kind,
		'gen_ai.agent.name': agentName,
		...(attrs.ids?.length ? { 'gen_ai.memory.ids': attrs.ids } : {}),
		...(attrs.descriptions?.length ? { 'gen_ai.memory.descriptions': attrs.descriptions } : {}),
		...(attrs.operations?.length ? { 'gen_ai.memory.operations': attrs.operations } : {}),
		...(attrs.types?.length ? { 'gen_ai.memory.types': attrs.types } : {}),
		...(attrs.owners?.length ? { 'gen_ai.memory.owners': attrs.owners } : {}),
		...(attrs.storeTypes?.length ? { 'gen_ai.memory.store.types': attrs.storeTypes } : {}),
		...(attrs.storeNames?.length ? { 'gen_ai.memory.store.names': attrs.storeNames } : {}),
	};
}

/**
 * Wrap a memory query/save with a `query_memory`/`save_memory` span, mirroring
 * `withRootSpan`/`withToolSpan`'s no-op-when-disabled shape. `fn` returns both
 * the caller's result and, optionally, attributes only knowable after the
 * underlying call completes (e.g. which ids were actually fetched/saved) —
 * those get merged onto the span via `setAttributes`. Because callers pass the
 * same `telemetry.tracer` already active for the enclosing root/tool span, the
 * new span nests under it automatically.
 */
export async function withMemorySpan<T>(
	kind: 'query_memory' | 'save_memory',
	agentName: string,
	telemetry: BuiltTelemetry | undefined,
	initialAttributes: MemorySpanAttributes,
	fn: () => Promise<{ result: T; attributes?: MemorySpanAttributes }>,
): Promise<T> {
	if (!telemetry?.enabled || !isActiveSpanTracer(telemetry.tracer)) {
		return (await fn()).result;
	}

	return await telemetry.tracer.startActiveSpan(
		kind,
		{ attributes: buildMemorySpanAttributes(kind, agentName, initialAttributes) },
		async (span) => {
			try {
				const { result, attributes } = await fn();
				if (attributes) {
					span.setAttributes?.(buildMemorySpanAttributes(kind, agentName, attributes));
				}
				return result;
			} catch (error) {
				span.recordException?.(error);
				span.setStatus?.({ code: 2, message: String(error) });
				throw error;
			} finally {
				span.end();
			}
		},
	);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/@n8n/agents && pnpm test runtime-telemetry.test.ts
```

Expected: PASS, all tests including the pre-existing ones in this file.

- [ ] **Step 6: Typecheck**

```bash
cd packages/@n8n/agents && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/@n8n/agents/src/runtime/telemetry/runtime-telemetry.ts packages/@n8n/agents/src/runtime/__tests__/runtime-telemetry.test.ts
git commit -m "feat(agents): Add withMemorySpan helper for gen_ai.memory.* spans"
```

---

## Task 2: Conversation history query span

**Files:**
- Modify: `packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts:75-135` (`loadHistoryMessages`, `loadInto`)
- Test: `packages/@n8n/agents/src/runtime/__tests__/memory-orchestrator-history.test.ts`

**Interfaces:**
- Consumes: `withMemorySpan`, `inferMemoryStoreAttributes` from Task 1 (`../telemetry/runtime-telemetry`).
- Produces: `loadHistoryMessages(persistence: AgentPersistenceOptions, telemetry?: BuiltTelemetry): Promise<AgentDbMessage[]>` — second parameter is new and optional; existing callers (including all current tests) that omit it keep working unchanged.

- [ ] **Step 1: Write the failing test**

Add this import to `packages/@n8n/agents/src/runtime/__tests__/memory-orchestrator-history.test.ts` (after the existing imports):

```ts
import type { BuiltTelemetry } from '../../types/telemetry';
```

Append this new `describe` block at the end of the file:

```ts
describe('MemoryOrchestrator.loadHistoryMessages telemetry', () => {
	function fakeSpan() {
		return {
			end: vi.fn(),
			recordException: vi.fn(),
			setStatus: vi.fn(),
			setAttributes: vi.fn(),
		};
	}

	function fakeTracer(span: ReturnType<typeof fakeSpan>) {
		return {
			startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
				const spanFn = fn as (spanValue: ReturnType<typeof fakeSpan>) => Promise<unknown>;
				return await spanFn(span);
			}),
		};
	}

	it('opens a query_memory span with session/owner attributes and post-hoc ids', async () => {
		const store = new InMemoryMemory();
		const m1 = message('m1', 'first', new Date(2026, 4, 12, 14, 30));
		const m2 = message('m2', 'second', new Date(2026, 4, 12, 14, 31));
		await seedThread(store, [m1, m2]);

		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry: BuiltTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			tracer,
		};
		// buildOrchestrator()'s config has no `name`, and loadHistoryMessages
		// uses config.name for gen_ai.agent.name — build a named config directly
		// so that attribute is a real string, matching production (Agent.build()
		// always sets `name`).
		const config = {
			name: 'my-agent',
			memory: store,
			observationalMemory: {},
		} as unknown as AgentRuntimeConfig;
		const orchestrator = new MemoryOrchestrator(
			config,
			new BackgroundTaskTracker(),
			new AgentEventBus(),
			new RuntimeTelemetry(config),
		);

		const loaded = await orchestrator.loadHistoryMessages(
			{ threadId: THREAD_ID, resourceId: RESOURCE_ID },
			telemetry,
		);

		expect(loaded.map((m) => m.id)).toEqual(['m1', 'm2']);
		expect(tracer.startActiveSpan).toHaveBeenCalledTimes(1);
		const [name, options] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('query_memory');
		expect((options as { attributes: Record<string, unknown> }).attributes).toMatchObject({
			'gen_ai.operation.name': 'query_memory',
			'gen_ai.agent.name': 'my-agent',
			'gen_ai.memory.types': ['session'],
			'gen_ai.memory.owners': [RESOURCE_ID],
			'gen_ai.memory.store.types': ['in_memory'],
		});
		expect(span.setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({
				'gen_ai.memory.ids': ['m1', 'm2'],
				'gen_ai.memory.operations': ['query_memory', 'query_memory'],
			}),
		);
	});

	it('does not open a span when telemetry is undefined', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [message('m1', 'first', new Date(2026, 4, 12, 14, 30))]);

		const loaded = await buildOrchestrator(store).loadHistoryMessages({
			threadId: THREAD_ID,
			resourceId: RESOURCE_ID,
		});

		expect(loaded.map((m) => m.id)).toEqual(['m1']);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/@n8n/agents && pnpm test memory-orchestrator-history.test.ts
```

Expected: FAIL — `loadHistoryMessages` doesn't accept a second argument / no span is opened.

- [ ] **Step 3: Implement**

In `packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts`:

Add to the import block near the top (it currently has `import type { RuntimeTelemetry } from '../telemetry/runtime-telemetry';` at line 33) — replace that line with:

```ts
import {
	inferMemoryStoreAttributes,
	withMemorySpan,
	type RuntimeTelemetry,
} from '../telemetry/runtime-telemetry';
```

Replace the `loadHistoryMessages` method (lines 75-103) with:

```ts
	async loadHistoryMessages(
		persistence: AgentPersistenceOptions,
		telemetry?: BuiltTelemetry,
	): Promise<AgentDbMessage[]> {
		const memory = this.config.memory;

		if (!memory) return [];

		const { threadId, resourceId } = persistence;

		return await withMemorySpan(
			'query_memory',
			this.config.name,
			telemetry,
			{ types: ['session'], owners: [resourceId], ...inferMemoryStoreAttributes(memory) },
			async () => {
				if (this.config.observationalMemory && hasObservationLogObserverMemory(memory)) {
					const cursor = await memory.getCursor(threadId);

					// Trust the cursor only when an observation log actually stands in for
					// the pre-cursor messages. If the cursor advanced without observations
					// being persisted (cursor/observation desync), loading only
					// post-cursor messages would silently drop the entire prior
					// conversation, so we fall back to the full history instead.
					if (cursor && (await this.hasActiveObservations(memory, threadId))) {
						const messages = await memory.getMessagesForObservationScope(threadId, {
							since: {
								sinceCreatedAt: cursor.lastObservedAt,
								sinceMessageId: cursor.lastObservedMessageId,
							},
						});
						return { result: messages, attributes: this.queryResultAttributes(messages) };
					}
				}

				const messages = await memory.getMessages(threadId, { resourceId });
				return { result: messages, attributes: this.queryResultAttributes(messages) };
			},
		);
	}

	private queryResultAttributes(messages: AgentDbMessage[]): MemorySpanAttributes {
		return {
			ids: messages.map((m) => m.id),
			operations: messages.map(() => 'query_memory'),
			descriptions: ['conversation history'],
		};
	}
```

Update `loadInto` (lines 122-135) to resolve and pass telemetry:

```ts
	async loadInto(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		if (this.config.memory && options?.persistence?.threadId) {
			const telemetry = this.runtimeTelemetry.resolve(options);
			const memMessages = await this.loadHistoryMessages(options.persistence, telemetry);

			if (memMessages.length > 0) {
				list.addHistory(stripOrphanedToolMessages(memMessages));
			}
		}

		await this.setListObservationLogMemory(list, options?.persistence);
	}
```

Add `MemorySpanAttributes` to the type-only import from `'../telemetry/runtime-telemetry'` (combine with the import added above):

```ts
import {
	inferMemoryStoreAttributes,
	withMemorySpan,
	type MemorySpanAttributes,
	type RuntimeTelemetry,
} from '../telemetry/runtime-telemetry';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd packages/@n8n/agents && pnpm test memory-orchestrator-history.test.ts
```

Expected: PASS, including the three pre-existing tests in this file (they call `loadHistoryMessages` without the new second argument, which stays optional).

- [ ] **Step 5: Typecheck**

```bash
cd packages/@n8n/agents && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts packages/@n8n/agents/src/runtime/__tests__/memory-orchestrator-history.test.ts
git commit -m "feat(agents): Trace conversation-history reads with a query_memory span"
```

---

## Task 3: Conversation history save span

**Files:**
- Modify: `packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts` (`saveToMemory`, `persistInputMessages`, `persistTurnDelta`, new private `saveMessagesWithSpan`)
- Test: `packages/@n8n/agents/src/runtime/__tests__/memory-orchestrator-persist-input.test.ts`

**Interfaces:**
- Consumes: `withMemorySpan`, `inferMemoryStoreAttributes`, `MemorySpanAttributes` from Task 1 (already imported in Task 2).
- Produces: private `saveMessagesWithSpan(threadId: string, resourceId: string, messages: AgentDbMessage[], telemetry: BuiltTelemetry | undefined): Promise<void>`, used by all three save call sites.

- [ ] **Step 1: Write the failing tests**

Add this import to `packages/@n8n/agents/src/runtime/__tests__/memory-orchestrator-persist-input.test.ts` (after the existing imports):

```ts
import type { BuiltTelemetry } from '../../types/telemetry';
```

Append this new `describe` block at the end of the file:

```ts
describe('MemoryOrchestrator save-path telemetry', () => {
	function fakeSpan() {
		return {
			end: vi.fn(),
			recordException: vi.fn(),
			setStatus: vi.fn(),
			setAttributes: vi.fn(),
		};
	}

	function fakeTracer(span: ReturnType<typeof fakeSpan>) {
		return {
			startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
				const spanFn = fn as (spanValue: ReturnType<typeof fakeSpan>) => Promise<unknown>;
				return await spanFn(span);
			}),
		};
	}

	function fakeTelemetry(tracer: ReturnType<typeof fakeTracer>): BuiltTelemetry {
		return {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			tracer,
		};
	}

	function buildOrchestratorWithTelemetry(
		store: InMemoryMemory,
		telemetry: BuiltTelemetry,
	): MemoryOrchestrator {
		const config = { name: 'my-agent', memory: store, telemetry } as unknown as AgentRuntimeConfig;
		return new MemoryOrchestrator(
			config,
			new BackgroundTaskTracker(),
			new AgentEventBus(),
			new RuntimeTelemetry(config),
		);
	}

	it('persistInputMessages opens a save_memory span with created operations for the input ids', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		const span = fakeSpan();
		const telemetry = fakeTelemetry(fakeTracer(span));

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		await buildOrchestratorWithTelemetry(store, telemetry).persistInputMessages(list, PERSIST);

		const inputId = list.inputDelta()[0].id;
		expect(span.setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({
				'gen_ai.memory.ids': [inputId],
				'gen_ai.memory.operations': ['created'],
			}),
		);
	});

	it('saveToMemory opens a save_memory span with session/owner attributes', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = fakeTelemetry(tracer);

		const list = new AgentMessageList();
		list.addInput([userMsg('please build it')]);
		list.addResponse([assistantMsg('built the workflow')]);

		await buildOrchestratorWithTelemetry(store, telemetry).saveToMemory(list, PERSIST);

		expect(tracer.startActiveSpan).toHaveBeenCalledWith(
			'save_memory',
			expect.objectContaining({
				attributes: expect.objectContaining({
					'gen_ai.operation.name': 'save_memory',
					'gen_ai.memory.types': ['session'],
					'gen_ai.memory.owners': [RESOURCE_ID],
				}),
			}),
			expect.anything(),
		);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd packages/@n8n/agents && pnpm test memory-orchestrator-persist-input.test.ts
```

Expected: FAIL — no span is opened yet.

- [ ] **Step 3: Implement**

In `packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts`, add this new private method (place it right after `loadInto`, before `setListObservationLogMemory`):

```ts
	private async saveMessagesWithSpan(
		threadId: string,
		resourceId: string,
		messages: AgentDbMessage[],
		telemetry: BuiltTelemetry | undefined,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory) return;
		await withMemorySpan(
			'save_memory',
			this.config.name,
			telemetry,
			{ types: ['session'], owners: [resourceId], ...inferMemoryStoreAttributes(memory) },
			async () => {
				await saveMessagesToThread(memory, threadId, resourceId, messages);
				return {
					result: undefined,
					attributes: {
						ids: messages.map((m) => m.id),
						operations: messages.map(() => 'created' as const),
					},
				};
			},
		);
	}
```

Replace the body of `persistInputMessages`'s `try` block:

```ts
		try {
			await saveMessagesToThread(
				this.config.memory,
				options.persistence.threadId,
				options.persistence.resourceId,
				input,
			);
		} catch (error) {
```

with:

```ts
		try {
			const telemetry = this.runtimeTelemetry.resolve(options);
			await this.saveMessagesWithSpan(
				options.persistence.threadId,
				options.persistence.resourceId,
				input,
				telemetry,
			);
		} catch (error) {
```

Apply the same replacement to `persistTurnDelta`'s `try` block (same shape, `delta` instead of `input`):

```ts
		try {
			const telemetry = this.runtimeTelemetry.resolve(options);
			await this.saveMessagesWithSpan(
				options.persistence.threadId,
				options.persistence.resourceId,
				delta,
				telemetry,
			);
		} catch (error) {
```

Replace `saveToMemory`'s body:

```ts
	async saveToMemory(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		if (!this.config.memory || !options?.persistence) return;
		const delta = list.turnDelta();
		if (delta.length === 0) return;
		await saveMessagesToThread(
			this.config.memory,
			options.persistence.threadId,
			options.persistence.resourceId,
			delta,
		);

		// Memory jobs receive the execution counter so their LLM and embedding
		// usage contributes to token_count.

		const telemetry = this.runtimeTelemetry.resolve(options);
		const observationTasks = this.scheduleObservationLogJobs(
			options.persistence,
			options.executionCounter,
			telemetry,
		);
		this.scheduleEpisodicMemoryJob(options.persistence, observationTasks, options.executionCounter);
	}
```

with:

```ts
	async saveToMemory(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		if (!this.config.memory || !options?.persistence) return;
		const delta = list.turnDelta();
		if (delta.length === 0) return;
		const telemetry = this.runtimeTelemetry.resolve(options);
		await this.saveMessagesWithSpan(
			options.persistence.threadId,
			options.persistence.resourceId,
			delta,
			telemetry,
		);

		// Memory jobs receive the execution counter so their LLM and embedding
		// usage contributes to token_count.

		const observationTasks = this.scheduleObservationLogJobs(
			options.persistence,
			options.executionCounter,
			telemetry,
		);
		this.scheduleEpisodicMemoryJob(
			options.persistence,
			observationTasks,
			options.executionCounter,
			telemetry,
		);
	}
```

Update `scheduleEpisodicMemoryJob`'s signature to accept and forward `telemetry` (implementation of what it does with it comes in Task 5 — for now just accept and ignore, so `saveToMemory` above compiles):

```ts
	private scheduleEpisodicMemoryJob(
		persistence: AgentPersistenceOptions,
		observationTasks: Array<Promise<unknown>>,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
	): void {
```

(Leave the rest of the method body as-is for this task — `telemetry` is an unused parameter until Task 5 wires it into `runEpisodicMemoryIndexer`. This will trigger a lint warning; that's resolved in Task 5, which is the very next task, so don't add an eslint-disable here.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd packages/@n8n/agents && pnpm test memory-orchestrator-persist-input.test.ts memory-orchestrator-history.test.ts
```

Expected: PASS, including all pre-existing tests (best-effort error handling, idempotency, no-op cases).

- [ ] **Step 5: Typecheck**

```bash
cd packages/@n8n/agents && pnpm typecheck
```

Expected: no errors (Task 5 is immediately next, so a transient unused-parameter lint warning on `telemetry` in `scheduleEpisodicMemoryJob` is fine to leave for now — confirm lint separately after Task 5, not here).

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts packages/@n8n/agents/src/runtime/__tests__/memory-orchestrator-persist-input.test.ts
git commit -m "feat(agents): Trace conversation-history saves with a save_memory span"
```

---

## Task 4: Episodic recall (query) span

**Files:**
- Modify: `packages/@n8n/agents/src/runtime/memory/episodic-memory.ts:177-213` (`createRecallMemoryTool`)
- Modify: `packages/@n8n/agents/src/runtime/loop/runtime-context.ts:193-215` (`createRecallMemoryToolForRun`)
- Test: `packages/@n8n/agents/src/runtime/__tests__/episodic-memory.test.ts`

**Interfaces:**
- Consumes: `withMemorySpan`, `inferMemoryStoreAttributes` from Task 1.
- Produces: `createRecallMemoryTool` opts gain optional `agentName?: string` (defaults to `'agent'`). Telemetry comes from `ctx.parentTelemetry` inside the handler — no new opts field for it.

- [ ] **Step 1: Write the failing tests**

Add this import to `packages/@n8n/agents/src/runtime/__tests__/episodic-memory.test.ts` (alongside the existing imports at the top):

```ts
import type { BuiltTelemetry } from '../../types';
```

Append these two tests inside the existing `describe('createRecallMemoryTool', ...)` block (after the `'counts recall query embedding tokens...'` test, before its closing `});`):

```ts
		it('opens a query_memory span with resolved entry ids when ctx.parentTelemetry is provided', async () => {
			mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } } as never);
			const memory = new InMemoryMemory();
			const saved = await saveEpisodicEntry(memory, {
				resourceId: 'user-1',
				content: 'User chose Postgres for the memory store.',
				embedding: [1, 0],
			});
			const span = {
				end: vi.fn(),
				recordException: vi.fn(),
				setStatus: vi.fn(),
				setAttributes: vi.fn(),
			};
			const tracer = {
				startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
					const spanFn = fn as (spanValue: typeof span) => Promise<unknown>;
					return await spanFn(span);
				}),
			};
			const parentTelemetry: BuiltTelemetry = {
				enabled: true,
				recordInputs: true,
				recordOutputs: true,
				integrations: [],
				tracer,
			};
			const tool = createRecallMemoryTool({
				memory,
				config: { embedder: fakeEmbedder },
				scope: { resourceId: 'user-1' },
				agentName: 'my-agent',
			});
			if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

			await tool.handler({ query: 'what did we decide?' }, { parentTelemetry });

			expect(tracer.startActiveSpan).toHaveBeenCalledTimes(1);
			const [name, options] = tracer.startActiveSpan.mock.calls[0];
			expect(name).toBe('query_memory');
			expect((options as { attributes: Record<string, unknown> }).attributes).toMatchObject({
				'gen_ai.operation.name': 'query_memory',
				'gen_ai.agent.name': 'my-agent',
				'gen_ai.memory.types': ['agent'],
				'gen_ai.memory.owners': ['user-1'],
				'gen_ai.memory.store.types': ['in_memory'],
			});
			expect(span.setAttributes).toHaveBeenCalledWith(
				expect.objectContaining({
					'gen_ai.memory.ids': [saved.id],
					'gen_ai.memory.operations': ['query_memory'],
				}),
			);
		});

		it('does not open a span when ctx.parentTelemetry is absent', async () => {
			mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } } as never);
			const memory = new InMemoryMemory();
			const tool = createRecallMemoryTool({
				memory,
				config: { embedder: fakeEmbedder },
				scope: { resourceId: 'user-1' },
			});
			if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

			await expect(
				tool.handler({ query: 'what did we decide?' }, {}),
			).resolves.toEqual({ entries: [] });
		});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd packages/@n8n/agents && pnpm test episodic-memory.test.ts
```

Expected: FAIL — `createRecallMemoryTool` doesn't accept `agentName`, and no span is opened.

- [ ] **Step 3: Implement**

In `packages/@n8n/agents/src/runtime/memory/episodic-memory.ts`, add this import (alongside the existing relative imports near the top of the file):

```ts
import { inferMemoryStoreAttributes, withMemorySpan } from '../telemetry/runtime-telemetry';
```

Replace the `createRecallMemoryTool` function (lines 177-213):

```ts
export function createRecallMemoryTool(opts: {
	memory: BuiltMemory & BuiltEpisodicMemoryStore;
	config: EpisodicMemoryConfig;
	scope: EpisodicMemoryScope;
	executionCounter?: AgentExecutionCounter;
	agentName?: string;
}) {
	const normalized = withEpisodicMemoryDefaults(opts.config);

	return new Tool(RECALL_MEMORY_TOOL_NAME)
		.description(
			'Recall source-backed prior-session entries for explicit asks about previous conversations, earlier decisions, exact names, prior artifacts, remembered details, or similar historical situations.',
		)
		.systemInstruction(normalized.recallToolInstruction)
		.input(RecallMemoryInputSchema)
		.output(RecallMemoryOutputSchema)
		.handler(async ({ query }, ctx): Promise<RecallMemoryOutput> => {
			const { embed } = await import('ai');
			const { embedding: queryEmbedding, usage } = await embed({
				model: normalized.embedder,
				value: query,
				abortSignal: ctx.abortSignal,
			});
			incrementTokenCountFromUsage(opts.executionCounter, usage);
			return await withMemorySpan(
				'query_memory',
				opts.agentName ?? 'agent',
				ctx.parentTelemetry,
				{
					types: ['agent'],
					owners: [opts.scope.resourceId],
					...inferMemoryStoreAttributes(opts.memory),
				},
				async () => {
					const entries = await opts.memory.episodic.searchEntries(opts.scope, query, {
						topK: normalized.topK,
						queryEmbedding,
					});
					return {
						result: { entries: entries.map(toRecallToolEntry) },
						attributes: {
							ids: entries.map((entry) => entry.id),
							operations: entries.map(() => 'query_memory' as const),
						},
					};
				},
			);
		})
		.toModelOutput((output) => ({
			entries: output.entries.map((entry) => ({
				content: `Prior/historical entry: ${entry.content}`,
				createdAt: entry.createdAt,
			})),
		}))
		.build();
}
```

In `packages/@n8n/agents/src/runtime/loop/runtime-context.ts`, replace the final line of `createRecallMemoryToolForRun` (line 214):

```ts
		return createRecallMemoryTool({ memory, config: episodicMemory, scope, executionCounter });
```

with:

```ts
		return createRecallMemoryTool({
			memory,
			config: episodicMemory,
			scope,
			executionCounter,
			agentName: this.config.name,
		});
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd packages/@n8n/agents && pnpm test episodic-memory.test.ts
```

Expected: PASS, including all pre-existing `createRecallMemoryTool` tests (the token-counting test calls `tool.handler(..., {})` with no `parentTelemetry`, which must keep working).

- [ ] **Step 5: Typecheck**

```bash
cd packages/@n8n/agents && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/agents/src/runtime/memory/episodic-memory.ts packages/@n8n/agents/src/runtime/loop/runtime-context.ts packages/@n8n/agents/src/runtime/__tests__/episodic-memory.test.ts
git commit -m "feat(agents): Trace recall_memory searches with a query_memory span"
```

---

## Task 5: Episodic indexer save span

**Files:**
- Modify: `packages/@n8n/agents/src/runtime/memory/episodic-memory.ts:65-73,119-175` (`RunEpisodicMemoryIndexerOpts`, `runEpisodicMemoryIndexer`)
- Modify: `packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts` (`scheduleEpisodicMemoryJob`)
- Test: `packages/@n8n/agents/src/runtime/__tests__/episodic-memory.test.ts`

**Interfaces:**
- Consumes: `withMemorySpan`, `inferMemoryStoreAttributes` from Task 1 (import already added to `episodic-memory.ts` in Task 4).
- Produces: `RunEpisodicMemoryIndexerOpts` gains optional `telemetry?: BuiltTelemetry` and `agentName?: string` (defaults to `'agent'`).

- [ ] **Step 1: Write the failing tests**

Append these two tests inside the existing `describe('runEpisodicMemoryIndexer', ...)` block in `packages/@n8n/agents/src/runtime/__tests__/episodic-memory.test.ts` (after the last test, before its closing `});`):

```ts
	it('opens a save_memory span with created operations for the saved entry ids', async () => {
		const memory = new InMemoryMemory();
		const [observation] = await memory.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'User switched memory store to Postgres.',
				createdAt: new Date('2026-05-12T10:00:00.000Z'),
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'User switched memory store to Postgres.',
						sources: [
							{ observationId: observation.id, evidence: 'User switched memory store to Postgres' },
						],
					},
				],
			});
		const span = {
			end: vi.fn(),
			recordException: vi.fn(),
			setStatus: vi.fn(),
			setAttributes: vi.fn(),
		};
		const tracer = {
			startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
				const spanFn = fn as (spanValue: typeof span) => Promise<unknown>;
				return await spanFn(span);
			}),
		};
		const telemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			tracer,
		} as never;

		const result = await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { resourceId: 'user-1' },
			observationScope: { observationScopeId: 'thread-1' },
			threadId: 'thread-1',
			now: new Date('2026-05-12T10:01:00.000Z'),
			telemetry,
			agentName: 'my-agent',
		});

		expect(result).toEqual({ status: 'ran', entriesWritten: 1, observationsIndexed: 1 });
		expect(tracer.startActiveSpan).toHaveBeenCalledTimes(1);
		const [name, options] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('save_memory');
		expect((options as { attributes: Record<string, unknown> }).attributes).toMatchObject({
			'gen_ai.operation.name': 'save_memory',
			'gen_ai.agent.name': 'my-agent',
			'gen_ai.memory.types': ['agent'],
			'gen_ai.memory.owners': ['user-1'],
			'gen_ai.memory.store.types': ['in_memory'],
		});
		expect(span.setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({ 'gen_ai.memory.operations': ['created'] }),
		);
	});

	it('does not open a span when there are no candidates to save', async () => {
		const memory = new InMemoryMemory();
		const [observation] = await memory.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'User investigated webhook retries.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'Webhook retries were caused by a bad API key.',
						sources: [{ observationId: observation.id, evidence: 'bad API key' }],
					},
				],
			});
		const tracer = { startActiveSpan: vi.fn() };
		const telemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			tracer,
		} as never;

		// This extraction is rejected by validateCandidates (evidence text isn't
		// found verbatim in the source observation), so candidates.length === 0.
		const result = await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { resourceId: 'user-1' },
			observationScope: { observationScopeId: 'thread-1' },
			threadId: 'thread-1',
			telemetry,
		});

		expect(result).toEqual({ status: 'ran', entriesWritten: 0, observationsIndexed: 1 });
		expect(tracer.startActiveSpan).not.toHaveBeenCalled();
	});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd packages/@n8n/agents && pnpm test episodic-memory.test.ts
```

Expected: FAIL — `runEpisodicMemoryIndexer` doesn't accept `telemetry`/`agentName`, and no span is opened.

- [ ] **Step 3: Implement**

In `packages/@n8n/agents/src/runtime/memory/episodic-memory.ts`, add `BuiltTelemetry` to the existing type-only import from `'../../types'` (the block starting `import type { BuiltEpisodicMemoryStore, ... } from '../../types';`):

```ts
import type {
	BuiltEpisodicMemoryStore,
	BuiltMemory,
	BuiltTelemetry,
	EpisodicMemoryConfig,
	EpisodicMemoryEntry,
	EpisodicMemoryExtractionCandidate,
	EpisodicMemoryReflection,
	EpisodicMemoryReflectionMerge,
	EpisodicMemoryScope,
	EpisodicMemorySearchOptions,
	RetrievedEpisodicMemoryEntry,
} from '../../types';
```

Update `RunEpisodicMemoryIndexerOpts` (lines 65-73):

```ts
export interface RunEpisodicMemoryIndexerOpts {
	memory: BuiltMemory & BuiltEpisodicMemoryStore;
	config: EpisodicMemoryConfig;
	scope: EpisodicMemoryScope;
	observationScope: ObservationLogScope;
	threadId: string;
	now?: Date;
	executionCounter?: AgentExecutionCounter;
	telemetry?: BuiltTelemetry;
	agentName?: string;
}
```

Replace the candidate-saving block inside `runEpisodicMemoryIndexer` (currently):

```ts
	const savedEntries: EpisodicMemoryEntry[] = [];
	if (candidates.length > 0) {
		const { embedMany } = await import('ai');
		const { embeddings, usage } = await embedMany({
			model: normalized.embedder,
			values: candidates.map((entry) => entry.content),
		});
		incrementTokenCountFromUsage(opts.executionCounter, usage);
		for (const [index, candidate] of candidates.entries()) {
			const saved = await saveCandidate(opts, normalized, candidate, embeddings[index]);
			if (saved) savedEntries.push(saved);
		}
	}
```

with:

```ts
	const savedEntries: EpisodicMemoryEntry[] = [];
	if (candidates.length > 0) {
		await withMemorySpan(
			'save_memory',
			opts.agentName ?? 'agent',
			opts.telemetry,
			{
				types: ['agent'],
				owners: [opts.scope.resourceId],
				...inferMemoryStoreAttributes(opts.memory),
			},
			async () => {
				const { embedMany } = await import('ai');
				const { embeddings, usage } = await embedMany({
					model: normalized.embedder,
					values: candidates.map((entry) => entry.content),
				});
				incrementTokenCountFromUsage(opts.executionCounter, usage);
				for (const [index, candidate] of candidates.entries()) {
					const saved = await saveCandidate(opts, normalized, candidate, embeddings[index]);
					if (saved) savedEntries.push(saved);
				}
				return {
					result: undefined,
					attributes: {
						ids: savedEntries.map((entry) => entry.id),
						operations: savedEntries.map(() => 'created' as const),
					},
				};
			},
		);
	}
```

In `packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts`, update `scheduleEpisodicMemoryJob`'s body to forward `telemetry` and `this.config.name` into `runEpisodicMemoryIndexer`:

```ts
	private scheduleEpisodicMemoryJob(
		persistence: AgentPersistenceOptions,
		observationTasks: Array<Promise<unknown>>,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
	): void {
		const { memory, episodicMemory } = this.config;
		if (
			!memory ||
			!episodicMemory ||
			!isEpisodicMemoryEnabled(episodicMemory) ||
			!hasEpisodicMemoryStore(memory) ||
			!hasObservationLogStore(memory) ||
			!episodicMemory.extract
		) {
			return;
		}
		const scope = getEpisodicMemoryScope(persistence);
		if (!scope) return;

		const observationScope = this.getObservationLogScope(persistence);
		this.scheduleEpisodicMemoryTask(memory, scope.resourceId, async () => {
			await Promise.allSettled(observationTasks);
			await runEpisodicMemoryIndexer({
				memory,
				config: episodicMemory,
				scope,
				observationScope,
				threadId: persistence.threadId,
				executionCounter,
				telemetry,
				agentName: this.config.name,
			});
		});
	}
```

(This is the same signature added in Task 3; only the body — the two new fields on the `runEpisodicMemoryIndexer` call — changes here.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd packages/@n8n/agents && pnpm test episodic-memory.test.ts
```

Expected: PASS, including every pre-existing `runEpisodicMemoryIndexer` test (reflection, redaction, error propagation, cursor advancement — none of that logic changed, only wrapped).

- [ ] **Step 5: Typecheck and lint**

```bash
cd packages/@n8n/agents && pnpm typecheck && pnpm lint
```

Expected: no errors (the `telemetry` parameter added to `scheduleEpisodicMemoryJob` in Task 3 is now used, resolving any transient unused-parameter warning).

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/agents/src/runtime/memory/episodic-memory.ts packages/@n8n/agents/src/runtime/memory/memory-orchestrator.ts packages/@n8n/agents/src/runtime/__tests__/episodic-memory.test.ts
git commit -m "feat(agents): Trace episodic-memory indexer saves with a save_memory span"
```

---

## Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full package test suite**

```bash
cd packages/@n8n/agents && pnpm test
```

Expected: PASS, no regressions anywhere else in the package (in particular `agent-runtime.test.ts`, `inline-sub-agent-tools.test.ts`, `memory-builder-episodic.test.ts`, which touch the same call paths but weren't directly modified).

- [ ] **Step 2: Typecheck the whole package**

```bash
cd packages/@n8n/agents && pnpm typecheck
```

- [ ] **Step 3: Lint the whole package**

```bash
cd packages/@n8n/agents && pnpm lint
```

- [ ] **Step 4: Confirm no other package broke**

```bash
cd /Users/rod/Documents/programming/n8n && pnpm --filter @n8n/agents... build
```

Expected: succeeds (this rebuilds `@n8n/agents` and any workspace package that depends on its build output, catching cross-package type breakage).

- [ ] **Step 5: Review the final diff**

```bash
git diff master --stat
```

Confirm only the expected files changed: `runtime-telemetry.ts`, `memory-orchestrator.ts`, `episodic-memory.ts`, `runtime-context.ts`, their four test files, plus the two `docs/superpowers/` spec/plan files.
