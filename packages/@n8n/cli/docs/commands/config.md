# config

Manage CLI configuration (URL, API key).

## `config set-url`

Set the n8n instance URL.

```bash
n8n-cli config set-url https://my-n8n.app.n8n.cloud
n8n-cli config set-url http://localhost:5678
```

## `config set-api-key`

Set the API key for authentication.

```bash
n8n-cli config set-api-key n8n_api_xxxxx
```

The API key is stored in `~/.n8n-cli/config.json` with `0600` file permissions.

## `config show`

Show current configuration.

```bash
n8n-cli config show
# URL:      https://my-n8n.app.n8n.cloud
# API Key:  n8n_api_xxxx...xxxx
```

The API key is partially masked for security.
