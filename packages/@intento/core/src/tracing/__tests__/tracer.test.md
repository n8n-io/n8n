# Test Plan: tracer.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `tracer.test.ts`

## Code Surface
**Exports:**
- `Tracer` class with 6 public methods (constructor, debug, info, warn, error, errorAndThrow)
- 4 private static methods (getTraceId, getFromPipeline, getCustomData, rememberTraceId)
- 1 private method (getLogMetadata)

**Dependencies:**
- `IFunctions` (n8n-workflow) - needs mocking with logger, node, workflow, execution context
- `Logger` (n8n-workflow) - needs mocking for log output verification
- `Pipeline.readPipeline()` - needs mocking for pipeline data
- `CoreError` - used in errorAndThrow method
- `crypto.randomUUID()` - needs mocking for deterministic traceId generation

**Branches:**
- Constructor: traceId resolution (customData → pipeline scan → generate)
- getTraceId: 3 switch cases (0, 1, multiple upstream traceIds)
- getFromPipeline: nested loops, type checks for traceId extraction
- getCustomData/rememberTraceId: availability checks for customData Map
- Pipeline scan: empty/single/multiple nodes with traceIds

**ESLint Considerations:**
- Type assertions for n8n mock objects (IExecuteFunctions, Logger, customData Map)
- Mock return types must be properly typed
- Use jest-mock-extended for type-safe mocks
- No eslint-disable needed - write type-safe code

## Test Cases

### Tracer Constructor & TraceId Resolution

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create tracer with resolved traceId from customData | Lines 94-100, customData path |
| BL-02 | should extract workflow metadata (nodeName, workflowId, executionId) | Lines 96-99, property assignment |
| BL-03 | should freeze instance after construction | Line 103, Object.freeze() |
| BL-04 | should log debug messages during traceId resolution | Lines 113-119, debug logging |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should generate new UUID when no upstream traceId found | Lines 159-162, case 0 branch |
| EC-02 | should use single traceId from pipeline | Lines 164-166, case 1 branch |
| EC-03 | should use first traceId when multiple found and log warning | Lines 169-173, default branch |
| EC-04 | should handle customData unavailable (no Map) | Lines 208-209, early return |
| EC-05 | should handle rememberTraceId when customData unavailable | Lines 224-225, early return |

### Logging Methods

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-05 | should log debug with enriched metadata | Lines 134-136, debug method |
| BL-06 | should log info with enriched metadata | Lines 149-151, info method |
| BL-07 | should log warn with enriched metadata | Lines 164-166, warn method |
| BL-08 | should log error with enriched metadata | Lines 177-179, error method |
| BL-09 | should include base context in all logs | Lines 199-206, getLogMetadata |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-06 | should merge extension metadata with base context | Lines 199-206, spread operator |
| EC-07 | should handle undefined extension metadata | Line 205, nullish coalescing |

### Error Handling & Throwing

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-10 | should log error and throw CoreError with metadata | Lines 189-191, errorAndThrow |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw CoreError with correct message and metadata | Line 191, throw statement |
| EH-02 | should enrich CoreError with full tracing context | Line 191, getLogMetadata call |

### Pipeline TraceId Extraction

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-11 | should extract traceIds from pipeline node outputs | Lines 182-197, getFromPipeline |
| BL-12 | should deduplicate multiple instances of same traceId | Line 200, Set deduplication |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-08 | should handle empty pipeline (no upstream nodes) | Lines 182-197, empty loop |
| EC-09 | should skip outputs without json.traceId field | Line 192, conditional check |
| EC-10 | should skip outputs where traceId is not a string | Line 192, typeof check |
| EC-11 | should handle multiple nodes with different traceIds | Lines 182-200, full loop |

### CustomData Cache Operations

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-13 | should retrieve traceId from customData cache | Lines 208-213, getCustomData |
| BL-14 | should cache traceId in customData for downstream nodes | Lines 224-227, rememberTraceId |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-12 | should return undefined when customData.get is not a function | Line 209, typeof check |
| EC-13 | should return undefined when traceId in customData is not a string | Line 212, typeof check |
| EC-14 | should handle customData.set not being a function | Line 225, typeof check |

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (Tracer class + 11 methods)
- [x] All branches covered (100%): switch cases, conditionals, loops
- [x] All error paths tested (CoreError throwing)
- [x] ESLint considerations documented (type-safe mocks, no disables)
- [ ] Coverage ≥95% (statements, branches, functions, lines) - to verify after implementation
- [x] Edge cases: empty pipeline, multiple traceIds, customData unavailable
- [x] Integration: full constructor flow with all resolution paths
- [x] Immutability: Object.freeze verification
- [x] Logging: all 5 log levels with metadata enrichment

## Mock Strategy

**IFunctions Mock:**
```typescript
mockFunctions = mock<IExecuteFunctions>({
  logger: mockLogger,
  getNode: () => ({ name: 'TestNode' }),
  getWorkflow: () => ({ id: 'workflow-123' }),
  getExecutionId: () => 'exec-456',
  getWorkflowDataProxy: () => ({
    $execution: {
      customData: mockCustomData
    }
  })
});
```

**Pipeline Mock:**
```typescript
jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
  'UpstreamNode': [{ json: { traceId: 'trace-abc' } }]
});
```

**UUID Mock:**
```typescript
jest.spyOn(crypto, 'randomUUID').mockReturnValue('generated-uuid');
```

**CustomData Mock:**
```typescript
mockCustomData = new Map<string, unknown>();
mockCustomData.set('traceId', 'cached-trace-id');
```

## Coverage Commands
```bash
cd packages/@intento/core
pnpm test src/tracing/__tests__/tracer.test.ts --coverage
pnpm lint:fix
pnpm typecheck
pnpm build
```
