# E2E Test Task Guide

## Required Reading

**Before writing any code**, read these files:
```
packages/testing/playwright/AGENTS.md      # Patterns, anti-patterns, entry points
packages/testing/playwright/CONTRIBUTING.md # Detailed architecture (first 200 lines)
```

## Spec Validation

Before starting, verify the spec includes:

| Required | Example |
|----------|---------|
| **File(s) to modify** | `tests/e2e/credentials/crud.spec.ts` |
| **Specific behavior** | "Verify credential renaming updates the list" |
| **Pattern reference** | "Follow existing tests in same file" or "See AGENTS.md" |

**If missing, ask for clarification.** Don't guess at requirements.

## Commands

```bash
# Run single test
pnpm --filter=n8n-playwright test:local tests/e2e/your-test.spec.ts --reporter=list 2>&1 | tail -50

# Run with pattern match
pnpm --filter=n8n-playwright test:local --grep "should do something" --reporter=list 2>&1 | tail -50

# Container tests (requires pnpm build:docker first)
pnpm --filter=n8n-playwright test:container:sqlite --grep @capability:email --reporter=list 2>&1 | tail -50
```

## Test Structure

```typescript
import { test, expect } from '../fixtures/base';
import { nanoid } from 'nanoid';

test('should do something @mode:sqlite', async ({ n8n, api }) => {
  // Setup via API (faster, more reliable)
  const workflow = await api.workflowApi.createWorkflow(workflowJson);

  // UI interaction via entry points
  await n8n.start.fromBlankCanvas();

  // Assertions
  await expect(n8n.workflows.getWorkflowByName(workflow.name)).toBeVisible();
});
```

## Entry Points

Use `n8n.start.*` methods - see `composables/TestEntryComposer.ts`:
- `fromBlankCanvas()` - New workflow
- `fromImportedWorkflow(file)` - Pre-built workflow
- `fromNewProjectBlankCanvas()` - Project-scoped
- `withUser(user)` - Isolated browser context

## Multi-User Tests

```typescript
const member = await api.publicApi.createUser({ role: 'global:member' });
const memberPage = await n8n.start.withUser(member);
await memberPage.navigate.toWorkflows();
```

## Development Process

1. **Validate spec** - Has file, behavior, pattern reference?
2. **Read existing code** - Understand current patterns in the file
3. **Identify helpers needed** - Check `pages/`, `services/`, `composables/`
4. **Add helpers first** if missing
5. **Write test** following 4-layer architecture
6. **Verify iteratively** - Small changes, test frequently

## Mandatory Verification

**Always run before marking complete:**

```bash
# 1. Tests pass (check output for failures - piping loses exit code)
pnpm --filter=n8n-playwright test:local <your-test> --reporter=list 2>&1 | tail -50

# 2. Not flaky (required)
pnpm --filter=n8n-playwright test:local <your-test> --repeat-each 3 --reporter=list 2>&1 | tail -50

# 3. Lint passes
pnpm --filter=n8n-playwright lint 2>&1 | tail -30

# 4. Typecheck passes
pnpm --filter=n8n-playwright typecheck 2>&1 | tail -30
```

**Important:** Piping through `tail` loses the exit code. Always check the output for "failed" or error messages rather than relying on exit codes.

**If any fail, fix before completing.**

## Refactoring Existing Tests

**Always verify tests pass BEFORE making changes:**
```bash
pnpm --filter=n8n-playwright test:local tests/e2e/target-file.spec.ts --reporter=list 2>&1 | tail -50
```

Then make small incremental changes, re-running after each.

## Done Checklist

- [ ] Spec had clear file, behavior, and pattern reference
- [ ] Read `AGENTS.md` and relevant existing code
- [ ] Used `n8n.start.*` entry points
- [ ] Used `nanoid()` for unique IDs (not `Date.now()`)
- [ ] No serial mode, `@db:reset`, or `n8n.api.signin()`
- [ ] Multi-user tests use `n8n.start.withUser()`
- [ ] Tests pass with `--repeat-each 3`
- [ ] Lint and typecheck pass
