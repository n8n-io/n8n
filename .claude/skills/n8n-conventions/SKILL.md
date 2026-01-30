---
name: n8n-conventions
description: n8n codebase conventions, architecture patterns, and coding standards. Use when working with n8n code, answering questions about n8n patterns, or making edits to n8n projects. Covers TypeScript standards, Vue 3 frontend, Node.js backend, and monorepo structure.
---

# n8n Codebase Conventions

## Monorepo Structure

n8n uses a TypeScript monorepo with pnpm workspaces and Turbo build system.

### Key Packages

| Package | Purpose |
|---------|---------|
| `packages/cli` | Express server, REST API, main entry point |
| `packages/core` | Workflow execution engine |
| `packages/workflow` | Core interfaces and types |
| `packages/@n8n/db` | TypeORM entities and migrations |
| `packages/@n8n/api-types` | Shared TypeScript interfaces (FE/BE) |
| `packages/@n8n/config` | Centralized configuration |
| `packages/@n8n/di` | Dependency injection |
| `packages/@n8n/errors` | Error classes |
| `packages/frontend/editor-ui` | Vue 3 frontend application |
| `packages/frontend/@n8n/design-system` | Reusable Vue components |
| `packages/frontend/@n8n/i18n` | Internationalization resources |
| `packages/frontend/@n8n/stores` | Pinia store constants |
| `packages/nodes-base` | Built-in node implementations |

## TypeScript Standards

### Strict Typing Rules

- **Never use `any`** - Use `unknown` or proper types
- **Avoid type casting with `as`** - Use `satisfies` instead (except in test code where `as` is acceptable)
- **Use type guards** when runtime checks are needed
- **Define shared interfaces in `@n8n/api-types`** for cross-package communication

```typescript
// BAD - type casting
const config = { port: 3000 } as ServerConfig;

// GOOD - use satisfies
const config = { port: 3000 } satisfies ServerConfig;

// GOOD - type guard for runtime checks
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}
```

### Error Handling

Import error classes from `n8n-workflow`:

```typescript
import { UnexpectedError } from 'n8n-workflow';

// Use for unexpected/programming errors
throw new UnexpectedError('Active version not found for workflow', {
  extra: { workflowId },
});

// Do NOT use deprecated ApplicationError
```

### Input Validation

Use Zod schemas for validation:

```typescript
import { z } from 'zod';

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(nodeSchema),
  active: z.boolean().default(false),
});
```

## Backend Patterns

### Controller-Service-Repository

```
Controller (handles HTTP)
  -> Service (business logic)
    -> Repository (data access)
```

### Dependency Injection

Use `@n8n/di` for dependency injection:

```typescript
import { Service } from '@n8n/di';

@Service()
export class WorkflowService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly logger: Logger,
  ) {}
}
```

### Configuration

Use `@n8n/config` for all configuration:

```typescript
import { Config } from '@n8n/config';

@Service()
export class MyService {
  constructor(private readonly config: Config) {
    const dbHost = this.config.database.host;
  }
}
```

## Frontend Patterns (Vue 3)

### Component Structure

Always use `<script setup lang="ts">` with Composition API:

```vue
<script setup lang="ts">
import { computed } from 'vue';

type Props = {
  title: string;
  items: ReadonlyArray<string>;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', value: string): void;
}>();

const count = computed(() => props.items.length);
</script>

<template>
  <section>
    <h2>{{ props.title }} ({{ count }})</h2>
  </section>
</template>
```

### Pinia Stores

Use setup store syntax with `STORES` constants from `@n8n/stores`:

```typescript
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { shallowRef, computed } from 'vue';

export const useWorkflowStore = defineStore(STORES.WORKFLOW, () => {
  const workflows = shallowRef<Workflow[]>([]);
  const count = computed(() => workflows.value.length);

  function setWorkflows(list: Workflow[]) {
    workflows.value = list;
  }

  return { workflows, count, setWorkflows };
});
```

In components, use `storeToRefs()`:

```typescript
const workflowStore = useWorkflowStore();
const { workflows, count } = storeToRefs(workflowStore);
```

### CSS Variables

Never hardcode values. Use design system variables (see `packages/frontend/AGENTS.md`):

```css
/* Spacing */
--spacing--5xs: 2px;  --spacing--4xs: 4px;  --spacing--3xs: 6px;
--spacing--2xs: 8px;  --spacing--xs: 12px;  --spacing--sm: 16px;
--spacing--md: 20px;  --spacing--lg: 24px;  --spacing--xl: 32px;

/* Colors */
--color--primary, --color--primary--shade-1, --color--primary--tint-1
--color--text, --color--text--tint-1, --color--text--danger
--color--background, --color--background--shade-1
--color--foreground, --color--foreground--tint-1
--color--success, --color--warning, --color--danger

/* Typography */
--font-size--2xs: 12px;  --font-size--xs: 13px;  --font-size--sm: 14px;
--font-size--md: 16px;   --font-size--lg: 18px;
--font-weight--regular: 400;  --font-weight--bold: 600;

/* Borders */
--radius--sm: 2px;  --radius: 4px;  --radius--lg: 8px;  --radius--xl: 12px;
```

### i18n Requirements

ALL UI text must use translations:

```vue
<template>
  <span>{{ $t('workflows.create.title') }}</span>
</template>
```

Add translations to `packages/@n8n/i18n`.

### Testing

- Use **Vitest** for unit tests
- Use **@testing-library/vue** for component tests
- Use **Playwright** for E2E tests
- Add `data-testid` attributes for E2E selectors (no spaces)

```typescript
import { render, screen } from '@testing-library/vue';

it('renders title', () => {
  render(MyComponent, { props: { title: 'Test' } });
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

## Database Patterns

### TypeORM Entities

Located in `packages/@n8n/db`:

```typescript
@Entity()
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Multi-Database Support

n8n application supports SQLite and PostgreSQL. Avoid database-specific features in application code.

**Note:** When working on database nodes (MySQL Node, PostgreSQL Node, etc.), database-specific features are expected.

## Security Guidelines

### Frontend

- Never use `v-html` with user content - use custom `v-n8n-html` directive (sanitizes HTML)
- External links need `rel="noopener noreferrer"`
- No `eval()`, `new Function()`, or dynamic code execution
- Never store secrets in localStorage/sessionStorage

### Backend

- Validate all inputs with Zod schemas
- Use parameterized queries (TypeORM handles this)
- Sanitize user-provided data before logging

## Development Workflow

```bash
# Navigate to package
pushd packages/frontend/editor-ui

# Run linter
pnpm lint

# Run type checker
pnpm typecheck

# Run tests
pnpm test

# Build (if needed)
pnpm build

# Return to root
popd
```

## Common File Locations

| What | Where |
|------|-------|
| API Controllers | `packages/cli/src/controllers/` |
| Services | `packages/cli/src/services/` |
| Database Entities | `packages/@n8n/db/src/entities/` |
| Vue Components | `packages/frontend/editor-ui/src/app/components/` |
| Feature Modules | `packages/frontend/editor-ui/src/features/` |
| Pinia Stores | `packages/frontend/editor-ui/src/app/stores/` |
| Store Constants | `packages/frontend/@n8n/stores/` |
| Composables | `packages/frontend/@n8n/composables/` |
| Design System | `packages/frontend/@n8n/design-system/src/` |
| i18n Resources | `packages/frontend/@n8n/i18n/` |
| Node Implementations | `packages/nodes-base/nodes/` |
| Credentials | `packages/nodes-base/credentials/` |
| Shared Types | `packages/@n8n/api-types/src/` |
| Error Classes | `packages/@n8n/errors/` |
