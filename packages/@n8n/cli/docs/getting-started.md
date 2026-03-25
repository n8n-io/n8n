# Getting Started

## Installation

```bash
# Use directly with npx (zero install)
npx @n8n/cli workflow list

# Or install globally
npm install -g @n8n/cli
```

## Authentication

### OAuth login (recommended)

```bash
# Interactive — prompts for URL and context name, opens browser
n8n-cli login
```

The CLI will prompt for:
1. **Instance URL** — defaults to `http://localhost:5678`
2. **Context name** — defaults to the URL hostname (e.g. `localhost`)

Then it opens your browser for OAuth authorization. After approving, tokens are saved and refreshed automatically.

```bash
# Non-interactive — provide all flags
n8n-cli login --url https://my-n8n.example.com --name production
```

### API key

```bash
# Pass API key via flag
n8n-cli login --api-key n8n_api_xxxxx

# Or configure manually
n8n-cli config set-url https://my-n8n.app.n8n.cloud
n8n-cli config set-api-key n8n_api_xxxxx

# Verify
n8n-cli config show
```

Configuration is saved to `~/.n8n-cli/config.json` with restricted file permissions (`0600`).

### Environment variables

```bash
export N8N_URL=https://my-n8n.app.n8n.cloud
export N8N_API_KEY=n8n_api_xxxxx
```

### Resolution order

The CLI resolves configuration in this priority order:

1. Command-line flags (`--url`, `--api-key`)
2. Environment variables (`N8N_URL`, `N8N_API_KEY`)
3. Active context config (`~/.n8n-cli/config.json`)

## Your first commands

```bash
# List all workflows
n8n-cli workflow list

# Get a specific workflow as JSON
n8n-cli workflow get 1234 --format=json

# List failed executions
n8n-cli execution list --status=error --limit=5

# Create a tag
n8n-cli tag create --name=production
```

## Output formats

Every command supports three output formats:

| Format | Flag | Use case |
|--------|------|----------|
| Table | `--format=table` (default) | Human-readable terminal display |
| JSON | `--format=json` | Piping to `jq`, programmatic use |
| ID-only | `--format=id-only` | Piping to `xargs`, scripting |

```bash
# Human reads a table
n8n-cli workflow list

# AI agent or script gets JSON
n8n-cli workflow list --format=json | jq '.[] | select(.active) | .id'

# Pipe IDs to deactivate all workflows
n8n-cli workflow list --format=id-only | xargs -I{} n8n-cli workflow deactivate {}
```

## AI agent skills

The CLI ships with a skill that teaches AI coding agents how to use `n8n-cli`.

```bash
# Claude Code (installs to .claude/skills/n8n-cli/ in the current project)
n8n-cli skill install

# Claude Code (global — installs to ~/.claude/skills/n8n-cli/)
n8n-cli skill install --global

# Cursor (appends to .cursorrules)
n8n-cli skill install --target=cursor

# Windsurf (appends to .windsurfrules)
n8n-cli skill install --target=windsurf
```

Then use `/n8n-cli` in Claude Code to load the skill.

## Getting help

Every command has built-in help:

```bash
n8n-cli --help
n8n-cli workflow --help
n8n-cli workflow list --help
```
