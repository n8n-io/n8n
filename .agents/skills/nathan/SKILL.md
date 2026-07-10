---
name: n8n:nathan
description: Deploy a temporary n8n test instance (or generate a local docker run command) via the internal "Nathan" bot, from the repo instead of Slack. Use after opening a PR to offer the user a live test instance, or whenever someone asks to spin up / deploy a test instance for a branch.
allowed-tools: Bash(pnpm nathan:*), Bash(node scripts/nathan.mjs:*), Read
---

# Nathan — repo-local test instances

Nathan is n8n's internal bot that deploys throwaway test instances from a branch
or Docker image. It's normally driven from Slack (`/nathan ...`); this skill runs
the same commands from the repo via `pnpm nathan`.

## Offer a test instance after a PR

After you open a PR for a branch, **ask the user if they want a live test
instance** for it. If yes, deploy the PR's branch:

```bash
pnpm nathan deploy <branch-name>
```

Nathan builds the branch image (a few minutes) and replies with the instance URL
+ a Grafana dashboard link. Relay that URL to the user when it arrives.

## How it works

`pnpm nathan <args>` sends the command, opens a short-lived public tunnel so
Nathan can call back, prints its reply to the terminal, then exits. Deploys take
minutes — the command waits (Ctrl-C to stop; the deploy keeps running).

Requires `NATHAN_TOKEN` in `.env.local` (gitignored). If it's missing, the
command says so — ask the user to set it. A reliable tunnel needs `cloudflared`
(`brew install cloudflared`); otherwise it falls back to `npx localtunnel`.

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
