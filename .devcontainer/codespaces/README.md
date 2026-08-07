# Cloud agent sessions (Codespaces)

Run long-lived, human-steered agent sessions (Claude Code / OpenCode) on a
GitHub Codespace instead of your laptop: start a task, close the lid, steer it
from anywhere with a terminal, resume tomorrow.

This is a separate devcontainer config from the laptop one in
`.devcontainer/` — it ships both agent CLIs, `tmux` for session persistence,
and Playwright system deps, on the same Postgres sidecar setup.

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
- Codespaces on this repo (public) bill to **your personal account** by
  default — the free tier is 120 core-hours/month. Org billing, bigger
  machines, and prebuilds (which remove the ~20 min cold start) require org
  admin enablement.

## Costs

You pay only while the codespace runs: ~$0.36/hr (4-core) / ~$0.72/hr
(8-core), ~nothing stopped. `pnpm session stop` when you leave; the idle
timeout is the backstop, not the plan.
