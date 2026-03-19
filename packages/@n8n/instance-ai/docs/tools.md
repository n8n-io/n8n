# Tool Reference

All tools the Instance AI agent has access to. Tools are organized into
orchestration tools (used by the orchestrator for loop control) and domain tools
(used by the orchestrator directly or delegated to sub-agents). Each tool defines
its input/output schema via Zod.

## Orchestration Tools (7)

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

### `cancel-background-task`

Cancel a running background task by its ID. Used when the user asks to stop a
background agent (e.g., "stop building that workflow"). The orchestrator sees
running task IDs via the `<background-tasks>` section injected into each message.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Background task ID (e.g., `build-XXXXXXXX`) |

**Returns**: `{ result: "Background task {taskId} cancelled." }`

**Behavior**:
- Calls `cancelBackgroundTask` on the orchestration context
- The service aborts the task's `AbortController`, publishes `agent-completed`
  with an error payload, and removes the task from tracking
- Safe to call on already-completed or non-existent tasks (no-op)
- Only available when `cancelBackgroundTask` is present on the context

**Cancellation flow** (three surfaces converge on the same backend method):

```
User clicks stop button  ─→ POST /chat/:threadId/tasks/:taskId/cancel ─┐
User says "stop that"     ─→ orchestrator calls cancel-background-task ─┤
cancelRun (global stop)   ─→ cancelBackgroundTasks(threadId)            ─┤
                                                                        ▼
                                              service.cancelBackgroundTask()
                                                        │
                                              abort + agent-completed event
                                                        │
                                              reducer marks node as error
                                              UI auto-collapses section
```

**Amend flow**: After cancellation, the cancelled task context is enriched into
the user's next message (`[Background task cancelled by user — {role}]`), so the
orchestrator knows what was stopped and can act on new instructions.

### `build-workflow-with-agent`

Spawn a specialized builder sub-agent as a background task. The agent handles
node discovery, schema lookups, code generation, and validation internally.
Returns immediately — the builder runs detached from the orchestrator.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | yes | What to build and any context (user requirements, credential names/types) |
| `workflowId` | string | no | Existing workflow ID to modify. Agent starts with the current workflow code pre-loaded. |

**Returns**: `{ result: string }` — contains task ID for background tracking.

**Two modes** (selected automatically based on sandbox availability):

- **Sandbox mode** (when `N8N_INSTANCE_AI_SANDBOX_ENABLED=true`): agent writes TypeScript
  to `~/workspace/src/workflow.ts`, runs `tsc` for validation, and calls `submit-workflow`
  to save. Gets tools: `search-nodes`, `get-workflow-as-code`, `get-node-type-definition`,
  `submit-workflow`, plus filesystem and `execute_command` from the workspace.
- **Tool mode** (fallback): agent uses string-based `build-workflow` tool with
  `get-node-type-definition`, `get-workflow-as-code`, `search-nodes`.

Both modes: max 30 steps, publishes events to the event bus, non-blocking (ADR-018).

**Sandbox-only tools** (not in `createAllTools`, only available to the builder sub-agent):
- `submit-workflow` — reads TypeScript from sandbox, parses/validates, resolves credentials, saves to n8n
- `materialize-node-type` — fetches `.d.ts` node type definitions and writes them into the sandbox for `tsc`
- `write-file` — writes a file to the sandbox workspace (path-traversal protected)

### `manage-data-tables-with-agent`

Spawn a background sub-agent for complex data table operations. Same pattern as
`build-workflow-with-agent` — non-blocking, returns immediately.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | yes | What to do (e.g. "create a contacts table with name, email, phone columns") |

**Returns**: `{ result: string }` — contains task ID for background tracking.

**Tools available**: All `*-data-table*` tools from the domain tools pool.

### `browser-credential-setup`

Spawn a sub-agent with Chrome DevTools MCP to set up credentials via browser automation.
Only available when `N8N_INSTANCE_AI_BROWSER_MCP=true`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentialType` | string | yes | Credential type to set up (e.g. `notionApi`) |
| `instructions` | string | yes | Setup instructions for the browser agent |

**Returns**: `{ result: string }` — the sub-agent's result.

---

## Workflow Tools (10)

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

Archive a workflow. This is a soft delete that deactivates it if needed and can be undone later.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow to archive |

**Returns**: `{ success: boolean }`

### `publish-workflow`

Publish a workflow version to production. Makes the specified version active — it will run on its triggers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | no | Specific version to publish (omit to publish the latest draft) |

**Returns**: `{ success: boolean, activeVersionId?: string }`

### `unpublish-workflow`

Unpublish a workflow — stops it from running in production. The draft is preserved.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID to unpublish |

**Returns**: `{ success: boolean }`

### `list-workflow-versions`

List version history for a workflow (metadata only, no nodes/connections). Each
version includes flags indicating whether it is the currently active (published)
version or the current draft.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | yes | — | Workflow ID |
| `limit` | number | no | 20 | Max results (1–100) |
| `skip` | number | no | 0 | Number of results to skip |

**Returns**: `{ versions: [{ versionId, name, description, authors, createdAt, autosaved, isActive, isCurrentDraft }] }`

### `get-workflow-version`

Get full details of a specific workflow version including nodes and connections.
Use to inspect what a version looked like, diff against the current draft, or
answer "when did node X change".

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version ID to retrieve |

**Returns**: `{ versionId, name, description, authors, createdAt, autosaved, isActive, isCurrentDraft, nodes: [{ name, type, parameters, position }], connections }`

### `restore-workflow-version`

Restore a workflow to a previous version by overwriting the current draft with
that version's nodes and connections. Does NOT affect the published/active
version — publish separately after restoring.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | yes | Workflow ID |
| `versionId` | string | yes | Version ID to restore |

**Returns**: `{ success: boolean }`

**HITL**: Requires user approval (severity: `warning`) since it overwrites the
current draft. Controlled by `restoreWorkflowVersion` permission.

---

## Execution Tools (5)

### `list-executions`

List recent workflow executions.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | no | — | Filter by workflow |
| `status` | string | no | — | `success`, `error`, `running`, `waiting` |
| `limit` | number | no | 20 | Max results (1–100) |

**Returns**: `{ executions: [{ id, workflowId, workflowName, status, startedAt, finishedAt, mode }] }`

### `run-workflow`

Execute a workflow, wait for completion (with timeout), and return the full result.
This is the primary execution tool — a single call runs the workflow and returns its
output data, status, and any errors. The default timeout is 5 minutes; on timeout the
execution is automatically cancelled.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflowId` | string | yes | — | Workflow to run |
| `inputData` | object | no | — | Data passed to the trigger node |
| `timeout` | number | no | 300000 | Max wait time in ms (max 600000) |

**Returns**: `{ executionId, status, data?, error?, startedAt?, finishedAt? }`

**Trigger detection**: Uses known trigger type constants (`CHAT_TRIGGER_NODE_TYPE`,
`FORM_TRIGGER_NODE_TYPE`, `WEBHOOK_NODE_TYPE`, `SCHEDULE_TRIGGER_NODE_TYPE`) instead of
naive string matching. Falls back to any node with "Trigger" in its type for unknown triggers.

**Type-aware pin data**: Constructs proper pin data per trigger type:
- **Chat trigger**: `{ chatInput, sessionId, action }`
- **Form trigger**: `{ submittedAt, formMode: 'instanceAi', ...inputData }`
- **Webhook trigger**: `{ headers: {}, query: {}, body: inputData }`
- **Schedule trigger**: current datetime information
- **Unknown trigger**: `{ json: inputData }` (generic fallback)

### `get-execution`

Get execution status without blocking. Returns immediately with the current state —
use this to poll running executions when needed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution ID |

**Returns**: `{ executionId, status, data?, error?, startedAt?, finishedAt? }`

Status values: `running`, `success`, `error`, `waiting`

### `debug-execution`

Analyze a failed execution with structured diagnostics. Returns the failing node,
its error message, the input data that caused the failure, and a per-node execution trace.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Failed execution to debug |

**Returns**:
```typescript
{
  executionId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  data?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  failedNode?: {
    name: string;
    type: string;
    error: string;
    inputData?: Record<string, unknown>;
  };
  nodeTrace: Array<{
    name: string;
    type: string;
    status: 'success' | 'error';
    startedAt?: string;
    finishedAt?: string;
  }>;
}
```

### `stop-execution`

Cancel a running execution by ID. Returns success/failure with a message.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | yes | Execution to cancel |

**Returns**: `{ success: boolean, message: string }`

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

## Web Research Tools (2)

### `web-search`

Search the web and return ranked results with titles, URLs, and snippets.
Supports domain filtering via native `site:` query syntax.

**Search providers** (in priority order):
1. **Brave Search** — used when `INSTANCE_AI_BRAVE_SEARCH_API_KEY` is set
2. **SearXNG** — used when `N8N_INSTANCE_AI_SEARXNG_URL` is set
3. **Disabled** — when neither is available

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | yes | — | Search query (be specific — include service names, API versions, error codes) |
| `maxResults` | number | no | 5 | Max results to return (1–20) |
| `includeDomains` | string[] | no | — | Restrict results to these domains |

**Returns**:

```typescript
{
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;  // relative date, e.g. "2 days ago"
  }>;
}
```

**Behavior**:
- **Brave**: Single HTTP GET to `https://api.search.brave.com/res/v1/web/search`
- **SearXNG**: Single HTTP GET to `{baseUrl}/search?q={query}&format=json&pageno=1`
- Domain filtering: `includeDomains` → `site:` operators, `excludeDomains` → `-site:` operators (both providers)
- Results cached for 15 minutes (LRU, 100 entries, keyed by query + options)
- **Conditional**: Only registered when at least one search provider is configured
- Returns empty results when no search provider is available

### `fetch-url`

Fetch a web page and extract its content as markdown. Uses a local pipeline
(Readability + Turndown) with no external API dependency. Includes SSRF
protection and result caching.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string (URL) | yes | — | URL of the page to fetch |
| `maxContentLength` | number | no | 30000 | Maximum content length in characters (max 100000) |

**Returns**:

```typescript
{
  url: string;            // Original request URL
  finalUrl: string;       // URL after redirects
  title: string;          // Page title
  content: string;        // Extracted content as markdown
  truncated: boolean;     // Whether content was truncated
  contentLength: number;  // Original content length before truncation
  safetyFlags?: {
    jsRenderingSuspected?: boolean;  // Page may need JS rendering
    loginRequired?: boolean;         // Page may require authentication
  };
}
```

**Behavior**:
- Routes by content-type: HTML → Readability + Turndown + GFM, PDF → pdf-parse,
  plain text / markdown → passthrough
- SSRF protection blocks private IPs, loopback, and non-HTTP(S) schemes
- Post-redirect SSRF check prevents open-redirect attacks
- Results cached for 15 minutes (LRU, 100 entries)
- Returns graceful error when `webResearchService` is not configured

---

## Filesystem Tools (4)

> **Conditional**: Only registered when `filesystemService` is present on the
> context. Auto-detected based on runtime environment — bare metal gets local
> filesystem, containers get gateway protocol, cloud gets nothing unless a
> daemon connects. See `docs/filesystem-access.md` for architecture details.

### `list-files`

List files matching a glob pattern within a directory.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `dirPath` | string | yes | — | Directory to list (relative to root or basePath) |
| `pattern` | string | no | `*` | Glob pattern to match |
| `type` | enum | no | — | Filter: `file` or `directory` |
| `recursive` | boolean | no | `false` | Recurse into subdirectories |

**Returns**: `{ files: FileEntry[] }` (max 1000 results)

### `read-file`

Read file contents with optional line range.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `filePath` | string | yes | — | Path to file |
| `startLine` | number | no | — | First line to read (1-based) |
| `maxLines` | number | no | 500 | Maximum lines to return |

**Returns**: `{ path, content, truncated, totalLines }` (max 512KB)

**Behavior**:
- Binary files detected via null-byte check in first 8KB — returns error
- Files exceeding 512KB are truncated with `truncated: true`
- Default excluded directories (node_modules, .git, dist, etc.) are skipped

### `search-files`

Search for text or regex patterns across files in a directory.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `dirPath` | string | yes | — | Directory to search |
| `query` | string | yes | — | Search text or regex pattern |
| `isRegex` | boolean | no | `false` | Treat query as regex |
| `caseSensitive` | boolean | no | `false` | Case-sensitive matching |
| `filePattern` | string | no | — | Only search files matching this glob |

**Returns**: `{ query, matches: [{ path, lineNumber, line }], truncated, totalMatches }` (max 100 results)

### `get-file-tree`

Get directory structure as an indented tree string.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `dirPath` | string | yes | — | Root directory |
| `maxDepth` | number | no | 10 | Maximum traversal depth |

**Returns**: `string` — indented tree representation (max 500 entries)

---

## Orchestration Tools — Research

### `research-with-agent`

Spawn a background research sub-agent that autonomously searches the web and
reads pages to answer a complex question. Same pattern as `build-workflow-with-agent`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `goal` | string | yes | — | What to research |
| `constraints` | string | no | — | Optional constraints (e.g. "Focus on REST API, not GraphQL") |

**Returns**: `{ result: string }` — contains task ID for background tracking.

**Behavior**:
- Spawns a background task (non-blocking, returns immediately)
- Sub-agent has tools: `web-search`, `fetch-url`
- Max 12 steps, stateless (per ADR-011)
- Publishes `agent-spawned` event; results arrive via `enrichMessageWithBackgroundTasks()`
- **Conditional**: Only registered when `web-search` is available in domain tools

---

## Tool Distribution

Not all tools are available to all agents. The orchestrator has access to
everything; sub-agents receive only what the orchestrator specifies in the
`delegate` call. Background agents (builder, data-table, research) get a
curated tool subset.

| Tool | Orchestrator | Sub-Agents (delegate) | Background Agents |
|------|:---:|:---:|:---:|
| `plan` | ✅ | ❌ | ❌ |
| `delegate` | ✅ | ❌ | ❌ |
| `build-workflow-with-agent` | ✅ | ❌ | ❌ |
| `manage-data-tables-with-agent` | ✅ | ❌ | ❌ |
| `research-with-agent` | ✅ (conditional) | ❌ | ❌ |
| `cancel-background-task` | ✅ (conditional) | ❌ | ❌ |
| `browser-credential-setup` | ✅ (conditional) | ❌ | ❌ |
| Filesystem tools | ✅ (conditional) | ✅ (via `delegate` tool subset) | ❌ |
| Domain tools | ✅ (direct use) | ✅ (via `delegate` tool subset) | ✅ (curated subset) |
| Sandbox tools (`submit-workflow`, `materialize-node-type`, `write-file`) | ❌ | ❌ | ✅ (builder only) |
| MCP tools | ✅ | ❌ | ❌ |

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
