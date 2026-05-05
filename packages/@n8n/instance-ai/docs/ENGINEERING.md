# Engineering Standards

Concrete standards for Instance AI development. Every implementation ticket
should follow these. When reviewing code, check against this list.

## TypeScript

### No escape hatches

Events flow from backend agents through the event bus to the frontend store
and renderer. A single `any` or `as` cast breaks the chain — the compiler
can no longer verify that every event type is handled everywhere. Strict
typing means adding a new event type produces compile errors at every
unhandled switch, not silent runtime bugs.

```typescript
// NEVER
const result: any = await agent.stream(msg);
const data = response as ExecutionResult;

// INSTEAD — use the type system
const result: StreamResult<InstanceAiEvent> = await agent.stream(msg);
const data: ExecutionResult = parseExecutionResult(response);
```

- No `any` — use `unknown` + type narrowing if the type is truly unknown
- No `as` casts — use type guards, discriminated unions, or `satisfies`
- Exhaustive switches for unions — the compiler catches missing cases

### Zod schemas are the source of truth

Every tool has an input schema (what the LLM sends) and an output schema
(what the tool returns). Mastra uses these schemas to generate tool
descriptions for the LLM, validate inputs at runtime, and type-check the
execute function. If the TypeScript type and the Zod schema are defined
separately, they drift — the LLM sees one contract, the code enforces
another, and bugs hide until production.

```typescript
// NEVER — separate schema and type that can drift
interface ListWorkflowsInput { query?: string; limit?: number; }
const schema = z.object({ query: z.string().optional(), limit: z.number().optional() });

// INSTEAD — infer the type from the schema
const listWorkflowsInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
type ListWorkflowsInput = z.infer<typeof listWorkflowsInputSchema>;
```

This applies to tool schemas, event payloads, API request/response bodies,
and plan state.

### Discriminated unions for events

Each event type has a different payload shape. Discriminated unions let the
compiler narrow the payload inside each case — no runtime checks, no
possibility of accessing the wrong field. Adding a new event type to the
union turns every unhandled switch into a compile error.

```typescript
case 'text-delta':
  node.textContent += event.payload.text; // ← compiler knows this is string
  break;

case 'tool-call':
  node.toolCalls.push({
    toolCallId: event.payload.toolCallId, // ← compiler knows this is string
    toolName: event.payload.toolName,
    ...
  });
  break;
```

### Branded types for IDs

The event system passes `runId`, `agentId`, `threadId`, and `toolCallId`
through the same functions — all strings. Branded types make the compiler
catch swapped arguments that would otherwise be silent wrong-lookup bugs.

```typescript
type RunId = string & { readonly __brand: 'RunId' };
type AgentId = string & { readonly __brand: 'AgentId' };
type ThreadId = string & { readonly __brand: 'ThreadId' };
type ToolCallId = string & { readonly __brand: 'ToolCallId' };

// Compiler prevents: findMessageByRunId(state, agentId)
```

Optional but valuable where multiple ID strings flow through the same code.

## Testing

### Test behavior, not implementation

The deep agent architecture will evolve rapidly — sub-agent mechanics, event
bus internals, and reducer logic will change as we learn. Tests that assert
on internal method calls break on every refactor. Tests that assert on
observable outcomes survive refactors and catch real regressions.

```typescript
// BAD — breaks when internals change
it('should call eventBus.publish with the right args', () => {
  expect(eventBus.publish).toHaveBeenCalledWith('thread-1', {
    type: 'tool-call', agentId: 'a1', ...
  });
});

// GOOD — tests what the user/frontend actually sees
it('should stream tool-call event when agent uses a tool', async () => {
  const events = await collectEvents(agent.stream('list my workflows'));
  const toolCall = events.find(e => e.type === 'tool-call');
  expect(toolCall).toBeDefined();
  expect(toolCall!.payload.toolName).toBe('list-workflows');
});
```

### Test the contract, not the internals

The clean interface boundary (ADR-002) makes each layer testable in
isolation. Verify the contract at each boundary — not the wiring between
them. Tools can be tested without Mastra, the reducer without SSE, adapters
without the agent.

For each tool, test:
- Valid input → expected output shape
- Invalid input → Zod validation error
- Service method called with correct args (verify the interface boundary)
- Error from service → tool error propagated correctly

For the event reducer, test:
- Each event type mutates state correctly
- Event ordering edge cases (e.g., tool-result before tool-call)
- Mid-run replay creates placeholder correctly
- Thread switch clears and replays

### Test edge cases that matter

The autonomous loop introduces failure modes that don't exist in simple
request/response systems. Write tests for the scenarios that would be
hardest to debug after the fact.

```typescript
it('should handle run-finish after connection drop and reconnect', ...);
it('should not lose events when sub-agent completes during page reload', ...);
it('should reject delegate with MCP tool names', ...);
it('should not leak credentials in tool-call args for credential tools', ...);
```

### No snapshot tests for dynamic data

Agent responses contain timestamps, generated IDs, and non-deterministic
ordering. Snapshots against this data break constantly and get bulk-updated
without review — they stop catching bugs. Use structural assertions that
verify the shape and relationships you care about.

```typescript
// BAD
expect(agentTree).toMatchSnapshot();

// GOOD
expect(agentTree.children).toHaveLength(1);
expect(agentTree.children[0].role).toBe('workflow builder');
expect(agentTree.children[0].status).toBe('completed');
```

## DRY

### Single source of truth

The same concepts (event types, tool schemas, replay rules) are used by
backend, frontend, docs, and tickets. If a definition exists in two places,
they diverge — we've already caught this multiple times during doc reviews.
One canonical location per concept, everything else imports or references it.

| Concept | Source of truth | Consumers |
|---|---|---|
| Event types | `@n8n/api-types` TypeScript unions | Backend, frontend, docs |
| Tool schemas | Zod schemas in `src/tools/` | Agent, tests, docs |
| Plan schema | Zod schema in `src/tools/orchestration/` | Agent, frontend, docs |
| Config vars | `@n8n/config` class | Backend, docs |
| Replay rule | `streaming-protocol.md` canonical table | Frontend, backend, tickets |

### Shared types in `@n8n/api-types`

Frontend and backend are separate packages but must agree on event shapes,
API types, and status enums. Separate definitions drift silently — the
backend emits `status: "cancelled"` while the frontend checks
`status: "canceled"`. Shared types make this a compile error.

```typescript
// @n8n/api-types — single definition
export type InstanceAiEvent = RunStartEvent | RunFinishEvent | ...;

// Both sides import the same type
import type { InstanceAiEvent } from '@n8n/api-types';
```

### Avoid parallel hierarchies

When backend and frontend both switch on event types with duplicated logic,
a change to the format requires updating both in lockstep. Extract the
shared part into `@n8n/api-types` or a shared utility.

## Mastra Patterns

### Tool definitions

Mastra uses Zod schemas for both runtime validation and LLM tool
descriptions. The `.describe()` strings on schema fields become the
parameter descriptions the LLM sees when deciding how to call a tool.
Missing or vague descriptions lead to bad tool calls. The `outputSchema`
lets Mastra validate return values and gives the LLM structured expectations.

- Always define both `inputSchema` and `outputSchema`
- Use `.describe()` on Zod fields — these are the LLM's parameter docs
- Capture service context via closure in the factory function, not globals
- Keep `execute` focused — delegate to service methods, no business logic
  in tools

```typescript
export function createListWorkflowsTool(context: InstanceAiContext) {
  return createTool({
    id: 'list-workflows',
    description: 'List workflows accessible to the current user.',
    inputSchema: z.object({
      query: z.string().optional().describe('Filter workflows by name'),
      limit: z.number().int().min(1).max(100).default(50).describe('Max results'),
    }),
    outputSchema: z.object({
      workflows: z.array(workflowSummarySchema),
    }),
    execute: async ({ query, limit }) => {
      const workflows = await context.workflowService.list({ query, limit });
      return { workflows };
    },
  });
}
```

### Memory usage

The memory system is thread-scoped. Writing observations from a sub-agent
corrupts the orchestrator's context, and manually summarizing tool results
fights with the Observer doing the same thing.

- Never read/write memory from sub-agents — they're stateless by design
- Let observational memory handle compression — don't manually summarize

### Agent creation

Each request has its own user context (permissions, MCP config). Caching
agents across requests risks serving wrong permissions. Sub-agents with the
full tool set can call tools the orchestrator didn't intend — the minimal
tool set is both a security boundary and context optimization.

- Agent per request (ADR-003) — don't cache agent instances
- Pass all context via the factory function — no ambient globals
- Sub-agents get the minimum tool set needed

## Abstractions

### Right level of abstraction

The clean interface boundary (ADR-002) keeps the agent core free of n8n
dependencies — testable in isolation and potentially reusable outside n8n.
Skipping a layer breaks testability. Adding an unnecessary layer adds
indirection without value.

```
Tool (thin wrapper)  →  Service interface  →  Adapter (n8n bridge)  →  n8n internals
     Zod schemas          Pure TypeScript        DI + permissions        Framework-specific
```

- **Tools** — validate input, call service, return output
- **Service interfaces** — pure TypeScript, no n8n imports
- **Adapters** — permissions, data transformation, error mapping
- Don't skip layers, don't add unnecessary ones

### Abstract over transport, not around it

n8n runs single instance (in-process) and queue mode (Redis). The same agent
code must work in both without knowing which. If the interface leaks
transport details, every event publisher needs Redis knowledge and testing
locally requires a Redis dependency. Domain-level interfaces keep agent code
portable and tests simple.

```typescript
// GOOD — domain-level
publish(threadId: string, event: InstanceAiEvent): void;
subscribe(threadId: string, handler: (event: InstanceAiEvent) => void): Unsubscribe;

// BAD — transport leaked
publish(channel: string, message: string): void;
subscribe(channel: string, callback: (channel: string, message: string) => void): void;
```

### Don't abstract prematurely

This project is built with AI tools, which tend to over-abstract. The
autonomous loop design is still evolving — a premature abstraction becomes
a constraint rather than an enabler.

- Three similar lines is better than a premature helper
- Don't extract until the pattern repeats 3+ times
- Don't wrap framework primitives before the API is stable
- Let patterns emerge from implementation, then extract

## Standard Acceptance Criteria

Every implementation ticket should include these in addition to its
feature-specific ACs:

```markdown
## Standard ACs (all tickets)

- [ ] No `any` types or `as` casts in new code
- [ ] Types inferred from Zod schemas where applicable
- [ ] Tests cover behavior (not implementation), including edge cases
- [ ] No type/schema duplication — shared definitions in `@n8n/api-types`
- [ ] Typecheck passes (`pnpm typecheck` in package directory)
- [ ] Lint passes (`pnpm lint` in package directory)
```
