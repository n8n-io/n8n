# n8n CLI

Command-line interface for managing n8n workflows, credentials, and server processes.

## Commands

### Server

| Command | Description |
|---------|-------------|
| `n8n start` | Start the n8n server. Use `-o` to open the UI in a browser. |
| `n8n worker` | Start a worker process. Use `--concurrency=N` to control parallelism (default 10). |
| `n8n webhook` | Start the webhook process (production URLs only). |

### Workflow SDK (Code-Based Building)

Build, validate, and export workflows as TypeScript using the `@n8n/workflow-sdk`.

| Command | Description |
|---------|-------------|
| `n8n build:workflow` | Create or update a workflow from TypeScript SDK code. |
| `n8n validate:workflow` | Validate TypeScript SDK code without saving. |
| `n8n codegen:workflow` | Export an existing workflow as TypeScript SDK code. |

**`build:workflow`** parses `.ts` files through a two-stage validation pipeline
(graph structure + Zod schema), then saves via the standard workflow service.
Supports `--dry-run` for validation-only, `--strict` to treat warnings as errors,
`--id` to update an existing workflow, and `--name`/`--projectId` for new workflows.

```bash
# Validate a workflow file
n8n validate:workflow --input=my-workflow.ts

# Create a new workflow from code
n8n build:workflow --input=my-workflow.ts --name="My Workflow"

# Update an existing workflow
n8n build:workflow --input=my-workflow.ts --id=abc123

# Export a workflow to TypeScript
n8n codegen:workflow --id=abc123 --output=exported.ts

# Round-trip: export → validate → rebuild
n8n codegen:workflow --id=abc123 --output=test.ts
n8n validate:workflow --input=test.ts
n8n build:workflow --input=test.ts --name="Rebuilt"
```

### Workflow Management

| Command | Description |
|---------|-------------|
| `n8n list:workflow` | List workflows. Filter with `--active=true\|false`, use `--onlyId` for IDs only. |
| `n8n execute` | Execute a workflow by ID. |
| `n8n execute-batch` | Execute multiple workflows. Supports `--concurrency`, `--compare` for snapshot diffing. |
| `n8n publish:workflow` | Publish a workflow version. Use `--versionId` for a specific version. |
| `n8n unpublish:workflow` | Unpublish a workflow by `--id` or `--all`. |

### Import / Export

| Command | Description |
|---------|-------------|
| `n8n import:workflow` | Import workflows from JSON. Supports `--separate` for directory import. |
| `n8n import:credentials` | Import credentials from JSON. |
| `n8n import:entities` | Import database entities from JSON files. |
| `n8n export:workflow` | Export workflows to JSON. Use `--backup` for `--all --pretty --separate`. |
| `n8n export:credentials` | Export credentials. Use `--decrypted` for plain text (sensitive!). |
| `n8n export:nodes` | Export all node types to a JSON file. |
| `n8n export:entities` | Export database entities to JSON files. |

### Administration

| Command | Description |
|---------|-------------|
| `n8n audit` | Generate a security audit report. |
| `n8n license:info` | Print license information. |
| `n8n license:clear` | Clear the local license certificate. |
| `n8n user-management:reset` | Reset user management to default state. |
| `n8n mfa:disable` | Disable MFA for a user by `--email`. |
| `n8n ldap:reset` | Reset LDAP configuration. **Deletes LDAP-managed users.** |
| `n8n db:revert` | Revert the last database migration. |

### AI

| Command | Description |
|---------|-------------|
| `n8n ttwf:generate` | Generate workflows using the AI Text-to-Workflow builder. |

### MCP Server

n8n exposes an [MCP](https://modelcontextprotocol.io/) server that external
clients (Claude Desktop, Cursor, ChatGPT, or any MCP-compatible agent) can
connect to. The server provides three tools:

- **`search_workflows`** — Search and list workflows with filters
- **`get_workflow_details`** — Get full workflow detail including trigger info
- **`execute_workflow`** — Execute a workflow with structured inputs (chat, form, webhook)

Enable MCP access in Settings, then connect from any MCP client. For CLI access
to MCP tools without writing code, use
[mcp2cli](https://github.com/knowsuchagency/mcp2cli):

```bash
# List available MCP tools
mcp2cli --mcp https://your-n8n.com/mcp/sse --list

# Search workflows
mcp2cli --mcp https://your-n8n.com/mcp/sse search_workflows --query "my workflow"

# Execute a workflow
mcp2cli --mcp https://your-n8n.com/mcp/sse execute_workflow --workflowId abc123
```

## Flag Conventions

- Flags use `--camelCase` (e.g. `--dryRun`, `--projectId`)
- Common aliases: `-i` for `--input`, `-o` for `--output`
- Use `n8n <command> --help` for full flag documentation
- All commands connect directly to the database — no running server required
