# Using n8n CLI with AI Agents

The n8n CLI is designed from the ground up to work with AI coding agents like Claude Code, Cursor, and Windsurf.

## Setup for AI agents

Add this single line to your `CLAUDE.md` (or equivalent agent config):

```
Use `n8n-cli` to manage n8n workflows, executions, and credentials.
Run `n8n-cli --help` to see available commands.
```

That's it. AI agents understand CLI tools instinctively — `--help` teaches them everything.

## Why CLI over MCP or raw HTTP?

| Approach | Agent support | Composability | Overhead |
|----------|--------------|---------------|----------|
| CLI | Universal (every agent runs bash) | Pipes, `jq`, `grep`, `xargs` | Zero |
| MCP | Requires MCP support | None | Handshake, JSON-RPC |
| Raw `curl` | Universal but verbose | Manual JSON parsing | Auth headers, pagination |

## Common patterns for AI agents

### List active workflows and filter

```bash
n8n-cli workflow list --active --format=json | jq '.[].name'
```

### Export a workflow to file

```bash
n8n-cli workflow get 1234 --format=json > my-workflow.json
```

### Batch operations with xargs

```bash
# Deactivate all workflows
n8n-cli workflow list --format=id-only | xargs -I{} n8n-cli workflow deactivate {}

# Delete all failed executions
n8n-cli execution list --status=error --format=id-only | xargs -I{} n8n-cli execution delete {}
```

### Check execution status

```bash
n8n-cli execution list --workflow=1234 --status=error --limit=5 --format=json
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Authentication failure |

AI agents can branch on `$?` for error handling.

## Output conventions

- **Data goes to stdout** — clean for piping
- **Errors go to stderr** — don't contaminate data streams
- **`--quiet` flag** — suppress non-essential output for scripting
