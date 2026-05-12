# variable

Manage n8n environment variables.

## `variable list`

List all variables.

```bash
n8n-cli variable list
```

## `variable create`

Create a variable.

```bash
n8n-cli variable create --key=API_ENDPOINT --value=https://api.example.com
```

## `variable update`

Update a variable's value.

```bash
n8n-cli variable update var-1 --key=API_ENDPOINT --value=https://new-api.example.com
```

## `variable delete`

Delete a variable.

```bash
n8n-cli variable delete var-1
```
