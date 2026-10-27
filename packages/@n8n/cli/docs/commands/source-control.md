# source-control

Interact with n8n's source control integration.

## `source-control pull`

Pull changes from the remote Git repository.

```bash
n8n-cli source-control pull
n8n-cli source-control pull --force
```

| Flag | Description |
|------|-------------|
| `--force` | Force pull, overwriting local changes |

Requires the Source Control feature to be licensed and connected to a Git remote.
