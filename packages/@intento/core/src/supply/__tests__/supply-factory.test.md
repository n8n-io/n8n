# Test Plan: supply-factory.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-factory.test.ts`

## 1. Code Analysis

### Exports
- `SupplyFactory` class - Static factory for retrieving suppliers from connections

### Code Paths
- `getSuppliers()`: Lines 24-41 (retrieves suppliers from connection data)
  - Branch 1: Array data (Lines 29-32) - multiple suppliers, reversed
  - Branch 2: Single data (Lines 34-37) - single supplier, wrapped in array
  - Branch 3: No data (Lines 39-40) - empty array

### Branches
- Line 29: `if (Array.isArray(data))` - handles multiple suppliers
- Line 34: `if (data)` - handles single supplier
- Line 39-40: implicit else - handles no suppliers

### Edge Cases
- Empty array vs no data (truthy empty array vs falsy null/undefined)
- Single item vs array with one item
- Reverse order logic (RTL to LTR conversion)
- Type casting with generics
- Multiple suppliers order verification

### Dependencies to Mock
- `IFunctions` - mock with `getInputConnectionData()` method
- `Tracer` - mock with `debug()` and `warn()` methods
- Connection data return values (array, single, null/undefined)

## 2. Test Cases

### BL-XX: Business Logic (Happy Paths)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| BL-01 | should return empty array when no suppliers connected | Lines 39-40, no data branch | HIGH |
| BL-02 | should return single supplier wrapped in array | Lines 34-37, single data branch | HIGH |
| BL-03 | should return multiple suppliers in reversed order | Lines 29-32, array branch | HIGH |
| BL-04 | should log debug message when retrieving suppliers | Line 25, initial log | MEDIUM |
| BL-05 | should log debug with count for multiple suppliers | Line 30, array log | MEDIUM |
| BL-06 | should log debug for single supplier | Line 35, single log | MEDIUM |
| BL-07 | should log warning when no suppliers found | Line 39, warning log | MEDIUM |

### EC-XX: Edge Cases (Boundaries & Unusual Inputs)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EC-01 | should handle empty array as no suppliers | Line 29, empty array check | HIGH |
| EC-02 | should reverse order correctly (RTL to LTR) | Line 31, reverse logic | HIGH |
| EC-03 | should handle array with one supplier | Lines 29-32, single item array | MEDIUM |
| EC-04 | should handle different connection types | Line 24, parameter | MEDIUM |
| EC-05 | should preserve supplier type through generic | Line 31, type casting | MEDIUM |
| EC-06 | should handle null data as no suppliers | Lines 34, 39, falsy check | MEDIUM |
| EC-07 | should handle undefined data as no suppliers | Lines 34, 39, falsy check | MEDIUM |

### EH-XX: Error Handling (Validation & Failures)

| ID | Test Name | Coverage Target | Priority |
|----|-----------|-----------------|----------|
| EH-01 | should handle getInputConnectionData throwing error | Line 27, async error | MEDIUM |
| EH-02 | should verify tracer methods are called correctly | Lines 25, 30, 35, 39 | MEDIUM |

## 3. Mock Strategy

### IFunctions Mock
```typescript
const mockFunctions = {
  getInputConnectionData: jest.fn(),
};
```

### Tracer Mock
```typescript
const mockTracer = {
  debug: jest.fn(),
  warn: jest.fn(),
};
```

### Test Suppliers
```typescript
interface TestSupplier {
  id: string;
  name: string;
}

const supplier1 = { id: '1', name: 'Supplier 1' };
const supplier2 = { id: '2', name: 'Supplier 2' };
const supplier3 = { id: '3', name: 'Supplier 3' };
```

## 4. Test Structure

```
describe('SupplyFactory')
├── describe('getSuppliers')
│   ├── describe('business logic')
│   │   ├── [BL-01] no suppliers (empty array)
│   │   ├── [BL-02] single supplier
│   │   ├── [BL-03] multiple suppliers reversed
│   │   ├── [BL-04] initial debug log
│   │   ├── [BL-05] multiple suppliers log
│   │   ├── [BL-06] single supplier log
│   │   └── [BL-07] no suppliers warning
│   ├── describe('edge cases')
│   │   ├── [EC-01] empty array
│   │   ├── [EC-02] reverse order (RTL to LTR)
│   │   ├── [EC-03] array with one supplier
│   │   ├── [EC-04] different connection types
│   │   ├── [EC-05] type preservation
│   │   ├── [EC-06] null data
│   │   └── [EC-07] undefined data
│   └── describe('error handling')
│       ├── [EH-01] connection data error
│       └── [EH-02] tracer method calls
```

## 5. Coverage Goals

**Line Coverage:** 100% (all lines)
**Branch Coverage:** 100% (all 3 branches)
**Function Coverage:** 100% (getSuppliers method)
**Statement Coverage:** 100%

## 6. Implementation Notes

- Mock `getInputConnectionData()` to return array, single item, or null/undefined
- Mock tracer methods to verify logging behavior
- Test reverse order by checking array indices match expected order
- Verify RTL to LTR conversion: `[A, B, C]` becomes `[C, B, A]`
- Test with different generic types (interfaces, classes)
- Use `jest.fn()` for all mocks to track calls
- Verify tracer logging includes connection type in messages

## 7. Risk Assessment

**High Risk Areas:**
- Reverse order logic (must correctly convert RTL to LTR)
- Branch logic (array vs single vs none must be correct)
- Empty array handling (falsy vs truthy empty array)

**Medium Risk Areas:**
- Type casting safety (generics must preserve types)
- Tracer logging (messages must be helpful for debugging)
- Connection type parameter (must work with all types)

**Low Risk Areas:**
- Static method structure (straightforward factory pattern)
