# Test Plan: translation-error.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** 100% all metrics
**Test File:** `translation-error.test.ts`

## Code Surface

**Exports:**
- `TranslationError` class (extends SupplyErrorBase)

**Dependencies:**
- `intento-core` - `SupplyErrorBase` base class
- `n8n-workflow` - `LogMetadata`, `INodeExecutionData`, `INode`, `NodeOperationError` types
- `supply/translation-request` - `TranslationRequest` class
- No external APIs, DB, or I/O (pure logic)

**Branches:**
- Constructor: None (simple assignment + super call)
- `asLogMetadata()`: None (returns object literal)
- `asExecutionData()`: None (returns structured data)
- `asError()`: None (creates NodeOperationError)

**ESLint Considerations:**
- Mock TranslationRequest for constructor tests
- Mock INode for asError() tests
- Test frozen object with type assertion
- Use proper type imports to avoid unsafe operations

## Test Cases

### TranslationError Class

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create error with all request parameters | Constructor with from, to, text |
| BL-02 | should create error without from language | Constructor with undefined from |
| BL-03 | should inherit requestId from base class | SupplyErrorBase.requestId assignment |
| BL-04 | should inherit latencyMs from base class | SupplyErrorBase.latencyMs calculation |
| BL-05 | should freeze instance after construction | Object.freeze() call in constructor |
| BL-06 | should return correct log metadata | asLogMetadata() with all fields |
| BL-07 | should return log metadata without from language | asLogMetadata() with undefined from |
| BL-08 | should return execution data with all fields | asExecutionData() structure |
| BL-09 | should return execution data without from language | asExecutionData() with undefined from |
| BL-10 | should create NodeOperationError with correct message | asError() message formatting |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty text in error | text as empty string |
| EC-02 | should handle error code 0 | code as 0 |
| EC-03 | should handle large error codes | code as 999 |
| EC-04 | should handle empty error reason | reason as empty string |
| EC-05 | should handle multi-line error reason | reason with newlines |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should preserve error code in all outputs | code consistency across methods |
| EH-02 | should preserve error reason in all outputs | reason consistency across methods |
| EH-03 | should format error message with code and reason | Message format verification |

## Coverage Analysis

**Lines of executable code:** ~50 lines
**Expected test count:** 18 tests
**Coverage areas:**
- Constructor + Object.freeze: 5 tests (BL-01 to BL-05)
- asLogMetadata() method: 2 tests (BL-06, BL-07)
- asExecutionData() method: 2 tests (BL-08, BL-09)
- asError() method: 1 test (BL-10)
- Edge cases: 5 tests (EC-01 to EC-05)
- Error handling: 3 tests (EH-01 to EH-03)

**Branch coverage:**
- No branches in implementation (all methods are straightforward assignments/returns)
- All methods tested with different parameter combinations

**Error path coverage:**
- Constructor doesn't throw (validates upstream in TranslationRequest)
- Test data integrity and immutability

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (TranslationError)
- [x] All branches covered (100% - no branches in implementation)
- [x] All methods tested (constructor, asLogMetadata, asExecutionData, asError)
- [x] ESLint considerations documented (mocking needs)
- [x] Coverage 100% target for all metrics
- [x] Frozen object immutability verified
- [x] Base class inheritance verified
- [x] NodeOperationError creation tested

## Implementation Notes

1. **Mocking:** Need to create mock TranslationRequest and INode objects
2. **Frozen object:** Use type assertion to test that property modification throws
3. **Base class:** Verify requestId and latencyMs inherited from SupplyErrorBase
4. **No mocking needed:** TranslationRequest is a simple value object, create real instances
5. **Deterministic tests:** All tests are fully deterministic
6. **Log metadata:** Excludes text content (sensitive data) but includes in execution data
7. **Error message format:** Tests specific message template with emoji
8. **Execution data structure:** Returns nested array format for n8n
