# Test Planning Instructions — Systematic Test Strategy

**Model**: Claude Sonnet 4.5
**Applies to**: Test planning before implementation
**Works with**: `testing.instructions.md`, `comment.instructions.md`, `review.instructions.md`

## Purpose

Create comprehensive test plans that achieve ≥95% coverage, catch bugs before production, and serve as living documentation. Test plans ensure systematic coverage of all code paths, edge cases, and error scenarios before writing a single test.

**Core Philosophy:**
> "A test plan is a blueprint for quality. Plan tests before writing them to ensure complete coverage and avoid gaps." — Kent Beck

## When Planning is Required

**MANDATORY: Create plan first unless exception applies.**

### Must Create Plan
- User asks "add tests" without specifics
- New file needs test coverage
- Existing code has <95% coverage
- Complex logic with multiple branches

### Can Skip Plan (Exceptions Only)
- Test plan already exists at `[filename].test.md`
- Single test addition with explicit test case provided
- User gives complete, detailed test specification

**Location:** `src/[path]/__tests__/[filename].test.md` (alongside `[filename].test.ts`)

## Planning Workflow

**Before writing ANY test code:**

1. Check: Does `__tests__/[filename].test.md` exist?
2. No → Create plan (this document)
3. Yes → Verify completeness
4. Then → Implement tests in `[filename].test.ts` (see `testing.instructions.md`)

## 2-Phase Planning Process

### Phase 1: Analyze Code (5 min)

**Map the landscape:**

1. **Exports** - List all exported functions/classes/constants (test surface)
2. **Branches** - Find all `if/else`, `switch`, `? :`, `&&`, `||`, `??`, `try/catch`
3. **Edge cases** - Note null/undefined, empty collections, boundaries (0, -1, max, min)
4. **Dependencies** - Identify what to mock (APIs, DB, FS, Date, Math.random, n8n IFunctions)

### Phase 2: Design Test Cases (10 min)

**Create test inventory with IDs:**

Use 3-category system (matches test implementation):

#### BL-XX: Business Logic
Core functionality, happy paths, typical usage

```markdown
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create context with all parameters | Lines 134-145, happy path |
| BL-02 | should handle nested params with collection | Line 77 left branch |
```

#### EC-XX: Edge Cases
Boundaries, unusual valid inputs, optional params

```markdown
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle missing optional parameter | Lines 169-170, catch block |
| EC-02 | should preserve param order (3+ params) | Decorator accumulation |
```

#### EH-XX: Error Handling
Validation failures, thrown errors, invalid states

```markdown
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if no @mapTo metadata | Line 135 first condition |
| EH-02 | should throw if metadata array empty | Line 135 second condition |
| EH-03 | should enrich error with context data | Lines 216-221 metadata |
```

**Goal:** Every line + every branch = at least one test ID

## Test Plan Template

**File:** `src/[path]/__tests__/[filename].test.md`

```markdown
# Test Plan: [filename].ts

**Author:** Claude Sonnet 4.5
**Date:** YYYY-MM-DD
**Coverage Target:** ≥95% all metrics
**Test File:** `[filename].test.ts`

## Code Surface
**Exports:** [List functions/classes to test]
**Dependencies:** [List what needs mocking: APIs, DB, IFunctions, etc.]
**Branches:** [Count of conditionals: if/else, try/catch, ternary]
**ESLint Considerations:**
- File-level disables needed: `@typescript-eslint/no-unsafe-assignment`, `@typescript-eslint/no-unsafe-argument` (for Jest matchers)
- Type assertions needed: Reflect.getMetadata returns, mock setups
- Import order: types before implementations

## Test Cases

### [FunctionOrClass]

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should [behavior] when [condition] | Lines X-Y |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle [boundary] | Lines X-Y |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw [Error] when [invalid] | Lines X-Y |

## Success Criteria
- [ ] Test plan created with author and date
- [ ] All exports identified and planned
- [ ] All branches covered (100%)
- [ ] All error paths tested
- [ ] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
```

## Implementation Checklist

After creating the plan, when implementing tests (`[filename].test.ts`):

1. **File Header**:
   - [ ] Add ESLint disable comments (if needed)
   - [ ] Add author attribution comment
   - [ ] Add date
   - [ ] Import statement order: external → types → implementation

2. **Type Safety**:
   - [ ] Add type assertions for `Reflect.getMetadata()` calls
   - [ ] Use `mock<Type>()` for all mocks
   - [ ] Cast test-specific constructs appropriately

3. **Code Quality**:
   - [ ] Run `pnpm lint:fix` to auto-fix import order
   - [ ] Run `pnpm lint` to verify no errors
   - [ ] All tests follow AAA pattern
   - [ ] All tests have IDs matching plan

## Common Coverage Gaps

**After running coverage, fix these common misses:**

```typescript
// Gap 1: Null coalescing branches
const value = Reflect.getMetadata(key, target) ?? [];
// Fix: Test both truthy and nullish returns

// Gap 2: Logical OR conditions
if (!Array.isArray(meta) || meta.length === 0) {}
// Fix: Test BOTH: non-array AND empty array cases

// Gap 3: Ternary branches
const key = collection ? `${collection}.${key}` : key;
// Fix: Test both collection provided AND not provided

// Gap 4: Catch blocks
try { operation(); } catch (error) { handle(error); } // ← Not covered
// Fix: Mock operation() to throw

// Gap 5: Error message builders
const ERROR = {
  message: (x: string) => `Error: ${x}`, // ← Function not called
};
// Fix: Trigger code path that uses this error
```

**Coverage commands:**
```bash
pnpm test path/to/file.test.ts --coverage
# Look for "Uncovered Line #s" column
```

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Testing Mocks Instead of Real Code
```typescript
// BAD: Creating test that doesn't import implementation
describe('calculateTotal', () => {
  it('should work', () => {
    expect(true).toBe(true); // File not imported, 0% coverage
  });
});

// GOOD: Import and test real implementation
import { calculateTotal } from '../calculate-total';
describe('calculateTotal', () => {
  it('should calculate correctly', () => {
    expect(calculateTotal([{price: 10, qty: 2}], 0.1)).toBe(22);
  });
});
```

### ❌ Pitfall 2: Incomplete Branch Coverage
```typescript
// BAD: Only testing happy path
it('should process item', () => {
  const result = process(validItem); // Only tests if (isValid) branch
  expect(result).toBeDefined();
});

// GOOD: Test both branches
it('should process valid item', () => {
  const result = process(validItem);
  expect(result).toBeDefined();
});

it('should reject invalid item', () => {
  expect(() => process(invalidItem)).toThrow();
});
```

### ❌ Pitfall 3: Ignoring Error Paths
```typescript
// BAD: Not testing catch blocks or error throwing
it('should fetch data', async () => {
  const result = await fetchData('valid-id');
  expect(result).toBeDefined();
  // What if fetchData throws? Catch block not tested.
});

// GOOD: Test error scenarios
it('should handle fetch failure', async () => {
  mockApi.fetch.mockRejectedValue(new NetworkError());
  await expect(fetchData('id')).rejects.toThrow(NetworkError);
});
```

### ❌ Pitfall 4: Missing Edge Cases
```typescript
// BAD: Only testing typical cases
it('should process items', () => {
  const result = processItems([item1, item2, item3]);
  expect(result).toHaveLength(3);
});

// GOOD: Test boundaries
it('should handle empty array', () => {
  expect(processItems([])).toEqual([]);
});

it('should handle single item', () => {
  expect(processItems([item1])).toHaveLength(1);
});

it('should handle null/undefined', () => {
  expect(processItems(null)).toEqual([]);
  expect(processItems(undefined)).toEqual([]);
});
```

### ❌ Pitfall 5: Polluted Test State
```typescript
// BAD: Shared state between tests
describe('UserService', () => {
  const service = new UserService(); // Shared instance!

  it('test1', () => {
    service.addUser(user1);
    expect(service.count()).toBe(1);
  });

  it('test2', () => {
    service.addUser(user2);
    expect(service.count()).toBe(1); // FAILS - count is 2!
  });
});

// GOOD: Fresh state per test
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(); // New instance each test
  });

  it('test1', () => {
    service.addUser(user1);
    expect(service.count()).toBe(1);
  });

  it('test2', () => {
    service.addUser(user2);
    expect(service.count()).toBe(1); // PASSES - isolated
  });
});
```

## Quality Checklist

Before submitting tests, verify:

- [ ] **Imports correct** - Test file imports implementation from `../filename`
- [ ] **All exports tested** - Every exported function/class has tests
- [ ] **All branches covered** - Every if/else, ternary, `||`, `&&` tested
- [ ] **Error paths tested** - Every throw, catch, reject tested
- [ ] **Edge cases tested** - Null, undefined, empty, boundaries tested
- [ ] **Mocks cleaned up** - `afterEach(() => jest.clearAllMocks())`
- [ ] **Types correct** - No `any` types, proper TypeScript
- [ ] **Tests pass** - All tests pass when run
- [ ] **Coverage ≥95%** - All metrics meet threshold
- [ ] **Tests fast** - Entire suite runs in <5 seconds typically
- [ ] **Tests isolated** - Can run in any order, no dependencies
- [ ] **Readable names** - Test names clearly describe behavior
- [ ] **AAA pattern** - Arrange, Act, Assert sections clear

## Success Metrics

**A complete test plan achieves:**

1. **100% statement coverage** (≥95% minimum)
2. **100% branch coverage** (≥95% minimum)
3. **100% function coverage** (≥95% minimum)
4. **100% line coverage** (≥95% minimum)
5. **All error paths tested** - Every throw, catch, reject
6. **All edge cases tested** - Null, empty, boundaries
7. **Tests pass first time** - No iteration needed
8. **Tests pass linting** - No ESLint errors
9. **Tests pass TypeScript** - No type errors
10. **Tests are maintainable** - Clear, well-organized, documented

**Test plan delivers value when:**
- Bugs are caught before production
- Refactoring is safe (tests catch regressions)
- Tests serve as documentation
- New developers understand code through tests
- Coverage remains high as code evolves
