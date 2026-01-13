# Test Plan: echogarden-supplier.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `echogarden-supplier.test.ts`

## Code Surface
**Exports:** EchoGardenSupplier (class extending SegmentsSupplierBase)
**Dependencies:**
- ICUSegmentation.initialize() (WASM module)
- segmentText() from @echogarden/text-segmentation
- ContextFactory.read() for SuppressionContext
- IFunctions (n8n workflow functions)
- Tracer (logging)

**Branches:**
- L36: text length < segmentLimit (pass through)
- L30: context.enabled && context.list (suppression array)
- L53-59: ICU initialization promise (success/failure)
- L75-80: segmentText loop (accumulation logic)
- L76: potentialSegment <= segmentLimit (accumulation condition)
- L79: currentSegment.length > 0 (push segment)
- L82: currentSegment.length > 0 (push final)

**ESLint Considerations:**
- Need type assertions for mock setups
- Import ordering: external → intento → local
- Mock IFunctions with proper type safety

## Test Strategy

### Testing Approach
1. **Mock ICU & segmentText**: Control sentence splitting behavior
2. **Mock IFunctions**: Provide workflow context
3. **Mock ContextFactory**: Control suppression context
4. **Spy on tracer**: Verify logging calls
5. **Test initialization**: Singleton pattern and error recovery
6. **Test segmentation**: Text passthrough and splitting logic
7. **Test accumulation**: Sentence combining with limits

### Key Test Scenarios
- Short text (< limit) passes through unchanged
- Long text splits at sentence boundaries
- Sentences accumulate until limit reached
- Single sentence exceeding limit becomes standalone
- Empty suppressions list handled
- ICU initialization failure recovery
- Abort signal handling

## Test Cases

### EchoGardenSupplier

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should construct with IFunctions and read context | Lines 29-34, constructor |
| BL-02 | should pass through text shorter than limit | Lines 36-39, early return |
| BL-03 | should split long text into segments | Lines 42-44, segmentation path |
| BL-04 | should use empty suppressions when context disabled | Line 30, false branch |
| BL-05 | should use context suppressions when enabled | Line 30, true branch |
| BL-06 | should log debug at split start | Lines 32-33, initial log |
| BL-07 | should log debug after split complete | Line 47, completion log |
| BL-08 | should preserve textPosition across segments | Line 43, position tracking |
| BL-09 | should assign sequential segmentPosition | Line 43, segment numbering |
| BL-10 | should initialize ICU on first call | Lines 53-58, initialization |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle multiple text items | Lines 35-44, loop iteration |
| EC-02 | should handle empty text array | Line 35, zero iterations |
| EC-03 | should handle text exactly at limit | Line 36, boundary condition |
| EC-04 | should accumulate sentences until limit | Lines 75-80, accumulation loop |
| EC-05 | should push segment on overflow | Lines 79-80, overflow handling |
| EC-06 | should handle final segment after loop | Line 82, final push |
| EC-07 | should handle single sentence exceeding limit | Lines 79-80, standalone segment |
| EC-08 | should handle empty sentences array | Lines 75-82, zero iterations |
| EC-09 | should reuse ICU initialization promise | Line 53, singleton pattern |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw on abort signal before split | Line 25, signal check |
| EH-02 | should throw on abort signal during loop | Line 35, per-item check |
| EH-03 | should reset ICU on initialization failure | Lines 56-59, error handling |
| EH-04 | should log error on ICU failure | Line 57, error logging |
| EH-05 | should re-throw ICU initialization error | Line 59, error propagation |

#### Metadata & Data (MD-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| MD-01 | should include suppression count in log | Line 32, log message |
| MD-02 | should include segment count in log | Line 47, result log |
| MD-03 | should pass request metadata to tracer | Line 33, metadata |
| MD-04 | should pass response metadata to tracer | Line 47, metadata |

## Implementation Notes

### Mock Setup Pattern
```typescript
// Mock ICUSegmentation
jest.mock('@echogarden/icu-segmentation-wasm', () => ({
  initialize: jest.fn(),
}));

// Mock segmentText
jest.mock('@echogarden/text-segmentation', () => ({
  segmentText: jest.fn(),
}));

// Mock ContextFactory
jest.spyOn(ContextFactory, 'read').mockReturnValue(mockContext);
```

### Test Class Pattern
```typescript
// Access protected executeSplit via public test method
class TestEchoGardenSupplier extends EchoGardenSupplier {
  async testExecuteSplit(request: SplitRequest, signal: AbortSignal) {
    return await this.executeSplit(request, signal);
  }
}
```

### Sentence Segmentation Mock
```typescript
// Control sentence splitting behavior
const mockSegmentText = segmentText as jest.MockedFunction<typeof segmentText>;
mockSegmentText.mockResolvedValue({
  sentences: [
    { text: 'First sentence. ' },
    { text: 'Second sentence.' },
  ],
});
```

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (1 class)
- [x] All branches covered (7 branches mapped)
- [x] All error paths tested (5 error scenarios)
- [x] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
