# audit

Generate a security audit report for your n8n instance.

## `audit`

```bash
n8n-cli audit
n8n-cli audit --categories=credentials,nodes
n8n-cli audit --format=json
```

| Flag | Description |
|------|-------------|
| `--categories` | Comma-separated categories: `credentials`, `database`, `nodes`, `filesystem`, `instance` |

Returns a security report covering the selected categories (or all by default).
