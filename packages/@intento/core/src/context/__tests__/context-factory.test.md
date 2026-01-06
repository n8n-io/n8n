# Test Plan: context-factory.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-06
**Coverage Target:** ≥95% all metrics
**Test File:** `context-factory.test.ts`

## Code Surface
**Exports:**
- `mapTo` decorator function (2 parameters, optional collection)
- `ContextFactory` class with static `read()` method
- `CONTEXT_PARAMETER` symbol for metadata storage

**Dependencies:**
- `reflect-metadata` - Stores decorator metadata
- `IFunctions` - n8n functions interface (needs mocking)
- `Tracer` - Logging and error reporting (needs mocking)
- `IContext` - Interface for context validation

**Branches:**
- Line 135: `if (!Array.isArray(meta) || meta.length === 0)` - 2 conditions (non-array OR empty array)
- Line 139: `if (!Array.isArray(paramTypes) || paramTypes.length === 0)` - 2 conditions (non-array OR empty)
- Line 141: `if (paramTypes.length !== meta.length)` - Length mismatch check
- Line 77: `collection ? \`${collection}.${key}\` : key` - Ternary for dotted path
- Line 145-149: `try/catch` block for validation
- Line 169-177: `try/catch` block for parameter extraction

**ESLint Considerations:**
- File-level disables needed:
  - `@typescript-eslint/no-unsafe-assignment` (for Reflect.getMetadata returns)
  - `@typescript-eslint/no-unsafe-argument` (for Jest matchers)
  - `@typescript-eslint/no-explicit-any` (for context constructor signature)
- Type assertions needed: Reflect.getMetadata returns unknown
- Import order: reflect-metadata → external → types → implementation

## Test Cases

### mapTo Decorator

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should store parameter key in metadata | Lines 71-75, basic decorator function |
| BL-02 | should create dotted path when collection provided | Line 77, ternary left branch |
| BL-03 | should maintain parameter order for multiple decorators | Line 74, prepend logic |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle single parameter without collection | Line 77, ternary right branch |
| EC-02 | should preserve metadata across multiple class parameters | Decorator accumulation across params |

### ContextFactory.read()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-04 | should create context with all mapped parameters | Lines 128-145, happy path |
| BL-05 | should extract nested parameters with collection notation | getNodeParameter with dotted path |
| BL-06 | should call throwIfInvalid after instantiation | Line 146, validation call |
| BL-07 | should return frozen validated context instance | Line 151, return statement |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-03 | should handle undefined parameter values gracefully | Line 174, catch block return |
| EC-04 | should pass undefined to constructor for missing params | Lines 143-144, map with undefined values |
| EC-05 | should handle context with single parameter | Minimal decorator case |
| EC-06 | should handle context with many parameters (5+) | Stress test parameter order |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if no metadata found (no decorators) | Line 135, first condition |
| EH-02 | should throw if metadata array is empty | Line 135, second condition |
| EH-03 | should throw if no paramtypes metadata (tsconfig issue) | Line 139, first condition |
| EH-04 | should throw if paramtypes array is empty | Line 139, second condition |
| EH-05 | should throw if metadata and paramtypes length mismatch | Line 141, partial decorator coverage |
| EH-06 | should enrich validation errors with context metadata | Lines 146-149, catch block with asLogMetadata |
| EH-07 | should call tracer.bugDetected for metadata errors | Lines 136, 140, 142 bugDetected calls |
| EH-08 | should call tracer.bugDetected for validation failures | Line 148, bugDetected with metadata |

### ContextFactory.getNodeParameter()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-08 | should extract parameter with extractValue option | Line 171, getNodeParameter call |
| BL-09 | should pass itemIndex 0 to getNodeParameter | Line 171, hardcoded 0 |
| BL-10 | should log debug messages during extraction | Lines 168, 172, debug calls |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-07 | should return undefined for non-existent parameter | Line 174, catch block return |
| EC-08 | should log debug message when parameter not found | Line 175, debug on error |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-09 | should catch and handle getNodeParameter exceptions | Lines 173-176, catch block |

## Test Data Structures

```typescript
// Mock context implementations for testing
class ValidContext implements IContext {
  constructor(
    @mapTo('param1') public readonly param1: string,
    @mapTo('param2', 'collection') public readonly param2: number
  ) {
    Object.freeze(this);
  }
  throwIfInvalid(): void {} // Valid - no errors
  asLogMetadata(): Record<string, unknown> {
    return { param1: this.param1, param2: this.param2 };
  }
}

class InvalidContext implements IContext {
  constructor(@mapTo('value') public readonly value: number) {
    Object.freeze(this);
  }
  throwIfInvalid(): void {
    throw new RangeError('Value out of range');
  }
  asLogMetadata(): Record<string, unknown> {
    return { value: this.value };
  }
}

class UnDecoratedContext implements IContext {
  constructor(public readonly param: string) {}
  throwIfInvalid(): void {}
  asLogMetadata(): Record<string, unknown> {
    return { param: this.param };
  }
}

class PartiallyDecoratedContext implements IContext {
  constructor(
    @mapTo('param1') public readonly param1: string,
    public readonly param2: string // Missing decorator!
  ) {}
  throwIfInvalid(): void {}
  asLogMetadata(): Record<string, unknown> {
    return { param1: this.param1, param2: this.param2 };
  }
}
```

## Mock Setup

```typescript
// Mock IFunctions
const mockFunctions = mock<IFunctions>();
mockFunctions.getNodeParameter.mockImplementation((key: string) => {
  // Return test data based on key
  const params: Record<string, unknown> = {
    'param1': 'test-value',
    'collection.param2': 42,
    'missing': undefined
  };
  return params[key];
});

// Mock Tracer
const mockTracer = mock<Tracer>();
mockTracer.debug.mockReturnValue(undefined);
mockTracer.bugDetected.mockImplementation((where, error) => {
  throw new Error(`Bug detected: ${error}`);
});
```

## Coverage Strategy

1. **Decorator metadata storage** (Lines 71-75):
   - Test single param (EC-01)
   - Test multiple params (BL-03)
   - Test with/without collection (BL-02, EC-01)

2. **Metadata validation** (Lines 133-142):
   - Test no metadata (EH-01)
   - Test empty metadata (EH-02)
   - Test no paramtypes (EH-03)
   - Test empty paramtypes (EH-04)
   - Test length mismatch (EH-05)

3. **Parameter extraction** (Lines 143-144, 161-177):
   - Test successful extraction (BL-04, BL-08)
   - Test dotted paths (BL-05)
   - Test missing params (EC-03, EC-07)
   - Test extraction errors (EH-09)

4. **Validation flow** (Lines 145-149):
   - Test successful validation (BL-06)
   - Test validation failure (EH-06, EH-08)

5. **Debug logging** (Lines 130, 151, 168, 172, 175):
   - Verify tracer.debug calls at each step
   - Verify tracer.bugDetected on errors

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (mapTo, ContextFactory, CONTEXT_PARAMETER)
- [x] All branches covered (100%): 8 conditional branches identified
- [x] All error paths tested: 9 error scenarios (EH-01 through EH-09)
- [x] ESLint considerations documented
- [x] Coverage ≥95% target for all metrics
- [x] Test data structures defined
- [x] Mock setup documented
