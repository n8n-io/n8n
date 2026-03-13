# Local Development Setup

This guide walks through setting up a full n8n development environment from source — with hot-reload, debugging, and test infrastructure.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.15 LTS | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| pnpm | 9.x | `corepack enable && corepack prepare pnpm@9 --activate` |
| Git | 2.x | |
| Python | 3.11+ | Required for node-gyp (native modules) |
| Build tools | — | `apt install build-essential` / `xcode-select --install` |

> **Windows users:** Use WSL2 (Ubuntu 22.04 recommended) for best compatibility.

---

## Step 1 – Clone the Repository

```bash
git clone https://github.com/abhilashjaiswal0110/n8n-repo.git
cd n8n-repo
```

---

## Step 2 – Enable Corepack and Install pnpm

```bash
corepack enable
corepack prepare pnpm@9 --activate
pnpm --version  # Should print 9.x
```

---

## Step 3 – Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies across all packages at once.

---

## Step 4 – Build All Packages

```bash
pnpm build > build.log 2>&1
tail -n 20 build.log
```

> Always redirect build output to a file. First build takes ~5-10 minutes.

---

## Step 5 – Start the Development Server

```bash
pnpm dev
```

This starts:
- **Backend API** at http://localhost:5678
- **Frontend dev server** (Vite) at http://localhost:8080 with hot-reload

---

## Step 6 – Verify the Setup

Open **http://localhost:5678** in your browser. You should see the n8n setup screen.

---

## VS Code Setup

A pre-configured VS Code workspace is included in [`.vscode/`](../.vscode/).

Recommended extensions (install via Extensions panel):
- **Volar** (Vue Language Features)
- **TypeScript Vue Plugin (Volar)**
- **ESLint**
- **Prettier**
- **Biome** (formatting)

### Debugging

See [`.vscode/DEBUGGER.md`](../.vscode/DEBUGGER.md) for launch configurations that attach to both frontend and backend.

---

## Project Structure

```
n8n-repo/
├── packages/
│   ├── cli/                    # Express server, REST API, CLI
│   ├── core/                   # Workflow execution engine
│   ├── workflow/               # Core interfaces and types
│   ├── nodes-base/             # 400+ built-in integration nodes
│   ├── @n8n/
│   │   ├── api-types/          # Shared FE/BE TypeScript interfaces
│   │   ├── db/                 # TypeORM entities and migrations
│   │   ├── config/             # Centralised configuration
│   │   ├── nodes-langchain/    # AI/LangChain nodes
│   │   ├── di/                 # Dependency injection container
│   │   └── i18n/               # Internationalisation strings
│   └── frontend/
│       ├── editor-ui/          # Vue 3 workflow editor
│       └── @n8n/design-system/ # Shared Vue component library
├── docker/                     # Docker images and Compose files
├── docs/                       # ← You are here
├── agents/                     # Claude Code agent skills
└── scripts/                    # Build and release scripts
```

---

## Running Tests

```bash
# All unit tests
pnpm test

# Tests for changed files only (fastest during development)
pnpm test:affected

# Tests in a specific package
cd packages/cli
pnpm test

# E2E tests (requires running n8n instance)
pnpm --filter=n8n-playwright test:local
```

---

## Code Quality Commands

```bash
# Lint (run from package directory for faster feedback)
cd packages/cli && pnpm lint

# Type checking (run before committing)
pnpm typecheck

# Format with Biome
pnpm format
```

---

## Database Setup

n8n defaults to SQLite for local development — no extra setup required. Data is stored in `~/.n8n/`.

### Using PostgreSQL Locally

```bash
# Start Postgres with Docker
docker run -d \
  --name n8n-postgres \
  -e POSTGRES_USER=n8n \
  -e POSTGRES_PASSWORD=n8n \
  -e POSTGRES_DB=n8n \
  -p 5432:5432 \
  postgres:15

# Configure n8n to use it
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=localhost
export DB_POSTGRESDB_USER=n8n
export DB_POSTGRESDB_PASSWORD=n8n
export DB_POSTGRESDB_DATABASE=n8n

pnpm dev
```

---

## Creating a Custom Node

```bash
# Use the node development CLI
cd packages/node-dev
pnpm n8n-node-dev new
```

Follow the prompts to scaffold a new integration node. See the [n8n node development docs](https://docs.n8n.io/integrations/creating-nodes/) for a full guide.

---

## Common Development Tasks

### Add a New API Endpoint

1. Define the request/response types in `packages/@n8n/api-types/src/`.
2. Add the controller method in `packages/cli/src/controllers/`.
3. Register the route in the appropriate router.
4. Write a Jest test in `packages/cli/test/`.

### Add a Frontend Feature

1. Create or update a component in `packages/frontend/editor-ui/src/components/`.
2. Add i18n strings to `packages/@n8n/i18n/src/locales/en.json`.
3. Update the relevant Pinia store if state changes are needed.
4. Write a Vitest unit test.

---

## Troubleshooting Setup Issues

See [Troubleshooting](./TROUBLESHOOTING.md) for common build and runtime errors.

For setup-specific issues, check:
- Node.js version: `node --version` (must be 20.15+)
- pnpm version: `pnpm --version` (must be 9.x)
- `build.log` for compile errors
- `pnpm why <package>` for dependency conflicts
