# Using n8n CLI in CI/CD Pipelines

The n8n CLI is built for automation. Use it in GitHub Actions, GitLab CI, or any CI/CD system.

## GitHub Actions example

```yaml
name: Deploy Workflows
on:
  push:
    branches: [main]
    paths: ['workflows/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install n8n CLI
        run: npm install -g @n8n/cli

      - name: Deploy workflows
        env:
          N8N_URL: ${{ secrets.N8N_URL }}
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
        run: |
          for file in workflows/*.json; do
            name=$(jq -r '.name' "$file")
            echo "Deploying: $name"
            n8n-cli workflow create --file="$file" --quiet
          done
```

## Environment variables

Set these in your CI environment:

| Variable | Description |
|----------|-------------|
| `N8N_URL` | Your n8n instance URL |
| `N8N_API_KEY` | API key with appropriate permissions |

## Common CI/CD tasks

### Export workflows for version control

```bash
# Export all workflows as JSON files
for id in $(n8n-cli workflow list --format=id-only); do
  n8n-cli workflow get "$id" --format=json > "workflows/${id}.json"
done
```

### Validate workflows exist after deploy

```bash
n8n-cli workflow list --format=json | jq 'length'
```

### Source control sync

```bash
n8n-cli source-control pull --force
```

## Tips

- Use `--quiet` flag to suppress non-essential output in pipelines
- Use `--format=json` for reliable parsing with `jq`
- Use `--format=id-only` for piping to other commands
- Check exit codes (`$?`) for error handling in scripts
