# Agent SDK memory OpenTelemetry attributes

Status: approved (design)
Scope: `packages/@n8n/agents/src`

## Problem

`packages/@n8n/agents/src/sdk/agent.ts` and its runtime already emit OpenTelemetry
spans for the agent loop (`invoke_agent` root span) and tool calls (`execute_tool
{name}` spans), via `RuntimeTelemetry` in `runtime/telemetry/runtime-telemetry.ts`.
Memory access — reading/writing conversation history, and querying/saving
episodic (cross-session) memory — has no equivalent instrumentation. There is no
way to see, in a trace, that a run read N history messages, or that the episodic
indexer wrote M new entries.

This adds that instrumentation, using the attribute vocabulary proposed in
[open-telemetry/semantic-conventions-genai#35](https://github.com/open-telemetry/semantic-conventions-genai/issues/35)
(and its linked draft "AI Memory Attributes" doc) as the base:

- `gen_ai.memory.ids` (string[]) — physical store identifiers for the memory items
- `gen_ai.memory.descriptions` (string[]) — human-readable purpose summaries
- `gen_ai.memory.operations` (string[] enum: `created`/`deleted`/`pruned`)
- `gen_ai.memory.types` (string[] enum: `session`/`task`/`action`/`agent`/`team`/`organization`/`external`)
- `gen_ai.memory.owners` (string[]) — owning entity id
- `gen_ai.memory.store.types` (string[] enum: `vector_db`/`kv_store`/`document_db`/`graph_db`/`file_system`/`in_memory`/`rdbms`)
- `gen_ai.memory.store.names` (string[]) — backend product/service name

All of these are array-valued and index-aligned (position *i* across every array
describes the same memory item) per the draft spec's design pattern.

The draft spec is still an open proposal: it only defines write-lifecycle
`operations` values (`created`/`deleted`/`pruned`), with no value for a pure
read. This design treats it as a base, not a contract — it adds a local
`query_memory` value to cover reads (see "Deviations from the draft spec"
below for this and other places we diverge).

## Non-goals

- **Observation-log reads/appends are not instrumented in this pass.**
  [TRUST-379](https://linear.app/n8n/issue/TRUST-379/add-opentelemetry-tracing-to-agent-memory-operations)'s
  stated goal also covers the observation-log observer/reflector jobs (a third
  memory subsystem — see `runtime/memory/observation-log-observer.ts` and
  `observation-log-reflector.ts`). Explicitly deferred as a fast-follow rather
  than folded into this change; tracked by the same ticket.
- Episodic memory reflection (drop/merge of existing entries) is not
  instrumented — only the create-path of the episodic indexer is. Reflection can
  be added later following the same pattern.
- No changes to what data is *stored* — this is observability only.

## Design

### Module: `RuntimeTelemetry` (runtime/telemetry/runtime-telemetry.ts)

Add directly to the existing file (no new files):

```ts
// 'query_memory' is a local extension (not in the draft spec's operations
// enum, which only defines write-lifecycle values) — see deviations below.
export type MemoryOperation = 'created' | 'deleted' | 'pruned' | 'query_memory';
export type MemoryScopeType =
	| 'session' | 'task' | 'action' | 'agent' | 'team' | 'organization' | 'external';
export type MemoryStoreType =
	| 'vector_db' | 'kv_store' | 'document_db' | 'graph_db' | 'file_system' | 'in_memory' | 'rdbms';

export interface MemorySpanAttributes {
	ids?: string[];
	descriptions?: string[];
	operations?: MemoryOperation[];
	types?: MemoryScopeType[];
	owners?: string[];
	storeTypes?: MemoryStoreType[];
	storeNames?: string[];
}
```

`inferMemoryStoreAttributes(memory: BuiltMemory): Pick<MemorySpanAttributes, 'storeTypes' | 'storeNames'>`
— calls `memory.describe()` (already implemented by every `BuiltMemory`).
`storeNames` is set from `descriptor.name` whenever it's non-empty. `storeTypes`
is set to `['in_memory']` only when `descriptor.constructorName ===
'InMemoryMemory'`; for any other backend it's omitted rather than guessed, even
though the draft spec marks the field "Required" — see deviations below.

`withMemorySpan<T>(kind: 'query_memory' | 'save_memory', agentName: string, telemetry: BuiltTelemetry | undefined, initialAttributes: MemorySpanAttributes, fn: () => Promise<{ result: T; attributes?: MemorySpanAttributes }>): Promise<T>`
— mirrors `withRootSpan`/`withToolSpan`'s existing shape and reuses the file's
existing private `isActiveSpanTracer` guard and `TelemetrySpan` interface:

- When `!telemetry?.enabled` or the tracer isn't active-span-capable: calls
  `fn()` directly and returns `result`, no span created.
- Otherwise opens a span named `kind` (i.e. literally `query_memory` or
  `save_memory`) via `telemetry.tracer.startActiveSpan`, with attributes built
  from `initialAttributes` (`gen_ai.operation.name`, `gen_ai.agent.name`, plus
  any non-empty `gen_ai.memory.*` arrays).
- Runs `fn()`. If it returns `attributes`, merges them onto the span via
  `span.setAttributes?.()` (this is how call sites report facts only known
  after the underlying call completes, e.g. which ids were actually
  fetched/saved).
- On throw: `span.recordException?.(error)`, `span.setStatus?.({ code: 2,
  message: String(error) })`, rethrow. Always `span.end()` in `finally`.

Because every call site's `telemetry.tracer` is the same tracer already active
for the enclosing root span (or, for the recall tool, the enclosing
`execute_tool` span), spans opened via `startActiveSpan` nest automatically
under it — no explicit parent/child wiring needed.

### Attribute mapping per call site

| Call site | `operation.name` | `types` | `owners` | `operations` |
|---|---|---|---|---|
| Conversation history read | `query_memory` | `['session']` | `[resourceId]` | `['query_memory', ...]` |
| Conversation history write | `save_memory` | `['session']` | `[resourceId]` | `['created', ...]` |
| `recall_memory` tool search | `query_memory` | `['agent']` | `[resourceId]` | `['query_memory', ...]` |
| Episodic indexer save | `save_memory` | `['agent']` | `[resourceId]` | `['created', ...]` |

`ids`/`descriptions` are always set post-hoc (via the `fn` return value), from
whatever the underlying call actually fetched/saved. `descriptions`, when set,
are fixed generic labels (e.g. `'conversation history'`) — never message text
or recalled entry content. `store.types`/`store.names` come from
`inferMemoryStoreAttributes`. `operations`, like `ids`, is index-aligned and
set post-hoc: on query spans every fetched id gets the value `'query_memory'`;
on save spans every saved id gets `'created'`.

### Instrumentation points

**a) Conversation query** — `MemoryOrchestrator.loadHistoryMessages(persistence,
telemetry)` (new second parameter). `loadInto()` resolves `telemetry =
this.runtimeTelemetry.resolve(options)` once and passes it down. The whole
method body — both the observation-log-cursor branch and the plain
`getMessages` branch — is wrapped in one `query_memory` span; `ids`,
`operations: ['query_memory', ...]`, and `descriptions: ['conversation
history']` are set from the fetched messages.

**b) Conversation save** — new private `MemoryOrchestrator` method
`saveMessagesWithSpan(threadId, resourceId, messages, telemetry)` wrapping the
existing `saveMessagesToThread` call. Used by `persistInputMessages`,
`persistTurnDelta`, and `saveToMemory` (all three currently call
`saveMessagesToThread` directly). `persistInputMessages`/`persistTurnDelta`
don't currently resolve telemetry at all; both add `const telemetry =
this.runtimeTelemetry.resolve(options);`. `operations` is `['created', ...]`
for every message id, even though `saveMessages` is technically an upsert (a
pending tool-call message can be replaced in place on resume) — the draft
spec's enum has no "updated" value, so this is an accepted approximation.
Error handling doesn't change: `withMemorySpan` records the exception and
rethrows, and the existing best-effort try/catch (in the two eager-persist
methods) or direct propagation (in `saveToMemory`) behaves exactly as today.

**c) Episodic query** — `createRecallMemoryTool`'s handler, in
`runtime/memory/episodic-memory.ts`, wraps the `memory.episodic.searchEntries`
call. No telemetry plumbing through the loop is needed: `ctx.parentTelemetry`
(a `ToolContext` field already populated for every tool call by
`runtime/tools/tool-adapter.ts`'s `executeTool`) supplies the resolved
`BuiltTelemetry` directly inside the handler. `createRecallMemoryTool`'s opts
gain `agentName: string`, sourced from `RuntimeContextBuilder`'s
`this.config.name` in `runtime/loop/runtime-context.ts`'s
`createRecallMemoryToolForRun`. `ids` and `operations: ['query_memory', ...]`
are set from the returned entries (ids only — no entry content).

**d) Episodic save** — `runEpisodicMemoryIndexer`'s candidate-saving block (the
existing `if (candidates.length > 0) { ... }` section) in `episodic-memory.ts`.
`RunEpisodicMemoryIndexerOpts` gains `telemetry?: BuiltTelemetry` and
`agentName: string`. `MemoryOrchestrator.scheduleEpisodicMemoryJob` currently
receives no telemetry at all (unlike `scheduleObservationLogJobs`, which
already gets it in `saveToMemory`) — thread the same resolved `telemetry`
through to it and into `runEpisodicMemoryIndexer`'s opts. No span opens when
`candidates.length === 0` (nothing was saved). `ids`/`operations` are set from
`savedEntries` after the save loop completes.

## Deviations from the draft spec

- **Added a local `query_memory` value to `operations`.** The draft only
  defines `created`/`deleted`/`pruned` (write-lifecycle events) — no value
  for a pure read. Rather than omit `gen_ai.memory.operations` on query
  spans, this implementation extends the type locally with `'query_memory'`
  (same string as the span-level `gen_ai.operation.name`), applied to every
  id in a query span's `ids` array. Not an upstream-sanctioned value; revisit
  if/when the draft spec defines its own read value.
- **`types: 'agent'` for episodic memory is an imperfect fit.** The draft
  enum (`session/task/action/agent/team/organization/external`) has no value
  for "cross-session memory scoped to one end-user/resource." `agent` is the
  closest available value; this may need revisiting if/when the upstream
  spec adds a more precise value.
- **`store.types` is best-effort, not guaranteed present.** The draft marks
  it "Required"; this implementation only sets it for the one backend it can
  positively identify (`InMemoryMemory`) and omits it otherwise, rather than
  guessing at a custom backend's storage class.
- **No raw memory content in any attribute.** Only ids and fixed generic
  labels are recorded — never message text or recalled entry content — to
  avoid leaking user data into telemetry backends.

## Testing

- `runtime/__tests__/runtime-telemetry.test.ts` — new `describe` block for
  `withMemorySpan()`, using the file's existing local `fakeSpan()`/
  `fakeTracer()` helpers. Covers: passthrough when disabled/no tracer, span
  name + attributes for both `query_memory` and `save_memory`, post-hoc
  attribute merging via the `fn` return value, exception handling.
- Memory-orchestrator tests (existing or new
  `runtime/memory/__tests__/memory-orchestrator.test.ts`) — assert the query
  and save paths open spans with the expected attributes using a fake
  telemetry+tracer, without changing existing behavioral assertions.
- Episodic-memory tests (existing or new
  `runtime/memory/__tests__/episodic-memory.test.ts`) — assert the recall
  tool's handler and the indexer's save block open spans with expected
  attributes; assert no span opens when `candidates.length === 0`.
- No integration-test cassette changes expected (span creation doesn't touch
  model/HTTP traffic).
