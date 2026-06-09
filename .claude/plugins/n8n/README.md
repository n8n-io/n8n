# n8n Claude Code Plugin

Shared skills, commands, and agents for n8n development. All items are
namespaced under `n8n:` to avoid collisions with personal or third-party
plugins.

## Usage

Skills, commands, and agents are auto-discovered by Claude Code from this
plugin directory. Everything gets the `n8n:` namespace prefix automatically.

| Type | Example | Invocation |
|------|---------|------------|
| Skill | `skills/create-pr/SKILL.md` | `n8n:create-pr` |
| Command | `commands/plan.md` | `/n8n:plan PAY-XXX` |
| Agent | `agents/developer.md` | `n8n:developer` |

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
│   └── <name>/SKILL.md     # → n8n:<name> skill
└── README.md
```

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
never merges and confirms before opening a PR. Security fixes get neutral
branch/commit/test naming per AGENTS.md.

## Design Decisions

### Why a plugin instead of standalone skills?

To get the `n8n:` namespace prefix, avoiding collisions with personal or
third-party plugins. Claude Code only supports colon-namespaced items through
the plugin system — standalone `.claude/skills/` entries cannot be namespaced.

### Known Issues

- Plugin skill namespacing requires omitting the `name` field from SKILL.md
  frontmatter due to a [Claude Code bug](https://github.com/anthropics/claude-code/issues/17271).
  The directory name is used as the skill identifier instead.
