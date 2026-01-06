# Test Plan: supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-06
**Coverage Target:** ≥95% all metrics
**Test File:** `supplier-base.test.ts`

## Code Surface

**Exports:** `SupplierBase` (abstract class)

**Dependencies:**
- `IntentoConnectionType` - n8n workflow type (type import only)
- `ContextFactory.read()` - needs mocking
- `ExecutionContext` - needs mocking (provides maxAttempts, calculateDelay, createAbortSignal)
- `Tracer` - needs mocking (debug, info, warn, bugDetected methods)
- `IFunctions` - needs mocking (addInputData, addOutputData, getNode)
- `Delay.apply()` - needs mocking
- `SupplyRequestBase`, `SupplyResponseBase`, `SupplyErrorBase` - need concrete test implementations

**Branches:** 10 conditional branches
- Line 63: `if (result instanceof SupplyResponseBase)` - success path
- Line 65: `if (!result.isRetriable)` - non-retriable error path
- Line 67: `if (result)` - result exists check
- Line 95: `if (attempt === 0)` - first attempt (0 delay)
- Line 103-105: try/catch block - error handling
- Line 115: `if (result instanceof SupplyResponseBase)` - success completion
- Line 120: `if (result.isRetriable)` - retriable vs non-retriable logging

**ESLint Considerations:**
- File-level disables needed: `@typescript-eslint/no-unsafe-assignment` (for mock setups)
- Type assertions needed: Mock return values, test class instantiation
- Import order: external packages → types → implementation

## Test Cases

### SupplierBase (Abstract Class - Test via Concrete Implementation)

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should initialize with name, connection, functions, tracer, and context | Constructor lines 35-41, property initialization |
| BL-02 | should succeed on first attempt with valid response | Lines 55-68, happy path with immediate success |
| BL-03 | should return success response immediately without retry | Lines 62-63, early return on SupplyResponseBase |
| BL-04 | should track input data with addInputData on attempt start | Lines 124-127, startAttempt method |
| BL-05 | should track output data with addOutputData on success | Lines 115-118, completeAttempt success path |
| BL-06 | should clone request before supply call to prevent mutation | Line 101, request.clone() invocation |
| BL-07 | should apply exponential backoff delay before each attempt | Lines 98-99, Delay.apply with calculateDelay |
| BL-08 | should use context.createAbortSignal for cancellation | Line 58, createAbortSignal chaining |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should retry up to maxAttempts times for retriable errors | Lines 61-66, retry loop with retriable errors |
| EC-02 | should stop retrying on first non-retriable error | Lines 64-65, early exit on non-retriable |
| EC-03 | should handle zero delay on first attempt (attempt 0) | Line 98, calculateDelay(0) |
| EC-04 | should respect AbortSignal cancellation during delay | Line 99, signal passed to Delay.apply |
| EC-05 | should respect AbortSignal cancellation during supply call | Lines 100, signal passed to supply() |
| EC-06 | should return last retriable error when all attempts exhausted | Lines 61-67, loop completion with retriable errors |
| EC-07 | should log retriable errors as info level | Lines 120-121, retriable error logging |
| EC-08 | should log non-retriable errors as warn level | Lines 122-123, non-retriable error logging |
| EC-09 | should log success as debug level | Line 116, success logging |
| EC-10 | should add error output data for retriable errors | Line 125, addOutputData with error |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should catch exceptions and convert to error response via onError | Lines 103-106, catch block |
| EH-02 | should complete attempt with error response after exception | Line 107, completeAttempt after catch |
| EH-03 | should log bug detection if no attempts were made | Line 68, bugDetected for impossible state |
| EH-04 | should pass original request to onError for context | Line 105, request passed to onError |
| EH-05 | should add error output data for non-retriable errors | Line 125, addOutputData with non-retriable error |

## Mock Strategy

**ExecutionContext mock:**
- `maxAttempts: number` (default 3)
- `calculateDelay(attempt: number): number` (returns attempt * 100)
- `createAbortSignal(signal?: AbortSignal): AbortSignal`

**Tracer mock:**
- `debug(message: string, metadata?: LogMetadata): void`
- `info(message: string, metadata?: LogMetadata): void`
- `warn(message: string, metadata?: LogMetadata): void`
- `bugDetected(where: string, message: string, metadata?: LogMetadata): void`

**IFunctions mock:**
- `addInputData(connection: IntentoConnectionType, data: any): { index: number }`
- `addOutputData(connection: IntentoConnectionType, index: number, data: any): void`
- `getNode(): INode`

**Delay mock:**
- `apply(ms: number, signal?: AbortSignal): Promise<void>`

**ContextFactory mock:**
- `read(ctor: typeof ExecutionContext, functions: IFunctions, tracer: Tracer): ExecutionContext`

**Test implementations:**
- `TestRequest extends SupplyRequestBase` with clone() method
- `TestResponse extends SupplyResponseBase`
- `TestError extends SupplyErrorBase` with isRetriable flag
- `TestSupplier extends SupplierBase` implementing supply() and onError()

## Test Data Fixtures

**Test request:**
```typescript
class TestRequest extends SupplyRequestBase {
  constructor(public data: string) { super(); }
  asLogMetadata(): LogMetadata { return { requestId: this.requestId, data: this.data }; }
  asDataObject(): IDataObject { return { requestId: this.requestId, data: this.data }; }
  clone(): this { return new TestRequest(this.data) as this; }
}
```

**Test response:**
```typescript
class TestResponse extends SupplyResponseBase {
  constructor(request: SupplyRequestBase, public result: string) { super(request); }
  asLogMetadata(): LogMetadata { return { requestId: this.requestId, result: this.result }; }
  asDataObject(): IDataObject { return { requestId: this.requestId, result: this.result }; }
}
```

**Test error:**
```typescript
class TestError extends SupplyErrorBase {
  constructor(request: SupplyRequestBase, code: number, reason: string, isRetriable: boolean) {
    super(request, code, reason, isRetriable);
  }
  asLogMetadata(): LogMetadata { return { requestId: this.requestId, code: this.code, reason: this.reason }; }
  asDataObject(): IDataObject { return { error: this.reason, code: this.code }; }
  asError(node: INode): NodeOperationError { return new NodeOperationError(node, this.reason); }
}
```

**Test supplier:**
```typescript
class TestSupplier extends SupplierBase<TestRequest, TestResponse, TestError> {
  public supplyImpl: jest.Mock;
  public onErrorImpl: jest.Mock;

  constructor(name: string, connection: IntentoConnectionType, functions: IFunctions) {
    super(name, connection, functions);
    this.supplyImpl = jest.fn();
    this.onErrorImpl = jest.fn();
  }

  protected async supply(request: TestRequest, signal?: AbortSignal): Promise<TestResponse | TestError> {
    return this.supplyImpl(request, signal);
  }

  protected onError(request: TestRequest, error: Error): TestError {
    return this.onErrorImpl(request, error);
  }
}
```

## Coverage Goals

- **Statements:** ≥95%
- **Branches:** 100% (all if/else paths)
- **Functions:** 100% (all methods including private)
- **Lines:** ≥95%

## Success Criteria

- [ ] Test plan created with author and date
- [ ] All exports identified (SupplierBase abstract class)
- [ ] All branches covered (10 conditional branches)
- [ ] All error paths tested (3 error scenarios)
- [ ] ESLint considerations documented
- [ ] Mock strategy defined for all dependencies
- [ ] Test data fixtures specified
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] Tests pass linting and TypeScript compilation
- [ ] All tests follow AAA pattern with test IDs
