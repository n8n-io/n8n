# Test Plan: execution-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-06
**Coverage Target:** ≥95% all metrics
**Test File:** `execution-context.test.ts`

## Code Surface
**Exports:**
- `ExecutionContext` class (implements IContext)
- `CONTEXT_EXECUTION` array (n8n node properties)
- Constants: `EXECUTION` object with KEYS, DEFAULTS, BOUNDARIES

**Dependencies:**
- `IContext` interface (throwIfInvalid, asLogMetadata methods)
- `mapTo` decorator from context-factory
- `AbortSignal` browser API (timeout, any, throwIfAborted)
- `Math.random()` for jitter calculation

**Branches:**
- Constructor: 4 parameters with default values
- throwIfInvalid: Calls validateRequired and validateBoundaries
- validateRequired: 4 null/undefined checks (8 conditions with ||)
- validateBoundaries: 8 boundary checks (min/max for each parameter)
- calculateDelay: 3 conditions (attempt === 0, attempt < 0, attempt >= maxAttempts)
- createAbortSignal: 2 conditions (parent exists, parent already aborted)

**ESLint Considerations:**
- File-level disables needed:
  - `@typescript-eslint/no-unsafe-assignment` (for jest mock returns)
  - `@typescript-eslint/unbound-method` (for Math.random mocking)
- Type assertions: Mock return values for AbortSignal
- Import order: external → types → implementation

## Test Cases

### Constructor

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create context with all parameters | Lines 157-164, constructor |
| BL-02 | should apply default values when parameters omitted | Constructor defaults |
| BL-03 | should freeze instance after construction | Line 167, Object.freeze |
| BL-04 | should apply @mapTo decorators to all parameters | Decorator metadata |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle boundary min values (1, 100, 0.1, 1000) | Constructor with min BOUNDARIES |
| EC-02 | should handle boundary max values (50, 60000, 0.9, 600000) | Constructor with max BOUNDARIES |

### throwIfInvalid / validateRequired

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-05 | should pass validation with all valid parameters | Lines 178-180, no throws |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw Error if maxAttempts is null | Line 190, first condition |
| EH-02 | should throw Error if maxAttempts is undefined | Line 190, second condition |
| EH-03 | should throw Error if maxDelayMs is null | Line 191, first condition |
| EH-04 | should throw Error if maxDelayMs is undefined | Line 191, second condition |
| EH-05 | should throw Error if maxJitter is null | Line 192, first condition |
| EH-06 | should throw Error if maxJitter is undefined | Line 192, second condition |
| EH-07 | should throw Error if timeoutMs is null | Line 193, first condition |
| EH-08 | should throw Error if timeoutMs is undefined | Line 193, second condition |

### validateBoundaries

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-09 | should throw RangeError if maxAttempts < 1 | Lines 206-207 |
| EH-10 | should throw RangeError if maxAttempts > 50 | Lines 209-210 |
| EH-11 | should throw RangeError if maxDelayMs < 100 | Lines 212-213 |
| EH-12 | should throw RangeError if maxDelayMs > 60000 | Lines 215-216 |
| EH-13 | should throw RangeError if maxJitter < 0.1 | Lines 218-219 |
| EH-14 | should throw RangeError if maxJitter > 0.9 | Lines 221-222 |
| EH-15 | should throw RangeError if timeoutMs < 1000 | Lines 224-225 |
| EH-16 | should throw RangeError if timeoutMs > 600000 | Lines 227-228 |

### asLogMetadata

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-06 | should return all configuration as structured metadata | Lines 239-244 |

### calculateDelay

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-07 | should return 0 for first attempt (attempt 0) | Line 261, early return |
| BL-08 | should calculate exponential backoff for subsequent attempts | Lines 266-270 |
| BL-09 | should apply jitter to delay calculation | Line 268, jitter formula |
| BL-10 | should cap delay at maxDelayMs | Line 270, Math.min |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-03 | should handle last attempt (maxAttempts - 1) | Boundary case |
| EC-04 | should produce different delays with jitter | Math.random variance |
| EC-05 | should scale base delay correctly for different maxAttempts | Base delay formula |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-17 | should throw RangeError if attempt is negative | Line 262, negative check |
| EH-18 | should throw RangeError if attempt >= maxAttempts | Line 263, upper bound |

### createAbortSignal

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-11 | should create timeout signal without parent | Lines 286-287 |
| BL-12 | should combine parent and timeout signals | Lines 289-291 |
| BL-13 | should call AbortSignal.timeout with timeoutMs | Line 286 |
| BL-14 | should call AbortSignal.any with parent and timeout | Line 291 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-06 | should check parent signal before creating timeout | Line 284, throwIfAborted |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-19 | should throw if parent signal already aborted | Line 284, throwIfAborted |

## Test Data Structures

```typescript
// Valid contexts at boundaries
const MIN_CONTEXT = new ExecutionContext(1, 100, 0.1, 1000);
const MAX_CONTEXT = new ExecutionContext(50, 60000, 0.9, 600000);
const DEFAULT_CONTEXT = new ExecutionContext(); // Uses all defaults

// Invalid contexts for error testing
const INVALID_CONTEXTS = {
  nullMaxAttempts: { maxAttempts: null, maxDelayMs: 5000, maxJitter: 0.2, timeoutMs: 10000 },
  maxAttemptsTooLow: { maxAttempts: 0, maxDelayMs: 5000, maxJitter: 0.2, timeoutMs: 10000 },
  maxAttemptsTooHigh: { maxAttempts: 51, maxDelayMs: 5000, maxJitter: 0.2, timeoutMs: 10000 },
  maxDelayTooLow: { maxAttempts: 5, maxDelayMs: 99, maxJitter: 0.2, timeoutMs: 10000 },
  maxDelayTooHigh: { maxAttempts: 5, maxDelayMs: 60001, maxJitter: 0.2, timeoutMs: 10000 },
  jitterTooLow: { maxAttempts: 5, maxDelayMs: 5000, maxJitter: 0.09, timeoutMs: 10000 },
  jitterTooHigh: { maxAttempts: 5, maxDelayMs: 5000, maxJitter: 0.91, timeoutMs: 10000 },
  timeoutTooLow: { maxAttempts: 5, maxDelayMs: 5000, maxJitter: 0.2, timeoutMs: 999 },
  timeoutTooHigh: { maxAttempts: 5, maxDelayMs: 5000, maxJitter: 0.2, timeoutMs: 600001 },
};
```

## Mock Setup

```typescript
// Mock Math.random for deterministic jitter testing
let mockRandom: jest.SpyInstance;
beforeEach(() => {
  mockRandom = jest.spyOn(Math, 'random');
});
afterEach(() => {
  mockRandom.mockRestore();
});

// Mock AbortSignal for signal testing
const mockAbortSignal = {
  timeout: jest.fn(),
  any: jest.fn(),
  throwIfAborted: jest.fn(),
};
```

## Coverage Strategy

1. **Constructor and validation** (Lines 157-228):
   - Test all default values (BL-02)
   - Test all boundary conditions (EC-01, EC-02)
   - Test all null/undefined checks (EH-01 through EH-08)
   - Test all range validations (EH-09 through EH-16)

2. **calculateDelay** (Lines 247-270):
   - Test early return for attempt 0 (BL-07)
   - Test exponential backoff formula (BL-08)
   - Test jitter application (BL-09, EC-04)
   - Test maxDelayMs cap (BL-10)
   - Test error conditions (EH-17, EH-18)

3. **createAbortSignal** (Lines 282-291):
   - Test without parent (BL-11)
   - Test with parent (BL-12)
   - Test parent abort check (EC-06, EH-19)

4. **asLogMetadata** (Lines 239-244):
   - Test complete metadata structure (BL-06)

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified (ExecutionContext, CONTEXT_EXECUTION)
- [x] All branches covered: 23+ conditional branches
- [x] All error paths tested: 19 error scenarios (EH-01 through EH-19)
- [x] ESLint considerations documented
- [x] Coverage ≥95% target for all metrics
- [x] Test data structures defined
- [x] Mock setup documented
