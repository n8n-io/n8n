# Test Plan: translation-response.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** 100% all metrics
**Test File:** `translation-response.test.ts`

## Code Surface

**Exports:**
- `TranslationResponse` class (extends SupplyResponseBase)

**Dependencies:**
- `intento-core` - `SupplyResponseBase` base class
- `n8n-workflow` - `LogMetadata`, `INodeExecutionData` types
- `supply/translation-request` - `TranslationRequest` class
- No external APIs, DB, or I/O (pure logic)

**Branches:**
- Constructor: None (simple assignment + super call)
- `asLogMetadata()`: None (returns object literal)
- `asExecutionData()`: None (returns structured data)

**ESLint Considerations:**
- Need TranslationRequest for constructor tests
- Verify base class inheritance (requestId, latencyMs)
- Type imports to avoid unsafe operations

## Test Cases

### TranslationResponse Class

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create response with all request parameters and translation | Constructor with from, to, text, translation |
| BL-02 | should create response without from language (auto-detect scenario) | Constructor with undefined from |
| BL-03 | should create response with detected language | Constructor with detectedLanguage when from undefined |
| BL-04 | should not set detected language when from is specified | detectedLanguage optional when from exists |
| BL-05 | should inherit requestId from base class | SupplyResponseBase.requestId from request |
| BL-06 | should inherit latencyMs from base class | SupplyResponseBase.latencyMs calculation |
| BL-07 | should return correct log metadata with all fields | asLogMetadata() with from and detectedLanguage |
| BL-08 | should return log metadata without from language | asLogMetadata() with undefined from |
| BL-09 | should return log metadata with detected language | asLogMetadata() includes detectedLanguage |
| BL-10 | should return execution data with all fields | asExecutionData() structure |
| BL-11 | should return execution data without from language | asExecutionData() with undefined from |
| BL-12 | should return execution data with detected language | asExecutionData() includes detectedLanguage |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty original text | text as empty string |
| EC-02 | should handle empty translation | translation as empty string |
| EC-03 | should handle empty detected language | detectedLanguage as empty string |
| EC-04 | should preserve multi-line text in translation | Newlines in text/translation |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should preserve all request context in response | Request data consistency |
| EH-02 | should include translation in execution data but not log metadata | Sensitive data handling |

## Coverage Analysis

**Lines of executable code:** ~40 lines
**Expected test count:** 18 tests
**Coverage areas:**
- Constructor: 6 tests (BL-01 to BL-06)
- Base class inheritance: 2 tests (BL-05, BL-06)
- asLogMetadata() method: 3 tests (BL-07 to BL-09)
- asExecutionData() method: 3 tests (BL-10 to BL-12)
- Edge cases: 4 tests (EC-01 to EC-04)
- Error handling: 2 tests (EH-01, EH-02)

**Branch coverage:**
- No branches in implementation (all methods are straightforward assignments/returns)
- All methods tested with different parameter combinations

**Error path coverage:**
- Constructor doesn't throw (validates upstream)
- Test data integrity across all output methods

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (TranslationResponse)
- [x] All branches covered (100% - no branches in implementation)
- [x] All methods tested (constructor, asLogMetadata, asExecutionData)
- [x] ESLint considerations documented (mocking needs)
- [x] Coverage 100% target for all metrics
- [x] Base class inheritance verified
- [x] Detected language handling tested
- [x] Log metadata excludes sensitive data (text/translation)

## Implementation Notes

1. **Request dependency:** Need to create TranslationRequest instances for constructor
2. **Base class:** Verify requestId and latencyMs inherited from SupplyResponseBase
3. **Deterministic tests:** All tests are fully deterministic
4. **Auto-detection:** detectedLanguage is relevant only when from is undefined
5. **Log metadata:** Excludes text and translation (sensitive data) but includes in execution data
6. **Execution data structure:** Returns nested array format for n8n
7. **Data integrity:** Response preserves all original request context
