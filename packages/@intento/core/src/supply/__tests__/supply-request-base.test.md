# Test Plan: supply-request-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-request-base.test.ts`

## Code Analysis

### Exports
- `SupplyRequestBase` (abstract class) - implements `ITraceable`, `IDataProvider`

### Properties
- `requestId: string` (readonly) - Generated via `crypto.randomUUID()`
- `requestedAt: number` (readonly) - Timestamp from `Date.now()`

### Constructor Logic
- Lines 42-45: Generates UUID and captures timestamp
- No parameters
- No branches or conditionals

### Abstract Methods (Must be tested via concrete implementation)
- `asLogMetadata(): LogMetadata` - Line 47
- `asDataObject(): IDataObject` - Line 48
- `clone(): this` - Line 54

### Dependencies to Mock
- `crypto.randomUUID()` - For predictable requestId testing
- `Date.now()` - For predictable timestamp testing

### Edge Cases
- Multiple instances should have unique requestIds
- Timestamps should be monotonically increasing across instances
- Abstract methods must be implemented by subclasses

## Test Case Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should generate unique requestId using crypto.randomUUID | Line 43, constructor UUID generation |
| BL-02 | should capture timestamp at construction using Date.now | Line 45, constructor timestamp capture |
| BL-03 | should implement ITraceable interface with requestId | Interface contract validation |
| BL-04 | should implement IDataProvider interface | Interface contract validation |
| BL-05 | should create multiple instances with unique requestIds | UUID uniqueness guarantee |
| BL-06 | should capture sequential timestamps for multiple instances | Timestamp ordering |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle rapid instantiation (same millisecond) | Timestamp collision scenario |
| EC-02 | should preserve requestId immutability | Readonly property validation |
| EC-03 | should preserve requestedAt immutability | Readonly property validation |
| EC-04 | should require concrete implementation of asLogMetadata | Abstract method enforcement |
| EC-05 | should require concrete implementation of asDataObject | Abstract method enforcement |
| EC-06 | should require concrete implementation of clone | Abstract method enforcement |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when attempting to instantiate abstract class directly | TypeScript abstract enforcement |

## Mock Strategy

### Mocked Dependencies
```typescript
// Mock crypto.randomUUID for predictable IDs
const mockRandomUUID = jest.spyOn(crypto, 'randomUUID');
mockRandomUUID.mockReturnValue('test-uuid-123');

// Mock Date.now for predictable timestamps
const mockDateNow = jest.spyOn(Date, 'now');
mockDateNow.mockReturnValue(1704412800000); // Fixed timestamp
```

### Test Double Pattern
```typescript
// Concrete implementation for testing abstract class
class TestRequest extends SupplyRequestBase {
  constructor(private readonly data: string) {
    super();
  }

  asLogMetadata(): LogMetadata {
    return { requestId: this.requestId, data: this.data };
  }

  asDataObject(): IDataObject {
    return { requestId: this.requestId, data: this.data };
  }

  clone(): this {
    return new TestRequest(this.data) as this;
  }
}
```

## Coverage Mapping

### Lines to Cover
- **Lines 42-45**: Constructor (UUID generation, timestamp capture)
- **Line 47**: asLogMetadata abstract declaration (via concrete implementation)
- **Line 48**: asDataObject abstract declaration (via concrete implementation)
- **Line 54**: clone abstract declaration (via concrete implementation)

### Branches to Cover
- No explicit branches in SupplyRequestBase (abstract class with simple constructor)
- Coverage achieved through concrete implementation tests

### Uncovered Scenarios
- None expected - simple abstract base class with straightforward constructor logic

## Expected Coverage Metrics
- **Lines**: 100% (4 executable lines in constructor)
- **Statements**: 100% (UUID generation + timestamp assignment)
- **Functions**: 100% (constructor + abstract methods via test implementation)
- **Branches**: N/A (no conditional logic)

## Test Fixtures

### Sample Data
```typescript
const MOCK_UUID_1 = 'test-uuid-001';
const MOCK_UUID_2 = 'test-uuid-002';
const MOCK_TIMESTAMP_1 = 1704412800000; // 2025-01-05 00:00:00 UTC
const MOCK_TIMESTAMP_2 = 1704412801000; // 2025-01-05 00:00:01 UTC
```

## Implementation Notes

1. **Abstract Class Testing**: Create concrete test implementation that extends SupplyRequestBase
2. **Mock Cleanup**: Restore crypto.randomUUID and Date.now after each test
3. **UUID Uniqueness**: Test both mocked (predictable) and actual UUID generation
4. **Immutability**: Verify readonly properties cannot be reassigned (TypeScript compile-time check)
5. **Interface Compliance**: Verify ITraceable and IDataProvider contracts are satisfied
6. **Clone Pattern**: Test that clone() creates new instance with fresh UUID and timestamp

## Risk Assessment

### Low Risk
- Simple constructor logic
- No complex branching
- Well-defined abstract methods

### Mitigation
- Test both mocked and unmocked UUID/timestamp generation
- Verify abstract method contracts through concrete implementation
- Ensure readonly properties are properly enforced
