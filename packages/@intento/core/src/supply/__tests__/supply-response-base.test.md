# Test Plan: supply-response-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-response-base.test.ts`

## Code Analysis

### Exports
- `SupplyResponseBase` (abstract class) - implements `ITraceable`, `IDataProvider`

### Properties
- `requestId: string` (readonly) - Copied from request
- `latencyMs: number` (readonly) - Calculated as `Date.now() - request.requestedAt`

### Constructor Logic
- Lines 34-37: Accepts `SupplyRequestBase` parameter
- Line 35: Copies requestId from request
- Line 37: Calculates latency from request timestamp to response creation

### Abstract Methods (Must be tested via concrete implementation)
- `asLogMetadata(): LogMetadata` - Line 40
- `asDataObject(): IDataObject` - Line 41

### Dependencies to Mock
- `Date.now()` - For predictable latency calculation testing
- `SupplyRequestBase` - Mock request objects with known timestamps

### Edge Cases
- Zero latency (same millisecond as request)
- Large latency values (multiple seconds/minutes)
- Negative latency (clock skew - should not occur but worth testing)
- Request ID propagation from request to response

## Test Case Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy requestId from request | Line 35, requestId assignment |
| BL-02 | should calculate latencyMs from request timestamp | Line 37, latency calculation |
| BL-03 | should implement ITraceable interface with requestId | Interface contract validation |
| BL-04 | should implement IDataProvider interface | Interface contract validation |
| BL-05 | should correlate response to originating request via requestId | Request-response correlation |
| BL-06 | should calculate positive latency for delayed response | Typical latency scenario |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle zero latency (same millisecond as request) | Immediate response scenario |
| EC-02 | should handle large latency values (seconds/minutes) | Long-running request scenario |
| EC-03 | should preserve requestId from request without modification | ID immutability |
| EC-04 | should require concrete implementation of asLogMetadata | Abstract method enforcement |
| EC-05 | should require concrete implementation of asDataObject | Abstract method enforcement |
| EC-06 | should create multiple responses with same requestId (retries) | Retry correlation |

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
  constructor(public readonly testRequestId: string, public readonly testRequestedAt: number) {
    super();
    // Override generated values with test values
    (this as any).requestId = testRequestId;
    (this as any).requestedAt = testRequestedAt;
  }

  asLogMetadata() { return {}; }
  asDataObject() { return {}; }
  clone() { return this; }
}
```

### Test Double Pattern
```typescript
// Concrete implementation for testing abstract class
class TestResponse extends SupplyResponseBase {
  constructor(request: SupplyRequestBase, private readonly data: string) {
    super(request);
  }

  asLogMetadata(): LogMetadata {
    return { requestId: this.requestId, latencyMs: this.latencyMs, data: this.data };
  }

  asDataObject(): IDataObject {
    return { requestId: this.requestId, latencyMs: this.latencyMs, data: this.data };
  }
}
```

## Coverage Mapping

### Lines to Cover
- **Line 35**: `this.requestId = request.requestId` - Request ID copy
- **Line 37**: `this.latencyMs = Date.now() - request.requestedAt` - Latency calculation
- **Line 40**: asLogMetadata abstract declaration (via concrete implementation)
- **Line 41**: asDataObject abstract declaration (via concrete implementation)

### Branches to Cover
- No explicit branches in SupplyResponseBase (abstract class with simple constructor)
- Coverage achieved through concrete implementation tests

### Uncovered Scenarios
- None expected - simple abstract base class with straightforward constructor logic

## Expected Coverage Metrics
- **Lines**: 100% (3 executable lines in constructor)
- **Statements**: 100% (requestId assignment + latency calculation)
- **Functions**: 100% (constructor + abstract methods via test implementation)
- **Branches**: N/A (no conditional logic)

## Test Fixtures

### Sample Data
```typescript
const MOCK_REQUEST_ID = 'test-request-uuid-001';
const MOCK_REQUEST_TIMESTAMP = 1704412800000; // 2025-01-05 00:00:00 UTC
const MOCK_RESPONSE_TIMESTAMP_1 = 1704412800100; // +100ms
const MOCK_RESPONSE_TIMESTAMP_2 = 1704412801000; // +1000ms (1 second)
const MOCK_RESPONSE_TIMESTAMP_ZERO = 1704412800000; // Same millisecond
```

## Implementation Notes

1. **Abstract Class Testing**: Create concrete test implementation that extends SupplyResponseBase
2. **Mock Cleanup**: Restore Date.now after each test
3. **Latency Calculation**: Test various time deltas (0ms, 100ms, 1000ms, etc.)
4. **Request Correlation**: Verify requestId propagates correctly from request to response
5. **Interface Compliance**: Verify ITraceable and IDataProvider contracts are satisfied
6. **Request Mocking**: Use mock SupplyRequestBase instances with predictable timestamps

## Risk Assessment

### Low Risk
- Simple constructor logic
- No complex branching
- Well-defined abstract methods
- Straightforward latency calculation

### Mitigation
- Test both mocked and unmocked Date.now() scenarios
- Verify latency calculation with various time deltas
- Ensure requestId correlation is preserved
- Test abstract method contracts through concrete implementation

## Latency Calculation Scenarios

### Test Cases
1. **Immediate Response** (0ms): Request and response in same millisecond
2. **Fast Response** (100ms): Typical API call latency
3. **Normal Response** (1000ms): Standard processing time
4. **Slow Response** (5000ms+): Long-running operations
5. **Multiple Responses**: Same request, different response times (retry scenarios)
