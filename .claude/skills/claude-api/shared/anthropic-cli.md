# Anthropic CLI (`ant`)

The `ant` CLI exposes every Claude API resource as a shell subcommand. Compared to `curl`: request bodies are built from typed flags or piped YAML instead of hand-written JSON, `@path` inlines file contents into any string field, `--transform` extracts fields with a GJSON path (no `jq`), list endpoints auto-paginate (cap total results with `--max-items N`; `--limit` only sets the server page size), and the `beta:` prefix auto-sets the right `anthropic-beta` header.

## When to use the CLI vs the SDK

**CLI for the control plane, SDK for the data plane.** Agents and environments are relatively static resources you define, configure, and debug with `ant` - keep them as files in your repo, sync them with `ant apply` (by hand or from CI), inspect from a terminal. Sessions are dynamic and driven by your application through the SDK - create per task, stream events, react to tool calls, integrate into your product. Both hit the same API; the split is about where the call lives, not what's possible.

| | Control plane -> `ant` | Data plane -> SDK |
|---|---|---|
| Resources | agents, environments, skills, vaults, files | sessions, events |
| Cadence | Once per deploy / ad-hoc | Every task / every turn |
| Lives in | `agents/`, `environments/`, `claude-lock.json` in your repo + CI + terminal | Application code |
| Typical calls | `ant apply`, `list`, `retrieve`, `archive`, `--debug` | `sessions.create()`, `events.stream()`, `events.send()` |

## Install and auth

```sh
# macOS
brew install anthropics/tap/ant
xattr -d com.apple.quarantine "$(brew --prefix)/bin/ant"

# Linux / WSL - pick the release from github.com/anthropics/anthropic-cli/releases
curl -fsSL "https://github.com/anthropics/anthropic-cli/releases/download/v${VERSION}/ant_${VERSION}_$(uname -s | tr A-Z a-z)_$(uname -m | sed -e s/x86_64/amd64/ -e s/aarch64/arm64/).tar.gz" \
  | sudo tar -xz -C /usr/local/bin ant

# Or from source (Go 1.25+)
go install github.com/anthropics/anthropic-cli/cmd/ant@latest
```

**Auth** - the CLI resolves credentials the same way the SDKs do (first match wins): explicit flags, then `ANTHROPIC_API_KEY`, then `ANTHROPIC_AUTH_TOKEN`, then the `ANTHROPIC_PROFILE`-selected or active profile, then Workload Identity Federation env vars, then the default profile on disk. Override the host with `ANTHROPIC_BASE_URL` or `--base-url`.

- **API key**: set `ANTHROPIC_API_KEY` in the environment.
- **OAuth profile** (no static key to manage): `ant auth login` opens a browser, exchanges for a short-lived token, and stores a profile under `$ANTHROPIC_CONFIG_DIR` (default `~/.config/anthropic/` on Linux/macOS, `%APPDATA%\Anthropic` on Windows - `configs/<profile>.json` for settings, `credentials/<profile>.json` for tokens). Subsequent `ant` (and SDK) calls pick it up automatically - a bare `Anthropic()` client works after login, but scripts that read `ANTHROPIC_API_KEY` directly do not. Claude Code and the Claude Agent SDK honor the same profile resolution. `ant auth status` shows which credential source and profile won (it reports status only - don't script against its exit code as a health check); `ant auth logout` clears the active profile (`--all` for every profile). On a remote host without a browser, `ant auth login --no-browser` prints the authorize URL and accepts the code back in the terminal.
- **Non-interactive workloads** (CI, servers, containers): interactive login is for development on your own machine - use Workload Identity Federation instead (see the authentication docs via `shared/live-sources.md`).

> **The #1 auth trap:** profiles are only consulted when no API key is set. A stale exported `ANTHROPIC_API_KEY` silently overrides every profile - requests hit whatever org/workspace that key is scoped to. `ant auth status` shows which source won; unset the key (or per-command: `env -u ANTHROPIC_API_KEY ant ...`) before relying on a profile. Truly **unset** it - an empty `ANTHROPIC_API_KEY=""` still wins its precedence slot and authenticates with an empty key. The same shadowing applies in reverse to Claude Code: after `ant auth login`, Claude Code may warn about an auth conflict between the profile and its own `/login` credential - keep one (use the profile and `/logout` in Claude Code, or `ant auth logout` to keep Claude Code's own login).

**Named profiles** - an interactive-login token is bound to a single org+workspace, and the API only shows resources belonging to that workspace. If an agent, session, or file you created "disappears", the usual cause is a token scoped to a different workspace than the one that created it (`ant auth status` shows the active workspace). Multi-workspace work means one profile per workspace:

```sh
ant auth login --profile <name>                  # creates the profile if it doesn't exist; org/workspace picker in browser
ant auth login --profile <name> --workspace-id wrkspc_01...   # bind directly, skip the picker
ant profile activate <name>                      # switch the default profile
ant --profile <name> models list                 # one-off; equivalent: ANTHROPIC_PROFILE=<name> ant models list
ant profile list                                 # inspect
ant profile set workspace_id wrkspc_01... --profile <name>    # edit config keys (workspace_id, base_url, organization_id, ...)
```

`ant profile set` edits an existing profile's config - it never creates one, and it does **not** rebind already-issued credentials; run `ant auth login` again under that profile to mint a token for the new target. Pointing `ANTHROPIC_PROFILE` at a profile that doesn't exist is an error, not a fall-through. Refresh tokens eventually hard-expire (they don't slide with use) - when a previously working profile starts failing auth, re-run `ant auth login` before debugging anything else.

**Scopes** - a profile's OAuth scope set is requested at login (`--scope`) and persists on the profile (`scope` is also a `profile set` config key; like other config edits, changing it requires a fresh `ant auth login` to take effect). Privileged scopes - e.g. `org:admin` for organization-administration endpoints - are **not** in the default scope set: pass the full set you want explicitly (`ant auth login --profile admin --scope "... org:admin"`), and the server grants a privileged scope only if your role actually has it. Because the scope set rides on every token the profile mints, keep privileged work on a dedicated profile (`admin` vs `default`) and do day-to-day inference on the unprivileged one, switching with `--profile`/`ANTHROPIC_PROFILE`. Check `ant auth login --help` for the current scope list, and `ant auth status` to see what the active token carries.

To hand the active credential to a subprocess or raw-HTTP script:

```sh
# Bare access token - for curl's Authorization header
curl https://api.anthropic.com/v1/messages \
  -H "Authorization: Bearer $(ant auth print-credentials --access-token)" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: oauth-2025-04-20" \
  -H "content-type: application/json" \
  -d '{"model": "claude-opus-5-5", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello"}]}'

# .env format - sets ANTHROPIC_AUTH_TOKEN (and ANTHROPIC_BASE_URL if the profile has one).
# Output is bare KEY=value (no `export`), so use `set -a` to auto-export for child processes:
set -a; eval "$(ant auth print-credentials --env)"; set +a
python my_script.py   # SDK picks up ANTHROPIC_AUTH_TOKEN
```

OAuth tokens go on `Authorization: Bearer` (not `x-api-key:`) **plus the `anthropic-beta: oauth-2025-04-20` header** - converting a raw curl/httpx script from an API key is a header change, not a key swap. The beta header requirement is endpoint-dependent (some endpoints happen to work without it; `/v1/messages` does not) - always send it so requests don't break when you switch endpoints. The token is short-lived and not auto-refreshed when passed via env var, so re-run `print-credentials` before it expires for long-running scripts (`print-credentials` itself refreshes the token if needed). If both `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are set, the SDKs send both and the API rejects the request - unset `ANTHROPIC_API_KEY` before `eval`ing the `--env` output.

**Foot-gun:** `ant auth print-credentials` with **no flags** prints the entire credentials JSON, not the bare token - putting that in an `Authorization` header yields an empty response or HTTP/2 protocol error. Always use `--access-token` for headers (it always reads the named/active profile; a set `ANTHROPIC_API_KEY` doesn't override credential printing).

## Command structure

```
ant <resource>[:<subresource>] <action> [flags]
```

Beta resources (agents, sessions, environments, deployments, skills, vaults, memory stores) live under `beta:` - the CLI auto-sends the right `anthropic-beta` header, so don't pass it yourself unless overriding with `--beta <header>`. For self-hosted environments, `ant beta:worker poll/run` and `ant beta:environments:work stats/stop` drive and monitor the work queue - see `shared/managed-agents-self-hosted-sandboxes.md`.

```sh
ant models list
ant messages create --model claude-opus-5-5 --max-tokens 1024 --message '{role: user, content: "Hello"}'
ant beta:agents retrieve --agent-id agent_01...
ant beta:sessions:events list --session-id session_01...
```

`ant --help` lists resources; append `--help` to any subcommand for its flags.

## Global flags

| Flag | Purpose |
| --- | --- |
| `--format` | `auto` (default: pretty if TTY, compact if piped), `json`, `jsonl`, `yaml`, `pretty`, `raw`, `explore` (interactive TUI) |
| `--transform` | GJSON path applied to the response (per-item on list endpoints). Not applied when `--format raw`. |
| `-r`, `--raw-output` | If the transformed result is a string, print it without quotes (jq semantics). Pair with `--transform` for scalar capture. |
| `--max-items` | Cap total results returned from auto-paginating list endpoints (distinct from `--limit`, which is the server page size). |
| `--format-error` / `--transform-error` | Same as `--format`/`--transform`, applied to error responses. `-r` does not apply to the error path - use `--format-error yaml` for unquoted error scalars. |
| `--base-url` | Override API host |
| `--debug` | Print full HTTP request + response to stderr (API key redacted) |

## Output - `--transform` + `--format`

`--transform` takes a [GJSON path](https://github.com/tidwall/gjson/blob/master/SYNTAX.md). On list endpoints it runs **per item**, not on the envelope.

```sh
ant beta:agents list --transform '{id,name,model}' --format jsonl
```

**Extract a scalar for shell use:** pair `--transform` with `-r` (`--raw-output` - prints strings unquoted, jq-style):

```sh
AGENT_ID=$(ant beta:agents create --name "My Agent" --model '{id: claude-sonnet-5-5}' \
  --transform id -r)
```

## Input - flags, stdin, `@file`

**Flags** - scalar fields map directly. Structured fields accept relaxed-YAML syntax (unquoted keys) or strict JSON. Repeatable flags build arrays (each `--tool`, `--event`, `--message` appends one element):

```sh
# a research agent needs the web; otherwise set both to false
ant beta:agents create \
  --name "Research Agent" \
  --model '{id: claude-opus-5-5}' \
  --tool '{type: agent_toolset_20260401, default_config: {permission_policy: {type: auto}}, configs: [{name: web_fetch, enabled: true}, {name: web_search, enabled: true}]}' \
  --tool '{type: custom, name: search_docs, input_schema: {type: object, properties: {query: {type: string}}}}'
```

**Stdin** - pipe a full JSON or YAML body. Merged with flags; flags win on conflict (for array fields, any flag **replaces** the stdin array entirely - it does not append). Quote the heredoc delimiter (`<<'YAML'`) to disable shell expansion inside the body:

```sh
ant beta:agents create <<'YAML'
name: Research Agent
model: claude-opus-5-5
system: |
  You are a research assistant. Cite sources for every claim.
tools:
  - type: agent_toolset_20260401
    default_config: {permission_policy: {type: auto}}
    configs:   # a research agent needs the web; otherwise set both to false
      - {name: web_fetch, enabled: true}
      - {name: web_search, enabled: true}
YAML
```

**`@file` references** - inline a file's contents into any string-valued field. Inside structured flag values, quote the path. Binary files are auto-base64'd; force with `@file://` (text) or `@data://` (base64). Escape a literal leading `@` as `\@`.

```sh
ant beta:agents create --name "Researcher" --model '{id: claude-sonnet-5-5}' --system @./prompts/researcher.txt

ant messages create --model claude-opus-5-5 --max-tokens 1024 \
  --message '{role: user, content: [
    {type: document, source: {type: base64, media_type: application/pdf, data: "@./scan.pdf"}},
    {type: text, text: "Extract the text from this scanned document."}
  ]}' \
  --transform 'content.0.text' -r
```

Flags that natively take a file path (e.g. `--file` on `beta:files upload`) accept a bare path without `@`.

## Version-controlled Managed Agents resources (`ant apply`)

This is the recommended flow for defining agents, environments, skills, memory stores, vaults and deployments: one file (or skill directory) per resource in your repo, synced with `ant apply` (needs `ant` 1.30.0 or later, 1.34.0 for vaults - check `ant --version`). It prints a plan, creates or updates what differs, and records each resource's ID in `claude-lock.json`. See `shared/managed-agents-core.md` for the field reference, and the `ant apply` page in `shared/live-sources.md` for `--force`, `--prune`, `--lock-file`, renamed or deleted files and CI setup (written for a person at a terminal; the rules below still apply).

```
agents/summarizer.md          # YAML frontmatter = agent config, Markdown body = system prompt
environments/cloud.yaml       # the environment create body
skills/pr-summary/SKILL.md    # a skill is a directory with SKILL.md at its root
memory_stores/notes.yaml
vaults/team.yaml              # display_name (+ metadata) only - the container, never a credential
deployments/nightly.md        # frontmatter = deployment create body, Markdown body = the message that starts each run
claude-lock.json              # written by ant apply - commit it
```

```markdown
---
# agents/summarizer.md
name: Summarizer
model: claude-sonnet-5-5
tools:
  - type: agent_toolset_20260401
    default_config: {permission_policy: {type: auto}}
    configs:
      - {name: web_fetch, enabled: false}
      - {name: web_search, enabled: false}
---

You are a helpful assistant that writes concise summaries.
```

```yaml
# environments/cloud.yaml
name: summarizer-env
config: {type: cloud, networking: {type: limited, allow_package_managers: true}}
```

```sh
ant apply --dry-run -v agents/summarizer.md environments/cloud.yaml   # print the plan with every field, change nothing
ant apply agents/summarizer.md environments/cloud.yaml   # print the plan, then ask (y)es / (n)o / (d)etails - needs a terminal
ant apply   # later: reconcile every file claude-lock.json already tracks
```

- **Name the files you wrote; pass `.` or a directory only when the user asks for the whole tree.** A directory is walked to any depth and everything that looks like a resource is applied: any file that has a top-level `type:`, sits directly in `agents/`, `environments/`, `memory_stores/`, `vaults/` or `deployments/`, or has a filename that is or starts with `agent`, `environment`, `memory_store` or `deployment` (`agent.md`, `environment_staging.yaml`; the kind has to lead, so `staging-environment.yaml` is not recognized), plus any directory holding a `SKILL.md`. A filename never makes a vault: outside `vaults/`, a vault file needs `type: vault`. Claude Code plugins, conda (`environment.yml`) and Kubernetes (`deployments/`) use the same names, and a cloned repo can hold files its user never read.
- **Without a terminal (a coding agent's shell), `ant apply` prints the plan and exits; it applies only with `--yes`.** If you are a coding agent running this for a user, that flag is their approval, not yours: show them the dry-run plan and add `--yes` (or answer the prompt) only once they say go ahead. The plan also covers whatever `claude-lock.json` already tracks: if it would create or change anything you did not write, or a file you did not write sits at a path you need, stop and ask; never add `--force` or `--prune` on your own.
- **Reference other resources by path, not ID** (relative to the file that names it): `skills: [../skills/pr-summary]` on an agent; `agent: ../agents/summarizer.md` and `environment_id: ../environments/cloud.yaml` on a deployment. `ant apply` also applies whatever the files you pass reference, in dependency order, and fills in the IDs. For a resource these files don't manage, write its ID (`agent_01...`, `env_01...`); anything else is sent as written.
- **Commit `claude-lock.json`** (the first run writes it where you run the command - use the repo root). The next run uses it to update the same resources instead of creating duplicates. A resource created any other way (Console, `ant beta:agents create`, an SDK) cannot be adopted: a file describing it creates a second one.
- **To change a resource, edit its file and run `ant apply` again** (an agent gets a new version; whatever references it is updated in the same run).
- **CI in the user's own repository:** run from the directory that holds `claude-lock.json` (normally the repo root) and name the resource directories the project has, not `.` (a walk of `.` also applies look-alike files elsewhere in the repo): `ant apply --dry-run agents environments` on pull requests, `ant apply --yes agents environments` only on push to the default branch (there the merge is the approval), then commit `claude-lock.json`.
- **One directory per agent works too:** `agents/<agent-name>/agent.md` with `environment.yaml`, `vault.yaml` (`type: vault`) and `deployment-<name>.yaml` beside it. A file named for its kind alone takes the directory's name. Full layout: `shared/managed-agents-onboarding-from-url.md` §4.
- **Vaults are managed as containers only.** The file creates and renames the vault; credentials are added separately (`ant beta:vaults:credentials create`, or an SDK) and are never read or diffed. `vault_ids` on a deployment takes `vlt_...` IDs, not paths: apply the vault first, then copy its ID from `claude-lock.json`. Removing a vault with `--prune` archives it, which purges its secrets.
- **Not managed:** credentials, uploaded files, sessions.

**One-off provisioning** can still use `ant beta:agents create <<'YAML'` (see Input above) and `ant beta:agents update --agent-id ... --version N`; you keep track of the IDs yourself.

Start a session with the IDs from `claude-lock.json` (each `resources` key is the file's path as the plan prints it):

```sh
AGENT_ID=$(jq -r '.resources["./agents/summarizer.md"].id' claude-lock.json)
ENV_ID=$(jq -r '.resources["./environments/cloud.yaml"].id' claude-lock.json)
SID=$(ant beta:sessions create --agent "$AGENT_ID" --environment-id "$ENV_ID" --title "Task" --transform id -r)
ant beta:sessions:events send --session-id "$SID" \
  --event '{type: user.message, content: [{type: text, text: "Summarize X"}]}'
ant beta:sessions:events list --session-id "$SID" --transform 'content.0.text' -r
ant beta:sessions:events stream --session-id "$SID"   # live event stream
```

### Attach a terminal to a session (`ant beta:sessions connect`)

`ant beta:sessions connect <session-id>` attaches your terminal to an existing session: it loads the transcript, follows it live, and lets you step in - send a message, interrupt, or allow/deny a tool call that is waiting for approval. Ctrl+C detaches; the session keeps running, and reconnecting reloads the full history. Read-only if the session is `terminated` or archived.

```sh
ant beta:sessions connect sesn_011CZkZAtmR3yMPDzynEDxu7          # terminal view
ant beta:sessions connect sesn_011CZkZAtmR3yMPDzynEDxu7 --web    # Console session viewer, served locally
```

| Key | Action |
|---|---|
| Enter | Send input as a `user.message` (Alt+Enter / Ctrl+J for a newline) |
| Esc | Interrupt the running agent (`user.interrupt`) |
| Ctrl+O | Toggle detail: tool inputs/results, token usage, status events (`--verbose` / `-v` starts expanded) |
| PgUp / PgDn | Scroll; scrolling up pauses following, End resumes |
| Ctrl+C (or Ctrl+D on empty input) | Detach |

When a call is waiting for approval (`always_ask`, or `auto` with no determination), the input line becomes **Allow tool call?** with **Yes** / **No** / **No, and tell the agent why** - the CLI sends `user.tool_confirmation`, with your typed reason as `deny_message`. In multiagent sessions the terminal view follows the primary thread only (which includes coordinator<->subagent messages).

`--web` serves the Console's session viewer from a local server on `127.0.0.1`, prints the URL, and opens the browser (`--no-browser` to skip). The URL works once, within two minutes (reloading that tab is fine; to open it elsewhere, run the command again). The page talks only to the local `ant` process, which makes the API calls, so credentials never leave the CLI; the server runs until Ctrl+C. Unlike the terminal view, the browser viewer follows every thread of a multiagent session.

Needs an interactive terminal (except `--web`) - for scripts use `ant beta:sessions:events stream` / `send`, below.

### Interactive session loop (stream-before-send)

`ant beta:sessions:events stream` only delivers events emitted *after* the stream opens - so open it **before** sending the kickoff to avoid missing early events. Use process substitution to hold the stream on a file descriptor, send, then read:

```sh
exec {stream}< <(ant beta:sessions:events stream --session-id "$SID" \
  --transform '{type,text:content.#(type=="text").text,err:error.message}' --format yaml)

ant beta:sessions:events send --session-id "$SID" > /dev/null <<'YAML'
events:
  - type: user.message
    content:
      - type: text
        text: Summarize the repo README
YAML

type=
while IFS= read -r -u "$stream" line; do
  case "$line" in
    type:\ session.status_idle) break ;;
    type:\ session.error)
      IFS= read -r -u "$stream" next || next=
      case "$next" in err:\ *) msg=${next#err: } ;; *) msg=unknown ;; esac
      printf '\n[Error: %s]\n' "$msg"; break ;;
    type:\ *) type=${line#type: } ;;
    text:*)
      [[ $type == agent.message ]] || continue
      val=${line#text: }
      case "$val" in '|-'|'|') ;; *) printf '%s' "$val" ;; esac ;;
    \ \ *)
      if [[ $type == agent.message ]]; then printf '%s\n' "${line#  }"; fi ;;
  esac
done
exec {stream}<&-
```

This works for interactive exploration and demos; it stops at the first `session.status_idle`, even one that is waiting on you (`stop_reason.type: requires_action`, such as a call paused for approval - answer it with `ant beta:sessions connect`). For application code that needs to react to `agent.tool_use` / `agent.custom_tool_use` events, reconnect after drops, or dedup against `events.list`, use the SDK - see `shared/managed-agents-client-patterns.md`.

## Scripting patterns

`--transform id -r` on a list endpoint emits one bare ID per line - compose with `xargs`, or use `--max-items N` to bound the result set without piping through `head`:

```sh
FIRST=$(ant beta:agents list --transform id -r --max-items 1)
ant beta:agents:versions list --agent-id "$FIRST" --transform '{version,created_at}' --format jsonl
```

Error shaping mirrors the success path (note: `-r` does not apply to error output - use `--format-error yaml` for an unquoted scalar here):

```sh
ant beta:agents retrieve --agent-id bogus --transform-error error.message --format-error yaml 2>&1
```

Shell completion: `ant @completion {zsh|bash|fish|powershell}`.

For the full, always-current reference (including per-endpoint flags), WebFetch the **Anthropic CLI** URL in `shared/live-sources.md`.
