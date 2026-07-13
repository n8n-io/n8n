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

1. **No tunnel setup needed.** Nathan replies asynchronously through a
   short-lived public tunnel that the script opens for you via `npx localtunnel`.
   Do **not** use cloudflared on n8n's network — its `*.trycloudflare.com`
   hostnames don't resolve there, so Nathan's callback fails. A deploy with an
   explicit `test-<name>` also polls the instance URL directly, so it still
   reports success even if the tunnel drops.
2. **A Nathan token is needed**, read from `~/.n8n/nathan-token`. If it's missing
   (check with `test -s ~/.n8n/nathan-token || echo missing`), **ask the user for
   one yourself** — point them at the form
   (`https://internal.users.n8n.cloud/form/d6d34a2f-4899-4ee8-afc8-f8c41a8a243d`),
   where they log in with their n8n account and copy the token from the response
   — then write it for them:

   ```bash
   mkdir -p ~/.n8n && printf '%s\n' '<PASTED_TOKEN>' > ~/.n8n/nathan-token && chmod 600 ~/.n8n/nathan-token
   ```

   Future runs reuse it. (Humans running the script interactively get the same
   flow via a paste prompt; that prompt needs a real terminal, so as an agent do
   the write yourself rather than relying on it.)

## Offer a test instance after a PR

After you open a PR for a branch, **ask the user if they want a live test
instance** for it. If yes, deploy the PR's branch with an explicit `test-`
instance name:

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
terminal — they land in **#updates-pnpm-nathan**
(https://n8nio.slack.com/archives/C0BGVHZ0SCW). Override the destination with
`NATHAN_SLACK_CHANNEL=<slack channel id>`. `deploy` and `help` return fully in
the terminal.

## Unsupported

Queue mode, multi-main, and non-SQLite databases are not supported by Nathan.
