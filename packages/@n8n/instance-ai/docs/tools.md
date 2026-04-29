# Tool Reference

All tools the Instance AI agent has access to. Tools are organized into
orchestration tools (used by the orchestrator for loop control) and domain tools
(used by the orchestrator directly or delegated to sub-agents). Each tool defines
its input/output schema via Zod.

## Orchestration Tools (up to 10)

These tools are exclusive to the orchestrator agent. Sub-agents do not receive
them. Some are conditional on context availability.

### `plan`

Persist a dependency-aware task plan for detached multi-step execution. Use only
when the work requires 2+ tasks with dependencies. The plan is shown to the user
for approval before execution starts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tasks` | array | yes | Dependency-aware execution plan (see schema below) |

**Task schema**:

```typescript
{
  id: string;          // Stable identifier used by dependency edges
  title: string;       // Short user-facing task title
  kind: 'delegate' | 'build-workflow' | 'manage-data-tables' | 'research';
  spec: string;        // Detailed executor briefing for this task
  deps: string[];      // Task IDs that must succeed before this task can start
  tools?: string[];    // Required tool subset for delegate tasks
  workflowId?: string; // Existing workflow ID to modify (build-workflow tasks only)
}
```

**Returns**: `{ result: string, taskCount: number }`

**Behavior**:
- First call persists the plan, publishes `tasks-update` event, and **suspends**
  for user approval
- On approval: calls `schedulePlannedTasks()` to start detached execution
- On denial: returns feedback for the LLM to revise the plan

**Task kinds** map to preconfigured sub-agents:
- `build-workflow` → workflow builder agent (sandbox or tool mode)
- `manage-data-tables` → data table agent (all `*-data-table*` tools)
- `research` → research agent (web-search + fetch-url)
- `delegate` → custom sub-agent with orchestrator-specified tool subset

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
| `conversationContext` | string | no | Summary of what was discussed so far — prevents repeating what user already knows |

**Returns**: `{ result: string }` — the sub-agent's synthesized answer.

**Behavior**:
- Validates `tools` against registered native domain tool names
- Forbids orchestration tools (`plan`, `delegate`) and MCP tools
- Creates a fresh agent with specified tools and low `maxSteps` (default 10)
- Sub-agent publishes events directly to the event bus
- Sub-agent has no memory — receives context only via the briefing
- Past failed attempts from `iterationLog` are appended to the briefing (if available)

### `update-tasks`

Update a visible task checklist for the user. Used for lightweight progress
tracking during synchronous work.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tasks` | array | yes | List of `{id, description, status}` items |

**Returns**: `{ result: string }`

**Behavior**: Saves to storage, publishes `tasks-update` event for live UI refresh.

### `build-workflow-with-agent`

Spawn a specialized builder sub-agent as a background task. Returns immediately —
the builder runs detached from the orchestrator.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | yes | What to build and any context |
| `workflowId` | string | no | Existing workflow ID to modify |
| `conversationContext` | string | no | What user already knows |

**Returns**: `{ result: string }` — contains task ID for background tracking.

**Two modes** (selected based on sandbox availability):

- **Sandbox mode** (`N8N_INSTANCE_AI_SANDBOX_ENABLED=true`): agent writes TypeScript
  to `~/workspace/src/workflow.ts`, runs `tsc` for validation, and calls `submit-workflow`.
  Gets filesystem and `execute_command` tools from the workspace.
- **Tool mode** (fallback): agent uses string-based `build-workflow` tool with
  `get-node-type-definition`, `get-workflow-as-code`, `search-nodes`.

Both modes: max 30 steps, publishes events to the event bus, non-blocking.

**Sandbox-only tools** (not in `createAllTools`, only available to the builder):
- `submit-workflow` — reads TypeScript from sandbox, parses/validates, resolves credentials, saves
- `materialize-node-type` — fetches `.d.ts` definitions and writes to sandbox for `tsc`
- `write-sandbox-file` — writes files to sandbox workspace (path-traversal protected)

### `cancel-background-task` *(conditional)*

Cancel a running background task by its ID.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Background task ID (from `<running-tasks>` context) |

**Returns**: `{ result: "Background task {taskId} cancelled." }`

**Cancellation flow** (three surfaces converge):
```
User clicks stop button  → POST /chat/:threadId/tasks/:taskId/cancel ─┐
User says "stop that"    → orchestrator calls cancel-background-task  ─┤
cancelRun (global stop)  → cancelBackgroundTasks(threadId)             ─┤
                                                                       ▼
                                           service.cancelBackgroundTask()
```

### `correct-background-task` *(conditional)*

Send a course correction to a running background task.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Background task ID |
| `correction` | string | yes | Correction message |

**Returns**: `{ result: string }` — 'queued', 'task-completed', or 'task-not-found'

### `verify-built-workflow` *(conditional)*

Run a built workflow with sidecar pin data for verification (never persisted).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workItemId` | string | yes | Work item ID from build outcome |
| `workflowId` | string | yes | Workflow ID to execute |
| `inputData` | object | no   | Trigger payload — **shape depends on trigger type**, see below |
| `timeout` | number | no | Max wait in ms (default 300000) |

**`inputData` shape by trigger type** (the adapter's `getPinDataForTrigger` spreads or wraps based on type — passing the wrong shape produces null downstream values that look like an expression bug):

| Trigger | Pass | Adapter emits on `$json` |
|---|---|---|
| Form Trigger | flat field map, e.g. `{name: "Alice", email: "a@b.c"}` | `{ submittedAt, formMode: "instanceAi", name, email, ... }` — matches production. Do NOT wrap in `formFields`. |
| Webhook | body payload, e.g. `{event: "signup", userId: "..."}` | `{ headers, query, body: { event, userId, ... } }` |
| Chat Trigger | `{chatInput: "..."}` | `{ sessionId, action, chatInput }` |
| Schedule | omit | synthetic timestamp fields |

**Writes on success/failure**: the tool persists a structured `verification` record (`{ attempted, success, executionId, status, evidence, verifiedAt }`) onto the build outcome so subsequent checkpoint turns can reuse it without re-running verify.

**Returns**: `{ executionId?, success, status?, data?, error? }`

### `report-verification-verdict` *(conditional)*

Feed verification results into the deterministic workflow loop state machine.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workItemId` | string | yes | Work item ID |
| `verdict` | enum | yes | `verified`, `needs_patch`, `needs_rebuild`, `trigger_only`, `needs_user_input`, `failed_terminal` |
| `failureSignature` | string | no | For repeated failure detection |
| `failedNodeName` | string | no | Node that failed |
| `patch` | string | no | For `needs_patch` verdict |
| `diagnosis` | string | no | Failure analysis |

**Returns**: `{ guidance: string }` — next action based on loop state machine.

### `apply-workflow-credentials` *(conditional)*

Atomically apply real credentials to previously-mocked workflow nodes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workItemId` | string | yes | Work item ID from build outcome |
| `credentials` | object | yes | Real credential mapping |

**Returns**: `{ updatedNodes: string[] }`

### `browser-credential-setup` *(conditional)*

Spawn a sub-agent with Chrome DevTools MCP for OAuth credential setup via
browser automation. Only available when browser MCP or gateway browser tools
are configured.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialType` | string | yes | Credential type to set up (e.g., `notionApi`) |
| `instructions` | string | yes | Setup instructions for the browser agent |

**Returns**: `{ result: string }`

---

## Workflow Tools (8–12)

Core count is 8; up to 4 more are conditionally registered based on license.

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

**Returns**: `{ id, name, active, nodes, connections, settings }`

### `get-workflow-as-code`

Get a workflow as TypeScript SDK code. Used by the builder agent to load an
existing workflow for modification.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |

**Returns**: TypeScript code string representing the workflow.

### `build-workflow`

Submit workflow code (TypeScript SDK) for parsing, validation, and saving. Two
modes: full code submission or `str_replace` patches against the last-submitted
code.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | conditional | Full TypeScript SDK code |
| `patches` | array | conditional | `str_replace` patches against last-submitted code |

**Returns**: `{ workflowId, nodes, errors? }`

**Behavior**: Validates TypeScript SDK code via `parseAndValidate()`, generates
workflow JSON, applies layout engine positioning, resolves credentials.

### `delete-workflow`

Archive a workflow (soft delete, deactivates if needed).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to archive |

**Returns**: `{ success: boolean }`

### `setup-workflow`

Open the UI for per-node credential and parameter setup. Uses a suspend/resume
state machine where each node triggers a HITL confirmation for the user to
configure it interactively.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to set up |

**Returns**: `{ completedNodes, skippedNodes, failedNodes }`

### `publish-workflow`

Publish a workflow version to production. Makes it active — it will run on triggers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | no | Specific version (omit for latest draft) |

**Returns**: `{ success: boolean, activeVersionId?: string }`

### `unpublish-workflow`

Stop a workflow from running in production. The draft is preserved.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |

**Returns**: `{ success: boolean }`

### `list-workflow-versions` *(conditional — requires license)*

List version history for a workflow (metadata only).

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | yes | — | Workflow ID |
| `limit` | number | no | 20 | Max results (1–100) |
| `skip` | number | no | 0 | Results to skip |

**Returns**: `{ versions: [{ versionId, name, description, authors, createdAt, autosaved, isActive, isCurrentDraft }] }`

### `get-workflow-version` *(conditional — requires license)*

Get full details of a specific workflow version including nodes and connections.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version ID |

**Returns**: `{ versionId, name, description, authors, nodes, connections, ... }`

### `restore-workflow-version` *(conditional — requires license)*

Restore a workflow to a previous version (overwrites current draft). HITL
approval required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version to restore |

**Returns**: `{ success: boolean }`

### `update-workflow-version` *(conditional — requires `feat:namedVersions` license)*

Update a version's name or description.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version ID |
| `name` | string \| null | no | New name |
| `description` | string \| null | no | New description |

**Returns**: `{ success: boolean }`

---

## Execution Tools (6)

### `list-executions`

List recent workflow executions.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | no | — | Filter by workflow |
| `status` | string | no | — | `success`, `error`, `running`, `waiting` |
| `limit` | number | no | 20 | Max results (1–100) |

**Returns**: `{ executions: [{ id, workflowId, workflowName, status, startedAt, finishedAt, mode }] }`

### `run-workflow`

Execute a workflow, wait for completion (with timeout), and return the result.
Default timeout: 5 minutes; max: 10 minutes. On timeout, execution is cancelled.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | yes | — | Workflow to run |
| `inputData` | object | no | — | Data passed to the trigger node |
| `timeout` | number | no | 300000 | Max wait time in ms (max 600000) |

**Returns**: `{ executionId, status, data?, error?, startedAt?, finishedAt? }`

**Type-aware pin data**: Constructs proper pin data per trigger type:
- **Chat trigger**: `{ chatInput, sessionId, action }`
- **Form trigger**: `{ submittedAt, formMode: 'instanceAi', ...inputData }`
- **Webhook trigger**: `{ headers: {}, query: {}, body: inputData }`
- **Schedule trigger**: current datetime information
- **Unknown trigger**: `{ json: inputData }` (generic fallback)

### `get-execution`

Get execution status without blocking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution ID |

**Returns**: `{ executionId, status, data?, error?, startedAt?, finishedAt? }`

### `debug-execution`

Analyze a failed execution with structured diagnostics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Failed execution to debug |

**Returns**: `{ executionId, status, failedNode?: { name, type, error, inputData? }, nodeTrace: [{ name, type, status }] }`

### `get-node-output`

Get the output data of a specific node from an execution.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution ID |
| `nodeName` | string | yes | Node name to get output for |

**Returns**: `{ nodeName, data?, error? }`

### `stop-execution`

Cancel a running execution.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution to cancel |

**Returns**: `{ success: boolean, message: string }`

---

## Credential Tools (6)

> **Security note**: The agent never handles raw credential secrets. Credential
> creation and secret configuration is done through the n8n frontend UI (via
> `setup-credentials`) or browser automation (`browser-credential-setup`).

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

Permanently delete a credential. **Irreversible** — HITL confirmation required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to delete |

**Returns**: `{ success: boolean }`

### `search-credential-types`

Search available credential types by name or description.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Search query (e.g., "slack", "oauth") |

**Returns**: `{ credentialTypes: [{ name, displayName, description }] }`

### `setup-credentials`

Open the credential picker UI for the user to configure credentials securely.
The LLM never sees secrets — the user interacts with the n8n frontend directly.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialType` | string | yes | Credential type to set up |

**Returns**: `{ credentialId, credentialType, needsBrowserSetup? }`

**HITL**: Suspends execution and renders the credential setup UI. When
`needsBrowserSetup=true`, the orchestrator should invoke `browser-credential-setup`
followed by another `setup-credentials` call to finalize.

### `test-credential`

Test whether a credential is valid and can connect to its service.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to test |

**Returns**: `{ success: boolean, message?: string }`

---

## Node Discovery Tools (6)

### `list-nodes`

List available node types in the n8n instance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | no | Filter by name or description |

**Returns**: `{ nodes: [{ name, displayName, description, group, version }] }`

### `get-node-description`

Get detailed node description including properties, credentials, inputs, and outputs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type (e.g., `n8n-nodes-base.httpRequest`) |

**Returns**: `{ name, displayName, description, properties, credentials, inputs, outputs }`

### `get-node-type-definition`

Get the full JSON schema for a node type, including all parameter options and
discriminators. Critical for understanding complex node configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type |

**Returns**: Full node type definition with all parameters.

### `search-nodes`

Search nodes ranked by relevance with `@builderHint` annotations. Includes
subnode requirements and discriminator values.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Short search query (service names, not descriptions) |

**Returns**: `{ nodes: SearchableNodeDescription[] }`

### `get-suggested-nodes`

Get curated node suggestions for common use cases.

**Returns**: Categorized node suggestions with descriptions.

### `explore-node-resources`

Explore a node's dynamic resources (listSearch / loadOptions). Used to discover
discriminator values like spreadsheet IDs, calendar names, etc.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type |
| `resource` | string | yes | Resource to explore |
| `credentialId` | string | no | Credential to use for authenticated resources |

**Returns**: Dynamic resource list from the node's loadOptions/listSearch.

---

## Data Table Tools (11)

Full CRUD suite for n8n data tables. System columns (`id`, `createdAt`,
`updatedAt`) are reserved and auto-managed.

### Table operations

| Tool | Description |
|------|-------------|
| `list-data-tables` | List all data tables |
| `create-data-table` | Create a new data table with columns |
| `delete-data-table` | Delete a data table (HITL confirmation) |
| `get-data-table-schema` | Get table schema including all columns |

### Column operations

| Tool | Description |
|------|-------------|
| `add-data-table-column` | Add a column to a table |
| `delete-data-table-column` | Remove a column from a table |
| `rename-data-table-column` | Rename a column |

### Row operations

| Tool | Description |
|------|-------------|
| `query-data-table-rows` | Query rows with optional filters |
| `insert-data-table-rows` | Insert one or more rows |
| `update-data-table-rows` | Update rows matching criteria |
| `delete-data-table-rows` | Delete rows matching criteria (HITL confirmation) |

---

## Workspace Tools (up to 8, conditional)

Only registered when `workspaceService` is present. Folder tools additionally
require `workspaceService.listFolders`.

| Tool | Description |
|------|-------------|
| `list-projects` | List projects accessible to the user |
| `tag-workflow` | Apply tags to a workflow |
| `list-tags` | List available tags |
| `cleanup-test-executions` | Remove test execution data |
| `list-folders` | List folders (conditional) |
| `create-folder` | Create a new folder (conditional) |
| `delete-folder` | Delete a folder (conditional) |
| `move-workflow-to-folder` | Move a workflow to a folder (conditional) |

---

## Web Research Tools (2)

### `web-search` *(conditional — requires search provider)*

Search the web and return ranked results. Provider priority: Brave > SearXNG > disabled.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | yes | — | Search query |
| `maxResults` | number | no | 5 | Max results (1–20) |
| `includeDomains` | string[] | no | — | Restrict to these domains |

**Returns**: `{ query, results: [{ title, url, snippet, publishedDate? }] }`

Results cached for 15 minutes (LRU, 100 entries).

### `fetch-url`

Fetch a web page and extract content as markdown. Local pipeline (Readability +
Turndown). SSRF protection and result caching.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | yes | — | URL to fetch |
| `maxContentLength` | number | no | 30000 | Max content chars (max 100000) |

**Returns**: `{ url, finalUrl, title, content, truncated, contentLength, safetyFlags? }`

**Content routing**: HTML → Readability + Turndown + GFM, PDF → pdf-parse,
plain text / markdown → passthrough.

---

## Filesystem Tools (dynamic, conditional)

Only registered when a `localMcpServer` (computer-use gateway) is connected.
Tools are dynamically created from the MCP server's advertised capabilities.
See `docs/filesystem-access.md`.

---

## Template Tools (2)

| Tool | Description |
|------|-------------|
| `search-template-structures` | Search workflow templates by structure pattern |
| `search-template-parameters` | Search templates by parameter values |

---

## Other Domain Tools

| Tool | Description |
|------|-------------|
| `ask-user` | Suspend and request user input (single/multi-select or text) |
| `get-best-practices` | Get workflow building best practices for common patterns |

---

## Tool Distribution

Not all tools are available to all agents. The orchestrator has access to
everything; sub-agents receive only what they need.

| Tool Category | Orchestrator | Sub-Agents (delegate) | Background Agents |
|---------------|:---:|:---:|:---:|
| Orchestration tools (`plan`, `delegate`, etc.) | ✅ | ❌ | ❌ |
| Workflow tools | ✅ | ✅ (via delegate) | ✅ (builder) |
| Execution tools | ✅ (direct use) | ✅ (via delegate) | ❌ |
| Credential tools | ✅ | ✅ (via delegate) | ✅ (builder — setup only) |
| Node discovery tools | ✅ | ✅ (via delegate) | ✅ (builder) |
| Data table read tools | ✅ (direct) | ✅ (via delegate) | ✅ (data table agent) |
| Data table write tools | ❌ (via plan) | ❌ | ✅ (data table agent) |
| Workspace tools | ✅ | ✅ (via delegate) | ❌ |
| Filesystem tools | ✅ (conditional) | ✅ (via delegate) | ❌ |
| Web research tools | ✅ | ✅ (via delegate) | ✅ (research agent) |
| Template / best practices | ✅ | ✅ (via delegate) | ✅ (builder) |
| Sandbox tools (`submit-workflow`, `materialize-node-type`, `write-sandbox-file`) | ❌ | ❌ | ✅ (builder only) |
| MCP tools | ✅ | ❌ | ❌ |
| Browser MCP tools | ❌ | ❌ | ✅ (browser-credential-setup only) |

---

## Adding New Tools

1. Create a file in `src/tools/<domain>/` following the naming convention `<verb>-<noun>.tool.ts`
2. Define input/output schemas with Zod (`.describe()` on fields — these are the LLM's parameter docs)
3. Export a factory function that takes the service context and returns a Mastra tool
4. Register the tool in `src/tools/index.ts` (in `createAllTools` or `createOrchestrationTools`)
5. If the tool requires a new service method, add it to the interface in `src/types.ts`
   and implement it in the backend adapter
6. New native domain tools are automatically available for delegation — the
   orchestrator can include them in sub-agent tool subsets via `delegate`
7. For HITL tools, define `suspendSchema` and `resumeSchema` — Mastra handles
   the suspension/resume lifecycle automatically
