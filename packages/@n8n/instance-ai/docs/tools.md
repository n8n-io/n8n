# Tool Reference

All tools the Instance AI agent has access to. Tools are organized into
orchestration tools (used by the orchestrator for loop control) and domain tools
(used by the orchestrator directly). Each tool defines its input schema with
Zod. Tools with one stable output shape can also define an output schema.

Most domain tools are **action-based**: one tool per domain, with an `action`
field selecting the operation. The input is a Zod discriminated union keyed on
`action`, so the model receives a precise schema per action and the handler
receives a narrowed type. Capability-gated actions are generally absent from the
union when the host has not wired them. Some tools instead keep an unavailable
action or fallback tool surface and return an error or empty result. Tool ids
live in `src/tools/tool-ids.ts`.

| Tool | Actions |
|------|---------|
| `workflows` | 14 |
| `data-tables` | 11 |
| `workspace` | 8 |
| `executions` | 7 |
| `credentials` | 6 |
| `nodes` | 6 |
| `mcp-servers` | 4 |
| `conversation-history` | 2 |
| `task-control` | 3 |
| `research` | 2 |
| `evals` | 4 |
| `eval-config` | 6 |
| `n8n-docs` | 3 |
| `agents` | 1 |
| `build-workflow`, `ask-user`, `parse-file` | single-purpose |

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

### `task-control`

Progress tracking and background-task control. One tool, three actions.

#### `task-control(action="update-checklist")`

Update a visible task checklist for the user. Lightweight progress tracking
during synchronous work.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tasks` | array | yes | List of `{id, description, status, detail?}` items |

**Returns**: `{ saved: true }`

**Behavior**: Saves to storage, publishes `tasks-update` event for live UI refresh.

#### `task-control(action="cancel-task")`

Cancel a running background task by its ID.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Background task ID (from `<running-tasks>` context) |

**Returns**: `{ result: "Background task {taskId} cancelled." }`

**Cancellation flow** (three surfaces converge):
```
User clicks stop button  -> POST /chat/:threadId/tasks/:taskId/cancel ---+
User says "stop that"    -> orchestrator calls task-control -------------+
cancelRun (global stop)  -> cancelBackgroundTasks(threadId) -------------+
                                                                        v
                                            service.cancelBackgroundTask()
```

#### `task-control(action="correct-task")`

Send a course correction to a running background task.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Background task ID |
| `correction` | string | yes | Correction message |

**Returns**: `{ result: string }`. The string says whether the correction was
sent, the task already completed, the task was not found, or delivery is not
available.

### `complete-checkpoint`

Close out a `checkpoint` planned task with its verdict. The tool is registered
for the orchestrator and is intended only for checkpoint follow-up turns. The
task must exist, have kind `checkpoint`, and be in the `running` state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Checkpoint task ID from the planned-task follow-up |
| `status` | `"succeeded" \| "failed"` | yes | Checkpoint verdict |
| `result` | string | no | Short user-visible outcome note |
| `error` | string | no | Failure message when `status` is `failed` |
| `outcome` | object | no | Structured evidence such as an execution ID, failed node, or data excerpt |

**Returns**: `{ result: string, ok: boolean }`

### `eval-data`

Populate the evaluation data table for a workflow that already has evaluation
nodes. This tool is synchronous. It does not start a sub-agent and does not use
HITL. It imports execution-history rows when at least 10 valid rows exist.
Otherwise, it generates 10 synthetic input rows and leaves expected-output
columns for the user to complete. It inserts at most 25 rows.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow whose evaluation table is populated |
| `projectId` | string | no | Project scope for the data table |

**Returns**: `{ status: "imported" | "generated" | "skipped", rowCount?,
source?, reason?, expectedOutputsNeedUserReview?, expectedOutputColumns?, table? }`

### `eval-setup-with-agent`

Start the detached eval-setup agent after the evaluation proposal is approved.
The agent normally receives `workflows` with only `get-json` and `update`, plus
the full `nodes` domain tool. It does not receive credentials, data tables,
workspace, the sandbox knowledge base, or MCP tools. Its persistence wrapper
supports checkpoint and suspension state.

The two-action workflow restriction is applied when workflow updates are
available and not blocked. If the host omits workflow permissions or blocks
workflow updates, the restricted replacement is skipped and the agent retains
the full workflow tool. Individual workflow action handlers then apply the
permissions available in that context.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to add evaluations to |
| `task` | string | yes | Exact task returned by `evals(action="propose")` |
| `conversationContext` | string | no | Thread summary that anchors dataset design |

**Returns**: `{ result: string, taskId: string }`

### `get-session` *(conditional)*

Read a resolved Agent preview session — title, session number and transcript.
Registered only when the host provides both `agentPreviewSession` and
`resolvePreviewSession`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | no | Limit the transcript to one execution; omit for the whole session |

**Returns**: `{ ok, title?, sessionNumber?, transcript?, error? }`

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

## `workflows` (14 actions)

The full domain surface has up to fourteen actions. Version actions are
registered only when their backend methods are available. The orchestrator
surface excludes the raw `get-json` and `update` actions. The eval-setup agent
gets only those two raw actions.

### `workflows(action="list")`

List workflows accessible to the current user.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | no | — | Substring filter on the workflow name only — omit for inventory questions |
| `limit` | number | no | 50 | Max results (1–100) |
| `status` | `"active" \| "archived" \| "all"` | no | `"active"` | Which workflows to list |
| `scope` | `"project" \| "instance"` | no | `"project"` | Which project(s) to search |
| `projectId` | string | no | — | Read one specific project, overriding `scope` |

**Returns**: `{ workflows: [{ id, name, activeVersionId, isArchived, createdAt, updatedAt, project? }], total, totalInScope, note? }`

`activeVersionId` is `null` when the workflow is unpublished.

`total` is how many workflows match every filter; `totalInScope` is how many the
same status and scope hold with `query` dropped. When a name filter or `limit`
left workflows out, `note` says so — a filtered page must never be read as the
project's full inventory.

`project` (`{ id, name }`) is the owning project, present only when the listing
can span more than one — i.e. neither `projectId` nor a bound project narrowed it
to one. It is what makes membership readable in a cross-project listing instead
of guessable by comparing per-scope counts.

`projectId` is a read-only narrowing: the adapter passes it as a filter on a query
that still resolves readability from the caller's own project and workflow roles,
so it cannot reach a project the user can't read (`scope: "instance"` already
returns that whole readable set). Writes ignore it and stay locked to the thread's
bound project.

### `workflows(action="get")`

Inspect workflow metadata and structure. Small workflows return their full node
data. Large workflows return a structural summary unless `full` is true.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | no | Read this historical version |
| `full` | boolean | no | Include complete node data for a large workflow |

**Returns**: the workflow detail, a structure-only summary, a version response,
or a structured not-found response.

`activeVersionId` is `null` when the workflow is unpublished.

### `workflows(action="get-as-code")`

Get a workflow as TypeScript SDK code. Used by the builder agent to inspect an
existing workflow when no workspace source file is already available. Existing
workflow modifications should write the returned code to a workspace source file
and call `build-workflow` with both `filePath` and the real n8n `workflowId`
once; subsequent repairs can reuse only `filePath`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | no | Convert this historical version |

**Returns**: `{ workflowId, name, code, error? }`.

### `build-workflow`

Compile, validate, and save a workspace workflow source file. Inline source and
string patches are not accepted; edit the workspace file first and then call
this tool with `filePath`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filePath` | string | yes | Workspace path to the `.workflow.ts` or WorkflowJSON source file |
| `workflowId` | string | no | Existing n8n workflow ID to bind to this file on the first update |
| `name` | string | no | Workflow name override for new workflows |
| `workItemId` | string | no | Work item hint for workflow-loop reporting |
| `isSupportingWorkflow` | boolean | no | Marks a saved sub-workflow as supporting |

There is deliberately **no `projectId`**: a build writes to the project the
conversation is bound to, and nothing can redirect it. The field used to exist and
the adapter ignored it, so a build could report a project it had not written to.

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

### `workflows(action="delete")`

Archive a workflow (soft delete, deactivates if needed). Reverse it with
`workflows(action="unarchive")`.

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

Open the inline UI for per-node credential and parameter setup. The tool uses a
suspend/resume state machine and can present several node setup requests in one
confirmation card.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to set up |
| `projectId` | string | no | Project scope for credential creation |
| `credentialHints` | array | no | Researched templates for Simplified Custom Auth credentials |
| `allowPlainGenericAuth` | boolean | no | Allow a user-selected plain generic auth type |
| `preferNewCredentials` | string[] | no | Types for which the user explicitly requested a new credential |
| `reopenSkipped` | string[] | no | Previously skipped types or nodes to reopen at the user's request |
| `includeAllNodes` | boolean | no | Include every node instead of only nodes changed by the last build |

**Returns**: `{ completedNodes, nodesStillNeedingSetup, skippedByUser, failedNodes }` —
`nodesStillNeedingSetup` is what nobody has configured yet, `skippedByUser` what the user
actively dismissed and the agent must not re-open (see `reopenSkipped`).

### `workflows(action="publish")`

Publish a workflow version to production. Makes it active — it will run on triggers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | no | Specific version (omit for latest draft) |

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

### `workflows(action="get-json")`

Get the full `WorkflowJSON` for workspace-file edits. Write it to a
`.workflow.json` file, edit the file, then save with `build-workflow`. Pass
`versionId` to read a past version instead of the current draft.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | no | Read this version instead of the current draft |

**Returns**: full `WorkflowJSON`.

### `workflows(action="validate")`

Return the per-node configuration issues a human would see as red warning
indicators on the canvas — missing credentials, parameter validation errors and
similar. A static check; it does not execute the workflow. Use it to confirm a
workflow is configured correctly before suggesting the user run or publish it.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `ignoreIssues` | array | no | Issue categories to skip: `parameters`, `credentials`, `input`, `execution`, `typeUnknown`, `aiGateway`, `chatModel` |

### `workflows(action="update")`

Raw update escape hatch. Saves a complete modified `WorkflowJSON` back to the
workflow, replacing the full definition. Prefer the workspace-file path
(`get-json` -> edit -> `build-workflow`) for ordinary edits.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `workflow` | object | yes | Full `WorkflowJSON` — name, nodes and connections must all be included |

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

## `executions` (7 actions)

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
| `triggerNodeName` | string | no | — | Trigger node to use when a workflow has more than one trigger |

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
| `startIndex` | number | no | First item index to return. Defaults to `0` |
| `maxItems` | number | no | Maximum items to return. Defaults to `10`; maximum `50` |

**Returns**: `{ nodeName, data?, error? }`

### `executions(action="get-resolved-node-parameters")`

Replay expression resolution for a node's parameters against a past execution.
Returns raw `parameters`, the `resolved` tree, `failedExpressions`, and
`emptyResolutions` (values that resolved to `null`, `undefined` or `""` — the
common silent cause of empty downstream fields). Use it when debugging why a
node received an unexpected value; more precise than reading raw expressions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution ID |
| `nodeName` | string | yes | Node whose parameters to resolve |
| `itemIndex` | number | no | Input item index to resolve against. Defaults to `0` |
| `runIndex` | number | no | Node run to use when it ran more than once. Defaults to the last run |

### `executions(action="stop")`

Cancel a running execution.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution to cancel |

**Returns**: `{ success: boolean, message: string }`

---

## `credentials` (6 actions)

> **Security note**: The agent never handles raw credential secrets. Credential
> creation and secret configuration is done through the n8n frontend UI (via
> `credentials(action="setup")`) or Computer Use browser credential capture.

### `credentials(action="list")`

List credentials accessible to the current user. Never exposes secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | no | Filter by credential type (e.g., `notionApi`) |
| `name` | string | no | Case-insensitive substring filter on the credential name |
| `limit` | number | no | Page size. Default 50 and maximum 200 |
| `offset` | number | no | Number of credentials to skip. Default 0 |

**Returns**: `{ credentials: [{ id, name, type }], total, hasMore, hint? }`.
A Gateway credits managed entry can have `id: null` and
`__aiGatewayManaged: true`.

### `credentials(action="get")`

Get credential metadata. Never returns decrypted secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential ID |

**Returns**: credential metadata from the credential service. It never contains
decrypted secret values.

### `credentials(action="delete")`

Permanently delete a credential. **Irreversible** — HITL confirmation required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to delete |
| `credentialName` | string | no | Display name for the confirmation message |

**Returns**: `{ success: boolean }`

### `credentials(action="search-types")`

Search available credential types by name or description.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | no | Search query. Required unless `gatewayCreditsOnly` is true |
| `gatewayCreditsOnly` | boolean | no | Return credential types supported by Gateway credits |

**Returns**: `{ results: [...] }`. Gateway-credits-only results have
`{ type, gatewayCredits: true }`.

### `credentials(action="setup")`

Open the credential picker UI for the user to configure credentials securely.
The LLM never sees secrets — the user interacts with the n8n frontend directly.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentials` | array | yes | Requests with `{ credentialType, reason?, suggestedName?, preferNew?, setupHint? }` |
| `requireUserSelection` | boolean | no | Keep the card open for an explicit choice |
| `credentialFlow` | object | no | `{ stage: "generic" | "finalize" }` |

**Returns**: one of the completed, deferred, browser-setup, or validation-error
shapes. A completed result contains `{ success: true, credentials, message }`.
A browser handoff contains `{ success: false, needsBrowserSetup: true,
credentialType, docsUrl?, requiredFields? }`.

**HITL**: Suspends execution and renders the credential setup UI. When a single
matching *service-scoped* credential already exists, the card auto-selects it
and resolves without user input — a `success` result with a credentials map
means setup is already complete, and the card is never open once a result is
returned. Generic auth types (bearer/header/query/basic/etc.) stay preselected
but always require an explicit Continue, since the type alone does not identify
a service. When `needsBrowserSetup=true`, the orchestrator should load the
`credential-setup-with-computer-use` skill, use Computer Use `browser_*` tools
directly, then call `credentials(action="setup")` again to select the created
credential.

### `credentials(action="test")`

Test whether a credential is valid and can connect to its service.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialId` | string | yes | Credential to test |

**Returns**: `{ success: boolean, message?: string }`

---

## `nodes` (6 actions)

The full domain surface has six actions. The orchestrator receives all six
actions in the current registry. The tool also defines a restricted
`type-definition` and `explore-resources` surface, but the orchestrator registry
does not currently select it. Specialized agents that resolve the full domain
tool can also receive all six actions.

### `nodes(action="list")`

List available node types in the n8n instance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | no | Filter by name or description |
| `gatewayCreditsOnly` | boolean | no | Return only nodes supported by Gateway credits |

**Returns**: `{ nodes: [{ name, displayName, description, group, version }] }`

### `nodes(action="describe")`

Get detailed node description including properties, credentials, inputs, and outputs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type (e.g., `n8n-nodes-base.httpRequest`) |

**Returns**: `{ name, displayName, description, properties, credentials, inputs, outputs }`

### `nodes(action="type-definition")`

Get TypeScript definitions for one to five node types, including exact
parameters, credentials, display conditions, and builder annotations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeTypes` | array | yes | One to five node requests. Each entry is a node type string or `{ nodeType, version?, resource?, operation?, mode? }` |

**Returns**: `{ definitions, error? }`.

### `nodes(action="search")`

Search nodes ranked by relevance with `@builderHint` annotations. Includes
subnode requirements and discriminator values.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | no | Short search query |
| `connectionType` | string | no | AI sub-node connection type |
| `limit` | number | no | Maximum results. Default 10 |

**Returns**: `{ results, totalResults }`

### `nodes(action="suggested")`

Get curated node suggestions for common use cases.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `categories` | string[] | yes | One to three supported technique categories |

**Returns**: `{ results, unknownCategories }`.

### `nodes(action="explore-resources")`

Explore a node's dynamic resources (listSearch / loadOptions). Used to discover
discriminator values like spreadsheet IDs, calendar names, etc.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodeType` | string | yes | Node type |
| `version` | number | yes | Node version |
| `methodName` | string | yes | Exact annotated list-search or load-options method |
| `methodType` | `"listSearch" | "loadOptions"` | yes | Dynamic method type |
| `credentialType` | string | yes | Credential type key |
| `credentialId` | string | yes | Credential to use |
| `filter` | string | no | Search text |
| `paginationToken` | string | no | Token from a previous result |
| `currentNodeParameters` | object | no | Parameters needed by dependent lookups |

**Returns**: `{ results, paginationToken?, builderHint?, error? }`.

---

## `data-tables` (11 actions)

Full CRUD suite for n8n data tables. System columns (`id`, `createdAt`,
`updatedAt`) are reserved and auto-managed.

### Table operations

| Action | Description |
|--------|-------------|
| `list` | List data tables |
| `create` | Create a data table with columns |
| `delete` | Delete a data table after confirmation |
| `schema` | Get the table columns |

### Column operations

| Action | Description |
|--------|-------------|
| `add-column` | Add a column to a table |
| `delete-column` | Remove a column from a table |
| `rename-column` | Rename a column |

### Row operations

| Action | Description |
|--------|-------------|
| `query` | Query rows with optional filters |
| `insert-rows` | Insert one or more rows |
| `update-rows` | Update rows matching a filter |
| `delete-rows` | Delete rows matching a non-empty filter after confirmation |

---

## `workspace` (4 or 8 actions)

The registry always contains this tool. Without `workspaceService`, every call
returns an unavailable error. Folder actions are present only when
`workspaceService.listFolders` is available.

| Tool | Description |
|------|-------------|
| `list-projects` | List projects accessible to the user; on a project-scoped thread the conversation's own project carries `isCurrentProject: true` |
| `tag-workflow` | Apply tags to a workflow |
| `list-tags` | List available tags |
| `cleanup-test-executions` | Remove test execution data |
| `list-folders` | List folders (conditional) |
| `create-folder` | Create a new folder (conditional) |
| `delete-folder` | Delete a folder (conditional) |
| `move-workflow-to-folder` | Move a workflow to a folder (conditional) |

---

## `research` (2 actions)

### `research(action="web-search")`

Search the web and return ranked results. Provider priority: Brave > SearXNG > disabled.
The action remains in the schema without a provider and returns an empty result
list in that case.

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

## Evaluation Tools

### `evals` (4 actions)

Set up on-canvas evaluations for workflows that contain AI nodes. The tool is
deferred and becomes available through tool search.

All four actions require `workflowId`. When a workflow has more than one AI
node, pass `targetAgentNodeName` to select the target.

| Action | Additional fields | Result and behavior |
|--------|-------------------|---------------------|
| `offer` | `projectId?` | Checks eligibility. Returns `eligible`, a reason when ineligible, AI node names, and a user-facing message when eligible. |
| `recommend-metric` | — | Suggests one metric and suspends for approval. Returns `{ approved: true, metricId }` or `{ approved: false }`. |
| `select-metrics` | — | Shows the multi-select metric picker after a recommendation is denied. Returns `chosenMetricIds` and the answers. |
| `propose` | `projectId?`, `metrics?`, `datasetChoice?`, `existingDataTableId?` | Builds the eval-setup task and creates, links, or defers the dataset. A successful result sets `shouldDelegateToEvalSetupAgent: true` and returns the task, workflow ID, dataset details, and a newly created table artifact when applicable. |

`datasetChoice` is `create-empty`, `link-existing`, or `later`; it defaults to
`create-empty`. `link-existing` requires `existingDataTableId`. A proposal can
also add generated pin data for referenced tool nodes before it returns the
eval-setup task.

### `eval-config` (6 actions, conditional)

Manage config-based evaluations without adding evaluation nodes to the canvas.
The tool is registered only when `evaluationConfigService` is available. A
config links a workflow start node, end node, Data Table dataset, and one or
more judged metrics.

| Action | Required fields | Result and behavior |
|--------|-----------------|---------------------|
| `list` | `workflowId` | Returns `{ configs }`. |
| `get` | `workflowId`, `configId` | Returns a summary as `{ config }`, or an error. |
| `describe` | `workflowId`, `configId` | Returns full metric expressions, model details, and prompts as `{ config }`, or an error. |
| `create` | `workflowId` and all config fields | Suspends for approval, then returns `{ config }`, a denial, or an error. |
| `update` | `workflowId`, `configId`, and all config fields | Replaces the full config after approval. Read it with `describe` first. |
| `delete` | `workflowId`, `configId` | Suspends for destructive approval, then returns `{ success }` or a denial. |

The config fields are `name`, `startNodeName`, `endNodeName`, `dataTableId`, and
`metrics`. Each metric requires `name`, `preset`, `credentialId`, `model`, and
`actualAnswer`; it can also set `provider`, `outputType`, `userQuery`,
`expectedAnswer`, and `prompt`.

---

## `n8n-docs` (3 actions)

Search the current n8n documentation registry and read registered Markdown
pages. This tool is always loaded when registered.

| Action | Fields | Result |
|--------|--------|--------|
| `lookup` | Shared lookup fields plus `oauthRedirectUrl?`, `maxPages?` (default 3, max 5), and `maxContentLength?` (default 30000, max 100000) | Ranked matches and the best matching documents. |
| `search` | Shared lookup fields plus `maxResults?` (default 8, max 20) | Ranked registry matches without page content. |
| `read` | `url`, `maxContentLength?` | One document when the URL is a registry entry; otherwise an empty document list and error. |

Shared lookup fields are `query`, `intent`, `credentialType`,
`credentialDisplayName`, `documentationUrl`, and `nodeType`. `query` is optional
when the supplied credential or node context is enough. `intent` is one of
`credential-setup`, `node-help`, `hosting`, `api`, or `general`.

Results include registry metadata and can include a hint or error. Answers based
on returned documents must cite the returned page titles and public URLs.

## `parse-file` *(conditional)*

Parse an attachment from the current user message. The registry adds this tool
only when the current turn contains a parseable attachment.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `attachmentIndex` | number | no | 0 | Zero-based attachment index |
| `format` | enum | no | detected | `csv`, `tsv`, `json`, `xlsx`, `text`, `markdown`, `html`, `pdf`, or `docx` |
| `hasHeader` | boolean | no | true | Treat the first CSV or TSV row as headers |
| `delimiter` | string | no | — | One-character CSV delimiter override |
| `startRow` | number | no | 0 | Pagination offset for tabular data |
| `maxRows` | number | no | 20 | Tabular rows to return, from 1 to 100 |

Tabular results contain normalized column metadata, rows, row counts,
pagination, truncation state, and warnings. Text-like results contain extracted
content and can include a title or page count. All results identify the source
attachment and can contain an error.

## `ask-user`

Suspend the run for one or more human decisions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questions` | array | yes | Items with `id`, `question`, `type`, and optional `options` |
| `introMessage` | string | no | Text shown above the first question |

Question type is `single`, `multi`, or `text`. The UI adds its own free-text
choice to select questions. The result is `{ answered: false }` when the user
dismisses the request. Otherwise it is `{ answered: true, answers }`, with the
question text added to every answer.

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
| `knowledge-base/index.json` | Root catalog advertising all three sections |
| `knowledge-base/best-practices/index.json` | Catalog of workflow technique guides |
| `knowledge-base/best-practices/*.md` | Best-practices documentation per technique |
| `knowledge-base/templates/index.json` | Catalog of curated SDK workflow examples |
| `knowledge-base/templates/*.ts` | Template workflow source files |
| `knowledge-base/reference/index.json` | Catalog of SDK reference material |
| `knowledge-base/reference/*.md` | SDK language and output-shape reference |

The tree is written by `src/knowledge-base/materialize-knowledge-base.ts`, which
sources best practices and some reference material from
`@n8n/workflow-sdk/prompts/*`, additional reference documents from the local
`knowledge-base/reference/` directory, and templates from the host's
`BuilderTemplatesService`. It also writes a workspace manifest alongside the
root index.

Use `workspace_read_file` and `workspace_grep` (or shell equivalents in the
sandbox) to consult these before planning or building non-trivial workflows.

---

## Agent Builder Tool

### `build-agent` *(orchestration tool — requires the `agents` backend module)*

Delegates agent building to the agents-module builder chat
(`AgentsBuilderService`) running as an embedded sub-agent: one conversational
turn per call. Registered in `createOrchestrationTools` only when the host
provides `builderDelegate` (agents module active). The builder's own prompt
and tools drive the build, including its interactive tools (`ask_questions`,
`ask_credential`, `ask_embedding_credential`, `configure_channel`, and
`call_agent` target-tool approvals) and
lifecycle tools (`publish_agent`, `unpublish_agent`) on the bound target agent —
the sub-agent session no longer excludes them. Forward publish/unpublish/
activate/make-live intents to `build-agent`; never tell the user to open the
agent editor and click Publish. The builder also inherits the orchestrator's
validated, approval-wrapped MCP connector tools so it can use the same external
context while designing the agent; connector tools that conflict with a native
builder tool name are skipped. Builder session state is keyed to
instance-AI-scoped threads (`ia-builder:<threadId>:<agentId>`) and never
appears in the agents-module builder UI.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | yes | Instruction or user message to forward to the builder — the builder cannot see this chat, so include every requirement, decision, and answer already gathered, not just the latest message |
| `name` | string | no | Agent name — switches back to the agent with that name built earlier in this conversation, or creates a new agent and makes it the active target; omit on follow-up calls for the current agent |
| `agentId` | string | no | Existing agent id to edit — use the `agentId` returned by earlier build-agent results; pass to start editing that agent or to switch the active build target; omit on follow-up calls |
| `workflowContext` | array | no | `{ id, name, description? }` refs to session-built workflows the builder may attach as tools |

**Returns**: `{ ok: true, builderReply, configUpdated, agentId,
agentName?, requiredArtifacts? }` on success, or `{ ok: false, error,
configUpdated?, agentId?, agentName?, requiredArtifacts? }` on failure
(`agentId`/`agentName` identify the targeted agent
once a builder turn was dispatched; precondition failures before any turn
omit them). `configUpdated` is optional: it's included (reporting mutations
from passes that already ran) once a builder turn has actually been
dispatched — mid-turn failures and resume failures that still carry a prior
checkpoint ref — but omitted for precondition failures before any turn
starts (agents module not configured, missing `name`/`agentId`, no project
context to bind `agentId`, or a resume whose suspend payload has no
checkpoint ref to carry).

`requiredArtifacts` contains structured workflows or data tables that the
embedded builder cannot create. Build an `agent-tool` workflow and pass it back
through `workflowContext`. Build an `agent-entrypoint` workflow around the
returned Agent ID and never attach it to the Agent; this is used for unsupported
chat channels whose trigger and reply nodes live in a workflow. Requirements
reported before an interactive suspension are carried across its checkpoint.

**Interactive requests:** when the builder suspends on one of its interactive
tools (batched questions, a credential picker, channel setup, or a standard SDK
approval requested by a target-agent test run), this tool
cascades the suspension through its own suspend/resume so it renders as a
chat card directly in the assistant conversation — no manual relaying, and the
suspension survives a process restart. On resume, the tool takes the target
agent from the checkpoint ref carried in the suspend payload (falling back
to the persisted active binding for older checkpoints), re-derives the
builder's open suspension from persistence, and verifies they match the
suspension it originally cascaded before routing the answer back; a stale
or superseded suspension fails the call instead of silently resuming the
wrong one.

**Targeting:** the first call must pass `name` (new agent) or `agentId`
(existing agent); the active target is persisted to thread metadata so
follow-up calls keep editing the same agent without repeating them. The
target is rebindable: a `name` matching an agent already targeted this
conversation switches back to it (tracked in a per-thread registry), while
an unmatched name creates another agent and switches to it (the same name
as the active target just continues it), a different `agentId` switches to
that agent (persisted only once the builder turn settles, so a bad id
cannot clobber the existing binding), and `agentId` wins when both are
given. Prefer switching by the `agentId` returned from earlier calls; the
name lookup is the fallback when the id is unknown.

### `agents` *(domain tool — requires the `agents` backend module)*

Read-only listing of the project's n8n Agent artifacts. One action, `list`:
returns `{ count, agents: [{ agentId, name, published, updatedAt }] }`, most
recently updated first. Registered alongside `build-agent` (agents module
active + project-bound conversation, `agent:read` scope enforced in the
adapter). Use it to answer questions about existing agents and to find the
`agentId` for `build-agent` when editing an agent not built in this
conversation. Creation and editing stay on `build-agent`.

## MCP Registry Tool

### `mcp-servers` *(domain tool — conditional)*

Tool to interact with connected and available MCP servers, and to let the user connect one from the chat.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `'connected' \| 'details' \| 'search' \| 'connect'` | yes | Discriminator |
| `slug` | string | `details` | Server slug, as returned by `connected` |
| `queries` | string[] | `search` | Free-text queries matched against server name, title, description |
| `serverSlugs` | string[] | `connect` | Slugs returned by `search`, best match first, max 3 |
| `reason` | string | `connect` | One sentence for the confirmation record |

**`connected`** → `{ servers: [{ slug, toolCount }], hint? }`. Every connected MCP
server, counts only — names are `details`' job.

**`details`** → `{ slug, tools, hint? }`. One server's tool names. `hint` tells an
unconnected slug apart from a connected server that loaded no tools.

**`search`** → `{ results: [{ slug, title, description, tools }], hint? }`, capped
at 5, most relevant first. Only servers the user has *not* connected come back.

**`connect`** → `{ connectedSlugs, message }`. Suspends to render the inline
**Available tools** card, resuming when the user connects or skips. `connectedSlugs`
are the ones the server confirms on resume, not the ones the client claimed.

## Conversation History Tool

### `conversation-history` *(domain tool — conditional, orchestrator only)*

Read-only recall over the user's past conversations in the current project.
Scoped to the current user and project, with the current thread excluded from
search. Registered only when the host wires `conversationHistoryService` — the
user is in the `109_instance_ai_conversation_history` experiment and the run
has a bound project — and only onto the orchestrator: sub-agents get
their context from briefings, not by reading across threads. Always loaded:
recall only works proactively, and deferred it was only reached when the user
explicitly asked about past conversations. The system prompt's "Past
Conversations" section describes the situations where recall helps (an
example-based list, not hard rules — mandates proved both repetitive and
over-aggressive), and the host appends
a `<past-conversations>` block (recent titles + count) to the first user
message of a thread whose project has history — the ambient cue that makes the
tool's relevance self-evident.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `'search' \| 'get-messages'` | yes | Discriminator |
| `query` | string | no | Case-insensitive text matched against titles, user messages, and ask-user answers (2–200 chars) as one exact phrase — the description steers the model toward fewer, short, distinctive terms. Omitted → `search` lists the most recent conversations instead |
| `limit` | number | no | Max conversations to return (default 10 when searching, 5 when listing recent; max 10) |
| `threadId` | string | `get-messages` | Conversation id from a search result |
| `aroundMessageId` | string | no | Center the read on this message id (from a search excerpt) |
| `before` | number | no | Messages before the anchor; without `aroundMessageId`, the last N messages (max 5) |
| `after` | number | no | Messages after the anchor; without `aroundMessageId`, the first N messages (max 5) |

`before` and `after` can only be combined with `aroundMessageId` — passing both
without an anchor is a schema-level rejection.

**`search`** → `{ hits: [{ threadId, title, updatedAt, matchedIn, firstMessageExcerpt?, excerpts: [{ messageId, text, createdAt }] }], error? }`,
recency-ordered. `matchedIn` is an array containing zero or more of `'title' | 'messages' | 'user-answers'`.
The SQL prefilter is a LIKE over serialized JSON, so candidates are re-checked
against the text a reader would see, one page at a time; a thread with neither
a title match nor a re-checked excerpt is dropped. There are no counts. Threads
with no messages are never returned. Without a `query` the same shape carries a
recency listing: empty `matchedIn`/`excerpts` — pair it with a `get-messages`
tail read to continue recent work.

**`get-messages`** → `{ threadId, title, messages: [{ messageId, role, createdAt, text, userAnswers?: [{ question, answer }] }], hasMoreBefore, hasMoreAfter, error? }`,
oldest-first. Defaults for the read window (tail/head/around sizing) are
applied by the service, not the tool. The read is the conversation as the
user experienced it: their messages, ask-user Q&A, and each turn's final
text-only reply. Mid-turn assistant rows — the agent loop only continues on
tool calls, so a row carrying them is working narration rather than the reply
that ended the turn — are filtered out in SQL via structural markers
(unescaped `"type":"tool-call"` can only be block structure — quotes inside
text are escaped); ask-user rows stay visible for their Q&A. Rows only
recognizable after parsing — internal auto-follow-up user rows, rows with no
visible text, ask-user rows still awaiting an answer, unreadable content — are
dropped by the same visibility predicate the window fetch uses, so
`before`/`after` count returned messages. The fetch over-reads to fill its
slots; `hasMoreBefore`/`hasMoreAfter` may over-report after a long run of
invisible rows, never under-report.

Both actions return `{ ..., error: '...' }` with empty/default fields — never a
thrown tool error — when the service is unavailable or a lookup fails.

## Tool Distribution

The orchestrator receives the safe orchestrator domain surface and all
registered orchestration tools. It does not receive raw workflow JSON read or
update actions. It currently receives the full six-action `nodes` tool. The
eval-setup background agent receives only its explicitly wired tool subset,
except for the workflow-tool permission fallback described above.

| Tool | Orchestrator | Eval-setup background agent |
|---------------|:---:|:---:|
| Orchestration tools (`create-tasks`, `task-control`, etc.) | ✅ | ❌ |
| `n8n-docs` | ✅ | ❌ |
| `evals` | ✅ (search/load) | ❌ |
| `eval-config` | ✅ (conditional, search/load) | ❌ |
| `workflows` | ✅ (without `get-json` or `update`) | ✅ (`get-json` and `update` normally; full tool when permissions are missing or updates are blocked) |
| `executions` | ✅ | ❌ |
| `credentials` | ✅ | ❌ |
| `nodes` | ✅ (full domain tool) | ✅ (full domain tool) |
| `data-tables` | ✅ (direct, via `data-table-manager` skill) | ❌ |
| `workspace` | ✅ | ❌ |
| `ask-user` | ✅ | ❌ |
| `parse-file` | ✅ (when the turn has a parseable attachment) | ❌ |
| `research` | ✅ | ❌ |
| `conversation-history` | ✅ (experiment `109_instance_ai_conversation_history`, via `conversationHistoryService`) | ❌ |
| `agents` and `build-agent` | ✅ (when the Agents module supplies the builder delegate) | ❌ |
| Knowledge base (via runtime workspace tools) | ✅ | ❌ |
| Sandbox-backed internals (`build-workflow` TypeScript compilation, `materialize-node-type`) | ✅ | ❌ |
| External MCP tools | ✅ (when configured) | ❌ |
| Local gateway MCP tools, including Computer Use browser tools | ✅ (when connected and allowed) | ❌ |

The embedded Agent Builder is separate from the eval-setup column. It inherits
the orchestrator's safe MCP connector tools. Eval setup does not receive MCP
tools.

---

## Adding New Tools

Most additions are a new **action on an existing domain tool** rather than a new
tool. Add a top-level tool only when the operation does not belong to an
existing domain.

**Adding an action:**

1. Add an action schema to the domain's `src/tools/<domain>.tool.ts` and include
   it in that tool's discriminated union
2. Give every field a `.describe()` — these are the LLM's parameter docs
3. If it needs a new service method, add it to the interface in `src/types.ts`
   and implement it in the backend adapter
4. Gate it on host capability if applicable, so the action is absent from the
   union when unsupported

**Adding a tool:**

1. Create `src/tools/<name>.tool.ts` (domain) or
   `src/tools/orchestration/<name>.tool.ts` (orchestration)
2. Add its id to `DOMAIN_TOOL_IDS` or `ORCHESTRATION_TOOL_IDS` in
   `src/tools/tool-ids.ts`
3. Export a factory that takes the service context and returns an `@n8n/agents` tool
4. Register it in `src/tools/index.ts` — `createAllTools`,
   `createOrchestratorDomainTools`, and/or `createOrchestrationTools`
5. Decide whether it belongs in `ALWAYS_LOADED_TOOL_NAMES`. Everything not in
   that set is normally reached through `search_tools` + `load_tool`. Tools in
   `CHECKPOINT_FOLLOW_UP_TOOL_NAMES` are also loaded directly during checkpoint
   follow-ups. Deferral is the right default, but a tool whose job is to reveal
   an absence, or to redirect the model's attention, cannot be found by
   searching for it
6. For HITL tools, define `suspendSchema` and `resumeSchema` — `@n8n/agents` handles
   the suspension/resume lifecycle automatically
7. Tool handlers are wrapped at registry registration time so Stop races
   `ctx.abortSignal`. For network/sandbox I/O, also forward `ctx.abortSignal`
   into the underlying request so work stops cooperatively (see `research` and
   `n8n-docs`)
