# Tool Reference

All native tools the Instance AI agent has access to. Tools are organized by
domain and each defines its input/output schema via Zod.

## Workflow Tools (6)

### `list-workflows`

List workflows accessible to the current user.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | no | — | Filter workflows by name |
| `limit` | number | no | 50 | Max results (1–100) |

**Returns**: `{ workflows: [{ id, name, active, createdAt, updatedAt }] }`

### `get-workflow`

Get full workflow definition including nodes, connections, and settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |

**Returns**: `{ id, name, active, nodes: [{ name, type, parameters, position }], connections, settings }`

### `create-workflow`

Create a new workflow.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Workflow name |
| `nodes` | array | no | Node definitions |
| `connections` | object | no | Node connections |
| `settings` | object | no | Workflow settings |

**Returns**: Full workflow object (same as `get-workflow`)

### `update-workflow`

Update an existing workflow. Only provided fields are changed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to update |
| `name` | string | no | New name |
| `nodes` | array | no | Replaces all nodes |
| `connections` | object | no | Replaces connections |
| `settings` | object | no | Replaces settings |

**Returns**: `{ id, name, active }`

### `delete-workflow`

Permanently delete a workflow. **Irreversible** — agent must confirm with user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to delete |

**Returns**: `{ success: boolean }`

### `activate-workflow`

Activate or deactivate a workflow.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `active` | boolean | yes | `true` to activate, `false` to deactivate |

**Returns**: `{ success: boolean }`

---

## Execution Tools (4)

### `list-executions`

List recent workflow executions.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | no | — | Filter by workflow |
| `status` | string | no | — | `success`, `error`, `running`, `waiting` |
| `limit` | number | no | 20 | Max results (1–100) |

**Returns**: `{ executions: [{ id, workflowId, workflowName, status, startedAt, finishedAt, mode }] }`

### `run-workflow`

Execute a workflow and return the execution ID. Use `get-execution` to check results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to run |
| `inputData` | object | no | Data passed to the trigger node |

**Returns**: `{ executionId: string }`

**Note**: When `inputData` is provided, the adapter finds the first trigger node
and injects data as pin data.

### `get-execution`

Get execution status and results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution ID |

**Returns**: `{ executionId, status, data?, error?, startedAt?, finishedAt? }`

Status values: `running`, `success`, `error`, `waiting`

### `debug-execution`

Analyze a failed execution to identify the failing node, error cause, and suggest fixes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Failed execution to debug |

**Returns**: Same as `get-execution`. The agent analyzes the full execution data
to identify root cause and suggest fixes.

---

## Credential Tools (6)

### `list-credentials`

List credentials accessible to the current user. Never exposes secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | no | Filter by credential type (e.g., `notionApi`) |

**Returns**: `{ credentials: [{ id, name, type, createdAt, updatedAt }] }`

### `get-credential`

Get credential metadata. Never returns decrypted secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential ID |

**Returns**: `{ id, name, type, createdAt, updatedAt, nodesWithAccess? }`

### `create-credential`

Create a new credential.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Display name |
| `type` | string | yes | Credential type (e.g., `notionApi`) |
| `data` | object | yes | Credential configuration (e.g., `{ apiKey: "..." }`) |

**Returns**: `{ id, name, type }`

### `update-credential`

Update credential name or configuration data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to update |
| `name` | string | no | New display name |
| `data` | object | no | Updated configuration |

**Returns**: `{ id, name, type }`

### `delete-credential`

Permanently delete a credential. **Irreversible** — agent must confirm with user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to delete |

**Returns**: `{ success: boolean }`

### `test-credential`

Test whether a credential is valid and can connect to its service.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to test |

**Returns**: `{ success: boolean, message?: string }`

---

## Node Discovery Tools (2)

### `list-nodes`

List available node types in the n8n instance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | no | Filter by name or description (e.g., `slack`, `http`) |

**Returns**: `{ nodes: [{ name, displayName, description, group, version }] }`

### `get-node-description`

Get detailed node description including properties, credentials, inputs, and outputs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type (e.g., `n8n-nodes-base.httpRequest`) |

**Returns**: `{ name, displayName, description, group, version, properties: [...], credentials: [...], inputs, outputs }`

---

## Adding New Tools

1. Create a file in `src/tools/<domain>/` following the naming convention `<verb>-<noun>.tool.ts`
2. Define input/output schemas with Zod
3. Export a factory function that takes the service context and returns a Mastra tool
4. Register the tool in `src/tools/index.ts`
5. If the tool requires a new service method, add it to the interface in `src/types.ts`
   and implement it in the backend adapter
