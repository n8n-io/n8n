# Test Plan: supply-response.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-response.test.ts`

## 1. Code Analysis

### Exports
- `SupplyResponse` class - Base class for supply operation responses

### Code Paths
- Constructor: Lines 15-19 (request ID propagation, latency calculation)
- `asLogMetadata()`: Lines 21-26 (return LogMetadata object)
- `asDataObject()`: Lines 28-33 (return IDataObject)

### Branches
- None (straight-line code)

### Edge Cases
- Timing accuracy: latency calculation depends on Date.now() precision
- Immutability: readonly properties should not be modifiable
- Inheritance: subclasses extend this class and call super()
- Interface compliance: implements ITraceable and IDataProvider

### Dependencies to Mock
- `SupplyRequest` - mock object with requestId and requestedAt
- `Date.now()` - mock for deterministic timing tests

## 2. Test Cases

### BL-XX: Business Logic (Happy Paths)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| BL-01 | should create response with request ID from request | Line 16, requestId propagation | HIGH |
| BL-02 | should calculate latency from request creation time | Line 18, latency calculation | HIGH |
| BL-03 | should return log metadata with requestId and latency | Lines 22-25 | HIGH |
| BL-04 | should return data object with requestId and latency | Lines 29-32 | HIGH |
| BL-05 | should preserve request ID as readonly property | Line 12, immutability | MEDIUM |
| BL-06 | should preserve latency as readonly property | Line 13, immutability | MEDIUM |

### EC-XX: Edge Cases (Boundaries & Unusual Inputs)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EC-01 | should calculate zero latency when created immediately | Line 18, edge case | MEDIUM |
| EC-02 | should handle large latency values (hours/days) | Line 18, boundary | LOW |
| EC-03 | should implement ITraceable interface correctly | Type checking | MEDIUM |
| EC-04 | should implement IDataProvider interface correctly | Type checking | MEDIUM |

### EH-XX: Error Handling (Validation & Failures)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EH-01 | should not allow requestId modification after creation | Line 12, readonly enforcement | MEDIUM |
| EH-02 | should not allow latencyMs modification after creation | Line 13, readonly enforcement | MEDIUM |

## 3. Mock Strategy

### SupplyRequest Mock
```typescript
const mockRequest = {
  requestId: 'test-request-id-123',
  requestedAt: 1000000000000, // Fixed timestamp
};
```

### Date.now() Mock
```typescript
jest.spyOn(Date, 'now').mockReturnValue(1000000001500); // 1500ms later
```

## 4. Test Structure

```
describe('SupplyResponse')
├── describe('business logic')
│   ├── [BL-01] request ID propagation
│   ├── [BL-02] latency calculation
│   ├── [BL-03] log metadata format
│   ├── [BL-04] data object format
│   ├── [BL-05] requestId immutability
│   └── [BL-06] latencyMs immutability
├── describe('edge cases')
│   ├── [EC-01] zero latency
│   ├── [EC-02] large latency values
│   ├── [EC-03] ITraceable interface
│   └── [EC-04] IDataProvider interface
└── describe('error handling')
    ├── [EH-01] requestId readonly
    └── [EH-02] latencyMs readonly

```

## 5. Coverage Goals

**Line Coverage:** 100% (all 19 lines)
**Branch Coverage:** 100% (no branches)
**Function Coverage:** 100% (constructor + 2 methods)
**Statement Coverage:** 100%

## 6. Implementation Notes

- Use `jest.spyOn(Date, 'now')` for deterministic timing tests
- Test readonly enforcement with TypeScript type checking
- Verify interface implementations return correct types
- Test base class behavior that subclasses depend on
- Mock SupplyRequest with minimal required properties

## 7. Risk Assessment

**High Risk Areas:**
- Latency calculation timing (must be accurate for tracing)
- Request ID propagation (critical for tracing chain)

**Medium Risk Areas:**
- Interface contract compliance (affects all consumers)
- Readonly property enforcement (prevents bugs in subclasses)

**Low Risk Areas:**
- Simple object transformations (straightforward logic)
