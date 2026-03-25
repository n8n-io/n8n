# @n8n/cli

> **Beta** — Client CLI for n8n. Manage workflows, executions, credentials, and more from the terminal.

A lightweight, zero-dependency CLI that talks to any n8n instance via its public API. Designed for humans, scripts, and AI coding agents alike.

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

# Non-interactive — all flags provided
n8n-cli login --url https://my-n8n.example.com --name production
```

The CLI opens your browser for OAuth authorization. After approving, tokens are saved locally and refreshed automatically.

### API key

```bash
# Pass API key directly
n8n-cli login --url https://my-n8n.example.com --api-key n8n_api_xxxxx --name prod

# Or configure manually
n8n-cli config set-url https://my-n8n.app.n8n.cloud
n8n-cli config set-api-key n8n_api_xxxxx
```

### Environment variables

```bash
export N8N_URL=https://my-n8n.app.n8n.cloud
export N8N_API_KEY=n8n_api_xxxxx
```

### Resolution order

1. Command-line flags (`--url`, `--api-key`)
2. Environment variables (`N8N_URL`, `N8N_API_KEY`)
3. Active context config (`~/.n8n-cli/config.json`)

## Contexts (Multi-Instance)

The CLI supports named contexts for working with multiple n8n instances:

```bash
# Login creates a context (prompts for name, or use --name)
n8n-cli login                                    # prompts for URL and context name
n8n-cli login --url https://prod.example.com     # prompts for context name
n8n-cli login --name production                  # auto-detects URL default

# List all contexts (* marks active)
n8n-cli context list

# Switch active context
n8n-cli context use staging

# Show current context details
n8n-cli context show

# Rename / delete contexts
n8n-cli context rename old-name new-name
n8n-cli context delete staging

# Logout
n8n-cli logout                    # current context
n8n-cli logout --name staging     # specific context
n8n-cli logout --all              # all contexts
```

## Commands

| Topic | Commands |
|-------|----------|
| `workflow` | `list`, `get`, `create`, `update`, `delete`, `activate`, `deactivate`, `tags`, `transfer` |
| `execution` | `list`, `get`, `retry`, `stop`, `delete` |
| `credential` | `list`, `get`, `schema`, `create`, `delete`, `transfer` |
| `project` | `list`, `get`, `create`, `update`, `delete`, `members`, `add-member`, `remove-member` |
| `tag` | `list`, `create`, `update`, `delete` |
| `variable` | `list`, `create`, `update`, `delete` |
| `data-table` | `list`, `get`, `create`, `delete`, `rows`, `add-rows`, `update-rows`, `upsert-rows`, `delete-rows` |
| `user` | `list`, `get` |
| `config` | `set-url`, `set-api-key`, `show` |
| `source-control` | `pull` |
| `skill` | `install` |
| `audit` | _(top-level)_ |
| `login` / `logout` | _(top-level)_ |

Every command supports `--help` for detailed usage.

## Output formats

All commands support three output formats via `--format`:

| Format | Flag | Use case |
|--------|------|----------|
| Table | `--format=table` (default) | Human-readable terminal output |
| JSON | `--format=json` | Piping to `jq`, programmatic use |
| ID-only | `--format=id-only` | Piping to `xargs`, scripting |

```bash
# Human-readable table
n8n-cli workflow list

# JSON for scripts
n8n-cli workflow list --format=json | jq '.[] | select(.active) | .id'

# Pipe IDs into another command
n8n-cli workflow list --format=id-only | xargs -I{} n8n-cli workflow deactivate {}
```

## AI agent integration

The CLI ships with a skill file that teaches AI coding agents how to use it.

```bash
# Claude Code (project-level)
n8n-cli skill install

# Claude Code (global)
n8n-cli skill install --global

# Cursor
n8n-cli skill install --target=cursor

# Windsurf
n8n-cli skill install --target=windsurf
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Lint & typecheck
pnpm lint
pnpm typecheck
```

## License

See [LICENSE.md](LICENSE.md) for details.
