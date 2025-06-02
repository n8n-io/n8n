# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

n8n is a workflow automation platform built as a monorepo using pnpm and Turbo. The project consists of multiple packages that handle different aspects of the platform: backend services, frontend UI, nodes/credentials, and supporting libraries.

## Development Environment

**Prerequisites:**
- Node.js >= 20.15
- pnpm >= 10.2.1 (package manager)

**Package Manager:** pnpm@10.2.1 (enforced via `scripts/block-npm-install.js`)

## Key Commands

### Development
- `pnpm dev` - Start full development environment (excludes design-system, chat, task-runner)
- `pnpm dev:be` - Backend-only development (excludes frontend)
- `pnpm dev:fe` - Frontend-only development
- `pnpm dev:ai` - AI/LangChain specific development
- `pnpm start` - Production start (uses `packages/cli/bin/n8n`)

### Building
- `pnpm build` - Build all packages
- `pnpm build:backend` - Build backend packages only
- `pnpm build:frontend` - Build frontend packages only
- `pnpm build:nodes` - Build node packages only

### Testing
- `pnpm test` - Run all tests
- `pnpm test:backend` - Run backend tests (concurrency=1)
- `pnpm test:frontend` - Run frontend tests (concurrency=1) 
- `pnpm test:nodes` - Run node tests (concurrency=1)

### Code Quality
- `pnpm lint` - Lint all packages
- `pnpm lintfix` - Auto-fix linting issues
- `pnpm typecheck` - Type checking across packages
- `pnpm format` - Format code using Biome

### E2E Testing
- `pnpm dev:e2e` - Run E2E tests in development mode
- `pnpm dev:e2e:server` - Start server for E2E testing

### Utilities
- `pnpm clean` - Clean build artifacts
- `pnpm reset` - Full reset of dependencies and build artifacts

## Monorepo Architecture

The project uses Turbo for build orchestration and pnpm workspaces. Key packages:

### Core Platform
- `packages/cli/` - Main CLI application and server
- `packages/core/` - Core workflow execution engine
- `packages/workflow/` - Workflow data structures and processing

### Frontend
- `packages/frontend/editor-ui/` - Main Vue.js-based editor interface
- `packages/@n8n/design-system/` - Shared UI components

### Nodes & Integrations
- `packages/nodes-base/` - Built-in node integrations (400+ services)
- `packages/@n8n/nodes-langchain/` - AI/LangChain specific nodes

### Infrastructure Packages
- `packages/@n8n/api-types/` - Shared TypeScript API types
- `packages/@n8n/config/` - Configuration management
- `packages/@n8n/db/` - Database abstractions
- `packages/@n8n/permissions/` - Access control
- `packages/@n8n/task-runner/` - Task execution runtime

## Build System

**Turbo Configuration:** Uses `turbo.json` to define task dependencies and parallel execution. Key tasks have specific dependency chains (e.g., frontend builds depend on design-system).

**TypeScript:** Shared configs in `packages/@n8n/typescript-config/` with environment-specific variants (backend, frontend, build).

## Development Patterns

### Node Development
- Use `packages/node-dev/` for creating new node integrations
- Credentials are defined in `packages/nodes-base/credentials/`
- Nodes are in `packages/nodes-base/nodes/`

### Testing Strategy
- Jest for unit/integration tests
- Cypress for E2E tests (in `cypress/` directory)
- Tests run with concurrency=1 for backend/frontend/nodes to avoid conflicts

### Code Quality
- Biome for formatting and linting
- ESLint with custom rules in `packages/@n8n/eslint-config/`
- Lefthook for git hooks
- TypeScript strict mode across packages

## AI/LangChain Integration

The platform has native AI capabilities through the `@n8n/nodes-langchain` package, supporting various AI providers and agent workflows.

## Cloud Deployment

### Google Cloud Run

The project includes Cloud Build and Cloud Run configuration for GCP deployment:

- `cloudbuild.yaml` - Builds Docker image and deploys to Cloud Run
- `cloud-run-service.yaml` - Cloud Run service configuration template
- Docker configuration optimized for Cloud Run (port 8080, health checks)

**Key Configuration:**
- Uses `PORT` environment variable from Cloud Run
- Binds to `0.0.0.0:8080` for proper Cloud Run networking
- Includes startup, liveness, and readiness probes
- Configured for 2GB memory, 2 CPU with startup CPU boost
- Supports Cloud Run gen2 execution environment

**Required Secrets (stored in Secret Manager):**
- `n8n-encryption-key`
- `n8n-db-*` configuration for database connection