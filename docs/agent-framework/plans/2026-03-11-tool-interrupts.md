# Tool Interrupt System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the simple `requiresApproval()` boolean with a general-purpose tool interrupt system that supports typed suspend/resume schemas, enabling any HITL pattern (binary approval, free-text input, credential selection, etc.).

**Architecture:** Tools declare typed suspend and resume Zod schemas via `.suspend()` and `.resume()` builder methods. The handler receives a context with `suspend(payload)` (returns the Mastra `InnerOutput` branded void — effectively never returns) and `resumeData` (typed by resume schema, `undefined` on first call). The agent exposes `resume(data, { runId, toolCallId })` which accepts arbitrary resume data and returns a new stream. The stream emits `tool-call-suspended` events instead of `tool-call-approval`.

**Tech Stack:** TypeScript, Zod (schema validation), Mastra (underlying runtime, hidden behind adapter)

---

## Breaking Change Notice

This is a **breaking API change**. The following public APIs are removed:

- `Tool.requiresApproval()` builder method
- `Agent.approveToolCall()` / `Agent.declineToolCall()`
- `Run.approve()` / `Run.deny()`
- `StreamChunk` variant `tool-call-approval`
- `RunState` value `waiting_approval`
- `StateChangeEvent.context.approvalId`
- `BuiltTool._approval`
- `DatasetRow.approvals` (replaced with `DatasetRow.resumeData`)

This is intentional — the SDK is pre-1.0 and these are being replaced by the
interrupt system. No compatibility shims. Consumers must migrate to:

- `Tool.suspend(schema).resume(schema)` for tools
- `Agent.resume(data, { runId, toolCallId })` for resuming
- `tool-call-suspended` StreamChunk for stream detection
- `RunState` value `suspended` for state tracking
- `DatasetRow.resumeData` for eval overrides

---

## Context

### Current State

The SDK has a simple `requiresApproval()` flag on tools with `approveToolCall()`/`declineToolCall()` on agents — binary only, no custom payloads. The `ToolContext` type exists but only has an unimplemented `pause()` stub.

### Target State

instance-ai tools use typed suspend/resume for diverse HITL patterns:
- Binary approval (delete-workflow, activate-workflow, etc.)
- Free-text input (ask-user)
- Credential selection (setup-credentials, browser-credential-setup)

The SDK needs to support all of these with a single generic interrupt mechanism.

### Key Files

| File | Role |
|------|------|
| `src/types.ts` | Type definitions (ToolContext, BuiltTool, StreamChunk, BuiltAgent, Run, RunState) |
| `src/tool.ts` | Tool builder class |
| `src/agent.ts` | Agent builder class |
| `src/run.ts` | AgentRun implementation |
| `src/runtime/mastra-adapter.ts` | Adapter that maps SDK types to Mastra calls |
| `src/evaluate.ts` | Evaluation framework (uses approval semantics throughout) |
| `src/network.ts` | Network builder (uses `'approveToolCall' in a` for BuiltAgent detection) |
| `src/index.ts` | Public exports |
| `src/__tests__/tool.test.ts` | Tool unit tests |
| `src/__tests__/agent.test.ts` | Agent unit tests |
| `src/__tests__/mastra-adapter.test.ts` | Adapter unit tests |
| `src/__tests__/integration/tool-approval.test.ts` | Integration tests (rename to tool-interrupt) |
| `src/__tests__/integration/helpers.ts` | Integration test helpers |
| `src/__tests__/integration/evaluate.test.ts` | Evaluation integration tests |
| `playground/server/api/agent/approve.post.ts` | Playground approve endpoint (delete) |
| `playground/server/api/agent/deny.post.ts` | Playground deny endpoint (delete) |
| `playground/server/api/agent/chat.post.ts` | Playground chat endpoint (update stream handling) |
| `playground/components/ChatPane.vue` | Playground UI (update approval UI) |
| `examples/basic-agent.ts` | Example code |
| `AGENTS.md` | SDK documentation |

### Mastra's Suspend/Resume Internals

Mastra's `createTool` accepts `suspendSchema` and `resumeSchema` as top-level options. Inside the handler:

- `ctx.agent.suspend(payload)` returns a branded `InnerOutput` type (void with a unique symbol). It does **NOT** throw an error. The execution engine detects this special return value and halts execution with status `'suspended'`.
- `ctx.agent.resumeData` is populated with the resume data when the tool is re-invoked after `agent.resumeStream()`.

On the agent side, `agent.resumeStream(data, { runId, toolCallId })` resumes a suspended run and returns a new stream.

**Critical implementation detail:** Our `suspend()` wrapper must `return await ctx.agent.suspend(payload)` — NOT throw an error. The branded return type is how Mastra detects suspension. Throwing would turn a valid suspend into a tool failure.

---

## Task 0: Validate Mastra Suspend Semantics (Spike)

**Files:**
- Read-only: `node_modules/@mastra/core/` (source investigation)
- Create: `src/__tests__/spike-suspend.ts` (throwaway prototype, delete after)

**Purpose:** Confirm the exact Mastra suspend/resume contract before writing the production implementation. This prevents the core runtime path from being built on assumptions.

### Step 1: Write a minimal prototype

Create a throwaway test that:
1. Creates a Mastra tool with `suspendSchema`/`resumeSchema` using `createTool` directly
2. Wires it into a Mastra Agent with `InMemoryStore`
3. Calls `agent.stream()`, consumes the stream, verifies a `tool-call-suspended` chunk appears
4. Calls `agent.resumeStream(data, { runId, toolCallId })`, verifies the tool handler receives `resumeData`

This confirms:
- Whether `suspend()` must be awaited or returned
- The exact chunk type emitted (is it `tool-call-suspended`?)
- Whether `resumeData` is populated directly on `ctx.agent` or nested differently
- Whether `resumeStream` needs `runId` in the options or as a top-level param

### Step 2: Run the prototype

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && npx tsx src/__tests__/spike-suspend.ts`

Or as a vitest test if easier to run.

### Step 3: Document findings

Note the exact API surface. Update subsequent tasks if any assumptions were wrong.

### Step 4: Delete the prototype

Remove `src/__tests__/spike-suspend.ts` — it was only for validation.

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `src/types.ts`

### Step 1: Update RunState — replace `waiting_approval` with `suspended`

```typescript
// Replace:
export type RunState =
  | 'running'
  | 'waiting_approval'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'failed';

// With:
export type RunState =
  | 'running'
  | 'suspended'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'failed';
```

### Step 2: Update StateChangeEvent — replace `approvalId` with `suspendId`

```typescript
// Replace:
export interface StateChangeEvent {
  from: RunState;
  to: RunState;
  context: {
    approvalId?: string;
    pauseId?: string;
    reason?: string;
  };
}

// With:
export interface StateChangeEvent {
  from: RunState;
  to: RunState;
  context: {
    suspendId?: string;
    pauseId?: string;
    reason?: string;
  };
}
```

### Step 3: Replace PauseOptions and ToolContext with interrupt types

```typescript
// Remove these:
// - PauseOptions interface
// - ToolContext interface (old version)

// Add these:

/**
 * Context passed to a tool handler when suspend/resume schemas are declared.
 * @template S - Suspend payload type (what the tool sends when pausing)
 * @template R - Resume payload type (what the user sends back)
 */
export interface InterruptibleToolContext<S = unknown, R = unknown> {
  /**
   * Pause execution and send a payload to the consumer.
   * Must be awaited — returns Mastra's branded InnerOutput which signals
   * the execution engine to halt. Code after `await suspend()` is unreachable.
   */
  suspend: (payload: S) => Promise<void>;
  /** Data from the consumer after resume. Undefined on first invocation. */
  resumeData: R | undefined;
}

/**
 * Context passed to a tool handler when no suspend/resume schemas are declared.
 * Empty today, extensible in the future.
 */
export type ToolContext = Record<string, never>;
```

### Step 4: Update BuiltTool — remove `_approval`, add schemas

```typescript
export interface BuiltTool {
  readonly name: string;
  readonly description: string;
  /** @internal */ readonly _mastraTool: unknown;
  /** @internal */ readonly _suspendSchema?: z.ZodType;
  /** @internal */ readonly _resumeSchema?: z.ZodType;
  /** @internal */ readonly _toMessage?: (output: unknown) => Message | undefined;
  /** @internal */ readonly _storeResults?: boolean;
}
```

### Step 5: Replace `tool-call-approval` with `tool-call-suspended` in StreamChunk

```typescript
// Remove:
| {
    type: 'tool-call-approval';
    runId?: string;
    toolCallId?: string;
    tool?: string;
    input?: unknown;
  }

// Add:
| {
    type: 'tool-call-suspended';
    runId?: string;
    toolCallId?: string;
    toolName?: string;
    input?: unknown;
    suspendPayload?: unknown;
  }
```

### Step 6: Update BuiltAgent — replace approve/decline with resume

```typescript
export interface BuiltAgent {
  readonly name: string;
  run(input: Message[], options?: RunOptions): Run;
  stream(input: Message[], options?: RunOptions): Run;
  streamText(
    input: Message[],
    options?: RunOptions,
  ): Promise<{
    fullStream: ReadableStream<StreamChunk>;
    textStream: ReadableStream<string>;
    getResult: () => Promise<AgentResult>;
  }>;
  asTool(description: string): BuiltTool;
  resume(
    data: unknown,
    options: { runId: string; toolCallId: string },
  ): Promise<{ fullStream: ReadableStream<StreamChunk> }>;
}
```

### Step 7: Update Run interface — remove approve/deny

```typescript
export interface Run {
  readonly state: RunState;
  readonly result: Promise<AgentResult>;
  on<E extends RunEvent>(event: E, handler: (data: RunEventMap[E]) => void): void;
  resume(pauseId: string, data: unknown): Promise<void>;
  abort(reason?: string): void;
}
```

### Step 8: Run typecheck

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm typecheck 2>&1 | tail -30`

Expected: Type errors in downstream files (tool.ts, agent.ts, run.ts, evaluate.ts, network.ts, etc.). This is expected — we fix them in subsequent tasks.

### Step 9: Commit

```bash
git add src/types.ts
git commit -m "refactor(agents): replace approval types with interrupt types in type definitions"
```

---

## Task 2: Update Tool Builder

**Files:**
- Modify: `src/tool.ts`
- Modify: `src/__tests__/tool.test.ts`

### Step 1: Write failing tests for the new interrupt API

Add to `src/__tests__/tool.test.ts`:

```typescript
describe('suspend/resume', () => {
  const suspendSchema = z.object({ message: z.string(), severity: z.string() });
  const resumeSchema = z.object({ approved: z.boolean() });

  it('should build a tool with suspend and resume schemas', () => {
    const tool = new Tool('delete')
      .description('Delete something')
      .input(inputSchema)
      .output(outputSchema)
      .suspend(suspendSchema)
      .resume(resumeSchema)
      .handler(async (_input, _ctx) => ({ result: 'done' }))
      .build();

    expect(tool.name).toBe('delete');
    expect(tool._suspendSchema).toBe(suspendSchema);
    expect(tool._resumeSchema).toBe(resumeSchema);
  });

  it('should build a tool without suspend/resume (no interrupt)', () => {
    const tool = new Tool('search')
      .description('Search')
      .input(inputSchema)
      .handler(async ({ query }) => ({ result: query }))
      .build();

    expect(tool._suspendSchema).toBeUndefined();
    expect(tool._resumeSchema).toBeUndefined();
  });

  it('should throw if suspend is declared without resume', () => {
    expect(() =>
      new Tool('bad')
        .description('Bad tool')
        .input(inputSchema)
        .suspend(suspendSchema)
        .handler(async () => ({ result: '' }))
        .build(),
    ).toThrow('Tool "bad" declares .suspend() but is missing .resume()');
  });

  it('should throw if resume is declared without suspend', () => {
    expect(() =>
      new Tool('bad')
        .description('Bad tool')
        .input(inputSchema)
        .resume(resumeSchema)
        .handler(async () => ({ result: '' }))
        .build(),
    ).toThrow('Tool "bad" declares .resume() but is missing .suspend()');
  });
});
```

### Step 2: Run tests to verify they fail

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/tool.test.ts 2>&1 | tail -20`

Expected: FAIL — `.suspend()` and `.resume()` methods don't exist yet.

### Step 3: Update the Tool class

In `src/tool.ts`, make these changes:

**a) Add generic type parameters for suspend/resume schemas:**

```typescript
export class Tool<
  TInput extends ZodObjectSchema = ZodObjectSchema,
  TOutput extends ZodObjectSchema = ZodObjectSchema,
  TSuspend extends ZodObjectSchema | undefined = undefined,
  TResume extends ZodObjectSchema | undefined = undefined,
> {
```

**b) Add private fields, remove approval field:**

```typescript
// Remove:
private approval?: boolean | ((input: z.infer<TInput>) => boolean | Promise<boolean>);

// Add:
private suspendSchemaValue?: ZodObjectSchema;
private resumeSchemaValue?: ZodObjectSchema;
```

**c) Remove `requiresApproval()` method entirely.**

**d) Add `.suspend()` and `.resume()` builder methods:**

```typescript
/** Declare the schema for the payload this tool sends when suspending. */
suspend<S extends ZodObjectSchema>(schema: S): Tool<TInput, TOutput, S, TResume> {
  const self = this as unknown as Tool<TInput, TOutput, S, TResume>;
  self.suspendSchemaValue = schema;
  return self;
}

/** Declare the schema for the data the consumer sends to resume this tool. */
resume<R extends ZodObjectSchema>(schema: R): Tool<TInput, TOutput, TSuspend, R> {
  const self = this as unknown as Tool<TInput, TOutput, TSuspend, R>;
  self.resumeSchemaValue = schema;
  return self;
}
```

**e) Update handler signature with context-aware typing:**

```typescript
/** Type for the handler's context parameter, inferred from suspend/resume schemas. */
type HandlerContext<S, R> = S extends ZodObjectSchema
  ? R extends ZodObjectSchema
    ? InterruptibleToolContext<z.infer<S>, z.infer<R>>
    : ToolContext
  : ToolContext;

handler(
  fn: (
    input: z.infer<TInput>,
    ctx: HandlerContext<TSuspend, TResume>,
  ) => Promise<z.infer<TOutput>>,
): this {
  this.handlerFn = fn as Tool['handlerFn'];
  return this;
}
```

**f) Update `build()` — remove approval, add suspend/resume wiring:**

```typescript
build(): BuiltTool {
  // ... existing name/description/input/handler validation ...

  if (this.suspendSchemaValue && !this.resumeSchemaValue) {
    throw new Error(`Tool "${this.name}" declares .suspend() but is missing .resume()`);
  }
  if (this.resumeSchemaValue && !this.suspendSchemaValue) {
    throw new Error(`Tool "${this.name}" declares .resume() but is missing .suspend()`);
  }

  const handler = this.handlerFn;
  const hasSuspend = !!this.suspendSchemaValue;

  // ... existing toMessage/toModelOutput setup ...

  const mastraTool = createTool({
    id: this.name,
    description: this.desc,
    inputSchema: this.inputSchema,
    outputSchema: this.outputSchema,
    ...(toModelOutput ? { toModelOutput } : {}),
    ...(this.suspendSchemaValue ? { suspendSchema: this.suspendSchemaValue } : {}),
    ...(this.resumeSchemaValue ? { resumeSchema: this.resumeSchemaValue } : {}),
    execute: async (inputData, mastraCtx) => {
      if (hasSuspend) {
        const agentCtx = (mastraCtx as Record<string, unknown>)?.agent ?? {};
        const ctx: InterruptibleToolContext = {
          suspend: async (payload: unknown) => {
            // Mastra's suspend() returns a branded InnerOutput (void).
            // The execution engine detects this return value and halts.
            // We must await and return it — NOT throw.
            return await (agentCtx as any).suspend(payload);
          },
          resumeData: (agentCtx as any).resumeData ?? undefined,
        };
        return await handler(inputData, ctx as any);
      }
      return await handler(inputData, {} as any);
    },
  });

  return {
    name: this.name,
    description: this.desc,
    _mastraTool: mastraTool,
    _suspendSchema: this.suspendSchemaValue,
    _resumeSchema: this.resumeSchemaValue,
    _toMessage: toMessage,
    _storeResults: this.persistResults || undefined,
  };
}
```

### Step 4: Remove old approval tests, update handler type

In `src/__tests__/tool.test.ts`:
- Remove `requiresApproval as boolean` test
- Remove `requiresApproval as predicate` test
- Update handler type references (remove `ToolContext` import if unused)

### Step 5: Run tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/tool.test.ts 2>&1 | tail -20`

Expected: All tests PASS.

### Step 6: Commit

```bash
git add src/tool.ts src/__tests__/tool.test.ts
git commit -m "feat(agents): replace requiresApproval with suspend/resume on Tool builder"
```

---

## Task 3: Update MastraAdapter — Replace Approve/Decline with Resume

**Files:**
- Modify: `src/runtime/mastra-adapter.ts`

### Step 1: Replace approveToolCall/declineToolCall with resume

Remove both `approveToolCall()` and `declineToolCall()` methods. Add:

```typescript
/**
 * Resume a suspended tool call with arbitrary data.
 * Returns a new stream from the resumed execution.
 */
async resume(
  data: unknown,
  options: { runId: string; toolCallId: string },
): Promise<{ fullStream: ReadableStream<StreamChunk> }> {
  const resumable = this.mastraAgent as unknown as {
    resumeStream: (
      data: unknown,
      options: { runId: string; toolCallId: string },
    ) => Promise<{
      runId?: string;
      fullStream: ReadableStream<unknown>;
      text: Promise<string>;
    }>;
  };
  const output = await resumable.resumeStream(data, {
    runId: options.runId,
    toolCallId: options.toolCallId,
  });
  const fullStream = (output.fullStream as ReadableStream<MastraStreamChunk>).pipeThrough(
    createMastraToStreamChunkTransform(this.toolToMessageMap),
  );
  return { fullStream };
}
```

### Step 2: Update the stream transform

In `createMastraToStreamChunkTransform`, add `isRecord` helper if not present:

```typescript
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
```

Replace the `tool-call-approval` handler:

```typescript
// Remove:
if (chunk.type === 'tool-call-approval' && payload?.toolName) { ... }

// Add:
if (chunk.type === 'tool-call-suspended') {
  const sp = isRecord(payload) ? payload : {};
  const suspendPayload = isRecord(sp.suspendPayload) ? sp.suspendPayload : sp;
  controller.enqueue({
    ...(providerMetadata && { providerMetadata }),
    type: 'tool-call-suspended',
    runId: chunk.runId,
    toolCallId: typeof sp.toolCallId === 'string' ? sp.toolCallId : undefined,
    toolName: typeof sp.toolName === 'string' ? sp.toolName : undefined,
    input: sp.args,
    suspendPayload,
  });
  return;
}
```

### Step 3: Commit

```bash
git add src/runtime/mastra-adapter.ts
git commit -m "refactor(agents): replace approve/decline with resume in MastraAdapter"
```

---

## Task 4: Update Agent Builder — Replace Approve/Decline with Resume

**Files:**
- Modify: `src/agent.ts`
- Modify: `src/__tests__/agent.test.ts`

### Step 1: Write failing tests

Add to `src/__tests__/agent.test.ts` (add `import { z } from 'zod'` at top):

```typescript
it('should throw if interruptible tools are used without checkpoint', () => {
  const interruptibleTool: BuiltTool = {
    name: 'delete',
    description: 'Delete something',
    _mastraTool: { __isTool: true },
    _suspendSchema: z.object({ message: z.string() }),
    _resumeSchema: z.object({ approved: z.boolean() }),
  };

  expect(() =>
    buildAgent(
      new TestableAgent('assistant')
        .model('anthropic/claude-sonnet-4')
        .instructions('You are helpful.')
        .tool(interruptibleTool),
    ),
  ).toThrow(/checkpoint/);
});

it('should build with interruptible tools when checkpoint is configured', () => {
  const interruptibleTool: BuiltTool = {
    name: 'delete',
    description: 'Delete something',
    _mastraTool: { __isTool: true },
    _suspendSchema: z.object({ message: z.string() }),
    _resumeSchema: z.object({ approved: z.boolean() }),
  };

  const agent = buildAgent(
    new TestableAgent('assistant')
      .model('anthropic/claude-sonnet-4')
      .instructions('You are helpful.')
      .tool(interruptibleTool)
      .checkpoint('memory'),
  );

  expect(agent.name).toBe('assistant');
});
```

### Step 2: Run tests to verify they fail

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/agent.test.ts 2>&1 | tail -20`

### Step 3: Update Agent class

In `src/agent.ts`:

**a) Remove `approveToolCall()` and `declineToolCall()` methods.**

**b) Add `resume()` method:**

```typescript
/** Resume a suspended tool call with data. Returns the resumed stream. Lazy-builds on first call. */
async resume(
  data: unknown,
  options: { runId: string; toolCallId: string },
): Promise<{ fullStream: ReadableStream<StreamChunk> }> {
  return await this.ensureBuilt().resume(data, options);
}
```

(Add `import type { StreamChunk }` if not already imported.)

**c) Update checkpoint validation in `build()`:**

```typescript
// Replace:
const hasApprovalTools = this.tools.some((t) => t._approval);
if (hasApprovalTools && !this.checkpointStore) { ... }

// With:
const hasInterruptibleTools = this.tools.some((t) => t._suspendSchema);
if (hasInterruptibleTools && !this.checkpointStore) {
  throw new Error(
    `Agent "${this.name}" has tools with .suspend()/.resume() but no checkpoint storage. ` +
      "Add .checkpoint('memory') for in-process storage, " +
      'or pass a persistent store (e.g. LibSQLStore, PgStore).',
  );
}
```

**d) Update returned BuiltAgent — replace approveToolCall/declineToolCall with resume:**

```typescript
// Remove: approveToolCall, declineToolCall methods
// Add:
async resume(data: unknown, opts: { runId: string; toolCallId: string }) {
  return await adapter.resume(data, opts);
},
```

### Step 4: Run tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/agent.test.ts 2>&1 | tail -20`

Expected: All tests PASS.

### Step 5: Commit

```bash
git add src/agent.ts src/__tests__/agent.test.ts
git commit -m "feat(agents): replace approve/decline with resume on Agent builder"
```

---

## Task 5: Update AgentRun — Remove approve/deny, align state names

**Files:**
- Modify: `src/run.ts`
- Modify: `src/__tests__/run.test.ts`

### Step 1: Remove approve() and deny(), keep resume()

In `src/run.ts`:
- Remove the `approve()` method
- Remove the `deny()` method
- Keep `resume()` — it already exists and transitions state to `running`
- Update any internal reference to `waiting_approval` → use `suspended` instead (if the run transitions to that state anywhere)

### Step 2: Check and update run.test.ts

Review `src/__tests__/run.test.ts`. Remove or update any tests referencing `approve`, `deny`, or `waiting_approval`.

### Step 3: Run tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/run.test.ts 2>&1 | tail -20`

Expected: PASS.

### Step 4: Commit

```bash
git add src/run.ts src/__tests__/run.test.ts
git commit -m "refactor(agents): remove approve/deny from AgentRun, rename waiting_approval to suspended"
```

---

## Task 6: Update Network — Fix BuiltAgent detection

**Files:**
- Modify: `src/network.ts`
- Modify: `src/__tests__/network.test.ts`

### Step 1: Update shape detection

`network.ts` uses `'approveToolCall' in a` to detect BuiltAgent vs Agent builder. Replace with `'resume' in a`:

```typescript
// In coordinator():
// Replace: this.coordinatorAgent = 'approveToolCall' in a ? a : a.build();
// With:
this.coordinatorAgent = 'resume' in a ? a : a.build();

// In agent():
// Replace: this.agents.push('approveToolCall' in a ? a : a.build());
// With:
this.agents.push('resume' in a ? a : a.build());
```

### Step 2: Update network.test.ts if needed

Check `src/__tests__/network.test.ts` for mock BuiltAgent objects. They need a `resume` method instead of `approveToolCall`/`declineToolCall`.

### Step 3: Run tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/network.test.ts 2>&1 | tail -20`

Expected: PASS.

### Step 4: Commit

```bash
git add src/network.ts src/__tests__/network.test.ts
git commit -m "refactor(agents): update network BuiltAgent detection from approveToolCall to resume"
```

---

## Task 7: Update Evaluate — Migrate from approval to interrupt semantics

**Files:**
- Modify: `src/evaluate.ts`
- Modify: `src/__tests__/integration/evaluate.test.ts`

### Step 1: Update DatasetRow type

```typescript
// Replace:
export interface DatasetRow {
  input: string;
  expected?: string;
  approvals?: Record<string, 'approve' | 'deny'>;
}

// With:
export interface DatasetRow {
  input: string;
  expected?: string;
  /**
   * Per-tool resume data overrides for evaluation. By default all suspended
   * tools are auto-resumed with `{ approved: true }` during evaluations.
   * Use this to test denial or custom resume scenarios.
   *
   * - `'deny'` is shorthand for `{ approved: false }`
   * - An object value is passed as-is to `agent.resume()`
   *
   * @example
   * ```typescript
   * // Deny a specific tool
   * { input: 'Delete the file', resumeData: { delete_file: 'deny' } }
   *
   * // Custom resume data (e.g. for ask-user tool)
   * { input: 'Ask for name', resumeData: { ask_user: { approved: true, userInput: 'Alice' } } }
   * ```
   */
  resumeData?: Record<string, 'deny' | Record<string, unknown>>;
}
```

### Step 2: Rename drainStreamWithApprovals → drainStreamWithInterrupts

Update the function to use `tool-call-suspended` and `agent.resume()`:

```typescript
/**
 * Drain a fullStream, auto-resuming suspended tools unless overridden.
 * Collects tool results from ALL streams (original + resumed after interrupt)
 * since getResult().toolCalls may not capture results from resumed streams.
 */
async function drainStreamWithInterrupts(
  reader: ReadableStreamDefaultReader<unknown>,
  agent: Agent<Provider | undefined>,
  collected: CollectedToolResult[],
  resumeOverrides?: Record<string, 'deny' | Record<string, unknown>>,
): Promise<void> {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = value as StreamChunk;

    // Collect tool results
    if (chunk.type === 'content' && chunk.content.type === 'tool-result') {
      let parsedInput: unknown = chunk.content.input;
      if (typeof parsedInput === 'string') {
        try {
          parsedInput = JSON.parse(parsedInput);
        } catch {
          // keep as string
        }
      }
      collected.push({
        tool: chunk.content.toolName,
        input: parsedInput,
        output: chunk.content.result,
      });
    }

    // Handle suspend events
    if (chunk.type === 'tool-call-suspended') {
      const toolName = chunk.toolName ?? '';
      const override = toolName ? resumeOverrides?.[toolName] : undefined;
      const runId = chunk.runId ?? '';
      const toolCallId = chunk.toolCallId ?? '';

      // Resolve resume data: 'deny' → { approved: false }, object → as-is, default → { approved: true }
      let resumeData: Record<string, unknown>;
      if (override === 'deny') {
        resumeData = { approved: false };
      } else if (override && typeof override === 'object') {
        resumeData = override;
      } else {
        resumeData = { approved: true };
      }

      const resumed = await agent.resume(resumeData, { runId, toolCallId });
      await drainStreamWithInterrupts(
        resumed.fullStream.getReader(),
        agent,
        collected,
        resumeOverrides,
      );
      return;
    }
  }
}
```

### Step 3: Update evaluate() function

- Update JSDoc: replace "auto-approved" language with "auto-resumed"
- Replace `drainStreamWithApprovals` call with `drainStreamWithInterrupts`
- Replace `row.approvals` with `row.resumeData`

### Step 4: Update evaluate.test.ts

In `src/__tests__/integration/evaluate.test.ts`:
- Replace any `approvals: { tool: 'deny' }` with `resumeData: { tool: 'deny' }`
- Replace `createAgentWithApprovalTool` with `createAgentWithInterruptibleTool` (from updated helpers)
- Update assertions that check for approval-related behavior

### Step 5: Run tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/integration/evaluate.test.ts 2>&1 | tail -20`

Expected: PASS (if API key set) or SKIP.

### Step 6: Commit

```bash
git add src/evaluate.ts src/__tests__/integration/evaluate.test.ts
git commit -m "refactor(agents): migrate evaluate from approval to interrupt semantics"
```

---

## Task 8: Update Public Exports

**Files:**
- Modify: `src/index.ts`

### Step 1: Update exports

```typescript
export type {
  // ... existing exports ...
  ToolContext,
  InterruptibleToolContext,
  // ... rest ...
} from './types';
```

Ensure `InterruptibleToolContext` is exported. `ToolContext` stays exported (now an empty record type).

### Step 2: Run typecheck

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm typecheck 2>&1 | tail -20`

Expected: PASS — all type references should be resolved now.

### Step 3: Commit

```bash
git add src/index.ts
git commit -m "feat(agents): export InterruptibleToolContext type"
```

---

## Task 9: Update Mastra Adapter Tests

**Files:**
- Modify: `src/__tests__/mastra-adapter.test.ts`

### Step 1: Update tests

- Remove any tests for `approveToolCall`/`declineToolCall`
- Replace `_approval` on mock tools with `_suspendSchema`/`_resumeSchema` or remove
- Add a basic test for the `resume()` method if mocking allows

### Step 2: Run tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/mastra-adapter.test.ts 2>&1 | tail -20`

Expected: PASS.

### Step 3: Commit

```bash
git add src/__tests__/mastra-adapter.test.ts
git commit -m "test(agents): update adapter tests for interrupt system"
```

---

## Task 10: Update Integration Tests

**Files:**
- Delete: `src/__tests__/integration/tool-approval.test.ts`
- Create: `src/__tests__/integration/tool-interrupt.test.ts`
- Modify: `src/__tests__/integration/helpers.ts`

### Step 1: Update helpers

In `helpers.ts`:

Replace `createAgentWithApprovalTool` with `createAgentWithInterruptibleTool`:

```typescript
export function createAgentWithInterruptibleTool(provider: 'anthropic' | 'openai'): Agent {
  const deleteTool = new Tool('delete_file')
    .description('Delete a file at the given path')
    .input(z.object({
      path: z.string().describe('File path to delete'),
    }))
    .output(z.object({ deleted: z.boolean(), path: z.string() }))
    .suspend(z.object({
      message: z.string(),
      severity: z.string(),
    }))
    .resume(z.object({
      approved: z.boolean(),
    }))
    .handler(async ({ path }, ctx) => {
      if (!ctx.resumeData) {
        await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
      }
      if (!ctx.resumeData!.approved) return { deleted: false, path };
      return { deleted: true, path };
    });

  return new Agent('test-interrupt-agent')
    .model(getModel(provider))
    .instructions(
      'You are a file manager. When asked to delete a file, use the delete_file tool. Be concise.',
    )
    .tool(deleteTool)
    .checkpoint('memory');
}
```

Update `createAgentWithMixedTools` similarly — the non-interruptible tool stays the same, the delete tool uses `.suspend()`/`.resume()`.

### Step 2: Create tool-interrupt.test.ts

```typescript
it('pauses the stream when a tool suspends', async () => {
  const agent = createAgentWithInterruptibleTool('anthropic');
  const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');
  const chunks = await collectStreamChunks(fullStream);

  expect(chunks.map(c => c.type)).toContain('tool-call-suspended');

  const suspended = chunksOfType(chunks, 'tool-call-suspended');
  expect(suspended).toHaveLength(1);

  const event = suspended[0] as StreamChunk & { type: 'tool-call-suspended' };
  expect(event.toolName).toBe('delete_file');
  expect(event.runId).toBeTruthy();
  expect(event.toolCallId).toBeTruthy();
  expect(event.suspendPayload).toEqual(
    expect.objectContaining({ message: expect.any(String), severity: 'destructive' }),
  );
});

it('resumes the stream after resume with approval', async () => {
  const agent = createAgentWithInterruptibleTool('anthropic');
  const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');
  const chunks = await collectStreamChunks(fullStream);

  const event = (chunksOfType(chunks, 'tool-call-suspended')[0]) as StreamChunk & { type: 'tool-call-suspended' };

  const { fullStream: resumedStream } = await agent.resume(
    { approved: true },
    { runId: event.runId!, toolCallId: event.toolCallId! },
  );

  const resumedChunks = await collectStreamChunks(resumedStream);
  expect(resumedChunks.map(c => c.type)).toContain('text-delta');

  // Tool result should appear after resume
  const toolResults = resumedChunks.filter(
    c => c.type === 'content' && 'content' in c && (c.content as { type: string }).type === 'tool-result',
  );
  expect(toolResults.length).toBeGreaterThan(0);
});

it('resumes the stream after resume with denial', async () => {
  const agent = createAgentWithInterruptibleTool('anthropic');
  const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');
  const chunks = await collectStreamChunks(fullStream);

  const event = (chunksOfType(chunks, 'tool-call-suspended')[0]) as StreamChunk & { type: 'tool-call-suspended' };

  const { fullStream: resumedStream } = await agent.resume(
    { approved: false },
    { runId: event.runId!, toolCallId: event.toolCallId! },
  );

  const resumedChunks = await collectStreamChunks(resumedStream);
  expect(resumedChunks.map(c => c.type)).toContain('text-delta');
});
```

### Step 3: Delete old test file

```bash
rm src/__tests__/integration/tool-approval.test.ts
```

### Step 4: Run integration tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/integration/tool-interrupt.test.ts 2>&1 | tail -30`

Expected: PASS (if ANTHROPIC_API_KEY set) or SKIP.

### Step 5: Commit

```bash
git add src/__tests__/integration/
git commit -m "test(agents): rewrite integration tests from approval to interrupt system"
```

---

## Task 11: Update Playground — Replace Approve/Deny with Resume

**Files:**
- Delete: `playground/server/api/agent/approve.post.ts`
- Delete: `playground/server/api/agent/deny.post.ts`
- Create: `playground/server/api/agent/resume.post.ts`
- Modify: `playground/server/api/agent/chat.post.ts`
- Modify: `playground/components/ChatPane.vue`

### Step 1: Create resume endpoint

Create `playground/server/api/agent/resume.post.ts`:

```typescript
import { getActiveAgent } from '../../utils/agent-runtime';
import { createSSE } from '../../utils/sse';
import type { StreamChunk } from '@n8n/agents';

interface ResumeRequest {
  runId: string;
  toolCallId: string;
  data: unknown;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ResumeRequest>(event);

  if (!body?.runId || !body?.toolCallId) {
    throw createError({ statusCode: 400, statusMessage: 'runId and toolCallId are required' });
  }

  const agent = getActiveAgent();
  if (!agent) {
    throw createError({ statusCode: 400, statusMessage: 'No active agent' });
  }

  const sse = createSSE(event);

  try {
    const result = await agent.resume(body.data ?? {}, {
      runId: body.runId,
      toolCallId: body.toolCallId,
    });

    if (!result?.fullStream) {
      sse.done();
      return;
    }
    const reader = result.fullStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = value as StreamChunk;
      if (chunk.type === 'text-delta' && 'delta' in chunk) {
        sse.send({ text: chunk.delta });
      } else if (chunk.type === 'content' && 'content' in chunk) {
        const c = chunk.content;
        if (c.type === 'tool-call') {
          sse.send({ toolCall: { tool: c.toolName, input: c.input } });
        } else if (c.type === 'tool-result') {
          sse.send({ toolResult: { tool: c.toolName, output: c.result } });
        }
      } else if (chunk.type === 'tool-call-suspended') {
        sse.send({
          suspended: {
            runId: chunk.runId,
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            input: chunk.input,
            suspendPayload: chunk.suspendPayload,
          },
        });
      }
    }

    sse.done();
  } catch (e) {
    sse.error(e instanceof Error ? e.message : 'Failed to resume');
  }
});
```

### Step 2: Delete old endpoints

```bash
rm playground/server/api/agent/approve.post.ts
rm playground/server/api/agent/deny.post.ts
```

### Step 3: Update chat.post.ts

Replace `tool-call-approval` handling with `tool-call-suspended`:

```typescript
// Replace:
} else if (chunk.type === 'tool-call-approval' && 'tool' in chunk) {
  sse.send({
    approval: { ... },
  });
}

// With:
} else if (chunk.type === 'tool-call-suspended' && 'toolName' in chunk) {
  sse.send({
    suspended: {
      runId: chunk.runId,
      toolCallId: chunk.toolCallId,
      toolName: chunk.toolName,
      input: chunk.input,
      suspendPayload: chunk.suspendPayload,
    },
  });
}
```

### Step 4: Update ChatPane.vue

- Replace `data.approval` SSE handler with `data.suspended`
- Replace separate `/api/agent/approve` and `/api/agent/deny` fetch calls with single `/api/agent/resume` call
- The resume call sends `{ runId, toolCallId, data: { approved: true/false } }`

### Step 5: Commit

```bash
git add playground/
git commit -m "feat(agents): replace approve/deny playground endpoints with generic resume"
```

---

## Task 12: Update Examples and Docs

**Files:**
- Modify: `examples/basic-agent.ts`
- Modify: `AGENTS.md`

### Step 1: Grep and update

Search for `requiresApproval`, `approveToolCall`, `declineToolCall`, `tool-call-approval`, `waiting_approval` across examples/ and AGENTS.md. Replace with interrupt equivalents.

### Step 2: Commit

```bash
git add examples/ AGENTS.md
git commit -m "docs(agents): update examples and docs for interrupt API"
```

---

## Task 13: Full Verification

### Step 1: Build

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm build > /tmp/build.log 2>&1 && tail -5 /tmp/build.log`

Expected: Clean build.

### Step 2: Typecheck

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm typecheck 2>&1 | tail -10`

Expected: No errors.

### Step 3: All unit tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test 2>&1 | tail -20`

Expected: All tests pass.

### Step 4: Lint and format

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm lint 2>&1 | tail -10 && pnpm format 2>&1 | tail -10`

Expected: Clean.

### Step 5: Integration tests (if API keys available)

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/integration/tool-interrupt.test.ts 2>&1 | tail -20`

Expected: PASS or SKIP.

### Step 6: Evaluate integration tests

Run: `pushd /Users/michael.drury/n8n/n8n-v3/packages/@n8n/agents && pnpm test src/__tests__/integration/evaluate.test.ts 2>&1 | tail -20`

Expected: PASS or SKIP.

---

## Summary of Changes

| What | Before | After |
|------|--------|-------|
| Tool builder | `.requiresApproval()` | `.suspend(schema).resume(schema)` |
| Handler context | `ToolContext` with stub `pause()` | `InterruptibleToolContext<S, R>` with typed `suspend()` and `resumeData` |
| suspend() mechanism | N/A | `return await mastraCtx.agent.suspend(payload)` (branded InnerOutput) |
| Agent API | `approveToolCall()` / `declineToolCall()` | `resume(data, { runId, toolCallId })` |
| Stream event | `tool-call-approval` | `tool-call-suspended` (carries suspend payload) |
| BuiltTool | `_approval` flag | `_suspendSchema` / `_resumeSchema` |
| BuiltAgent | `approveToolCall()` / `declineToolCall()` | `resume()` |
| Run interface | `approve()` / `deny()` | `resume()` (already existed) |
| RunState | `waiting_approval` | `suspended` |
| StateChangeEvent | `context.approvalId` | `context.suspendId` |
| DatasetRow | `approvals: Record<string, 'approve' \| 'deny'>` | `resumeData: Record<string, 'deny' \| Record<string, unknown>>` |
| evaluate() | `drainStreamWithApprovals()` + `approveToolCall/declineToolCall` | `drainStreamWithInterrupts()` + `resume()` |
| Network | `'approveToolCall' in a` detection | `'resume' in a` detection |
| Playground | Separate approve/deny endpoints | Single resume endpoint |
| Checkpoint validation | "tools with requiresApproval" | "tools with suspend/resume schemas" |
