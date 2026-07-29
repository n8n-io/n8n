# credential

Manage n8n credentials.

## `credential list`

List all credentials (metadata only, no secrets).

```bash
n8n-cli credential list
n8n-cli credential list --format=json
```

## `credential get`

Get credential metadata by ID (no secrets returned).

```bash
n8n-cli credential get 42
```

## `credential schema`

Get the JSON schema for a credential type's data fields.

```bash
n8n-cli credential schema notionApi
n8n-cli credential schema slackOAuth2Api --format=json
```

## `credential create`

Create a new credential.

```bash
n8n-cli credential create --type=notionApi --name="My Notion" --data='{"apiKey":"..."}'
```

| Flag | Description |
|------|-------------|
| `--type` | Credential type name (required) |
| `--name` | Display name (required) |
| `--data` | Credential data as JSON string (required) |

## `credential delete`

Delete a credential.

```bash
n8n-cli credential delete 42
```

## `credential transfer`

Transfer a credential to another project.

```bash
n8n-cli credential transfer 42 --project=proj-abc
```
