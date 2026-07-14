# n8n Claude Code Plugin

Shared commands and agents for n8n development, plus Claude Code skill links.
All plugin items are namespaced under `n8n:` to avoid collisions with personal
or third-party plugins.

## Usage

Skills, commands, and agents are auto-discovered by Claude Code from this
plugin directory. Everything gets the `n8n:` namespace prefix automatically.

| Type | Example | Invocation |
|------|---------|------------|
| Skill | `skills/create-pr/SKILL.md` | `n8n:create-pr` |
| Command | `commands/plan.md` | `/n8n:plan PAY-XXX` |
| Agent | `agents/developer.md` | `n8n:developer` |

Shared skill sources live in `.agents/skills/`. Most entries under
`.claude/plugins/n8n/skills/` are symlinks to those shared sources. Claude-only
skills or overrides remain real directories in this plugin path.

> **Requires symlink support.** These shared-skill entries are git symlinks. On
> Windows, check out with symlinks enabled (`git config core.symlinks true`,
> plus Developer Mode or WSL) — otherwise git writes them as plain text stubs
> and Claude Code fails to load the affected skills. `node
> scripts/sync-agent-skill-links.mjs --check` flags stubs with an actionable
> error.

## Plugin Structure

```
.claude/plugins/n8n/
├── .claude-plugin/
│   ├── marketplace.json    # Marketplace manifest
│   └── plugin.json         # Plugin identity
├── agents/
│   └── <name>.md           # → n8n:<name> agent
├── commands/
│   └── <name>.md           # → /n8n:<name> command
├── skills/
│   ├── <shared> -> ../../../../.agents/skills/<shared>
│   └── <claude-only>/SKILL.md
└── README.md
```

Run `pnpm sync:skill-links` after adding or removing shared skills. Run
`pnpm check:skill-links` before submitting changes.

## Autonomous dev flow

The `n8n:dev-flow` skill orchestrates a full ticket lifecycle (read → plan →
review → implement → multi-angle review → PR → watch CI) as a bounded,
mostly-autonomous loop. It delegates to a purpose-built agent set:

| Agent | Role |
|-------|------|
| `n8n:autodev-planner` | Produce a reviewable implementation plan |
| `n8n:autodev-plan-reviewer` | Plan review: correctness & completeness (lead lens) |
| `n8n:autodev-implementer` | Execute the plan, get build/tests green |
| `n8n:autodev-architecture-reviewer` | Review diff: boundaries, coupling, data flow |
| `n8n:autodev-security-reviewer` | Review diff: injection, authz, secrets, SSRF |
| `n8n:autodev-conventions-reviewer` | Review diff: n8n patterns, code quality |
| `n8n:autodev-test-reviewer` | Review diff: high-value missing tests, test quality |
| `n8n:autodev-vue-reviewer` | Review diff: Vue 3 + Pinia, design-system/i18n conventions (frontend diffs only) |

The four review lenses run in parallel; the Vue lens is added as a fifth **only
when the diff touches frontend code** (`.vue`, `packages/frontend/**`, or
`@n8n/design-system`). Reviewers tag findings `[BLOCKER]`/`[MAJOR]`/`[MINOR]`; loops converge until no
`[BLOCKER]`/`[MAJOR]` remain (capped at 3 rounds, then escalate). The skill
opens the PR automatically once the review loop is clean, watches CI and review
comments, and never merges. Security fixes get neutral branch/commit/test
naming per AGENTS.md.

## Design Decisions

### Why a plugin instead of standalone skills?

To get the `n8n:` namespace prefix, avoiding collisions with personal or
third-party plugins. Claude Code only supports colon-namespaced items through
the plugin system — standalone `.claude/skills/` entries cannot be namespaced.

### Skill Frontmatter

Shared skills keep `name: n8n:<name>` in `SKILL.md` frontmatter for cross-agent
discovery. Do not remove shared skill names when linking them into this plugin.
