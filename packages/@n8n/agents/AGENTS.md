# AGENTS.md

Conventions for the `@n8n/agents` package.

## Code Style

- **No `_` prefix on private properties** — use `private` access modifier
  without underscore. Write `private name: string`, not `private _name: string`.
- **Builder pattern with lazy build** — all public primitives use a fluent
  builder API. **User code never calls `.build()`**. Builders are passed
  directly to the consuming method (e.g. `agent.tool(myTool)`) which calls
  `.build()` internally. Agent and Network have `run()`/`stream()` directly
  on the class, which lazy-build via `ensureBuilt()` on first call. `build()`
  is `protected` on Agent and Network to keep it out of the public API.
- **Zod for schemas** — all input/output schemas use Zod.

## Package Structure

```
src/
  index.ts              # Public API barrel export
  types/                # Public TypeScript types
    index.ts            # Re-exports consumable types
    telemetry.ts
    sdk/                # Types aligned with builders (agent, eval, guardrail, mcp, memory, message, provider, tool)
    runtime/            # Serializable runtime shapes (events, message lists)
    utils/              # JSON typing helpers re-exported with public types
  sdk/                  # Fluent builders and SDK entry points
    agent.ts            # Agent builder
    catalog.ts          # Provider catalog fetch
    eval.ts             # Evaluation primitives
    evaluate.ts         # Evaluation runner over agents + dataset
    guardrail.ts        # Guardrail builder
    mcp-client.ts       # MCP client integration
    memory.ts           # Memory builder
    message.ts          # LLM/DB message helpers
    network.ts          # Network builder
    provider-tools.ts   # Provider-defined tool factories
    telemetry.ts        # Telemetry builder (OTel, redaction)
    tool.ts             # Tool builder
    verify.ts           # Verification utilities
  evals/                # Built-in eval scorers; exported as namespace `evals` from index
  runtime/              # Internal — never exported from index.ts
    agent-runtime.ts    # Core agent execution engine (AI SDK)
    tool-adapter.ts     # Tool execution, branded suspend detection
    stream.ts           # Streaming helpers
    model-factory.ts    # Model instantiation
    memory-store.ts     # Conversation / working-memory persistence hooks
    working-memory.ts   # In-run working memory
    message-list.ts     # Message list + serialization for agent loop
    messages.ts         # Message normalization
    mcp-connection.ts   # MCP connection lifecycle
    mcp-tool-resolver.ts
    run-state.ts        # Run / checkpoint state
    event-bus.ts        # Internal agent events
    runtime-helpers.ts
    title-generation.ts
    strip-orphaned-tool-messages.ts
    logger.ts
  storage/              # Optional persisted memory backends (exported)
    sqlite-memory.ts
    postgres-memory.ts
  workspace/            # Workspace, sandbox, filesystem, built-in tools (exported)
  integrations/         # Optional integrations (exported where applicable)
    langsmith.ts        # LangSmith telemetry adapter (peer `langsmith`)
  utils/                # Internal helpers (e.g. Zod utilities); not barrel-exported
examples/
  basic-agent.ts        # Sample snippet; included in format/lint paths
docs/
  agent-runtime-architecture.md  # In-package runtime notes
```

The **`index.ts`** surface also exports `Workspace` / sandbox / filesystem types,
`SqliteMemory` / `PostgresMemory`, `LangSmithTelemetry`, and `evals` alongside the
core SDK builders.

Optional **peer dependencies** (telemetry): `langsmith`, `@opentelemetry/sdk-trace-node`,
`@opentelemetry/sdk-trace-base`, `@opentelemetry/exporter-trace-otlp-http` — all
optional; install only when wiring that telemetry.

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


## Testing

- Unit tests live in `src/__tests__/`, integration tests in `src/__tests__/integration/`
- Unit tests use Jest (`pnpm test` / `pnpm test:unit`)
- Integration tests use Vitest (`pnpm test:integration`) with real LLM calls
  - A `.env` file at the package root is loaded automatically by the vitest config.
    Always assume it exists when running integration tests. Never commit it.
  - Required keys:
    - `ANTHROPIC_API_KEY` — all integration tests
    - `OPENAI_API_KEY` — semantic recall tests (embeddings)
  - Tests skip automatically when the required API key is not set
- Run from the package directory: `cd packages/@n8n/agents && pnpm test`

## Documentation

- Runtime architecture notes: `docs/agent-runtime-architecture.md` (this package).
- Spec-driven work in the wider repo may use `.claude/specs/` (see repo
  `.claude/skills/spec-driven-development`).

## Building

```bash
cd packages/@n8n/agents
pnpm build       # rimraf dist && tsc -p tsconfig.build.json → dist/
pnpm typecheck   # tsc --noEmit
pnpm test        # jest (unit)
```
