# Test Plan: supply-factory.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-factory.test.ts`

## Code Surface
**Exports:** `SupplyFactory` (static class with single method)
**Dependencies:**
- `AINodeConnectionType`, `IntentoConnectionType` (from n8n-workflow - types only)
- `Tracer` (for logging)
- `IFunctions` (for getInputConnectionData)

**Branches:** 2 conditionals (Array.isArray check, truthy data check)
**ESLint Considerations:**
- Type imports with `type` keyword
- Import order: external packages → types → local implementations
- Mock IFunctions.getInputConnectionData and Tracer methods
- Use jest-mock-extended for type-safe mocks

## Test Cases

### SupplyFactory.getSuppliers

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should retrieve multiple suppliers and return in LIFO order | Line 78-84, array case + reverse |
| BL-02 | should retrieve single supplier and wrap in array | Line 87-90, single object case |
| BL-03 | should return empty array when no suppliers connected | Line 93-95, null/undefined case |
| BL-04 | should log debug message when retrieving suppliers | Line 74, initial debug log |
| BL-05 | should log debug message with count for multiple suppliers | Line 80, array debug log |
| BL-06 | should log debug message for single supplier | Line 88, single supplier debug log |
| BL-07 | should log warning when no suppliers found | Line 94, warning log |
| BL-08 | should cast IntentoConnectionType to AINodeConnectionType | Line 77, type cast |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty array of suppliers | Array.isArray returns true but length 0 |
| EC-02 | should preserve order when only one supplier in array | Single-element array handling |
| EC-03 | should handle large number of suppliers | LIFO ordering verification with many items |
| EC-04 | should handle suppliers with complex nested data | Type casting with complex objects |
| EC-05 | should correctly reverse order: last connected becomes first | LIFO priority semantics |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should propagate errors from getInputConnectionData | Error handling from n8n API |
| EH-02 | should handle null data as no suppliers | Null vs undefined distinction |
| EH-03 | should handle undefined data as no suppliers | Undefined handling |

## Implementation Notes

### Test Strategy
Since `SupplyFactory` is a static class with a single static method, tests focus on:
- Mocking `IFunctions.getInputConnectionData` to return different data shapes
- Mocking `Tracer` to verify logging calls
- Testing LIFO ordering with multiple suppliers
- Verifying type assertions and edge cases

### Mock Strategy
```typescript
const mockFunctions = mock<IFunctions>();
const mockTracer = mock<Tracer>();

// Mock different return values:
// 1. Array: [supplier1, supplier2, supplier3]
// 2. Single object: supplier1
// 3. Null/undefined: no suppliers
```

### Coverage Focus
- Both branches (Array.isArray, truthy data check)
- LIFO ordering verification (reverse)
- All logging paths (debug x3, warn x1)
- Type casting validation
- Error propagation

### LIFO Testing
Verify reverse order:
```typescript
// Input: [s1, s2, s3] (s1 connected first, s3 connected last)
// Output: [s3, s2, s1] (s3 highest priority)
```

### Supplier Test Data
```typescript
interface TestSupplier {
  id: string;
  name: string;
  priority?: number;
}

const supplier1: TestSupplier = { id: '1', name: 'First' };
const supplier2: TestSupplier = { id: '2', name: 'Second' };
const supplier3: TestSupplier = { id: '3', name: 'Third' };
```

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All logging paths tested
- [x] ESLint considerations documented
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Mock strategy clearly documented
- [x] LIFO ordering verification approach defined
- [x] Error handling strategy documented
