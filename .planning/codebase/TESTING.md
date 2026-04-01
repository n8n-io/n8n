# TESTING.md — Test Frameworks, Structure & Patterns

## Frameworks Overview

| Framework | Scope | Packages |
|-----------|-------|----------|
| **Jest** | Backend unit & integration | `cli`, `core`, `workflow`, `nodes-base`, `@n8n/backend-common` |
| **Vitest** | Frontend unit & some packages | `editor-ui`, `design-system`, `@n8n/decorators`, `@n8n/crdt`, etc. |
| **Playwright** | E2E browser tests | `packages/testing/playwright/` |

## Running Tests

### Global Commands
```bash
pnpm test                  # Run all tests
pnpm test:affected         # Tests affected by recent changes
```

### Package-Specific (preferred)
```bash
# Navigate to package first
pushd packages/cli
pnpm test <test-file>      # Run specific test
popd

pushd packages/nodes-base
pnpm test nodes/Slack/test/Slack.test.ts
popd
```

### E2E Tests
```bash
pnpm --filter=n8n-playwright test:local <file-path>
pnpm --filter=n8n-playwright test:local tests/e2e/credentials/crud.spec.ts

# With container capabilities
pnpm --filter=n8n-playwright test:container:sqlite --grep @capability:email
```

## Jest Configuration (Backend)

### Config Files
- `packages/cli/jest.config.js` — main config
- `packages/cli/jest.config.unit.js` — unit tests only
- `packages/cli/jest.config.integration.js` — integration tests
- `packages/cli/jest.config.integration.testcontainers.js` — testcontainer tests
- `packages/cli/jest.config.migration.js` — migration tests
- `packages/nodes-base/jest.config.js`
- `packages/core/jest.config.js`
- `packages/workflow/jest.config.js`

### Test File Locations
- Unit tests: alongside source in `__tests__/` directories or `*.test.ts`
- Integration tests: `packages/cli/test/integration/`
- Node tests: `packages/nodes-base/nodes/<NodeName>/test/`

## Vitest Configuration (Frontend)

### Config Files
- `packages/frontend/editor-ui/vitest.config.ts` (via `@n8n/vitest-config`)
- `packages/frontend/@n8n/design-system/vitest.config.ts`
- Various scoped packages: `packages/@n8n/*/vitest.config.ts`

### Test File Locations
- Component tests: alongside source in `__tests__/` directories
- Store tests: `packages/frontend/editor-ui/src/app/stores/__tests__/`

## Playwright E2E Architecture

```
Tests (*.spec.ts)
    ↓ uses
Composables (*Composer.ts)    — Multi-step business workflows
    ↓ orchestrates
Page Objects (*Page.ts)       — UI interactions
    ↓ extends
BasePage                      — Common utilities
```

### Key Locations
- Test specs: `packages/testing/playwright/tests/e2e/`
- Page objects: `packages/testing/playwright/pages/`
- Composables: `packages/testing/playwright/composables/`
- Fixtures: `packages/testing/playwright/fixtures/`
- API helpers: `packages/testing/playwright/services/`

### Test Isolation
- Use `nanoid()` for unique identifiers (parallel-safe)
- Dynamic user creation via public API
- Isolated browser contexts with `n8n.start.withUser()`
- Worker isolation with `test.use({ capability: { env: { TEST_ISOLATION: 'name' } } })`

## Mocking Patterns

### Backend (Jest)
- **External HTTP**: Use `nock` for server mocking
- **DI services**: Mock via dependency injection container
- **Database**: Mock repositories or use test databases
- **Shared fixtures**: Prefer reusing hoisted `mock<T>(...)` fixtures for typed mocks

### Frontend (Vitest)
- **Pinia stores**: Use `createTestingPinia()` with mocked actions
- **API calls**: Mock API module functions
- **Composables**: Mock individual composable return values

### What to Mock
- External HTTP calls (always)
- Database in unit tests (use real DB for integration tests)
- Third-party services and APIs
- Time-sensitive operations (`jest.useFakeTimers()`)

### What NOT to Mock
- Internal utility functions
- Type conversions and data transformations
- The code under test itself

## Test Structure Patterns

### Backend Unit Test
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.MockedObject<Dependency>;

  beforeEach(() => {
    mockDependency = mock<Dependency>();
    service = new ServiceName(mockDependency);
  });

  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange
      mockDependency.method.mockReturnValue(expected);
      // Act
      const result = service.methodName(input);
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Frontend Component Test
```typescript
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';

describe('ComponentName', () => {
  it('should render correctly', () => {
    const { getByText } = render(ComponentName, {
      global: {
        plugins: [createTestingPinia()],
      },
    });
    expect(getByText('Expected Text')).toBeTruthy();
  });
});
```

### E2E Test
```typescript
import { test, expect } from '../fixtures/base';

test('should complete workflow action', async ({ n8n, api }) => {
  // API setup (fast, reliable)
  const workflow = await api.workflows.createWorkflow({
    name: `Test ${nanoid()}`,
  });

  // UI verification
  await n8n.navigate.toWorkflows();
  await expect(n8n.workflows.cards.getWorkflow(workflow.name)).toBeVisible();
});
```

## Code Quality Checks

Always run before committing:
```bash
pushd packages/<package>
pnpm lint                  # ESLint + Biome
pnpm typecheck             # TypeScript compiler checks
popd
```

## Test Maintenance

### Janitor Tool (Playwright)
Static analysis for test architecture compliance:
```bash
pnpm janitor               # Analyze entire test codebase
pnpm janitor --rule=dead-code  # Specific rule
pnpm janitor:fix --rule=dead-code  # Auto-fix
```

### TCR (Test && Commit || Revert)
Safe refactoring for tests:
```bash
pnpm janitor tcr --execute -m="chore: remove dead code"
```

## Coverage

- Backend: Jest with `--coverage` flag
- Frontend: Vitest with c8/istanbul coverage
- No enforced global threshold, but critical paths should have tests
- Focus on testing behavior, not implementation details
