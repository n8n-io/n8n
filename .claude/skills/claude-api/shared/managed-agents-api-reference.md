# Managed Agents - Endpoint Reference

All endpoints require `x-api-key` and `anthropic-version: 2023-06-01` headers. Managed Agents endpoints additionally require the `anthropic-beta` header.

> Most users should define agents and environments as version-controlled files synced with `ant apply` - see `shared/anthropic-cli.md`. The endpoints below are the underlying API that the CLI and SDKs drive.

## Beta Headers

```
anthropic-beta: managed-agents-2026-04-01
```

The SDK adds this header automatically for all `client.beta.{agents,environments,sessions,vaults,deployments,deployment_runs}.*` calls. Memory store endpoints (`client.beta.memory_stores.*`) use `agent-memory-2026-07-22` instead, which the SDK also sets; sending both headers on a memory store request returns a 400. The Files and Skills APIs are out of beta and need no beta header.

---

## SDK Method Reference

All resources are under the `beta` namespace. Python and TypeScript share identical method names.

| Resource | Python / TypeScript (`client.beta.*`) | Go (`client.Beta.*`) |
| --- | --- | --- |
| Agents | `agents.create` / `retrieve` / `update` / `list` / `archive` | `Agents.New` / `Get` / `Update` / `List` / `Archive` |
| Agent Versions | `agents.versions.list` | `Agents.Versions.List` |
| Environments | `environments.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Environments.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Environment Work (self-hosted) | `environments.work.poller` / `stats` / `stop` | See `shared/managed-agents-self-hosted-sandboxes.md` |
| Sessions | `sessions.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Sessions.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Session Events | `sessions.events.list` / `send` / `stream` | `Sessions.Events.List` / `Send` / `StreamEvents` |
| Session Threads | `sessions.threads.list` / `retrieve` / `archive`; `sessions.threads.events.list` / `stream` | `Sessions.Threads.List` / `Get` / `Archive`; `Sessions.Threads.Events.List` / `StreamEvents` |
| Session Resources | `sessions.resources.add` / `retrieve` / `update` / `list` / `delete` | `Sessions.Resources.Add` / `Get` / `Update` / `List` / `Delete` |
| Deployments | `deployments.create` / `update` / `pause` / `unpause` / `archive` / `run` | Not yet documented - WebFetch the SDK repo (`shared/live-sources.md`) |
| Deployment Runs | `deployment_runs.list` / `retrieve` (TS: `deploymentRuns.*`) | Not yet documented - WebFetch the SDK repo (`shared/live-sources.md`) |
| Vaults | `vaults.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Vaults.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Credentials | `vaults.credentials.create` / `retrieve` / `update` / `list` / `delete` / `archive` / `mcp_oauth_validate` | `Vaults.Credentials.New` / `Get` / `Update` / `List` / `Delete` / `Archive` / `McpOauthValidate` |
| Memory Stores | `memory_stores.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `MemoryStores.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Memories | `memory_stores.memories.create` / `retrieve` / `update` / `list` / `delete` | `MemoryStores.Memories.New` / `Get` / `Update` / `List` / `Delete` |
| Memory Versions | `memory_stores.memory_versions.list` / `retrieve` / `redact` | `MemoryStores.MemoryVersions.List` / `Get` / `Redact` |

**Naming quirks to watch for:**
- Agents and Session Threads have **no delete** - only `archive`. Archive is **permanent**: the agent becomes read-only, new sessions cannot reference it, and there is no unarchive. Confirm with the user before archiving a production agent. Environments, Sessions, Vaults, Credentials, and Memory Stores have both `delete` and `archive`; Session Resources, Files, Skills, and Memories are `delete`-only; Memory Versions have neither - only `redact`.
- Session resources use `add` (not `create`).
- Go's event stream is `StreamEvents` (not `Stream`).
- The self-hosted worker class is `EnvironmentWorker` from `anthropic.lib.environments` / `@anthropic-ai/sdk/helpers/beta/environments` / `anthropic-sdk-go/lib/environments`; `client.beta.environments.work.worker(...)` is a factory that returns the same class, alongside the `environments.work.poller/stats/stop` client methods.

**Agent shorthand:** `agent` on session create accepts three forms - a bare string (`agent="agent_abc123"`, latest version), a pinned reference `{type: "agent", id, version}`, or `{type: "agent_with_overrides", id, version?, model?, system?, tools?, mcp_servers?, skills?}` to override those fields for this session only (see `shared/managed-agents-core.md` -> Override agent configuration for a session).

**Model shorthand:** `model` on agent create accepts either a bare string (`model="claude-opus-5-5"` - uses `standard` speed) or the full config object, which takes `speed`, `effort`, and `inference_geo` alongside `id`: `{id: "claude-opus-5-5", speed: "fast"}`, `{id: "claude-opus-5-5", effort: "high"}`, `{id: "claude-opus-5-5", inference_geo: "us"}`. `effort` accepts a level string (`low`/`medium`/`high`/`xhigh`/`max`) or `{type: "<level>"}`, and in a per-session `model` override it sets the session's effort level (the agent's own `effort` isn't carried over, and a `model` override without `effort` runs at that model's default effort level). `inference_geo` (`"us"` | `"global"`) pins the geography serving the agent's model requests, and is also applied in a per-session `model` override. See `shared/managed-agents-core.md` -> Effort on the agent model / Pinning inference geography. Note: `speed: "fast"` is supported on Claude Opus 5.5, Claude Opus 5, and Opus 4.8 - on the Claude API only, which includes Managed Agents but not Amazon Bedrock, Google Cloud, or Microsoft Foundry. Opus 4.7 fast mode has been removed; `speed: "fast"` on Opus 4.7 returns an error.

---

## Agents

**Step one of every flow.** Sessions require a pre-created agent - there is no inline agent config under `managed-agents-2026-04-01`.

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/agents` | ListAgents | List agents |
| `POST` | `/v1/agents` | CreateAgent | Create a saved agent configuration |
| `GET` | `/v1/agents/{agent_id}` | GetAgent | Get agent details |
| `POST` | `/v1/agents/{agent_id}` | UpdateAgent | Update agent configuration. `version` is **optional**: supply it (>= 1) for optimistic concurrency - a mismatch returns 409 - or omit it for an unconditional last-write-wins update. |
| `POST` | `/v1/agents/{agent_id}/archive` | ArchiveAgent | Archive an agent. Makes it **read-only**; existing sessions continue, new sessions cannot reference it. No unarchive - this is the terminal state. |
| `GET` | `/v1/agents/{agent_id}/versions` | ListAgentVersions | List agent versions |

## Sessions

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions` | ListSessions | List sessions (paginated) |
| `POST` | `/v1/sessions` | CreateSession | Create a new session |
| `GET` | `/v1/sessions/{session_id}` | GetSession | Get session details |
| `POST` | `/v1/sessions/{session_id}` | UpdateSession | Update session `metadata`/`title`, `agent.tools`/`agent.mcp_servers` (session-local override; session must be `idle`), or `budget` - change the cap (higher or lower; the new value must exceed the consumed list cost) or remove it with `null`; removal is one-way, and a budget can never be added post-create. `vault_ids` is create-only (rejected on update). See `shared/managed-agents-core.md` -> Updating the agent configuration mid-session / Session budgets. |
| `DELETE` | `/v1/sessions/{session_id}` | DeleteSession | Delete a session |
| `POST` | `/v1/sessions/{session_id}/archive` | ArchiveSession | Archive a session |

## Events

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/events` | ListEvents | List events (polling, paginated) |
| `POST` | `/v1/sessions/{session_id}/events` | SendEvents | Send events (user message, tool result) |
| `GET` | `/v1/sessions/{session_id}/events/stream` | StreamEvents | Stream events via SSE. Optional `event_deltas[]=agent.message` / `agent.thinking` opts in to live-preview `event_start`/`event_delta` events - see `shared/managed-agents-events.md` § Live previews. |

## Session Threads

Per-subagent event streams in multiagent sessions. See `shared/managed-agents-multiagent.md`.

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/threads` | ListThreads | List threads (paginated) |
| `GET` | `/v1/sessions/{session_id}/threads/{thread_id}` | GetThread | Retrieve one thread (carries `agent` snapshot, `status`, `parent_thread_id`, `stats`, `usage`) |
| `POST` | `/v1/sessions/{session_id}/threads/{thread_id}/archive` | ArchiveThread | Archive a thread |
| `GET` | `/v1/sessions/{session_id}/threads/{thread_id}/events` | ListThreadEvents | List past events for one thread (paginated) |
| `GET` | `/v1/sessions/{session_id}/threads/{thread_id}/stream` | StreamThreadEvents | Stream one thread via SSE (SDK: `threads.events.stream`) |

## Session Resources

| Method   | Path                                                    | Operation        | Description                              |
| -------- | ------------------------------------------------------- | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/resources` | ListResources | List resources attached to session |
| `POST` | `/v1/sessions/{session_id}/resources` | AddResource | Attach `file` or `github_repository` resource (SDK method: `add`, not `create`). `memory_store` resources attach at session-create time only. Self-hosted environments accept **only** `memory_store` (at create); `file` / `github_repository` are rejected there. |
| `GET` | `/v1/sessions/{session_id}/resources/{resource_id}` | GetResource | Get a single resource |
| `POST` | `/v1/sessions/{session_id}/resources/{resource_id}` | UpdateResource | Update resource |
| `DELETE` | `/v1/sessions/{session_id}/resources/{resource_id}` | DeleteResource | Remove resource from session |

## Environments

| Method   | Path                                                             | Operation            | Description                         |
| -------- | ---------------------------------------------------------------- | -------------------- | ----------------------------------- |
| `POST`   | `/v1/environments`                                     | CreateEnvironment    | Create environment                  |
| `GET`    | `/v1/environments`                                     | ListEnvironments     | List environments                   |
| `GET`    | `/v1/environments/{environment_id}`                    | GetEnvironment       | Get environment details             |
| `POST`   | `/v1/environments/{environment_id}`                    | UpdateEnvironment    | Update environment                  |
| `DELETE` | `/v1/environments/{environment_id}`                    | DeleteEnvironment    | Delete environment. Returns 204. |
| `POST`   | `/v1/environments/{environment_id}/archive`            | ArchiveEnvironment   | Archive environment. Makes it **read-only**; existing sessions continue, new sessions cannot reference it. No unarchive - this is the terminal state. |
| `GET`    | `/v1/environments/{environment_id}/work/stats`         | WorkQueueStats       | Self-hosted work-queue depth/pending/workers. `x-api-key` auth. See `shared/managed-agents-self-hosted-sandboxes.md`. |
| `POST`   | `/v1/environments/{environment_id}/work/{work_id}/stop` | StopWork            | Self-hosted: stop a claimed work item. `x-api-key` auth. |

For `type: "self_hosted"`, `config` is the bare `{"type": "self_hosted"}` - `networking` and `packages` do not apply. (With `limited` networking, `allowed_hosts` also applies to `web_search` / `web_fetch`; `unrestricted` networking and self-hosted environments do not limit them. In both environment types they can be turned off (`enabled: false`) or restricted per-tool with `allowed_domains` / `blocked_domains` in the agent toolset; see `shared/managed-agents-tools.md`.)

## Deployments

Scheduled deployments (`depl_` IDs) run an agent on a recurring cron schedule - each firing creates a session. See `shared/managed-agents-scheduled-deployments.md` for the conceptual guide (cron/DST semantics, failure behavior, lifecycle).

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `POST`   | `/v1/deployments`                                | CreateDeployment | Create a scheduled deployment            |
| `POST`   | `/v1/deployments/{deployment_id}`                | UpdateDeployment | Update deployment configuration (see `shared/managed-agents-scheduled-deployments.md`) |
| `POST`   | `/v1/deployments/{deployment_id}/pause`          | PauseDeployment  | Suppress scheduled triggers (reversible; manual runs still allowed) |
| `POST`   | `/v1/deployments/{deployment_id}/unpause`        | UnpauseDeployment | Resume from the next occurrence (no backfill) |
| `POST`   | `/v1/deployments/{deployment_id}/archive`        | ArchiveDeployment | **Terminal** - schedule stops, deployment becomes immutable |
| `POST`   | `/v1/deployments/{deployment_id}/run`            | RunDeployment    | Trigger a manual run immediately (`trigger_context.type: "manual"`); works while paused |

## Deployment Runs

Each trigger attempt (scheduled or manual) writes a `deployment_run` record (`drun_` IDs) carrying either the created `session_id` or an `error.type` (`environment_archived`, `agent_archived`, `vault_not_found`, `session_rate_limited`, `service_unavailable`).

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET`    | `/v1/deployment_runs?deployment_id=...`          | ListDeploymentRuns | List runs for a deployment (paginated; filter failures with `has_error=true`) |
| `GET`    | `/v1/deployment_runs/{deployment_run_id}`        | GetDeploymentRun   | Retrieve a single run by ID (a `deployment_run.*` webhook event carries this as `data.id`) |

## Vaults

Vaults store credentials that Anthropic manages on your behalf - MCP credentials (OAuth with auto-refresh, or static bearer tokens) and `environment_variable` credentials substituted into outbound requests at egress. Attach to sessions via `vault_ids`. See `managed-agents-tools.md` §Vaults for the conceptual guide and credential shapes.

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `POST`   | `/v1/vaults`                                     | CreateVault      | Create a vault                           |
| `GET`    | `/v1/vaults`                                     | ListVaults       | List vaults                              |
| `GET`    | `/v1/vaults/{vault_id}`                          | GetVault         | Get vault details                        |
| `POST`   | `/v1/vaults/{vault_id}`                          | UpdateVault      | Update vault                             |
| `DELETE` | `/v1/vaults/{vault_id}`                          | DeleteVault      | Delete vault                             |
| `POST`   | `/v1/vaults/{vault_id}/archive`                  | ArchiveVault     | Archive vault                            |

## Credentials

Credentials are individual secrets stored inside a vault.

| Method   | Path                                                              | Operation          | Description                  |
| -------- | ----------------------------------------------------------------- | ------------------ | ---------------------------- |
| `POST`   | `/v1/vaults/{vault_id}/credentials`                               | CreateCredential   | Create a credential          |
| `GET`    | `/v1/vaults/{vault_id}/credentials`                               | ListCredentials    | List credentials in vault    |
| `GET`    | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | GetCredential      | Get credential metadata      |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | UpdateCredential   | Update credential            |
| `DELETE` | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | DeleteCredential   | Delete credential            |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}/archive`       | ArchiveCredential  | Archive credential           |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}/mcp_oauth_validate` | McpOauthValidate | Validate an MCP OAuth credential |

## Memory Stores

Workspace-scoped persistent memory that survives across sessions. Attach to a session via a `{"type": "memory_store", "memory_store_id": ...}` entry in `resources[]` (session-create time only). See `shared/managed-agents-memory.md` for the conceptual guide, the FUSE-mount agent interface, preconditions, and versioning.

| Method   | Path                                             | Operation          | Description                              |
| -------- | ------------------------------------------------ | ------------------ | ---------------------------------------- |
| `POST`   | `/v1/memory_stores`                              | CreateMemoryStore  | Create a store (`name`, `description`, `metadata`) |
| `GET`    | `/v1/memory_stores`                              | ListMemoryStores   | List stores (`include_archived`, `created_at_{gte,lte}`) |
| `GET`    | `/v1/memory_stores/{memory_store_id}`            | GetMemoryStore     | Get store details                        |
| `POST`   | `/v1/memory_stores/{memory_store_id}`            | UpdateMemoryStore  | Update store                             |
| `DELETE` | `/v1/memory_stores/{memory_store_id}`            | DeleteMemoryStore  | Delete store                             |
| `POST`   | `/v1/memory_stores/{memory_store_id}/archive`    | ArchiveMemoryStore | Archive store. Makes it **read-only**; existing sessions continue, new sessions cannot reference it. No unarchive. |

## Memories

Individual text documents inside a store (<= 100KB each). `create` creates at a `path` and returns `409` (`memory_path_conflict_error`, with `conflicting_memory_id`) if the path is occupied; `update` mutates by `mem_...` ID (rename and/or content). Only `update` accepts a `precondition` (`{"type": "content_sha256", "content_sha256": ...}`) - on mismatch returns `409` (`memory_precondition_failed_error`). List endpoints accept `view: "basic"|"full"` (controls whether `content` is populated; `retrieve` defaults to `full`).

| Method   | Path                                                              | Operation      | Description                              |
| -------- | ----------------------------------------------------------------- | -------------- | ---------------------------------------- |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memories`                    | ListMemories   | Returns `Memory \| MemoryPrefix`; filter by `path_prefix`, `depth` |
| `POST`   | `/v1/memory_stores/{memory_store_id}/memories`                    | CreateMemory   | Create at `path` (SDK: `memories.create`); `409 memory_path_conflict_error` if occupied |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | GetMemory      | Read one memory (defaults to `view="full"`) |
| `PATCH`  | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | UpdateMemory   | Change `content`, `path`, or both by ID; optional `precondition` |
| `DELETE` | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | DeleteMemory   | Delete (optional `expected_content_sha256`) |

## Memory Versions

Immutable per-mutation snapshots (`memver_...`) - the audit and rollback surface. `operation` in `created` / `modified` / `deleted`.

| Method   | Path                                                                          | Operation             | Description                              |
| -------- | ----------------------------------------------------------------------------- | --------------------- | ---------------------------------------- |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memory_versions`                         | ListMemoryVersions    | Newest-first; filter by `memory_id`, `operation`, `session_id`, `api_key_id`, `created_at_{gte,lte}` |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memory_versions/{version_id}`            | GetMemoryVersion      | List fields + full `content`             |
| `POST`   | `/v1/memory_stores/{memory_store_id}/memory_versions/{version_id}/redact`     | RedactMemoryVersion   | Clear `content`/`content_sha256`/`content_size_bytes`/`path`; preserve actor + timestamps |

## Files

| Method   | Path                                             | Operation        | Description                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `POST`   | `/v1/files`                            | UploadFile       | Upload a file                            |
| `GET`    | `/v1/files`                            | ListFiles        | List files                               |
| `GET`    | `/v1/files/{file_id}`                  | GetFile          | Get file metadata (SDK method: `retrieve_metadata`) |
| `GET`    | `/v1/files/{file_id}/content`          | DownloadFile     | Download file content                    |
| `DELETE` | `/v1/files/{file_id}`                  | DeleteFile       | Delete a file                            |

## Skills

| Method   | Path                                                            | Operation          | Description                  |
| -------- | --------------------------------------------------------------- | ------------------ | ---------------------------- |
| `POST`   | `/v1/skills`                                          | CreateSkill        | Create a skill               |
| `GET`    | `/v1/skills`                                          | ListSkills         | List skills                  |
| `GET`    | `/v1/skills/{skill_id}`                               | GetSkill           | Get skill details            |
| `DELETE` | `/v1/skills/{skill_id}`                               | DeleteSkill        | Delete a skill               |
| `POST`   | `/v1/skills/{skill_id}/versions`                      | CreateVersion      | Create skill version         |
| `GET`    | `/v1/skills/{skill_id}/versions`                      | ListVersions       | List skill versions          |
| `GET`    | `/v1/skills/{skill_id}/versions/{version}`            | GetVersion         | Get skill version            |
| `DELETE` | `/v1/skills/{skill_id}/versions/{version}`            | DeleteVersion      | Delete skill version         |

---

## Request/Response Schema Quick Reference

### CreateAgent Request Body

**Always start here.** `model`, `system`, `tools`, `mcp_servers`, `skills` are top-level fields on this object - they do NOT go on the session.

```json
{
  "name": "string (required, 1-256 chars)",
  "model": "claude-opus-5-5 (required - bare string, or {id, speed?, effort?, inference_geo?} object)",
  "description": "string (optional, up to 2048 chars)",
  "system": "string (optional, up to 100,000 chars)",
  "tools": [
    {
      "type": "agent_toolset_20260401",
      "default_config": { "permission_policy": { "type": "auto" } },
      "configs": [
        { "name": "web_fetch", "enabled": false },
        { "name": "web_search", "enabled": false }
      ]
    }
  ],
  "skills": [
    { "type": "anthropic", "skill_id": "xlsx" },
    { "type": "custom", "skill_id": "skill_abc123", "version": "1" }
  ],
  "mcp_servers": [
    {
      "type": "url",
      "name": "github",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  ],
  "multiagent": {
    "type": "coordinator",
    "agents": [
      "agent_abc123",
      { "type": "agent", "id": "agent_def456", "version": 4 },
      { "type": "self" }
    ]
  },
  "metadata": {
    "key": "value (max 16 pairs, keys <=64 chars, values <=512 chars)"
  }
}
```

> Limits: `tools` max 128, `skills` max 20, `mcp_servers` max 20 (unique names). `multiagent.agents` 1-20 entries (string ID | `{type:"agent",id,version?}` | `{type:"self"}` | `{type:"advisor",model}`, at most one advisor) - see `shared/managed-agents-multiagent.md`. `multiagent` can instead be `{type:"multiagent_20261001", workflows?, subagents?, advisor?}`, each member `{type:"enabled"}` or `{type:"disabled"}`; enabled `workflows` and `subagents` each take optional `predefined_agents` (up to 20, same entry forms minus advisor) and `inline_agents` (`{type:"enabled"}` or `{type:"disabled"}`, default enabled; disabled with an empty list is a 400), enabled `advisor` requires `model`; `workflows` and `subagents` default to enabled, `advisor` to disabled (§ Dynamic workflows).

### CreateSession Request Body

```json
{
  "agent": "agent_abc123 (required - string shorthand for latest version, or {type: \"agent\", id, version} object)",
  "environment_id": "env_abc123 (required)",
  "title": "string (optional)",
  "resources": [
    {
      "type": "github_repository",
      "url": "https://github.com/owner/repo (required)",
      "authorization_token": "ghp_... (required)",
      "mount_path": "/workspace/repo (optional - defaults to /workspace/<repo-name>)",
      "checkout": { "type": "branch", "name": "main" }
    }
  ],
  "initial_events": [
    { "type": "user.message", "content": [{ "type": "text", "text": "Review the auth module." }] }
  ],
  "vault_ids": ["vlt_abc123 (optional - vault credentials: MCP auth + environment variables)"],
  "budget": {
    "type": "limit",
    "max_list_cost": { "amount": "2500", "currency": "USD" }
  },
  "metadata": {
    "key": "value"
  }
}
```

> The `agent` field accepts a string ID, `{type: "agent", id, version}`, or `{type: "agent_with_overrides", id, version?, ...}` for session-local overrides of `model`/`system`/`tools`/`mcp_servers`/`skills`. Outside the overrides form, those fields live on the agent, not here. An `effort` inside a `model` override is applied (the agent's own `effort` isn't carried over, and a `model` override without `effort` runs at that model's default effort level). An `inference_geo` inside a `model` override **is** applied (omitting it clears the agent's pin for this session).
>
> **`budget`** (optional, create-only) is a hard dollar cap on the session's list-priced spend; `amount` is an integer string in minor units (cents - `"2500"` = $25.00), `USD` only. It can be changed or removed later via session update, never added. See `shared/managed-agents-core.md` -> Session budgets.
>
> **`initial_events`** (optional, max 50) sends events at creation and starts the agent loop in the same call. Only `user.message` and `user.define_outcome` are accepted - no `system.message`, and none of the tool-result kinds. Validation is all-or-nothing. See `shared/managed-agents-core.md` -> Seeding a session with `initial_events`.
>
> **`checkout`** accepts `{type: "branch", name: "..."}` or `{type: "commit", sha: "..."}`. Omit for the repo's default branch.

### CreateEnvironment Request Body

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "config": {
    "type": "cloud | self_hosted",
    "networking": {
      "type": "unrestricted | limited (union - see SDK types)"
    },
    "packages": { }
  },
  "metadata": { "key": "value" }
}
```

### CreateDeployment Request Body

```json
{
  "name": "Weekly compliance scan",
  "agent": "agent_abc123 (required - same shapes as CreateSession)",
  "environment_id": "env_abc123 (required)",
  "initial_events": [
    { "type": "user.message", "content": [{ "type": "text", "text": "Run the weekly compliance scan." }] }
  ],
  "schedule": {
    "type": "cron",
    "expression": "0 20 * * 5",
    "timezone": "America/New_York"
  }
}
```

> Optional session config (`resources`, `vault_ids`, etc.) is supported the same way as on CreateSession, including `budget` - copied onto each fired session; unlike a session's, it can be added where none exists and re-added after clearing (see `shared/managed-agents-scheduled-deployments.md` § Deployment budgets). Response includes `status`, `paused_reason`, and `schedule.upcoming_runs_at` (next fire times). See `shared/managed-agents-scheduled-deployments.md`.

### SendEvents Request Body

```json
{
  "events": [
    {
      "type": "user.message",
      "content": [
        {
          "type": "text",
          "text": "Hello"
        }
      ]
    }
  ]
}
```

> `system.message` events (append system-level context for this turn and later ones) use the same envelope with `type: "system.message"` - supported on Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, Claude Mythos 5, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Sonnet 5.5, and Claude Haiku 5.5 (not Claude Sonnet 5), checked against the agent's *primary* model only; see `shared/managed-agents-events.md` § Adding system context mid-session.

### Define Outcome Event

```json
{
  "type": "user.define_outcome",
  "description": "Build a DCF model for Costco in .xlsx",
  "rubric": { "type": "file", "file_id": "file_01..." },
  "max_iterations": 5
}
```

> `rubric` is required: `{type: "text", content}` or `{type: "file", file_id}`. `max_iterations` default 3, max 20. Echoed back with `outcome_id` + `processed_at`. See `shared/managed-agents-outcomes.md`.

### Tool Result Event

```json
{
  "type": "user.custom_tool_result",
  "custom_tool_use_id": "sevt_abc123",
  "content": [{ "type": "text", "text": "Result data" }],
  "is_error": false
}
```

---

## Error Handling

Managed Agents endpoints use the standard Anthropic API error format. Errors are returned with an HTTP status code and a JSON body containing `type`, `error`, and `request_id`:

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Description of what went wrong"
  },
  "request_id": "req_011CRv1W3XQ8XpFikNYG7RnE"
}
```

Include the `request_id` when reporting issues to Anthropic - it lets us trace the request end-to-end. The inner `error.type` is one of the following:

| Status | Error type | Description |
|---|---|---|
| 400 | `invalid_request_error` | The request was malformed or missing required parameters |
| 401 | `authentication_error` | Invalid or missing API key |
| 403 | `permission_error` | The API key doesn't have permission for this operation |
| 404 | `not_found_error` | The requested resource doesn't exist |
| 409 | `invalid_request_error` | The request conflicts with the resource's current state (e.g., sending to an archived session) |
| 413 | `request_too_large` | The request body exceeds the maximum allowed size |
| 429 | `rate_limit_error` | Too many requests - check rate limit headers for retry timing |
| 500 | `api_error` | An internal server error occurred |
| 529 | `overloaded_error` | The service is temporarily overloaded - retry with backoff |

Note that `409 Conflict` carries `error.type: "invalid_request_error"` (there is no separate `conflict_error` type); inspect both the HTTP status and the `message` to distinguish conflicts from other invalid requests.

---

## Pagination

Most Managed Agents list endpoints use the `page` / `next_page` cursor scheme:

| Field | Where | Notes |
|---|---|---|
| `limit` | query | Max items per page |
| `page` | query | Opaque cursor from a previous response - pass a `next_page` or `prev_page` value here |
| `order` | query | `asc` / `desc` on endpoints that support sorting. A cursor encodes the `order` of the request that produced it - reusing it with a different `order` returns 400. Other params (filters, `limit`) can change between paginated requests. |
| `next_page` | response | Cursor for the next page; `null` when there are no more results |
| `prev_page` | response | Cursor for the previous page on endpoints that support backward pagination - currently **only `GET /v1/sessions`**. `null` on the first page. On endpoints that don't support it, the field is **absent** (not `null`). |

Every SDK exposes an auto-paginating iterator that follows `next_page`. In Python and TypeScript, iterate the list result directly; the other SDKs expose the iterator via a separate method (iterating the plain list result returns one page). SDK auto-pagination is **forward-only** - to go back a page, read `prev_page` from the response and pass it back as the `page` parameter yourself.

> Warning: Some endpoints use a **different** cursor scheme: Message Batches, Files, Models, and several Admin API endpoints take `after_id`/`before_id` and return `has_more`/`first_id`/`last_id` instead of `page`/`next_page`. Some `page`-scheme endpoints (e.g. `GET /v1/skills`) also return a `has_more` boolean alongside `next_page`. Check the endpoint's reference page for its exact pagination fields.

---

## Rate Limits

Managed Agents endpoints have per-organization request-per-minute (RPM) limits, separate from your [Messages API token limits](https://platform.claude.com/docs/en/api/rate-limits). Model inference inside a session still draws from your organization's standard ITPM/OTPM limits.

| Endpoint group | Scope | RPM | Max concurrent |
|---|---|---|---|
| Create operations (Agents, Sessions, Vaults) | organization | 300 | - |
| All other operations (Agents, Sessions, Vaults) | organization | 600 | - |
| All operations (Environments) | organization | 60 | 5 |

Files and Skills endpoints use the standard tier-based [rate limits](https://platform.claude.com/docs/en/api/rate-limits).

When a limit is exceeded the API returns `429` with a `rate_limit_error` (see [Error Handling](#error-handling) for the response envelope) and a `retry-after` header indicating how many seconds to wait before retrying. The Anthropic SDK reads this header and retries automatically.
