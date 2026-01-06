# Test Plan: supply-error-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-06
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-error-base.test.ts`

## Code Analysis

### Exports
- `SupplyErrorBase` (abstract class) - implements `ITraceable`, `IDataProvider`

### Properties (all readonly)
- `requestId: string` - Copied from request
- `latencyMs: number` - Calculated from request.requestedAt to Date.now()
- `code: number` - Provider error code
- `reason: string` - Human-readable error message
- `isRetriable: boolean` - Retry eligibility flag

### Constructor Logic
- Line 56: Extract requestId from request
- Lines 57-59: Calculate latency from request.requestedAt to current time
- Lines 60-62: Assign code, reason, isRetriable from parameters
- **Dependencies**: `Date.now()` for latency calculation
- **Branches**: None (straightforward assignment)

### Abstract Methods (Must be tested via concrete implementation)
- `asLogMetadata(): LogMetadata` - Lines 64-72
- `asDataObject(): IDataObject` - Lines 74-83
- `asError(node: INode): NodeOperationError` - Lines 85-93

### Dependencies to Mock
- `Date.now()` - For predictable latency calculation
- `SupplyRequestBase` - Mock request with requestId and requestedAt
- `INode` - For asError() parameter in concrete implementation

### Edge Cases
- Latency calculation with various time differences
- Zero latency (same timestamp)
- Large latency values (long-running requests)
- Negative latency (clock skew - should not occur in practice)
- Property immutability
- Abstract method enforcement

## Test Case Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should extract requestId from supply request | Line 56, requestId assignment |
| BL-02 | should calculate latencyMs from request timestamp to current time | Lines 57-59, latency calculation |
| BL-03 | should assign code from constructor parameter | Line 60, code assignment |
| BL-04 | should assign reason from constructor parameter | Line 61, reason assignment |
| BL-05 | should assign isRetriable from constructor parameter | Line 62, isRetriable assignment |
| BL-06 | should implement ITraceable interface with requestId | Interface contract validation |
| BL-07 | should implement IDataProvider interface | Interface contract validation |
| BL-08 | should create error with all properties initialized | Full constructor coverage |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should calculate zero latency when instantiated at same timestamp | Edge case: latencyMs = 0 |
| EC-02 | should calculate latency for long-running request (large time diff) | Edge case: large latencyMs |
| EC-03 | should handle HTTP status codes (400, 500, etc.) | Common error codes |
| EC-04 | should handle API-specific error codes (custom ranges) | Provider-specific codes |
| EC-05 | should handle empty reason string | Edge case: empty error message |
| EC-06 | should handle long reason strings (verbose errors) | Edge case: large error message |
| EC-07 | should preserve requestId immutability | Readonly property validation |
| EC-08 | should preserve latencyMs immutability | Readonly property validation |
| EC-09 | should preserve code immutability | Readonly property validation |
| EC-10 | should preserve reason immutability | Readonly property validation |
| EC-11 | should preserve isRetriable immutability | Readonly property validation |
| EC-12 | should handle isRetriable true (transient errors) | Retry flag true case |
| EC-13 | should handle isRetriable false (permanent errors) | Retry flag false case |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should require concrete implementation of asLogMetadata | Abstract method enforcement |
| EH-02 | should require concrete implementation of asDataObject | Abstract method enforcement |
| EH-03 | should require concrete implementation of asError | Abstract method enforcement |

## Mock Strategy

### Mocked Dependencies

```typescript
// Mock Date.now for predictable latency calculation
const mockDateNow = jest.spyOn(Date, 'now');

// Mock SupplyRequestBase
const createMockRequest = (requestId: string, requestedAt: number): SupplyRequestBase => ({
  requestId,
  requestedAt,
  asLogMetadata: jest.fn(),
  asDataObject: jest.fn(),
  clone: jest.fn(),
});

// Mock INode for asError() testing
const mockNode: INode = {
  id: 'node-123',
  name: 'TestNode',
  type: 'n8n-nodes-base.test',
  typeVersion: 1,
  position: [100, 200],
  parameters: {},
};
```

### Test Double Pattern

```typescript
// Concrete implementation for testing abstract class
class TestError extends SupplyErrorBase {
  constructor(
    request: SupplyRequestBase,
    code: number,
    reason: string,
    isRetriable: boolean,
  ) {
    super(request, code, reason, isRetriable);
  }

  asLogMetadata(): LogMetadata {
    return {
      requestId: this.requestId,
      code: this.code,
      reason: this.reason,
      isRetriable: this.isRetriable,
      latencyMs: this.latencyMs,
    };
  }

  asDataObject(): IDataObject {
    return {
      requestId: this.requestId,
      error: this.reason,
      code: this.code,
      retriable: this.isRetriable,
    };
  }

  asError(node: INode): NodeOperationError {
    return new NodeOperationError(node, this.reason, {
      description: `Error code: ${this.code}`,
    });
  }
}
```

## Coverage Mapping

### Lines to Cover
- **Line 56**: `this.requestId = request.requestId;`
- **Lines 57-59**: Latency calculation with inline comment
- **Line 60**: `this.code = code;`
- **Line 61**: `this.reason = reason;`
- **Line 62**: `this.isRetriable = isRetriable;`
- **Lines 64-72**: asLogMetadata abstract declaration (via concrete implementation)
- **Lines 74-83**: asDataObject abstract declaration (via concrete implementation)
- **Lines 85-93**: asError abstract declaration (via concrete implementation)

### Branches to Cover
- No explicit branches in SupplyErrorBase (abstract class with simple constructor)
- Coverage achieved through concrete implementation tests

### Critical Paths
1. **Constructor path**: request → extract requestId → calculate latency → assign parameters
2. **Interface compliance**: ITraceable (requestId) + IDataProvider (abstract methods)
3. **Abstract method contracts**: Subclass must implement all three methods

## Expected Coverage Metrics

- **Lines**: 100% (5 executable lines in constructor)
- **Statements**: 100% (requestId extraction + latency calculation + 3 assignments)
- **Functions**: 100% (constructor + 3 abstract methods via test implementation)
- **Branches**: N/A (no conditional logic)

## Test Fixtures

### Sample Data

```typescript
// Timestamps for latency testing
const BASE_TIMESTAMP = 1704412800000; // 2025-01-05 00:00:00 UTC
const TIMESTAMP_PLUS_100MS = BASE_TIMESTAMP + 100;
const TIMESTAMP_PLUS_5000MS = BASE_TIMESTAMP + 5000;

// Request fixtures
const MOCK_REQUEST_ID = 'test-request-uuid-123';

// Error code fixtures
const HTTP_400_BAD_REQUEST = 400;
const HTTP_429_RATE_LIMIT = 429;
const HTTP_500_SERVER_ERROR = 500;
const CUSTOM_ERROR_CODE = 9999;

// Error reason fixtures
const RATE_LIMIT_REASON = 'Rate limit exceeded. Retry after 60 seconds.';
const AUTH_FAILURE_REASON = 'Invalid API key provided.';
const SERVER_ERROR_REASON = 'Internal server error. Please try again later.';
const EMPTY_REASON = '';
const LONG_REASON = 'A'.repeat(1000); // 1000 character error message

// Retry flag scenarios
const RETRIABLE = true;  // Rate limits, transient errors
const NON_RETRIABLE = false;  // Auth errors, invalid input
```

## Latency Calculation Test Scenarios

### Scenario 1: Zero Latency (Same Timestamp)
```typescript
// Request created at time T, error instantiated at time T
request.requestedAt = 1000;
Date.now() = 1000;
Expected latencyMs = 0;
```

### Scenario 2: Normal Latency (100ms)
```typescript
// Request created at time T, error instantiated at time T+100
request.requestedAt = 1000;
Date.now() = 1100;
Expected latencyMs = 100;
```

### Scenario 3: High Latency (5 seconds)
```typescript
// Request created at time T, error instantiated at time T+5000
request.requestedAt = 1000;
Date.now() = 6000;
Expected latencyMs = 5000;
```

### Scenario 4: Very High Latency (1 minute)
```typescript
// Request created at time T, error instantiated at time T+60000
request.requestedAt = 1000;
Date.now() = 61000;
Expected latencyMs = 60000;
```

## Implementation Notes

### Test Organization
```typescript
describe('SupplyErrorBase', () => {
  describe('constructor', () => {
    // BL-01 to BL-08: Property initialization and assignments
  });

  describe('latency calculation', () => {
    // BL-02, EC-01, EC-02: Various latency scenarios
  });

  describe('error codes and reasons', () => {
    // EC-03 to EC-06: Different code/reason combinations
  });

  describe('retry flag', () => {
    // EC-12, EC-13: Retriable vs non-retriable errors
  });

  describe('immutability', () => {
    // EC-07 to EC-11: Readonly property validation
  });

  describe('abstract method contracts', () => {
    // EH-01 to EH-03: Abstract method enforcement
  });

  describe('concrete implementation', () => {
    // Test asLogMetadata, asDataObject, asError via TestError class
  });
});
```

### Key Testing Patterns

1. **Arrange**: Create mock request with specific requestedAt, mock Date.now() for current time
2. **Act**: Instantiate TestError (concrete subclass)
3. **Assert**: Verify properties, latency calculation, abstract method implementations

### Mock Cleanup

```typescript
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
```

### Immutability Testing

```typescript
// TypeScript enforces readonly at compile-time, but verify at runtime
const error = new TestError(mockRequest, 500, 'Server error', true);
expect(Object.isFrozen(error)).toBe(false); // Properties are readonly, but object not frozen
expect(() => {
  (error as any).requestId = 'new-id'; // Should throw in strict mode
}).toThrow(); // Runtime immutability check
```

## Special Considerations

### Latency Calculation Formula
```
latencyMs = Date.now() - request.requestedAt
```

**Includes:**
- Network round-trip time
- Provider processing time
- Error handling time

**Excludes:**
- Time spent in retry queue
- Time before request instantiation

### Abstract Method Implementation Requirements

Subclasses must implement:
1. **asLogMetadata()**: Must include requestId, code, reason, isRetriable, latencyMs at minimum
2. **asDataObject()**: Should be user-facing, exclude internal debugging details
3. **asError()**: Must provide actionable guidance for workflow authors

## Risk Assessment

### Low Risk
- Simple constructor with direct assignments
- Well-defined latency calculation
- Clear abstract method contracts

### Medium Risk
- Latency depends on Date.now() accuracy (system clock)
- Abstract methods need proper implementation testing

### Mitigation
- Mock Date.now() for deterministic latency testing
- Test concrete implementation to verify abstract method contracts
- Test various latency scenarios (zero, normal, high)
- Verify property immutability at runtime
