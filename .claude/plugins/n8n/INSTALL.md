# Using the n8n Claude Code plugin in other projects

## What this is

The n8n team has a set of handy Claude Code skills (`n8n:linear-issue`, `n8n:create-pr`,
`n8n:create-issue`, and more). They're packaged as a **plugin** that lives inside the n8n
repo. By default these skills only work when you're inside the n8n repo — this guide
shows how to use them in *any* project.

> Everything is namespaced with an `n8n:` prefix — so you call skills like `n8n:create-pr`,
> commands like `/n8n:plan`, and agents like `n8n:developer`. That prefix is the whole reason
> these ship as a plugin (it avoids clashes with your personal or other plugins' skills).

## How it works (the one thing to know)

The plugin isn't downloaded from the internet. It lives in a folder inside the n8n repo:

```
.claude/plugins/n8n
```

So "installing it" really means: point Claude Code at that folder, on an up-to-date copy
of the repo. Once you do that, the skills follow you into every project.

---

## Step 1 — Keep an up-to-date copy of the repo on disk

The plugin folder needs to be on the latest `master`. The easiest way is a **worktree** —
a second copy of the repo locked to `master`, so you never have to switch branches in your
main checkout.

Run this once:

```bash
git -C ~/Projects/n8n worktree add ~/Projects/n8n-master master
```

Now the latest plugin always lives at:

```
~/Projects/n8n-master/.claude/plugins/n8n
```

> **Heads up — symlinks.** Most of the plugin's skills are symlinks to `.agents/skills/` in the
> same repo. A worktree includes that folder, so the links resolve fine. The only place this bites
> is **Windows**: check out with symlinks enabled (`git config core.symlinks true` + Developer Mode
> or WSL), or git writes the links as broken text stubs.

## Step 2 — Tell Claude Code about it

First, register the marketplace (do this once, in any Claude Code session):

```
/plugin marketplace add ~/Projects/n8n-master/.claude/plugins/n8n
```

Then install the plugin. Here's where you choose **how widely** you want it — pick one:

### Option A — Globally (available in every project)

This is the usual choice. Run:

```
/plugin install n8n@n8n
```

When it asks where to install, pick **user**. That makes the n8n skills available no matter
which repo you open — you only do this once.

### Option B — Only in one specific repo

Use this if you want the skills in just one other project (for example, to keep it committed
and shared with that project's teammates). Open Claude Code **inside that repo**, then run:

```
/plugin install n8n@n8n
```

When it asks where to install, pick **project**. The plugin is now active only in that repo.
Repeat per repo if you want it in several.

> **In short:** `user` = everywhere, just for you · `project` = this one repo, shareable with the team.

After either option, restart Claude Code (or run `/plugin` and reload).

## Step 3 — Check it worked

```
/help
```

You should see the n8n skills in the list (look for the `n8n:` prefix). Try `n8n:create-pr` to confirm.

---

## Keeping it fresh

When the team updates the skills, refresh your copy:

```bash
git -C ~/Projects/n8n-master pull --ff-only origin master
```

Then in Claude Code:

```
/plugin marketplace update n8n
```

> **Seeing only one skill, or things look broken?**
> That just means your copy of the repo is out of date. Run the two commands above to
> update it — nothing is actually broken.

---

## Removing it

```
/plugin uninstall n8n@n8n
```

---

## Quick reference

| I want to… | Command |
|---|---|
| Set up the repo copy (once) | `git -C ~/Projects/n8n worktree add ~/Projects/n8n-master master` |
| Register the marketplace (once) | `/plugin marketplace add ~/Projects/n8n-master/.claude/plugins/n8n` |
| Add it **globally** (every project) | `/plugin install n8n@n8n` → pick **user** |
| Add it **to one repo** | open that repo, `/plugin install n8n@n8n` → pick **project** |
| Update it | `git -C ~/Projects/n8n-master pull --ff-only origin master` then `/plugin marketplace update n8n` |
| Check it's installed | `/help` (look for `n8n:` skills) |
| Remove it | `/plugin uninstall n8n@n8n` |

