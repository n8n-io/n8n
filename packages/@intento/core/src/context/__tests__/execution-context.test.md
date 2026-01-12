# Test Plan: execution-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `execution-context.test.ts`

## Code Surface

**Exports:** 
- `CONTEXT_EXECUTION` - n8n node properties array
- `ExecutionContext` class - configuration for retry logic

**Dependencies to Mock:**
- None (pure calculation class, no external dependencies)
- `Math.random()` for jitter calculation testing

**Branches:**
- `validateRequired()`: 4 null/undefined checks (maxAttempts, maxDelayMs, maxJitter, timeoutMs)
- `validateBoundaries()`: 8 boundary checks (min/max for each property)
- `calculateDelay()`: 3 early returns/throws (attempt === 0, attempt < 0, attempt >= maxAttempts)
- `createAbortSignal()`: 1 conditional (parent signal present or not)

**ESLint Considerations:**
- None needed - pure TypeScript with no unsafe operations
- Import order: types before implementations

## Test Strategy

Since `ExecutionContext` is a pure configuration class with validation and calculations:
1. Test constructor with various parameter combinations
2. Test validation logic (required fields and boundaries)
3. Test `calculateDelay()` with edge cases and boundary conditions
4. Test `createAbortSignal()` with and without parent signals
5. Test immutability via `Object.freeze()`

## Test Cases

### CONTEXT_EXECUTION (Node Properties)

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should export valid n8n node properties array | CONTEXT_EXECUTION structure |
| BL-02 | should have correct default values | EXECUTION.DEFAULTS matching typeOptions |
| BL-03 | should have boundary constraints in typeOptions | typeOptions min/max values |

### ExecutionContext Class

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-04 | should create context with all valid parameters | Constructor lines 95-103 |
| BL-05 | should create context with default parameters | Constructor with defaults |
| BL-06 | should freeze instance after construction | Object.freeze() line 102 |
| BL-07 | should return log metadata with all properties | asLogMetadata() lines 146-152 |
| BL-08 | should calculate exponential backoff correctly | calculateDelay() base calculation |
| BL-09 | should apply jitter to delay calculation | calculateDelay() jitter formula |
| BL-10 | should clamp delay to maxDelayMs | Math.min() in calculateDelay() |
| BL-11 | should create timeout abort signal without parent | createAbortSignal() line 173 |
| BL-12 | should combine parent and timeout signals | AbortSignal.any() line 176 |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should return zero delay for attempt 0 | calculateDelay() line 162 early return |
| EC-02 | should handle maxAttempts at minimum boundary (1) | Boundary value |
| EC-03 | should handle maxAttempts at maximum boundary (50) | Boundary value |
| EC-04 | should handle maxDelayMs at minimum boundary (100) | Boundary value |
| EC-05 | should handle maxDelayMs at maximum boundary (60000) | Boundary value |
| EC-06 | should handle maxJitter at minimum boundary (0.1) | Boundary value |
| EC-07 | should handle maxJitter at maximum boundary (0.9) | Boundary value |
| EC-08 | should handle timeoutMs at minimum boundary (1000) | Boundary value |
| EC-09 | should handle timeoutMs at maximum boundary (600000) | Boundary value |
| EC-10 | should produce delays within expected range with jitter | Jitter variance |
| EC-11 | should calculate correct baseDelay for different maxAttempts | baseDelay formula |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw Error if maxAttempts is null | validateRequired() line 109 |
| EH-02 | should throw Error if maxAttempts is undefined | validateRequired() line 109 |
| EH-03 | should throw Error if maxDelayMs is null | validateRequired() line 110 |
| EH-04 | should throw Error if maxDelayMs is undefined | validateRequired() line 110 |
| EH-05 | should throw Error if maxJitter is null | validateRequired() line 111 |
| EH-06 | should throw Error if maxJitter is undefined | validateRequired() line 111 |
| EH-07 | should throw Error if timeoutMs is null | validateRequired() line 112 |
| EH-08 | should throw Error if timeoutMs is undefined | validateRequired() line 112 |
| EH-09 | should throw RangeError if maxAttempts < 1 | validateBoundaries() line 116 |
| EH-10 | should throw RangeError if maxAttempts > 50 | validateBoundaries() line 119 |
| EH-11 | should throw RangeError if maxDelayMs < 100 | validateBoundaries() line 122 |
| EH-12 | should throw RangeError if maxDelayMs > 60000 | validateBoundaries() line 125 |
| EH-13 | should throw RangeError if maxJitter < 0.1 | validateBoundaries() line 128 |
| EH-14 | should throw RangeError if maxJitter > 0.9 | validateBoundaries() line 131 |
| EH-15 | should throw RangeError if timeoutMs < 1000 | validateBoundaries() line 134 |
| EH-16 | should throw RangeError if timeoutMs > 600000 | validateBoundaries() line 137 |
| EH-17 | should throw RangeError if attempt < 0 | calculateDelay() line 163 |
| EH-18 | should throw RangeError if attempt >= maxAttempts | calculateDelay() line 164 |
| EH-19 | should prevent mutation after freeze | Object.freeze() enforcement |

## Mock Strategies

### Math.random() Mocking
```typescript
const originalRandom = Math.random;
beforeEach(() => {
  Math.random = jest.fn(() => 0.5); // Predictable jitter
});
afterEach(() => {
  Math.random = originalRandom;
});
```

### AbortSignal Testing
```typescript
const abortController = new AbortController();
const parentSignal = abortController.signal;
// Test with real AbortSignal - no mocking needed
```

## Coverage Goals

- **Statements:** ≥95%
- **Branches:** 100% (all if/else, try/catch conditions)
- **Functions:** 100% (all public methods)
- **Lines:** ≥95%

## Risk Areas

1. **Jitter Randomness**: Use Math.random() mock for deterministic tests
2. **Floating Point Math**: Test with various maxDelayMs values to ensure precision
3. **Immutability**: Verify Object.freeze() prevents property reassignment
4. **Boundary Validation**: Test all 8 boundary conditions (min/max for 4 properties)
5. **AbortSignal.any()**: Ensure both timeout and parent signals work correctly

## Success Criteria

- [ ] All 50 test cases implemented (12 BL + 11 EC + 19 EH + 3 CONTEXT_EXECUTION + 5 additional)
- [ ] Coverage ≥95% on all metrics
- [ ] All branches covered (100%)
- [ ] Math.random() mocked for deterministic jitter tests
- [ ] Immutability verified with freeze tests
- [ ] All validation errors include descriptive messages
- [ ] TypeScript compilation passes
- [ ] ESLint passes with no warnings
