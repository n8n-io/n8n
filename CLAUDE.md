# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

n8n is a workflow automation platform with a visual editor. It's built as a monorepo using pnpm workspaces and Turborepo for build orchestration.

## Architecture

### Core Packages
- `/packages/cli` - Main backend application serving the API and frontend
- `/packages/core` - Workflow execution engine
- `/packages/workflow` - Shared workflow interfaces and utilities
- `/packages/nodes-base` - Built-in nodes (400+ integrations)

### Frontend Packages
- `/packages/frontend/editor-ui` - Vue 3 workflow editor
- `/packages/@n8n/design-system` - Shared Vue component library
- `/packages/@n8n/chat` - Chat interface components

### Key Technologies
- Backend: Node.js, TypeScript, Express, TypeORM
- Frontend: Vue 3, Pinia, Element Plus
- Database: SQLite (default), PostgreSQL, MySQL, MariaDB
- Build: Turborepo, pnpm workspaces
- Testing: Jest (backend), Vitest (frontend), Cypress (E2E)

## Essential Commands

### Development
```bash
pnpm dev              # Full stack development (recommended)
pnpm dev:be           # Backend only
pnpm dev:fe           # Frontend only
pnpm dev:ai           # AI/LangChain focused development
```

### Building
```bash
pnpm build            # Build all packages
pnpm build:backend    # Backend only
pnpm build:frontend   # Frontend only
pnpm build:nodes      # Nodes only
```

### Testing
```bash
# Unit tests
pnpm test             # All tests (SQLite)
pnpm test:backend     # Backend tests
pnpm test:frontend    # Frontend tests

# Database-specific backend tests
pnpm --filter=@n8n/cli test:sqlite
pnpm --filter=@n8n/cli test:postgres
pnpm --filter=@n8n/cli test:mysql
pnpm --filter=@n8n/cli test:mariadb

# E2E tests
pnpm test:e2e:ui      # With Cypress UI
pnpm test:e2e:all     # Headless
```

### Code Quality
```bash
pnpm lint             # Run ESLint
pnpm lintfix          # Auto-fix linting issues
pnpm format           # Format with Biome
pnpm typecheck        # TypeScript type checking
```

### Running a Single Test
```bash
# Backend (Jest)
pnpm --filter=@n8n/cli jest path/to/test.spec.ts

# Frontend (Vitest)
pnpm --filter=@n8n/editor-ui vitest path/to/test.spec.ts

# E2E (Cypress)
pnpm --filter=cypress run --spec "cypress/e2e/test-name.cy.ts"
```

## Development Workflow

1. **Setup**: Node.js >=20.15, pnpm >=10.2.1
2. **Install**: `pnpm install`
3. **Build**: `pnpm build` (first time only)
4. **Develop**: `pnpm dev` (auto-rebuilds on changes)
5. **Test**: Run relevant tests before committing
6. **Format**: Code is auto-formatted on commit via git hooks

## Key Architectural Patterns

### Workflow Execution
- Workflows are JSON structures defining nodes and connections
- Each node is a self-contained module in `/packages/nodes-base`
- Execution happens in the core package with proper error handling and retry logic

### Node Development
- Nodes extend `INodeType` interface
- Each node has properties, credentials, and execute methods
- Use `n8n-node-dev` package for creating custom nodes

### Frontend State Management
- Uses Pinia for state management
- Stores are in `/packages/editor-ui/src/stores`
- Component composition with Vue 3 Composition API

### API Structure
- RESTful API with Express routes in `/packages/cli/src`
- WebSocket support for real-time updates
- Authentication via JWT tokens or API keys

### Database Access
- TypeORM for database abstraction
- Migrations in `/packages/cli/src/databases/migrations`
- Repository pattern for data access

## Important Considerations

- The project uses a fair-code license model (check LICENSE.md)
- Database operations should support all 4 database types
- Frontend changes require both design-system and editor-ui updates
- Node changes often require updating multiple packages
- E2E tests are critical for workflow functionality