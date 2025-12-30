````instructions
# Testing Instructions — Jest Implementation

**Model**: Claude Sonnet 4.5
**Applies to**: `**/__tests__/*.{test,spec}.{ts,tsx}`
**Works with**: `plan.testing.instructions.md` (create plan first)

## Purpose

Implement Jest tests from test plans. Tests must pass TypeScript/ESLint, achieve ≥95% coverage, and be maintainable.

**Workflow:** Create plan (`*.test.md`) → Implement tests (`*.test.ts`)

## File Header Requirements

**MANDATORY: Every test file must start with:**

1. **Author Attribution**:
```typescript
/**
 * Tests for [FileName]
 * @author Claude Sonnet 4.5
 * @date YYYY-MM-DD
 */
```

3. **Required Imports**:
```typescript
import 'reflect-metadata'; // If using decorators
import { mock } from 'jest-mock-extended';
import type { ... } from '...';
import { ... } from '../implementation';
```

**Example Complete Header:**
```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import 'reflect-metadata';

import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { IContext } from '../../types/context-interface';
import { CoreError } from '../../types/core-error';
import { ContextFactory, mapTo } from '../context-factory';

/**
 * Tests for ContextFactory
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */
```

## Quick Start

### 1. Required File Structure

```
src/services/
  user.service.ts              ← Implementation
  __tests__/
    user.service.test.md       ← Plan (create first)
    user.service.test.ts       ← Tests (you're here)
    fixtures/                  ← Shared test data (optional)
```

### 2. Basic Test Template

```typescript
import { UserService } from '../user.service'; // Import implementation
import { mock } from 'jest-mock-extended';

describe('UserService', () => {
  let service: UserService;
  let mockDependency: DependencyType;

  beforeEach(() => {
    mockDependency = mock<DependencyType>();
    service = new UserService(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Always clean up
  });

  describe('business logic', () => {
    it('[BL-01] should create user with valid data', async () => {
      // ARRANGE
      const userData = { email: 'test@example.com', name: 'Test' };
      mockDependency.save.mockResolvedValue({ id: '123', ...userData });

      // ACT
      const result = await service.createUser(userData);

      // ASSERT
      expect(result.id).toBe('123');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('edge cases', () => {
    it('[EC-01] should handle empty input', () => {
      // Test implementation
    });
  });

  describe('error handling', () => {
    it('[EH-01] should throw ValidationError for invalid email', async () => {
      await expect(service.createUser({ email: 'invalid' }))
        .rejects.toThrow('Invalid email');
    });
  });
});
```

## Validation Requirements

### MANDATORY: Lint and Build Must Pass

**After implementing tests, ALWAYS run:**

```bash
# 1. Run tests with coverage
pnpm test

# 2. Check and fix linting issues
pnpm lint:fix

# 3. Verify TypeScript compilation
pnpm typecheck

# 4. Build to ensure no build errors
pnpm build
```

**All four commands must succeed before tests are considered complete.**

## ESLint Compliance

### CRITICAL: No ESLint Disables Allowed

**❌ NEVER use eslint-disable comments:**
```typescript
// ❌ BAD - Never do this
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
```

**✅ Write type-safe code instead:**

**Import order** (auto-fixed by `pnpm lint:fix`):
1. External packages
2. Type imports (with `type` keyword)
3. Local imports (implementation under test)

**Type safety for Jest matchers:**
```typescript
// ✅ Cast string matchers explicitly
expect(mockFn).toHaveBeenCalledWith(expect.stringContaining('text') as string);

// ✅ Use specific types with expect.any
expect(obj).toEqual({ error: expect.any(Error) as Error });

// ✅ Type mock implementations
mockTracer.errorAndThrow = jest.fn<never, [string, unknown?]>();

// ❌ Don't let matchers be untyped
expect(mockFn).toHaveBeenCalledWith(expect.stringContaining('text')); // any type
```

**Type safety for Reflect metadata:**
```typescript
// ✅ Add type assertions
const metadata = Reflect.getMetadata(SYMBOL, Target) as string[];

// ✅ Use proper types for mocks
const mockTracer = mock<Tracer>();

// ❌ Avoid untyped values
const metadata = Reflect.getMetadata(SYMBOL, Target); // any
```

**Type safety for test-specific constructs:**
```typescript
// ✅ Use unknown then cast to specific type
const fakeConstructor = function test() {} as unknown as object;

// ✅ Use undefined without casting when parameter type allows it
decorator(target, undefined, 0);
```

## Test Organization

### MANDATORY: 3-Category Structure

Every test suite must have these describe blocks matching the test plan:

1. **`describe('business logic')`** - Tests with IDs `[BL-XX]`
2. **`describe('edge cases')`** - Tests with IDs `[EC-XX]`
3. **`describe('error handling')`** - Tests with IDs `[EH-XX]`

### Test Naming Convention

**Include Test ID from plan:**
```typescript
it('[BL-01] should create user with valid data', () => {});  // ✅ Good
it('should create user', () => {});                          // ❌ Bad - no ID
```

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('[BL-01] should calculate total with tax', () => {
  // ARRANGE: Setup
  const items = [{ price: 10, qty: 2 }];
  const taxRate = 0.1;

  // ACT: Execute
  const result = calculateTotal(items, taxRate);

  // ASSERT: Verify
  expect(result).toBe(22);
});
```

## Mocking Guide

### Type-Safe Mocking

```typescript
import { mock } from 'jest-mock-extended';
import type { UserRepository } from '@/repositories';

const mockRepository = mock<UserRepository>();
mockRepository.findById.mockResolvedValue(testUser);
mockRepository.save.mockResolvedValue(savedUser);
```

### Module Mocking

```typescript
// Mock external dependencies, NOT implementation under test
jest.mock('@/utils/logger');
jest.mock('node:fs/promises');

import { Logger } from '@/utils/logger';
const mockLogger = jest.mocked(Logger);
```

### Cleanup (Critical!)

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear call history
});

afterEach(() => {
  jest.restoreAllMocks(); // Restore spied methods
});
```

### What to Mock

**Always Mock:**
- External APIs
- Database connections
- File system operations
- Time/dates (`Date.now()`, `setTimeout`)
- Random generators (`Math.random()`, UUIDs)
- n8n specific: `IFunctions`, `Tracer`

**Never Mock:**
- File under test (defeats purpose!)
- Simple utilities (test real code)
- Type definitions

## Async Testing

```typescript
// ✅ Use async/await
it('should fetch user', async () => {
  const result = await userService.getUser('123');
  expect(result.id).toBe('123');
});

// ✅ Test rejections
it('should throw on invalid ID', async () => {
  await expect(userService.getUser('invalid'))
    .rejects.toThrow(NotFoundError);
});

// ❌ Don't forget await
it('should fetch user', () => {
  userService.getUser('123'); // Test passes even if this throws!
});
```

## Error Testing

```typescript
// ✅ Test specific error types and messages
it('[EH-01] should throw ValidationError for empty email', () => {
  expect(() => validateEmail('')).toThrow(ValidationError);
  expect(() => validateEmail('')).toThrow('Email cannot be empty');
});

// ✅ Test async errors
it('[EH-02] should handle database failure', async () => {
  mockDb.connect.mockRejectedValue(new ConnectionError());

  await expect(service.initialize()).rejects.toThrow(ConnectionError);
  expect(logger.error).toHaveBeenCalledWith(
    expect.stringContaining('Database connection failed')
  );
});

// ✅ Test error recovery
it('[EH-03] should retry on transient errors', async () => {
  mockApi.fetch
    .mockRejectedValueOnce(new TransientError())
    .mockRejectedValueOnce(new TransientError())
    .mockResolvedValueOnce({ data: 'success' });

  const result = await service.fetchWithRetry();
  expect(mockApi.fetch).toHaveBeenCalledTimes(3);
});
```

## Test Data & Fixtures

### Factory Functions

```typescript
// fixtures/user.factory.ts
export const createTestUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

// In tests
const user = createTestUser({ email: 'custom@example.com' });
```

### Builder Pattern (Complex Objects)

```typescript
export class WorkflowBuilder {
  private workflow: Partial<Workflow> = { nodes: [], connections: {} };

  withNode(node: Node): this {
    this.workflow.nodes?.push(node);
    return this;
  }

  build(): Workflow {
    return this.workflow as Workflow;
  }
}

// Usage
const workflow = new WorkflowBuilder()
  .withNode(createTestNode({ type: 'trigger' }))
  .withNode(createTestNode({ type: 'action' }))
  .build();
```

## Assertions

### Specific Matchers

```typescript
// ✅ Use specific matchers
expect(user.email).toBe('test@example.com');
expect(users).toHaveLength(3);
expect(result).toBeUndefined();
expect(errorMsg).toContain('Invalid');
expect(date).toBeInstanceOf(Date);

// ❌ Generic assertions
expect(user.email).toBeTruthy(); // Too vague
expect(users.length > 0).toBe(true); // Use toHaveLength
```

### Arrays and Objects

```typescript
// Exact match
expect(sortedUsers).toEqual([user1, user2, user3]);

// Contains items
expect(userIds).toContain('user-123');
expect(userIds).toEqual(expect.arrayContaining(['user-1', 'user-2']));

// Partial object match
expect(response).toMatchObject({
  status: 'success',
  data: expect.objectContaining({
    id: expect.any(String),
    createdAt: expect.any(Date),
  }),
});
```

## Coverage Requirements

**Minimum ≥95% for ALL metrics:**
- Statements
- Branches
- Functions
- Lines

### Ensuring Coverage

```typescript
// ✅ Import and test actual implementation
import { calculateTotal } from '../calculate-total';

describe('calculateTotal', () => {
  it('should calculate', () => {
    const result = calculateTotal([{ price: 10, qty: 2 }], 0.1);
    expect(result).toBe(22);
  });
});

// ❌ Type-only import = 0% coverage
import type { User } from '../user';  // Doesn't count!
```

### Test All Branches

```typescript
// Function with multiple paths
function getStatus(user: User): string {
  if (!user.active) return 'inactive';
  if (user.expired) return 'expired';
  return 'active';
}

// ✅ Test ALL branches
describe('getStatus', () => {
  it('[BL-01] returns active for active users', () => {
    expect(getStatus({ active: true, expired: false })).toBe('active');
  });

  it('[EC-01] returns inactive for inactive users', () => {
    expect(getStatus({ active: false })).toBe('inactive');
  });

  it('[EC-02] returns expired for expired users', () => {
    expect(getStatus({ active: true, expired: true })).toBe('expired');
  });
});
```

### Check Coverage

```bash
# Run tests with coverage
pnpm test path/to/file.test.ts --coverage

# Look for "Uncovered Line #s" column
# If < 95%, add tests for missing paths
```

## TypeScript & Linting

### Type Safety

```typescript
// ✅ Properly typed
import type { User } from '@/types';
const testUser: User = { id: '123', email: 'test@example.com' };

// ✅ Use factory with inference
const createTestUser = (overrides?: Partial<User>): User => ({
  id: 'test-123',
  email: 'test@example.com',
  ...overrides,
});

// ❌ Avoid 'any'
const testData: any = { id: '123' }; // ESLint error

// ✅ Use unknown + type guards
const testData: unknown = { id: '123' };
if (isUser(testData)) {
  // Now typed as User
}
```

### ESLint Compliance

```typescript
// ✅ Remove unused variables
describe('UserService', () => {
  let service: UserService;
  // Don't declare variables you don't use
});

// ✅ Remove debug statements
it('should work', () => {
  // console.log('debugging'); // Remove this
  expect(result).toBeDefined();
});

// ✅ Prefix intentionally unused with _
const _unusedForLater = 'test';
```

## Common Mistakes

### ❌ Testing Mocks, Not Real Code

```typescript
// BAD: File not imported
describe('calculateTotal', () => {
  it('should work', () => {
    expect(true).toBe(true); // 0% coverage!
  });
});

// GOOD: Import and test implementation
import { calculateTotal } from '../calculate-total';
```

### ❌ Incomplete Branch Coverage

```typescript
// BAD: Only happy path
it('should process item', () => {
  const result = process(validItem);
  expect(result).toBeDefined();
});

// GOOD: Test both paths
it('[BL-01] should process valid item', () => {
  expect(process(validItem)).toBeDefined();
});

it('[EH-01] should reject invalid item', () => {
  expect(() => process(invalidItem)).toThrow();
});
```

### ❌ Shared State Pollution

```typescript
// BAD: Shared instance
describe('UserService', () => {
  const service = new UserService(); // Pollution!

  it('test1', () => {
    service.addUser(user1);
    expect(service.count()).toBe(1);
  });

  it('test2', () => {
    service.addUser(user2);
    expect(service.count()).toBe(1); // FAILS - count is 2
  });
});

// GOOD: Fresh instance per test
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(); // Isolated
  });
});
```

### ❌ Missing Async await

```typescript
// BAD: Missing await
it('should fetch user', () => {
  userService.getUser('123'); // Passes even if throws!
  expect(true).toBe(true);
});

// GOOD: Use async/await
it('should fetch user', async () => {
  const user = await userService.getUser('123');
  expect(user.id).toBe('123');
});
```

## Pre-Commit Checklist

**Before committing tests:**

- [ ] Test plan exists at `__tests__/[filename].test.md`
- [ ] All test IDs match plan (BL-XX, EC-XX, EH-XX)
- [ ] Implementation file imported (not just types)
- [ ] All tests pass: `pnpm test`
- [ ] Coverage ≥95%: `pnpm test --coverage`
- [ ] No TypeScript errors: `pnpm build`
- [ ] No ESLint errors: `pnpm lint`
- [ ] Mocks cleaned up in `afterEach`
- [ ] Tests isolated (can run in any order)
- [ ] No debug statements or unused code

## Validation Commands

```bash
# Run specific test file
pnpm test path/to/file.test.ts

# Run with coverage
pnpm test path/to/file.test.ts --coverage

# Type check
pnpm build

# Lint
pnpm lint

# Lint fix
pnpm lint:fix
```

## Quick Reference

**Test ID Format:**
- `[BL-XX]` - Business Logic (happy paths)
- `[EC-XX]` - Edge Cases (boundaries, optional)
- `[EH-XX]` - Error Handling (validation, throws)

**Mock Strategy:**
- Always: External deps (API, DB, IFunctions, Tracer)
- Never: Implementation under test
- Spy: When verifying calls on real objects

**File Structure:**
```
src/services/
  user.service.ts          ← Implementation
  __tests__/
    user.service.test.md   ← Plan (exists)
    user.service.test.ts   ← Tests (you write)
```

**AAA Pattern:**
```typescript
it('[BL-01] test name', () => {
  // ARRANGE: Setup
  // ACT: Execute
  // ASSERT: Verify
});
```

````
