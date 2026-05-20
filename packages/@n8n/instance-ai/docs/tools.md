# Tool Reference

All tools the Instance AI agent has access to. Tools are organized into
orchestration tools (used by the orchestrator for loop control) and domain tools
(used by the orchestrator directly or delegated to sub-agents). Each tool
defines an input schema via Zod and may define an output schema for stable
structured outputs.

## Orchestration Tools (up to 10)

These tools are exclusive to the orchestrator agent. Sub-agents do not receive
them. Some are conditional on context availability.

### `plan`

Ask the inline planner agent to draft a dependency-aware task plan. Use only
when the work requires 2+ tasks with dependencies. The planner reads the recent
conversation, can receive optional steering guidance, and presents the resulting
plan to the user for approval before execution starts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guidance` | string | no | Optional steering note for the planner |

**Returns**: `{ result: string }`

**Behavior**:
- Spawns an inline planner agent with the last 5 conversation messages
- The planner uses internal `add-plan-item`, `remove-plan-item`, and
  `submit-plan` tools to produce the plan
- On approval: calls `schedulePlannedTasks()` to start detached execution
- On denial: returns feedback for the planner to revise the plan

### `create-tasks`

Persist a dependency-aware task plan directly. This is available for replanning
and advanced bypass flows; the normal initial planning path should use `plan`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tasks` | array | yes | Dependency-aware execution plan (see schema below) |
| `skipPlannerDiscovery` | boolean | no | Bypass the planner-discovery guard for advanced flows |
| `reason` | string | no | Brief reason for bypassing planner discovery |

**Task schema**:

```typescript
{
  id: string;          // Stable identifier used by dependency edges
  title: string;       // Short user-facing task title
  kind: 'delegate' | 'build-workflow' | 'manage-data-tables' | 'research' | 'checkpoint';
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
- `manage-data-tables` → data table agent (`data-tables` actions)
- `research` → research agent (`research` actions: `web-search`, `fetch-url`)
- `delegate` → custom sub-agent with orchestrator-specified tool subset
- `checkpoint` → orchestrator-run verification step for workflow tasks

### `delegate`

Spawn a dynamically composed sub-agent to handle a focused subtask. The
orchestrator specifies the role, instructions, and tool subset — there is no
fixed taxonomy of sub-agent types.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | yes | Free-form role description (e.g., "workflow builder") |
| `instructions` | string | yes | Task-specific system prompt for the sub-agent |
| `tools` | string[] | yes | Subset of registered native domain tool names or safe MCP tool names |
| `briefing` | string | yes | The specific task to accomplish |
| `artifacts` | object | no | Relevant IDs, data, or context (workflow IDs, etc.) |
| `conversationContext` | string | no | Summary of what was discussed so far — prevents repeating what user already knows |

**Returns**: `{ result: string }` — the sub-agent's synthesized answer.

**Behavior**:
- Validates `tools` against registered native domain tools and safe MCP tools
- Forbids orchestration tools (`plan`, `create-tasks`, `delegate`)
- Creates a fresh agent with specified tools and `N8N_INSTANCE_AI_SUB_AGENT_MAX_STEPS` (default 100; fallback 10 if unset)
- Sub-agent publishes events directly to the event bus
- Sub-agent has no memory — receives context only via the briefing
- Past failed attempts from `iterationLog` are appended to the briefing (if available)

### `task-control`

Manage visible task checklists and running background tasks.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | enum | yes | `update-checklist`, `cancel-task`, or `correct-task` |
| `tasks` | array | for `update-checklist` | List of `{id, description, status}` items |
| `taskId` | string | for `cancel-task` / `correct-task` | Background task ID |
| `correction` | string | for `correct-task` | Correction message |

**Returns**: `{ result: string }`

**Behavior**:
- `update-checklist` saves to storage and publishes `tasks-update`
- `cancel-task` calls the backend background-task cancellation path
- `correct-task` queues a correction for the running task to consume on its next step

**Cancellation flow** (three surfaces converge):
```
User clicks stop button  → POST /chat/:threadId/tasks/:taskId/cancel ─┐
User says "stop that"    → orchestrator calls task-control             ─┤
cancelRun (global stop)  → cancelBackgroundTasks(threadId)             ─┤
                                                                       ▼
                                           service.cancelBackgroundTask()
```

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
  Gets workspace filesystem tools and `workspace_execute_command` from the workspace.
- **Tool mode** (fallback): agent uses string-based `build-workflow` tool with
  `nodes(action="type-definition")`, `workflows(action="get-as-code")`, and
  `nodes(action="search")`.

Both modes: max 60 steps, publishes events to the event bus, non-blocking.

**Sandbox-only tools** (not in `createAllTools`, only available to the builder):
- `submit-workflow` — reads TypeScript from sandbox, parses/validates, resolves credentials, saves
- `materialize-node-type` — fetches `.d.ts` definitions and writes to sandbox for `tsc`
- `write-file` — writes files to sandbox workspace (path-traversal protected)

### `complete-checkpoint`

Report the outcome of a planned-task checkpoint. Only valid during a
`<planned-task-follow-up type="checkpoint">` turn.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Checkpoint task ID from the follow-up payload |
| `status` | `"succeeded" \| "failed"` | yes | Verification outcome |
| `result` | string | no | Short user-visible verification note |
| `error` | string | no | Failure message when `status="failed"` |
| `outcome` | object | no | Structured outcome payload, such as execution evidence |

**Returns**: `{ result: string, ok: boolean }`

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

## Workflow Tools

Workflow management operations are actions on the consolidated `workflows`
native tool. Each call includes the `action` shown in the heading; field tables
omit that required discriminator. `build-workflow` remains a separate builder
tool. Core `workflows` count is 9 actions; up to 4 more are conditionally
registered based on license.

### `workflows(action="list")`

List workflows accessible to the current user.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | no | — | Filter workflows by name |
| `limit` | number | no | 50 | Max results (1–100) |
| `status` | `"active" \| "archived" \| "all"` | no | `"active"` | Which workflows to list |

**Returns**: `{ workflows: [{ id, name, activeVersionId, isArchived, createdAt, updatedAt }] }`

`activeVersionId` is `null` when the workflow is unpublished.

### `workflows(action="get")`

Get full workflow definition including nodes, connections, and settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |

**Returns**: `{ id, name, activeVersionId, isArchived, nodes, connections, settings }`

`activeVersionId` is `null` when the workflow is unpublished.

### `workflows(action="get-as-code")`

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

### `workflows(action="delete")`

Archive a workflow (soft delete, deactivates if needed). This is reversible
with `workflows(action="unarchive")`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to archive |

**Returns**: `{ success: boolean }`

### `workflows(action="unarchive")`

Restore an archived workflow without publishing it.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Archived workflow to restore |

**Returns**: `{ success: boolean }`

### `workflows(action="setup")`

Open the UI for per-node credential and parameter setup. Uses a suspend/resume
state machine where each node triggers a HITL confirmation for the user to
configure it interactively.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to set up |
| `projectId` | string | no | Project ID to scope credential creation to |

**Returns**: `{ completedNodes, skippedNodes, failedNodes }`

### `workflows(action="publish")`

Publish a workflow version to production. Makes it active — it will run on triggers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | no | Specific version (omit for latest draft) |
| `name` | string | no | Version name when named versions are available |
| `description` | string | no | Version description when named versions are available |

**Returns**: `{ success: boolean, activeVersionId?: string }`

### `workflows(action="unpublish")`

Stop a workflow from running in production. The draft is preserved.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |

**Returns**: `{ success: boolean }`

### `workflows(action="list-versions")` *(conditional — requires license)*

List version history for a workflow (metadata only).

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | yes | — | Workflow ID |
| `limit` | number | no | 20 | Max results (1–100) |
| `skip` | number | no | 0 | Results to skip |

**Returns**: `{ versions: [{ versionId, name, description, authors, createdAt, autosaved, isActive, isCurrentDraft }] }`

### `workflows(action="get-version")` *(conditional — requires license)*

Get full details of a specific workflow version including nodes and connections.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version ID |

**Returns**: `{ versionId, name, description, authors, nodes, connections, ... }`

### `workflows(action="restore-version")` *(conditional — requires license)*

Restore a workflow to a previous version (overwrites current draft). HITL
approval required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version to restore |

**Returns**: `{ success: boolean }`

### `workflows(action="update-version")` *(conditional — requires `feat:namedVersions` license)*

Update a version's name or description.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version ID |
| `name` | string \| null | no | New name |
| `description` | string \| null | no | New description |

**Returns**: `{ success: boolean }`

---

## Execution Tool: `executions`

Execution operations are actions on one consolidated native tool. Each call
includes the `action` shown in the heading; field tables omit that required
discriminator.

### `executions(action="list")`

List recent workflow executions.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | no | — | Filter by workflow |
| `status` | string | no | — | `success`, `error`, `running`, `waiting` |
| `limit` | number | no | 20 | Max results (1–100) |

**Returns**: `{ executions: [{ id, workflowId, workflowName, status, startedAt, finishedAt, mode }] }`

### `executions(action="run")`

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

### `executions(action="get")`

Get execution status without blocking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution ID |

**Returns**: `{ executionId, status, data?, error?, startedAt?, finishedAt? }`

### `executions(action="debug")`

Analyze a failed execution with structured diagnostics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Failed execution to debug |

**Returns**: `{ executionId, status, failedNode?: { name, type, error, inputData? }, nodeTrace: [{ name, type, status }] }`

### `executions(action="get-node-output")`

Get the output data of a specific node from an execution.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution ID |
| `nodeName` | string | yes | Node name to get output for |

**Returns**: `{ nodeName, data?, error? }`

### `executions(action="stop")`

Cancel a running execution.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution to cancel |

**Returns**: `{ success: boolean, message: string }`

---

## Credential Tool: `credentials`

> **Security note**: The agent never handles raw credential secrets. Credential
> creation and secret configuration is done through the n8n frontend UI (via
> `credentials(action="setup")`) or browser automation (`browser-credential-setup`).

Credential operations are actions on one consolidated native tool. Each call
includes the `action` shown in the heading; field tables omit that required
discriminator.

### `credentials(action="list")`

List credentials accessible to the current user. Never exposes secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | no | Filter by credential type (e.g., `notionApi`) |
| `name` | string | no | Filter by credential name substring |
| `limit` | number | no | Max results (1–200, default 50) |
| `offset` | number | no | Number of credentials to skip |

**Returns**: `{ credentials: [{ id, name, type, createdAt, updatedAt }], total, hasMore }`

### `credentials(action="get")`

Get credential metadata. Never returns decrypted secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential ID |

**Returns**: `{ id, name, type, createdAt, updatedAt, nodesWithAccess? }`

### `credentials(action="delete")`

Permanently delete a credential. **Irreversible** — HITL confirmation required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to delete |

**Returns**: `{ success: boolean }`

### `credentials(action="search-types")`

Search available credential types by name or description.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Search query (e.g., "slack", "oauth") |

**Returns**: `{ credentialTypes: [{ name, displayName, description }] }`

### `credentials(action="setup")`

Open the credential picker UI for the user to configure credentials securely.
The LLM never sees secrets — the user interacts with the n8n frontend directly.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentials` | array | yes | Credentials to create or select: `{ credentialType, reason?, suggestedName? }[]` |
| `projectId` | string | no | Project ID to scope credential creation to |
| `credentialFlow` | object | no | Flow stage metadata for finalization cards |

**Returns**: `{ credentialId, credentialType, needsBrowserSetup? }`

**HITL**: Suspends execution and renders the credential setup UI. When
`needsBrowserSetup=true`, the orchestrator should invoke `browser-credential-setup`
followed by another `credentials(action="setup")` call to finalize.

### `credentials(action="test")`

Test whether a credential is valid and can connect to its service.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to test |

**Returns**: `{ success: boolean, message?: string }`

---

## Node Discovery Tool: `nodes`

Node discovery operations are actions on one consolidated native tool. Each call
includes the `action` shown in the heading; field tables omit that required
discriminator.

### `nodes(action="list")`

List available node types in the n8n instance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | no | Filter by name or description |

**Returns**: `{ nodes: [{ name, displayName, description, group, version }] }`

### `nodes(action="describe")`

Get detailed node description including properties, credentials, inputs, and outputs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type (e.g., `n8n-nodes-base.httpRequest`) |

**Returns**: `{ name, displayName, description, properties, credentials, inputs, outputs }`

### `nodes(action="type-definition")`

Get TypeScript type definitions for node types, including parameter options and
discriminators. Critical for understanding complex node configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeTypes` | array | yes | Node types or node-type request objects (1–5) |

**Returns**: Full node type definition with all parameters.

### `nodes(action="search")`

Search nodes ranked by relevance with `@builderHint` annotations. Includes
subnode requirements and discriminator values.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | no | Short search query (service names, not descriptions) |
| `connectionType` | string | no | Filter by AI sub-node connection type |
| `limit` | number | no | Max results (default 10) |

**Returns**: `{ nodes: SearchableNodeDescription[] }`

### `nodes(action="suggested")`

Get curated node suggestions for common use cases.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `categories` | string[] | yes | Workflow technique categories to retrieve (1–3) |

**Returns**: Categorized node suggestions with descriptions.

### `nodes(action="explore-resources")`

Explore a node's dynamic resources (listSearch / loadOptions). Used to discover
discriminator values like spreadsheet IDs, calendar names, etc.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type |
| `version` | number | yes | Node version |
| `methodName` | string | yes | Exact `@searchListMethod` or `@loadOptionsMethod` name from type definitions |
| `methodType` | `"listSearch" \| "loadOptions"` | yes | Dynamic resource method type |
| `credentialType` | string | yes | Credential type key |
| `credentialId` | string | yes | Credential ID from `credentials(action="list")` |
| `filter` | string | no | Search/filter text |
| `paginationToken` | string | no | Token from a previous page |
| `currentNodeParameters` | object | no | Current node parameters for dependent lookups |

**Returns**: Dynamic resource list from the node's loadOptions/listSearch.

---

## Data Table Tool: `data-tables`

Full CRUD suite for n8n data tables. System columns (`id`, `createdAt`,
`updatedAt`) are reserved and auto-managed. Each call includes an `action`.

### Table operations

| Action | Description |
|--------|-------------|
| `list` | List all data tables |
| `create` | Create a new data table with columns |
| `delete` | Delete a data table (HITL confirmation) |
| `schema` | Get table schema including all columns |
| `query` | Query rows with optional filters |

### Column operations

| Action | Description |
|--------|-------------|
| `add-column` | Add a column to a table |
| `delete-column` | Remove a column from a table |
| `rename-column` | Rename a column |

### Row operations

| Action | Description |
|--------|-------------|
| `insert-rows` | Insert one or more rows |
| `update-rows` | Update rows matching criteria |
| `delete-rows` | Delete rows matching criteria (HITL confirmation) |

---

## Workspace Tool: `workspace` (up to 8 actions, conditional)

Only registered when `workspaceService` is present. Folder tools additionally
require `workspaceService.listFolders`.

| Action | Description |
|--------|-------------|
| `list-projects` | List projects accessible to the user |
| `tag-workflow` | Apply tags to a workflow |
| `list-tags` | List available tags |
| `cleanup-test-executions` | Remove test execution data |
| `list-folders` | List folders (conditional) |
| `create-folder` | Create a new folder (conditional) |
| `delete-folder` | Delete a folder (conditional) |
| `move-workflow-to-folder` | Move a workflow to a folder (conditional) |

---

## Web Research Tool: `research`

Web research operations are actions on one consolidated native tool.

### `research(action="web-search")`

Search the web and return ranked results. Provider priority: Brave > SearXNG > disabled.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | yes | — | Search query |
| `maxResults` | number | no | 5 | Max results (1–20) |
| `includeDomains` | string[] | no | — | Restrict to these domains |

**Returns**: `{ query, results: [{ title, url, snippet, publishedDate? }] }`

Results cached for 15 minutes (LRU, 100 entries).

### `research(action="fetch-url")`

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

## Template Tool: `templates`

Only available to the planner. Use `templates(action="best-practices")` with
`technique: "list"` to discover techniques, then request a specific technique.

---

## Other Domain Tools

| Tool | Description |
|------|-------------|
| `ask-user` | Suspend and request user input (single/multi-select or text) |
| `templates(action="best-practices")` | Get workflow building best practices for common patterns (planner only) |

---

## Tool Distribution

Not all tools are available to all agents. The orchestrator has the main
orchestration/domain surface; sub-agents receive only what they need.

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
| Planner-only tools (`templates`) | via `plan` | ❌ | ❌ |
| Sandbox tools (`submit-workflow`, `materialize-node-type`, `write-file`) | ❌ | ❌ | ✅ (builder only) |
| MCP tools | ✅ | ✅ (via delegate by exact name) | ❌ |
| Browser MCP tools | ❌ | ✅ (exact-name delegate; prefer `browser-credential-setup`) | ✅ (browser-credential-setup only) |

---

## Adding New Tools

1. Create a file in `src/tools/<domain>/` following the naming convention `<verb>-<noun>.tool.ts`
2. Define an input schema with Zod and an output schema when the tool has a stable structured result (`.describe()` on fields — these are the LLM's parameter docs)
3. Export a factory function that takes the service context and returns a native `Tool`
4. Register the tool in `src/tools/index.ts` (in `createAllTools` or `createOrchestrationTools`)
5. If the tool requires a new service method, add it to the interface in `src/types.ts`
   and implement it in the backend adapter
6. New native domain tools are automatically available for delegation — the
   orchestrator can include them in sub-agent tool subsets via `delegate`
7. For HITL tools, define native suspend/resume schemas so the agent runtime
   handles the suspension/resume lifecycle automatically
