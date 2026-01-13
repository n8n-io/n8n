# Test Plan: merge-response.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `merge-response.test.ts`

## Code Surface
**Exports:** `MergeResponse` class
**Dependencies:**
- `intento-core`: SupplyResponseBase (need mock for request)
- `n8n-workflow`: LogMetadata, IDataObject (types only)
- `supply/merge-request`: MergeRequest (need mock)
- `types/*`: ISegment interface (type only)
**Branches:** 3 conditionals
- Line 32: `segments.length === 0` check
- Line 33: `text.length === 0` check
- Line 35: `text.length !== textCount + 1` check
- Line 34: `Math.max()` calculation with textPosition
- `Object.freeze()` on line 28 (immutability enforcement)
**ESLint Considerations:**
- Need proper mock for MergeRequest extending SupplyRequestBase
- Type assertions for test-specific constructs

## Test Cases

### MergeResponse

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create response with text and segments | Constructor lines 22-28 |
| BL-02 | should inherit agentRequestId and supplyRequestId | Line 23 super(request) |
| BL-03 | should calculate latency from request timestamp | Parent class behavior |
| BL-04 | should copy segments from request | Line 26 segments assignment |
| BL-05 | should set text property correctly | Line 25 text assignment |
| BL-06 | should freeze object after construction | Line 28 Object.freeze() |
| BL-07 | should validate response after setting properties | Constructor flow |
| BL-08 | should include segmentsCount in log metadata | Lines 39-44 asLogMetadata |
| BL-09 | should include textCount in log metadata | Lines 39-44 asLogMetadata |
| BL-10 | should return segments and text in data object | Lines 45-49 asDataObject |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle single text item with single segment | Minimum valid: textPosition=0 |
| EC-02 | should handle multiple text items correctly | textCount calculation with max textPosition |
| EC-03 | should handle textPosition=0 (first item) | Boundary: lowest valid textPosition |
| EC-04 | should handle high textPosition values | Boundary: textCount = max(textPosition) + 1 |
| EC-05 | should handle multiple segments for same textPosition | Valid: same textPosition, different segmentPosition |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if segments array is empty | Line 32 validation |
| EH-02 | should throw with correct message for empty segments | Error message validation |
| EH-03 | should throw if text array is empty | Line 33 validation |
| EH-04 | should throw with correct message for empty text | Error message validation |
| EH-05 | should throw if text length doesn't match textCount | Line 35 validation |
| EH-06 | should throw with correct message showing expected count | Error message includes textCount + 1 |
| EH-07 | should call super.throwIfInvalid for parent validation | Line 36 super call |

#### Metadata & Data (MD-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| MD-01 | should return parent metadata fields in asLogMetadata | super.asLogMetadata() spread |
| MD-02 | should return correct IDataObject structure | Lines 45-49 structure |
| MD-03 | should preserve segment references in asDataObject | Segments not cloned |

## Coverage Strategy

**Lines to cover:**
- Line 22: Constructor entry
- Line 23: super(request) call
- Line 25: text assignment
- Line 26: segments assignment
- Line 27: throwIfInvalid call
- Line 28: Object.freeze
- Lines 32-36: All validation conditions and super call
- Lines 39-44: asLogMetadata implementation
- Lines 45-49: asDataObject implementation

**Branches to cover:**
- Line 32: segments.length === 0 (true/false)
- Line 33: text.length === 0 (true/false)
- Line 35: text.length !== textCount + 1 (true/false)

**Expected Coverage:** 100% statements, 100% branches, 100% functions, 100% lines
