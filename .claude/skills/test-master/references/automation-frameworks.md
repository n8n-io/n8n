# Automation Frameworks

## Advanced Framework Patterns

### Screenplay Pattern
```typescript
// Better separation of concerns than POM
export class Actor {
  constructor(private page: Page) {}
  attemptsTo(...tasks: Task[]) {
    return Promise.all(tasks.map(t => t.performAs(this)));
  }
}

class Login implements Task {
  constructor(private email: string, private password: string) {}
  async performAs(actor: Actor) {
    await actor.page.getByLabel('Email').fill(this.email);
    await actor.page.getByLabel('Password').fill(this.password);
    await actor.page.getByRole('button', { name: 'Login' }).click();
  }
}

// Clear, maintainable test code
await new Actor(page).attemptsTo(new Login('user@test.com', '<test-password>'));
```

### Keyword-Driven Testing
```typescript
const keywords = {
  NAVIGATE: (page, url) => page.goto(url),
  CLICK: (page, selector) => page.click(selector),
  TYPE: (page, selector, text) => page.fill(selector, text),
  VERIFY: (page, selector) => expect(page.locator(selector)).toBeVisible(),
};

// Data drives execution - ideal for non-technical authors
const steps = [
  { keyword: 'NAVIGATE', args: ['/login'] },
  { keyword: 'TYPE', args: ['#email', 'user@test.com'] },
  { keyword: 'CLICK', args: ['#submit'] },
];

for (const step of steps) await keywords[step.keyword](page, ...step.args);
```

### Model-Based Testing
```typescript
// State machine defines valid transitions
const cartModel = {
  empty: { addItem: 'hasItems' },
  hasItems: { addItem: 'hasItems', removeItem: 'hasItems|empty', checkout: 'checkingOut' },
  checkingOut: { confirm: 'complete', cancel: 'hasItems' },
};

// Generate comprehensive test paths automatically
const testPaths = generatePathsFromModel(cartModel);
```

## Maintenance Strategies

### Self-Healing Locators
```typescript
// Multi-strategy finder with automatic fallback
async function findElement(page: Page, strategies: string[]): Promise<Locator> {
  for (const selector of strategies) {
    const el = page.locator(selector);
    if (await el.count() > 0) return el;
  }
  throw new Error(`Not found: ${strategies.join(', ')}`);
}

// Usage: tries best -> good -> fallback
const submit = await findElement(page, [
  '[data-testid="submit"]',     // Best: stable test ID
  'button:has-text("Submit")',  // Good: semantic
  'button.primary',             // Fallback: CSS
]);
```

### Error Recovery & Smart Retry
```typescript
// Auto-retry with recovery actions
async function clickWithRecovery(page: Page, selector: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.click(selector, { timeout: 5000 });
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
  }
}

// Exponential backoff for flaky operations
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

## Scaling Strategies

### Parallel & Distributed Execution
```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 8 : 4,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  
  // Shard tests across multiple machines
  shard: process.env.SHARD ? {
    current: parseInt(process.env.SHARD_INDEX),
    total: parseInt(process.env.SHARD_TOTAL),
  } : undefined,
});
```

```yaml
# GitHub Actions: distribute across 5 workers
strategy:
  matrix:
    shard: [1, 2, 3, 4, 5]
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}/5
```

### Resource Optimization
```typescript
// Reuse browser contexts for faster execution
let browser: Browser;
let context: BrowserContext;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
});

test('test 1', async () => {
  const page = await context.newPage();
  // Test logic
  await page.close();
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});
```

## CI/CD Integration

### Complete Pipeline
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          CI: true
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: report-${{ matrix.shard }}
          path: playwright-report/
```

### Test Data Factories
```typescript
export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: 'user',
      ...overrides,
    };
  }

  static createMany(count: number) {
    return Array.from({ length: count }, () => this.create());
  }
}

// Seed test data
test.beforeEach(async ({ page }) => {
  await page.request.post('/api/test/seed', {
    data: { users: UserFactory.createMany(10) },
  });
});
```

## Team Enablement

### Training Program
```markdown
**Week 1-2**: Framework basics, page objects, first test
**Week 3-4**: Data-driven, API integration, CI/CD
**Week 5-6**: Performance, error handling, scaling
**Ongoing**: Code reviews, knowledge sharing
```

### Code Review Checklist
```markdown
- [ ] Independent tests (no order dependency)
- [ ] Semantic locators (getByRole, getByLabel)
- [ ] Proper waits (no arbitrary timeouts)
- [ ] Error cases tested
- [ ] Test data cleanup
- [ ] Meaningful test names
- [ ] Page objects updated
```

## Automation Strategy

### ROI Calculation
```typescript
const manual = { timePerRun: 30, runsPerSprint: 10 };
const automation = { development: 120, maintenance: 5 };

const timeSaved = (manual.timePerRun * manual.runsPerSprint) - automation.maintenance;
const breakEven = Math.ceil(automation.development / timeSaved);
const annualSavings = (timeSaved * 26 - automation.development) / 60; // hours

// Example: Break-even in 1 sprint, save 110 hours/year
```

### Selection Criteria
```markdown
**Automate**: Repetitive, stable UI, critical paths, data-driven, positive ROI
**Don't Automate**: Exploratory, changing UI, one-time, usability, negative ROI
```

## Reporting & Metrics

### Custom Reporter
```typescript
class MetricsReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    this.sendMetrics({
      name: test.title,
      duration: result.duration,
      status: result.status,
      retries: result.retry,
    });
  }
}
```

## Quick Reference

| Pattern | Best For | Complexity |
|---------|----------|-----------|
| Page Object | Reusable components | Medium |
| Screenplay | Complex workflows | High |
| Keyword-Driven | Non-tech testers | Low |
| Model-Based | State machines | High |

| Scaling | Use Case |
|---------|----------|
| Parallel | Reduce time |
| Distributed | Large suites |
| Cloud | Cross-browser |
| Resource Reuse | Speed |

| Tool | Category |
|------|----------|
| Playwright, Cypress | Web E2E |
| Appium, Detox | Mobile |
| k6, Gatling | Performance |
