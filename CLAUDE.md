# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Development Commands

### Setup & Build
```bash
# Initial setup (requires Node.js 22.16+ and pnpm 10.2.1+)
pnpm install
pnpm build

# Clean reset (removes untracked files except .vscode, .idea, .env, .claude)
pnpm reset
```

### Development Workflows
```bash
# Full development mode (resource-intensive)
pnpm dev

# Backend-only development (excludes frontend packages)
pnpm dev:be

# Frontend-only development
pnpm dev:fe

# AI/LangChain nodes development
pnpm dev:ai

# With hot reload for custom nodes
N8N_DEV_RELOAD=true pnpm dev
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:backend
pnpm test:frontend
pnpm test:nodes

# Run single test file
pnpm test <path-to-test-file>

# E2E tests (requires cypress install first)
pnpm cypress:install
pnpm test:e2e:all  # Headless
pnpm test:e2e:ui   # Interactive

# With code coverage
COVERAGE_ENABLED=true pnpm test
```

### Code Quality
```bash
# Type checking (ALWAYS run before committing)
pnpm typecheck

# Linting (ALWAYS run before committing)
pnpm lint
pnpm lintfix  # Auto-fix issues

# Code formatting
pnpm format
```

### Running n8n
```bash
# Start n8n
pnpm start

# Start with tunnel
pnpm start:tunnel

# Start worker process
pnpm worker
```

## Architecture Overview

n8n is a **monorepo** using pnpm workspaces and Turborepo with the following structure:

### Core Packages
- `/packages/cli/` - Backend server and CLI application (Express.js)
- `/packages/core/` - Workflow execution engine (**Contact n8n team before modifying**)
- `/packages/workflow/` - Shared interfaces and workflow logic
- `/packages/nodes-base/` - Built-in nodes (400+ integrations)

### Frontend Packages
- `/packages/editor-ui/` - Vue 3 editor interface (Composition API)
- `/packages/@n8n/design-system/` - Reusable UI components
- `/packages/@n8n/composables/` - Vue composables
- `/packages/@n8n/stores/` - Pinia state management

### Key Technologies
- **Backend**: Node.js, TypeScript, Express.js, Bull/RabbitMQ for queuing
- **Frontend**: Vue 3, Vite, Pinia, Element Plus, Vue Flow
- **Database**: SQLite/PostgreSQL/MySQL
- **Testing**: Jest, Vitest, Cypress
- **Build**: Turborepo, pnpm workspaces

## Development Guidelines

### Creating/Modifying Nodes
1. Node definitions are in `/packages/nodes-base/nodes/`
2. Each node should have:
   - Node class file (e.g., `Github.node.ts`)
   - Test file (e.g., `Github.node.test.ts`)
   - SVG icon in `/packages/nodes-base/nodes/icons/`
3. Use `N8N_DEV_RELOAD=true` for hot reload during development

### Frontend Development
1. Components use Vue 3 Composition API
2. State management uses Pinia stores
3. UI components from `@n8n/design-system`
4. Always include TypeScript types

### Testing Requirements
1. All PRs must include tests
2. Unit tests for business logic
3. Integration tests for API endpoints
4. UI tests for significant frontend changes
5. Node tests must cover all operations

### Code Style
1. TypeScript for all new code
2. Follow existing patterns in neighboring files
3. Use Biome for formatting (`pnpm format`)
4. ESLint for linting (`pnpm lint`)

### Important Notes
- **Never** modify `/packages/core/` without consulting n8n team
- **Always** run `pnpm typecheck` and `pnpm lint` before committing
- **Check** existing implementations before adding new dependencies
- **Follow** the existing file and folder structure patterns
- **Test** in production mode (`pnpm build && pnpm start`) before submitting PR

## Common Tasks

### Adding a New Node
1. Create node file in `/packages/nodes-base/nodes/[ServiceName]/`
2. Add icon to `/packages/nodes-base/nodes/[ServiceName]/[servicename].svg`
3. Implement `INodeType` interface with proper versioning
4. Add comprehensive tests
5. Update node list in `packages/nodes-base/package.json`

### Modifying the Editor UI
1. Components in `/packages/editor-ui/src/components/`
2. Views in `/packages/editor-ui/src/views/`
3. Use existing composables from `@n8n/composables`
4. Follow Vue 3 Composition API patterns

### Working with Workflows
1. Workflow interfaces in `/packages/workflow/src/Interfaces.ts`
2. Execution logic in `/packages/core/src/`
3. Test with various node configurations
4. Consider backward compatibility

## Database Migrations
- Migrations in `/packages/cli/src/databases/migrations/`
- Separate folders for each database type
- Always test migrations with all supported databases

## Environment Variables
Key development variables:
- `N8N_DEV_RELOAD=true` - Enable hot reload
- `DB_TYPE` - Database type (sqlite, postgres, mysqldb, mariadb)
- `EXECUTIONS_MODE` - Execution mode (regular, queue)
- `N8N_LOG_LEVEL` - Logging level (debug, info, warn, error)

## Support Resources
- Documentation: https://docs.n8n.io
- Community Forum: https://community.n8n.io
- GitHub Issues: https://github.com/n8n-io/n8n/issues