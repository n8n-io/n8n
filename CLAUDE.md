# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in the n8n repository.

## Project Overview

n8n is a workflow automation platform written in TypeScript, using a monorepo
structure managed by pnpm workspaces. It consists of a Node.js backend, Vue.js
frontend, and extensible node-based workflow engine.

**Requirements:**
- Node.js >=22.16
- pnpm >=10.18.3

## General Guidelines

- Always use pnpm
- We use Linear as a ticket tracking system
- We use Posthog for feature flags
- When starting to work on a new ticket – create a new branch from fresh
  master with the name specified in Linear ticket
- When creating a new branch for a ticket in Linear - use the branch name
  suggested by linear
- Use mermaid diagrams in MD files when you need to visualise something

## Essential Commands

### Development
- `pnpm dev` - Start full-stack development mode with hot reload
- `pnpm dev:be` - Start only backend development (excludes frontend)
- `pnpm dev:fe` - Start only frontend development
- `pnpm dev:ai` - Start development with AI/LangChain packages
- `pnpm start` - Start n8n in production mode
- `pnpm watch` - Watch mode for all packages

### Building
Use `pnpm build` to build all packages. ALWAYS redirect the output of the
build command to a file:

```bash
pnpm build > build.log 2>&1
```

You can inspect the last few lines of the build log file to check for errors:
```bash
tail -n 20 build.log
```

Additional build commands:
- `pnpm build:n8n` - Build only the n8n package
- `pnpm build:docker` - Build and dockerize n8n

### Testing
- `pnpm test` - Run all tests
- `pnpm test:affected` - Runs tests based on what has changed since the last
  commit
- `pnpm test:ci` - Run tests in CI mode with proper concurrency
- `pnpm test:ci:backend:unit` - Run only backend unit tests
- `pnpm test:ci:backend:integration` - Run only backend integration tests
- `pnpm test:ci:frontend` - Run only frontend tests
- `pnpm --filter=n8n-playwright test:local` - Run Playwright E2E tests

Running a particular test file requires going to the directory of that test
and running: `pnpm test <test-file>`.

When changing directories, use `pushd` to navigate into the directory and
`popd` to return to the previous directory. When in doubt, use `pwd` to check
your current directory.

### Code Quality
- `pnpm lint` - Lint code
- `pnpm lint:fix` - Lint and auto-fix issues
- `pnpm typecheck` - Run type checks
- `pnpm format` - Format code with Biome
- `pnpm format:check` - Check code formatting

Always run lint and typecheck before committing code to ensure quality.
Execute these commands from within the specific package directory you're
working on (e.g., `cd packages/cli && pnpm lint`). Run the full repository
check only when preparing the final PR. When your changes affect type
definitions, interfaces in `@n8n/api-types`, or cross-package dependencies,
build the system before running lint and typecheck.

## Architecture Overview

**Monorepo Structure:** pnpm workspaces with Turbo build orchestration

### Package Structure

The monorepo is organized into these key packages:

#### Core Packages
- **`packages/workflow`**: Core workflow interfaces and types
- **`packages/core`**: Workflow execution engine
- **`packages/cli`**: Express server, REST API, and CLI commands
- **`packages/node-dev`**: CLI tool for developing custom nodes

#### Frontend Packages
- **`packages/frontend/editor-ui`**: Main Vue 3 frontend application
- **`packages/frontend/@n8n/design-system`**: Vue component library for UI consistency
- **`packages/frontend/@n8n/i18n`**: Internationalization for UI text
- **`packages/frontend/@n8n/chat`**: Chat UI component
- **`packages/frontend/@n8n/composables`**: Shared Vue composables
- **`packages/frontend/@n8n/stores`**: Pinia stores for state management
- **`packages/frontend/@n8n/rest-api-client`**: REST API client for frontend
- **`packages/frontend/@n8n/storybook`**: Storybook configuration

#### Backend Packages
- **`packages/@n8n/api-types`**: Shared TypeScript interfaces between frontend and backend
- **`packages/@n8n/backend-common`**: Common backend utilities and base classes
- **`packages/@n8n/backend-test-utils`**: Testing utilities for backend
- **`packages/@n8n/config`**: Centralized configuration management
- **`packages/@n8n/db`**: Database layer with TypeORM
- **`packages/@n8n/di`**: Dependency injection container
- **`packages/@n8n/errors`**: Error classes (UnexpectedError, OperationalError, UserError)
- **`packages/@n8n/constants`**: Shared constants
- **`packages/@n8n/permissions`**: Permissions system
- **`packages/@n8n/utils`**: Utility functions

#### Node Packages
- **`packages/nodes-base`**: Built-in nodes for integrations (400+ nodes)
- **`packages/@n8n/nodes-langchain`**: AI/LangChain nodes for AI workflows
- **`packages/@n8n/node-cli`**: CLI utilities for node development
- **`packages/@n8n/create-node`**: Scaffolding tool for creating new nodes

#### Task Runner Packages
- **`packages/@n8n/task-runner`**: Task runner for executing code in isolated environments
- **`packages/@n8n/task-runner-python`**: Python task runner for executing Python code

#### Development Tools
- **`packages/@n8n/benchmark`**: Benchmarking tools for performance testing
- **`packages/@n8n/codemirror-lang`**: CodeMirror language support for n8n expressions
- **`packages/@n8n/codemirror-lang-sql`**: CodeMirror SQL language support
- **`packages/@n8n/eslint-config`**: Shared ESLint configuration
- **`packages/@n8n/eslint-plugin-community-nodes`**: ESLint plugin for community nodes
- **`packages/@n8n/stylelint-config`**: Shared stylelint configuration
- **`packages/@n8n/typescript-config`**: Shared TypeScript configuration
- **`packages/@n8n/vitest-config`**: Shared Vitest configuration
- **`packages/@n8n/json-schema-to-zod`**: Utility for converting JSON schemas to Zod schemas

#### Testing Packages
- **`packages/testing/playwright`**: Playwright E2E tests
- **`packages/testing/containers`**: Docker containers for testing

#### Enterprise & Extensions
- **`packages/@n8n/ai-workflow-builder.ee`**: AI workflow builder (Enterprise Edition)
- **`packages/extensions/insights`**: Example backend module for insights feature

#### Other Packages
- **`packages/@n8n/client-oauth2`**: OAuth2 client implementation
- **`packages/@n8n/extension-sdk`**: SDK for building n8n extensions
- **`packages/@n8n/imap`**: IMAP email integration
- **`packages/@n8n/scan-community-package`**: Tool for scanning community packages

## Technology Stack

- **Frontend:** Vue 3 + TypeScript + Vite (rolldown-vite) + Pinia + Storybook UI Library
- **Backend:** Node.js >=22.16 + TypeScript 5.9.2 + Express + TypeORM 0.3.20-14
- **Testing:** Jest 29.6+ (unit) + Vitest 3.1+ (frontend) + Playwright (E2E)
- **Database:** TypeORM with SQLite/PostgreSQL/MySQL support
- **Code Quality:** Biome 1.9+ (formatting) + ESLint 9.29+ + lefthook 1.7+ (git hooks)
- **Build System:** Turbo 2.5.4 + pnpm 10.18.3 workspaces
- **AI/ML:** LangChain integration via `@n8n/nodes-langchain`
- **Task Execution:** Isolated task runners for Python and other languages

### Key Architectural Patterns

1. **Dependency Injection**: Uses `@n8n/di` for IoC container
2. **Controller-Service-Repository**: Backend follows MVC-like pattern
3. **Event-Driven**: Internal event bus for decoupled communication
4. **Context-Based Execution**: Different contexts for different node types
5. **State Management**: Frontend uses Pinia stores
6. **Design System**: Reusable components and design tokens are centralized in
   `@n8n/design-system`, where all pure Vue components should be placed to
   ensure consistency and reusability

## Key Development Patterns

- Each package has isolated build configuration and can be developed independently
- Hot reload works across the full stack during development
- Node development uses dedicated `node-dev` CLI tool
- Workflow tests are JSON-based for integration testing
- AI features have dedicated development workflow (`pnpm dev:ai`)
- **Task Runners**: Code execution (Python, etc.) runs in isolated task runner processes
  - `@n8n/task-runner` - Core task runner implementation
  - `@n8n/task-runner-python` - Python code execution support
- **Dependency Catalog**: Shared dependency versions are managed via `pnpm-workspace.yaml` catalog
  - Use `catalog:` references in package.json files
  - Ensures consistent versions across packages
  - Separate `frontend` catalog for frontend-specific dependencies

### TypeScript Best Practices
- **NEVER use `any` type** - use proper types or `unknown`
- **Avoid type casting with `as`** - use type guards or type predicates instead
- **Define shared interfaces in `@n8n/api-types`** package for FE/BE communication

### Error Handling
- Don't use `ApplicationError` class in CLI and nodes for throwing errors,
  because it's deprecated. Use `UnexpectedError`, `OperationalError` or
  `UserError` instead.
- Import from appropriate error classes in each package

### Frontend Development
- **All UI text must use i18n** - add translations to `@n8n/i18n` package
- **Use CSS variables directly** - never hardcode spacing as px values
- **data-test-id must be a single value** (no spaces or multiple values)

When implementing CSS, refer to @packages/frontend/CLAUDE.md for guidelines on
CSS variables and styling conventions.

### Testing Guidelines
- **Always work from within the package directory** when running tests
- **Mock all external dependencies** in unit tests
- **Confirm test cases with user** before writing unit tests
- **Typecheck is critical before committing** - always run `pnpm typecheck`
- **When modifying pinia stores**, check for unused computed properties

What we use for testing and writing tests:
- For testing nodes and other backend components, we use Jest for unit tests. Examples can be found in `packages/nodes-base/nodes/**/*test*`.
- We use `nock` for server mocking
- For frontend we use `vitest`
- For E2E tests we use Playwright. Run with `pnpm --filter=n8n-playwright test:local`.
  See `packages/testing/playwright/README.md` for details.

### Common Development Tasks

When implementing features:
1. Define API types in `packages/@n8n/api-types`
2. Implement backend logic in `packages/cli` module, follow
   `scripts/backend-module/backend-module-guide.md`
3. Add API endpoints via controllers
4. Update frontend in `packages/frontend/editor-ui` with i18n support
5. Write tests with proper mocks
6. Run `pnpm typecheck` to verify types

### Backend Module Development

For creating new backend modules (self-contained feature units):
- Run `pnpm setup-backend-module` at monorepo root to scaffold a new module
- Modules live in `packages/cli/src/modules/{feature-name}`
- See `scripts/backend-module/backend-module-guide.md` for detailed guidance
- Example module: `packages/extensions/insights`
- Modules use `@BackendModule()` decorator and support:
  - Lazy loading via dynamic imports
  - License gating with `licenseFlag` option
  - Lifecycle hooks (`init()`, `shutdown()`)
  - Database entities registration
  - UI settings exposure
  - Workflow execution context injection

## Github Guidelines
- When creating a PR, use the conventions in
  `.github/pull_request_template.md` and
  `.github/pull_request_title_conventions.md`.
- Use `gh pr create --draft` to create draft PRs.
- Always reference the Linear ticket in the PR description,
  use `https://linear.app/n8n/issue/[TICKET-ID]`
- always link to the github issue if mentioned in the linear ticket.
