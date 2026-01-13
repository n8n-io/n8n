# Test Plan: agent-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `agent-base.test.ts`

## Code Surface
**Exports:** `AgentBase<TI, TS>` (abstract class)
**Dependencies:**
- n8n: `IExecuteFunctions`, `INodeExecutionData`, `IntentoConnectionType`
- Internal: `AgentError`, `AgentRequestBase`, `AgentResponseBase`, `SupplyResponseBase`, `Tracer`, `IDescriptor`
**Branches:** 13 conditionals (if/else, try/catch, instanceof checks)
**ESLint Considerations:**
- Import order: Internal types before n8n-workflow
- Type safety: Use proper type assertions without `any`
- No file-level disables allowed per testing.instructions.md

## Test Cases

### AgentBase (Abstract Class)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | constructor should initialize descriptor, functions, and tracer | Lines 36-40, constructor logic |
| BL-02 | initialize should be called exactly once on first run | Lines 43-51, initializeOnce lazy initialization |
| BL-03 | initialize should check abort signal | Line 44, signal.throwIfAborted() in initializeOnce |
| BL-04 | run should execute successful workflow and return response data | Lines 59-82, happy path with AgentResponseBase |
| BL-05 | run should validate request before execution | Lines 66-68, request.throwIfInvalid() |
| BL-06 | run should validate response after execution | Lines 72-73, response.throwIfInvalid() |
| BL-07 | run should call traceStart and traceCompletion | Lines 64, 76, tracing methods |
| BL-08 | run should check abort signal before and after execute | Lines 66, 72, signal.throwIfAborted() |
| BL-09 | getSuppliers should return array of suppliers when data is array | Lines 178-181, Array.isArray branch |
| BL-10 | getSuppliers should return single supplier as array when data is object | Lines 183-186, single data branch |
| BL-11 | getSuppliers should reverse supplier order for LTR priority | Line 180, .reverse() call |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | run should return error output when response is AgentError and continueOnFail is true | Lines 79-81, error output formatting with continueOnFail |
| EC-02 | run should handle response that is SupplyResponseBase subclass | Line 78, instanceof SupplyResponseBase |
| EC-03 | getSuppliers should return empty array when no connection data | Lines 188-189, no data branch |
| EC-04 | getSuppliers should log warning when no suppliers found | Line 188, tracer.warn() |
| EC-05 | getSuppliers should log debug for array retrieval | Line 179, tracer.debug() with count |
| EC-06 | getSuppliers should log debug for single retrieval | Line 184, tracer.debug() |
| EC-07 | getSuppliers should check abort signal before retrieval | Line 173, signal.throwIfAborted() |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | onError should convert TimeoutError to AgentError 408 | Lines 108-112, TimeoutError branch |
| EH-02 | onError should log warning for timeout with reason | Line 111, tracer.warn() |
| EH-03 | onError should convert AbortError to AgentError 499 | Lines 113-117, AbortError branch |
| EH-04 | onError should log warning for abort with reason | Line 116, tracer.warn() |
| EH-05 | onError should convert unexpected errors to AgentError 500 | Lines 118-122, unexpected error branch |
| EH-06 | onError should log error with details for unexpected errors | Line 121, tracer.error() with meta |
| EH-07 | run should catch errors during request validation | Lines 67, 74-75, request.throwIfInvalid() throws |
| EH-08 | run should catch errors during execution | Lines 69, 74-75, execute() throws |
| EH-09 | run should catch errors during response validation | Lines 73, 74-75, response.throwIfInvalid() throws |
| EH-10 | run should catch errors when signal aborts before execution | Lines 66, 74-75, signal.throwIfAborted() throws |
| EH-11 | run should catch errors when signal aborts after execution | Lines 72, 74-75, signal.throwIfAborted() throws |
| EH-12 | traceCompletion should log error for AgentError | Lines 150-153, AgentError branch |
| EH-13 | traceCompletion should log info for successful response | Line 154, success branch |
| EH-14 | run should catch errors during initialization | Lines 65, 74-75, initialize() throws |
| EH-15 | run should throw NodeOperationError when response is AgentError and continueOnFail is false | Line 110, throw NodeOperationError |

## Mock Strategy

### Test Implementations
- `TestAgentRequest extends AgentRequestBase` - Concrete request with validation control
- `TestAgentResponse extends AgentResponseBase` - Concrete response with validation control
- `TestAgent extends AgentBase` - Concrete agent with initialize and execute mocks

### Mocks
- `IFunctions` - Mock with getInputConnectionData, helpers.constructExecutionMetaData, getNode, getWorkflow, getExecutionId
- `IDescriptor` - Simple object with name, symbol, tool, node, displayName, description
- `Tracer` - Mock with debug, info, warn, error methods (using jest.spyOn on prototype)
- `AbortSignal` - Mock with throwIfAborted method

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (AgentBase abstract class)
- [x] All branches covered: 13 branches mapped to test IDs
- [x] All error paths tested: 15 error handling tests (added EH-15 for continueOnFail=false)
- [x] Initialize method tested: 3 tests for initialization logic
- [x] ESLint considerations documented
- [x] Coverage ≥95% target (statements, branches, functions, lines)
- [x] Mock strategy defined for n8n dependencies
- [x] No ESLint disable comments used (per testing.instructions.md)
