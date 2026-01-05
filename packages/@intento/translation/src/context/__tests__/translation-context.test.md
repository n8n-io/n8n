# Test Plan: translation-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** 100% all metrics
**Test File:** `translation-context.test.ts`

## Code Surface

**Exports:**
- `TranslationContext` class (IContext implementation)
- `CONTEXT_TRANSLATION` constant (INodeProperties array)

**Dependencies:**
- `intento-core` - `IContext` interface, `mapTo` decorator
- `n8n-workflow` - `INodeProperties` type
- `supply/translation-request` - `TranslationRequest` class
- No external APIs, DB, or I/O (pure logic)

**Branches:**
- Constructor: None (simple assignment)
- `throwIfInvalid()`: 2 conditions (to is undefined OR to.trim() is empty)
- `toRequest()`: Creates TranslationRequest (no branches)

**ESLint Considerations:**
- Minimal ESLint issues expected (pure TS, no unsafe operations)
- Test frozen object with type assertion for property modification
- CONTEXT_TRANSLATION property access needs type assertions for deep property access
- Mock TranslationRequest if needed for toRequest() tests

## Test Cases

### TranslationContext Class

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create context with all parameters | Constructor with from, to, text |
| BL-02 | should create context without from language (auto-detect) | Constructor with undefined from |
| BL-03 | should freeze instance after construction | Object.freeze() call in constructor |
| BL-04 | should validate successfully with target language | throwIfInvalid() passes with valid to |
| BL-05 | should return correct log metadata with from language | asLogMetadata() with from set |
| BL-06 | should return correct log metadata without from language | asLogMetadata() with from undefined |
| BL-07 | should convert to TranslationRequest with all parameters | toRequest() with from, to, text |
| BL-08 | should convert to TranslationRequest without from language | toRequest() with undefined from |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle whitespace-only target language | throwIfInvalid() with to.trim() === '' |
| EC-02 | should handle target language with surrounding whitespace | Valid to with spaces |
| EC-03 | should handle empty from language | from as empty string |
| EC-04 | should handle empty text | text as empty string (valid case) |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when target language is undefined | throwIfInvalid() with to === undefined |
| EH-02 | should throw when target language is empty string | throwIfInvalid() with to === '' |
| EH-03 | should throw when target language is only whitespace | throwIfInvalid() with to === '   ' |

### CONTEXT_TRANSLATION Node Properties

#### Node Properties (NP-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| NP-01 | should export from language property with correct configuration | CONTEXT_TRANSLATION[0] structure |
| NP-02 | should export to language property with correct configuration | CONTEXT_TRANSLATION[1] structure |
| NP-03 | should have to language marked as required | required: true |
| NP-04 | should export text property with correct configuration | CONTEXT_TRANSLATION[2] structure |
| NP-05 | should export exactly three properties | Array length verification |

## Coverage Analysis

**Lines of executable code:** ~70 lines
**Expected test count:** 18 tests
**Coverage areas:**
- Constructor + Object.freeze: 3 tests (BL-01 to BL-03)
- throwIfInvalid() method: 5 tests (BL-04, EC-01, EH-01 to EH-03)
- asLogMetadata() method: 2 tests (BL-05, BL-06)
- toRequest() method: 2 tests (BL-07, BL-08)
- Edge cases: 4 tests (EC-01 to EC-04)
- CONTEXT_TRANSLATION constant: 5 tests (NP-01 to NP-05)

**Branch coverage:**
- throwIfInvalid() conditions: Both branches covered (undefined and trim() === '')
- All validation paths tested

**Error path coverage:**
- All error messages in throwIfInvalid() tested
- All validation conditions tested (undefined, empty, whitespace-only)

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (TranslationContext, CONTEXT_TRANSLATION)
- [x] All branches covered (100% - both validation conditions)
- [x] All error paths tested (all throw statements covered)
- [x] ESLint considerations documented (minimal issues expected)
- [x] Coverage 100% target for all metrics
- [x] Node properties configuration validated (3 properties)
- [x] Frozen object immutability verified
- [x] TranslationRequest conversion tested

## Implementation Notes

1. **Auto-detection:** from parameter is optional, undefined means auto-detect
2. **Frozen object:** Use type assertion to test that property modification throws
3. **Type assertions:** CONTEXT_TRANSLATION properties need casting for deep property access
4. **No mocking needed:** TranslationRequest is a simple value object, test real instantiation
5. **Deterministic tests:** All tests are fully deterministic
6. **Whitespace handling:** Test trim() logic for target language validation
7. **Empty strings:** Empty text is valid (no validation), empty to is invalid
8. **Log metadata:** Only includes from/to, not text (sensitive data consideration)
