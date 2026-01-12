# Test Plan: supply-request-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-request-base.test.ts`

## 1. Code Analysis

### Exports
- `SupplyRequestBase` class - Abstract base class for supply requests

### Code Paths
- Constructor: Lines 16-19 (UUID generation, timestamp capture)
- `asLogMetadata()`: Lines 22-27 (return LogMetadata object)
- `asDataObject()`: Lines 29-34 (return IDataObject)

### Branches
- None (straight-line code)

### Edge Cases
- UUID generation: Must be unique across instances
- Timestamp capture: Must reflect construction time accurately
- Immutability: readonly properties should not be modifiable
- Inheritance: abstract class extended by domain-specific requests
- Interface compliance: implements ITraceable and IDataProvider

### Dependencies to Mock
- `crypto.randomUUID()` - mock for deterministic UUID generation
- `Date.now()` - mock for deterministic timestamp tests

## 2. Test Cases

### BL-XX: Business Logic (Happy Paths)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| BL-01 | should generate unique request ID using crypto.randomUUID | Line 17, UUID generation | HIGH |
| BL-02 | should capture timestamp at construction time | Line 19, timestamp capture | HIGH |
| BL-03 | should return log metadata with requestId and requestedAt | Lines 23-26 | HIGH |
| BL-04 | should return data object with requestId and requestedAt | Lines 30-33 | HIGH |
| BL-05 | should generate different IDs for multiple instances | UUID uniqueness | HIGH |
| BL-06 | should capture different timestamps for sequential constructions | Timestamp ordering | MEDIUM |

### EC-XX: Edge Cases (Boundaries & Unusual Inputs)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EC-01 | should generate valid UUID format (RFC 4122) | Line 17, format validation | MEDIUM |
| EC-02 | should implement ITraceable interface correctly | Type checking | MEDIUM |
| EC-03 | should implement IDataProvider interface correctly | Type checking | MEDIUM |
| EC-04 | should create instances with timestamps in chronological order | Timestamp logic | LOW |

### EH-XX: Error Handling (Validation & Failures)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EH-01 | should handle rapid successive instantiations | UUID/timestamp collision | MEDIUM |
| EH-02 | should maintain UUID format consistency across instances | UUID validation | LOW |

## 3. Mock Strategy

### crypto.randomUUID() Mock
```typescript
jest.spyOn(crypto, 'randomUUID')
  .mockReturnValueOnce('uuid-1')
  .mockReturnValueOnce('uuid-2');
```

### Date.now() Mock
```typescript
jest.spyOn(Date, 'now')
  .mockReturnValueOnce(1000000000000)
  .mockReturnValueOnce(1000000001000);
```

## 4. Test Structure

```
describe('SupplyRequestBase')
├── describe('business logic')
│   ├── [BL-01] UUID generation
│   ├── [BL-02] timestamp capture
│   ├── [BL-03] log metadata format
│   ├── [BL-04] data object format
│   ├── [BL-05] unique IDs across instances
│   └── [BL-06] different timestamps for sequential constructions
├── describe('edge cases')
│   ├── [EC-01] UUID format validation
│   ├── [EC-02] ITraceable interface
│   ├── [EC-03] IDataProvider interface
│   └── [EC-04] chronological timestamp ordering
└── describe('error handling')
    ├── [EH-01] rapid successive instantiations
    └── [EH-02] UUID format consistency

```

## 5. Coverage Goals

**Line Coverage:** 100% (all lines)
**Branch Coverage:** 100% (no branches)
**Function Coverage:** 100% (constructor + 2 methods)
**Statement Coverage:** 100%

## 6. Implementation Notes

- Use `jest.spyOn(crypto, 'randomUUID')` for controlled UUID generation
- Use `jest.spyOn(Date, 'now')` for deterministic timing tests
- Test abstract class by creating a concrete test implementation
- Verify UUID format matches RFC 4122 (8-4-4-4-12 pattern)
- Test interface implementations return correct types
- Test base class behavior that subclasses depend on

## 7. Risk Assessment

**High Risk Areas:**
- UUID uniqueness (critical for request tracing)
- Timestamp accuracy (affects latency calculations)

**Medium Risk Areas:**
- Interface contract compliance (affects all consumers)
- Abstract class instantiation (test via concrete subclass)

**Low Risk Areas:**
- Simple object transformations (straightforward logic)
