# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in the n8n repository.

## Essential Commands

### Development
- `pnpm dev` - Start full-stack development with hot reload
- `pnpm dev:be` - Backend-only development 
- `pnpm dev:fe` - Frontend-only development
- `pnpm dev:ai` - AI/LangChain focused development

### Building
- `pnpm build` - Build all packages
- `pnpm build:backend` - Build backend only
- `pnpm build:frontend` - Build frontend only

### Testing
- `pnpm test` - Run all tests
- `pnpm test:backend` - Backend tests only
- `pnpm test:frontend` - Frontend tests only
- `pnpm dev:e2e` - E2E tests in development mode

Running a particular test file requires going to the directory of that test
and running: `pnpm test <test-file>`.

### Code Quality
- `pnpm format` - Format code with Biome
- `pnpm lint` - Lint code
- `pnpm lintfix` - Fix linting issues
- `pnpm typecheck` - Run type checks

Always run lint and typecheck before committing code to ensure quality (format
wil be run automatically on commit, but it couldn't hurt to do that before
linting and typechecking).

### Node Development
- `n8n-node-dev new` - Create new node or credential templates
- `n8n-node-dev build --watch` - Build and watch custom nodes for development
- `N8N_DEV_RELOAD=true pnpm dev` - Enable hot reload for custom nodes

### Utilities
- `pnpm clean` - Clean all build artifacts
- `pnpm reset` - Reset entire workspace (use this with extreme caution)

## Architecture Overview

**Monorepo Structure:** pnpm workspaces with Turbo build orchestration

### Core Packages (in dependency order)
1. **workflow** - Core workflow data structures and execution logic
2. **core** - Workflow execution engine that uses workflow package
3. **cli** - Main application server, API, and CLI that orchestrates core
4. **nodes-base** - 400+ built-in node implementations
5. **editor-ui** - Vue.js frontend that communicates with cli

### Key Framework Packages
- `@n8n/nodes-langchain` - AI and LangChain integration nodes
- `@n8n/design-system` - Vue component library for UI consistency
- `@n8n/config` - Centralized configuration management

## Development Setup Requirements

- **Node.js:** 22.16+ (managed via .nvmrc)
- **Package Manager:** pnpm 10.2.1+ (use `corepack enable`)
- **Build Tool:** Turbo for monorepo orchestration

Initial setup: `pnpm install && pnpm build && pnpm dev`

## Technology Stack

- **Frontend:** Vue 3 + TypeScript + Vite + Pinia
- **Backend:** Node.js + TypeScript + Express + TypeORM
- **Testing:** Jest (unit) + Cypress (E2E)
- **Database:** TypeORM with SQLite/PostgreSQL/MySQL support
- **Code Quality:** Biome + ESLint + lefthook git hooks

## Key Development Patterns

- Each package has isolated build configuration and can be developed independently
- Hot reload works across the full stack during development
- Node development uses dedicated `node-dev` CLI tool
- Workflow tests are JSON-based for integration testing
- AI features have dedicated development workflow (`pnpm dev:ai`)