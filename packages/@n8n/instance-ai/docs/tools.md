# Tool Reference

All tools the Instance AI agent has access to. Tools are organized into
orchestration tools (used by the orchestrator for loop control) and domain tools
(used by the orchestrator directly or delegated to sub-agents). Each tool defines
its input/output schema via Zod.

## Orchestration Tools (2)

These tools are exclusive to the orchestrator agent. Sub-agents do not receive
them.

### `plan`

Create, update, or review the execution plan. The orchestrator must call this
tool before and after each phase of the autonomous loop. This serves as a
context engineering mechanism — externalizing the plan forces structured
reasoning and prevents goal drift.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | enum | yes | `create`, `update`, or `review` |
| `plan` | object | for create/update | The plan object (see schema below) |

**Plan schema**:

```typescript
{
  goal: string;                     // What the user wants accomplished
  currentPhase: 'build' | 'execute' | 'inspect' | 'evaluate' | 'debug';
  iteration: number;                // Loop iteration count
  steps: [{
    phase: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    result?: string;
  }];
}
```

**Returns**: The current plan state.

**Storage**: Plans are stored in thread-scoped storage (ADR-017). They persist
across reconnects but are isolated per conversation.

### `delegate`

Spawn a dynamically composed sub-agent to handle a focused subtask. The
orchestrator specifies the role, instructions, and tool subset — there is no
fixed taxonomy of sub-agent types.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | yes | Free-form role description (e.g., "workflow builder") |
| `instructions` | string | yes | Task-specific system prompt for the sub-agent |
| `tools` | string[] | yes | Subset of registered native domain tool names |
| `briefing` | string | yes | The specific task to accomplish |
| `artifacts` | object | no | Relevant IDs, data, or context (workflow IDs, etc.) |

**Returns**: `{ result: string }` — the sub-agent's synthesized answer.

**Behavior**:
- Validates `tools` against registered native domain tool names
- Creates a fresh agent with the specified tools, instructions, and low `maxSteps` (10–15)
- Sub-agent publishes events directly to the event bus (ADR-014)
- Sub-agent has no memory — receives context only via the briefing
- Sub-agent cannot use `delegate`, `plan`, or MCP tools
- The synthesized result returns to the orchestrator's context; intermediate
  tool calls stay in the sub-agent's context (clean context separation)

**Common delegation patterns** (guidelines, not constraints):

| Pattern | Tools | When |
|---------|-------|------|
| Building workflows | create-workflow, update-workflow, list-nodes, get-node-description | Complex multi-node workflow creation |
| Debugging failures | get-execution, get-workflow, list-nodes, get-node-description | Analyzing failed executions |
| Evaluating quality | eval tools (TBD) | Running eval triggers, interpreting metrics |
| Checking credentials | list-credentials, test-credential, get-credential | Validating credential setup |
| Exploring capabilities | list-nodes, get-node-description | Finding the right node types |

---

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
| `triggerNodeName` | string | no | Trigger node name when injecting `inputData` |

**Returns**: `{ executionId: string }`

**Note**: When `inputData` is provided, the adapter injects data as pin data.
If `triggerNodeName` is provided, that trigger node is targeted. If omitted, the
adapter falls back to the first trigger node in the workflow definition.

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

## Credential Tools (4)

> **Security note**: The agent never handles raw credential secrets. Credential
> creation and secret configuration is done through the n8n frontend UI (or
> eventually via browser automation). The agent can list, inspect metadata, test,
> and delete credentials, but cannot read or write secret data.

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

### Removed: `create-credential`, `update-credential`

These tools were removed because they accepted raw secret fields in their input,
which would be streamed to the frontend as `tool-call` args — leaking secrets
in the UI, logs, and telemetry. Credential setup must go through the existing
n8n frontend UI where secrets are handled securely, or eventually through
browser automation.

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

## Tool Distribution

Not all tools are available to all agents. The orchestrator has access to
everything; sub-agents receive only what the orchestrator specifies in the
`delegate` call.

| Tool | Orchestrator | Sub-Agents |
|------|:---:|:---:|
| `plan` | ✅ | ❌ |
| `delegate` | ✅ | ❌ |
| All domain tools (16) | ✅ (direct use) | ✅ (via `delegate` tool subset) |
| MCP tools | ✅ | ❌ (orchestrator-only by design) |

---

## Adding New Tools

1. Create a file in `src/tools/<domain>/` following the naming convention `<verb>-<noun>.tool.ts`
2. Define input/output schemas with Zod
3. Export a factory function that takes the service context and returns a Mastra tool
4. Register the tool in `src/tools/index.ts`
5. If the tool requires a new service method, add it to the interface in `src/types.ts`
   and implement it in the backend adapter
6. New native domain tools are automatically available for delegation — the
   orchestrator can include them in sub-agent tool subsets via `delegate`
