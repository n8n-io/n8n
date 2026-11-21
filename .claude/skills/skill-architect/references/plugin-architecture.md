# Plugin Architecture: Creating, Packaging, and Distributing

Complete guide to Claude Code plugins — the distribution mechanism for skills, hooks, MCP servers, and agents.

**Last updated**: March 2026

---

## What is a Plugin?

A plugin is a **self-contained directory** that extends Claude Code with custom functionality. It can include any combination of:
- Skills (domain knowledge)
- Agents (subagent definitions)
- Commands (slash commands)
- Hooks (lifecycle automation)
- MCP Servers (external tool integration)
- Settings (default configuration)

The key distinction: **skills are for expertise, plugins are for distribution.**

---

## Plugin vs Standalone

| Approach | Skill Names | Best For |
|----------|------------|----------|
| **Standalone** (`.claude/skills/`) | `/hello` | Personal workflows, project-specific |
| **Plugin** (`.claude-plugin/plugin.json`) | `/plugin-name:hello` | Team sharing, community distribution |

When a skill lives inside a plugin, it gets **namespaced** with the plugin name. The colon syntax (`plugin-name:skill-name`) prevents naming collisions.

---

## Plugin Directory Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest — ONLY this goes here
├── skills/                  # Skill directories
│   └── my-skill/
│       ├── SKILL.md
│       └── references/
├── agents/                  # Agent definitions (markdown)
│   └── reviewer.md
├── commands/                # Slash commands (markdown)
│   └── review-pr.md
├── hooks/
│   └── hooks.json           # Hook configuration
├── scripts/                 # Hook and utility scripts
│   └── format.sh
├── settings.json            # Default settings when plugin enabled
├── .mcp.json                # MCP server configurations
├── .lsp.json                # LSP server configurations (optional)
└── README.md
```

**Critical rule**: Only `plugin.json` goes inside `.claude-plugin/`. All other directories must be at the plugin root.

---

## Plugin Manifest (`plugin.json`)

### Minimal

```json
{
  "name": "my-plugin"
}
```

The manifest is technically optional — if omitted, Claude Code auto-discovers components and derives the name from the directory.

### Full Schema

```json
{
  "name": "my-plugin",
  "version": "1.2.0",
  "description": "Brief description of what this plugin does",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://github.com/you"
  },
  "homepage": "https://docs.example.com/my-plugin",
  "repository": "https://github.com/you/my-plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "commands": ["./custom/commands/special.md"],
  "agents": "./custom/agents/",
  "skills": "./custom/skills/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "outputStyles": "./styles/",
  "lspServers": "./.lsp.json"
}
```

Only `name` is required when the file exists.

---

## Plugin Components

### Skills in Plugins

Same as standalone skills. Place each in `skills/<name>/SKILL.md`. They follow all the same rules (frontmatter, progressive disclosure, references).

### Agents in Plugins

Agent definitions are markdown files in `agents/`:

```markdown
---
name: code-reviewer
description: Reviews code for quality issues
---

You are a code reviewer. Focus on...
```

### Commands in Plugins

Slash commands are markdown files in `commands/`:

```markdown
---
name: review-pr
description: Review the current PR
argument-hint: "[PR number]"
---

Review the current pull request...
```

### Hooks in Plugins

Configure in `hooks/hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "prompt",
        "prompt": "Check if this bash command is safe to run"
      }]
    }]
  }
}
```

The `${CLAUDE_PLUGIN_ROOT}` variable resolves to the absolute path of the plugin directory.

### MCP Servers in Plugins

Configure in `.mcp.json` at plugin root:

```json
{
  "my-server": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "API_KEY": "${API_KEY}"
    }
  }
}
```

Plugin MCP servers start automatically when the plugin is enabled.

---

## Testing Locally

```bash
# Run Claude Code with your plugin loaded
claude --plugin-dir ./my-plugin

# Load multiple plugins
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two
```

---

## Distribution Methods

### 1. Plugin Marketplace (Primary)

A marketplace is a **git repository** with `.claude-plugin/marketplace.json`:

```json
{
  "name": "company-tools",
  "owner": { "name": "DevTools Team" },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting",
      "version": "2.1.0"
    },
    {
      "name": "security-scanner",
      "source": "github:org/security-plugin",
      "description": "Security scanning tools",
      "version": "1.0.0"
    }
  ]
}
```

**Plugin sources** can be: relative paths, GitHub repos, Git URLs, npm packages, or pip packages.

**Users install from marketplaces**:
```bash
# Add marketplace
/plugin marketplace add owner/repo
/plugin marketplace add https://gitlab.com/company/plugins.git
/plugin marketplace add ./local-marketplace

# Install plugin from marketplace
/plugin install code-formatter@company-tools
claude plugin install code-formatter@company-tools --scope project
```

### 2. Official Plugin Directory

Anthropic maintains the official directory at `github.com/anthropics/claude-plugins-official` (8.7k+ stars).

**Submit your plugin**:
- Via `claude.ai/settings/plugins/submit`
- Or `platform.claude.com/plugins/submit`

### 3. Direct Installation

For team-wide adoption without a marketplace:

```json
// .claude/settings.json (project-level)
{
  "extraKnownMarketplaces": {
    "our-tools": {
      "source": { "source": "github", "repo": "our-org/claude-plugins" }
    }
  },
  "enabledPlugins": {
    "code-formatter@our-tools": true
  }
}
```

### 4. Community Registries

- `claude-plugins.dev` — Community CLI for one-command installs
- `claudepluginhub.com` — Community directory
- `github.com/hesreallyhim/awesome-claude-code` — Curated list

---

## Official Example Plugins

From `github.com/anthropics/claude-code/tree/main/plugins`:

| Plugin | Components | Description |
|--------|-----------|-------------|
| **code-review** | Command + 5 Agents | Parallel PR review with confidence scoring |
| **feature-dev** | Command + 3 Agents | 7-phase feature development workflow |
| **pr-review-toolkit** | Command + 6 Agents | Specialized PR review (comments, tests, types) |
| **plugin-dev** | Command + 3 Agents + 7 Skills | 8-phase plugin creation toolkit |
| **hookify** | Commands + Agent + Skill | Custom hook creation tool |
| **commit-commands** | Commands | Git workflow: `/commit`, `/commit-push-pr` |
| **security-guidance** | Hook (PreToolUse) | Security pattern monitoring |
| **ralph-wiggum** | Commands + Hook (Stop) | Autonomous iteration loops |

---

## Anti-Patterns

### Plugin for Personal Use
**Wrong**: Creating a full plugin for skills only you use.
**Right**: Keep personal skills in `.claude/skills/`. Plugins add packaging overhead that only pays off when sharing.

### Everything in `.claude-plugin/`
**Wrong**: Putting skills, hooks, scripts inside the `.claude-plugin/` directory.
**Right**: Only `plugin.json` goes in `.claude-plugin/`. Everything else at plugin root.

### No README
**Wrong**: Publishing a plugin without installation instructions.
**Right**: Include a README with setup steps, MCP server requirements, and example usage.

### Unpinned Dependencies
**Wrong**: MCP server with `"@modelcontextprotocol/sdk": "*"`.
**Right**: Pin major versions. MCP spec is still evolving; breaking changes happen.

---

## Checklist: Is My Plugin Ready?

```
□ plugin.json has name, version, description
□ README.md has installation and usage instructions
□ All skills follow skill-architect standards
□ All referenced files exist (no phantoms)
□ Hooks use ${CLAUDE_PLUGIN_ROOT} for paths
□ MCP servers have setup docs and env var requirements
□ Tested locally with claude --plugin-dir
□ No hardcoded absolute paths
□ License specified
```
