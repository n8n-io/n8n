# Claude Code Configuration

This directory contains shared Claude Code configuration for the n8n team.

All skills, agents, and commands live under the `n8n` plugin at
`.claude/plugins/n8n/` for `n8n:` namespacing. See
[plugin README](plugins/n8n/README.md) for full details.

## Setup

### Linear MCP Server

The Linear MCP server uses OAuth authentication. To connect:

1. Start Claude Code in this repository
2. Run `/mcp` command
3. Click the Linear authentication link in your browser
4. Authorize with your Linear account

You only need to do this once per machine.

### Permissions

Configure tool permissions in your global Claude Code settings (`~/.claude/settings.json`), not in this repo. This allows each developer to customize their own approval preferences.

To auto-approve Linear MCP tools, add to your global settings:

```json
{
  "permissions": {
    "allow": [
      "mcp__linear-server__*"
    ]
  }
}
```

**Note:** For GitHub/git operations, we use `gh` CLI and `git` commands instead of GitHub MCP.

## Plugin

All skills, commands, and agents are auto-discovered from
`.claude/plugins/n8n/`. They get the `n8n:` namespace prefix automatically
(e.g. `n8n:create-pr`, `/n8n:plan`, `n8n:developer`).

See [plugin README](plugins/n8n/README.md) for structure and design decisions.
