# Test Plan: supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `supplier-base.test.ts`

## Code Surface
**Exports:** SupplierBase (abstract class)
**Dependencies:**
- ContextFactory.read (mock ExecutionContext)
- Tracer (mock logging)
- IFunctions (mock n8n functions with addInputData/addOutputData)
- Delay.apply (spy to control timing)
- Date.now() (already tested in child classes)
- NodeOperationError (mock n8n error)

**Branches:**
- Line 137: `if (result instanceof SupplyResponseBase) return result;` (success early return)
- Line 141: `if (!result)` (defensive check)
- Line 223: `if (result instanceof SupplyResponseBase)` (success vs error logging)
- Line 202: `if (error instanceof DOMException && error.name === 'TimeoutError')` (timeout handling)
- Line 254: `error instanceof CoreError` (error classification)

**ESLint Considerations:**
- Import order: jest-mock-extended before type imports
- Type safety: Create concrete test subclass for abstract class
- Mock return types: IFunctions methods return proper types

## Test Cases

### SupplierBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should initialize with name, connection, functions | Lines 92-98, constructor |
| BL-02 | should read ExecutionContext during construction | Line 96, ContextFactory.read |
| BL-03 | should create Tracer during construction | Line 95, new Tracer |
| BL-04 | should execute supply once when first attempt succeeds | Lines 127-138, immediate success |
| BL-05 | should retry on error until success | Lines 135-138, retry loop |
| BL-06 | should return final error after exhausting retries | Lines 140-143, all attempts fail |
| BL-07 | should log debug message at supply start | Line 126, initial debug log |
| BL-08 | should log warning after all retries fail | Line 142, failure warning |
| BL-09 | should apply exponential backoff delay between attempts | Lines 193-194, Delay.apply |
| BL-10 | should clone request for each attempt | Line 195, request.clone() |
| BL-11 | should track successful attempt in execution data | Line 226, addOutputData with response |
| BL-12 | should track failed attempt in execution data | Line 230, addOutputData with error |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle maxAttempts = 1 (single attempt) | Lines 135-138, loop boundary |
| EC-02 | should handle maxAttempts = 50 (maximum retries) | Lines 135-138, upper boundary |
| EC-03 | should pass abort signal through to delay and supply | Lines 127, 193-194, signal propagation |
| EC-04 | should create abort signal from context | Line 127, createAbortSignal |
| EC-05 | should handle zero delay on first attempt (attempt = 0) | Line 193, calculateDelay(0) |
| EC-06 | should record input data for each attempt | Line 218, addInputData |
| EC-07 | should use correct run index for output tracking | Lines 191, 218, runIndex usage |
| EC-08 | should distinguish success vs error in completeAttempt | Lines 223-230, instanceof check |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw NodeOperationError when supply throws unexpected error | Lines 201-204, catch block |
| EH-02 | should throw TimeoutError when signal times out | Lines 202-203, timeout handling |
| EH-03 | should wrap CoreError with original message | Line 254, CoreError classification |
| EH-04 | should wrap other errors with BUG marker | Line 254, generic error |
| EH-05 | should track error in execution data before throwing | Lines 256-257, addOutputData then throw |
| EH-06 | should throw defensive error if no result after loop | Line 141, defensive check |
| EH-07 | should throw CoreError if ExecutionContext cannot be read | Line 96, ContextFactory.read fails |
| EH-08 | should preserve timeout error type (not wrap as NodeOperationError) | Lines 269-271, throw original |
| EH-09 | should provide configuration guidance for timeout errors | Line 268, timeout message |

## Mock Strategy

### Concrete Test Subclass
Create `TestSupplier` extending `SupplierBase` with:
- Controllable `supply()` implementation that can succeed, fail, or throw
- Track supply call count for retry verification
- Return predictable test responses

### Mock Dependencies
- **IFunctions**: Mock with jest-mock-extended
  - `addInputData()` returns `{ index: incrementing counter }`
  - `addOutputData()` tracks calls for verification
  - `getNode()` returns mock INode
- **Tracer**: Mock all methods (debug, info, warn, errorAndThrow)
- **ExecutionContext**: Mock with controllable maxAttempts, calculateDelay, createAbortSignal
- **ContextFactory.read**: Spy to return mock ExecutionContext
- **Delay.apply**: Spy to verify delay calls and durations
- **Request/Response/Error**: Concrete test implementations

### Test Helpers
- `createMockRequest()`: Returns test request with clone()
- `createMockResponse()`: Returns test success response
- `createMockError()`: Returns test error response
- `setupMocks()`: Initializes all mocks with defaults

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified (SupplierBase abstract class)
- [x] All branches covered (5 conditionals documented)
- [x] All error paths tested (9 error handling tests)
- [x] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] Tests pass TypeScript and ESLint checks
