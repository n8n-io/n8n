# AGENTS.md

Conventions for the `@n8n/agents` package.

## Code Style

- **No `null`** — use `undefined` instead. This applies to variables, return
  types, default values, and type annotations. The only exception is when
  interfacing with external APIs that require `null`.
- **No `_` prefix on private properties** — use `private` access modifier
  without underscore. Write `private name: string`, not `private _name: string`.
- **Builder pattern with lazy build** — all public primitives use a fluent
  builder API. **User code never calls `.build()`**. Builders are passed
  directly to the consuming method (e.g. `agent.tool(myTool)`) which calls
  `.build()` internally. Agent and Network have `run()`/`stream()` directly
  on the class, which lazy-build via `ensureBuilt()` on first call. `build()`
  is `protected` on Agent and Network to keep it out of the public API.
- **Zod for schemas** — all input/output schemas use Zod.
- **No Mastra leakage** — nothing from `@mastra/*` is exported. All Mastra
  integration lives in `src/runtime/` and is an internal implementation detail.

## Package Structure

```
src/
  index.ts              # Public API barrel export
  types/                # All public TypeScript types (split by domain)
  agent.ts              # Agent builder
  tool.ts               # Tool builder
  memory.ts             # Memory builder
  guardrail.ts          # Guardrail builder
  scorer.ts             # Scorer builder
  network.ts            # Network builder
  run.ts                # Run object (events + state machine)
  provider-tools.ts     # Provider-defined tool factories
  configure.ts          # Engine-level configuration
  runtime/              # Internal — never exported
    agent-runtime.ts    # Core agent execution engine (AI SDK)
    tool-adapter.ts     # Tool execution, branded suspend detection
```

## Credential Pattern

Agents declare credential requirements via `.credential('name')`. The execution
engine resolves the name to an API key and injects it into the model config.
User code never touches raw API keys.

```typescript
const agent = new Agent('assistant')
  .model('anthropic/claude-sonnet-4-5')
  .credential('anthropic')
  .instructions('You are helpful.');
```

## Engine Injection (EngineAgent)

The execution engine extends `Agent` and overrides `protected build()` to
inject infrastructure (checkpoint storage, credentials) before calling
`super.build()`. This is the pattern for all engine-level concerns:

```typescript
class EngineAgent extends Agent {
  build() {
    this.checkpoint(store);
    const cred = this.declaredCredential;
    if (cred) this.resolvedApiKey = resolve(cred);
    return super.build();
  }
}
```

See `playground/server/utils/compile.ts` for the reference implementation.

## Testing

- Unit tests live in `src/__tests__/`, integration tests in `src/__tests__/integration/`
- Unit tests use Jest (`pnpm test`) with mocked `@mastra/core`
- Integration tests use Vitest (`pnpm test:integration`) with real LLM calls
  - Requires `.env` file with `ANTHROPIC_API_KEY` at the package root
  - Tests skip automatically when no API key is set
- Run from the package directory: `cd packages/@n8n/agents && pnpm test`

## Known Mastra Issues

These are known issues with `@mastra/core` that our adapter works around.
Refer to these when debugging Mastra-related problems or planning the
eventual migration to direct AI SDK usage.

### 1. Memory requires Mastra instance registration

`MastraMemory` silently does nothing unless the agent is registered with a
`Mastra` instance. The `Mastra` constructor calls `__registerMastra` on the
agent, which injects the storage backend that memory needs to persist threads.
Without this, all messages are silently lost — no error is thrown.

**Our workaround:** `mastra-adapter.ts` creates a `Mastra` instance whenever
`config.memory` OR `config.checkpointStorage` is configured, not just for
checkpoint storage.

### 2. Tool suspend/resume uses branded return types

Tools that declare `.suspend()` and `.resume()` schemas get an
`InterruptibleToolContext` with `ctx.suspend(payload)` and `ctx.resumeData`.
When the handler calls `return await ctx.suspend(payload)`, it returns a branded
`SuspendedToolResult` (tagged with a private symbol in `tool-adapter.ts`).
The agent runtime checks the tool's return value with `isSuspendedToolResult()`
instead of catching a thrown error — this keeps suspend on the normal return
path rather than the error path. The runtime then saves the run state and
emits a `tool-call-suspended` stream chunk. On the agent side,
`agent.resume(method, data, { runId, toolCallId })` re-invokes the tool handler
with `ctx.resumeData` populated from the resume data. The `method` parameter
determines the return type: `'generate'` returns a `GenerateResult`,
`'stream'` returns a `StreamResult` (`ReadableStream<StreamChunk>`).

### 3. `tool-call-delta` chunks are buffered (not truly incremental)

Despite the `fullStream` emitting `tool-call-delta` events, Mastra buffers
them internally and releases them all in one burst after the LLM finishes
generating the tool call arguments. For example, a 14-second code generation
produces 874 delta chunks that all arrive at the same instant.

**Impact:** Streaming tool call inputs (e.g. streaming code into the editor
as the LLM generates it) is NOT possible through Mastra's `fullStream` API.
This is the primary motivation for eventually replacing Mastra with direct
AI SDK usage.

### 4. `resumeStream` returns a stream

`mastraAgent.resumeStream()` returns `MastraModelOutput` (with `fullStream`,
`textStream`, etc.) — the resumed execution stream. The adapter's `resume()`
method pipes this through the standard stream transform and returns
`{ fullStream }` so consumers can read the resumed stream.

### 5. ESM-only packages break Jest

`@mastra/core` and its transitive deps (`p-map`, `nanoid`, etc.) are ESM-only.
Jest cannot parse them through pnpm's symlinked `node_modules` without
extensive `transformIgnorePatterns` and `babel-jest` configuration, and even
then hits `--experimental-vm-modules` errors.

**Our workaround:** Unit tests mock all `@mastra/*` imports via
`setup-mastra-mocks.ts`. Integration tests use Vitest (which handles ESM
natively) with `transformIgnorePatterns: []`.

### 6. Event type names are inconsistent

The actual streaming event for tool call input start is
`tool-call-input-streaming-start`, NOT `tool-call-streaming-start`. Similarly,
the end event is `tool-call-input-streaming-end`. These names don't match
what you'd expect from the type definitions or docs.

**Reference:** Check the integration test `stream-timing.test.ts` which logs
all actual chunk types for verification.

### 7. Logger overwriting on Mastra registration

The `Mastra` constructor calls `__registerMastra` on agents, which overwrites
the agent's logger. Any custom logger (e.g. our `createFilteredLogger()`)
must be set AFTER the Mastra registration, not before. The order matters
silently — setting it before registration results in the custom logger being
discarded. We also use the private `__setLogger` API via an `as unknown as`
cast because it is not exposed in the public type.

### 8. Tool call results are not persisted in memory

Mastra's memory stores user/assistant text messages but does NOT persist
tool call/result pairs. On subsequent turns, the LLM has no knowledge of
previous tool outputs. For example, if an agent generates a fruit bowl via
a tool, then the user asks "pick the apples", the LLM won't know the
coordinates because the tool result wasn't saved to memory.

**Impact:** Conversational workflows that reference previous tool outputs
break across turns. Mastra's intended RAG approach is `semanticRecall` on
the memory layer (embedding past messages), not tool-based retrieval.

**Workaround options:**
- Send full conversation history (including tool results) from the client
  with each request (belt-and-suspenders approach)
- Embed tool results into the assistant text message before saving

### 9. Deep internal import paths required for types

Several Mastra types are not re-exported from stable public surfaces.
`message-adapter.ts` imports from `@mastra/core/dist/_types/@internal_ai-sdk-v4/dist`
for `FilePart`, `TextPart`, `ToolCallPart`, etc. These paths are unstable
and will break on Mastra version bumps.

We locally redefined `ProviderDefinedTool` in `types.ts` to avoid one such
import. The message adapter still depends on the internal path.

### 10. `output.object` is not typed on generate result

The `object` field (structured output) exists at runtime on Mastra's generate
output but is not declared on the TypeScript type, requiring
`(output as unknown as { object?: unknown }).object` in `mastra-adapter.ts`.

### 11. `CoreMessage` type is too narrow for constructed messages

The Mastra `CoreMessage` type doesn't accept the content structures we build
(arrays of parts for user, assistant, tool messages). Three places in
`message-adapter.ts` require `as unknown as CoreMessage` casts.

### 12. Noisy false-positive memory warning

Mastra emits a warning "No memory is configured but resourceId and threadId
were passed in args" during tool approval flows even when memory is not
relevant. `createFilteredLogger()` in `runtime/logger.ts` suppresses this
specific pattern. The filtered logger also stubs `trackException`,
`getTransports`, `listLogs`, `listLogsByRunId` that Mastra's logger interface
requires but have no meaningful implementation.

### 13. CheckpointBridgeStore monkey-patches Mastra internals

To plug an external durable store into Mastra's checkpoint system,
`checkpoint-bridge.ts` extends `InMemoryStore` and monkey-patches
`persistWorkflowSnapshot` and `loadWorkflowSnapshot` on the workflows
storage domain after `init()`. This uses untyped `any` parameters because
Mastra's internal API is not publicly typed (file has broad eslint-disable).

## Building

```bash
cd packages/@n8n/agents
pnpm build    # tsc → dist/
pnpm test     # jest
```

## Playground

The `playground/` directory contains a dev-only Nuxt 3 app for testing agents
interactively. It is NOT a workspace package — run it independently:

```bash
cd packages/@n8n/agents/playground
npm install
npm run dev
```
