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

## Available Commands

- `/n8n:triage PAY-XXX` - Analyze and triage a Linear issue
- `/n8n:plan PAY-XXX` - Create implementation plan

## Quick Reference

- `/n8n:conventions` - Load detailed conventions guide (optional - agents already know n8n patterns)

## Workflow

**Recommended approach:**
1. `/n8n:triage PAY-123` → Investigate root cause and severity (optional)
2. `/n8n:plan PAY-123` → Create detailed implementation plan
3. Review the plan in chat
4. Say "implement it" or "go ahead" → I'll launch the developer agent
5. Implementation proceeds with full context from the plan

## Agents

- **n8n:developer** - Full-stack n8n development (frontend/backend/nodes)
- **n8n:linear-issue-triager** - Issue investigation and analysis

## Skills

- **n8n:conventions** - Quick reference pointing to /AGENTS.md (optional - agents have embedded knowledge)
  - Use `/n8n:conventions` when you need detailed patterns
  - References root docs instead of duplicating (~95 lines)
