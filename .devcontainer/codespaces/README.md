# Cloud agent sessions (Codespaces)

Run long-lived, human-steered agent sessions (Claude Code / OpenCode) on a
GitHub Codespace instead of your laptop: start a task, close the lid, steer it
from anywhere with a terminal, resume tomorrow.

This is a separate devcontainer config from the laptop one in
`.devcontainer/` — it ships both agent CLIs, `tmux` for session persistence,
Playwright system deps, and Docker-in-Docker (for testcontainers and
`pnpm --filter n8n-containers services`), on the same Postgres sidecar setup.

## One-time setup (~5 min)

1. Add your key at [github.com/settings/codespaces](https://github.com/settings/codespaces)
   → **New secret** → name `ANTHROPIC_API_KEY`, repository access `n8n-io/n8n`.
   (Alternative for Max subscriptions: `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`.)
2. Give the GitHub CLI the codespace scope:

   ```bash
   gh auth refresh -h github.com -s codespace
   ```

## Daily flow

```bash
pnpm session              # attach the default agent session (creates everything on first run)
pnpm session fix-flaky    # a second, parallel agent in its own git worktree
pnpm session ls           # what's running
pnpm session tunnel       # forward n8n ports (default 5678, 8080) to localhost; Ctrl-C to stop
pnpm session stop         # end of day: billing stops, disk survives
pnpm session rm           # delete the codespace
```

- **Detach** with `Ctrl-b d` — the agent keeps working without you.
- **Scroll** with the mouse wheel (tmux mouse mode is on). To use the
  terminal's own text selection, hold **Shift** and drag.
- **Reattach** by running the same `pnpm session <name>` from any machine.
- Each named session gets its own worktree (`/workspaces/wt-<name>`, branch
  `session/<name>`), so parallel agents never touch each other's tree. Builds
  in fresh worktrees are cache-hits via a shared turbo cache.
- First codespace creation takes ~20 min uncached (image + full build). After
  that, sessions attach instantly; new worktrees cost a `pnpm install` (~1–2 min).

## Agent worker (drive a session from n8n)

`agent-worker.mjs` lets an n8n workflow drive an OpenCode session on the
codespace. This is how Slack (the Flaky bot) steers a session that runs here.
Each turn runs `opencode run --format json --auto`. The session state remains on
disk. The returned session ID continues a conversation across turns and a
Codespace restart.

**The worker polls outward. Nothing inbound is exposed.** GitHub sets every
forwarded port to private on start. It gives no API to make a port public. So
you cannot reach a codespace from outside reliably. The worker calls out
instead. It asks n8n for a turn addressed to this box's owner (`$GITHUB_USER`).
It runs the turn. It sends the result to the turn's resume URL. It uses no
tunnel, no open port, and no domain.

The worker starts on each container start (`postStartCommand`). It needs two
secrets and uses one optional secret. Add them at
[github.com/settings/codespaces](https://github.com/settings/codespaces), the
same way as `ANTHROPIC_API_KEY`:

- `AGENT_WORKER_TOKEN` — the shared bearer token. The worker sends it on each poll.
- `N8N_DEQUEUE_URL` — the n8n webhook that returns a pending turn.
- `SLACK_BOT_TOKEN` — optional bot token for progress messages. It needs `chat:write` only.

The dequeue payload can include `slack.channel` and `slack.thread_ts`. The
worker posts one placeholder in that thread. It coalesces completed tool calls.
It updates the message at most once every 1.5 seconds. It does not send reasoning
text. The worker replaces the placeholder with the final answer.
If the Slack API fails, the turn still completes through the n8n resume URL.
The worker does not export its dequeue or Slack credentials to OpenCode.
Interactive cloud sessions unset the same variables before they start.

The log is at `/tmp/agent-worker.log`. The tmux session is `agent-worker`. To
watch it, run `tmux attach -t agent-worker`. The worker does not start if a
required secret or `$GITHUB_USER` is missing.

A turn stops after about 25 minutes (`TURN_TIMEOUT_MS`). This limit is below the
n8n Wait limit. So the worker reports a clear message before n8n reports a
generic timeout. Keep the worker limit below the n8n limit if you change either.

**A turn is atomic, and the worker tells the session so.** The turn ends on the
session's final message, and its children end with it: a background `Bash` task
is killed, `Monitor` events never arrive, `PushNotification` has nowhere to go,
and `ScheduleWakeup` never fires. The session also gets no turn of its own to
report back in — the turn's resume URL continues one waiting n8n execution and is
then spent, so nothing on the box can post to the thread unprompted. A session
that backgrounds a build and signs off with "I'll verify once it finishes" is
therefore describing something that cannot happen. The worker states this in
each OpenCode prompt (`turnContract`), together with a pointer to this file for
the box-specific parts. This is only the n8n/Slack path: an
interactive session (`pnpm session`, tmux) is long-lived, so background work,
monitors and notifications behave normally there.

### Build and run the app in a session

The prebuild already installed the dependencies and warmed the build. So a
session rarely needs a cold `pnpm install` or a full `pnpm build`. Both are slow
(often 10–20 minutes cold). Both can outlast a turn's limit.

- **Bring the app up with one command: `pnpm dev:up`.** It installs missing
  dependencies, starts the backend, waits for health, and prints the URL. Add
  `--build` only when a frontend change must appear (see below).
- **Open the app** at `https://<codespace-name>-5678.app.github.dev`. `dev:up`
  makes that port visible to the org, thus any n8n member who is signed into
  GitHub can open it. You do not need a tunnel. GitHub makes every forwarded port
  private again at each container start, so `dev:up` shares it again on each run.
  To see the current state, run `gh codespace ports`. The share command needs `gh`
  with the codespace scope (see the one-time setup above). If it fails, `dev:up`
  starts the app, prints the reason, and gives you the command to try again. A
  private port opens for you only, in a browser that is signed in to GitHub. An
  anonymous or server caller gets a 302. That is why the worker polls outward.
- **`pnpm dev` no longer exists.** Use `pnpm dev:be` for the backend (on 5678).
  Use `pnpm dev:fe:editor` for the editor UI with hot reload (on 8080).
- **`dev:be` serves the editor from the `dist` build.** So a frontend edit does
  not hot-reload there. Run `pnpm dev:up --build` (or `pnpm build`) and restart
  to show it. For live frontend hot reload, use `pnpm dev:fe:editor`. That path
  needs `pnpm session tunnel 5678 8080` from your laptop. Its API base is set to
  `localhost:5678`, so the `-8080.app.github.dev` URL does not work on its own.
- Run `pnpm install` only when the dependencies change. `pnpm build` reuses the
  turbo cache and is fast when warm.
- To clear stale build outputs after a branch switch, run `pnpm reset`. Add
  `--full` if that does not clear it.
- Run a long build in the foreground and give it its own turn. Backgrounding it
  does not help: it is killed when the turn ends (see above). Do not chain an
  install and a full build behind other work in one turn either — that is what
  runs into the 25-minute limit.

## Flaky tools (MCP)

Claude sessions get the `flaky` MCP server automatically: Currents
flaky/quarantine data, the `qa_*` BigQuery dataset, Sentry RCA, live Linear,
and repo investigation. Login registers it from the repo-level
`FLAKY_MCP_TOKEN` / `FLAKY_MCP_URL` secrets. Forks have no secrets and skip
it. Tell the agent to call `get_flaky_context` first — it returns the rules
the tools assume.

## Quality and security skills (Claude plugins)

Claude sessions can also load the private skills from the
`n8n-io/n8n-agent-skills` repository. `post-start.mjs` installs both plugins on
each container start, so every session gets the skills with no per-session step:

- `quality` — bug insights, defect attribution, flaky test investigation,
  mutation and property testing, PR council, and more.
- `security` — security code review, adversarial review of security-fix PRs,
  regression test generation, and Security Hub report triage.

Together they add roughly 5k always-on tokens to every session. Drop a plugin
from `PLUGINS` in `plugins.mjs` if that budget matters more than the skills.
`post-start.mjs` and the `pnpm session` prelude in `scripts/cloud-session.mjs`
both read that list, so a session that races the container start still gets
every plugin.

The private marketplace uses the codespace's own GitHub auth — no extra token.
`devcontainer.json` grants the codespace read access to
`n8n-io/n8n-agent-skills` via `customizations.codespaces.repositories`, and
**each user authorizes that access once when they create the codespace** (GitHub
prompts for it, then remembers). Both repos are in the same org, which is what
lets this work.

The codespace authenticates git over HTTPS and has no SSH key, so `post-start.mjs`
sets `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` — Claude Code's plugin loader otherwise
clones `owner/repo` shorthand over SSH and the private clone fails.

If a user does not authorize the grant, the clone fails and the skills step is
skipped (the worker still starts). Existing codespaces created before this change
need a recreate to get the prompt.

### When the skills are missing

`/tmp/post-start-status.json` lists what installed and what did not, and
`/tmp/post-start.log` has the detail. Reading the log:

- A failed `skills repo reachable` line means the grant was not authorized.
- A `marketplace add` failure mentioning `File exists` is a clone that died
  partway through `~/.claude/plugins/marketplaces/n8n-io-n8n-agent-skills`, the
  path the loader stages into before renaming it to the cache. This has been
  seen once as a transient failure, so the script removes that path and retries
  the add once.
- Any other `marketplace add` failure after a reachable repo means a
  loader-auth problem.

A failure that survives the retry needs a human — the container still starts and
the worker still runs, only the skills are missing.

Both `marketplace add` and `plugin install` are idempotent, so re-running the
script by hand is safe:

```bash
node /workspaces/n8n/.devcontainer/codespaces/post-start.mjs
```

Verify with `claude plugin list`, then restart the session (or `/reload-plugins`)
to pull the skills into context.

## Viewing the dev UI locally

Two terminal windows:

```bash
pnpm session          # window 1: attach the agent session
pnpm session tunnel   # window 2: forward 5678 + 8080 to localhost
```

Attaching lands you in the agent (Claude), not a shell — open a shell in a new
tmux window with `Ctrl-b c` (or ask the agent), then pick a dev server and open
the matching port:

- `pnpm dev:up` — backend on **5678** (editor served from the `dist` build).
  Open http://localhost:5678.
- `pnpm dev:fe:editor` — editor UI with hot reload on **8080**. Open
  http://localhost:8080. It needs the backend on 5678 too, so run `pnpm dev:up`
  alongside it.

The tunnel prints nothing while forwarding — that's normal. `Connection
refused` means nothing is listening on that port in the codespace yet; it
starts serving as soon as the dev server is up, no restart needed. Pass ports
to override the defaults (`pnpm session tunnel 5678 8080 5679`), but always
forward the pair together with matching numbers: the Vite dev UI points its
API base at `localhost:5678` (the `N8N_PORT` default), so an asymmetric or
partial mapping breaks it.

## What survives what

| Event | Running processes | Disk (checkout, worktrees, chat history) |
|---|---|---|
| Detach / close laptop / network drop | ✅ keep running | ✅ |
| Stop, or idle timeout (default 30 min, max 4 h) | ❌ killed | ✅ |
| Delete (`pnpm session rm`) | ❌ | ❌ (push your branches first) |

After a stop, `pnpm session <name>` restarts the codespace (~30–60 s); run
`claude --resume` (or `--continue`) inside to restore the conversation from disk.

## Gotchas (learned the hard way)

- **Codespaces clones the repo to `/workspaces/n8n`**, not `/workspaces` —
  `workspaceFolder` here differs from the laptop config on purpose.
- **A failing `onCreateCommand` is fatal**: Codespaces discards the container
  and drops you into a minimal recovery container (no node, no CLIs). If your
  codespace has nothing installed, check
  `/workspaces/.codespaces/.persistedshare/creation.log`.
- **`gh codespace ssh` needs sshd inside the container** — provided by the
  `sshd` devcontainer feature, don't remove it.
- **User secrets aren't visible in ssh shells by default**: the codespace
  agent injects them into VS Code sessions only; they're delivered
  base64-encoded to `/workspaces/.codespaces/shared/.env-secrets`. The image
  sources `/usr/local/lib/codespaces-env.sh` in login shells (profile.d), in
  interactive shells (bashrc), and in the `pnpm session` prelude. If Claude
  Code shows `Missing environment variables: FLAKY_MCP_TOKEN`, the shell that
  started Claude did not source the file. Run
  `. /usr/local/lib/codespaces-env.sh` and start Claude again.
- **Do not read `CODESPACE_NAME` or `GITHUB_USER` from the process env** — use
  `scripts/codespace-env.mjs`. Codespaces gives these variables to VS Code
  sessions only. Other processes read them from `codespaces-env.sh`, and a
  process that tmux starts can get an empty copy: tmux keeps the environment of
  its own start, and `update-environment` does not refresh these keys. A worker
  polled correctly as its owner while `dev:up` in the same session saw an empty
  box name, printed the localhost URL, and did not share the port. The helper
  reads `/workspaces/.codespaces/shared`, which is always correct.
- **You cannot paste images into a remote Claude session.** Image paste reads
  the clipboard of the machine where `claude` runs — the codespace, not your
  laptop. Drag the file into the VS Code explorer (or
  `gh codespace cp shot.png remote:/workspaces/n8n/`) and give Claude the
  path. The file stays on disk and survives detach and `--resume`.
- **`git push` / `gh` return 401 in tmux and long sessions** — same root
  cause as the secrets gotcha, plus rotation: Codespaces refreshes the
  on-disk `GITHUB_TOKEN` every few minutes, so a login-time snapshot goes
  stale. The image fixes both: a credential helper reads the current token
  on each `git push` (`gitcredential-refresh.sh`), and a shim at
  `/usr/local/bin/gh` does the same for `gh`. The token is scoped to
  `n8n-io/n8n`: fork-based flows do not work, push branches directly. Do
  not add SSH keys as a workaround — they have no per-repo granularity.
- Codespaces created by org members on this repo are **org-owned and
  org-billed** (organization ownership + a monthly Codespaces budget are
  enabled for n8n-io). Codespaces created before that change, or by
  non-members, bill to the personal account (free tier: 120 core-hours/month).
  If creation unexpectedly falls back to personal billing, the org budget is
  exhausted for the period.

## Costs

Compute bills only while the codespace runs: ~$0.72/hr for the 8-core box,
~nothing stopped. Usage draws from a shared monthly org budget, so
`pnpm session stop` when you leave; the idle timeout is the backstop, not the
plan.
