# Test Plan: segments-supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `segments-supplier-base.test.ts`

## Code Surface
**Exports:** `SegmentsSupplierBase` abstract class
**Dependencies:**
- `intento-core`: SupplierBase, IDescriptor, IFunctions, SupplyError (need mocks)
- `n8n-workflow`: IntentoConnectionType (type only)
- `supply/merge-request`: MergeRequest (need instances)
- `supply/merge-response`: MergeResponse (constructed in executeMerge)
- `supply/split-request`: SplitRequest (need instances)
- `supply/split-response`: SplitResponse (type only, from executeSplit)
**Branches:** 3 conditionals
- Line 23: `signal.throwIfAborted()` check
- Line 24: `request instanceof SplitRequest` check
- Line 25: `request instanceof MergeRequest` check
- Line 27: `tracer.bugDetected()` fallthrough case
- Line 52: `signal.throwIfAborted()` check in executeMerge
- Lines 56-59: Sorting logic with two conditions
- Line 64: Ternary operator for text concatenation
**ESLint Considerations:**
- Need concrete test class extending SegmentsSupplierBase
- Mock IFunctions, IDescriptor, Tracer
- Need to test abstract executeSplit via concrete implementation

## Test Strategy

Since this is an abstract class, we need:
1. **Concrete test class** that extends SegmentsSupplierBase
2. **Mock executeSplit** implementation returning mock SplitResponse
3. Test **execute()** method routing logic (SplitRequest → executeSplit, MergeRequest → executeMerge)
4. Test **executeMerge()** default implementation thoroughly
5. Test **error paths** (unsupported request type, abort signal)

## Test Cases

### SegmentsSupplierBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should route SplitRequest to executeSplit | Line 24 instanceof check |
| BL-02 | should route MergeRequest to executeMerge | Line 25 instanceof check |
| BL-03 | should merge single segment into single text item | executeMerge basic path |
| BL-04 | should concatenate multiple segments with same textPosition | Line 64 concatenation logic |
| BL-05 | should preserve textPosition ordering when merging | Lines 56-59 sort logic |
| BL-06 | should preserve segmentPosition ordering within same text | Lines 56-59 sort second condition |
| BL-07 | should create MergeResponse with correct text array | Line 67 MergeResponse construction |
| BL-08 | should log debug message at merge start | Line 54 tracer.debug call |
| BL-09 | should log info message after successful merge | Line 69 tracer.info call |
| BL-10 | should use Map to group segments by textPosition | Lines 62-65 Map usage |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle segments with non-sequential textPosition | Gaps in textPosition (0, 2, 5) |
| EC-02 | should handle segments with high textPosition values | textPosition = 999 |
| EC-03 | should handle segments in unsorted order | Input: textPos 2,0,1 → Output: 0,1,2 |
| EC-04 | should handle mixed textPosition and segmentPosition order | Complex sorting scenario |
| EC-05 | should create correct number of text items from Map | Array.from(textItems.values()) |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should call bugDetected for unsupported request type | Line 27 fallthrough |
| EH-02 | should throw if signal aborted before execute | Line 23 throwIfAborted |
| EH-03 | should throw if signal aborted before executeMerge | Line 52 throwIfAborted |
| EH-04 | should propagate executeSplit errors | Error path from abstract method |
| EH-05 | should handle MergeResponse validation errors | Invalid response from construction |

#### Metadata & Data (MD-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| MD-01 | should include segment count in debug log | Line 54 metadata |
| MD-02 | should include merged counts in info log | Line 69 metadata |
| MD-03 | should pass request metadata to tracer calls | asLogMetadata() calls |

## Coverage Strategy

**Lines to cover:**
- Line 19: Constructor super() call
- Line 23: signal.throwIfAborted() in execute
- Line 24-25: instanceof checks and returns
- Line 27: tracer.bugDetected()
- Line 52: signal.throwIfAborted() in executeMerge
- Line 54: tracer.debug()
- Lines 56-59: Sort logic with two conditions
- Lines 62-65: Map-based segment grouping
- Line 67: MergeResponse construction
- Line 69: tracer.info()
- Line 70: return statement

**Branches to cover:**
- Line 24: request instanceof SplitRequest (true/false)
- Line 25: request instanceof MergeRequest (true/false)
- Lines 57-58: textPosition comparison (equal/different)
- Line 64: text exists in Map (true/false)

**Expected Coverage:** 100% statements, 100% branches, 100% functions, 100% lines

## Implementation Notes

1. **Concrete Test Class**:
   ```typescript
   class TestSegmentsSupplier extends SegmentsSupplierBase {
     async executeSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError> {
       // Return mock SplitResponse for testing
     }
   }
   ```

2. **Mock Dependencies**:
   - Mock IFunctions with required methods
   - Mock IDescriptor for supplier identification
   - Mock Tracer to verify logging calls
   - Use real MergeRequest/SplitRequest instances

3. **AbortSignal Testing**:
   - Create AbortController for controllable abort
   - Test signal.throwIfAborted() at both checkpoints

4. **Sorting Verification**:
   - Create segments in intentionally wrong order
   - Verify output is correctly sorted by textPosition then segmentPosition
