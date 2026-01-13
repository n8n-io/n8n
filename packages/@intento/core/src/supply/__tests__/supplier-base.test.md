# Test Plan: supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `supplier-base.test.ts`

## Code Surface

**Exports:** `SupplierBase` (abstract class with generics `<TI extends SupplyRequestBase, TS extends SupplyResponseBase>`)

**Methods to Test:**
- `constructor(descriptor, connection, functions)` - Initializes supplier with dependencies
- `supplyWithRetries(request, signal)` - Public retry loop orchestration
- `supply(request, signal, attempt)` - Public single supply attempt with error handling
- `execute(request, signal)` - Abstract method (tested via concrete implementation)
- `startSupply(request, attempt)` - Private method (tested via public supply)
- `completeSupply(index, result, attempt)` - Private method (tested via public supply)
- `onError(request, error)` - Protected error converter (tested directly and via supply)

**Dependencies:**
- `ContextFactory` (mock) - Reads ExecutionContext from node parameters
- `ExecutionContext` (mock) - Provides maxAttempts, createAbortSignal(), calculateDelay()
- `Tracer` (mock) - Logging methods (debug, info, warn, error, bugDetected)
- `IFunctions` (mock) - n8n interface (addInputData, addOutputData, getNode)
- `IDescriptor` (mock) - Supplier metadata
- `IntentoConnectionType` (mock) - n8n connection type
- `Delay.apply()` (mock) - Exponential backoff implementation
- `SupplyRequestBase` (concrete test class) - Abstract request class
- `SupplyResponseBase` (concrete test class) - Abstract response class
- `SupplyError` (real) - Error representation

**Branches:**
1. `supplyWithRetries` line 60: `result instanceof SupplyResponseBase` (success check)
2. `supplyWithRetries` line 62: `!result.isRetriable` (non-retriable check)
3. `supplyWithRetries` line 64: `attempt === this.executionContext.maxAttempts - 1` (last attempt check)
4. `supply` line 95: `result.throwIfInvalid()` try/catch wrapper (validation errors)
5. `supply` line 97: catch block error handling
6. `completeSupply` line 144: `result instanceof SupplyResponseBase` (success vs error path)
7. `completeSupply` line 149: `result.isRetriable` (retriable vs non-retriable logging)
8. `onError` line 165: `error instanceof DOMException && error.name === 'TimeoutError'`
9. `onError` line 171: `error instanceof DOMException && error.name === 'AbortError'`
10. `onError` line 177: Catch-all unexpected error path

**ESLint Considerations:**
- File-level disables needed: None expected (using jest-mock-extended for type-safe mocks)
- Type assertions needed: Concrete test implementations of SupplyRequestBase/SupplyResponseBase
- Import order: reflect-metadata (if decorators used) → jest-mock-extended → n8n-workflow types → implementation

## Test Implementation Strategy

### Concrete Test Classes

Create concrete implementations for testing abstract class:

```typescript
class TestSupplyRequest extends SupplyRequestBase {
  constructor(agentRequestId: string = crypto.randomUUID()) {
    super({ agentRequestId } as AgentRequestBase);
  }
  asDataObject(): IDataObject { return { id: this.supplyRequestId }; }
}

class TestSupplyResponse extends SupplyResponseBase {
  constructor(request: SupplyRequestBase) {
    super(request);
  }
  asDataObject(): IDataObject { return { id: this.supplyRequestId }; }
}

class TestSupplier extends SupplierBase<TestSupplyRequest, TestSupplyResponse> {
  // Allow execute to be mocked for each test
  public executeMock: jest.Mock;

  constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
    super(descriptor, connection, functions);
    this.executeMock = jest.fn();
  }

  protected async execute(request: TestSupplyRequest, signal: AbortSignal): Promise<TestSupplyResponse | SupplyError> {
    return this.executeMock(request, signal);
  }
}
```

### Mock Setup Pattern

```typescript
let mockDescriptor: IDescriptor;
let mockConnection: IntentoConnectionType;
let mockFunctions: IFunctions;
let mockNode: INode;
let mockTracer: Tracer;
let mockExecutionContext: ExecutionContext;
let supplier: TestSupplier;

beforeEach(() => {
  mockNode = mock<INode>({ name: 'TestNode' });
  mockDescriptor = mock<IDescriptor>();
  mockConnection = mock<IntentoConnectionType>();
  mockFunctions = mock<IFunctions>();
  mockFunctions.getNode.mockReturnValue(mockNode);
  mockFunctions.addInputData.mockReturnValue({ index: 0 });

  mockTracer = mock<Tracer>();
  mockExecutionContext = mock<ExecutionContext>();
  mockExecutionContext.maxAttempts = 3;
  mockExecutionContext.createAbortSignal.mockReturnValue(AbortSignal.timeout(10000));
  mockExecutionContext.calculateDelay.mockReturnValue(0);

  jest.spyOn(ContextFactory, 'read').mockReturnValue(mockExecutionContext);
  jest.spyOn(Delay, 'apply').mockResolvedValue(undefined);

  supplier = new TestSupplier(mockDescriptor, mockConnection, mockFunctions);
});

afterEach(() => {
  jest.clearAllMocks();
});
```

## Test Cases

### SupplierBase Constructor

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should initialize with descriptor, connection, and functions | Lines 38-43, constructor initialization |
| BL-02 | should create Tracer with descriptor and functions | Line 40, Tracer constructor call |
| BL-03 | should read ExecutionContext via ContextFactory | Line 42, ContextFactory.read call |
| BL-04 | should store descriptor as public readonly property | Line 41, descriptor assignment |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle ContextFactory returning custom ExecutionContext | Line 42, different config values |

### supplyWithRetries

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-05 | should return success immediately on first attempt | Lines 57-60, early return on SupplyResponseBase |
| BL-06 | should retry retriable error up to maxAttempts | Lines 57-65, retry loop with retriable errors |
| BL-07 | should return non-retriable error immediately without retry | Lines 57-62, early return on isRetriable=false |
| BL-08 | should create combined abort signal with timeout | Line 56, createAbortSignal call |
| BL-09 | should call supply for each attempt with incremented attempt number | Line 58, supply call with attempt=0,1,2 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-02 | should return error on last attempt without additional retry | Lines 64-65, last attempt check |
| EC-03 | should handle maxAttempts=1 (no retries) | Lines 57-65, loop exits immediately on last attempt |
| EC-04 | should handle maxAttempts=50 (maximum retries) | Lines 57-65, large retry count |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should log bugDetected if unreachable code is reached | Line 67, unreachable code path (defensive) |

### supply

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-10 | should call startSupply at beginning of attempt | Line 81, startSupply call |
| BL-11 | should check abort signal before execution | Line 84, throwIfAborted call |
| BL-12 | should validate request before execution | Line 86, request.throwIfInvalid call |
| BL-13 | should calculate and apply backoff delay | Lines 89-90, calculateDelay + Delay.apply |
| BL-14 | should call execute with request and signal | Line 93, execute call |
| BL-15 | should validate response after execution | Line 95, result.throwIfInvalid call |
| BL-16 | should call completeSupply with result | Line 99, completeSupply call |
| BL-17 | should return successful response from execute | Lines 93-100, success path |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-05 | should use default attempt=0 when parameter omitted | Line 79, default parameter value |
| EC-06 | should apply 0ms delay on first attempt (attempt=0) | Lines 89-90, delay calculation boundary |
| EC-07 | should apply non-zero delay on subsequent attempts | Lines 89-90, delay for attempt>0 |
| EC-08 | should handle execute returning SupplyError (no validation) | Lines 93-95, SupplyError branch skips validation |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-02 | should convert error to SupplyError via onError | Lines 96-98, catch block |
| EH-03 | should convert AbortError from signal.throwIfAborted | Lines 84+97, abort error handling |
| EH-04 | should convert validation error from request.throwIfInvalid | Lines 86+97, validation error handling |
| EH-05 | should convert error from Delay.apply | Lines 90+97, delay abort error |
| EH-06 | should convert error from execute | Lines 93+97, execute error handling |
| EH-07 | should convert validation error from result.throwIfInvalid | Lines 95+97, response validation error |

### startSupply (tested via supply)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-18 | should log debug message with 1-based attempt number | Line 124, tracer.debug with attempt+1 |
| BL-19 | should call addInputData with request data object | Line 126, addInputData call |
| BL-20 | should return index from addInputData result | Line 127, return runIndex.index |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-09 | should format attempt 0 as "attempt 1" in logs | Line 124, user-friendly numbering |
| EC-10 | should format attempt 49 as "attempt 50" in logs | Line 124, maximum attempt display |

### completeSupply (tested via supply)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-21 | should log debug and add output for successful response | Lines 144-147, success path |
| BL-22 | should log info for retriable error | Lines 149-151, retriable error logging |
| BL-23 | should log warn for non-retriable error | Lines 152-154, non-retriable error logging |
| BL-24 | should call addOutputData with error for SupplyError | Line 156, error output |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-11 | should use 1-based attempt numbering in all log messages | Lines 145, 151, 154, consistent formatting |

### onError

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-25 | should convert TimeoutError to code 408 non-retriable | Lines 165-169, timeout error path |
| BL-26 | should convert AbortError to code 499 non-retriable | Lines 171-175, abort error path |
| BL-27 | should convert unexpected error to code 500 non-retriable | Lines 177-182, catch-all path |
| BL-28 | should log warn for TimeoutError with reason | Line 168, timeout logging |
| BL-29 | should log warn for AbortError with reason | Line 174, abort logging |
| BL-30 | should log error for unexpected error with details | Line 181, unexpected error logging |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-12 | should handle DOMException with different name (not timeout/abort) | Lines 165+171 false branches, falls to catch-all |
| EC-13 | should handle non-DOMException errors | Line 165 false, falls to catch-all |
| EC-14 | should include error details in unexpected error metadata | Line 180, meta object with details |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-08 | should always mark errors as non-retriable (isRetriable=false) | Lines 167, 173, 178, all false |
| EH-09 | should include request metadata in all error log calls | Lines 168, 174, 181, metadata propagation |

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (SupplierBase abstract class)
- [x] All branches covered (10 branches mapped to test cases)
- [x] All error paths tested (EH-01 through EH-09)
- [x] ESLint considerations documented
- [x] Concrete test implementations planned (TestSupplyRequest, TestSupplyResponse, TestSupplier)
- [x] Mock strategy defined (ContextFactory.read, Delay.apply, IFunctions, Tracer, ExecutionContext)
- [x] Private methods testing strategy (via public methods)
- [x] Coverage target ≥95% (statements, branches, functions, lines)
- [ ] Tests implemented and passing
- [ ] Coverage verified ≥95%

## Implementation Notes

### Critical Test Scenarios

1. **Retry Loop Termination:**
   - Test all three exit conditions: success, non-retriable, last attempt
   - Verify loop never exceeds maxAttempts
   - Confirm each iteration increments attempt number correctly

2. **Signal Propagation:**
   - Test parent signal abort during retry loop
   - Test timeout signal abort during delay
   - Test combined signal behavior

3. **Error Categorization:**
   - Verify TimeoutError → 408
   - Verify AbortError → 499
   - Verify all other errors → 500
   - Confirm all errors non-retriable by default

4. **n8n Integration:**
   - Test addInputData called once per attempt
   - Test addOutputData called once per attempt with correct data
   - Verify output format differs for success (JSON) vs error (NodeOperationError)

5. **Logging Consistency:**
   - Verify 1-based attempt numbering in all logs
   - Confirm log levels: debug (success), info (retriable error), warn (non-retriable error), error (unexpected)
   - Check metadata inclusion in all log calls

### Coverage Commands

```bash
# Run tests with coverage
pnpm test src/supply/__tests__/supplier-base.test.ts --coverage

# Focus coverage on supplier-base.ts only
pnpm test src/supply/__tests__/supplier-base.test.ts --coverage --collectCoverageFrom="src/supply/supplier-base.ts"
```

### Expected Test Count

- **BL:** 30 tests (business logic)
- **EC:** 14 tests (edge cases)
- **EH:** 9 tests (error handling)
- **Total:** 53 tests

### Potential Coverage Gaps

1. **Unreachable code at line 67:** bugDetected call should never execute - add defensive test anyway
2. **Private methods:** Covered via public supply() calls - ensure all branches hit
3. **Constructor dependency injection:** Verify all properties assigned correctly
4. **Generic type constraints:** Test with concrete implementations extending base classes
