# STRUCTURE.md — Directory Layout & Key Locations

## Monorepo Root

```
n8n/
├── packages/                    # All packages (pnpm workspaces)
│   ├── @n8n/                    # Scoped internal packages
│   ├── cli/                     # Backend server & CLI (Express + TypeORM)
│   ├── core/                    # Workflow execution engine
│   ├── workflow/                # Core workflow types & interfaces
│   ├── nodes-base/              # 300+ built-in integration nodes
│   ├── frontend/                # Frontend packages
│   │   ├── editor-ui/           # Vue 3 main application
│   │   └── @n8n/               # Frontend scoped packages (design-system, i18n, etc.)
│   └── testing/                 # Test infrastructure (Playwright, janitor, benchmarks)
├── docker/                      # Docker build files
├── assets/                      # Static assets
├── .github/                     # CI/CD workflows, PR templates
├── pnpm-workspace.yaml          # Workspace definition
├── turbo.json                   # Turbo build orchestration
└── biome.jsonc                  # Biome formatting config
```

## Key Packages

### `packages/cli/` — Backend Server

The main backend application. Express server, REST API, CLI commands, database access.

```
packages/cli/src/
├── commands/                    # CLI commands (start, worker, webhook, export, import)
├── controllers/                 # REST API controllers (auth, workflows, credentials, etc.)
├── databases/                   # TypeORM repositories
├── services/                    # Business logic services
├── modules/                     # Feature modules (sso-saml, sso-oidc, insights, etc.)
├── auth/                        # Authentication handlers (JWT, session)
├── credentials/                 # Credential management
├── sso.ee/                      # SSO enterprise features
├── eventbus/                    # Event bus for decoupled messaging
├── events/                      # Event definitions
├── scaling/                     # Multi-instance scaling (queue mode)
├── execution-lifecycle/         # Workflow execution lifecycle
├── concurrency/                 # Concurrency controls
├── push/                        # WebSocket/SSE push connections
├── webhooks/                    # Webhook handling
├── environments.ee/             # Source control & environments (EE)
├── evaluation.ee/               # Evaluation features (EE)
├── errors/                      # Error classes
└── config/                      # Runtime configuration
```

### `packages/@n8n/db/` — Database Layer

TypeORM entities, migrations, repositories, and database services.

```
packages/@n8n/db/src/
├── entities/                    # TypeORM entity definitions
├── migrations/                  # Database migrations (sqlite, postgres, mysql)
├── repositories/                # TypeORM repositories
├── services/                    # Database services
├── subscribers/                 # TypeORM event subscribers
├── connection/                  # Database connection setup
└── utils/                       # Database utilities
```

### `packages/core/` — Execution Engine

Core workflow execution logic, node execution contexts, binary data handling.

```
packages/core/src/
├── execution-engine/            # Main execution engine
├── node-execution-context/      # Context objects for node execution
├── binary-data/                 # Binary data storage & management
├── partial-execution-utils/     # Partial execution support
├── security-audit/              # Security auditing utilities
└── errors/                      # Core error classes
```

### `packages/workflow/` — Workflow Types

Foundational types, interfaces, expression evaluation, and graph traversal utilities.

```
packages/workflow/src/
├── common/                      # Graph traversal utilities (getParentNodes, getChildNodes, etc.)
├── Expression*.ts               # Expression parser and evaluator
├── Workflow.ts                  # Core Workflow class
├── NodeHelpers.ts               # Node utility functions
├── Interfaces.ts                # Core interfaces (INode, IWorkflow, etc.)
└── errors/                      # Workflow error classes
```

### `packages/nodes-base/` — Integration Nodes

300+ built-in nodes for third-party integrations.

```
packages/nodes-base/
├── nodes/                       # Node implementations (~306 directories)
│   ├── Slack/                   # Example: each node has its own directory
│   ├── Google/
│   ├── HttpRequest/
│   └── ...
├── credentials/                 # Credential type definitions
└── test/                        # Node-level tests
```

### `packages/frontend/editor-ui/` — Vue 3 Frontend

Main user-facing application.

```
packages/frontend/editor-ui/src/
├── app/                         # Application core
│   ├── api/                     # API client layer
│   ├── components/              # App-level components
│   ├── composables/             # Vue composables
│   ├── constants/               # Constants (durations, etc.)
│   ├── stores/                  # Pinia state stores
│   ├── router.ts                # Vue Router configuration
│   ├── views/                   # Route view components
│   └── utils/                   # Utility functions
├── features/                    # Feature modules
│   ├── ai/                      # AI features
│   ├── collaboration/           # Real-time collaboration
│   ├── credentials/             # Credential management UI
│   ├── execution/               # Execution display
│   ├── integrations/            # Integration marketplace
│   ├── ndv/                     # Node Detail View
│   ├── workflows/               # Workflow management
│   └── ...
├── experiments/                 # Feature flag experiments
└── main.ts                      # Application entry point
```

### `packages/frontend/@n8n/design-system/` — Component Library

Reusable Vue components prefixed with `N8n` (e.g., `N8nButton`, `N8nIcon`).

### `packages/@n8n/api-types/` — Shared API Types

TypeScript interfaces shared between frontend and backend for API communication.

### `packages/@n8n/config/` — Configuration

Centralized configuration using class-based config definitions.

```
packages/@n8n/config/src/configs/
├── database.config.ts
├── redis.config.ts
├── auth.config.ts
├── ai.config.ts
├── security.config.ts
├── sso.config.ts
├── scaling-mode.config.ts
└── ... (40+ config files)
```

### `packages/@n8n/di/` — Dependency Injection

IoC container for backend service wiring.

### `packages/testing/` — Test Infrastructure

```
packages/testing/
├── playwright/                  # E2E tests
│   ├── tests/e2e/              # Test specs
│   ├── pages/                  # Page objects
│   ├── composables/            # Test composables/flows
│   ├── fixtures/               # Playwright fixtures
│   └── services/               # API helpers
├── janitor/                    # Test maintenance tooling
├── rules-engine/               # Test rules engine
├── code-health/                # Code health checks
└── performance/                # Performance benchmarks
```

## Naming Conventions

### Files
- **Backend**: `kebab-case.ts` (e.g., `active-workflow-manager.ts`)
- **Controllers**: `*.controller.ts` (e.g., `auth.controller.ts`)
- **Services**: `*.service.ts` (e.g., `auth.service.ts`)
- **Entities**: `PascalCase.ts` in `entities/` (e.g., `WorkflowEntity.ts`)
- **Enterprise features**: `*.ee.ts` or `*.ee/` suffix
- **Frontend components**: `PascalCase.vue` (e.g., `WorkflowCard.vue`)
- **Pinia stores**: `*.store.ts` (e.g., `workflows.store.ts`)
- **Composables**: `use*.ts` (e.g., `useWorkflow.ts`)
- **Test files**: `*.test.ts` or `*.spec.ts`

### Directories
- Enterprise features use `.ee` suffix: `sso.ee/`, `environments.ee/`
- Scoped packages under `@n8n/`: `packages/@n8n/config/`
- Feature modules in frontend: `features/<feature-name>/`

## Where to Add New Code

| What | Where |
|------|-------|
| New API endpoint | `packages/cli/src/controllers/` |
| New service | `packages/cli/src/services/` or feature module |
| New feature module | `packages/cli/src/modules/<name>/` |
| New DB entity | `packages/@n8n/db/src/entities/` |
| New DB migration | `packages/@n8n/db/src/migrations/` |
| New integration node | `packages/nodes-base/nodes/<NodeName>/` |
| New AI/LangChain node | `packages/@n8n/nodes-langchain/nodes/` |
| New credential type | `packages/nodes-base/credentials/` |
| Shared FE/BE types | `packages/@n8n/api-types/src/` |
| New Vue component | `packages/frontend/editor-ui/src/` (feature-specific) |
| Design system component | `packages/frontend/@n8n/design-system/src/components/` |
| New Pinia store | `packages/frontend/editor-ui/src/app/stores/` |
| Configuration | `packages/@n8n/config/src/configs/` |
| E2E test | `packages/testing/playwright/tests/e2e/` |
| i18n strings | `packages/frontend/@n8n/i18n/` |
