# Test Plan: tracer.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-06
**Coverage Target:** ≥95% all metrics
**Test File:** `tracer.test.ts`

## Code Surface

**Exports:**
- `Tracer` class (distributed tracing utility)

**Public Methods:**
- `constructor(functions: IFunctions)` - Creates tracer with traceId resolution
- `debug(message: string, extension?: LogMetadata): void` - Logs debug message
- `info(message: string, extension?: LogMetadata): void` - Logs info message
- `warn(message: string, extension?: LogMetadata): void` - Logs warning message
- `error(message: string, extension?: LogMetadata): void` - Logs error message
- `bugDetected(where: string, error: Error | string, extension?: LogMetadata): never` - Logs bug and throws

**Private Methods:**
- `getLogMetadata(extension?: LogMetadata): LogMetadata` - Merges metadata
- `static getTraceId(functions: IFunctions, log: Logger): string` - Resolves traceId
- `static getFromPipeline(functions: IFunctions): string[]` - Extracts from pipeline
- `static getCustomData(functions: IFunctions): string | undefined` - Gets from customData
- `static rememberTraceId(functions: IFunctions, traceId: string): void` - Stores in customData

**Dependencies:**
- `IFunctions` (n8n workflow context)
- `Logger` (n8n logger interface)
- `INode` (n8n node metadata)
- `NodeOperationError` (n8n error class)
- `Pipeline.readPipeline()` (utility for reading upstream data)
- `crypto.randomUUID()` (UUID generation)

**Branches:**
- Constructor: Non-null assertion for workflow.id
- getTraceId: 3 resolution paths (customData → pipeline → generate)
- getTraceId: switch statement with 3 cases (0, 1, default for multiple IDs)
- getFromPipeline: Loops over pipeline entries, type checks for traceId
- getCustomData: 2 defensive checks (customData exists, .get() function exists)
- getCustomData: Type guard for string traceId
- rememberTraceId: 2 defensive checks (customData exists, .set() function exists)

**ESLint Considerations:**
- File-level disables needed:
  - `@typescript-eslint/no-unsafe-assignment` (for mock returns)
  - `@typescript-eslint/no-unsafe-member-access` (for pipeline data access)
  - `@typescript-eslint/no-unsafe-argument` (for mock function calls)
- Type assertions: Pipeline data structure, execution customData
- Import order: n8n-workflow → types → utils

## Test Cases

### Constructor

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create tracer with all properties initialized | Lines 54-63, constructor |
| BL-02 | should extract node from IFunctions | Line 55, getNode() |
| BL-03 | should extract workflowId from workflow | Line 57, getWorkflow().id |
| BL-04 | should extract executionId from IFunctions | Line 58, getExecutionId() |
| BL-05 | should resolve traceId via getTraceId | Line 60, getTraceId call |
| BL-06 | should freeze instance after construction | Line 62, Object.freeze |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle workflow with generated UUID workflowId | Workflow ID format |
| EC-02 | should handle empty executionId string | Edge case for execution |

### Logging Methods (debug/info/warn/error)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-07 | should log debug message with metadata | Lines 72-74, debug method |
| BL-08 | should log info message with metadata | Lines 77-79, info method |
| BL-09 | should log warn message with metadata | Lines 82-84, warn method |
| BL-10 | should log error message with metadata | Lines 87-89, error method |
| BL-11 | should include standard metadata in all log calls | getLogMetadata integration |
| BL-12 | should merge extension metadata with standard metadata | Lines 135-141 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-03 | should log without extension metadata (undefined) | Optional param |
| EC-04 | should handle empty extension object | Empty object merge |
| EC-05 | should allow extension to override standard metadata | Spread operator precedence |

### bugDetected Method

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-13 | should log error with bug prefix and where location | Lines 102-103, message format |
| BL-14 | should throw NodeOperationError with formatted message | Line 110, throw statement |
| BL-15 | should handle Error object with message property | Line 102, typeof check |
| BL-16 | should handle string error message | Line 102, string branch |
| BL-17 | should include where in metadata | Line 103, where field |
| BL-18 | should include error in metadata when Error object | Line 104, error field |
| BL-19 | should include message in metadata when string | Line 104, message field |
| BL-20 | should merge extension metadata into error log | Line 105, extension spread |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-06 | should handle bugDetected without extension metadata | Optional param |
| EC-07 | should format node name in error message | this.node.name in message |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw NodeOperationError with correct node | Line 110, this.node |
| EH-02 | should never return (return type is never) | Type system check |

### getLogMetadata (private)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-21 | should return metadata with all standard fields | Lines 135-141 |
| BL-22 | should include traceId in metadata | Line 136, traceId |
| BL-23 | should include nodeName in metadata | Line 137, nodeName |
| BL-24 | should include workflowId in metadata | Line 138, workflowId |
| BL-25 | should include executionId in metadata | Line 139, executionId |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-08 | should merge extension with standard metadata (extension priority) | Line 140, spread operator |
| EC-09 | should handle undefined extension gracefully | Line 140, nullish coalescing |

### getTraceId (private static) - Resolution Strategy

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-26 | should return traceId from customData if exists | Lines 160-163, early return |
| BL-27 | should extract traceId from pipeline if customData empty | Lines 166-167, case 1 |
| BL-28 | should generate new UUID if no traceId found | Lines 170-172, case 0 |
| BL-29 | should use first traceId when multiple found | Lines 175-178, default case |
| BL-30 | should warn when multiple traceIds in pipeline | Line 177, log.warn |
| BL-31 | should store traceId in customData after resolution | Lines 181-182, rememberTraceId |
| BL-32 | should log debug messages during resolution process | Lines 154-178, log.debug calls |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-10 | should handle empty pipeline (no upstream nodes) | Case 0 with empty array |
| EC-11 | should handle pipeline with single traceId | Case 1 with one ID |
| EC-12 | should deduplicate identical traceIds from pipeline | Set deduplication |

### getFromPipeline (private static)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-33 | should extract traceIds from pipeline node outputs | Lines 193-207 |
| BL-34 | should read pipeline using Pipeline.readPipeline | Line 193 |
| BL-35 | should check json.traceId exists and is string | Lines 202-204 |
| BL-36 | should return deduplicated array via Set | Line 207 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-13 | should return empty array if pipeline is empty | Empty pipeline |
| EC-14 | should skip entries without json.traceId | Line 202, if guard |
| EC-15 | should skip entries with non-string traceId | Line 202, typeof check |
| EC-16 | should handle multiple nodes with same traceId | Deduplication |
| EC-17 | should handle multiple nodes with different traceIds | Multiple unique IDs |
| EC-18 | should handle pipeline with mixed valid/invalid traceIds | Filtering |

### getCustomData (private static)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-37 | should return traceId from customData if exists | Lines 220-226 |
| BL-38 | should access execution via workflow data proxy | Lines 220-221 |
| BL-39 | should return undefined if customData missing | Line 227, defensive check |
| BL-40 | should return undefined if customData.get not a function | Line 227, typeof check |
| BL-41 | should return undefined if traceId is not a string | Line 230, type guard |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-19 | should return undefined when customData is null | Null check |
| EC-20 | should return undefined when customData is undefined | Undefined check |
| EC-21 | should return undefined when traceId is number/boolean | Type guard filter |

### rememberTraceId (private static)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-42 | should store traceId in customData.set | Lines 242-252 |
| BL-43 | should access execution via workflow data proxy | Lines 242-243 |
| BL-44 | should call customData.set with traceId key and value | Line 252 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-22 | should silently ignore if customData is null | Line 250, defensive check |
| EC-23 | should silently ignore if customData is undefined | Line 250, undefined check |
| EC-24 | should silently ignore if customData.set not a function | Line 250, typeof check |

## Test Data Structures

```typescript
// Mock IFunctions with complete workflow context
const createMockFunctions = (overrides?: Partial<IFunctions>): IFunctions => {
  const mockLogger = mock<Logger>();
  const mockNode: INode = {
    id: 'node-123',
    name: 'TestNode',
    type: 'n8n-nodes-base.test',
    typeVersion: 1,
    position: [100, 200],
    parameters: {},
  };
  const mockWorkflow = {
    id: 'workflow-456',
    name: 'Test Workflow',
    active: true,
    nodes: [mockNode],
    connections: {},
  };

  return {
    logger: mockLogger,
    getNode: jest.fn().mockReturnValue(mockNode),
    getWorkflow: jest.fn().mockReturnValue(mockWorkflow),
    getExecutionId: jest.fn().mockReturnValue('execution-789'),
    getWorkflowDataProxy: jest.fn().mockReturnValue({
      $execution: {
        customData: new Map<string, unknown>(),
      },
    }),
    ...overrides,
  } as unknown as IFunctions;
};

// Mock pipeline data structures
const EMPTY_PIPELINE = {};
const SINGLE_NODE_PIPELINE = {
  'Node1': [{ json: { traceId: 'trace-111', data: 'value' } }],
};
const MULTI_NODE_PIPELINE = {
  'Node1': [{ json: { traceId: 'trace-111' } }],
  'Node2': [{ json: { traceId: 'trace-222' } }],
};
const DUPLICATE_TRACEID_PIPELINE = {
  'Node1': [{ json: { traceId: 'trace-111' } }],
  'Node2': [{ json: { traceId: 'trace-111' } }],
};
const INVALID_TRACEID_PIPELINE = {
  'Node1': [{ json: { traceId: 123 } }], // number, not string
  'Node2': [{ json: { data: 'value' } }], // no traceId
  'Node3': [{ json: { traceId: null } }], // null traceId
};

// CustomData scenarios
const CUSTOMDATA_WITH_TRACEID = new Map([['traceId', 'trace-from-custom']]);
const CUSTOMDATA_EMPTY = new Map();
const CUSTOMDATA_INVALID_TRACEID = new Map([['traceId', 12345]]); // non-string
```

## Mock Strategy

### IFunctions Mocking
- Mock all required methods: `logger`, `getNode()`, `getWorkflow()`, `getExecutionId()`, `getWorkflowDataProxy()`
- Use `jest-mock-extended` for Logger interface
- Create factory function for different scenarios (customData present/absent, pipeline states)

### Pipeline Mocking
- Mock `Pipeline.readPipeline()` to return different data structures
- Test empty pipeline, single node, multiple nodes, duplicate traceIds, invalid traceIds
- Use type assertions for complex nested structures

### UUID Generation
- Mock `crypto.randomUUID()` for deterministic testing
- Verify UUID generation called when no existing traceId found

### Logger Verification
- Verify debug/info/warn/error calls with correct messages and metadata
- Check metadata enrichment includes traceId, nodeName, workflowId, executionId

## Coverage Goals

**Target: ≥95% all metrics**

- **Statements:** All 75+ statements covered
- **Branches:** All conditional paths (customData checks, pipeline cases, type guards)
- **Functions:** All 10 methods (5 public + 5 private static)
- **Lines:** Complete line coverage including defensive checks

**Critical Coverage Areas:**
1. Three-tier traceId resolution (customData → pipeline → generate)
2. Pipeline extraction with type validation
3. CustomData defensive checks and silent failures
4. Metadata enrichment in logging methods
5. bugDetected error formatting and throwing

## Implementation Notes

### Test Organization
```typescript
describe('Tracer', () => {
  describe('constructor', () => { /* BL-01 to BL-06, EC-01 to EC-02 */ });
  describe('logging methods', () => {
    describe('debug', () => { /* BL-07 */ });
    describe('info', () => { /* BL-08 */ });
    describe('warn', () => { /* BL-09 */ });
    describe('error', () => { /* BL-10 */ });
    describe('metadata enrichment', () => { /* BL-11, BL-12, EC-03 to EC-05 */ });
  });
  describe('bugDetected', () => { /* BL-13 to BL-20, EC-06 to EC-07, EH-01 to EH-02 */ });
  describe('traceId resolution', () => {
    describe('from customData', () => { /* BL-26, BL-37 to BL-41 */ });
    describe('from pipeline', () => { /* BL-27, BL-33 to BL-36, EC-13 to EC-18 */ });
    describe('generate new', () => { /* BL-28 */ });
    describe('multiple traceIds', () => { /* BL-29, BL-30 */ });
    describe('storage', () => { /* BL-31, BL-42 to BL-44, EC-22 to EC-24 */ });
  });
});
```

### Key Testing Patterns
1. **Arrange:** Create mock IFunctions with specific customData/pipeline state
2. **Act:** Instantiate Tracer or call logging methods
3. **Assert:** Verify logger calls, metadata content, error throwing, customData updates

### Special Considerations
- Test immutability with `Object.isFrozen(tracer)` after construction
- Verify `bugDetected` never returns (catch NodeOperationError in test)
- Mock `Pipeline.readPipeline` before each test to control pipeline state
- Spy on `crypto.randomUUID()` to verify UUID generation called
- Use jest.spyOn for private static methods if needed (access via class)
