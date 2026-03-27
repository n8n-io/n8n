# AGENTS.md

This file provides guidance on how to work with the n8n repository.

## Project Overview

n8n is a workflow automation platform written in TypeScript, using a monorepo
structure managed by pnpm workspaces. It consists of a Node.js backend, Vue.js
frontend, and extensible node-based workflow engine.

## General Guidelines

- Always use pnpm
- We use Linear as a ticket tracking system
- We use Posthog for feature flags
- When starting to work on a new ticket – create a new branch from fresh
  master with the name specified in Linear ticket
- When creating a new branch for a ticket in Linear - use the branch name
  suggested by Linear, **unless it is a security fix** (see Security Fix
  Hygiene below)
- Use mermaid diagrams in MD files when you need to visualise something

## Essential Commands

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

### Testing
- `pnpm test` - Run all tests
- `pnpm test:affected` - Runs tests based on what has changed since the last
  commit

Running a particular test file requires going to the directory of that test
and running: `pnpm test <test-file>`.

When changing directories, use `pushd` to navigate into the directory and
`popd` to return to the previous directory. When in doubt, use `pwd` to check
your current directory.

### Code Quality
- `pnpm lint` - Lint code
- `pnpm typecheck` - Run type checks

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

- **`packages/@n8n/api-types`**: Shared TypeScript interfaces between frontend and backend
- **`packages/workflow`**: Core workflow interfaces and types
- **`packages/core`**: Workflow execution engine
- **`packages/cli`**: Express server, REST API, and CLI commands
- **`packages/editor-ui`**: Vue 3 frontend application
- **`packages/@n8n/i18n`**: Internationalization for UI text
- **`packages/nodes-base`**: Built-in nodes for integrations
- **`packages/@n8n/nodes-langchain`**: AI/LangChain nodes
- **`@n8n/design-system`**: Vue component library for UI consistency
- **`@n8n/config`**: Centralized configuration management

## Technology Stack

- **Frontend:** Vue 3 + TypeScript + Vite + Pinia + Storybook UI Library
- **Backend:** Node.js + TypeScript + Express + TypeORM
- **Testing:** Jest (unit) + Playwright (E2E)
- **Database:** TypeORM with SQLite/PostgreSQL support
- **Code Quality:** Biome (for formatting) + ESLint + lefthook git hooks

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

### Workflow Traversal Utilities

The `n8n-workflow` package exports graph traversal utilities from
`packages/workflow/src/common/`. Use these instead of custom traversal logic.

**Key concept:** `workflow.connections` is indexed by **source node**.
To find parent nodes, use `mapConnectionsByDestination()` to invert it first.

```typescript
import { getParentNodes, getChildNodes, mapConnectionsByDestination } from 'n8n-workflow';

// Finding parent nodes (predecessors) - requires inverted connections
const connectionsByDestination = mapConnectionsByDestination(workflow.connections);
const parents = getParentNodes(connectionsByDestination, 'NodeName', 'main', 1);

// Finding child nodes (successors) - uses connections directly
const children = getChildNodes(workflow.connections, 'NodeName', 'main', 1);
```

### TypeScript Best Practices
- **NEVER use `any` type** - use proper types or `unknown`
- **Avoid type casting with `as`** - use type guards or type predicates instead (except in test code where `as` is acceptable)
- **Define shared interfaces in `@n8n/api-types`** package for FE/BE communication
- **Lazy-load heavy modules** — if a module is only used in a specific code
  path (not every request), use `await import()` at point of use instead of
  top-level `import`. Applies especially to native modules and large parsers.

### Error Handling
- Don't use `ApplicationError` class in CLI and nodes for throwing errors,
  because it's deprecated. Use `UnexpectedError`, `OperationalError` or
  `UserError` instead.
- Import from appropriate error classes in each package

### Frontend Development
- **All UI text must use i18n** - add translations to `@n8n/i18n` package
- **Use CSS variables directly** - never hardcode spacing as px values
- **data-testid must be a single value** (no spaces or multiple values)
- For style changes and design-system updates, follow
  `.agents/design-system-style-rules.md`

When implementing CSS, refer to @packages/frontend/CLAUDE.md for guidelines on
CSS variables and styling conventions.

### Testing Guidelines
- **Always work from within the package directory** when running tests
- **Mock all external dependencies** in unit tests
- **Prefer reusing hoisted shared `mock<T>(...)` fixtures** when a typed mock is immutable and used across tests. This rule exists to avoid massive test slowdowns from repeatedly creating nested proxy mocks while preserving the type contract. Avoid replacing these with `as unknown as T` helpers for entities like `User`.
- **Confirm test cases with user** before writing unit tests
- **Typecheck is critical before committing** - always run `pnpm typecheck`
- **When modifying pinia stores**, check for unused computed properties

What we use for testing and writing tests:
- For testing nodes and other backend components, we use Jest for unit tests. Examples can be found in `packages/nodes-base/nodes/**/*test*`.
- We use `nock` for server mocking
- For frontend we use `vitest`
- For E2E tests we use Playwright. Run with `pnpm --filter=n8n-playwright test:local`.
  See `packages/testing/playwright/README.md` for details.
- **For Playwright test maintenance/cleanup**, see @packages/testing/playwright/AGENTS.md (includes janitor tool for static analysis, dead code removal, architecture enforcement, and TCR workflows).

### Common Development Tasks

When implementing features:
1. Define API types in `packages/@n8n/api-types`
2. Implement backend logic in `packages/cli` module, follow
   `@packages/cli/scripts/backend-module/backend-module-guide.md`
3. Add API endpoints via controllers
4. Update frontend in `packages/editor-ui` with i18n support
5. Write tests with proper mocks
6. Run `pnpm typecheck` to verify types

## Design Principles

### Security Must Not Degrade the Building Experience

Security improvements, whether driven by enterprise requirements or internal
standards, must NEVER add friction to the common-case building experience. When
designing security-related features (defaults, behaviors, flows, error
handling), apply these checks:

- **No friction for the common case:** A community builder's workflow should
  remain intuitive. Security should be invisible when it can be.
- **Migration and upgrade paths:** Existing users must have a clear,
  non-disruptive path forward when defaults or behaviors change.
- **Security layers on top, not in competition:** Great UX and strong security
  are not trade-offs. They're both required. If a design forces a choice
  between them, the design needs more work.

### Security Fix Hygiene

**This is a public repository.** When working on security fixes, never expose
the attack vector or vulnerability type in any public-facing artifact. Attackers
monitor open-source repos for signals like branch names, commit messages, PR
titles, test descriptions, and Linear URLs.

**Rules for security fixes:**

- **Branch names:** Do NOT use the Linear-suggested branch name if it reveals
  the vulnerability. Rename to describe the fix neutrally
  (e.g. `node-1234-improve-request-handling`, not
  `node-1234-fix-ddos-vulnerability`).
- **Commit messages:** Describe what the code now does, not the threat it
  prevents (e.g. `fix: add payload size validation`, not
  `fix: prevent denial of service`).
- **Test descriptions:** Use neutral, functional language
  (e.g. `'should sanitize query parameters'`, not
  `'should prevent SQL injection'`).
- **Code comments:** Do not describe the attack scenario in comments.
- **Linear references:** Never include the URL slug
  (e.g. `.../N8N-1234/fix-ssrf-vulnerability`).

## Github Guidelines
- When creating a PR, use the conventions in
  `.github/pull_request_template.md` and
  `.github/pull_request_title_conventions.md`.
- Use `gh pr create --draft` to create draft PRs.
- Always reference the Linear ticket in the PR description,
  use `https://linear.app/n8n/issue/[TICKET-ID]`
- always link to the github issue if mentioned in the linear ticket.
