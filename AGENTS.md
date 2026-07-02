# AGENTS.md

This file provides guidance on how to work with the n8n repository.

> **New here?** Start with [Project Overview](#project-overview), then
> [Fresh Checkout / Agent Setup](#fresh-checkout--agent-setup) to get the repo
> running, then skim [General Guidelines](#general-guidelines) before you make
> your first change.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [General Guidelines](#general-guidelines)
3. [Agent Skills and Claude Code Plugin](#agent-skills-and-claude-code-plugin)
4. [Essential Commands](#essential-commands)
5. [Architecture Overview](#architecture-overview)
6. [Technology Stack](#technology-stack)
7. [Key Development Patterns](#key-development-patterns)
8. [TypeScript Best Practices](#typescript-best-practices)
9. [Error Handling](#error-handling)
10. [Frontend Development](#frontend-development)
11. [Testing Guidelines](#testing-guidelines)
12. [Common Development Tasks (Step-by-Step)](#common-development-tasks-step-by-step)
13. [Design Principles](#design-principles)
14. [Security Fix Hygiene](#security-fix-hygiene)
15. [GitHub Guidelines](#github-guidelines)

---

## Project Overview

n8n is a workflow automation platform written in TypeScript, using a monorepo
structure managed by **pnpm workspaces**. It has three main pieces:

- A **Node.js backend** (Express + TypeORM)
- A **Vue 3 frontend**
- An **extensible, node-based workflow execution engine**

If you're new to the codebase, the fastest way to get oriented is to read the
[Architecture Overview](#architecture-overview) section, which lists every
package and what it's responsible for.

---

## General Guidelines

- Always use **pnpm** (not npm or yarn).
- Comments should explain the "why" concisely — a line or two is enough.
  Don't over-explain, and keep comments scoped to the surrounding code rather
  than to whatever task you happen to be doing.
- We use **Linear** for ticket tracking and **PostHog** for feature flags.
- Starting a new ticket: create a new branch from a fresh `master`.
  - Use the branch name Linear suggests — **except for security fixes**,
    where the name must be changed (see [Security Fix Hygiene](#security-fix-hygiene)).
- Use **mermaid diagrams** in Markdown files whenever a visual would help
  explain something.

---

## Agent Skills and Claude Code Plugin

- Shared skills live in `.agents/skills/`.
- **Claude Code** reads them via symlinks in `.claude/plugins/n8n/skills/`.
- **OpenCode** reads `.agents/skills/` directly.
- Harness-specific overrides (e.g. `.opencode/skills/setup-mcps/`) are real
  directories, not symlinks.
- See the [skills README](.agents/skills/AGENTS.md) for how to edit and sync
  skills.

n8n-specific Claude Code commands and agents live in `.claude/plugins/n8n/`
and are namespaced under `n8n:`. Examples: `/n8n:create-pr`, `/n8n:plan`,
`n8n:developer` agent. See the [plugin README](.claude/plugins/n8n/README.md)
for details.

---

## Essential Commands

### Fresh Checkout / Agent Setup

If you're setting up the repo for the first time (a new hire, a fresh CI box,
or an agent verifying the repo builds), use this instead of running install,
build, and test by hand:

```bash
pnpm agent:setup                 # install → build → test (full suite)
pnpm agent:setup install         # run just one step
pnpm agent:setup --json          # print a JSON summary (for scripts/agents)
```

Why prefer this over doing it manually:
- Caps per-process memory and Turbo concurrency, so a 6GB machine won't OOM.
- Streams full output to `.agent-setup/<step>.log` (gitignored) and only
  surfaces a one-line summary per step, plus the tail of any failing log.
- Always writes a machine-readable `.agent-setup/summary.json`, so a
  backgrounded run can be checked in one shot — no polling required.

### Building

```bash
pnpm build > build.log 2>&1   # always redirect output to a file
tail -n 20 build.log          # inspect the last lines for errors
```

**If build outputs or the Turbo cache look stale** (e.g. after switching
branches or worktrees) but your dependencies haven't changed:

```bash
pnpm reset          # fast: cleans build outputs, force-rebuilds
                     # (keeps node_modules and untracked files)
pnpm reset --full    # if the above doesn't fix it: also wipes untracked
                     # files and reinstalls dependencies
```

### Testing

```bash
pnpm test              # run all tests
pnpm test:affected     # run only tests affected by your recent changes
```

To run a single test file, `cd`/`pushd` into that file's directory first,
then run `pnpm test <test-file>`.

> **Tip:** When changing directories, use `pushd` to go in and `popd` to
> return. If you're ever unsure where you are, run `pwd`.

### Code Quality

```bash
pnpm lint        # lint code
pnpm typecheck   # run type checks
```

- Run these **before every commit**.
- Run them from the specific package you're working in
  (e.g. `cd packages/cli && pnpm lint`) — only run the full repo-wide check
  when preparing your final PR.
- If your change touches type definitions, `@n8n/api-types` interfaces, or
  cross-package dependencies, **build first**, then lint/typecheck.

---

## Architecture Overview

**Monorepo structure:** pnpm workspaces, orchestrated with Turbo.

| Package | Responsibility |
|---|---|
| `packages/@n8n/api-types` | Shared TypeScript interfaces between frontend and backend |
| `packages/workflow` | Core workflow interfaces and types |
| `packages/core` | Workflow execution engine |
| `packages/cli` | Express server, REST API, CLI commands |
| `packages/editor-ui` | Vue 3 frontend application |
| `packages/@n8n/i18n` | Internationalization for UI text |
| `packages/nodes-base` | Built-in nodes for integrations |
| `packages/@n8n/nodes-langchain` | AI / LangChain nodes |
| `packages/@n8n/instance-ai` | AI assistant backend ("AI Assistant" in the UI, "Instance AI" in code). See its own `CLAUDE.md` for architecture docs. |
| `@n8n/design-system` | Vue component library for UI consistency |
| `@n8n/config` | Centralized configuration management |

---

## Technology Stack

- **Frontend:** Vue 3 + TypeScript + Vite + Pinia + Storybook
- **Backend:** Node.js + TypeScript + Express + TypeORM
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Database:** TypeORM, supports SQLite and PostgreSQL
- **Code quality:** Biome (formatting) + ESLint + lefthook (git hooks)

---

## Key Development Patterns

1. **Dependency Injection** — via `@n8n/di` (IoC container)
2. **Controller-Service-Repository** — backend follows an MVC-like pattern
3. **Event-driven** — internal event bus decouples components
4. **Context-based execution** — different execution contexts per node type
5. **State management** — frontend uses Pinia stores
6. **Design system** — all pure Vue components belong in `@n8n/design-system`
   to keep the UI consistent and reusable

Other things worth knowing:
- Each package has its own isolated build config and can be developed
  independently.
- Hot reload works across the full stack in development.
- Node development has a dedicated `node-dev` CLI tool.
- Workflow tests are JSON-based, for integration testing.
- AI features have their own dev workflow: `pnpm dev:ai`.

### Workflow Traversal Utilities

Use the graph traversal utilities exported from
`packages/workflow/src/common/` instead of writing custom traversal logic.

**Key concept:** `workflow.connections` is indexed by **source node**. To
find *parent* nodes, you must invert it first with
`mapConnectionsByDestination()`.

```typescript
import { getParentNodes, getChildNodes, mapConnectionsByDestination } from 'n8n-workflow';

// Finding parent nodes (predecessors) — requires inverted connections
const connectionsByDestination = mapConnectionsByDestination(workflow.connections);
const parents = getParentNodes(connectionsByDestination, 'NodeName', 'main', 1);

// Finding child nodes (successors) — uses connections directly
const children = getChildNodes(workflow.connections, 'NodeName', 'main', 1);
```

---

## TypeScript Best Practices

- **Never use `any`** — use a proper type or `unknown`.
- **Avoid `as` type casting** — prefer type guards or type predicates.
  (Exception: `as` is acceptable in test code.)
- **Define shared FE/BE interfaces** in the `@n8n/api-types` package.
- **Lazy-load heavy modules** — if a module is only needed on a specific code
  path (not every request), use `await import()` at the point of use instead
  of a top-level `import`. This applies especially to native modules and
  large parsers.

---

## Error Handling

**Never use the deprecated `ApplicationError` class** — it exists only as a
compatibility shim so community nodes keep resolving. Instead, pick based on
the cause:

| Class | When to use it |
|---|---|
| `UserError` | The user caused it — invalid input, unauthorized action, business-rule violation |
| `OperationalError` | A transient, expected issue — a network request failing, a DB query timing out — that should be handled gracefully |
| `UnexpectedError` | A bug in the code — logic mistake, unhandled case, failed assertion — that developers need to fix |

Import from the appropriate error classes in each package.

---

## Frontend Development

See also `packages/frontend/AGENTS.md`.

- **All UI text must use i18n** — add translations to the `@n8n/i18n`
  package.
- **Use CSS variables directly** — never hardcode spacing as raw px values.
- **`data-testid` must be a single value** — no spaces, no multiple values.
- **Always use the `design-system-rules` skill** during reviews.

---

## Testing Guidelines

- Always run tests **from within the package directory**.
- **Mock all external dependencies** in unit tests.
- **Reuse hoisted shared `mock<T>(...)` fixtures** when a typed mock is
  immutable and used across tests — this avoids major test slowdowns from
  repeatedly creating nested proxy mocks, while still preserving the type
  contract. Don't replace these with `as unknown as T` helpers for entities
  like `User`.
- **Confirm test cases with the user** before writing unit tests.
- **Typecheck before committing** — always run `pnpm typecheck`.
- **When modifying Pinia stores**, check for unused computed properties.
- **Vitest packages using `@n8n/di` decorators**: use
  `createVitestConfigWithDecorators` from `@n8n/vitest-config/node-decorators`.
  It enables SWC's `decoratorMetadata` (esbuild doesn't emit it) and
  externalizes workspace packages that register services (`@n8n/di`,
  `@n8n/config`, `@n8n/constants`, `n8n-workflow`) so a single DI `Container`
  is shared across the runtime. Without this, loading them through Vitest's
  pipeline alongside their CJS dist creates two `Container`s, and
  `Container.get(...)` silently returns `undefined`.

**Tooling by area:**

| Area | Tooling |
|---|---|
| Node/backend unit tests | Vitest — examples in `packages/nodes-base/nodes/**/*test*` |
| Server mocking | `nock` |
| Frontend unit tests | Vitest |
| E2E tests | Playwright — run with `pnpm --filter=n8n-playwright test:local` (see `packages/testing/playwright/README.md`) |

**Iterating without Docker rebuilds:** boot service containers, then run dev
locally:

```bash
pnpm --filter n8n-containers services --services postgres,redis,mailpit,proxy
pnpm dev
```

See [Develop against running containers](packages/testing/playwright/README.md#develop-against-running-containers-avoid-docker-rebuilds).

For Playwright test maintenance/cleanup (static analysis, dead code removal,
architecture enforcement, TCR workflows), see
`packages/testing/playwright/AGENTS.md`.

---

## Common Development Tasks (Step-by-Step)

When implementing a new feature, follow this order:

1. Define API types in `packages/@n8n/api-types`.
2. Implement backend logic in `packages/cli`, following
   `packages/cli/scripts/backend-module/backend-module-guide.md`.
3. Add API endpoints via controllers.
4. Update the frontend in `packages/editor-ui`, with i18n support.
5. Write tests with proper mocks.
6. Run `pnpm typecheck` to verify types.

---

## Design Principles

### Security Must Not Degrade the Building Experience

Security improvements — whether from enterprise requirements or internal
standards — must **never** add friction to the common-case building
experience. When designing anything security-related (defaults, behaviors,
flows, error handling), check it against these three principles:

- **No friction for the common case.** A community builder's workflow should
  stay intuitive. Security should be invisible when possible.
- **Clear migration and upgrade paths.** Existing users need a
  non-disruptive path forward whenever defaults or behaviors change.
- **Security layers on top, not in competition.** Good UX and strong
  security are not a trade-off — both are required. If a design forces you
  to choose between them, the design isn't finished yet.

---

## Security Fix Hygiene

**This is a public repository.** Attackers monitor open-source repos for
signals — branch names, commit messages, PR titles, test descriptions,
Linear URLs — so when working on a security fix, **never expose the attack
vector or vulnerability type** in any public-facing artifact.

| Artifact | Do | Don't |
|---|---|---|
| Branch name | Describe the fix neutrally, e.g. `node-1234-improve-request-handling` | Reveal the vulnerability, e.g. `node-1234-fix-ddos-vulnerability` |
| Commit message | Describe what the code now does, e.g. `fix: add payload size validation` | Name the threat, e.g. `fix: prevent denial of service` |
| Test description | Neutral/functional, e.g. `'should sanitize query parameters'` | Name the attack, e.g. `'should prevent SQL injection'` |
| Code comments | — | Don't describe the attack scenario |
| Linear references | Reference the ticket ID only | Don't include the URL slug, e.g. `.../N8N-1234/fix-ssrf-vulnerability` |

> **Reminder:** if the Linear-suggested branch name reveals the
> vulnerability, don't use it — rename it neutrally instead.

---

## GitHub Guidelines

- Follow the conventions in `.github/pull_request_template.md` and
  `.github/pull_request_title_conventions.md` when creating a PR.
- Create draft PRs with `gh pr create --draft`.
- If there's a corresponding Linear ticket, reference it in the PR
  description as `https://linear.app/n8n/issue/[TICKET-ID]`.
  **Do not create a Linear ticket yourself** — ask first.
- Always link to the GitHub issue if one is mentioned in the Linear ticket.
