---
name: n8n:nathan
description: Deploy a temporary n8n test instance (or generate a local docker run command) via the internal "Nathan" bot, from the repo instead of Slack. Use after opening a PR to offer the user a live test instance, or whenever someone asks to spin up / deploy a test instance for a branch.
allowed-tools: Bash(pnpm nathan:*), Bash(node scripts/nathan.mjs:*), Bash(git diff:*), Read
---

# Nathan — repo-local test instances

Nathan is n8n's internal bot that deploys throwaway test instances from a branch
or Docker image. It's normally driven from Slack (`/nathan ...`); this skill runs
the same commands from the repo via `pnpm nathan`.

## Prerequisites

- **No tunnel setup needed.** Nathan replies asynchronously through a short-lived
  public tunnel that the script opens for you (`npx localtunnel`). A `deploy` with
  an explicit `test-<name>` also polls the instance URL directly, so it still
  reports success even if the tunnel drops.
- **A token in `~/.n8n/nathan-token`.** Check with `test -s ~/.n8n/nathan-token || echo missing`.
  If missing, **ask the user for one** — point them at the form
  (`https://internal.users.n8n.cloud/form/d6d34a2f-4899-4ee8-afc8-f8c41a8a243d`),
  where they log in with their n8n account and copy the token from the response —
  then write it for them (don't rely on the script's interactive paste prompt; it
  needs a real terminal):

  ```bash
  mkdir -p ~/.n8n && printf '%s\n' '<PASTED_TOKEN>' > ~/.n8n/nathan-token && chmod 600 ~/.n8n/nathan-token
  ```

## Offer a test instance after a PR

After you open a PR, **offer the user a live test instance for the branch.** Don't
just ask a bare yes/no — look at the diff and **propose a sensible profile**, then
let them confirm or adjust. For example:

> "Want a test instance for this? Based on the diff I'd deploy it with instance AI
> enabled (`--ai`) since it touches the AI assistant. Sound good, or a different
> license?"

### Pick the profile from the PR contents

Inspect what the PR changes (`git diff --stat origin/master...HEAD` and the file
paths / feature area), then choose:

| PR touches… | Suggest | Why |
|---|---|---|
| AI features — `@n8n/nodes-langchain`, `@n8n/instance-ai`, the AI assistant/builder, `N8N_AI_*`, "askAi"/agent code | `--ai` | Enables instance AI (and defaults the license to pro2) so the AI features actually run |
| License-gated / enterprise features — `.ee.ts` files or `/ee/` dirs, license checks (`@n8n_io/license-sdk`, `hasFeature`), SSO/SAML/OIDC/LDAP, RBAC/roles/scopes, projects, variables, external secrets, source control/environments, log streaming, insights, folders | `--enterprise` | The feature is gated behind a license and won't be testable on community |
| A specific gated feature/quota you want on/off | `--license pro2 --featureOverride <featureKey>:<value>` | Bakes the override into a generated license (community/enterprise can't be overridden) |
| Anything else — core nodes, generic UI, non-gated bug fixes | *(nothing — community default)* | No license needed |

If both AI and enterprise apply, combine them: `--ai --enterprise`. When unsure,
state your best guess and ask. Run `pnpm nathan help` for the full flag reference.

### Deploy

```bash
pnpm nathan deploy <branch-name> test-<short-name> [flags]
```

Nathan builds the branch image (a few minutes) and the command prints the instance
URL (`https://test-<short-name>.stage-app.n8n.cloud`, login `test@n8n.io` /
`helloWorld7`). Relay that URL to the user.

## Common commands

```bash
pnpm nathan help                                   # full option reference
pnpm nathan deploy my-branch test-my-feature       # community license
pnpm nathan deploy my-branch test-sso --enterprise # enterprise license
pnpm nathan deploy my-branch test-ai --ai          # instance AI (license -> pro2)
pnpm nathan deploy nightly test-nightly            # deploy the n8nio/n8n:nightly image
```

Key flags (after the deploy args): `--license community|enterprise|starter|pro1|pro2|trial`,
`--enterprise`, `--ai`, `-e KEY=value` (repeatable), `--featureOverride key:value`
(needs a generated license).

## `local` caveat

`pnpm nathan local ...` generates a runnable `docker run` bundle, but Nathan
delivers it as **Slack file attachments** (`run-n8n.sh` + `.env`), not to the
terminal — they land in **#updates-pnpm-nathan**
(https://n8nio.slack.com/archives/C0BGVHZ0SCW). `deploy` and `help` return fully
in the terminal.

**Do not invent a `NATHAN_SLACK_CHANNEL`.** Leave it unset (it defaults to
#updates-pnpm-nathan); only set it if the user explicitly gives you a channel id.

## Unsupported

Queue mode, multi-main, and non-SQLite databases are not supported by Nathan.
