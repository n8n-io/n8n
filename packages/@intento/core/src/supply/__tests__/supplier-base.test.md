# Test Plan: supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `supplier-base.test.ts`

## Code Analysis

### Exports
- `SupplierBase<TI, TS, TE>` (abstract class) - Generic supplier with retry logic

### Properties
- `connection: IntentoConnectionType` (protected readonly) - n8n connection type
- `functions: IFunctions` (protected readonly) - n8n execution functions
- `tracer: Tracer` (protected readonly) - Logging and tracing
- `context: ExecutionContext` (protected readonly) - Execution configuration
- `name: string` (readonly) - Supplier name

### Constructor Logic
- Lines 50-57: Initializes supplier with name, connection, and functions
- Creates Tracer instance
- Reads ExecutionContext from functions

### Public Methods
- `supplyWithRetries(request, signal?)` - Lines 68-81: Main retry orchestration
  - Loops up to `context.maxAttempts` times
  - Exits early on success or non-retryable errors
  - Returns TS or TE
  - Throws if no attempts made (bug scenario)

### Private Methods
- `executeAttempt(attempt, request, signal?)` - Lines 97-112: Single attempt execution
  - Applies exponential backoff delay
  - Clones request for immutability
  - Calls abstract `supply()` method
  - Handles TimeoutError specially
  - Tracks attempt in n8n UI

- `startAttempt(request, attempt)` - Lines 114-119: Starts tracking in n8n
  - Logs attempt start
  - Calls `addInputData()` to register input

- `completeAttempt(index, result, attempt)` - Lines 121-130: Completes tracking in n8n
  - Logs success/failure
  - Calls `addOutputData()` with result or error

- `failAndThrow(index, attempt, error)` - Lines 132-140: Handles unexpected errors
  - Converts to NodeOperationError
  - Tracks in n8n UI
  - Throws error

### Abstract Methods (Must be tested via concrete implementation)
- `supply(request, signal?)` - Line 90: Actual supply implementation
- `onTimeOut(request)` - Line 96: Timeout error creator

### Dependencies to Mock
- `IFunctions` - n8n execution functions
- `Tracer` - Logging/tracing
- `ExecutionContext` - Configuration (maxAttempts, timeouts, delays)
- `ContextFactory` - Creates ExecutionContext
- `Delay.apply()` - Exponential backoff delays
- `AbortSignal` - Cancellation/timeout signals

## Test Case Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should initialize supplier with name, connection, and functions | Lines 50-57, constructor |
| BL-02 | should create Tracer instance during construction | Line 54, tracer initialization |
| BL-03 | should read ExecutionContext during construction | Line 55, context initialization |
| BL-04 | should return response on first successful attempt | Lines 75-76, early exit on success |
| BL-05 | should retry on retryable error and succeed on second attempt | Lines 74-77, retry loop |
| BL-06 | should exit early on non-retryable error without retrying | Lines 77-78, non-retryable exit |
| BL-07 | should apply exponential backoff delay before each attempt | Line 102, delay application |
| BL-08 | should clone request for each retry attempt | Line 104, request immutability |
| BL-09 | should track input data in n8n UI for each attempt | Line 117, addInputData call |
| BL-10 | should track output data in n8n UI for successful attempt | Line 127, addOutputData with response |
| BL-11 | should track error in n8n UI for failed attempt | Line 130, addOutputData with error |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle timeout error and convert to TE | Lines 108-111, TimeoutError handling |
| EC-02 | should retry up to maxAttempts for retryable errors | Lines 74-77, retry limit |
| EC-03 | should return last retryable error after maxAttempts exhausted | Line 79, final error return |
| EC-04 | should handle signal cancellation gracefully | Line 69, abort signal |
| EC-05 | should calculate delay as zero for first attempt | Line 102, attempt 0 delay |
| EC-06 | should pass abort signal through to supply method | Line 104, signal propagation |
| EC-07 | should call onTimeOut when TimeoutError occurs | Line 109, timeout handler |
| EC-08 | should track attempt number correctly in logs | Lines 115, 123, 126, attempt tracking |
| EC-09 | should handle multiple retryable errors before success | Retry sequence validation |
| EC-10 | should preserve runIndex correlation between input and output | Lines 118, 127, 130, index usage |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if no attempts were made (bug scenario) | Line 79, errorAndThrow call |
| EH-02 | should handle CoreError with clear message | Line 136, CoreError handling |
| EH-03 | should handle unexpected error with bug message | Lines 136-137, unexpected error |
| EH-04 | should track unexpected error in n8n UI | Line 138, error output tracking |
| EH-05 | should rethrow unexpected errors after tracking | Line 139, error propagation |

## Mock Strategy

### Mocked Dependencies
```typescript
// Mock IFunctions
const mockFunctions = mock<IFunctions>();
mockFunctions.addInputData.mockReturnValue({ index: 0 });
mockFunctions.addOutputData.mockReturnValue();
mockFunctions.getNode.mockReturnValue(mockNode);

// Mock Tracer
jest.mock('../../tracing/tracer', () => ({
  Tracer: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    errorAndThrow: jest.fn((msg) => { throw new Error(msg); }),
    nodeName: 'TestNode',
  })),
}));

// Mock ExecutionContext
const mockContext = mock<ExecutionContext>();
mockContext.maxAttempts = 3;
mockContext.calculateDelay.mockImplementation((attempt) => attempt * 100);
mockContext.createAbortSignal.mockImplementation((signal) => signal || new AbortController().signal);

// Mock ContextFactory
jest.mock('../../context/context-factory', () => ({
  ContextFactory: {
    read: jest.fn().mockReturnValue(mockContext),
  },
}));

// Mock Delay
jest.mock('../../utils/delay', () => ({
  Delay: {
    apply: jest.fn().mockResolvedValue(undefined),
  },
}));
```

### Test Double Pattern
```typescript
// Concrete implementation for testing abstract class
class TestSupplier extends SupplierBase<TestRequest, TestResponse, TestError> {
  public supplyMock = jest.fn<Promise<TestResponse | TestError>, [TestRequest, AbortSignal?]>();
  public onTimeOutMock = jest.fn<TestError, [TestRequest]>();

  protected async supply(request: TestRequest, signal?: AbortSignal): Promise<TestResponse | TestError> {
    return this.supplyMock(request, signal);
  }

  protected onTimeOut(request: TestRequest): TestError {
    return this.onTimeOutMock(request);
  }
}

// Test data classes
class TestRequest extends SupplyRequestBase {
  constructor(public data: string) { super(); }
  asLogMetadata() { return { requestId: this.requestId, data: this.data }; }
  asDataObject() { return { requestId: this.requestId, data: this.data }; }
  clone() { return new TestRequest(this.data) as this; }
}

class TestResponse extends SupplyResponseBase {
  constructor(request: SupplyRequestBase, public result: string) { super(request); }
  asLogMetadata() { return { requestId: this.requestId, result: this.result }; }
  asDataObject() { return { requestId: this.requestId, result: this.result }; }
}

class TestError extends SupplyErrorBase {
  constructor(request: SupplyRequestBase, code: number, reason: string) { super(request, code, reason); }
  asLogMetadata() { return { requestId: this.requestId, code: this.code, reason: this.reason }; }
  asDataObject() { return { requestId: this.requestId, code: this.code, reason: this.reason }; }
  asError(node: INode) { return new NodeOperationError(node, this.reason); }
}
```

## Coverage Mapping

### Lines to Cover
- **Lines 50-57**: Constructor (property initialization)
- **Line 69**: Create abort signal
- **Lines 74-78**: Retry loop with early exit conditions
- **Line 79**: Error throw for no attempts (bug scenario)
- **Line 102**: Apply exponential backoff delay
- **Line 104**: Call supply() with cloned request
- **Lines 108-109**: TimeoutError detection and handling
- **Line 110**: Call onTimeOut()
- **Line 111**: Complete attempt with timeout error
- **Line 115**: Start attempt logging
- **Line 117**: Add input data to n8n
- **Lines 123, 126**: Complete attempt logging
- **Line 127**: Add output data for success
- **Line 130**: Add output data for error
- **Lines 136-139**: Fail and throw logic

### Branches to Cover
- **Line 76**: `result instanceof SupplyResponseBase` (true/false)
- **Line 77**: `!result.isRetryable()` (true/false)
- **Line 108**: `error instanceof DOMException && error.name === 'TimeoutError'` (true/false)
- **Line 122**: `result instanceof SupplyResponseBase` (true/false)
- **Line 136**: `error instanceof CoreError` (true/false)

### Uncovered Scenarios
- Direct instantiation of abstract class (TypeScript compile-time check)

## Expected Coverage Metrics
- **Lines**: ≥95%
- **Statements**: ≥95%
- **Functions**: 100% (constructor + public/private methods)
- **Branches**: 100% (all conditional paths)

## Test Fixtures

### Sample Data
```typescript
const MOCK_CONNECTION_TYPE: IntentoConnectionType = 'intento_translationProvider';
const MOCK_SUPPLIER_NAME = 'TestSupplier';
const MOCK_MAX_ATTEMPTS = 3;
```

## Implementation Notes

1. **Abstract Class Testing**: Create concrete TestSupplier with mockable supply() and onTimeOut()
2. **Mock Management**: Mock IFunctions, Tracer, ExecutionContext, ContextFactory, Delay
3. **Retry Testing**: Test various retry scenarios (success on attempt 1, 2, 3, exhaust all attempts)
4. **Error Types**: Test retryable (429, 5xx), non-retryable (4xx), timeout, unexpected errors
5. **Exponential Backoff**: Verify Delay.apply() called with correct values
6. **Request Cloning**: Verify clone() called for each attempt
7. **n8n Integration**: Verify addInputData() and addOutputData() called correctly
8. **Signal Propagation**: Verify abort signal passed through chain
9. **Attempt Tracking**: Verify attempt numbers logged correctly

## Risk Assessment

### High Risk
- Retry logic correctness is critical for reliability
- Signal/timeout handling must be robust
- n8n integration tracking must be accurate

### Medium Risk
- Exponential backoff calculation
- Request cloning immutability
- Error type distinction (retryable vs non-retryable)

### Mitigation
- Test all retry scenarios exhaustively
- Verify timeout handling with actual TimeoutError
- Test early exit conditions (success, non-retryable error)
- Verify n8n tracking called for every attempt
- Test edge cases (0 attempts, signal cancellation)
- Verify error message formatting for CoreError vs unexpected errors
