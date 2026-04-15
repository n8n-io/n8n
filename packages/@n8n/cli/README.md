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

## Configuration

The CLI needs your n8n instance URL and an API key.

### Config file (recommended)

```bash
n8n-cli config set-url https://my-n8n.app.n8n.cloud
n8n-cli config set-api-key n8n_api_xxxxx
n8n-cli config show
```

Configuration is saved to `~/.n8n-cli/config.json` with restricted file permissions (`0600`).

### Environment variables

```bash
export N8N_URL=https://my-n8n.app.n8n.cloud
export N8N_API_KEY=n8n_api_xxxxx
```

### Inline flags

```bash
n8n-cli --url=https://my-n8n.app.n8n.cloud --api-key=n8n_api_xxxxx workflow list
```

### Resolution order

1. Command-line flags (`--url`, `--api-key`)
2. Environment variables (`N8N_URL`, `N8N_API_KEY`)
3. Config file (`~/.n8n-cli/config.json`)

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
