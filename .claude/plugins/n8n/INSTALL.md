# Using the n8n Claude Code plugin in other projects

We have a set of Claude Code skills (`n8n:human-like-code-review`, `n8n:create-pr`,
`n8n:reproduce-bug`, and more). Inside the n8n repo, the plugin is picked up automatically.
This guide shows how to use the plugin in other projects.
See [plugin README](README.md) for full details.

> Everything is namespaced with an `n8n:` prefix — so you call skills like `/n8n:human-like-code-review`,
> commands like `/n8n:plan`, and agents like `n8n:developer`. That prefix is the reason
> these ship as a plugin (it avoids clashes with your personal or other plugins' skills).

## How it works

The plugin isn't published to Claude's public marketplace. You register a **local** copy
from an n8n repo checkout.

"Installing" it means pointing Claude Code at `.claude/plugins/n8n` inside that checkout.
The plugin folder must stay inside a full n8n repo — skills symlink to `.agents/skills/`.

---

## Step 1 — Choose a plugin source

Pick where Claude Code should read the plugin from.

### Option A — Use your existing checkout (usual for n8n contributors)

If you already have the n8n repo on disk, point at the plugin folder there:

```
<your-n8n-checkout>/.claude/plugins/n8n
```

For example:

```
~/Projects/n8n/.superset/n8n/foul-skate/.claude/plugins/n8n
```

Skills follow whatever branch that checkout is on. Pull or rebase when you want updates.

### Option B — Dedicated checkout on `master` (optional)

Use this when you want a stable plugin source that always tracks team `master`, without
switching branches in your main working copy.

Clone the repo (or add a worktree):

```bash
git clone https://github.com/n8n-io/n8n.git ~/Projects/n8n-master
# or, from an existing clone:
# git worktree add ~/Projects/n8n-master master
```

Plugin path:

```
~/Projects/n8n-master/.claude/plugins/n8n
```

Replace with your path.

> **Windows:** enable [Developer Mode](https://learn.microsoft.com/en-us/windows/advanced-settings/developer-mode#enable-developer-mode) and symlinks (`git config --global core.symlinks true`) before checkout — otherwise skill symlinks become plain-text stubs and Claude Code cannot load them.

---

## Step 2 — Install

Register the marketplace in Claude Code (use the path from Step 1):

```
/plugin marketplace add <path-to>/.claude/plugins/n8n
```

Example with a dedicated checkout:

```
/plugin marketplace add ~/Projects/n8n-master/.claude/plugins/n8n
```

Then install the plugin. You can choose where it should be available.

### Globally (available in every project)

This is the usual choice. Run:

```
/plugin install n8n@n8n
```

When it asks where to install, pick **user**. That makes the n8n skills available no matter which repo you open — you only do this once.

### Only in one specific repo

Open Claude Code **inside that repo**, then run:

```
/plugin install n8n@n8n
```

When it asks where to install, pick **project**. Repeat per repo if you want it in several.

After either option, restart Claude Code (or run `/plugin` and reload).

## Step 3 — Verify

In Claude Code:

```
/help
```

You should see the n8n skills in the list (look for the `n8n:` prefix). Try `/n8n:human-like-code-review` to confirm.

---

## Keeping it up-to-date

Refresh the checkout you registered in Step 1, then reload the plugin in Claude Code.

```bash
git -C <your-n8n-checkout> pull
```

For a dedicated `master` checkout:

```bash
git -C ~/Projects/n8n-master pull origin master
```

Then in Claude Code:

```
/plugin marketplace update n8n
```

> **Seeing only one skill, or things look broken?** Your checkout may be behind, or skill
> symlinks may be broken. Pull the latest changes and run
> `node scripts/sync-agent-skill-links.mjs --check` from the repo root.

---

## Removing it

```
/plugin uninstall n8n@n8n
```
