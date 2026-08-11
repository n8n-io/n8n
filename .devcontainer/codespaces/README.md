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
- **Reattach** by running the same `pnpm session <name>` from any machine.
- Each named session gets its own worktree (`/workspaces/wt-<name>`, branch
  `session/<name>`), so parallel agents never touch each other's tree. Builds
  in fresh worktrees are cache-hits via a shared turbo cache.
- First codespace creation takes ~20 min uncached (image + full build). After
  that, sessions attach instantly; new worktrees cost a `pnpm install` (~1–2 min).

## Flaky tools (MCP)

Claude sessions get the `flaky` MCP server automatically: Currents
flaky/quarantine data, the `qa_*` BigQuery dataset, Sentry RCA, live Linear,
and repo investigation. Login registers it from the repo-level
`FLAKY_MCP_TOKEN` / `FLAKY_MCP_URL` secrets. Forks have no secrets and skip
it. Tell the agent to call `get_flaky_context` first — it returns the rules
the tools assume.

## Viewing the dev UI locally

Two terminal windows:

```bash
pnpm session          # window 1: attach the agent session
pnpm session tunnel   # window 2: forward 5678 + 8080 to localhost
```

Attaching lands you in the agent (Claude), not a shell — open a shell in a
new tmux window with `Ctrl-b c` (or ask the agent) and run `pnpm dev` there.
Then open http://localhost:8080.

The tunnel prints nothing while forwarding — that's normal. `Connection
refused` means nothing is listening on that port in the codespace yet; it
starts serving as soon as `pnpm dev` is up, no restart needed. Pass ports to
override the defaults (`pnpm session tunnel 5678 8080 5679`), but always
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
  base64-encoded to `/workspaces/.codespaces/shared/.env-secrets`. The image's
  profile shim exports them for ssh/tmux sessions.
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

Compute bills only while the codespace runs: ~$0.36/hr (4-core) / ~$0.72/hr
(8-core), ~nothing stopped. Usage draws from a shared monthly org budget, so
`pnpm session stop` when you leave; the idle timeout is the backstop, not the
plan.
