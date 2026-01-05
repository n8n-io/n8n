# Test Plan: supply-error-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-error-base.test.ts`

## Code Analysis

### Exports
- `SupplyErrorBase` (abstract class) - implements `ITraceable`, `IDataProvider`

### Properties
- `requestId: string` (readonly) - Copied from request
- `latencyMs: number` (readonly) - Calculated as `Date.now() - request.requestedAt`
- `code: number` (readonly) - HTTP status code or error code
- `reason: string` (readonly) - Error reason/message

### Constructor Logic
- Lines 42-48: Accepts `SupplyRequestBase`, `code`, and `reason` parameters
- Line 43: Copies requestId from request
- Line 45: Calculates latency from request timestamp to error creation
- Lines 46-47: Stores error code and reason

### Methods
- `isRetryable(): boolean` - Lines 63-66: Determines retryability based on HTTP status codes
  - Returns `true` for code 429 (rate limit)
  - Returns `true` for codes 500-599 (server errors)
  - Returns `false` for all other codes

### Abstract Methods (Must be tested via concrete implementation)
- `asLogMetadata(): LogMetadata` - Line 50
- `asDataObject(): IDataObject` - Line 51
- `asError(node: INode): NodeOperationError` - Line 57

### Dependencies to Mock
- `Date.now()` - For predictable latency calculation testing
- `SupplyRequestBase` - Mock request objects with known timestamps
- `INode` - Mock n8n node for asError testing

### Edge Cases
- Retryable error codes: 429, 500, 501, 502, 503, 504, 599
- Non-retryable error codes: 400, 401, 403, 404, 200, 201
- Boundary values: 499 (not retryable), 500 (retryable), 600 (not retryable)
- Zero latency, large latency values
- Empty reason strings, long reason strings

## Test Case Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy requestId from request | Line 43, requestId assignment |
| BL-02 | should calculate latencyMs from request timestamp | Line 45, latency calculation |
| BL-03 | should store error code | Line 46, code assignment |
| BL-04 | should store error reason | Line 47, reason assignment |
| BL-05 | should implement ITraceable interface with requestId | Interface contract validation |
| BL-06 | should implement IDataProvider interface | Interface contract validation |
| BL-07 | should return true for retryable error code 429 | Line 65, rate limit check |
| BL-08 | should return true for retryable server error 500 | Line 65, server error check |
| BL-09 | should return true for retryable server error 503 | Line 65, server error range |
| BL-10 | should return false for non-retryable client error 400 | Line 65, client error check |
| BL-11 | should return false for non-retryable client error 404 | Line 65, not found check |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle zero latency (same millisecond as request) | Immediate error scenario |
| EC-02 | should handle large latency values | Long-running request before error |
| EC-03 | should preserve requestId from request without modification | ID immutability |
| EC-04 | should handle empty reason string | Edge case validation |
| EC-05 | should handle long reason string | Large text handling |
| EC-06 | should return true for boundary retryable code 500 | Boundary: first 5xx |
| EC-07 | should return true for boundary retryable code 599 | Boundary: last 5xx |
| EC-08 | should return false for boundary non-retryable code 499 | Boundary: before 5xx |
| EC-09 | should return false for boundary non-retryable code 600 | Boundary: after 5xx |
| EC-10 | should require concrete implementation of asLogMetadata | Abstract method enforcement |
| EC-11 | should require concrete implementation of asDataObject | Abstract method enforcement |
| EC-12 | should require concrete implementation of asError | Abstract method enforcement |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should enforce abstract class pattern via TypeScript | TypeScript abstract enforcement |

## Mock Strategy

### Mocked Dependencies
```typescript
// Mock Date.now for predictable latency calculation
const mockDateNow = jest.spyOn(Date, 'now');

// Mock SupplyRequestBase for testing
class MockRequest extends SupplyRequestBase {
  constructor(testRequestId: string, testRequestedAt: number) {
    super();
    (this as any).requestId = testRequestId;
    (this as any).requestedAt = testRequestedAt;
  }

  asLogMetadata() { return {}; }
  asDataObject() { return {}; }
  clone() { return this; }
}

// Mock INode for asError testing
const mockNode = mock<INode>();
```

### Test Double Pattern
```typescript
// Concrete implementation for testing abstract class
class TestError extends SupplyErrorBase {
  constructor(request: SupplyRequestBase, code: number, reason: string, private details?: string) {
    super(request, code, reason);
  }

  asLogMetadata(): LogMetadata {
    return { requestId: this.requestId, latencyMs: this.latencyMs, code: this.code, reason: this.reason };
  }

  asDataObject(): IDataObject {
    return { requestId: this.requestId, latencyMs: this.latencyMs, code: this.code, reason: this.reason, details: this.details };
  }

  asError(node: INode): NodeOperationError {
    return new NodeOperationError(node, this.reason, { description: this.details });
  }
}
```

## Coverage Mapping

### Lines to Cover
- **Line 43**: `this.requestId = request.requestId` - Request ID copy
- **Line 45**: `this.latencyMs = Date.now() - request.requestedAt` - Latency calculation
- **Line 46**: `this.code = code` - Code assignment
- **Line 47**: `this.reason = reason` - Reason assignment
- **Line 50**: asLogMetadata abstract declaration (via concrete implementation)
- **Line 51**: asDataObject abstract declaration (via concrete implementation)
- **Line 57**: asError abstract declaration (via concrete implementation)
- **Line 65**: `return this.code === 429 || (this.code >= 500 && this.code < 600)` - Retry logic

### Branches to Cover
- **Line 65 - Branch 1**: `this.code === 429` (true path)
- **Line 65 - Branch 2**: `this.code === 429` (false path) AND `this.code >= 500` (true path)
- **Line 65 - Branch 3**: `this.code === 429` (false path) AND `this.code >= 500` (true path) AND `this.code < 600` (true path)
- **Line 65 - Branch 4**: All conditions false (non-retryable)

### Uncovered Scenarios
- None expected - all branches covered by test cases

## Expected Coverage Metrics
- **Lines**: 100% (6 executable lines)
- **Statements**: 100% (5 assignments + 1 return)
- **Functions**: 100% (constructor + isRetryable + abstract methods via test implementation)
- **Branches**: 100% (isRetryable conditions)

## Test Fixtures

### Sample Data
```typescript
const MOCK_REQUEST_ID = 'test-request-uuid-001';
const MOCK_REQUEST_TIMESTAMP = 1704412800000; // 2025-01-05 00:00:00 UTC
const MOCK_ERROR_TIMESTAMP_100 = 1704412800100; // +100ms latency
const MOCK_ERROR_TIMESTAMP_1000 = 1704412801000; // +1000ms latency

// HTTP Status Codes
const CODE_RATE_LIMIT = 429;
const CODE_SERVER_ERROR = 500;
const CODE_BAD_GATEWAY = 502;
const CODE_SERVICE_UNAVAILABLE = 503;
const CODE_GATEWAY_TIMEOUT = 504;
const CODE_BAD_REQUEST = 400;
const CODE_UNAUTHORIZED = 401;
const CODE_FORBIDDEN = 403;
const CODE_NOT_FOUND = 404;
const CODE_BOUNDARY_499 = 499;
const CODE_BOUNDARY_599 = 599;
const CODE_BOUNDARY_600 = 600;
```

## Implementation Notes

1. **Abstract Class Testing**: Create concrete test implementation that extends SupplyErrorBase
2. **Mock Cleanup**: Restore Date.now after each test
3. **Retry Logic Testing**: Test all branches of isRetryable() method
4. **Boundary Testing**: Test edge cases around 500-599 range (499, 500, 599, 600)
5. **HTTP Status Codes**: Cover common retryable (429, 5xx) and non-retryable (4xx) codes
6. **Request Correlation**: Verify requestId and latency propagate correctly
7. **Interface Compliance**: Verify ITraceable and IDataProvider contracts are satisfied
8. **Error Conversion**: Test asError() method returns proper NodeOperationError

## Risk Assessment

### Low Risk
- Simple constructor logic
- Well-defined retry logic with clear conditions
- Standard HTTP status code patterns

### Medium Risk
- Retry logic correctness is critical for system reliability
- Boundary conditions (499, 500, 599, 600) must be tested thoroughly

### Mitigation
- Test all HTTP status code categories (4xx, 429, 5xx, others)
- Test boundary values explicitly
- Verify latency calculation consistency with SupplyResponseBase pattern
- Test error conversion to NodeOperationError
