# Cypress to Playwright Migration Guide

## Overview

This guide outlines the systematic approach for migrating Cypress tests to Playwright in the n8n codebase, based on successful migrations and lessons learned.

## 🎯 Migration Principles

### 1. **Architecture First**
- Follow the established 4-layer architecture: Tests → Composables → Page Objects → BasePage
- Use existing composables and page objects before creating new ones
- Maintain separation of concerns: business logic in composables, UI interactions in page objects

### 2. **Search Existing Patterns First**
- **ALWAYS** search for existing Playwright patterns before implementing new functionality
- Look for working examples in existing test files (e.g., `39-projects.spec.ts`)
- Check composables and page objects for existing methods
- Framework-specific patterns may differ (Cypress display names vs Playwright field names)

### 3. **Idempotent Test Design**
- Design tests to work regardless of initial state
- Use fresh project creation for tests that need empty states
- Create test prerequisites within the test when needed
- Avoid `@db:reset` dependencies in favor of project-based isolation

## 📋 Pre-Migration Checklist

### 1. **Environment Setup**
```bash
# Start isolated test environment
cd packages/testing/playwright
pnpm start:isolated

# Run tests with proper environment
N8N_BASE_URL=http://localhost:5679 npx playwright test --reporter=list
```

### 2. **Study Existing Patterns**
- Review `CONTRIBUTING.md` for architecture guidelines
- Examine working test files (e.g., `1-workflows.spec.ts`, `39-projects.spec.ts`)
- Check available composables in `composables/` directory
- Review page objects in `pages/` directory

### 3. **Understand Framework Differences**
- **Cypress**: Uses display names (`'Internal Integration Secret'`)
- **Playwright**: Uses field names (`'apiKey'`)
- **Navigation**: Direct page navigation often more reliable than complex UI interactions
- **Selectors**: Prefer `data-test-id` over text-based selectors

## 🔄 Migration Process

### Step 1: Scaffold the Test File
```typescript
// 1. Create test file with proper imports
import { test, expect } from '../fixtures/base';
import { 
  // Import constants from existing patterns
  NOTION_NODE_NAME,
  NEW_NOTION_ACCOUNT_NAME,
  // ... other constants
} from '../config/constants';

// 2. Add beforeEach setup if needed
test.describe('Feature Name', () => {
  test.beforeEach(async ({ api, n8n }) => {
    await api.enableFeature('sharing');
    await api.enableFeature('folders');
    // ... other feature flags
    await n8n.goHome();
  });

  // 3. Scaffold all tests from Cypress file
  test('should do something', async ({ n8n }) => {
    // TODO: Implement based on Cypress version
    console.log('Test scaffolded - ready for implementation');
  });
});
```

### Step 2: Research Existing Patterns
```bash
# Search for existing implementations
grep -r "addCredentialToProject" packages/testing/playwright/
grep -r "createProject" packages/testing/playwright/
grep -r "workflowComposer" packages/testing/playwright/
```

### Step 3: Implement Working Tests First
- Start with tests that have clear existing patterns
- Use composables for high-level operations (project creation, navigation)
- Use direct DOM interactions for form filling when composables don't match
- Implement one test at a time and verify it works

### Step 4: Handle Complex UI Interactions
- **Node Creation Issues**: Close NDV after adding first node to prevent overlay blocking
- **Universal Add Button**: Use direct navigation when button interactions fail
- **Modal Overlays**: Use route interception for error testing
- **Multiple Elements**: Use specific selectors to avoid strict mode violations

## 🛠️ Common Patterns

### Project-Based Testing
```typescript
// ✅ Good: Use existing composable
const { projectName } = await n8n.projectComposer.createProject();
await n8n.projectComposer.addCredentialToProject(
  projectName,
  'Notion API',
  'apiKey',  // Use field name, not display name
  'test_value'
);
```

### Direct Navigation
```typescript
// ✅ Good: Direct navigation when UI interactions fail
await n8n.page.goto('/home/credentials/create');
await n8n.page.goto('/workflow/new');
```

### Error Testing with Route Interception
```typescript
// ✅ Good: Force errors for notification testing
await n8n.page.route('**/rest/credentials', route => {
  route.abort();
});
```

### Node Creation with NDV Handling
```typescript
// ✅ Good: Handle NDV auto-opening
await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
await n8n.ndv.close(); // Close NDV that opens automatically
await n8n.canvas.addNode(NOTION_NODE_NAME);
```

## 🚨 Common Pitfalls

### 1. **Not Checking Existing Patterns**
```typescript
// ❌ Bad: Implementing without checking existing patterns
await n8n.page.getByText('Internal Integration Secret').fill('value');

// ✅ Good: Use existing composable with correct field name
await n8n.projectComposer.addCredentialToProject(
  projectName, 'Notion API', 'apiKey', 'value'
);
```

### 2. **Ignoring Framework Differences**
```typescript
// ❌ Bad: Assuming Cypress patterns work in Playwright
await n8n.credentialsModal.connectionParameter('Internal Integration Secret').fill('value');

// ✅ Good: Use Playwright field names
await n8n.page.getByTestId('parameter-input-field').fill('value');
```

### 3. **Complex UI Interactions When Simple Navigation Works**
```typescript
// ❌ Bad: Complex button clicking when direct navigation works
await n8n.workflows.clickAddWorkflowButton();
await n8n.page.waitForLoadState();

// ✅ Good: Direct navigation
await n8n.page.goto('/workflow/new');
await n8n.page.waitForLoadState('networkidle');
```

### 4. **Not Handling UI Blocking**
```typescript
// ❌ Bad: Not handling NDV auto-opening
await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
await n8n.canvas.addNode(NOTION_NODE_NAME); // This will fail

// ✅ Good: Close NDV after first node
await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
await n8n.ndv.close();
await n8n.canvas.addNode(NOTION_NODE_NAME);
```

## 📝 Testing Strategy

### 1. **Start Simple**
- Begin with basic navigation and page verification tests
- Use existing composables for common operations
- Verify each test works before moving to complex scenarios

### 2. **Incremental Implementation**
- Scaffold all tests first with placeholders
- Implement one test at a time
- Use `console.log` for placeholder tests to maintain passing test suite

### 3. **Debugging Approach**
```typescript
// Add pauses for debugging
await n8n.page.pause();

// Use headed mode for visual debugging
SHOW_BROWSER=true npx playwright test

// Use specific test selection
npx playwright test -g "test name" --reporter=list
```

### 4. **Verification Strategy**
- Run individual tests during development
- Run full test suite after each major change
- Use `--reporter=list` for clear output during development

## 🔧 Environment Configuration

### VS Code Settings
```json
{
  "playwright.env": {
    "N8N_BASE_URL": "http://localhost:5679",
    "SHOW_BROWSER": "true",
    "RESET_E2E_DB": "true"
  }
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "start:isolated": "cd ..; N8N_PORT=5679 N8N_USER_FOLDER=/tmp/n8n-test-$(date +%s) E2E_TESTS=true pnpm start",
    "test:local": "RESET_E2E_DB=true N8N_BASE_URL=http://localhost:5679 start-server-and-test 'pnpm start:isolated' http://localhost:5679/favicon.ico 'sleep 1 && pnpm test:standard --workers 4 --repeat-each 5'"
  }
}
```

## 📊 Success Metrics

### Migration Complete When:
- [ ] All tests from Cypress file are scaffolded
- [ ] All tests pass consistently
- [ ] Tests use existing composables where appropriate
- [ ] Tests follow established patterns
- [ ] No `@db:reset` dependencies (unless absolutely necessary)
- [ ] Tests are idempotent and can run in any order
- [ ] Complex UI interactions are handled properly

### Quality Checklist:
- [ ] Tests use proper error handling
- [ ] Tests include appropriate assertions
- [ ] Tests follow naming conventions
- [ ] Tests include proper comments
- [ ] Tests use constants for repeated values
- [ ] Tests handle dynamic data properly

## 🎯 Best Practices Summary

1. **Search First**: Always look for existing patterns before implementing
2. **Use Composables**: Leverage existing business logic composables
3. **Direct Navigation**: Prefer direct page navigation over complex UI interactions
4. **Handle UI Blocking**: Close modals/NDV when adding multiple nodes
5. **Framework Awareness**: Understand differences between Cypress and Playwright
6. **Incremental Approach**: Implement one test at a time
7. **Idempotent Design**: Make tests work regardless of initial state
8. **Proper Debugging**: Use pauses and headed mode for troubleshooting

## 📚 Resources

- [Playwright Test Documentation](https://playwright.dev/docs/intro)
- [n8n Playwright Contributing Guide](./packages/testing/playwright/CONTRIBUTING.md)
- [Existing Test Examples](./packages/testing/playwright/tests/)
- [Composables Reference](./packages/testing/playwright/composables/)
- [Page Objects Reference](./packages/testing/playwright/pages/) 