# Test Plan: context-factory.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `context-factory.test.ts`

## Code Surface

**Exports:**
- `CONTEXT_PARAMETER` - Symbol for metadata key
- `mapTo()` - Parameter decorator function
- `ContextFactory` - Static factory class with `read()` method

**Dependencies:**
- `Reflect.getMetadata()` / `Reflect.defineMetadata()` - Needs mocking for metadata access
- `IFunctions.getNodeParameter()` - Mock n8n functions interface
- `Tracer` - Mock tracer for debug/error logging
- Context constructors with `@mapTo` decorators - Test implementations needed

**Branches:**
- `mapTo()`: 1 conditional (collection ternary)
- `ContextFactory.read()`: 4 conditionals (metadata checks, validation)
- `getNodeParameter()`: 1 try/catch

**Edge Cases:**
- Missing metadata (no decorators applied)
- Empty metadata array
- Partial metadata (decorator count mismatch)
- Missing TypeScript type metadata (emitDecoratorMetadata disabled)
- Parameter not found in n8n node
- Context validation failure
- Decorator parameter order preservation (3+ parameters)
- Collection vs flat parameter extraction

**Mock Strategies:**
- Use `jest.spyOn(Reflect, 'getMetadata')` for metadata reading
- Use `jest.spyOn(Reflect, 'defineMetadata')` for decorator testing
- Mock `IFunctions` with `jest-mock-extended`
- Mock `Tracer` with `jest-mock-extended`, verify `bugDetected()` calls
- Create test context classes with `@mapTo` decorators

## Test Cases

### CONTEXT_PARAMETER Symbol

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should export unique Symbol | Symbol uniqueness |

### mapTo() Decorator

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-02 | should store flat parameter mapping | Line 38-40, no collection |
| BL-03 | should store collection parameter mapping | Line 38-40, with collection |
| BL-04 | should accumulate metadata for multiple parameters | Line 38-40, prepend behavior |
| BL-05 | should preserve parameter order (left-to-right) | Decorator execution order |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle missing existing metadata (first param) | Line 37, nullish coalescing |

### ContextFactory.read()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-06 | should create valid context from node parameters | Lines 68-88, happy path |
| BL-07 | should extract flat parameters correctly | getNodeParameter without dots |
| BL-08 | should extract collection parameters correctly | getNodeParameter with dots |
| BL-09 | should call throwIfInvalid on created instance | Line 81 |
| BL-10 | should return validated context instance | Line 87 return |
| BL-11 | should log debug messages during creation | tracer.debug calls |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-02 | should use undefined for missing node parameters | getNodeParameter catch block |
| EC-03 | should trigger default parameter values | Constructor defaults with undefined |
| EC-04 | should handle 3+ parameters in correct order | Parameter ordering |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should call bugDetected if no metadata found | Lines 70-72, empty array |
| EH-02 | should call bugDetected if metadata not array | Lines 70-72, wrong type |
| EH-03 | should call bugDetected if metadata length zero | Lines 70-72, empty array |
| EH-04 | should call bugDetected if no type metadata | Lines 75-77, emitDecoratorMetadata check |
| EH-05 | should call bugDetected if type metadata not array | Lines 75-77, wrong type |
| EH-06 | should call bugDetected if paramTypes length zero | Lines 75-77, empty array |
| EH-07 | should call bugDetected if metadata/paramTypes mismatch | Lines 78-79 |
| EH-08 | should call bugDetected on context validation failure | Lines 82-84, throwIfInvalid throws |
| EH-09 | should include context metadata in bugDetected call | Line 83, asLogMetadata |

### getNodeParameter()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-12 | should extract parameter with extractValue option | Line 105, functions.getNodeParameter |
| BL-13 | should return parameter value on success | Line 106 return |
| BL-14 | should log debug on successful fetch | tracer.debug calls |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-05 | should return undefined when parameter missing | Lines 108-110, catch block |
| EC-06 | should log debug on fetch failure | Line 110, tracer.debug in catch |

## Mock Setup Details

### Test Context Classes
```typescript
// Simple test context with flat parameters
class SimpleContext implements IContext {
  constructor(
    @mapTo('key1') public value1: string,
    @mapTo('key2') public value2: number
  ) {}
  throwIfInvalid(): void {}
  asLogMetadata() { return { value1: this.value1, value2: this.value2 }; }
}

// Complex context with collection parameters
class ComplexContext implements IContext {
  constructor(
    @mapTo('nested_key', 'collection_name') public nested: string,
    @mapTo('flat_key') public flat: string
  ) {}
  throwIfInvalid(): void {}
  asLogMetadata() { return { nested: this.nested, flat: this.flat }; }
}

// Invalid context that throws on validation
class InvalidContext implements IContext {
  constructor(@mapTo('key') public value: string) {}
  throwIfInvalid(): void { throw new Error('Validation failed'); }
  asLogMetadata() { return { value: this.value }; }
}
```

### Reflect Metadata Mocking
```typescript
jest.spyOn(Reflect, 'getMetadata')
  .mockImplementation((key, target) => {
    if (key === CONTEXT_PARAMETER) return ['key1', 'key2'];
    if (key === 'design:paramtypes') return [String, Number];
    return undefined;
  });
```

### IFunctions Mocking
```typescript
const mockFunctions = mock<IFunctions>();
mockFunctions.getNodeParameter.mockImplementation((key) => {
  if (key === 'key1') return 'value1';
  if (key === 'key2') return 42;
  throw new Error('Parameter not found');
});
```

### Tracer Mocking
```typescript
const mockTracer = mock<Tracer>();
// Verify bugDetected was called
expect(mockTracer.bugDetected).toHaveBeenCalledWith(
  expect.stringContaining('SimpleContext'),
  expect.any(Error),
  expect.any(Object)
);
```

## Coverage Goals

- **Statements:** ≥95%
- **Branches:** 100% (all conditionals tested)
- **Functions:** 100% (mapTo, read, getNodeParameter)
- **Lines:** ≥95%

## Risk Areas

1. **Reflection API behavior** - Metadata might not be properly stored/retrieved
2. **Decorator execution order** - Bottom-to-top execution must preserve parameter order
3. **Type metadata availability** - Depends on emitDecoratorMetadata compiler option
4. **Error propagation** - bugDetected should be called but never throw from read()
5. **Parameter extraction** - Collection dot notation must be handled correctly

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All error paths tested
- [x] Mock strategies documented
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Tests implemented in context-factory.test.ts
- [x] All tests passing (29/29 tests)
- [x] TypeScript/ESLint compliance verified
- [x] 100% coverage achieved: 32/32 statements, 15/15 branches, 5/5 functions, 31/31 lines
