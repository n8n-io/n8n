# Tool System

The agent's ability to interact with the n8n instance through 17 native tools
plus any number of external MCP tools.

## Architecture

Tools follow a **factory-with-closure** pattern. Each tool factory receives the
`InstanceAiContext` and returns a Mastra `createTool()` definition that captures
the context via closure:

```
createAllTools(context)
  ├── createListWorkflowsTool(context)
  ├── createGetWorkflowTool(context)
  ├── ...
  └── createGetNodeDescriptionTool(context)
```

The context bundles four service interfaces:

```typescript
interface InstanceAiContext {
  userId: string;
  workflowService: InstanceAiWorkflowService;
  executionService: InstanceAiExecutionService;
  credentialService: InstanceAiCredentialService;
  nodeService: InstanceAiNodeService;
}
```

These interfaces are defined in `@n8n/instance-ai` and implemented by the
backend adapter service. This dependency inversion means the agent package has
no direct dependency on n8n internals.

## Tool Categories

### Workflow Tools (6)

| Tool | Purpose | Key Inputs | Output |
|------|---------|------------|--------|
| `list-workflows` | Discover existing workflows | `query?`, `limit?` (1-100, default 50) | `{ workflows: WorkflowSummary[] }` |
| `get-workflow` | Full workflow details (nodes, connections) | `workflowId` | `WorkflowDetail` |
| `create-workflow` | Create a new workflow | `name`, `nodes?`, `connections?`, `settings?` | `WorkflowDetail` |
| `update-workflow` | Modify an existing workflow | `workflowId`, `name?`, `nodes?`, `connections?`, `settings?` | `{ id, name, active }` |
| `delete-workflow` | Permanently delete a workflow | `workflowId` | `{ success: boolean }` |
| `activate-workflow` | Toggle active state | `workflowId`, `active` (boolean) | `{ success: boolean }` |

#### Workflow Data Shapes

```typescript
// WorkflowSummary (used in list results)
{
  id: string;
  name: string;
  active: boolean;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}

// WorkflowDetail (used in get/create responses)
{
  ...WorkflowSummary,
  nodes: Array<{
    name: string;                          // Unique display name
    type: string;                          // e.g. "n8n-nodes-base.httpRequest"
    parameters?: Record<string, unknown>;
    position: [number, number];            // [x, y] canvas coordinates
  }>;
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
}
```

#### Behavioral Notes

- **delete-workflow**: The system prompt instructs the agent to always confirm
  with the user before calling this tool.
- **activate-workflow**: Routes internally to `activate()` or `deactivate()`
  based on the `active` boolean flag.

---

### Execution Tools (3)

| Tool | Purpose | Key Inputs | Output |
|------|---------|------------|--------|
| `run-workflow` | Execute a workflow | `workflowId`, `inputData?` | `{ executionId: string }` |
| `get-execution` | Check execution status/result | `executionId` | `ExecutionResult` |
| `debug-execution` | Analyze a failed execution | `executionId` | `ExecutionResult` |

#### ExecutionResult Shape

```typescript
{
  executionId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  data?: Record<string, unknown>;   // Node output data
  error?: string;                   // Error message if failed
  startedAt?: string;               // ISO timestamp
  finishedAt?: string;              // ISO timestamp
}
```

#### Pin Data Injection (`run-workflow`)

When `inputData` is provided, the adapter:

1. Fetches the workflow and finds the first trigger node (checks for `'Trigger'`,
   `'trigger'`, or `'webhook'` in the node type string)
2. Wraps the input data as **pin data** on that trigger node:
   ```typescript
   pinData = { [triggerNode.name]: [{ json: inputData }] }
   ```
3. Runs the workflow with `executionMode: 'manual'` and the pin data injected
4. Waits for the execution to complete via `activeExecutions.getPostExecutePromise()`
5. Returns the execution ID

This allows the agent to test workflows with specific input without needing
actual trigger events.

#### Execution Result Extraction

The adapter extracts results by:
1. Loading the execution with `includeData: true, unflattenData: true`
2. Mapping status: `error`/`crashed` -> `'error'`, `running`/`new` -> `'running'`,
   `waiting` -> `'waiting'`, everything else -> `'success'`
3. Extracting output data from `runData[nodeName][lastRun].data.main` (flattened)

#### Debug vs Get

`debug-execution` returns the same `ExecutionResult` as `get-execution`. The
difference is behavioral: the system prompt instructs the agent to analyze the
result, identify the failing node, explain the error cause, and suggest fixes.

---

### Credential Tools (6)

| Tool | Purpose | Key Inputs | Output |
|------|---------|------------|--------|
| `list-credentials` | Discover credentials | `type?` | `{ credentials: CredentialSummary[] }` |
| `get-credential` | Credential metadata | `credentialId` | `CredentialDetail` |
| `create-credential` | Create a new credential | `name`, `type`, `data` | `CredentialSummary` |
| `update-credential` | Update name or data | `credentialId`, `name?`, `data?` | `CredentialSummary` |
| `delete-credential` | Permanently delete | `credentialId` | `{ success: boolean }` |
| `test-credential` | Validate connectivity | `credentialId` | `{ success: boolean, message? }` |

#### Credential Data Shapes

```typescript
// CredentialSummary
{
  id: string;
  name: string;
  type: string;        // e.g. "notionApi", "slackOAuth2Api"
  createdAt: string;
  updatedAt: string;
}

// CredentialDetail
{
  ...CredentialSummary,
  nodesWithAccess?: Array<{ nodeType: string }>;
}
```

#### Credential Safety

Secrets never leave the adapter layer:

- **`list-credentials`** and **`get-credential`** return only metadata (name,
  type, dates). Decrypted data is explicitly excluded.
- **`test-credential`** fetches decrypted data server-side to perform the test
  but only returns `{ success, message }` to the agent.
- The system prompt reinforces: *"Never expose credential secrets — only show
  metadata."*

---

### Node Discovery Tools (2)

| Tool | Purpose | Key Inputs | Output |
|------|---------|------------|--------|
| `list-nodes` | Browse available node types | `query?` | `{ nodes: NodeSummary[] }` |
| `get-node-description` | Detailed node configuration | `nodeType` | `NodeDescription` |

#### Node Data Shapes

```typescript
// NodeSummary
{
  name: string;           // e.g. "n8n-nodes-base.slack"
  displayName: string;    // e.g. "Slack"
  description: string;
  group: string[];        // Category path
  version: number;
}

// NodeDescription
{
  ...NodeSummary,
  properties: Array<{
    displayName: string;
    name: string;
    type: string;          // "string", "number", "options", etc.
    required?: boolean;
    description?: string;
    default?: unknown;
    options?: Array<{ name: string; value: string | number | boolean }>;
  }>;
  credentials?: Array<{ name: string; required?: boolean }>;
  inputs: string[];
  outputs: string[];
}
```

#### Implementation

The node adapter calls `loadNodesAndCredentials.collectTypes()` to get all
registered node types. Filtering is case-insensitive across `displayName`,
`name`, and `description`.

## MCP Tool Merging

When MCP servers are configured, their tools are loaded via `McpClientManager`
and merged into the agent's tool dictionary alongside native tools:

```typescript
const nativeTools = createAllTools(context);
const mcpTools = await mcpClient.listTools();

new Agent({
  tools: { ...nativeTools, ...mcpTools },
  // ...
});
```

MCP tools appear identically to native tools from the agent's perspective. See
[MCP Integration](../mcp/) for details.

## Permission Scoping

Every tool operation respects the authenticated user's permissions:

- Workflow operations use `workflowFinderService.findWorkflowForUser()` which
  checks `workflow:read`, `workflow:execute`, etc.
- Credential operations go through `credentialsService` which enforces ownership
  and sharing rules.
- The agent cannot access workflows or credentials the user doesn't have
  permission to see.

## Related Docs

- [Backend Module](../../internals/backend-module.md) — adapter service that implements the interfaces
- [MCP Integration](../mcp/) — extending tools via external servers
- [Chat & Streaming](../chat/) — how tool call/result chunks flow to the UI
