# n8n Architecture Overview

A high-level guide to the n8n monorepo structure, key packages, and architectural patterns for contributors.

---

## Repository Layout

```
n8n-repo/
├── packages/                     # All source packages (pnpm workspaces)
│   ├── cli/                      # Express server + REST API + CLI
│   ├── core/                     # Workflow execution engine
│   ├── workflow/                  # Core interfaces, types, utility functions
│   ├── nodes-base/                # 400+ built-in integration nodes
│   ├── node-dev/                  # CLI tool for custom node development
│   ├── @n8n/
│   │   ├── api-types/             # Shared TypeScript interfaces (FE ↔ BE)
│   │   ├── db/                    # TypeORM entities and migrations
│   │   ├── config/                # Centralised configuration via env vars
│   │   ├── nodes-langchain/       # AI / LangChain nodes
│   │   ├── di/                    # IoC dependency injection container
│   │   ├── i18n/                  # Internationalisation strings
│   │   ├── task-runner/           # Sandboxed JS execution runner
│   │   └── decorators/            # Shared TypeScript decorators
│   └── frontend/
│       ├── editor-ui/             # Vue 3 + Pinia workflow editor
│       └── @n8n/design-system/    # Shared Vue component library
├── docker/                        # Dockerfiles and Compose configurations
├── docs/                          # ← Developer documentation (you are here)
├── agents/                        # Claude Code agent skills for n8n dev
├── scripts/                       # Build, release, and CI helper scripts
└── .github/                       # GitHub Actions workflows, templates
```

---

## Package Dependency Graph

```mermaid
graph TD
    A[workflow] --> B[core]
    A --> C[nodes-base]
    A --> D[@n8n/nodes-langchain]
    B --> E[cli]
    C --> E
    D --> E
    F[@n8n/db] --> E
    G[@n8n/config] --> E
    H[@n8n/di] --> E
    I[@n8n/api-types] --> E
    I --> J[editor-ui]
    K[@n8n/design-system] --> J
    L[@n8n/i18n] --> J
```

---

## Key Packages

### `packages/workflow`
Core interfaces and utilities shared across the whole platform:
- `INode`, `IWorkflow`, `IExecutionResult` type definitions
- Workflow graph traversal utilities (`getParentNodes`, `getChildNodes`)
- Expression evaluation engine
- Error types (`UserError`, `OperationalError`, `UnexpectedError`)

### `packages/core`
The workflow execution engine:
- Node execution context creation
- Active webhook management
- Sub-workflow execution

### `packages/cli`
The Express.js backend — the main entrypoint when running n8n:
- REST API controllers (`packages/cli/src/controllers/`)
- Authentication (JWT, SAML, LDAP, basic auth)
- Queue management (Bull/BullMQ for worker mode)
- Webhook server
- Event system (internal event bus)

Pattern: **Controller → Service → Repository**

```
HTTP Request
  └─ Controller (validation, auth guard)
       └─ Service (business logic, DI)
            └─ Repository (TypeORM, database)
```

### `packages/nodes-base`
All built-in integration nodes. Each node implements `INodeType`:

```typescript
export class MyIntegration implements INodeType {
  description: INodeTypeDescription = { /* ... */ };
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // implementation
  }
}
```

### `packages/frontend/editor-ui`
Vue 3 workflow editor using Pinia for state management.

Key directories:
- `src/components/` — Reusable Vue components
- `src/stores/` — Pinia stores (workflows, UI, credentials, settings)
- `src/composables/` — Vue composables
- `src/views/` — Route-level page components
- `src/plugins/` — Vue plugins (router, i18n, etc.)

### `packages/@n8n/design-system`
Component library used by the editor. Use these components instead of writing raw HTML:
- `N8nButton`, `N8nInput`, `N8nSelect`, `N8nIcon`
- `N8nInfoTip`, `N8nTooltip`, `N8nTag`

---

## Architectural Patterns

### Dependency Injection

Backend services use `@n8n/di` (an IoC container):

```typescript
import { Service } from '@n8n/di';
import { Config } from '@n8n/config';

@Service()
export class WorkflowService {
  constructor(
    private readonly config: Config,
    private readonly workflowRepository: WorkflowRepository,
  ) {}
}
```

### Event-Driven Communication

Internal events decouple modules. Emit via the event bus:

```typescript
import { EventService } from '@/services/event.service';

this.eventService.emit('workflow-executed', { workflowId, status });
```

Subscribe in the module that cares:

```typescript
this.eventService.on('workflow-executed', (event) => { /* ... */ });
```

### Frontend State (Pinia)

```typescript
import { defineStore } from 'pinia';
import { STORES } from '@/constants';

export const useWorkflowsStore = defineStore(STORES.WORKFLOWS, () => {
  const workflows = shallowRef<IWorkflowDb[]>([]);

  async function fetchAll() {
    workflows.value = await workflowsApi.getAll();
  }

  return { workflows, fetchAll };
});
```

### Configuration (`@n8n/config`)

All configuration comes from environment variables via the `Config` class. Never use `process.env` directly:

```typescript
import { Config } from '@n8n/config';

@Service()
export class MyService {
  constructor(private readonly config: Config) {}

  doSomething() {
    const port = this.config.getEnv('port');
  }
}
```

---

## Build System

n8n uses **Turborepo** for orchestrated monorepo builds:

```bash
pnpm build            # Build all packages in dependency order
pnpm build --filter=@n8n/cli  # Build only cli and its dependencies
```

The build pipeline is defined in `turbo.json`.

---

## CI/CD Pipelines

GitHub Actions workflows live in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci-pull-requests.yml` | PR opened/updated | Lint, typecheck, unit tests |
| `ci-master.yml` | Push to master | Full test suite + build |
| `docker-build-push.yml` | Release tag | Build and push Docker images |
| `release-create-pr.yml` | Manual | Create release PR |

---

## Database Layer

n8n supports **SQLite** (default) and **PostgreSQL**. The database layer uses TypeORM:

- Entities in `packages/@n8n/db/src/entities/`
- Migrations in `packages/@n8n/db/src/migrations/`
- Repositories in `packages/@n8n/db/src/repositories/`

> Migrations in `packages/@n8n/db/src/migrations/` require review by `@n8n-io/migrations-review` (see [CODEOWNERS](../.github/CODEOWNERS)).

---

## Security Architecture

- **Credentials**: Encrypted at rest using `N8N_ENCRYPTION_KEY` (AES-256).
- **Execution data**: Can be stored in DB or pruned after N days.
- **Webhook endpoints**: Validated with unique path tokens.
- **Enterprise**: SAML SSO, LDAP, role-based access control (RBAC), audit logs.

See [SECURITY.md](../SECURITY.md) for the vulnerability disclosure policy.

---

## Further Reading

- [CONTRIBUTING.md](../CONTRIBUTING.md) — how to make code changes
- [AGENTS.md](../AGENTS.md) — conventions used by AI coding agents in this repo
- [n8n Docs: Hosting](https://docs.n8n.io/hosting/) — production deployment guides
- [n8n Docs: Creating Nodes](https://docs.n8n.io/integrations/creating-nodes/) — custom integration development
