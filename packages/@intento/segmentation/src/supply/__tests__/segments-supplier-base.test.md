# Test Plan: segments-supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-12
**Coverage Target:** ≥95% all metrics ✅ **ACHIEVED: 100% all metrics**
**Test File:** `segments-supplier-base.test.ts` ✅ **16/16 tests passing**

## Code Surface
**Exports:** SegmentsSupplierBase (abstract class)
**Dependencies:**
- SupplierBase (intento-core) - inherited base class
- Tracer - for logging (via this.tracer inherited from SupplierBase)
- IDescriptor, IFunctions, IntentoConnectionType - constructor dependencies
- SplitRequest, MergeRequest, SplitResponse, MergeResponse - request/response types
- ISegment - segment interface with textPosition, segmentPosition, text

**Branches:**
- 2 instance checks (SplitRequest, MergeRequest) in execute()
- 1 conditional in sort comparator (textPosition check)
- 1 ternary for text concatenation (Map.get check)

**Key Constraints:**
- request.segments is readonly array (must use shallow copy for sort)
- bugDetected() has return type `never` (always throws)
- executeSplit is abstract (must be mocked/implemented in tests)
- executeMerge is concrete with default implementation
- Segments must be sorted by textPosition first, then segmentPosition
- textPositions must be contiguous (0, 1, 2...) - MergeResponse validation requires this

**ESLint Considerations:**
- jest-mock-extended for mocking abstract class implementations
- Type assertions for mock methods
- Import order: types before implementations

## Test Cases

### SegmentsSupplierBase (abstract class)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target | Status |
|----|-----------|-----------------|--------|
| BL-01 | should route SplitRequest to executeSplit | Lines 32-33, first instanceof | ✅ |
| BL-02 | should route MergeRequest to executeMerge | Lines 33, second instanceof | ✅ |
| BL-03 | should merge single text item with single segment | Lines 56-81, basic merge path | ✅ |
| BL-04 | should merge multiple segments into single text item | Lines 56-81, same textPosition | ✅ |
| BL-05 | should merge segments into multiple text items | Lines 56-81, different textPositions | ✅ |
| BL-06 | should concatenate segments in segmentPosition order | Lines 63-66, sort logic | ✅ |
| BL-07 | should preserve textPosition order in output | Lines 70, Map insertion order | ✅ |
| BL-08 | should call signal.throwIfAborted before merge | Line 57 | ✅ |
| BL-09 | should log debug message before merge | Line 60 | ✅ |
| BL-10 | should log info message after merge | Line 79 | ✅ |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target | Status |
|----|-----------|-----------------|--------|
| EC-01 | should handle empty segments array | Lines 56-81, edge case | ✅ |
| EC-02 | should handle segments with same textPosition but different segmentPosition | Lines 63-66, sort branch | ✅ |
| ~~EC-03~~ | ~~should handle non-sequential textPositions (0, 2, 5)~~ | ~~Lines 70, Map behavior~~ | ❌ Removed - violates MergeResponse validation |
| EC-04 | should handle segments arriving in random order | Lines 63-66, full sort | ✅ |
| EC-05 | should not mutate original request.segments array | Line 63, shallow copy | ✅ |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target | Status |
|----|-----------|-----------------|--------|
| EH-01 | should call bugDetected for unsupported request type | Line 34, bugDetected call | ✅ |
| EH-02 | should throw when signal is already aborted | Line 57, throwIfAborted | ✅ |

## Test Implementation Details

### Mocking Strategy

**ConcreteSegmentsSupplier:**
```typescript
class ConcreteSegmentsSupplier extends SegmentsSupplierBase {
  protected async executeSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError> {
    // Mock implementation returns test data
    return mock<SplitResponse>();
  }
}
```

**Mock Setup:**
- IDescriptor: `{ name: 'test-supplier', symbol: '🔧' }`
- IFunctions: mock<IFunctions>() with jest-mock-extended
- IntentoConnectionType: mock<IntentoConnectionType>()
- Tracer: mock methods debug, info, bugDetected

**Helper Factories:**
```typescript
const createSegment = (textPos: number, segPos: number, text: string): ISegment => ({
  textPosition: textPos,
  segmentPosition: segPos,
  text,
});

const createMergeRequest = (segments: ISegment[]): MergeRequest =>
  new MergeRequest(segments);

const createSplitRequest = (text: string | string[], limit: number): SplitRequest =>
  new SplitRequest(text, limit);
```

### Test Structure

**File organization:**
```typescript
describe('SegmentsSupplierBase', () => {
  describe('execute routing', () => {
    // BL-01, BL-02, EH-01
  });

  describe('executeMerge - basic functionality', () => {
    // BL-03, BL-04, BL-05, BL-08, BL-09, BL-10
  });

  describe('executeMerge - segment ordering', () => {
    // BL-06, BL-07, EC-02, EC-04 (EC-03 removed)
  });

  describe('executeMerge - edge cases', () => {
    // EC-01, EC-05
  });

  describe('error handling', () => {
    // EH-02
  });
});
```

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All error paths tested
- [x] ESLint considerations documented
- [x] Coverage ≥95% (statements, branches, functions, lines) - **100% achieved**
- [x] Tests pass: `pnpm test segments-supplier-base.test.ts` - **16/16 passing**
- [ ] Lint passes: `pnpm lint:fix`
- [ ] TypeScript compiles: `pnpm typecheck`

## Implementation Notes

**Key Challenges Resolved:**
1. **AbortController timing**: EH-02 test initially called `abort()` during module load, causing Jest worker to crash. Fixed by making test `async` and using `await expect(...).rejects.toThrow()`.
2. **Tracer spy mocking**: Tracer methods are frozen/sealed. Solution: spy on `mockFunctions.logger.debug/info` instead of `tracer.debug/info`.
3. **IFunctions mock completeness**: Required manual mock object with `getWorkflow()`, `getExecutionId()`, `logger` object (not jest.fn()).
4. **EC-03 removed**: Non-sequential textPositions (0, 2, 5) violate MergeResponse validation which expects `textCount + 1` where `textCount = max(textPosition)`. This would produce 3 items but expect 6. MergeResponse requires contiguous positions (0, 1, 2...).

**Test Count:** 16 tests (originally planned 17, EC-03 removed)
