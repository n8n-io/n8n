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

## Promotions

Move projects between instances through a Git repository. A **provider** holds
the credentials. An **environment** sets up one direction on a repository:
`promote` pushes to Git, `apply` imports from Git. The instance can have one
environment for each direction.

```bash
# 1. Create a provider. An SSH provider returns a public key to add as a deploy key.
#    The response carries the provider fields at the top level, so `.id` and
#    `.publicKey` both work with --jq and --format=id-only.
echo '{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}' \
  | n8n-cli promotion-provider create --stdin --json > provider.json
jq -r '.id' provider.json          # use as providerId in step 2
jq -r '.publicKey' provider.json   # add to the repository as a deploy key

# 2. Create an environment on that provider for each direction you need.
n8n-cli promotion-environment create --file=promote.json
n8n-cli promotion-environment create --file=apply.json

# 3. Connect each environment before you use it.
n8n-cli promotion-environment connect <promoteId>
n8n-cli promotion-environment connect <applyId>

# 4. Promote from this instance, or apply to it.
n8n-cli promotion-environment promote <promoteId>
n8n-cli promotion-environment apply <applyId>
```

GitLab setup. A GitLab provider lists its repositories and branches, so read the
remote URL and the branch names from it instead of guessing them:

```bash
# gitlab-provider.json:
# {"name":"GitLab","type":"gitlab","config":{"schemaVersion":1,"baseUrl":"https://gitlab.example.com"},
#  "auth":{"authType":"token","password":"<GitLab access token>"}}
n8n-cli promotion-provider create --file=gitlab-provider.json --format=id-only   # providerId
n8n-cli promotion-provider list-repositories <providerId> --search=flows --json  # remoteUrl, fullPath
n8n-cli promotion-provider list-branches <providerId> <fullPath> --json          # isDefault marks the default branch
# Put remoteUrl and a branch name in the environment JSON, then create and connect as above.
```

Apply a reviewed commit only:

```bash
# Review the changes. Take the commit SHA from the same response as the rows:
# a second request can read a newer commit.
n8n-cli promotion-environment list-changes <projectId> apply --sort=updatedAt --order=desc --json > reviewed-changes.json
jq '{commitSha, changes}' reviewed-changes.json
# The branch comes from the Apply environment.
n8n-cli promotion-environment get <applyId> --jq '.settings.branchName'

n8n-cli promotion-environment apply <applyId> \
  --expected-environment-id=<applyId> --expected-branch=<branch> --expected-commit-sha=<full sha>
# Exit 3: the source changed since the review. Review again.
# Exit 4: preflight found missing bindings, access requirements, or conflicts. Resolve them,
# then run the apply-continue command that apply printed:
n8n-cli promotion-environment apply-continue <applyId> \
  --expected-environment-id=<applyId> --expected-branch=<branch> --expected-commit-sha=<full sha>
# To also apply destructive data table changes and delete the team projects that the
# package does not hold, add --confirm-destructive-changes.
```

Environment JSON for step 2 (`promote.json`; `apply.json` uses `"direction":"apply"`
and `"settings":{"schemaVersion":1,"branchName":"main"}`):

```json
{
  "name": "Production",
  "scope": "instance",
  "providerId": "prov-1",
  "remote": { "schemaVersion": 1, "remoteUrl": "git@github.com:acme/flows.git" },
  "direction": "promote",
  "settings": { "schemaVersion": 1, "baseBranchName": "main", "createBranchOnPromotion": false }
}
```

```bash
# Providers
n8n-cli promotion-provider list
n8n-cli promotion-provider get <id>          # re-read the public key; the list omits it
echo '{"name":"New name"}' | n8n-cli promotion-provider update <id> --stdin
n8n-cli promotion-provider delete <id>       # fails while an environment uses it
n8n-cli promotion-provider list-repositories <id> --search=<text> --limit=20   # GitLab only
n8n-cli promotion-provider list-branches <id> <fullPath or repository id>      # GitLab only

# Environments
n8n-cli promotion-environment list --scope=instance --direction=promote
n8n-cli promotion-environment list --provider=<providerId>
n8n-cli promotion-environment get <id>
echo '{"name":"New name"}' | n8n-cli promotion-environment update <id> --stdin
n8n-cli promotion-environment delete <id>
n8n-cli promotion-environment disconnect <id>

# Change the settings. The write replaces the whole settings object,
# so send every setting you want to keep. Direction and scope cannot change.
echo '{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":false}}' \
  | n8n-cli promotion-environment update <promoteId> --stdin

# Link projects to a "projects"-scoped environment
n8n-cli promotion-environment list-projects <id>
n8n-cli promotion-environment add-project <id> <projectId>
n8n-cli promotion-environment remove-project <id> <projectId>
```

Key points:
- Pass every JSON body through `--stdin` or `--file`, never through a flag. This
  keeps credentials off the command line.
- `type` is `git` or `gitlab`. For `git`, `authType` is `ssh-key` or `token`, and
  `token` means an HTTP(S) username and password. For `gitlab`, `authType` is
  `token` only: `password` is the GitLab access token (`read_api` and
  `write_repository`), `config.baseUrl` is required, and n8n ignores `username`.
  `publicKey` is `null` for a `token` provider.
- `list-repositories` and `list-branches` work for `gitlab` providers only. A `git`
  provider fails with an error. Pass the repository as plain `fullPath`
  (`acme/flows`), `id`, or an environment's `remote.repositoryPath`. Do not URL-encode it.
  Read `remoteUrl`, `fullPath` and branch names from `--json` output: the table
  shortens values longer than 60 characters to `...`.
- `createBranchOnPromotion` is always required in promote settings.
- `promote` and `apply` work on an `instance` environment of their direction
  only, and need it connected first. Connecting one environment does not make another
  ready.
- A project can have one environment for each direction. A direction without a
  project environment uses the instance environment.
- `apply` and `apply-continue` import nothing on exit code `3` (`source-changed`)
  or `4` (`blocked`). Check `$?`, or the `status` field in JSON output, before you
  read `counts`. With `--json`, a `blocked` result lists what is missing under
  `preflight`.
- The `--expected-*` flags go together: pass all three or none. The commit SHA
  must be the full SHA.
- API key scopes for this group are named `promotions:*`. `promote` also needs
  `variable:list` when the workflows reference variables.

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
