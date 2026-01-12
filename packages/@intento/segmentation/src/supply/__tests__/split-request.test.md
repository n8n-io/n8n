# Test Plan: split-request.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `split-request.test.ts`

## Code Surface
**Exports:** SplitRequest (class)
**Dependencies:**
- SupplyRequestBase (base class from intento-core)
- Text type (string | string[] from intento-core)
- LogMetadata, IDataObject (n8n-workflow)

**Branches:**
- Constructor: 1 (throwIfInvalid call)
- throwIfInvalid: 1 (segmentLimit <= 0 check)
- asLogMetadata: 1 (text.length property access)
- asDataObject: 0

**ESLint Considerations:**
- No eslint-disable comments needed (no unsafe operations)
- Import order: external (intento-core, n8n-workflow) → types → implementation
- Type safety: All types properly defined, no any usage

## Test Cases

### SplitRequest

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create request with single text string | Constructor with string Text type |
| BL-02 | should create request with text array | Constructor with string[] Text type |
| BL-03 | should create request with all parameters including from | Constructor with optional from parameter |
| BL-04 | should create request without from parameter | Constructor with from omitted |
| BL-05 | should freeze request object after construction | Object.freeze() verification |
| BL-06 | should inherit from SupplyRequestBase | super() call, requestId, requestedAt properties |
| BL-07 | should include text count in log metadata | asLogMetadata() with text.length |
| BL-08 | should include all fields in data object | asDataObject() return structure |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle segmentLimit of 1 | Minimum valid segmentLimit |
| EC-02 | should handle large segmentLimit | Large valid integer (e.g., 10000) |
| EC-03 | should handle empty text array | text.length = 0 for array type |
| EC-04 | should handle single character text string | text.length = 1 for string type |
| EC-05 | should preserve from parameter value | from parameter passthrough |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if segmentLimit is zero | throwIfInvalid: segmentLimit <= 0, boundary at 0 |
| EH-02 | should throw if segmentLimit is negative | throwIfInvalid: segmentLimit < 0 |
| EH-03 | should throw if segmentLimit is decimal | throwIfInvalid: segmentLimit not integer (e.g., 1.5) |
| EH-04 | should include descriptive error message | Error message: "must be more than zero" |
| EH-05 | should throw before freezing object | Validation order: throwIfInvalid → freeze |

## Mock Strategy

**No external mocks needed:**
- SplitRequest is concrete class with no dependencies
- SupplyRequestBase is real base class (test inheritance)
- Text type is union type (string | string[]) - test both branches

**Test data:**
- Single string: "Hello world"
- Text array: ["First text", "Second text"]
- Various segmentLimit values: 0, -1, 1, 1.5, 100, 10000
- Optional from parameter: undefined, "en", "es"

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (SplitRequest class)
- [x] All branches covered (segmentLimit validation, text.length access)
- [x] All error paths tested (zero, negative, decimal segmentLimit)
- [x] ESLint considerations documented (no disables needed)
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Constructor validation logic fully tested
- [x] Both Text types tested (string and string[])
- [x] Object immutability verified (Object.freeze)
- [x] Inheritance from SupplyRequestBase verified
- [x] All validation edge cases covered (0, negative, decimal)
