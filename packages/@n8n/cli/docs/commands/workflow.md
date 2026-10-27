# workflow

Manage n8n workflows.

## `workflow list`

List workflows with optional filters.

```bash
n8n-cli workflow list
n8n-cli workflow list --active
n8n-cli workflow list --tag=production
n8n-cli workflow list --name="Email Campaign"
n8n-cli workflow list --limit=10 --format=json
```

| Flag | Description |
|------|-------------|
| `--active` | Only show active workflows |
| `--tag` | Filter by tag name |
| `--name` | Filter by workflow name |
| `--limit` | Maximum number of results |

## `workflow get`

Get a specific workflow by ID.

```bash
n8n-cli workflow get 1234
n8n-cli workflow get 1234 --format=json > workflow.json
```

## `workflow create`

Create a workflow from a JSON file.

```bash
n8n-cli workflow create --file=workflow.json
cat workflow.json | n8n-cli workflow create --stdin
```

## `workflow update`

Update a workflow from a JSON file.

```bash
n8n-cli workflow update 1234 --file=workflow.json
```

## `workflow delete`

Delete a workflow.

```bash
n8n-cli workflow delete 1234
```

## `workflow activate`

Activate (publish) a workflow.

```bash
n8n-cli workflow activate 1234
```

## `workflow deactivate`

Deactivate a workflow.

```bash
n8n-cli workflow deactivate 1234
```

## `workflow tags`

Get or set tags on a workflow.

```bash
# Get tags
n8n-cli workflow tags 1234

# Set tags (by tag IDs)
n8n-cli workflow tags 1234 --set=tagId1,tagId2
```

## `workflow transfer`

Transfer a workflow to another project.

```bash
n8n-cli workflow transfer 1234 --project=proj-abc
```
