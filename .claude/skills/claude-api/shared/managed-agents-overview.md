# Managed Agents - Overview

Managed Agents provisions a container per session as the agent's workspace. The agent loop runs on Anthropic's orchestration layer; the container is where the agent's *tools* execute - bash commands, file operations, code. You create a persisted **Agent** config (model, system prompt, tools, MCP servers, skills), then start **Sessions** that reference it. The session streams events back to you; you send user messages and tool results in.

## Warning: THE MANDATORY FLOW: Agent (once) -> Session (every run)

**Why agents are separate objects: versioning.** An agent is a persisted, versioned config - every update creates a new immutable version, and sessions pin to a version at creation time. This lets you iterate on the agent (tweak the prompt, add a tool) without breaking sessions already running, roll back if a change regresses, and A/B test versions side-by-side. None of that works if you `agents.create()` fresh on every run.

Every session references a pre-created `/v1/agents` object. Create the agent once, store the ID, and reuse it across runs.

| Step | Call | Frequency |
|---|---|---|
| 1 | `POST /v1/agents` - `model`, `system`, `tools`, `mcp_servers`, `skills` live here | **ONCE.** Store `agent.id` **and** `agent.version`. |
| 2 | `POST /v1/sessions` - `agent: "agent_abc123"` or `{type: "agent", id, version}` | **Every run.** String shorthand uses latest version. |

If you're about to write `sessions.create()` with `model`, `system`, or `tools` on the session body - **stop**. Those fields live on `agents.create()`. The session takes a *pointer* only.

**When generating code, separate setup from runtime.** `agents.create()` belongs in a setup script (or a guarded `if agent_id is None:` block), not at the top of the hot path. If the user's code calls `agents.create()` on every invocation, they're accumulating orphaned agents and paying the create latency for nothing. The correct shape is: define the agent as a version-controlled file and sync it with `ant apply`, which records the ID in `claude-lock.json` (see `shared/anthropic-cli.md`) - or use a guarded setup script that persists the returned ID (config file, env var, secrets manager) - and have every run load the ID and call `sessions.create()`.

**To change the agent's behavior, use `POST /v1/agents/{id}` - don't create a new one.** (For an agent managed with `ant apply`, edit its file and re-run instead - an update made outside the files makes the next `ant apply` refuse to run.) Each update bumps the version; running sessions keep their pinned version, new sessions get the latest (or pin explicitly via `{type: "agent", id, version}`). See `shared/managed-agents-core.md` -> Agents -> Versioning. To change `tools`/`mcp_servers` on **one running session** without touching the agent object, use `sessions.update()` (`vault_ids` attaches at session create only) - see `shared/managed-agents-core.md` -> Updating the agent configuration mid-session.

## Beta Headers

Managed Agents is in beta. The SDK sets required beta headers automatically:

| Beta Header                    | What it enables                                      |
| ------------------------------ | ---------------------------------------------------- |
| `managed-agents-2026-04-01`    | Agents, Environments, Sessions, Events, Session Resources, Session Threads, Outcomes, Multiagent, Vaults, Credentials, Deployments |
| `agent-memory-2026-07-22`      | Memory Stores (replaces `managed-agents-2026-04-01` on memory store endpoints) |

**Which beta header goes where:** The SDK sets `managed-agents-2026-04-01` automatically on `client.beta.{agents,environments,sessions,vaults,deployments,deployment_runs}.*` calls and `agent-memory-2026-07-22` on `client.beta.memory_stores.*` calls. Don't add `managed-agents-2026-04-01` to a memory store call: sending both headers on a memory store request returns a 400 (attaching a memory store to a session is a session call and still uses `managed-agents-2026-04-01`). The Files and Skills APIs are out of beta and need no beta header; requests that still send `files-api-2025-04-14` or `skills-2025-10-02` keep working but get the old beta response shapes. **Exception - session-scoped file listing:** filtering `files.list` by `scope_id` requires `managed-agents-2026-04-01`, which `client.beta.files` does not add, so pass `betas: ["managed-agents-2026-04-01"]` explicitly on `client.beta.files.list({scope_id: session.id})` (on raw HTTP, send `anthropic-beta: managed-agents-2026-04-01`; in the `ant` CLI, add `--beta managed-agents-2026-04-01` to `ant beta:files list --scope-id`). See `shared/managed-agents-environments.md` -> Session outputs.


## Reading Guide

| User wants to...                       | Read these files                                        |
| -------------------------------------- | ------------------------------------------------------- |
| **Get started from scratch / "help me set up an agent"** | `shared/managed-agents-onboarding.md` - guided interview (WHERE->WHO->WHAT->WATCH), then emit code |
| **Build one of the Console's quickstart templates by name** | `shared/managed-agents-onboarding-from-quickstart.md` - one template per file in `shared/managed-agents-quickstarts/` |
| **Set up the agent a page describes / "build what this URL shows"** | `shared/managed-agents-onboarding-from-url.md` - fetch the page, write `agents/<agent-name>/` files, `ant apply` |
| Understand how the API works           | `shared/managed-agents-core.md`                         |
| See the full endpoint reference        | `shared/managed-agents-api-reference.md`                |
| **Create an agent** (required first step) | `shared/managed-agents-core.md` (Agents section) + language file |
| Update/version an agent                | `shared/managed-agents-core.md` (Agents -> Versioning) - update, don't re-create |
| Create a session                       | `shared/managed-agents-core.md` + `{lang}/managed-agents/README.md` (cURL/C#: `curl/managed-agents.md`) |
| Configure tools and permissions        | `shared/managed-agents-tools.md`                        |
| Turn `web_search` / `web_fetch` on or off; restrict which sites they can reach; localize search; cap fetched content | `shared/managed-agents-tools.md` (§ Agent Toolset, § Web search & web fetch settings) - `enabled` / `allowed_domains` / `blocked_domains` / `user_location` / `max_content_tokens` on the toolset `configs` entry; with `limited` networking the environment's `allowed_hosts` also applies to them (`shared/managed-agents-environments.md`) |
| Set up MCP servers                     | `shared/managed-agents-tools.md` (MCP Servers section)  |
| Stream events / handle tool_use        | `shared/managed-agents-events.md` + language file       |
| Get notified of session state changes via webhook (no polling) | `shared/managed-agents-webhooks.md` - Console-registered endpoint, HMAC verify, thin payload + fetch |
| Define an outcome / rubric-graded iterate loop | `shared/managed-agents-outcomes.md` - `user.define_outcome` event, grader, `span.outcome_evaluation_*` events |
| Coordinate multiple agents / subagents / threads | `shared/managed-agents-multiagent.md` - `multiagent: {type: "coordinator", agents: [...]}` on the agent, session threads, cross-posted tool confirmations |
| Set up environments                    | `shared/managed-agents-environments.md` + language file |
| Run tool execution in your own infra / VPC (self-hosted sandbox) | `shared/managed-agents-self-hosted-sandboxes.md` - `config:{type:"self_hosted"}`, `ANTHROPIC_ENVIRONMENT_KEY`, `EnvironmentWorker.run()` / `ant beta:worker poll` |
| Upload files / attach repos            | `shared/managed-agents-environments.md` (Resources)     |
| Give agents persistent memory across sessions | `shared/managed-agents-memory.md` - memory stores, `memory_store` session resource, preconditions, versions/redact. On self-hosted sandboxes: `shared/managed-agents-self-hosted-sandboxes.md` § Memory stores (SDK worker syncs a local copy) |
| Inspect a session without code (transcript, per-tool stats, cost, threads) | `shared/managed-agents-events.md` - Console session viewer note; deep link `?event={event_id}` |
| Keep agents/environments/skills as version-controlled files (`ant apply`); drive the API from the shell | `shared/anthropic-cli.md` - `ant apply`, `claude-lock.json`, `--transform`, `@file` inlining |
| Store credentials (MCP auth, API keys for CLIs/SDKs) | `shared/managed-agents-tools.md` (Vaults section) - `mcp_oauth` / `static_bearer` / `environment_variable` |
| Call a non-MCP API / CLI that needs a secret | `shared/managed-agents-tools.md` (Vaults section) - `environment_variable` credential, substituted at egress. If that doesn't fit (e.g. self-hosted sandboxes), `shared/managed-agents-client-patterns.md` Pattern 9 keeps the secret host-side via a custom tool |
| Run an agent on a recurring cron schedule | `shared/managed-agents-scheduled-deployments.md` - deployments, deployment runs, pause/auto-pause |
| Cap a session's spend with a hard dollar budget | `shared/managed-agents-core.md` (§ Session budgets) - `budget` at session create, `budget_reached` pause, change/remove to resume. Deployments: `shared/managed-agents-scheduled-deployments.md` § Deployment budgets |
| Pin where model inference runs (data residency) | `shared/managed-agents-core.md` (§ Pinning inference geography) - `model.inference_geo` on the agent, per-session override, roster uniformity |
| Load skills from the codebase instead of uploading | `shared/managed-agents-tools.md` (§ Skills from a GitHub repository) - root `.claude/skills` discovery at session start |
| Let the agent run work too big to hand out one task at a time (hundreds of documents, many sources) as a background workflow run | `shared/managed-agents-multiagent.md` (§ Dynamic workflows) - `multiagent: {type: "multiagent_20261001", workflows: {type: "enabled"}}` (can combine with a roster), the system-prompt line that says when to start a run, `workflow_run.*` events, knowing when the work is done, interrupting with runs open |
| Make a workflow run cheaper, faster or better | `shared/managed-agents-multiagent.md` (§ Dynamic workflows -> Reading the plan the agent wrote) - read the plan the agent wrote before you propose a change |
| Give the session an advisor to consult mid-turn | `shared/managed-agents-multiagent.md` (§ Advisor) - `{type: "advisor", model}` roster entry, consultation threads, plaintext vs redacted delivery |

## Common Pitfalls

- **Agent FIRST, then session - NO EXCEPTIONS** - the session's `agent` field accepts **only** a string ID or `{type: "agent", id, version}`. `model`, `system`, `tools`, `mcp_servers`, `skills` are **top-level fields on `POST /v1/agents`**, never on `sessions.create()`. If the user hasn't created an agent, that is step zero of every example.
- **Agent ONCE, not every run** - `agents.create()` is a setup step. Store the returned `agent_id` and reuse it; don't call `agents.create()` at the top of your hot path. If the agent's config needs to change, `POST /v1/agents/{id}` - each update creates a new version, and sessions can pin to a specific version for reproducibility.
- **MCP auth goes through vaults** - the agent's `mcp_servers` array declares `{type, name, url}` only (no auth). Credentials live in vaults (`client.beta.vaults.credentials.create`) and attach to sessions via `vault_ids`. Anthropic auto-refreshes OAuth tokens using the stored refresh token. Vaults also hold `environment_variable` credentials for non-MCP services (CLIs, SDKs, direct API calls) - substituted at egress, never visible in the sandbox.
- **Reconcile resources before the first run** - a session with a clear ask but a missing tool, credential, data mount, or context will discover the gap mid-run, then flail and give up. Before creating the session, check that every action in the task maps to a configured tool/MCP server, every MCP server has a vault credential, and every referenced file/host is mounted/reachable. When helping a user set one up, run the reconciliation in `shared/managed-agents-onboarding.md` -> §4 silent viability gate.
- **Stream to get events** - `GET /v1/sessions/{id}/events/stream` is the primary way to receive agent output in real-time.
- **SSE stream has no replay - reconnect with consolidation** - if the stream drops while a `agent.tool_use`, `agent.mcp_tool_use`, or `agent.custom_tool_use` is pending resolution (`user.tool_confirmation` for the first two, `user.custom_tool_result` for the last one), the session deadlocks (client disconnects -> session idles -> reconnect happens -> no client resolution happens). On every (re)connect: open stream with `GET /v1/sessions/{id}/events/stream` , fetch `GET /v1/sessions/{id}/events`, dedupe by event ID, then proceed. See `shared/managed-agents-events.md` -> Reconnecting after a dropped stream.
- **Don't trust HTTP-library timeouts as wall-clock caps** - `requests` `timeout=(c, r)` and `httpx.Timeout(n)` are *per-chunk* read timeouts; they reset every byte, so a trickling connection can block indefinitely. For a hard deadline on raw-HTTP polling, track `time.monotonic()` at the loop level and bail explicitly. Prefer the SDK's `sessions.events.stream()` / `sessions.events.list()` over hand-rolled HTTP. See `shared/managed-agents-events.md` -> Receiving Events.
- **Messages queue** - you can send events while the session is `running` or `idle`; they're processed in order. No need to wait for a response before sending the next message. Two exceptions accept only settle events: a session waiting on you (`stop_reason: requires_action`), where a `user.message` is a 400, and one paused at its budget (`budget_reached`) - change or remove the budget to resume (`shared/managed-agents-core.md` § Session budgets).
- **Environment `config.type` is `"cloud"` or `"self_hosted"`** - `cloud` runs the container on Anthropic's infrastructure; `self_hosted` moves tool execution to your own (see `shared/managed-agents-self-hosted-sandboxes.md`).
- **Archive is permanent on every resource** - archiving an agent, environment, session, vault, credential, or memory store makes it read-only with no unarchive. For agents, environments, and memory stores specifically, archived resources cannot be referenced by new sessions (existing sessions continue). Do not call `.archive()` on a production agent, environment, or memory store as cleanup - **always confirm with the user before archiving**.
