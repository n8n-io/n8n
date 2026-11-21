# Testing Anti-Patterns

---

## Core Principle

> **"Test what the code does, not what the mocks do."**

When tests verify mock behavior instead of actual functionality, they provide false confidence while catching zero real bugs.

---

## The Five Anti-Patterns

### Anti-Pattern 1: Testing Mock Behavior

**The Problem:** Verifying that mocks exist and were called, rather than testing actual component output.

```typescript
// ❌ BAD: Testing the mock, not the behavior
it('should call the API', () => {
  const mockApi = jest.fn().mockResolvedValue({ data: 'test' });
  const service = new UserService(mockApi);

  service.getUser(1);

  expect(mockApi).toHaveBeenCalledWith(1); // Testing mock, not result
});
```

```typescript
// ✅ GOOD: Testing actual behavior
it('should return user data from API', async () => {
  const mockApi = jest.fn().mockResolvedValue({ id: 1, name: 'Alice' });
  const service = new UserService(mockApi);

  const user = await service.getUser(1);

  expect(user.name).toBe('Alice'); // Testing actual output
});
```

**Solution:** Test the genuine component output. If you can only verify mock calls, reconsider whether the test adds value.

---

### Anti-Pattern 2: Test-Only Methods in Production

**The Problem:** Adding methods to production classes solely for test setup or cleanup.

```typescript
// ❌ BAD: Production code polluted with test concerns
class UserCache {
  private cache: Map<number, User> = new Map();

  getUser(id: number): User | undefined {
    return this.cache.get(id);
  }

  // This method exists ONLY for tests
  _resetForTesting(): void {
    this.cache.clear();
  }
}
```

```typescript
// ✅ GOOD: Test utilities separate from production
// production/UserCache.ts
class UserCache {
  private cache: Map<number, User> = new Map();

  getUser(id: number): User | undefined {
    return this.cache.get(id);
  }
}

// test/helpers.ts
function createFreshCache(): UserCache {
  return new UserCache(); // Fresh instance per test
}
```

**Solution:** Relocate cleanup logic to test utility functions. Use fresh instances per test instead of reset methods.

---

### Anti-Pattern 3: Mocking Without Understanding

**The Problem:** Over-mocking without grasping side effects, leading to tests that pass but hide real issues.

```typescript
// ❌ BAD: Mocking everything without understanding
it('should process order', async () => {
  jest.mock('./inventory');
  jest.mock('./payment');
  jest.mock('./shipping');
  jest.mock('./notifications');

  const result = await processOrder(order);

  expect(result.success).toBe(true); // What did we actually test?
});
```

```typescript
// ✅ GOOD: Strategic mocking with real components where possible
it('should process order with real inventory check', async () => {
  // Real inventory service against test database
  const inventory = new InventoryService(testDb);

  // Mock only external services
  const payment = mockPaymentGateway();

  const processor = new OrderProcessor(inventory, payment);
  const result = await processor.process(order);

  expect(result.success).toBe(true);
  expect(await inventory.getStock(order.itemId)).toBe(originalStock - 1);
});
```

**Solution:** Run tests with real implementations first to understand behavior. Then mock at the appropriate level - external services, not internal logic.

---

### Anti-Pattern 4: Incomplete Mocks

**The Problem:** Partial mock responses missing downstream fields that production code expects.

```typescript
// ❌ BAD: Incomplete mock response
const mockUserApi = jest.fn().mockResolvedValue({
  id: 1,
  name: 'Test User'
  // Missing: email, createdAt, permissions, settings...
});

// Test passes, but production crashes when accessing user.email
```

```typescript
// ✅ GOOD: Complete mock matching real API response
const mockUserApi = jest.fn().mockResolvedValue({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  createdAt: '2024-01-01T00:00:00Z',
  permissions: ['read', 'write'],
  settings: {
    theme: 'light',
    notifications: true
  }
});

// Or use a factory
const mockUserApi = jest.fn().mockResolvedValue(
  createMockUser({ name: 'Test User' }) // Factory fills defaults
);
```

**Solution:** Mirror complete real API response structure. Use factories to generate complete mock objects with sensible defaults.

---

### Anti-Pattern 5: Integration Tests as Afterthought

**The Problem:** Treating testing as optional follow-up work rather than integral to development.

```typescript
// ❌ BAD: "We'll add tests later"
// Day 1: Write 500 lines of code
// Day 2: Write 500 more lines
// Day 3: "We need to ship, tests can wait"
// Day 30: Catastrophic bug in production
// Day 31: "Why didn't we have tests?"
```

```typescript
// ✅ GOOD: Tests are part of implementation
// Write failing test
it('should reject duplicate usernames', async () => {
  await createUser({ username: 'alice' });

  await expect(createUser({ username: 'alice' }))
    .rejects.toThrow('Username already exists');
});

// Make it pass
async function createUser(data: UserInput): Promise<User> {
  const existing = await db.users.findByUsername(data.username);
  if (existing) {
    throw new Error('Username already exists');
  }
  return db.users.create(data);
}

// Feature AND test ship together
```

**Solution:** Follow TDD - testing is implementation, not documentation. No feature is "done" without tests.

---

## Detection Checklist

Review your tests for these warning signs:

| Warning Sign | Anti-Pattern |
|-------------|--------------|
| `expect(mock).toHaveBeenCalled()` without testing output | Testing mock behavior |
| Methods starting with `_` or `ForTesting` in production | Test-only methods |
| Every dependency is mocked | Mocking without understanding |
| Mocks return `{ success: true }` only | Incomplete mocks |
| Test files added weeks after feature ships | Tests as afterthought |

---

## Quick Reference

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| Testing mocks | Only mock assertions, no behavior tests | Assert on actual output |
| Test-only methods | `_reset()`, `_setForTest()` in prod | Use fresh instances |
| Over-mocking | 10+ mocks per test | Test with real deps first |
| Incomplete mocks | Minimal stub responses | Use factories, match reality |
| Tests as afterthought | Features ship untested | TDD from the start |

---

*Content adapted from [obra/superpowers](https://github.com/obra/superpowers) by Jesse Vincent (@obra), MIT License.*
