# execution

Manage workflow executions.

## `execution list`

List executions with optional filters.

```bash
n8n-cli execution list
n8n-cli execution list --workflow=1234
n8n-cli execution list --status=error --limit=10
```

| Flag | Description |
|------|-------------|
| `--workflow` | Filter by workflow ID |
| `--status` | Filter by status: `canceled`, `error`, `running`, `success`, `waiting` |
| `--limit` | Maximum number of results |

## `execution get`

Get execution details.

```bash
n8n-cli execution get 5678
n8n-cli execution get 5678 --include-data --format=json
```

| Flag | Description |
|------|-------------|
| `--include-data` | Include full node execution data |

## `execution retry`

Retry a failed execution.

```bash
n8n-cli execution retry 5678
```

## `execution stop`

Stop a running execution.

```bash
n8n-cli execution stop 5678
```

## `execution delete`

Delete an execution.

```bash
n8n-cli execution delete 5678
```
