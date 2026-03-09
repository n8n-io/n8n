# AGENTS.md

This file provides guidance on how to work with this **forked n8n repository**, which is customized for specific, individual needs.

---

## Project Overview

This repository is a **private fork** of n8n. It has been modified from the vanilla version to support unique workflow and infrastructure requirements.

### Key Customizations

* **Runtime**: Uses the **N|Solid** runtime instead of standard Node.js.
* **Telemetry**: Emits telemetry as defined in `MIGRATION_GUIDE_FOR_AI_AGENTS.md`.
* **Execution Environment**: This fork is designed **exclusively to run in a Docker container**. Local execution is not supported or recommended.
* **Authentication**: Uses a pre-defined password hash located at `/scripts/n8n-password-hash.txt`.

---

## Development & Deployment Workflow

### Building and Docker Integration

Building this project always involves rebuilding the Docker image.

* **Persistence**: Rebuilds must reference existing Docker volumes. This ensures that configuration, workflows, and database states from previous containers are preserved.
* **Setup Bypass**: Images must be built and configured so that the running container does not present initial configuration prompts in the browser.
* **Building**: Use `pnpm build` within the build pipeline, ensuring output is captured:
```bash
pnpm build > build.log 2>&1

```



### Deployment Validation

Every time a Docker image is built, you must verify the deployment using the following steps:

1. Start the Docker container.
2. Access the n8n interface using **VS Code's built-in browser**.
3. **Success Criteria**: You should see a login page requesting existing credentials. If you see a "Create Account" or setup prompt, the volume/configuration persistence has failed.

---

## General Guidelines

* **Always use pnpm** for package management.
* **Branching**: Create new branches from a fresh master for every feature or fix.
* **Visuals**: Use Mermaid diagrams in Markdown files for architectural visualizations.

---

## Architecture & Technology Stack

**Monorepo Structure:** pnpm workspaces with Turbo build orchestration.

* **Runtime:** N|Solid + TypeScript
* **Frontend:** Vue 3 + TypeScript + Vite + Pinia
* **Backend:** Express + TypeORM (configured for Docker environments)
* **Testing:** Jest (unit) + Playwright (E2E)
* **Design System**: Centralized Vue components in `@n8n/design-system`.

### Package Structure

| Package | Description |
| --- | --- |
| `packages/@n8n/api-types` | Shared TS interfaces for FE/BE |
| `packages/workflow` | Core workflow types |
| `packages/core` | Workflow execution engine |
| `packages/cli` | Express server and REST API |
| `packages/editor-ui` | Vue 3 frontend |

---

## Technical Best Practices

### TypeScript

* **No `any**`: Use proper types or `unknown`.
* **Avoid Casting**: Use type guards/predicates instead of `as` (except in tests).
* **Shared Interfaces**: Always define shared data structures in `@n8n/api-types`.

### Error Handling

* **Deprecated**: Do not use the `ApplicationError` class.
* **Standard**: Use `UnexpectedError`, `OperationalError`, or `UserError`.

### Frontend & i18n

* All UI text must be added to the `@n8n/i18n` package.
* **Styling**: Use CSS variables directly; avoid hardcoded pixel values for spacing.
* **Testing**: `data-testid` must be a single, space-free value.

---

## Testing Guidelines

* **Context**: Always run tests from within the specific package directory.
* **Mocks**: Mock all external dependencies in unit tests using `nock` or Jest mocks.
* **Typechecking**: Run `pnpm typecheck` before any commit to verify integrity.
* **E2E**: Use Playwright for end-to-end testing via `pnpm --filter=n8n-playwright test:local`.

Would you like me to generate a Docker Compose snippet that incorporates these volume and password hash requirements?