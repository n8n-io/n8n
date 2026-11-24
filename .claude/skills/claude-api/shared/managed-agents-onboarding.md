# Managed Agents - Onboarding Flow

> **Invoked via `/claude-api managed-agents-onboard`?** You're in the right place. Run the interview below - don't summarize it back to the user, ask the questions. **If a URL follows the subcommand** (`/claude-api managed-agents-onboard https://...`), the page it names replaces the interview: read `shared/managed-agents-onboarding-from-url.md` and follow that instead. **If a quickstart name follows** (`/claude-api managed-agents-onboard deep-researcher`; the names are the file stems in `shared/managed-agents-quickstarts/`), read `shared/managed-agents-onboarding-from-quickstart.md`. And once the user has described the job: if one of those templates fits, offer it once before going on.

Claude Managed Agents is a hosted agent: Anthropic runs the agent loop and provisions a sandboxed container per session where the agent's tools execute (or your own worker, with a `self_hosted` environment - see `shared/managed-agents-self-hosted-sandboxes.md`). You supply an **agent config** (tools, skills, model, system prompt - reusable, versioned) and an **environment config** (the sandbox - reusable across agents). Each run is a **session**.

The flow is four beats - **describe -> agent -> environment -> session** - the same arc as the Console quickstart, and the same philosophy: **value before credentials**. The user goes from idea to a runnable session before any auth ask; each credential is *flagged* at the moment the design makes it relevant (§2) and *collected* once, at session setup (§4), where it binds (`sessions.create()`) and gets exercised (smoke-test). Read `shared/managed-agents-core.md` alongside this - it has full detail for each knob; this doc is the interview script.

---

## 1. Describe the task

**Open with a one-breath signpost and a single open prompt - don't guess, don't questionnaire.** In your own words:

> Managed Agents is hosted - Anthropic runs the agent loop, the sandbox, and the infrastructure; you just define the agent. We'll do this in three moves: the agent, the environment it runs in, then a live test session. So: describe the agent you want - what should it do, and what kicks it off (a person, an event, a schedule)?

Let them answer in full before configuring anything.

## 2. Configure the agent - propose, don't interrogate

Their description does the interview's work. Draft the agent config from it and **present it as a proposal with your suggestions inline** - the user reacts to a concrete config instead of answering a question list. At most one batched follow-up for true gaps. Suggest where the description gives you an opening:

- **Tools** - enable the prebuilt toolset (`agent_toolset_20260401`: `bash`, `read`, `write`, `edit`, `glob`, `grep`, `web_fetch`, `web_search`) with both web tools off: `configs: [{name: web_fetch, enabled: false}, {name: web_search, enabled: false}]`. Always list both explicitly rather than relying on the API default: a bare `{type: agent_toolset_20260401}` enables all eight, and of the environment's `networking` choices (§3) only `limited` restricts the web tools, to the hosts in `allowed_hosts`. Set a web tool to `enabled: true` only when the description names something that needs it (`web_search` to find pages, `web_fetch` to read a URL); an open-ended or general-purpose job is not a reason - leave both off and tell the user how to switch them on. When you do enable one, say so in the proposal, and when the sites are known in advance, add them to the tool's `allowed_domains` (`shared/managed-agents-tools.md` § Web search & web fetch settings) and, under `limited` networking, to the environment's `allowed_hosts` (§3), which also opens them to the sandbox. Set the toolset's `default_config` to `permission_policy: {type: auto}`: the server runs the calls it judges safe, denies high-risk ones, and pauses a call it cannot judge. Put `always_ask` on any tool a person must review first, and leave `mcp_toolset` at its default (`always_ask`). **Suggest MCP servers** for any third-party service the job names (GitHub, Linear, Slack, ...) - and flag the credential each one implies as you suggest it ("Linear MCP -> you'll need a Linear API token at kickoff"), so §4's auth step is a formality, not a surprise. Collection itself waits for §4. Custom tools only if the user's own app must answer calls (name, description, input schema - their handler code is theirs; don't generate it).
- **Skills** - **suggest** prebuilt `xlsx`/`docx`/`pptx`/`pdf` when the job produces those artifacts; custom by `skill_id` (max 20 total per agent, prebuilt + custom combined).
- **Outcome - the default kickoff when the job is one deliverable.** If the job produces one checkable thing (an artifact, a report, a PR, a dataset), draft a starter rubric from the description - explicit, independently gradeable criteria: not "a good report" but "a CSV with a numeric `price` column per SKU" - and propose it inline with the config; the harness grades and iterates against it (`shared/managed-agents-outcomes.md`). The user not having a rubric is not a reason to skip this - drafting one is your job; mark it as a starter to tune. Use a conversational kickoff when the job is interactive (a chat surface, human-in-the-loop steering) or answers a stream of questions or requests - no outcome per answer.
- **On-hand resources** - repos on disk (`github_repository`: URL, optional `mount_path`/`checkout`; token comes in §4), files to seed (Files API upload -> `{type: "file", file_id, mount_path}`; read-only), if the job references them.
- **Model** - default `claude-opus-5-5`; `claude-fable-5-1` for the hardest long-horizon work (`shared/model-migration.md` -> Migrating to Claude Fable 5.1).
- **Dynamic workflows - only for big, parallel jobs.** If the job is too big to hand out one task at a time (reviewing hundreds of documents, cross-checking many sources, repeating the same step across many items), add dynamic workflows to the config you propose: `multiagent: {type: "multiagent_20261001", workflows: {type: "enabled"}}` and the line in the system prompt saying which kinds of tasks call for a workflow run (`shared/managed-agents-multiagent.md` § Dynamic workflows). Say that they are on, what they do for this job, and that every agent in a run uses tokens, so the session needs a budget. Leave them off for simple jobs, and when the user has said they do not want them.

> Important: **PR creation needs the GitHub MCP server too** - a `github_repository` mount is filesystem-only. Edit in the mount -> push branch via `bash` -> open the PR via the MCP `create_pull_request` tool.

Full detail per knob: `shared/managed-agents-tools.md` (toolset, MCP, custom tools, skills), `shared/managed-agents-environments.md` (repos, files).

## 3. Environment

Usually zero or one question:

- **Reuse or create?** Environments are shared across agents - check for an existing one first.
- **Networking** - always set it explicitly rather than relying on the API default. Prefer `limited` and allow only what the job needs: `allow_package_managers: true` if it installs packages, and `allow_mcp_servers: true` (or every MCP server domain in `allowed_hosts`) if the agent declares MCP servers - otherwise session creation fails with a 400 naming the blocked hosts. Use `unrestricted` only when the agent must reach hosts you can't list in advance.
- **Suggest `self_hosted`** when the signals are there: tools must run on their own infra, secrets can't leave it, or they need binaries/data the cloud container won't have (`shared/managed-agents-self-hosted-sandboxes.md`; on Claude Platform on AWS the worker authenticates with IAM instead of an environment key and sessions there can't attach memory stores). Otherwise `cloud` - don't raise it unprompted for simple jobs.

## 4. Session - auth, then test run

**Auth happens here - collect the credentials flagged in §2, now that the config is settled:** a vault (existing or `vaults.create()`) + `vaults.credentials.create()` for each MCP server declared in §2, `environment_variable` credentials for API keys the job uses (substituted at egress; the sandbox sees a placeholder), and the `authorization_token` for each repo mount. Credentials are write-only; MCP credentials match servers by URL and auto-refresh. See `shared/managed-agents-tools.md` -> Vaults.

**Silent viability gate - run this yourself before emitting anything; surface only the gaps.** Walk the job clause by clause: every verb maps to an enabled tool or MCP server ("open a PR" -> GitHub MCP, not just the mount; "look it up online" -> `web_search` / `web_fetch` set to `enabled: true`); every MCP server and repo mount has its credential from the auth step; every external host is reachable under the networking choice; every file/repo/dataset the job references is mounted; "done" is checkable. If something's missing, say so and resolve it - don't emit a config you already know is under-resourced.

**Kickoff - pick one, never both. Outcome is the default:**
- `user.define_outcome` + rubric - the default when the job is one deliverable (§2 drafts the rubric); the harness iterates and grades until the rubric passes.
- `user.message` - for conversational sessions, agents that answer a stream of questions or requests, and runs that change records in outside systems (tickets) rather than producing an artifact.
- **Scheduled shape?** Skip per-session kickoff entirely - create a **deployment** (`deployments.create()` with `schedule` + `initial_events`); each firing creates the session autonomously. See `shared/managed-agents-scheduled-deployments.md`.

Mechanics to bake into the runtime code: session creation resolves resources (a bad mount surfaces there, before tokens) but does not itself provision the sandbox; open the event stream *before* sending the kickoff; break on `session.status_terminated`, or `session.status_idle` with any non-`requires_action` `stop_reason` - terminal, or `budget_reached`, which is not terminal (only a budget change/removal resumes it) (`shared/managed-agents-client-patterns.md` Pattern 5); answer every `agent.tool_use` / `agent.mcp_tool_use` whose `evaluated_permission` is `ask` with `user.tool_confirmation` (Pattern 4) - a paused call waits indefinitely and blocks new messages; usage lands on `span.model_request_end`; artifacts land in `/mnt/session/outputs/` (`files.list({scope_id: session.id, ...})`).

## 5. Integrate - emit the code

Go straight from the last answer to the code - no preamble, no lecture about setup-vs-runtime; the two-block structure shows it. Generate **two clearly-separated blocks**:

**Block 1 - Setup (files + `ant apply`; the IDs land in `claude-lock.json`).** Agents and environments are version-controlled definitions - write them as files and sync them with `ant apply` (`shared/anthropic-cli.md` -> Version-controlled Managed Agents resources):

1. `agents/<name>.md` - YAML frontmatter (`name`, `model`, `tools`, `mcp_servers`, `skills`) with the system prompt as the Markdown body - and `environments/<name>.yaml`. Reusing an existing environment (§3)? Write no environment file (it would create a second one), leave it out of the commands below, and use the existing `env_...` ID wherever an environment is named (Block 2, a deployment file's `environment_id`).
2. ```sh
   ant apply --dry-run -v agents/<name>.md environments/<name>.yaml   # prints the full plan, every field; changes nothing
   ant apply agents/<name>.md environments/<name>.yaml                # asks, then creates; run it again after any edit to update
   ```
   Name the files you just wrote - never `.` or a directory, which is walked and also creates whatever else in the repo looks like a resource (a Claude Code plugin's `agents/*.md` and `skills/*/SKILL.md`, files the user never read). Without a terminal (a coding agent's shell) the second command prints the plan and exits; it applies only with `--yes`, which is the user's approval, not yours: show them the dry-run plan and add it only once they say go ahead. If the plan would create or change anything you did not write, or a file you did not write sits at a path you need, stop and ask; never add `--force` or `--prune` on your own.
3. Keep `claude-lock.json` beside the files (commit both if this is a repo) - it holds the IDs, and without it the next `ant apply` creates duplicates. Copy the IDs Block 2 needs (agent, environment; scheduled shape: the deployment) into the app's own config or env vars once - `resources["./agents/<name>.md"].id` and so on, keyed by the path the plan printed - so the running app does not depend on the lockfile.

If `ant` is missing or older than 1.30.0 (`ant --version`) - and the user is not on Claude Platform on AWS (below) - say so and offer to install or upgrade it (`shared/anthropic-cli.md` -> Install and auth). Ask before running an installer, and do not silently fall back to the SDK; use the SDK fallback below only if the user declines or it cannot be installed.

SDK fallback if the user asks - and **required on Claude Platform on AWS**, where auth is SigV4 and the `ant` CLI has no SigV4 mode (use the platform client from `shared/claude-platform-on-aws.md`): label it `# ONE-TIME SETUP - run once, save the IDs` and call `environments.create()` -> `agents.create()`.

> Warning: **Deployments are newer than the rest of the MA surface.** Before emitting `ant beta:deployments ...` or `client.beta.deployments` / `client.beta.deployment_runs` calls, verify the user's installed CLI/SDK exposes them (`ant beta:deployments --help`; `hasattr(client.beta, "deployments")`). If not, emit raw HTTP against `POST /v1/deployments` with the `managed-agents-2026-04-01` beta header (plus `oauth-2025-04-20` when authenticating with a Bearer token from `ant auth print-credentials`), and leave an upgrade note marking what simplifies to SDK calls.

**Scheduled shape? The deployment is setup, not runtime.** Create it in Block 1. With `ant apply`: write `deployments/<name>.md` and add it to the same `ant apply` command. It names the agent and environment by path (a reused environment by its `env_...` ID); the frontmatter is `schedule` plus the rest of the create body, and the Markdown body becomes a `user.message` kickoff (for an Outcome kickoff put `initial_events` in the frontmatter and leave the body empty, not both). With the SDK: `deployments.create()` with `schedule` + `initial_events` after the agent/environment IDs exist. Block 2 is then **not** a session loop - there is no per-run kickoff to send. Emit instead: a manual-run trigger (`POST /v1/deployments/{id}/run`) so the user can test now rather than wait for the first firing - the manual run doubles as the smoke test - plus a fetch helper (latest `deployment_runs` entry -> `session_id` -> Console URL + `files.list(scope_id=session_id)` for the artifacts). Nobody streams a scheduled session, so a paused call (`evaluated_permission: ask`) would wait indefinitely: also emit a `session.status_idled` webhook handler (`shared/managed-agents-webhooks.md`; the user registers its URL in Console) that lists the session's events and answers each paused call with `user.tool_confirmation` - deny unless the user gives a rule.

**Block 2 - Runtime (every invocation; conversational and Outcome shapes).** SDK code in the detected language (Python/TS/cURL - SKILL.md -> Language Detection); don't emit shell loops here:

1. Load `agent_id` + `env_id` from config/env (where Block 1 put them)
2. `sessions.create(agent=AGENT_ID, environment_id=ENV_ID, resources=[...], vault_ids=[...])`, then print the Console URL so the user can watch live: `https://platform.claude.com/workspaces/default/sessions/{session.id}` (swap `default` for their workspace slug)
3. **Smoke-test when the job depends on MCP servers, credentials, or locked-down hosts** - `sessions.create()` returns a 400 when `limited` networking blocks one of the agent's MCP server hosts, but a wrong credential, or a blocked host the agent only reaches from the sandbox at run time, does not show up there, only on first use. One cheap probe turn ("Confirm you can reach <service> and list 1-2 items; don't start the task"), verify, then send the real kickoff. Skip when there are no external dependencies.
4. Open stream -> send the §4 kickoff -> loop with the terminal gate from §4.

> Warning: **Never emit `agents.create()` and `sessions.create()` in the same unguarded block** - that teaches creating a new agent per run, the #1 anti-pattern. Single-script requests: wrap creation in `if not os.getenv("AGENT_ID"):`.

Pull exact syntax from `{lang}/managed-agents/README.md` for your detected language (cURL and C#: use `curl/managed-agents.md` as the wire-level reference). Don't invent field names.
