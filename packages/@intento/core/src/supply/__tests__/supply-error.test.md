# Test Plan: supply-error.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-error.test.ts`

## 1. Code Analysis

### Exports
- `SupplyError` class - Structured error for supply operations

### Code Paths
- Constructor: Lines 27-34 (request ID propagation, latency calculation, error properties)
- `asLogMetadata()`: Lines 36-44 (return LogMetadata with error details)
- `asDataObject()`: Lines 46-52 (return IDataObject without requestId)
- `asError()`: Lines 60-62 (convert to NodeOperationError)

### Branches
- None (straight-line code)

### Edge Cases
- Error code handling: Various error codes (HTTP status, custom codes)
- Retriable vs non-retriable errors: Boolean flag affects retry logic
- Latency calculation: Time to failure measurement
- NodeOperationError conversion: Integration with n8n error system
- Request ID propagation: Tracing through error path

### Dependencies to Mock
- `SupplyRequestBase` - mock request with requestId and requestedAt
- `Date.now()` - mock for deterministic latency tests
- `INode` - mock n8n node for asError() method

## 2. Test Cases

### BL-XX: Business Logic (Happy Paths)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| BL-01 | should create error with request ID from request | Line 28, ID propagation | HIGH |
| BL-02 | should calculate latency from request to error | Line 30, latency calculation | HIGH |
| BL-03 | should store error code and reason | Lines 31-32, error properties | HIGH |
| BL-04 | should store retriable flag | Line 33, retry logic flag | HIGH |
| BL-05 | should return log metadata with all error details | Lines 37-43 | HIGH |
| BL-06 | should return data object without requestId | Lines 47-51 | HIGH |
| BL-07 | should convert to NodeOperationError with reason | Lines 60-62 | HIGH |

### EC-XX: Edge Cases (Boundaries & Unusual Inputs)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EC-01 | should handle zero latency when error occurs immediately | Line 30, edge case | MEDIUM |
| EC-02 | should handle large latency values | Line 30, boundary | LOW |
| EC-03 | should handle HTTP status error codes (4xx, 5xx) | Line 31, common codes | MEDIUM |
| EC-04 | should handle custom error codes | Line 31, non-HTTP codes | MEDIUM |
| EC-05 | should handle very long error reasons | Line 32, string length | LOW |
| EC-06 | should implement ITraceable interface correctly | Type checking | MEDIUM |
| EC-07 | should implement IDataProvider interface correctly | Type checking | MEDIUM |
| EC-08 | should create retriable and non-retriable errors | Line 33, both states | HIGH |

### EH-XX: Error Handling (Validation & Failures)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EH-01 | should handle negative error codes | Line 31, invalid codes | MEDIUM |
| EH-02 | should handle zero error code | Line 31, edge case | LOW |
| EH-03 | should handle empty reason string | Line 32, empty input | MEDIUM |

## 3. Mock Strategy

### SupplyRequestBase Mock
```typescript
const mockRequest = {
  requestId: 'test-request-id-123',
  requestedAt: 1000000000000,
} as SupplyRequestBase;
```

### Date.now() Mock
```typescript
jest.spyOn(Date, 'now').mockReturnValue(1000000001500); // 1500ms later
```

### INode Mock
```typescript
const mockNode = {
  id: 'node-123',
  name: 'Test Node',
  type: 'n8n-nodes-base.testNode',
  typeVersion: 1,
  position: [0, 0],
  parameters: {},
} as INode;
```

## 4. Test Structure

```
describe('SupplyError')
├── describe('business logic')
│   ├── [BL-01] request ID propagation
│   ├── [BL-02] latency calculation
│   ├── [BL-03] error code and reason storage
│   ├── [BL-04] retriable flag storage
│   ├── [BL-05] log metadata format
│   ├── [BL-06] data object format (no requestId)
│   └── [BL-07] NodeOperationError conversion
├── describe('edge cases')
│   ├── [EC-01] zero latency
│   ├── [EC-02] large latency values
│   ├── [EC-03] HTTP status codes
│   ├── [EC-04] custom error codes
│   ├── [EC-05] long error reasons
│   ├── [EC-06] ITraceable interface
│   ├── [EC-07] IDataProvider interface
│   └── [EC-08] retriable vs non-retriable
└── describe('error handling')
    ├── [EH-01] negative error codes
    ├── [EH-02] zero error code
    └── [EH-03] empty reason string
```

## 5. Coverage Goals

**Line Coverage:** 100% (all lines)
**Branch Coverage:** 100% (no branches)
**Function Coverage:** 100% (constructor + 3 methods)
**Statement Coverage:** 100%

## 6. Implementation Notes

- Use `jest.spyOn(Date, 'now')` for deterministic timing tests
- Mock `SupplyRequestBase` with minimal required properties
- Mock `INode` for `asError()` method testing
- Test both retriable (true) and non-retriable (false) error scenarios
- Verify `asDataObject()` excludes `requestId` (security consideration)
- Test various error code ranges (HTTP 4xx, 5xx, custom codes)
- Verify `asError()` creates proper NodeOperationError with reason

## 7. Risk Assessment

**High Risk Areas:**
- Request ID propagation (critical for error tracing)
- Retriable flag (affects retry logic and workflow behavior)
- Latency calculation (must be accurate for monitoring)

**Medium Risk Areas:**
- NodeOperationError conversion (affects n8n error display)
- Log metadata completeness (affects debugging)
- Data object format (affects error reporting)

**Low Risk Areas:**
- Error code/reason storage (straightforward assignment)
