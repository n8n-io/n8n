---
name: n8n:setup-mcps
description: >-
  Configure MCP servers for n8n development in OpenCode. Use when the user says
  /setup-mcps or asks to set up MCP servers for n8n.
---

# MCP Setup for n8n Development in OpenCode

Configure commonly used MCP servers for n8n engineers using OpenCode MCP config.

## Instructions

1. Check which MCPs are already configured by running, if available:

```bash
opencode mcp list
```

Parse by URL or command, not just server name. Skip any MCP whose URL is already
present.

Known MCP URLs:

- Linear: `https://mcp.linear.app/mcp`
- Notion: `https://mcp.notion.com/mcp`
- Context7: `https://mcp.context7.com/mcp`
- Figma: `https://mcp.figma.com/mcp`

2. Ask the user which unconfigured MCPs they want to add. If all are already
   configured, tell the user and stop.

| Option | Label | Description |
|--------|-------|-------------|
| Linear | `Linear` | Linear ticket management with OAuth |
| Notion | `Notion` | Notion workspace integration with OAuth |
| Context7 | `Context7` | Library documentation lookup |
| Figma | `Figma` | Figma design integration with OAuth |

3. Ask once whether to install in user or project scope.

| Scope | Config path | When to use |
|-------|-------------|-------------|
| user | `~/.config/opencode/opencode.json` | Default. Available in all projects. |
| project | `./opencode.json` | Only when the user explicitly wants repo-local config. |

4. Add the selected MCP entries under the `mcp` object in the selected config.
   Preserve existing config keys and existing MCP entries.

```json
{
  "mcp": {
    "linear": {
      "type": "remote",
      "url": "https://mcp.linear.app/mcp",
      "enabled": true
    },
    "notion": {
      "type": "remote",
      "url": "https://mcp.notion.com/mcp",
      "enabled": true
    },
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "enabled": true
    },
    "figma": {
      "type": "remote",
      "url": "https://mcp.figma.com/mcp",
      "enabled": true
    }
  }
}
```

5. After editing config, tell the user to authenticate OAuth-backed servers with:

```bash
opencode mcp auth <server-name>
```

Use the configured server names, for example `linear`, `notion`, or `figma`.
Context7 does not require OAuth by default.
