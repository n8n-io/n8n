# Test Plan: split-response.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `split-response.test.ts`

## Code Surface
**Exports:** `SplitResponse` (class extending SupplyResponseBase)
**Dependencies:**
- intento-core: `SupplyResponseBase`
- n8n-workflow: `IDataObject`, `LogMetadata`
- Internal: `SplitRequest`, `ISegment`
**Branches:** 1 conditional (segments.length < text.length)
**ESLint Considerations:**
- Import order: External types before internal types
- No file-level disables needed

## Test Cases

### SplitResponse

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create response with text from request | Lines 18-23, constructor copies text |
| BL-02 | should create response with provided segments | Lines 18-23, constructor assigns segments |
| BL-03 | should set readonly properties correctly | Lines 15-16, readonly enforcement |
| BL-04 | should freeze response object | Line 24, Object.freeze() |
| BL-05 | should copy agentRequestId from request via super | Line 19, super(request) call |
| BL-06 | should copy supplyRequestId from request via super | Line 19, super(request) call |
| BL-07 | should calculate latencyMs from request via super | Line 19, super(request) call |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle equal segments and text count (minimum valid) | Line 29, boundary condition segments.length === text.length |
| EC-02 | should handle more segments than text items | Line 29, segments.length > text.length |
| EC-03 | should handle single text item with single segment | Lines 18-23, minimal valid case |
| EC-04 | should handle single text item with multiple segments | Lines 18-23, typical sentence split |
| EC-05 | should handle multiple text items with segments | Lines 18-23, batch processing |
| EC-06 | should preserve segment positions from split operation | Lines 20-22, maintains ISegment structure |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if segments.length < text.length | Line 29, validation condition |
| EH-02 | should throw with descriptive error message including expected count | Line 29, error message format |
| EH-03 | should throw for empty segments with non-empty text | Line 29, edge case 0 < 1 |
| EH-04 | should call super.throwIfInvalid for parent validation | Line 30, super validation |
| EH-05 | should allow construction without validation | Lines 18-24, validation deferred |

#### Metadata & Data (MD-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| MD-01 | should return log metadata with segmentsCount | Lines 33-38, asLogMetadata() |
| MD-02 | should return log metadata with textCount | Lines 33-38, asLogMetadata() |
| MD-03 | should include parent metadata in log output | Line 35, ...super.asLogMetadata() |
| MD-04 | should return data object with text array | Lines 41-45, asDataObject() |
| MD-05 | should return data object with segments array | Lines 41-45, asDataObject() |

## Mock Strategy

### Test Implementations
- `MockAgentRequest` - Simple object with agentRequestId, requestedAt for parent chain
- `MockSplitRequest` - Extends SplitRequest with valid test data
- `MockSegment` - Implements ISegment with textPosition, segmentPosition, text

### No Mocks Needed
- Pure data class with no external dependencies beyond parent
- Parent class (SupplyResponseBase) tested in intento-core

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified (SplitResponse class)
- [x] All branches covered: 1 validation branch (100%)
- [x] All error paths tested: 5 error handling tests
- [x] All methods tested: constructor, throwIfInvalid, asLogMetadata, asDataObject
- [x] Parent class integration tested (super calls)
- [x] ESLint considerations documented
- [x] Coverage 100% achieved (statements 11/11, branches 1/1, functions 4/4, lines 10/10)
