# Test Plan: supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `supplier-base.test.ts`

## Code Surface

**Exports:** `SupplierBase<TI, TS>` (abstract class)

**Dependencies to Mock:**
- `IFunctions` (n8n-workflow) - addInputData, addOutputData, getNode
- `Tracer` - debug, info, warn, error methods
- `ExecutionContext` - maxAttempts, calculateDelay, createAbortSignal
- `ContextFactory` - read method
- `Delay` - apply static method
- `Date.now()` for timestamp testing

**Branches:**
- `supplyWithRetries`: loop condition (< maxAttempts), instanceof checks (SupplyResponseBase), isRetriable check
- `supply`: try/catch block
- `completeSupply`: instanceof check (SupplyResponseBase), isRetriable conditional
- `onError`: 3 DOMException checks (TimeoutError, AbortError, fallback)

**Abstract Methods:**
- `execute(request, signal)` - must be implemented by test subclass

**ESLint Considerations:**
- None needed - concrete test class implementation keeps type safety
- Mock types from jest-mock-extended maintain type compliance

## Test Strategy

Since `SupplierBase` is abstract, create concrete test implementation:
```typescript
class TestSupplier extends SupplierBase<TestRequest, TestResponse> {
  async execute(request: TestRequest, signal: AbortSignal): Promise<TestResponse | SupplyError> {
    // Controllable implementation for testing
  }
}
```

Mock strategies:
- `IFunctions`: Mock addInputData to return `{ index: number }`, addOutputData to return void
- `Tracer`: Mock all log methods as jest.fn()
- `ExecutionContext`: Mock with configurable maxAttempts, calculateDelay return values
- `ContextFactory.read`: Mock to return ExecutionContext instance
- `Delay.apply`: Spy to verify delay calls without waiting
- `AbortSignal`: Use real AbortController for signal testing

## Test Cases

### SupplierBase (via TestSupplier)

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should execute single successful supply with no retries | Lines 47-58, success path through supplyWithRetries |
| BL-02 | should retry retriable error and succeed on second attempt | Lines 50-56 retry loop, isRetriable branch |
| BL-03 | should stop retrying on non-retriable error | Lines 55, !result.isRetriable early return |
| BL-04 | should execute all attempts when all are retriable failures | Lines 50-56 full loop execution |
| BL-05 | should call startSupply before each attempt | Line 51, startSupply invocation |
| BL-06 | should call completeSupply after each attempt | Line 53, completeSupply invocation |
| BL-07 | should check abort signal before delay | Line 73, signal.throwIfAborted() |
| BL-08 | should apply exponential backoff delay before execute | Lines 75-76, calculateDelay + Delay.apply |
| BL-09 | should log success at debug level | Lines 110-112, SupplyResponseBase branch |
| BL-10 | should log retriable error at info level | Lines 116-118, isRetriable = true branch |
| BL-11 | should log non-retriable error at warn level | Lines 119-121, isRetriable = false branch |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle maxAttempts = 0 (return default error) | Line 48 defensive initialization, loop never executes |
| EC-02 | should handle maxAttempts = 1 (single attempt only) | Loop executes once, no retry |
| EC-03 | should calculate zero delay for attempt 0 | calculateDelay(0) returns 0 |
| EC-04 | should combine parent signal with timeout in createAbortSignal | Line 45, ExecutionContext.createAbortSignal |
| EC-05 | should pass attempt number to startSupply and completeSupply | Lines 51, 53 attempt parameter |
| EC-06 | should return last retriable error when all attempts exhausted | Line 57 return result after loop |
| EC-07 | should preserve error details through multiple retries | SupplyError properties maintained |
| EC-08 | should use default attempt=0 when calling supply without attempt parameter | Line 69 default parameter branch |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should convert DOMException TimeoutError to SupplyError 408 | Lines 134-139, timeout branch |
| EH-02 | should convert DOMException AbortError to SupplyError 499 | Lines 140-145, abort branch |
| EH-03 | should convert unexpected errors to SupplyError 500 | Lines 146-151, fallback branch |
| EH-04 | should catch and convert errors in supply method | Lines 77-79, catch block |
| EH-05 | should mark all DOMException errors as non-retriable | isRetriable = false for all onError results |
| EH-06 | should include error message in unexpected error reason | Line 146, error.message in reason |
| EH-07 | should log timeout errors with warn level | Line 137, tracer.warn for timeout |
| EH-08 | should log unexpected errors with error level and source | Lines 148-150, tracer.error with meta |
| EH-09 | should handle abort during delay (throwIfAborted) | AbortSignal.throwIfAborted during Delay.apply |
| EH-10 | should handle abort before first attempt | signal.throwIfAborted at line 73 |

## Mock Strategies

### IFunctions Mock
```typescript
const mockFunctions = {
  addInputData: jest.fn().mockReturnValue({ index: 0 }),
  addOutputData: jest.fn(),
  getNode: jest.fn().mockReturnValue({ name: 'TestNode' }),
};
```

### Tracer Mock
```typescript
const mockTracer = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
```

### ExecutionContext Mock
```typescript
const mockExecutionContext = {
  maxAttempts: 3,
  calculateDelay: jest.fn((attempt) => attempt * 100),
  createAbortSignal: jest.fn((parent) => parent || new AbortController().signal),
};
```

### ContextFactory.read Mock
```typescript
jest.spyOn(ContextFactory, 'read').mockReturnValue(mockExecutionContext);
```

### Delay.apply Spy
```typescript
jest.spyOn(Delay, 'apply').mockResolvedValue(undefined);
```

## Coverage Goals

- **Statements:** ≥95%
- **Branches:** 100% (all if/else, try/catch, ternary, loop conditions)
- **Functions:** 100% (supplyWithRetries, supply, execute, startSupply, completeSupply, onError)
- **Lines:** ≥95%

## Risk Areas

1. **Retry Loop Logic**: Ensure proper termination conditions (success, non-retriable, maxAttempts)
2. **Abort Signal Timing**: Verify abort checks happen before delays, not after
3. **Error Categorization**: Confirm DOMException types mapped correctly to HTTP codes
4. **Log Level Semantics**: Validate info vs warn for retriable vs non-retriable
5. **Input/Output Correlation**: Verify runIndex passed correctly from startSupply to completeSupply

## Success Criteria

- [ ] Test plan created with author and date
- [ ] All exports identified (SupplierBase abstract class)
- [ ] All branches covered (100%)
- [ ] All error paths tested (10 EH test cases)
- [ ] Mock strategies documented
- [ ] Abstract class tested via concrete TestSupplier implementation
- [ ] Coverage ≥95% (statements, branches, functions, lines)
