# Tool Reference

All tools the Instance AI agent has access to. Tools are organized into
orchestration tools (used by the orchestrator for loop control) and domain tools
(used by the orchestrator directly). Each tool defines
its input/output schema via Zod.

## Orchestration Tools

These tools are exclusive to the orchestrator agent. Sub-agents do not receive
them. Some are conditional on context availability.

### `create-tasks`

Persist a dependency-aware task plan for detached multi-step execution. For
initial plan-worthy work, the orchestrator loads the `planning` skill, performs
discovery with normal domain tools, loads `create-tasks` via `load_tool`, then
calls `create-tasks` with
`planningContext.source: "planning-skill"`. For
`<planned-task-follow-up type="replan">` turns, use
`planningContext.source: "replan"` when multiple dependent tasks still need
scheduling. Clear single-workflow builds, including new and one-off workflows,
use `workflow-builder`, workspace file tools, and `build-workflow` directly.
The plan is shown to the user for approval before execution starts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tasks` | array | yes | Dependency-aware execution plan (see schema below) |
| `planningContext` | object | yes | `{ source: "planning-skill" \| "replan", summary: string, assumptions?: string[] }` |

**Task schema**:

```typescript
{
  id: string;          // Stable identifier used by dependency edges
  title: string;       // Short user-facing task title
  kind: 'build-workflow' | 'checkpoint';
  spec: string;        // Detailed executor briefing for this task
  deps: string[];      // Task IDs that must succeed before this task can start
  workflowId?: string; // Existing workflow ID for the builder to hydrate before saving
  isSupportingWorkflow?: boolean; // Build task completes after saving a supporting sub-workflow
}
```

**Returns**: `{ result: string, taskCount: number }`

**Behavior**:
- First call persists the plan, publishes `tasks-update` event, and **suspends**
  for user approval
- On approval: calls `schedulePlannedTasks()` to start detached execution
- On rejection: returns feedback for the LLM to revise the plan
- On denial: cancels the graph and blocks same-turn resubmission

**Task kinds** map to executors:
- `build-workflow` → orchestrator follow-up run using the workflow-builder skill
- `checkpoint` → exceptional orchestrator-executed semantic or cross-workflow check

Standalone data-table work is handled directly by the orchestrator with the
`data-table-manager` skill and the `data-tables` / `parse-file` tools. Single
workflow-local table requirements belong in the builder task spec; plan only
when the table schema is shared, independently durable, or creates real
dependency coordination.

### `update-tasks`

Update a visible task checklist for the user. Used for lightweight progress
tracking during synchronous work.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tasks` | array | yes | List of `{id, description, status, detail?}` items |

**Returns**: `{ result: string }`

**Behavior**: Saves to storage, publishes `tasks-update` event for live UI refresh.

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

Run a built workflow with per-execution pin data for verification (never
persisted to the workflow). Destructive and user-action nodes — write
operations, nodes with mocked credentials, mid-workflow Form pages, Wait
nodes — are **simulated**: the build outcome carries a per-node
execute-vs-simulate plan (`nodeSimulationPlan`, produced by a deterministic
classifier plus an LLM pass at submit time) and LLM-generated mock output
(`simulationFixtures`). Simulated nodes are pinned with their fixture, so
verification never sends messages, writes rows, deletes data, or parks in
`waiting`. The tool output marks simulated nodes (`simulatedNodes`,
`nodePreviews[].simulated`, `simulationNote`), and the saved execution
carries `resultData.simulation` so the editor can label simulated outputs.
For build outcomes that carry a plan, a `waiting` result is a failure (an
unsimulated user-action node); only legacy plan-less outcomes keep the
waiting-with-output-as-success fallback.

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

**Writes on success/failure**: the tool persists a structured `verification`
record (`{ attempted, success, executionId, status, evidence, verifiedAt }`) onto
the build outcome so workflow-verification follow-ups and exceptional checkpoint
turns can reuse it without re-running verify.

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

## Workflow Tools (10–14)

Core count is 10; up to 4 more are conditionally registered based on license.

### `list-workflows`

List workflows accessible to the current user.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | no | — | Filter workflows by name |
| `limit` | number | no | 50 | Max results (1–100) |
| `status` | `"active" \| "archived" \| "all"` | no | `"active"` | Which workflows to list |

**Returns**: `{ workflows: [{ id, name, activeVersionId, isArchived, createdAt, updatedAt }] }`

`activeVersionId` is `null` when the workflow is unpublished.

### `get-workflow`

Get full workflow definition including nodes, connections, and settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |

**Returns**: `{ id, name, activeVersionId, isArchived, nodes, connections, settings }`

`activeVersionId` is `null` when the workflow is unpublished.

### `get-workflow-as-code`

Get a workflow as TypeScript SDK code. Used by the builder agent to inspect an
existing workflow when no workspace source file is already available. Existing
workflow modifications should write the returned code to a workspace source file
and call `build-workflow` with both `filePath` and the real n8n `workflowId`
once; subsequent repairs can reuse only `filePath`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |

**Returns**: TypeScript code string representing the workflow.

### `build-workflow`

Compile, validate, and save a workspace workflow source file. Inline source and
string patches are not accepted; edit the workspace file first and then call
this tool with `filePath`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filePath` | string | yes | Workspace path to the `.workflow.ts` or WorkflowJSON source file |
| `workflowId` | string | no | Existing n8n workflow ID to bind to this file on the first update |
| `projectId` | string | no | Project ID to create the workflow in |
| `name` | string | no | Workflow name override for new workflows |
| `workItemId` | string | no | Work item hint for workflow-loop reporting |
| `isSupportingWorkflow` | boolean | no | Marks a saved sub-workflow as supporting |

**Returns**: `{ success, workflowId?, workflowName?, workItemId?, filePath, sourceHash?, remediation?, errors?, warnings? }`

**Behavior**: Reads the source file from the runtime workspace, compiles
TypeScript sources through the sandbox `tsx` runner or parses WorkflowJSON
directly, validates the resulting workflow JSON server-side, resolves
credentials, saves by the workflow ID bound to the source file, and persists the
latest source hash and workflow version in thread metadata. If the file has no
saved workflow ID, the build creates a new workflow unless `workflowId` is
provided to bind the file to an existing workflow. If the bound workflow no
longer exists, the tool returns blocked remediation rather than creating a
replacement.

### `delete-workflow`

Archive a workflow (soft delete, deactivates if needed). This is reversible
with `unarchive-workflow`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to archive |

**Returns**: `{ success: boolean }`

### `unarchive-workflow`

Restore an archived workflow without publishing it.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Archived workflow to restore |

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
> `setup-credentials`) or Computer Use browser credential capture.

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
`needsBrowserSetup=true`, the orchestrator should load the
`credential-setup-with-computer-use` skill, use Computer Use `browser_*` tools
directly, then call `setup-credentials` again to finalize.

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

## Knowledge Base (sandbox workspace)

Best-practices guides and curated workflow templates are materialized under
`<workspace_root>/knowledge-base/` when a builder sandbox is available. Agents
read them with workspace tools — there is no dedicated `get-best-practices` or
template-search tool.

| Path | Description |
|------|-------------|
| `knowledge-base/index.json` | Combined catalog of technique guides and curated templates |
| `knowledge-base/best-practices/index.json` | Catalog of workflow technique guides |
| `knowledge-base/best-practices/*.md` | Best-practices documentation per technique |
| `knowledge-base/templates/index.json` | Catalog of curated SDK workflow examples |
| `knowledge-base/templates/*.ts` | Template workflow source files |

Use `workspace_read_file` and `workspace_grep` (or shell equivalents in the
sandbox) to consult these before planning or building non-trivial workflows.

---

## Agent Builder Tool

### `build-agent` *(orchestration tool — requires the `agents` backend module)*

Delegates agent building to the agents-module builder chat
(`AgentsBuilderService`) running as an embedded, **non-interactive** sub-agent:
one conversational turn per call. Registered in `createOrchestrationTools`
only when the host provides `builderDelegate` (agents module active). The
builder's own prompt and tools drive the build, but its interactive tools
(`ask_questions`, `ask_credential`, `ask_embedding_credential`,
`configure_channel`) are excluded from this session — the builder cannot
suspend mid-turn and must complete every call, reporting any open questions as
plain text at the end of its reply (`builderReply`). Builder session state is
keyed to instance-AI-scoped threads (`ia-builder:<threadId>:<agentId>`) and
never appears in the agents-module builder UI.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | yes | Instruction or user message to forward to the builder — the builder cannot see this chat, so include every requirement, decision, and answer already gathered, not just the latest message |
| `name` | string | no | Name for a NEW agent (first call only) |
| `agentId` | string | no | Existing agent id to edit (first call only) |
| `workflowContext` | array | no | `{ id, name, description? }` refs to session-built workflows the builder may attach as tools |

**Returns**: `{ ok: true, builderReply, configUpdated }` on success, or
`{ ok: false, error }`.

**Relaying open questions:** since the builder cannot ask the user directly,
any decision it needs (missing credential, channel setup, ambiguous model
choice) comes back as text at the end of `builderReply`. The calling assistant
is responsible for surfacing those questions to the user (via its own
question tool/card if available) and sending the answers back through another
`build-agent` call.

**Targeting:** the first call must pass `name` (new agent) or `agentId`
(existing agent); the binding is then persisted to thread metadata so
follow-up calls keep editing the same agent without repeating `name`/`agentId`.

## Other Domain Tools

| Tool | Description |
|------|-------------|
| `ask-user` | Suspend and request user input (single/multi-select or text) |

---

## Tool Distribution

The orchestrator has access to the full native and orchestration surface.
Specialized background agents (for example `eval-setup-with-agent`) receive
only the domain tools wired into that agent.

| Tool Category | Orchestrator | Specialized background agents |
|---------------|:---:|:---:|
| Orchestration tools (`create-tasks`, etc.) | ✅ | ❌ |
| Docs search (`n8n-docs`) | ✅ (search/load) | ❌ |
| Eval tools (`evals`) | ✅ (search/load) | ❌ |
| Workflow tools | ✅ | ✅ (eval-setup) |
| Execution tools | ✅ | ❌ |
| Credential tools | ✅ | ✅ (eval-setup — setup only) |
| Node discovery tools | ✅ | ✅ (eval-setup) |
| Data table tools | ✅ (direct, via `data-table-manager` skill) | ✅ (eval-setup) |
| Workspace tools | ✅ | ❌ |
| Filesystem tools | ✅ (conditional) | ❌ |
| Web research tools | ✅ | ❌ |
| Knowledge base (best practices & templates via workspace) | ✅ | ✅ (eval-setup) |
| Sandbox-backed internals (`build-workflow` TypeScript compilation, `materialize-node-type`) | ✅ | ❌ |
| MCP tools | ✅ | ❌ |
| Computer Use browser tools | ✅ (direct, via credential skill when setting up credentials) | ❌ |

---

## Adding New Tools

1. Create a file in `src/tools/<domain>/` following the naming convention `<verb>-<noun>.tool.ts`
2. Define input/output schemas with Zod (`.describe()` on fields — these are the LLM's parameter docs)
3. Export a factory function that takes the service context and returns an `@n8n/agents` tool
4. Register the tool in `src/tools/index.ts` (in `createAllTools` or `createOrchestrationTools`)
5. If the tool requires a new service method, add it to the interface in `src/types.ts`
   and implement it in the backend adapter
6. New native domain tools registered in `createAllTools` are available to the orchestrator immediately
7. For HITL tools, define `suspendSchema` and `resumeSchema` — `@n8n/agents` handles
   the suspension/resume lifecycle automatically
