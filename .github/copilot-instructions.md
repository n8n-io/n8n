# n8n Copilot Instructions

Essential guidance for AI coding agents working with the n8n workflow automation platform.

**⚠️ Security: Never commit secrets, tokens, or credentials. Use GitHub Secrets, environment variables, or `.env` files (gitignored).**

## Project Overview

n8n is a TypeScript monorepo using pnpm workspaces + Turbo, combining a Node.js/Express backend with Vue 3 frontend and an extensible workflow engine.

## Critical Development Commands

**Always use pnpm, never npm/yarn.** Run commands from package directories when possible:

```bash
# Build (redirect output to catch errors)
pnpm build > build.log 2>&1 && tail -20 build.log

# Test within specific package
cd packages/cli && pnpm test

# Development modes
pnpm dev           # Full stack
pnpm dev:be        # Backend only
pnpm dev:ai        # AI/LangChain focused
pnpm dev:fe        # Frontend only

# Quality checks (run from package dir before PR)
pnpm lint && pnpm typecheck

# Start development servers
cd packages/cli && pnpm dev          # Backend server
cd packages/frontend/editor-ui && pnpm dev   # Frontend dev server
cd packages/cli && pnpm build && pnpm start  # Production mode
```

## Monorepo Architecture

### Core Package Dependencies
- `@n8n/api-types` - Shared TypeScript interfaces (FE/BE contract)
- `packages/workflow` - Core workflow types and interfaces
- `packages/core` - Workflow execution engine
- `packages/cli` - Express server, REST API, CLI commands
- `packages/frontend/editor-ui` - Vue 3 frontend
- `@n8n/design-system` - Reusable Vue components and design tokens

### Backend Module Pattern
Backend features use modular architecture (`packages/cli/src/modules/`):
```typescript
@BackendModule({ name: 'my-feature' })
export class MyFeatureModule implements ModuleInterface {
  async init() {
    await import('./my-feature.controller');
    Container.get(MyFeatureService).start();
  }
}
```
Enabled via `N8N_ENABLED_MODULES` env var. See `scripts/backend-module/backend-module-guide.md`.

## Essential Patterns & Conventions

### TypeScript Rules
- **NEVER use `any`** - use `unknown` or proper types
- **Avoid `as` casting** - use type guards instead
- **Share interfaces via `@n8n/api-types`** for FE/BE communication
- **Error handling**: Use `UnexpectedError`, `OperationalError`, `UserError` (NOT deprecated `ApplicationError`)

### Frontend Development
- **All UI text must use i18n** - add to `@n8n/i18n` package
- **Use CSS variables** - never hardcode px values (see `packages/frontend/CLAUDE.md`)
- **data-test-id must be single value** (no spaces)
- **Pure components go in `@n8n/design-system`**

### Node Development
Use `packages/node-dev` CLI for creating new integration nodes:
```bash
cd packages/node-dev
pnpm build && pnpm n8n-node-dev new
```

### Testing Strategy
- **Unit tests**: Jest (backend), Vitest (frontend)
- **E2E tests**: Playwright (`pnpm --filter=n8n-playwright test:local`)
- **Node tests**: JSON-based workflow tests in `packages/nodes-base/nodes/**/test/`
- **Always work from package directory** when running tests
- **Mock external dependencies** with `nock` for HTTP
- **Workspace tests**: `pnpm test` (all), `pnpm test:affected` (changed only)

### Code Search & Research
When using semantic search tools, include required parameters:
```bash
# Example semantic search for webhook patterns
semantic-code-search query:"webhook registration workflow" repoOwner:n8n-io repoName:n8n
```

## Development Workflow

### Feature Implementation
1. Define types in `packages/@n8n/api-types`
2. Implement backend in `packages/cli/src/modules/` (follow backend module guide)
3. Add REST endpoints via controllers with `@RestController()` decorator
4. Update frontend in `packages/frontend/editor-ui` with i18n support
5. Write tests with proper mocks
6. **Always run `pnpm typecheck`** before committing

### Git Workflow
- Branch naming from Linear tickets (use suggested names)
- Reference Linear ticket: `https://linear.app/n8n/issue/[TICKET-ID]`
- Use `gh pr create --draft` for draft PRs
- Follow `.github/pull_request_template.md` conventions

## Key Directories & Files

```
packages/
├── @n8n/api-types/           # Shared TypeScript interfaces
├── cli/src/
│   ├── modules/              # Backend feature modules
│   ├── controllers/          # REST API endpoints
│   ├── services/             # Business logic
│   └── webhooks/             # Webhook handling
├── core/src/
│   ├── execution-engine/     # Workflow execution
│   └── node-execute-functions.ts
├── frontend/editor-ui/       # Vue 3 frontend
├── nodes-base/nodes/         # Built-in integration nodes
└── workflow/                 # Core workflow types
```

### Webhook Development Patterns
- **Registration**: Search for "Registered webhook" in logs and `packages/cli/src/webhooks/`
- **Testing**: Use `packages/cli/src/webhooks/test/` patterns and webhook test endpoints
- **Database**: Webhook data stored in `workflow_entity` table (TypeORM)
- **Execution**: Webhook → Workflow execution via `packages/core/src/execution-engine/`

## Technology Stack Notes

- **DI Container**: `@n8n/di` with `Container.get(Service)`
- **Database**: TypeORM (supports SQLite/PostgreSQL/MySQL)
- **Frontend State**: Pinia stores
- **Build System**: Turbo for task orchestration
- **Code Quality**: Biome (formatting) + ESLint + lefthook hooks

## Debugging & Troubleshooting

### Common Issues
- **Type errors**: Run `pnpm build` first, then `pnpm typecheck` from package dir
- **Import errors**: Check if imports use relative paths in dynamic imports (`await import('./...')`)
- **Test failures**: Ensure you're in correct package directory
- **Frontend**: Check `@packages/frontend/CLAUDE.md` for CSS variable usage

### Performance
- Dynamic imports in module entrypoints prevent loading unused code
- Hot reload works across full stack during `pnpm dev`
- Use `pnpm test:affected` for faster test runs

This covers the essential patterns and workflows needed to be immediately productive in the n8n codebase. Focus on the monorepo structure, backend modules, TypeScript strictness, and proper testing practices.
