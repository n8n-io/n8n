# n8n — Workflow Automation

## Purpose

Customized n8n for Operaro — a workflow automation platform written in TypeScript
that enables visual workflow building, execution, and monitoring. Operaro uses n8n
as its automation engine, integrated with the broader platform through credentials,
webhooks, and AI-powered nodes (LangChain). Version: `2.12.1`.

## Architecture

**Monorepo:** pnpm workspaces with Turbo build orchestration.

- **Backend:** Node.js 22+ + TypeScript + Express + TypeORM (SQLite/PostgreSQL)
- **Frontend:** Vue 3 + TypeScript + Vite + Pinia + Storybook
- **AI nodes:** `@n8n/nodes-langchain` — LangChain-based AI integrations
- **DI:** `@n8n/di` IoC container (Controller-Service-Repository pattern)
- **Events:** Internal event bus for decoupled communication between subsystems
- **Testing:** Jest (unit/backend), Vitest (frontend), Playwright (E2E)
- **Code quality:** Biome (formatting) + ESLint + lefthook git hooks

## Folder Structure

```
n8n/
├── packages/
│   ├── @n8n/               # Scoped packages
│   │   ├── api-types/      # Shared FE/BE TypeScript interfaces
│   │   ├── config/         # Centralized configuration management
│   │   ├── design-system/  # Vue component library + design tokens
│   │   ├── i18n/           # Internationalization for UI text
│   │   └── nodes-langchain/ # AI/LangChain nodes
│   ├── cli/                # Express server, REST API, CLI commands
│   ├── core/               # Workflow execution engine
│   ├── extensions/         # Extension points
│   ├── frontend/           # Additional frontend utilities
│   ├── node-dev/           # CLI tool for node development
│   ├── nodes-base/         # Built-in integration nodes
│   ├── testing/            # Playwright E2E test suite
│   └── workflow/           # Core workflow interfaces and types
├── scripts/                # Build and CI scripts
├── docker/                 # Docker configuration
├── turbo.json              # Turbo build pipeline config
├── pnpm-workspace.yaml     # Workspace definition
└── AGENTS.md               # Full developer reference
```

## Conventions

### Node Development
- Use the `node-dev` CLI tool (`packages/node-dev`) for scaffolding and developing new nodes.
- Built-in nodes live in `packages/nodes-base/nodes/`.
- AI nodes go in `packages/@n8n/nodes-langchain/`.
- Define shared FE/BE types in `packages/@n8n/api-types` — never duplicate interfaces.

### Workflow Traversal
- `workflow.connections` is indexed by **source node**. To find parents, call
  `mapConnectionsByDestination()` first, then `getParentNodes()`.
- Import helpers from `n8n-workflow`: `getParentNodes`, `getChildNodes`, `mapConnectionsByDestination`.

### Error Handling
- Do NOT use `ApplicationError` (deprecated). Use `UnexpectedError`, `OperationalError`, or `UserError`.

### Frontend
- All UI text must use i18n via `@n8n/i18n` — no hardcoded strings.
- Use CSS variables directly — never hardcode spacing as `px` values.
- `data-testid` must be a single value (no spaces).
- Pure Vue components belong in `@n8n/design-system`.

### TypeScript
- Never use `any` — use proper types or `unknown`.
- Avoid `as` type casting outside of test code — use type guards instead.

### Feature Implementation Order
1. Define types in `packages/@n8n/api-types`
2. Implement backend in `packages/cli` (see `packages/cli/scripts/backend-module/backend-module-guide.md`)
3. Add REST endpoints via controllers
4. Update `packages/editor-ui` with i18n support
5. Write tests; run `pnpm typecheck`

## Build & Test

```bash
# Always redirect build output to a file — it is large
pnpm build > build.log 2>&1
tail -n 20 build.log

# Type checking and linting (run from the specific package dir for speed)
pnpm typecheck
pnpm lint

# Testing
pnpm test               # All tests
pnpm test:affected      # Only tests affected by changes since last commit

# E2E tests (Playwright)
pnpm --filter=n8n-playwright test:local

# Run a single test file — navigate into the package first
pushd packages/cli && pnpm test src/path/to/my.test.ts && popd
```
