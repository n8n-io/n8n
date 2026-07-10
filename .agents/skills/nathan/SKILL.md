---
name: n8n:nathan
description: Deploy a temporary n8n test instance (or generate a local docker run command) via the internal "Nathan" bot, from the repo instead of Slack. Use after opening a PR to offer the user a live test instance, or whenever someone asks to spin up / deploy a test instance for a branch.
allowed-tools: Bash(pnpm nathan:*), Bash(node scripts/nathan.mjs:*), Read
---

# Nathan — repo-local test instances

Nathan is n8n's internal bot that deploys throwaway test instances from a branch
or Docker image. It's normally driven from Slack (`/nathan ...`); this skill runs
the same commands from the repo via `pnpm nathan`.

## Before you use it (check once)

1. **`cloudflared` must be installed.** Nathan replies asynchronously through a
   public tunnel; `cloudflared` holds it reliably for the 10-20 min a branch
   build takes. The `npx localtunnel` fallback frequently drops mid-deploy and
   loses the reply. Check with `command -v cloudflared` — **if it's missing, ask
   the user to run `brew install cloudflared` before deploying.**
2. **`NATHAN_TOKEN` must be in `.env.local`** (gitignored) or the environment.
   The command errors clearly if it's not set — ask the user to add it.

## Offer a test instance after a PR

After you open a PR for a branch, **ask the user if they want a live test
instance** for it (and confirm `cloudflared` is installed — see above). If yes,
deploy the PR's branch with an explicit `test-` instance name:

```bash
pnpm nathan deploy <branch-name> test-<short-name>
```

Nathan builds the branch image (a few minutes) and the command prints the
instance URL (`https://test-<short-name>.stage-app.n8n.cloud`, login
`test@n8n.io` / `helloWorld7`). Relay that URL to the user.

## How it works

`pnpm nathan <args>` sends the command, opens a short-lived public tunnel so
Nathan can call back, prints its reply, then exits. Deploys take minutes — the
command waits (Ctrl-C to stop; the deploy keeps running). Passing an explicit
`test-<name>` also lets it poll the instance URL directly, so it still reports
success even if the tunnel drops.

## Common commands

```bash
pnpm nathan help                              # full option reference
pnpm nathan deploy my-branch                  # deploy a branch (community license)
pnpm nathan deploy my-branch --license pro2   # licensed instance
pnpm nathan deploy master test-ai --ai        # enable instance AI
pnpm nathan deploy nightly                     # deploy the n8nio/n8n:nightly image
```

Key flags (pass after the deploy args): `--license community|enterprise|starter|pro1|pro2|trial`,
`--enterprise`, `--ai`, `-e KEY=value` (repeatable), `--featureOverride key:value`
(needs a generated license). Run `pnpm nathan help` for the complete list and rules.

## `local` caveat

`pnpm nathan local ...` generates a runnable `docker run` bundle, but Nathan
delivers it as **Slack file attachments** (`run-n8n.sh` + `.env`), not to the
terminal. Set `NATHAN_SLACK_CHANNEL=<slack channel id>` to receive them, or run
`/nathan local` in Slack. `deploy` and `help` return fully in the terminal.

## Unsupported

Queue mode, multi-main, and non-SQLite databases are not supported by Nathan.
