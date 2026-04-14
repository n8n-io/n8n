---
description: >-
  Configure MCP servers for n8n development. Use when the user says /setup-mcps
  or asks to set up MCP servers for n8n.
---

# MCP Setup for n8n Development

Configure commonly used MCP servers for n8n engineers.

## Instructions

1. First, check which MCPs are already configured by running:
```bash
claude mcp list
```
Parse the output and match by **URL/command**, not server name (users may have
used different names). The URLs to check for:
- Linear: `mcp.linear.app`
- Notion: `mcp.notion.com`
- Context7: `ctx7` or `context7-mcp`
- Figma: `mcp.figma.com`

Skip any MCP whose URL/command is already present (regardless of scope or name).

2. Present the MCP selection menu using `AskUserQuestion` with `multiSelect: true`.
Only show MCPs that are **not** already configured. If all are already configured,
inform the user and skip the menu.

| Option | Label | Description |
|--------|-------|-------------|
| Linear | `Linear` | Linear ticket management (HTTP, OAuth — opens browser to authenticate) |
| Notion | `Notion` | Notion workspace integration (HTTP, OAuth — opens browser to authenticate) |
| Context7 | `Context7` | Library documentation lookup (OAuth setup via CLI) |
| Figma | `Figma` | Figma design integration (HTTP, OAuth — opens browser to authenticate) |

3. Process each selected MCP **one at a time** in a loop. For each MCP:
   a. Ask the user via `AskUserQuestion`: "Where should **{MCP name}** be installed?"
      - **user** (default, recommended) — available in all projects
      - **local** — only in this project
   b. Run the install command for that MCP with the chosen scope
   c. Then move to the next MCP and ask again

Do NOT batch the scope question — ask separately for each MCP.
Do NOT offer project scope — it modifies `.claude/settings.json` which is tracked in git.

Commands per MCP:

### Linear
```bash
claude mcp add -s {scope} linear-server --transport http https://mcp.linear.app/mcp
```
After adding, tell the user to run `/mcp` in their next session to authenticate.

### Notion
```bash
claude mcp add -s {scope} notion --transport http https://mcp.notion.com/mcp
```
After adding, tell the user to run `/mcp` in their next session to authenticate.

### Context7
Tell the user to run this command themselves (it handles auth via OAuth automatically):

```
npx ctx7 setup --claude
```

### Figma
```bash
claude mcp add -s {scope} figma --transport http https://mcp.figma.com/mcp
```
After adding, tell the user to run `/mcp` in their next session to authenticate.

5. After running the commands, confirm which MCPs were configured and note any
   manual steps remaining (authentication via `/mcp`, Context7 setup).
