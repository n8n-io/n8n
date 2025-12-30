# Test Plan: ExecutionContext

**Target File:** `src/context/execution-context.ts`
**Test File:** `src/context/__tests__/execution-context.test.ts`
**Coverage Goal:** ≥95% (branches, functions, lines, statements)

## Test Categories

### Business Logic (BL) - Core Functionality

| ID | Test Case | Method | Input | Expected Output | Rationale |
|----|-----------|--------|-------|-----------------|-----------|
| BL-01 | Creates context with default values | constructor | No parameters | maxAttempts=5, maxDelayMs=5000, maxJitter=0.2, timeoutMs=10000 | Validates defaults match EXECUTION.DEFAULTS |
| BL-02 | Creates context with custom values | constructor | maxAttempts=10, maxDelayMs=20000, maxJitter=0.5, timeoutMs=30000 | Custom values preserved | Validates parameter passing |
| BL-03 | Freezes instance after construction | constructor | Default values | Object.isFrozen(instance) === true | Prevents mutation during execution |
| BL-04 | Calculates delay for first attempt | calculateDelay | attempt=0 | 0 | First attempt has no delay |
| BL-05 | Calculates delay with exponential backoff | calculateDelay | attempt=1,2,3 (maxAttempts=5, maxDelayMs=5000, maxJitter=0.2) | ~625ms, ~1250ms, ~2500ms (±jitter) | Validates exponential formula |
| BL-06 | Caps delay at maxDelayMs | calculateDelay | attempt=4 (maxAttempts=5, maxDelayMs=5000) | ≤5000ms | Prevents overflow |
| BL-07 | Creates abort signal with timeout only | createAbortSignal | parent=undefined, timeoutMs=1000 | Signal aborts after ~1000ms | Basic timeout functionality |
| BL-08 | Creates abort signal with parent chain | createAbortSignal | parent=AbortSignal, timeoutMs=5000 | Signal aborts when parent aborts OR after timeout | Validates AbortSignal.any() |
| BL-09 | Returns log metadata with all properties | asLogMetadata | Default instance | Object with maxAttempts, maxDelayMs, maxJitter, timeoutMs | Validates metadata structure |
| BL-10 | Passes validation with valid boundaries | throwIfInvalid | Valid values within BOUNDARIES | No throw | Happy path validation |

### Edge Cases (EC) - Boundary Conditions

| ID | Test Case | Method | Input | Expected Output | Rationale |
|----|-----------|--------|-------|-----------------|-----------|
| EC-01 | Handles minimum maxAttempts boundary | constructor + throwIfInvalid | maxAttempts=1 | No throw | Validates min boundary |
| EC-02 | Handles maximum maxAttempts boundary | constructor + throwIfInvalid | maxAttempts=50 | No throw | Validates max boundary |
| EC-03 | Handles minimum maxDelayMs boundary | constructor + throwIfInvalid | maxDelayMs=100 | No throw | Validates min boundary |
| EC-04 | Handles maximum maxDelayMs boundary | constructor + throwIfInvalid | maxDelayMs=60000 | No throw | Validates max boundary |
| EC-05 | Handles minimum maxJitter boundary | constructor + throwIfInvalid | maxJitter=0.1 | No throw | Validates min boundary |
| EC-06 | Handles maximum maxJitter boundary | constructor + throwIfInvalid | maxJitter=0.9 | No throw | Validates max boundary |
| EC-07 | Handles minimum timeoutMs boundary | constructor + throwIfInvalid | timeoutMs=1000 | No throw | Validates min boundary |
| EC-08 | Handles maximum timeoutMs boundary | constructor + throwIfInvalid | timeoutMs=600000 | No throw | Validates max boundary |
| EC-09 | Calculates delay for last valid attempt | calculateDelay | attempt=maxAttempts-1 | Valid delay ≤ maxDelayMs | Edge of valid attempt range |
| EC-10 | Handles parent signal without timeout race | createAbortSignal | parent aborts immediately | Signal already aborted | Parent wins race |
| EC-11 | Jitter produces positive delays with max jitter | calculateDelay | maxJitter=0.9, attempt=1 | delay > 0 | Validates jitter math: 2^1 - 0.9 = 1.1 > 0 |

### Error Handling (EH) - Validation and Errors

| ID | Test Case | Method | Input | Expected Error | Rationale |
|----|-----------|--------|-------|----------------|-----------|
| EH-01 | Throws on null maxAttempts | throwIfInvalid | maxAttempts=null | Error: "maxAttempts is required" | Validates null check |
| EH-02 | Throws on undefined maxAttempts | throwIfInvalid | maxAttempts=undefined | Error: "maxAttempts is required" | Validates undefined check |
| EH-03 | Throws on null maxDelayMs | throwIfInvalid | maxDelayMs=null | Error: "maxDelayMs is required" | Validates null check |
| EH-04 | Throws on undefined maxDelayMs | throwIfInvalid | maxDelayMs=undefined | Error: "maxDelayMs is required" | Validates undefined check |
| EH-05 | Throws on null maxJitter | throwIfInvalid | maxJitter=null | Error: "maxJitter is required" | Validates null check |
| EH-06 | Throws on undefined maxJitter | throwIfInvalid | maxJitter=undefined | Error: "maxJitter is required" | Validates undefined check |
| EH-07 | Throws on null timeoutMs | throwIfInvalid | timeoutMs=null | Error: "timeoutMs is required" | Validates null check |
| EH-08 | Throws on undefined timeoutMs | throwIfInvalid | timeoutMs=undefined | Error: "timeoutMs is required" | Validates undefined check |
| EH-09 | Throws on maxAttempts below minimum | throwIfInvalid | maxAttempts=0 | RangeError: "maxAttempts must be at least 1" | Validates boundary check |
| EH-10 | Throws on maxAttempts above maximum | throwIfInvalid | maxAttempts=51 | RangeError: "maxAttempts must be at most 50" | Validates boundary check |
| EH-11 | Throws on maxDelayMs below minimum | throwIfInvalid | maxDelayMs=99 | RangeError: "maxDelayMs must be at least 100" | Validates boundary check |
| EH-12 | Throws on maxDelayMs above maximum | throwIfInvalid | maxDelayMs=60001 | RangeError: "maxDelayMs must be at most 60000" | Validates boundary check |
| EH-13 | Throws on maxJitter below minimum | throwIfInvalid | maxJitter=0.09 | RangeError: "maxJitter must be at least 0.1" | Validates boundary check |
| EH-14 | Throws on maxJitter above maximum | throwIfInvalid | maxJitter=0.91 | RangeError: "maxJitter must be at most 0.9" | Validates boundary check |
| EH-15 | Throws on timeoutMs below minimum | throwIfInvalid | timeoutMs=999 | RangeError: "timeoutMs must be at least 1000" | Validates boundary check |
| EH-16 | Throws on timeoutMs above maximum | throwIfInvalid | timeoutMs=600001 | RangeError: "timeoutMs must be at most 600000" | Validates boundary check |
| EH-17 | Throws on negative attempt | calculateDelay | attempt=-1 | RangeError: "attempt must be non-negative" | Validates attempt bounds |
| EH-18 | Throws on attempt >= maxAttempts | calculateDelay | attempt=5 (maxAttempts=5) | RangeError: "attempt must be less than 5" | Validates attempt upper bound |
| EH-19 | Throws on already aborted parent signal | createAbortSignal | parent=aborted AbortSignal | AbortError | Validates throwIfAborted() call |

## Coverage Strategy

### Statements
- All validation checks (required + boundaries)
- All calculation branches (exponential backoff, jitter, capping)
- All utility methods (asLogMetadata, createAbortSignal)
- Constructor initialization and freezing

### Branches
- Each boundary check (min/max for all 4 parameters)
- Null/undefined checks for all parameters
- Attempt bounds (0, negative, >= maxAttempts)
- Parent signal presence (with/without)
- Parent signal state (aborted/active)

### Functions
- constructor
- throwIfInvalid
- validateRequired (private, covered via throwIfInvalid)
- validateBoundaries (private, covered via throwIfInvalid)
- calculateDelay
- createAbortSignal
- asLogMetadata

### Lines
- All executable lines in public and private methods
- Constants and defaults (indirectly via constructor tests)

## Test Structure

```typescript
describe('ExecutionContext', () => {
  describe('business logic', () => {
    it('[BL-01] should create context with default values', () => { ... });
    // ... other BL tests
  });

  describe('edge cases', () => {
    it('[EC-01] should handle minimum maxAttempts boundary', () => { ... });
    // ... other EC tests
  });

  describe('error handling', () => {
    it('[EH-01] should throw on null maxAttempts', () => { ... });
    // ... other EH tests
  });
});
```

## Notes

1. **Jitter Testing**: Use multiple iterations with Math.random() to verify jitter range (±maxJitter * baseDelay)
2. **Immutability**: Verify Object.isFrozen() and attempt property modification
3. **AbortSignal**: Test with real AbortController for parent signal scenarios
4. **Timing**: Use jest.useFakeTimers() for timeout tests
5. **Exponential Formula**: Validate baseDelay = maxDelayMs / 2^(maxAttempts-1) calculation
6. **Type Safety**: Mock Reflect.getMetadata if needed for @mapTo decorator (ContextFactory integration)
