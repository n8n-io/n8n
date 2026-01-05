# Test Plan: translation-request.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** 100% all metrics
**Test File:** `translation-request.test.ts`

## Code Surface

**Exports:**
- `TranslationRequest` class (extends SupplyRequestBase)

**Dependencies:**
- `intento-core` - `SupplyRequestBase` base class
- `n8n-workflow` - `LogMetadata`, `INodeExecutionData` types
- No external APIs, DB, or I/O (pure logic)

**Branches:**
- Constructor: Calls throwIfInvalid() + Object.freeze()
- `throwIfInvalid()`: 2 conditions (!this.to OR this.to.trim() === '')
- `asLogMetadata()`: None (returns object literal)
- `asExecutionData()`: None (returns structured data)
- `clone()`: None (creates new instance)

**ESLint Considerations:**
- Test frozen object with type assertion
- Test protected method throwIfInvalid() via constructor
- Verify base class inheritance (requestId, requestedAt)

## Test Cases

### TranslationRequest Class

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create request with all parameters | Constructor with from, to, text |
| BL-02 | should create request without from language | Constructor with undefined from |
| BL-03 | should inherit requestId from base class | SupplyRequestBase.requestId assignment |
| BL-04 | should inherit requestedAt from base class | SupplyRequestBase.requestedAt assignment |
| BL-05 | should freeze instance after construction | Object.freeze() call in constructor |
| BL-06 | should validate successfully with valid target language | throwIfInvalid() passes |
| BL-07 | should return correct log metadata | asLogMetadata() with all fields |
| BL-08 | should return log metadata without from language | asLogMetadata() with undefined from |
| BL-09 | should return execution data with all fields | asExecutionData() structure |
| BL-10 | should return execution data without from language | asExecutionData() with undefined from |
| BL-11 | should clone request with all parameters | clone() creates identical request |
| BL-12 | should clone request without from language | clone() with undefined from |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty text | text as empty string (valid) |
| EC-02 | should handle target language with surrounding whitespace | Valid to with spaces |
| EC-03 | should handle empty from language | from as empty string |
| EC-04 | should create independent clone | Clone is separate instance |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when target language is undefined | throwIfInvalid() with !this.to |
| EH-02 | should throw when target language is null | throwIfInvalid() with null |
| EH-03 | should throw when target language is empty string | throwIfInvalid() with to === '' |
| EH-04 | should throw when target language is only whitespace | throwIfInvalid() with to.trim() === '' |
| EH-05 | should throw immediately on construction with invalid target | Constructor validation |

## Coverage Analysis

**Lines of executable code:** ~60 lines
**Expected test count:** 21 tests
**Coverage areas:**
- Constructor + validation + freeze: 5 tests (BL-01 to BL-05, EH-01 to EH-05)
- Base class inheritance: 2 tests (BL-03, BL-04)
- throwIfInvalid() method: 6 tests (BL-06, EH-01 to EH-05)
- asLogMetadata() method: 2 tests (BL-07, BL-08)
- asExecutionData() method: 2 tests (BL-09, BL-10)
- clone() method: 2 tests (BL-11, BL-12)
- Edge cases: 4 tests (EC-01 to EC-04)

**Branch coverage:**
- throwIfInvalid() conditions: Both branches covered (!this.to and trim() === '')
- All validation paths tested

**Error path coverage:**
- All error messages in throwIfInvalid() tested
- Constructor validation tested (throws during construction)

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (TranslationRequest)
- [x] All branches covered (100% - both validation conditions)
- [x] All error paths tested (all throw statements covered)
- [x] ESLint considerations documented
- [x] Coverage 100% target for all metrics
- [x] Frozen object immutability verified
- [x] Base class inheritance verified
- [x] Clone creates independent instance

## Implementation Notes

1. **Auto-detection:** from parameter is optional, undefined means auto-detect
2. **Frozen object:** Use type assertion to test that property modification throws
3. **Protected method:** throwIfInvalid() tested via constructor (throws on invalid data)
4. **Base class:** Verify requestId and requestedAt inherited from SupplyRequestBase
5. **Deterministic tests:** All tests are fully deterministic
6. **Whitespace handling:** Test trim() logic for target language validation
7. **Empty strings:** Empty text is valid, empty to is invalid
8. **Log metadata:** Excludes text content (sensitive data) but includes in execution data
9. **Clone independence:** Cloned object is frozen separately and has same requestId
