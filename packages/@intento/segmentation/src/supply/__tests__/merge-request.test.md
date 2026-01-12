# Test Plan: merge-request.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `merge-request.test.ts`

## Code Surface
**Exports:** MergeRequest (class)
**Dependencies:**
- SupplyRequestBase (base class from intento-core)
- ISegment (types/i-segment)
- LogMetadata, IDataObject (n8n-workflow)

**Branches:**
- Constructor: 0 (no validation logic)
- asLogMetadata: 0
- asDataObject: 0

**ESLint Considerations:**
- No eslint-disable comments needed (no unsafe operations)
- Import order: external (intento-core, n8n-workflow) → types → implementation
- Type safety: All types properly defined, no any usage

## Test Cases

### MergeRequest

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create request with segments array | Constructor with ISegment[] |
| BL-02 | should create request with single segment | Constructor with single segment |
| BL-03 | should create request with multiple segments | Constructor with multiple segments |
| BL-04 | should freeze request object after construction | Object.freeze() verification |
| BL-05 | should inherit from SupplyRequestBase | super() call, requestId, latencyMs properties |
| BL-06 | should include segments count in log metadata | asLogMetadata() with segments.length |
| BL-07 | should include segments in data object | asDataObject() return structure |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty segments array | Constructor with empty array |
| EC-02 | should handle segments with various textPositions | Segments with textPosition 0, 1, 2, etc. |
| EC-03 | should handle segments with same textPosition | Multiple segments for same text item |
| EC-04 | should preserve segment order | Segments array reference preserved |

## Mock Strategy

**No external mocks needed:**
- MergeRequest is concrete class with no dependencies
- SupplyRequestBase is real base class (test inheritance)
- ISegment is interface - use real objects

**Test data:**
- Single segment: [{ textPosition: 0, segmentPosition: 0, text: 'Test' }]
- Multiple segments: Various textPosition and segmentPosition combinations
- Empty segments: []
- Segments with same textPosition: [{ textPosition: 0, segmentPosition: 0 }, { textPosition: 0, segmentPosition: 1 }]

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (MergeRequest class)
- [x] All branches covered (no validation branches to test)
- [x] ESLint considerations documented (no disables needed)
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Constructor with various segment arrays tested
- [x] Object immutability verified (Object.freeze)
- [x] Inheritance from SupplyRequestBase verified
- [x] Edge cases covered (empty, multiple segments, same textPosition)
