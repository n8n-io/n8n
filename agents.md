# n8n Agent Development Guide

## Project Context
n8n is a TypeScript workflow automation platform using pnpm workspaces monorepo. Node.js backend + Vue.js frontend + extensible node-based workflow engine.

## Required Tools & Setup
- **Package Manager**: pnpm (mandatory)
- **Tickets**: Linear (use suggested branch names)
- **Feature Flags**: Posthog
- **Visualization**: Mermaid diagrams in MD files
- **Build Orchestration**: Turbo

## Core Command Patterns

### Build Protocol (Critical)
```bash
# ALWAYS redirect build output - never run without logging
pnpm build > build.log 2>&1
tail -n 20 build.log  # Check for errors
```

### Development Commands
```bash
pnpm test           # All tests
pnpm test:affected  # Changed files only
pnpm dev:e2e        # E2E development mode
pnpm dev:ai         # AI feature development
pnpm lint           # Code linting
pnpm typecheck      # Type validation (critical)
```

### Directory Navigation Protocol
```bash
pushd packages/cli   # Navigate to package
pnpm test <file>     # Run specific test
popd                 # Return to previous
pwd                  # Verify location when uncertain
```

## Architecture Map

### Package Structure
```
packages/
├── @n8n/api-types      # Shared TS interfaces (FE↔BE)
├── workflow            # Core workflow types
├── core               # Workflow execution engine
├── cli                # Express server + REST API + CLI
├── editor-ui          # Vue 3 frontend
├── @n8n/i18n          # Internationalization
├── nodes-base         # Built-in integration nodes
├── @n8n/nodes-langchain # AI/LangChain nodes
├── @n8n/design-system # Vue component library
├── @n8n/config        # Centralized configuration
└── @n8n/di            # Dependency injection IoC
```

### Technology Stack
- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + Storybook
- **Backend**: Node.js + Express + TypeORM
- **Database**: TypeORM (SQLite/PostgreSQL/MySQL)
- **Testing**: Jest (unit) + Playwright (E2E) + vitest (frontend)
- **Quality**: Biome (formatting) + ESLint + lefthook git hooks

### Architectural Patterns
1. **Dependency Injection**: `@n8n/di` IoC container
2. **MVC Pattern**: Controller-Service-Repository backend
3. **Event-Driven**: Internal event bus for decoupling
4. **Context Execution**: Different contexts per node type
5. **State Management**: Pinia stores (frontend)
6. **Design System**: Centralized in `@n8n/design-system`

## Development Rules (Non-Negotiable)

### TypeScript Constraints
- ❌ **NEVER** use `any` type → use proper types or `unknown`
- ❌ **Avoid** `as` casting → use type guards/predicates
- ✅ **MUST** define shared interfaces in `@n8n/api-types`

### Error Handling
- ❌ **Don't use** `ApplicationError` (deprecated)
- ✅ **Use**: `UnexpectedError`, `OperationalError`, `UserError`

### Frontend Requirements
- 🌐 **ALL UI text** → i18n in `@n8n/i18n` package
- 🎨 **CSS variables only** → never hardcode px values
- 🧪 **data-test-id** → single value (no spaces/multiple values)
- 📦 **Pure Vue components** → place in `@n8n/design-system`

### Testing Protocol
1. **Work from package directory** (not root)
2. **Mock all external dependencies**
3. **Confirm test cases with user first**
4. **Run `pnpm typecheck` before commit** (critical)
5. **Check unused computed properties** in Pinia stores

## Quality Gates

### Package-Level Development
```bash
cd packages/cli
pnpm lint
pnpm typecheck
```

### Full Repository Check (PR only)
- Run after type definitions change
- Run after `@n8n/api-types` modifications
- Run after cross-package dependency changes
- **Build before lint/typecheck** when types affected

### Pre-Commit Checklist
- [ ] Tests pass from package directory
- [ ] External dependencies mocked
- [ ] `pnpm typecheck` clean
- [ ] Build system updated if types changed

## Feature Implementation Workflow

### Standard Development Sequence
1. **Types**: Define in `packages/@n8n/api-types`
2. **Backend**: Implement in `packages/cli` (follow backend-module guide)
3. **API**: Add controller endpoints
4. **Frontend**: Update `packages/editor-ui` with i18n
5. **Tests**: Write with mocks (Jest/vitest/Playwright)
6. **Validation**: `pnpm typecheck`

### Testing Tools by Context
- **Backend nodes**: Jest (`packages/nodes-base/nodes/**/*test*`)
- **Server mocking**: nock
- **Frontend**: vitest
- **E2E**: Playwright (`pnpm dev:e2e`) - Cypress being migrated

## Git Workflow

### Branch Management
- Create from fresh master
- Use Linear-suggested branch names
- Reference: `https://linear.app/n8n/issue/[TICKET-ID]`

### PR Protocol
- Follow `.github/pull_request_template.md`
- Follow `.github/pull_request_title_conventions.md`
- Create draft: `gh pr create --draft`
- Link GitHub issues mentioned in Linear ticket

## Agent-Specific Instructions

### Code Analysis Priority
1. **Package context** → verify before suggestions
2. **TypeScript compliance** → validate before changes
3. **Cross-package impact** → consider dependencies
4. **i18n requirements** → check UI text

### Development Patterns Recognition
- **Independent packages** → isolated build configs
- **Hot reload** → full-stack development
- **Node development** → `node-dev` CLI tool
- **Workflow tests** → JSON-based integration
- **AI features** → dedicated `pnpm dev:ai` workflow

### Problem-Solving Approach
1. **Identify affected packages**
2. **Check existing codebase patterns**
3. **Propose minimal focused changes**
4. **Include testing strategy**
5. **Reference specific file paths**
6. **Provide concrete code examples**

### Communication Guidelines
- Use technical precision over verbosity
- Include reasoning for architectural decisions
- Reference `@packages/frontend/CLAUDE.md` for CSS guidelines
- Check `@packages/cli/scripts/backend-module/backend-module.guide.md` for backend patterns
