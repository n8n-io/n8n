# Backend Module

The CLI integration layer that connects the `@n8n/instance-ai` agent package to
the n8n application.

## Module Lifecycle

```mermaid
sequenceDiagram
    participant Registry as ModuleRegistry
    participant Module as InstanceAiModule
    participant Service as InstanceAiService
    participant Controller as InstanceAiController

    Registry->>Module: loadModules() — dynamic import
    Registry->>Module: init()
    Module->>Controller: import('./instance-ai.controller')
    Registry->>Module: settings()
    Module->>Service: isEnabled()
    Service-->>Module: { enabled: boolean }
    Module-->>Registry: { enabled }

    Note over Registry: Application running...

    Registry->>Module: shutdown()
    Module->>Service: shutdown()
    Service->>Service: mcpClientManager.disconnect()
```

### Registration

`InstanceAiModule` is registered in `module-registry.ts` as a **default module**,
meaning it loads automatically without explicit opt-in.

```typescript
@BackendModule({ name: 'instance-ai', instanceTypes: ['main'] })
export class InstanceAiModule implements ModuleInterface { ... }
```

Key constraints:
- **Instance type**: `'main'` only — does not run on worker or runner instances
- **Enabled check**: `settings()` returns `{ enabled: true }` only if
  `N8N_INSTANCE_AI_MODEL` is set
- **Disabling**: Add `instance-ai` to `N8N_DISABLED_MODULES` to prevent loading

### Lifecycle Methods

| Method | When | What |
|--------|------|------|
| `init()` | Module initialization | Dynamically imports the controller to register routes |
| `settings()` | After init | Returns `{ enabled }` based on whether a model is configured |
| `shutdown()` | Application shutdown | Disconnects MCP clients via the service |

## Controller

`InstanceAiController` exposes a single streaming endpoint.

```typescript
@RestController('/instance-ai')
export class InstanceAiController {
  @Post('/chat/:threadId')
  async chat(req: AuthenticatedRequest, res: FlushableResponse, threadId: string): Promise<void>
}
```

### Route: `POST /instance-ai/chat/:threadId`

**Authentication**: Required (`AuthenticatedRequest` ensures `req.user` exists).

**Request body**:
```json
{ "message": "Create a workflow that sends a Slack message every morning" }
```

**Response**: Newline-delimited JSON stream.

### Request Flow

1. Validate `message` is present (400 if missing)
2. Set streaming headers and flush immediately:
   ```
   Content-Type: application/octet-stream
   Cache-Control: no-cache
   Connection: keep-alive
   X-Accel-Buffering: no
   ```
3. Call `instanceAiService.sendMessage(user, threadId, message)` — returns
   `AsyncIterable<unknown>`
4. Iterate the stream, writing each chunk as `JSON.stringify(chunk) + '\n'`
   with `res.flush()` after each write
5. Write final `{ "type": "done" }` chunk and end the response

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Headers not yet sent | Returns standard JSON error with HTTP 500 |
| Headers already sent | Writes `{ type: "error", content: "..." }` chunk and ends stream |

### Dependencies

```typescript
constructor(
  private readonly logger: Logger,
  private readonly instanceAiService: InstanceAiService,
  private readonly errorReporter: ErrorReporter,
)
```

## Service

`InstanceAiService` manages agent creation and configuration.

```typescript
@Service()
export class InstanceAiService {
  isEnabled(): boolean;
  async sendMessage(user: User, threadId: string, message: string): Promise<AsyncIterable<unknown>>;
  async shutdown(): Promise<void>;
}
```

### `isEnabled()`

Returns `true` if `instanceAiConfig.model` is set (i.e. `N8N_INSTANCE_AI_MODEL`
has a value).

### `sendMessage(user, threadId, message)`

Creates a fresh agent per request:

1. **Create context**: `adapterService.createContext(user)` — builds the
   user-scoped service adapters
2. **Parse MCP servers**: Converts the `N8N_INSTANCE_AI_MCP_SERVERS` string
   into `McpServerConfig[]`
3. **Build storage URL**: PostgreSQL connection string or SQLite file path
4. **Create agent**: `createInstanceAgent()` with:
   - `modelId` from config
   - `context` from adapter
   - `mcpServers` from config
   - `memoryConfig` with storage URL, embedder model, message window, semantic recall settings
5. **Stream**: `agent.stream(message, { memory: { resource: userId, thread: threadId } })`
6. **Return**: The `fullStream` async iterable

### `shutdown()`

Disconnects MCP clients and logs completion.

### MCP Server Parsing

The `parseMcpServers()` private method parses the comma-separated env var:

```
Input:  "github=https://mcp.github.com/sse,db=https://mcp-db.local/sse"
Output: [
  { name: "github", url: "https://mcp.github.com/sse" },
  { name: "db",     url: "https://mcp-db.local/sse" },
]
```

### Storage URL Construction

```
PostgreSQL: postgresql://user:password@host:port/database
SQLite:     file:instance-ai-memory.db
```

The service detects the database type from the existing n8n database
configuration (`dbType` field).

## Adapter Service

`InstanceAiAdapterService` bridges n8n's internal services to the agent's
interface contracts.

```typescript
@Service()
export class InstanceAiAdapterService {
  createContext(user: User): InstanceAiContext;
}
```

### `createContext(user)`

Returns an `InstanceAiContext` with four service adapters, all scoped to the
authenticated user:

```typescript
{
  userId: user.id,
  workflowService: this.createWorkflowAdapter(user),
  executionService: this.createExecutionAdapter(user),
  credentialService: this.createCredentialAdapter(user),
  nodeService: this.createNodeAdapter(),
}
```

### Workflow Adapter

Maps `InstanceAiWorkflowService` to n8n's `WorkflowService` and
`WorkflowFinderService`.

| Interface Method | n8n Service Call |
|-----------------|-----------------|
| `list(options?)` | `workflowService.getMany(user, { take, filter })` |
| `get(workflowId)` | `workflowFinderService.findWorkflowForUser(id, user, ['workflow:read'])` |
| `create(data)` | `workflowRepository.save(new WorkflowEntity(...))` |
| `update(id, updates)` | `workflowService.update(user, updateData, id)` |
| `delete(id)` | `workflowService.delete(user, id)` |
| `activate(id)` | `workflowService.activateWorkflow(user, id)` |
| `deactivate(id)` | `workflowService.deactivateWorkflow(user, id)` |

Permission checking is built into the n8n services — the adapter doesn't need
separate authorization logic.

### Execution Adapter

Maps `InstanceAiExecutionService` to n8n's `WorkflowRunner` and
`ActiveExecutions`.

| Interface Method | Implementation |
|-----------------|----------------|
| `run(workflowId, inputData?)` | Fetches workflow, finds trigger node, injects pin data, runs via `workflowRunner.run()` |
| `getStatus(executionId)` | Checks `activeExecutions` for running state, otherwise queries DB |
| `getResult(executionId)` | Waits for completion via `getPostExecutePromise()`, extracts result |

**Pin data injection flow** (for `run`):
1. Fetch workflow with `['workflow:execute']` permission
2. Find first trigger node (type contains `'Trigger'`, `'trigger'`, or `'webhook'`)
3. If `inputData` and trigger found: `pinData = { [triggerNode.name]: [{ json: inputData }] }`
4. Run with `executionMode: 'manual'`
5. Wait for completion, return `{ executionId }`

**Result extraction**:
- Queries execution with `includeData: true, unflattenData: true`
- Maps status: `error`/`crashed` -> `'error'`, `running`/`new` -> `'running'`,
  `waiting` -> `'waiting'`, else -> `'success'`
- Extracts output from `runData[nodeName][lastRun].data.main` (flattened)

### Credential Adapter

Maps `InstanceAiCredentialService` to n8n's `CredentialsService`.

| Interface Method | Implementation |
|-----------------|----------------|
| `list(options?)` | `credentialsService.getMany(user, { filter: { type } })` |
| `get(credentialId)` | `credentialsService.getOne(user, id, false)` — encrypted, no secrets |
| `create(data)` | `credentialsService.createUnmanagedCredential(data, user)` |
| `update(id, updates)` | Fetches existing, updates name, saves |
| `delete(id)` | `credentialsService.delete(user, id)` |
| `test(id)` | Fetches with decryption, calls `credentialsService.test()`, returns `{ success, message }` |

**Security**: `get()` passes `false` for the decrypt parameter — the agent never
sees raw secrets.

### Node Adapter

Maps `InstanceAiNodeService` to n8n's `LoadNodesAndCredentials`.

| Interface Method | Implementation |
|-----------------|----------------|
| `listAvailable(options?)` | `loadNodesAndCredentials.collectTypes()`, optional case-insensitive filter |
| `getDescription(nodeType)` | Finds node by name, maps full property/credential/IO description |

### Dependencies

```typescript
constructor(
  private readonly workflowService: WorkflowService,
  private readonly workflowFinderService: WorkflowFinderService,
  private readonly workflowRepository: WorkflowRepository,
  private readonly executionRepository: ExecutionRepository,
  private readonly credentialsService: CredentialsService,
  private readonly activeExecutions: ActiveExecutions,
  private readonly workflowRunner: WorkflowRunner,
  private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
)
```

## Dependency Inversion

The architecture uses a clean dependency inversion boundary:

```
@n8n/instance-ai (defines interfaces)
    InstanceAiWorkflowService
    InstanceAiExecutionService
    InstanceAiCredentialService
    InstanceAiNodeService

packages/cli (implements interfaces)
    InstanceAiAdapterService.createContext()
        → createWorkflowAdapter()
        → createExecutionAdapter()
        → createCredentialAdapter()
        → createNodeAdapter()
```

The agent package has zero knowledge of n8n internals (TypeORM, Express,
services). It only knows the interfaces defined in `types.ts`. The CLI module
provides concrete implementations that delegate to real n8n services.

## Related Docs

- [Tool System](../features/tools/) — the tools that consume these adapters
- [Chat & Streaming](../features/chat/) — the full request/response flow
- [Configuration](../configuration.md) — environment variables used by the service
- [Memory System](../features/memory/) — how the service builds memory config
