# n8n Claude Code Plugin

Shared skills, commands, and agents for n8n development. All items are
namespaced under `n8n:` to avoid collisions with personal or third-party
plugins.

## Skills

| Skill | Description |
|-------|-------------|
| `n8n:setup-mcps` | Configure MCP servers for n8n engineers |
| `n8n:create-issue` | Create Linear tickets or GitHub issues following n8n conventions |
| `n8n:create-pr` | Create GitHub PRs with titles that pass CI validation |
| `n8n:create-skill` | Guide for creating effective Agent Skills |
| `n8n:content-design` | Product content designer for UI copy |
| `n8n:linear-issue` | Fetch and analyze Linear issue with all related context |
| `n8n:loom-transcript` | Fetch transcript from a Loom video URL |
| `n8n:conventions` | Quick reference for n8n patterns |
| `n8n:node-add-oauth` | Add OAuth2 credential support to an existing n8n node |
| `n8n:reproduce-bug` | Reproduce a bug from a Linear ticket with a failing test |
| `n8n:spec-driven-development` | Keep implementation and specs in sync |

## Commands

| Command | Description |
|---------|-------------|
| `/n8n:plan PAY-XXX` | Plan implementation for a Linear ticket |
| `/n8n:triage PAY-XXX` | Triage a Linear issue with comprehensive analysis |

## Agents

| Agent | Description |
|-------|-------------|
| `n8n:developer` | Full-stack n8n development (frontend/backend/nodes) |
| `n8n:linear-issue-triager` | Issue investigation and triage |

## Design Decisions

### Why a plugin instead of standalone skills?

To get the `n8n:` namespace prefix for all n8n-specific skills, avoiding name
collisions with built-in or personal skills. Claude Code only supports
colon-namespaced skills (`n8n:setup-mcps`) through the plugin system —
standalone `.claude/skills/` entries cannot be namespaced. This also provides a
home for future n8n skills, commands, and agents under the same `n8n:` prefix.

### Why only user and local scope (no project scope)?

Project scope writes MCP config to `.claude/settings.json`, which is tracked in
git. Since MCP credentials are personal (OAuth tokens, API keys), they should
not end up in version control. User scope makes MCPs available across all
projects; local scope (`settings.local.json`) keeps them project-specific but
gitignored.

### Why ask scope per MCP instead of once for all?

Engineers may want different scopes for different MCPs. For example, Context7
and Figma are useful across all projects (user scope), while Linear or Notion
might only be needed for this project (local scope).

## Plugin Structure

```
.claude/plugins/n8n/
├── .claude-plugin/
│   ├── marketplace.json    # Marketplace manifest
│   └── plugin.json         # Plugin identity
├── agents/
│   ├── developer.md
│   └── linear-issue-triager.md
├── commands/
│   ├── plan.md
│   └── triage.md
├── skills/
│   ├── content-design/SKILL.md
│   ├── create-issue/SKILL.md
│   ├── create-pr/SKILL.md
│   ├── create-skill/SKILL.md
│   ├── linear-issue/SKILL.md
│   ├── loom-transcript/SKILL.md
│   ├── conventions/SKILL.md
│   ├── node-add-oauth/SKILL.md
│   ├── reproduce-bug/SKILL.md
│   ├── setup-mcps/SKILL.md
│   └── spec-driven-development/SKILL.md
└── README.md
```

## Known Issues

- Plugin skill namespacing requires omitting the `name` field from SKILL.md
  frontmatter due to a [Claude Code bug](https://github.com/anthropics/claude-code/issues/17271).
  The directory name is used as the skill identifier instead.
