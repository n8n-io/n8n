# Test Plan: tracer.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `tracer.test.ts`

## Code Surface
**Exports:** Tracer (class)
**Dependencies:**
- IFunctions (mock with logger, getNode, getWorkflow, getExecutionId, getWorkflowDataProxy)
- IDescriptor (simple object)
- Pipeline.readPipeline (static method to mock)
- crypto.randomUUID (needs mocking for deterministic tests)
- NodeOperationError (from n8n-workflow)
**Branches:**
- 3 branches in getTraceId switch (0, 1, multiple traceIds)
- 2 branches in getCustomData (customData check, type guard)
- 2 branches in rememberTraceId (customData check)
- 2 branches in getFromPipeline (type guard for traceId)
**ESLint Considerations:**
- Import order: n8n-workflow types → n8n-workflow → local types → implementation
- Mock types with jest-mock-extended
- Type assertions for mock returns

## Test Cases

### Tracer

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should initialize with descriptor symbol | Line 42, property assignment |
| BL-02 | should initialize with node from functions | Line 43, getNode() call |
| BL-03 | should initialize with workflowId from functions | Line 45, getWorkflow().id access |
| BL-04 | should initialize with executionId from functions | Line 46, getExecutionId() call |
| BL-05 | should freeze object after construction | Line 50, Object.freeze() |
| BL-06 | should log debug with metadata | Lines 60-62, debug method |
| BL-07 | should log info with metadata | Lines 70-72, info method |
| BL-08 | should log warn with metadata | Lines 80-82, warn method |
| BL-09 | should log error with metadata | Lines 90-92, error method |
| BL-10 | should include extension metadata in logs | Lines 108-113, metadata spreading |
| BL-11 | should generate UUID when no traceId in custom data or pipeline | Lines 146-149, case 0 branch |
| BL-12 | should use traceId from custom data when available | Lines 131-134, early return path |
| BL-13 | should use single traceId from pipeline | Lines 150-153, case 1 branch |
| BL-14 | should deduplicate traceIds from pipeline | Line 184, Array.from(new Set()) |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should use first traceId when multiple found in pipeline | Lines 154-158, default branch |
| EC-02 | should log multiple traceIds in warning when multiple found | Line 157, warn with traceIds array |
| EC-03 | should cache resolved traceId in custom data | Lines 160-162, rememberTraceId call |
| EC-04 | should extract traceId from pipeline json field | Lines 176-179, type guard check |
| EC-05 | should return undefined when customData not available | Line 199, early return |
| EC-06 | should return undefined when traceId not string in customData | Line 203, type guard |
| EC-07 | should silently fail when custom data unavailable for caching | Line 218, early return |
| EC-08 | should handle empty pipeline | Lines 170-184, empty for loop |
| EC-09 | should skip pipeline items without json.traceId | Lines 176-179, type guard negative |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw NodeOperationError in bugDetected | Line 103, throw statement |
| EH-02 | should log error before throwing in bugDetected | Line 101-102, error call + throw |
| EH-03 | should include where and error in bugDetected message | Line 100, message template |
| EH-04 | should include extension metadata in bugDetected | Line 101, extension parameter |
| EH-05 | should handle customData.get not being a function | Line 199, typeof check |
| EH-06 | should handle customData.set not being a function | Line 218, typeof check |
| EH-07 | should handle non-string traceId in customData | Line 203, type guard |

## Implementation Notes

### Mock Setup
Complex mock structure required:

```typescript
const mockLogger = mock<Logger>();
const mockNode = mock<INode>({ name: 'TestNode' });
const mockWorkflow = { id: 'workflow-123' };
const mockFunctions = mock<IFunctions>({
  logger: mockLogger,
  getNode: () => mockNode,
  getWorkflow: () => mockWorkflow,
  getExecutionId: () => 'execution-456',
  getWorkflowDataProxy: jest.fn(),
});

// Mock Pipeline
jest.mock('utils/*', () => ({
  Pipeline: {
    readPipeline: jest.fn(),
  },
}));

// Mock crypto
const mockCryptoRandomUUID = jest.spyOn(crypto, 'randomUUID');
```

### Custom Data Mock Pattern
Test custom data with Map-like interface:

```typescript
const mockCustomData = new Map<string, unknown>();
mockFunctions.getWorkflowDataProxy.mockReturnValue({
  $execution: {
    customData: mockCustomData,
  },
});
```

### Pipeline Mock Pattern
Mock pipeline with various traceId scenarios:

```typescript
Pipeline.readPipeline.mockReturnValue({
  'Node A': [{ json: { traceId: 'trace-001' } }],
  'Node B': [{ json: { traceId: 'trace-001' } }], // duplicate
});
```

## Coverage Targets

**Lines to cover:**
- 42-46: Constructor property assignments
- 50: Object.freeze()
- 60-62, 70-72, 80-82, 90-92: Logging methods
- 100-103: bugDetected method
- 108-113: getLogMetadata method
- 131-134: Custom data early return
- 138: getFromPipeline call
- 146-158: Switch statement branches
- 160-162: rememberTraceId call
- 170-184: Pipeline iteration and deduplication
- 196-203: getCustomData logic
- 213-220: rememberTraceId logic

**Expected Coverage:** 100% statements, 100% branches, 100% functions, 100% lines

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified (Tracer class)
- [x] All branches covered (switch: 3, guards: 6)
- [x] All error paths tested (7 error scenarios)
- [x] ESLint considerations documented
- [x] Coverage ≥95% target set (aiming for 100%)
- [x] Mock strategy documented (IFunctions, Pipeline, crypto)
- [x] Custom data Map interface pattern defined
