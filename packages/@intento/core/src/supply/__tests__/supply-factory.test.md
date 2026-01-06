# Test Plan: supply-factory.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-06
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-factory.test.ts`

## Code Analysis

### Exports
- `SupplyFactory` class with static method `getSuppliers<T>`

### Method Signature
```typescript
static async getSuppliers<T>(
  functions: IFunctions,
  connectionType: IntentoConnectionType,
  tracer: Tracer
): Promise<T[]>
```

### Method Logic Flow
1. **Line 52**: Log debug message "Getting suppliers..."
2. **Line 56**: Call `functions.getInputConnectionData()` with connectionType cast to AINodeConnectionType
3. **Lines 58-63**: If result is array → log count, map to type T, reverse, and return
4. **Lines 65-68**: If result is truthy (single value) → log "1 supplier", wrap in array, return
5. **Lines 70-71**: If result is falsy (null/undefined) → log warning, return empty array

### Dependencies to Mock
- `IFunctions` - Mock `getInputConnectionData()` method
- `Tracer` - Mock `debug()` and `warn()` methods
- `IntentoConnectionType` / `AINodeConnectionType` - Use string literals for testing

### Branches to Cover
- **Array result**: data is Array (line 58)
- **Single result**: data is truthy but not Array (line 65)
- **Empty result**: data is falsy (line 70)

### Edge Cases
- Empty array (length 0)
- Single-element array
- Multi-element array (verify reversal)
- Single non-array object
- null result
- undefined result
- Different connection types
- Generic type casting

## Test Case Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should retrieve multiple suppliers as reversed array | Lines 58-63, array branch with reversal |
| BL-02 | should wrap single supplier in array | Lines 65-68, single value branch |
| BL-03 | should return empty array when no suppliers found | Lines 70-71, empty branch |
| BL-04 | should call getInputConnectionData with correct parameters | Line 56, API call |
| BL-05 | should log debug message when starting retrieval | Line 52, initial log |
| BL-06 | should log debug with supplier count for array result | Line 60, array count log |
| BL-07 | should log debug for single supplier result | Line 67, single supplier log |
| BL-08 | should log warning when no suppliers found | Line 71, warning log |
| BL-09 | should cast connectionType to AINodeConnectionType | Line 56, type cast |
| BL-10 | should apply generic type T to returned suppliers | Type casting verification |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty array (length 0) | Array branch with no elements |
| EC-02 | should handle single-element array | Array branch with 1 element |
| EC-03 | should reverse array with 2 elements correctly | Verify reversal [A, B] → [B, A] |
| EC-04 | should reverse array with 3+ elements correctly | Verify reversal [A, B, C] → [C, B, A] |
| EC-05 | should handle null result as empty | Falsy branch with null |
| EC-06 | should handle undefined result as empty | Falsy branch with undefined |
| EC-07 | should handle different connection types | Various connectionType values |
| EC-08 | should preserve supplier object properties after reversal | Data integrity check |
| EC-09 | should handle supplier objects with complex types | Generic type flexibility |

### Integration Scenarios

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| INT-01 | should retrieve translation suppliers in reverse order | Real-world translation scenario |
| INT-02 | should retrieve AI model suppliers with proper logging | AI model connection type |
| INT-03 | should handle workflow with no connected suppliers gracefully | Empty connection scenario |

## Mock Strategy

### IFunctions Mock
```typescript
const mockFunctions = {
  getInputConnectionData: jest.fn(),
  // other methods not needed for SupplyFactory
} as unknown as IFunctions;
```

### Tracer Mock
```typescript
const mockTracer = {
  debug: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  bugDetected: jest.fn(),
} as unknown as Tracer;
```

### Supplier Test Data
```typescript
interface TestSupplier {
  id: string;
  name: string;
  type: string;
}

const SUPPLIER_A: TestSupplier = { id: 'sup-a', name: 'Supplier A', type: 'translation' };
const SUPPLIER_B: TestSupplier = { id: 'sup-b', name: 'Supplier B', type: 'translation' };
const SUPPLIER_C: TestSupplier = { id: 'sup-c', name: 'Supplier C', type: 'translation' };
```

## Coverage Mapping

### Lines to Cover
- **Line 52**: Initial debug log
- **Line 56**: getInputConnectionData call with type cast
- **Lines 58-63**: Array branch (if check, debug log, map, reverse, return)
- **Lines 65-68**: Single value branch (if check, debug log, array wrap, return)
- **Lines 70-71**: Empty branch (warn log, return empty array)

### Branches to Cover
1. **Array branch** (line 58): `Array.isArray(data) === true`
2. **Single branch** (line 65): `data` is truthy but not array
3. **Empty branch** (line 70): `data` is falsy (null/undefined/false)

### Functions to Cover
- `getSuppliers` static method (100%)

## Expected Coverage Metrics

- **Lines**: 100% (20 executable lines)
- **Statements**: 100% (all assignments, calls, returns)
- **Functions**: 100% (1 static method)
- **Branches**: 100% (3 conditional branches)

## Test Data Structures

### Connection Type Values
```typescript
const CONNECTION_TYPES = {
  translation: 'intento-translation' as IntentoConnectionType,
  aiModel: 'ai-model' as IntentoConnectionType,
  custom: 'custom-supplier' as IntentoConnectionType,
};
```

### getInputConnectionData Return Values

**Scenario 1: Multiple Suppliers (Array)**
```typescript
mockFunctions.getInputConnectionData.mockResolvedValue([
  { id: 'sup-1', name: 'First' },
  { id: 'sup-2', name: 'Second' },
  { id: 'sup-3', name: 'Third' },
]);
// Expected result: [Third, Second, First] (reversed)
```

**Scenario 2: Single Supplier (Object)**
```typescript
mockFunctions.getInputConnectionData.mockResolvedValue(
  { id: 'sup-1', name: 'Only' }
);
// Expected result: [{ id: 'sup-1', name: 'Only' }] (wrapped)
```

**Scenario 3: No Suppliers (null/undefined)**
```typescript
mockFunctions.getInputConnectionData.mockResolvedValue(null);
// Expected result: []
```

**Scenario 4: Empty Array**
```typescript
mockFunctions.getInputConnectionData.mockResolvedValue([]);
// Expected result: [] (reversed empty array)
```

## Implementation Notes

### Test Organization
```typescript
describe('SupplyFactory', () => {
  describe('getSuppliers', () => {
    describe('multiple suppliers (array)', () => {
      // BL-01, EC-01 to EC-04, EC-08
    });

    describe('single supplier (object)', () => {
      // BL-02, BL-07
    });

    describe('no suppliers (empty)', () => {
      // BL-03, BL-08, EC-05, EC-06
    });

    describe('logging', () => {
      // BL-05, BL-06, BL-07, BL-08
    });

    describe('API integration', () => {
      // BL-04, BL-09, EC-07
    });

    describe('type handling', () => {
      // BL-10, EC-09
    });

    describe('integration scenarios', () => {
      // INT-01 to INT-03
    });
  });
});
```

### Setup and Teardown
```typescript
beforeEach(() => {
  mockFunctions = { getInputConnectionData: jest.fn() } as unknown as IFunctions;
  mockTracer = {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as unknown as Tracer;
});

afterEach(() => {
  jest.clearAllMocks();
});
```

### Key Testing Patterns

1. **Array Reversal Verification**:
```typescript
const result = await SupplyFactory.getSuppliers(mockFunctions, connectionType, mockTracer);
expect(result[0]).toEqual(suppliers[suppliers.length - 1]); // Last becomes first
expect(result[result.length - 1]).toEqual(suppliers[0]); // First becomes last
```

2. **Logging Verification**:
```typescript
expect(mockTracer.debug).toHaveBeenCalledWith(
  expect.stringContaining("Getting 'translation' suppliers")
);
expect(mockTracer.debug).toHaveBeenCalledWith(
  expect.stringContaining("Retrieved 3 suppliers")
);
```

3. **Generic Type Handling**:
```typescript
interface CustomSupplier { custom: string; }
const result = await SupplyFactory.getSuppliers<CustomSupplier>(...);
expect(result[0]).toHaveProperty('custom');
```

## Special Considerations

### Array Reversal Logic
- **WHY**: Last-connected supplier should be tried first (fallback priority)
- **TEST**: Verify [A, B, C] becomes [C, B, A]
- **EDGE**: Single element array [A] remains [A] after reversal
- **EDGE**: Empty array [] remains [] after reversal

### Type Casting
- **IntentoConnectionType → AINodeConnectionType**: Required for n8n API compatibility
- Test with various connection type strings to ensure cast works correctly

### Async Behavior
- Method is async due to `getInputConnectionData` being async
- All tests must use `await` and handle Promises correctly

### Logging Verification
- Verify exact log messages with connection type interpolation
- Verify log levels (debug for success, warn for empty)
- Verify log call counts match expectations

## Risk Assessment

### Low Risk
- Simple static method
- Clear branching logic (array/single/empty)
- No complex dependencies

### Medium Risk
- Array reversal must be tested thoroughly (order is critical)
- Generic type handling needs validation
- Async behavior requires proper Promise handling

### Mitigation
- Test array reversal with multiple sizes (0, 1, 2, 3+ elements)
- Test various generic types (simple objects, complex interfaces)
- Verify all three branches (array, single, empty) are covered
- Mock IFunctions to control return values precisely
- Verify logging at each branch for debugging support
