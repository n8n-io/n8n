# Test Plan: agent-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `agent-base.test.ts`

## Code Surface

**Exports:** `AgentBase` (abstract class)

**Dependencies:**
- `IExecuteFunctions` (n8n-workflow) - Mock with jest-mock-extended
- `SupplyResponseBase` - Create test subclass
- `SupplyError` - Instantiate with test data
- `Tracer` - Mock with jest-mock-extended
- `IDescriptor` - Mock object with required properties

**Branches:**
- Line 50: `if (response instanceof SupplyResponseBase)` - 2 branches
- Line 87: `if (response instanceof SupplyError)` - 2 branches
- Line 88: `filter` predicate - 2 branches per property check
- Line 38: `??=` nullish coalescing - 2 branches

**Key Implementation Details:**
- Abstract class requires concrete test implementation
- Promise memoization pattern in `ensureInitialized()` (line 85)
- Response type discrimination with `instanceof` (lines 50, 87)
- ITraceable object extraction in `traceStart()` (line 88)
- Error wrapping for n8n workflow format (line 53)

**ESLint Considerations:**
- Mock typing: Use `ReturnType<typeof mock<T>>` for type-safe mocks
- Abstract methods: Concrete implementation needed for instantiation
- No ESLint disables expected

## Test Cases

### AgentBase

#### Business Logic (BL-XX)

| ID    | Test Name                                              | Coverage Target                        |
|-------|--------------------------------------------------------|----------------------------------------|
| BL-01 | should execute workflow successfully with response     | Lines 45-51, success path              |
| BL-02 | should execute workflow and return error               | Lines 50-55, error path                |
| BL-03 | should call initialize before execute on first run     | Lines 47, 85-87, initialization logic  |
| BL-04 | should trace start before execution                    | Line 46, traceStart call               |
| BL-05 | should trace completion after execution                | Line 49, traceCompletion call          |
| BL-06 | should extract ITraceable metadata for logging         | Lines 88-91, metadata extraction       |
| BL-07 | should format success response as n8n data             | Line 50, asDataObject transformation   |
| BL-08 | should format error with n8n metadata wrapper          | Lines 53-54, error wrapping            |

#### Edge Cases (EC-XX)

| ID    | Test Name                                                  | Coverage Target                           |
|-------|------------------------------------------------------------|-------------------------------------------|
| EC-01 | should not reinitialize on subsequent runs                 | Lines 85-87, memoization check            |
| EC-02 | should handle concurrent run calls without duplicate init  | Lines 85-87, ??= atomicity                |
| EC-03 | should handle agent with no ITraceable properties         | Lines 88-89, empty filter result          |
| EC-04 | should handle agent with multiple ITraceable properties    | Lines 88-91, multiple metadata objects    |
| EC-05 | should pass AbortSignal to initialize                      | Line 47, signal propagation               |
| EC-06 | should pass AbortSignal to execute                         | Line 48, signal propagation               |
| EC-07 | should construct error output with item 0 index            | Line 54, itemData structure               |

#### Error Handling (EH-XX)

| ID    | Test Name                                                  | Coverage Target                           |
|-------|------------------------------------------------------------|-------------------------------------------|
| EH-01 | should propagate initialization errors                     | Line 47, initialize rejection             |
| EH-02 | should propagate execution errors                          | Line 48, execute rejection                |
| EH-03 | should trace error completion for SupplyError              | Lines 87-90, error branch                 |
| EH-04 | should trace success completion for SupplyResponseBase     | Lines 92-93, success branch               |

## Mock Strategy

### Test Implementation Class

Create concrete `TestAgent` extending `AgentBase`:
```typescript
class TestAgent extends AgentBase {
  public initializeCalled = false;
  public executeCalled = false;

  async initialize(signal: AbortSignal): Promise<void> {
    this.initializeCalled = true;
  }

  async execute(signal: AbortSignal): Promise<SupplyResponseBase | SupplyError> {
    this.executeCalled = true;
    return mockResponse;
  }
}
```

### Test Response Classes

Create test implementations for return types:
```typescript
class TestResponse extends SupplyResponseBase {
  constructor() {
    super({ requestId: 'test-id', requestedAt: Date.now() });
  }
}
```

### Mock Setup

```typescript
const mockFunctions: ReturnType<typeof mock<IExecuteFunctions>> = mock<IExecuteFunctions>();
const mockTracer: ReturnType<typeof mock<Tracer>> = mock<Tracer>();
const mockDescriptor: IDescriptor = {
  name: 'test-agent',
  symbol: '[TEST]',
  tool: 'test-tool',
  node: 'test-node',
  displayName: 'Test Agent',
  description: 'Test agent for testing'
};
```

## Coverage Targets

**Statements:** 100% (32/32)
**Branches:** 100% (8/8)
- `response instanceof SupplyResponseBase` - both branches
- `response instanceof SupplyError` - both branches
- `this.initialization ??=` - both branches
- Filter predicate checks - both branches

**Functions:** 100% (6/6)
- `constructor` (via TestAgent instantiation)
- `run`
- `initialize` (abstract, via TestAgent)
- `execute` (abstract, via TestAgent)
- `ensureInitialized`
- `traceStart`
- `traceCompletion`

**Lines:** 100% (30/30)

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (AgentBase abstract class)
- [x] All branches covered: instanceof checks, nullish coalescing, filter predicates
- [x] All error paths tested: initialization errors, execution errors, error tracing
- [x] ESLint considerations documented (mock typing strategy)
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] All tests implemented with matching IDs
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
