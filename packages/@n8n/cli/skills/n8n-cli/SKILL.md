---
name: n8n-cli
description: Use the n8n CLI to manage workflows, credentials, executions, and more on an n8n instance. Use when the user asks to interact with n8n, automate workflows, manage credentials, or operate their instance from the command line.
allowed-tools: Bash(n8n-cli:*), Bash(echo:*), Bash(cat:*), Read, Write
---

# n8n CLI

The `n8n-cli` command-line tool manages an n8n instance via its REST API.
It auto-detects piped output and switches to JSON, making it composable for scripts and LLM tool use.

## Setup

```bash
# Interactive login (saves to ~/.n8n-cli/config.json)
n8n-cli login

# Or configure directly
n8n-cli config set-url https://my-instance.n8n.cloud
n8n-cli config set-api-key n8n_api_...

# Or use environment variables (no config file needed)
export N8N_URL=https://my-instance.n8n.cloud
export N8N_API_KEY=n8n_api_...
```

## Global Flags

Every command supports these flags:

| Flag | Short | Description |
|------|-------|-------------|
| `--url` | `-u` | Instance URL (overrides config/env) |
| `--apiKey` | `-k` | API key (overrides config/env) |
| `--format` | `-f` | Output format: `table`, `json`, `id-only` |
| `--json` | | Shorthand for `--format=json` |
| `--jq` | | jq-style filter (implies `--json`), e.g. `'.[0].id'`, `'.[].name'` |
| `--quiet` | `-q` | Suppress output |
| `--no-header` | | Hide table headers (for `awk`/`cut` parsing) |
| `--debug` | | Print HTTP details to stderr |

**Auto-JSON:** When stdout is piped (not a TTY), output defaults to JSON automatically.

## Workflows

```bash
# List all workflows
n8n-cli workflow list

# Filter workflows
n8n-cli workflow list --active
n8n-cli workflow list --tag=production
n8n-cli workflow list --name="My Workflow"
n8n-cli workflow list --limit=5

# Get a single workflow (full JSON with nodes and connections)
n8n-cli workflow get <id>

# Extract just node names from a workflow
n8n-cli workflow get <id> --jq '.nodes[].name'

# Create a workflow from JSON
n8n-cli workflow create --file=workflow.json
cat workflow.json | n8n-cli workflow create --stdin

# Update a workflow
n8n-cli workflow update <id> --file=updated.json
cat updated.json | n8n-cli workflow update <id> --stdin

# Activate / deactivate
n8n-cli workflow activate <id>
n8n-cli workflow deactivate <id>

# Delete a workflow
n8n-cli workflow delete <id>

# Transfer to another project
n8n-cli workflow transfer <id> --project=<projectId>

# List tags on a workflow
n8n-cli workflow tags <id>
```

## Executions

```bash
# List recent executions
n8n-cli execution list
n8n-cli execution list --workflow=<id> --status=error --limit=10
# status options: canceled, error, running, success, waiting

# Get execution details
n8n-cli execution get <id>
n8n-cli execution get <id> --include-data   # includes full node I/O

# Retry a failed execution
n8n-cli execution retry <id>

# Stop a running execution
n8n-cli execution stop <id>

# Delete an execution
n8n-cli execution delete <id>
```

## Credentials

```bash
# List credentials
n8n-cli credential list

# Get credential metadata (not secrets)
n8n-cli credential get <id>

# Get the schema for a credential type (shows required fields)
n8n-cli credential schema notionApi
n8n-cli credential schema slackOAuth2Api

# Create a credential
n8n-cli credential create --type=notionApi --name='My Notion' --data='{"apiKey":"..."}'
n8n-cli credential create --type=notionApi --name='My Notion' --file=cred.json
cat cred.json | n8n-cli credential create --type=notionApi --name='My Notion' --stdin

# Delete / transfer
n8n-cli credential delete <id>
n8n-cli credential transfer <id> --project=<projectId>
```

**Tip:** Use `credential schema <type>` to discover required fields before creating.

## Projects

```bash
n8n-cli project list
n8n-cli project get <id>
n8n-cli project create --name="My Project"
n8n-cli project update <id> --name="New Name"
n8n-cli project delete <id>

# Team management
n8n-cli project members <id>
n8n-cli project add-member <id> --user=<userId> --role=<role>
n8n-cli project remove-member <id> --user=<userId>
```

## Tags

```bash
n8n-cli tag list
n8n-cli tag create --name=production
n8n-cli tag update <id> --name=staging
n8n-cli tag delete <id>
```

## Variables

```bash
n8n-cli variable list
n8n-cli variable create --key=API_ENDPOINT --value=https://api.example.com
n8n-cli variable update <id> --key=API_ENDPOINT --value=https://new-api.example.com
n8n-cli variable delete <id>
```

## Data Tables

```bash
# CRUD
n8n-cli data-table list
n8n-cli data-table get <id>
n8n-cli data-table create --name=Inventory --columns='[{"name":"item","type":"string"},{"name":"qty","type":"number"}]'
n8n-cli data-table delete <id>

# Row operations
n8n-cli data-table rows <id>
n8n-cli data-table add-rows <id> --file=rows.json
n8n-cli data-table update-rows <id> --file=rows.json
n8n-cli data-table upsert-rows <id> --file=rows.json
n8n-cli data-table delete-rows <id> --ids=row1,row2,row3

# All row commands support --stdin
cat rows.json | n8n-cli data-table add-rows <id> --stdin
```

## Users

```bash
n8n-cli user list
n8n-cli user get <id>
```

## Other

```bash
# Security audit
n8n-cli audit
n8n-cli audit --categories=credentials,nodes

# Source control
n8n-cli source-control pull

# View config
n8n-cli config show
```

## Composability Patterns

The CLI is designed to be piped and composed:

```bash
# Get all workflow IDs
n8n-cli workflow list --jq '.[].id'

# Get the name of the first workflow
n8n-cli workflow list --jq '.[0].name'

# Export a workflow to a file
n8n-cli workflow get 1234 --json > workflow-backup.json

# Find failing executions for a workflow
n8n-cli execution list --workflow=1234 --status=error --json

# Pipe workflow JSON for modification
n8n-cli workflow get 1234 --json | jq '.name = "Updated Name"' | n8n-cli workflow update 1234 --stdin

# Table output without headers for shell parsing
n8n-cli workflow list --no-header | awk '{print $1}'

# Debug API calls
n8n-cli workflow list --debug 2>debug.log
```

## Workflow JSON Structure

When creating or updating workflows, the JSON follows this structure:

```json
{
  "name": "My Workflow",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [250, 300],
      "parameters": {}
    },
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    }
  ],
  "connections": {
    "Start": {
      "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]]
    }
  }
}
```

Key points:
- `nodes[].type` follows the pattern `n8n-nodes-base.<nodeName>` for built-in nodes
- `connections` is keyed by source node name, with `main` output arrays
- Each connection specifies target `node`, `type` (usually `main`), and output `index`
- Use `workflow get <id> --json` to see real examples from the instance
