# Test Plan: context-factory.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `context-factory.test.ts`

## Code Surface
**Exports:**
- `CONTEXT_PARAMETER` - Symbol for metadata key
- `mapTo()` - Parameter decorator function
- `ContextFactory` - Static factory class with `read()` method

**Dependencies:**
- `reflect-metadata` - For decorator metadata storage/retrieval
- `Tracer` - For logging and error reporting (needs mocking)
- `IFunctions` - n8n execution context (needs mocking)
- `IContext` - Interface for context validation

**Branches:**
- `mapTo()`: 1 ternary (collection provided or not) = 2 branches
- `ContextFactory.read()`: 3 if statements (meta validation, paramTypes validation, length comparison) = 6 branches
- `getNodeParameter()`: 1 try/catch = 2 branches
- Total: 10 branches to cover

**ESLint Considerations:**
- File-level disable needed: `@typescript-eslint/no-unsafe-assignment` (Reflect.getMetadata returns any)
- Type assertions needed: Reflect.getMetadata returns (cast to string[])
- Mock type safety: Use `mock<Tracer>()` and `mock<IFunctions>()`
- Import order: reflect-metadata → jest-mock-extended → types → implementation

## Test Cases

### mapTo() Decorator

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should store parameter key in metadata | Lines 37-41, basic decorator functionality |
| BL-02 | should accumulate metadata for multiple parameters | Lines 37-41, metadata array building |
| BL-03 | should support nested collection parameters | Line 39, collection ternary left branch |
| BL-04 | should support flat parameters without collection | Line 39, collection ternary right branch |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle first parameter (no existing metadata) | Line 38, empty array fallback |
| EC-02 | should maintain left-to-right parameter order | Line 39, prepend logic verification |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should handle undefined _propertyKey parameter | Line 36, parameter decorator signature |

### ContextFactory.read()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-05 | should create valid context with all parameters | Lines 81-99, complete happy path |
| BL-06 | should extract parameters in correct order | Line 96, args mapping |
| BL-07 | should call throwIfInvalid after instantiation | Line 98, validation call |
| BL-08 | should log debug messages during extraction | Lines 81, 84, 99, tracer debug calls |
| BL-09 | should log info on successful creation | Line 98, tracer info call |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-03 | should handle context with optional parameters | Line 96, undefined parameter values |
| EC-04 | should handle context with default parameter values | Constructor defaults with undefined |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-02 | should throw if no metadata found | Lines 84-85, meta array check left |
| EH-03 | should throw if metadata array is empty | Lines 84-85, meta length check right |
| EH-04 | should throw if paramTypes not found | Lines 88-89, paramTypes array check left |
| EH-05 | should throw if paramTypes array is empty | Lines 88-89, paramTypes length check right |
| EH-06 | should throw if metadata count mismatches params | Lines 92-93, length comparison |
| EH-07 | should throw if context validation fails | Line 98, throwIfInvalid() throws |

### ContextFactory.getNodeParameter()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-10 | should extract parameter value with extractValue option | Lines 113-115, try block success |
| BL-11 | should log debug before and after extraction | Lines 112, 114, tracer debug calls |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-05 | should return undefined for missing parameter | Lines 117-119, catch block |
| EC-06 | should handle dot notation for nested parameters | Line 113, collection.key format |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-08 | should catch and log parameter extraction failure | Lines 117-119, catch error handling |

## Mock Setup Requirements

**Tracer Mock:**
```typescript
const mockTracer = mock<Tracer>();
mockTracer.debug.mockImplementation(() => {});
mockTracer.info.mockImplementation(() => {});
mockTracer.bugDetected.mockImplementation((where: string, error: string): never => {
  throw new NodeOperationError(mock<INode>(), `Bug detected at '${where}': ${error}`);
});
```

**IFunctions Mock:**
```typescript
const mockFunctions = mock<IFunctions>();
mockFunctions.getNodeParameter.mockImplementation((key: string) => {
  // Return test data based on key
});
```

**Test Context Class:**
```typescript
class TestContext implements IContext {
  constructor(
    @mapTo('param1') public readonly param1: string,
    @mapTo('param2', 'collection') public readonly param2: number
  ) {
    Object.freeze(this);
  }

  throwIfInvalid(): void {
    if (!this.param1) throw new Error('param1 required');
  }

  asLogMetadata(): LogMetadata {
    return { param1: this.param1, param2: this.param2 };
  }
}
```

## Coverage Strategy

**Line Coverage:**
- All 41 lines must be executed at least once
- Focus on: decorator logic (37-41), validation checks (84-93), parameter extraction (96, 112-119)

**Branch Coverage:**
- mapTo collection ternary: Test both with/without collection (BL-03, BL-04)
- Metadata validation: Test non-array and empty array separately (EH-02, EH-03)
- ParamTypes validation: Test non-array and empty array separately (EH-04, EH-05)
- Try/catch in getNodeParameter: Test success and failure (BL-10, EH-08)

**Function Coverage:**
- mapTo decorator function: All BL-01 through EC-02
- ContextFactory.read: All BL-05 through EH-07
- getNodeParameter: All BL-10 through EH-08

**Statement Coverage:**
- Every statement in each function must execute
- Special attention to throw statements (require bugDetected mock)

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (CONTEXT_PARAMETER, mapTo, ContextFactory)
- [x] All branches mapped to test cases (10 branches → 25 tests)
- [x] All error paths planned (8 error handling tests)
- [x] ESLint considerations documented (unsafe-assignment, type assertions)
- [x] Mock requirements specified (Tracer, IFunctions, TestContext)
- [x] Coverage strategy defined for ≥95% all metrics
- [x] Tests implemented in context-factory.test.ts
- [x] All tests passing with 100% coverage (25/25 tests, 100% all metrics)
