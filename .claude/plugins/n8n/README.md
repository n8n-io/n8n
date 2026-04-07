# n8n Claude Code Plugin

Shared skills, commands, and agents for n8n development.

## Skills

### `n8n:setup-mcps`

Configures commonly used MCP servers for n8n engineers.

**Usage:**
```
/n8n:setup-mcps
```

**What it does:**
1. Checks which MCPs are already configured (matches by URL, not name)
2. Presents a multi-select menu of available MCPs (Linear, Notion, Context7, Figma)
3. For each selected MCP, asks which scope to install in:
   - **user** (recommended) — available across all projects
   - **local** — only in this project (`settings.local.json`)
4. Installs using official recommended commands

**Note:** Project scope is intentionally not offered since `.claude/settings.json` is tracked in git.

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
├── skills/
│   └── sample-skill/
│       └── SKILL.md
└── README.md
```

## Known Issues

- Plugin skill namespacing requires omitting the `name` field from SKILL.md
  frontmatter due to a [Claude Code bug](https://github.com/anthropics/claude-code/issues/17271).
  The directory name is used as the skill identifier instead.
