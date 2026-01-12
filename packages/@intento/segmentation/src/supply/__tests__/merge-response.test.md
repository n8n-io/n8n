# Test Plan: merge-response.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `merge-response.test.ts`

## Code Surface
**Exports:** MergeResponse (class)
**Dependencies:**
- SupplyResponseBase (base class from intento-core)
- MergeRequest (supply/merge-request)
- ISegment (types/i-segment)

**Branches:**
- Constructor: 1 (throwIfInvalid call)
- throwIfInvalid: 2 (empty segments check, text.length validation)
- asLogMetadata: 0
- asDataObject: 0

**ESLint Considerations:**
- No eslint-disable comments needed (no unsafe operations)
- Import order: external (intento-core, n8n-workflow) → types → implementation
- Type safety: All types properly defined, no any usage

## Test Cases

### MergeResponse

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create response with merged text array | Constructor, text assignment, segments assignment |
| BL-02 | should create response with single text item | Constructor with single merged text |
| BL-03 | should create response with multiple text items | Constructor with multiple merged texts |
| BL-04 | should freeze response object after construction | Object.freeze() verification |
| BL-05 | should inherit from SupplyResponseBase | super(request) call, base class properties |
| BL-06 | should include segments and text count in log metadata | asLogMetadata() return structure |
| BL-07 | should include segments and text in data object | asDataObject() return structure |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty segments and empty text | Empty case: segments.length = 0, text.length = 0 |
| EC-02 | should handle single segment (textPosition 0) | Minimum valid case: 1 segment → 1 text |
| EC-03 | should handle segments with gaps in textPosition | textPosition: [0, 2] → expects 3 texts |
| EC-04 | should handle multiple segments with same textPosition | Multiple segments merged into one text item |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if text length less than expected | throwIfInvalid: text.length < maxTextPosition + 1 |
| EH-02 | should throw if text length more than expected | throwIfInvalid: text.length > maxTextPosition + 1 |
| EH-03 | should throw if non-empty segments but empty text | Mismatch: segments exist, text empty |
| EH-04 | should include expected count in error message | Error message format validation |
| EH-05 | should throw before freezing object | Validation order: throwIfInvalid → freeze |

## Mock Strategy

**MergeRequest mock:**
- Mock segments property (ISegment[])
- Use mock<MergeRequest>() from jest-mock-extended
- Create WritableMergeRequest utility type for readonly property assignment

**ISegment fixtures:**
- Create sample segments with textPosition, segmentPosition, text
- Test with various textPosition patterns: [0], [0,1], [0,2], [0,0,1]

**Text array:**
- Test with various lengths matching/mismatching segment textPositions
- Empty array, single item, multiple items

**SupplyResponseBase:**
- No mocking needed (real inheritance test)
- Verify super() call via base class methods

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (MergeResponse class)
- [x] All branches covered (empty check, validation condition)
- [x] All error paths tested (throwIfInvalid scenarios)
- [x] ESLint considerations documented (no disables needed)
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Constructor validation logic fully tested
- [x] textPosition + 1 logic verified (zero-based index)
- [x] Object immutability verified (Object.freeze)
- [x] Inheritance from SupplyResponseBase verified
- [x] Edge cases covered (empty, gaps, same textPosition)
