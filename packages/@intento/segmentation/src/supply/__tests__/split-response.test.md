# Test Plan: split-response.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `split-response.test.ts`

## Code Surface
**Exports:** SplitResponse (class)
**Dependencies:**
- SupplyResponseBase (base class from intento-core)
- SplitRequest (supply/split-request)
- ISegment (types/i-segment)
- Text type (string | string[])

**Branches:**
- Constructor: 1 (throwIfInvalid call)
- throwIfInvalid: 2 (Array.isArray check, segments.length < minSize)
- asLogMetadata: 1 (Array.isArray check)
- asDataObject: 0

**ESLint Considerations:**
- No eslint-disable comments needed (no unsafe operations)
- Import order: external (intento-core, n8n-workflow) → types → implementation
- Type safety: All types properly defined, no any usage

## Test Cases

### SplitResponse

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create response with single text string | Constructor, text assignment, segments assignment |
| BL-02 | should create response with text array | Constructor with array Text type |
| BL-03 | should freeze response object after construction | Object.freeze() verification |
| BL-04 | should inherit from SupplyResponseBase | super(request) call, base class properties |
| BL-05 | should include segments and text count in log metadata | asLogMetadata() with both single and array text |
| BL-06 | should include segments and text in data object | asDataObject() return structure |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty string in text array | Empty text item handling |
| EC-02 | should handle single segment for single text | Minimum valid case: 1 text → 1 segment |
| EC-03 | should handle multiple segments per text item | Valid case: 1 text → N segments |
| EC-04 | should calculate text count as 1 for string type | asLogMetadata when text is string |
| EC-05 | should calculate text count from array length | asLogMetadata when text is array |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if segments empty for single text | throwIfInvalid: segments.length < 1 |
| EH-02 | should throw if segments fewer than text array items | throwIfInvalid: segments.length < text.length |
| EH-03 | should include expected count in error message | Error message validation |
| EH-04 | should throw before freezing object | Validation order: throwIfInvalid → freeze |

## Mock Strategy

**SplitRequest mock:**
- Mock text property (string or string[])
- Mock segmentLimit, from properties
- Use mock<SplitRequest>() from jest-mock-extended

**ISegment fixtures:**
- Create sample segments with textPosition, segmentPosition, text
- Test with various segment counts and positions

**SupplyResponseBase:**
- No mocking needed (real inheritance test)
- Verify super() call via base class methods

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (SplitResponse class)
- [x] All branches covered (Array.isArray, validation condition)
- [x] All error paths tested (throwIfInvalid scenarios)
- [x] ESLint considerations documented (no disables needed)
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Constructor validation logic fully tested
- [x] Both Text types tested (string and string[])
- [x] Object immutability verified (Object.freeze)
- [x] Inheritance from SupplyResponseBase verified
