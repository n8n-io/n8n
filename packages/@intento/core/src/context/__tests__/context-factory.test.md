# Test Plan: context-factory.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `context-factory.test.ts`

---

## 1. Code Analysis

### 1.1 Exports
- `CONTEXT_PARAMETER` - Symbol for metadata storage
- `mapTo(key, collection?)` - Parameter decorator function
- `ContextFactory` - Static factory class with:
  - `read<T>(context, functions, tracer)` - Public factory method
  - `getNodeParameter(...)` - Private parameter extraction
  - `throwIfInvalid(...)` - Private validation

### 1.2 Branches & Decision Points

**mapTo decorator (lines 57-66):**
- Line 61: `!Array.isArray(existing)` - metadata corruption check
- Line 64: `collection ? '${collection}.${key}' : key` - nested parameter path

**ContextFactory.read (lines 130-148):**
- Line 135: `!Array.isArray(meta) || meta.length === 0` - metadata validation
- Line 138: `!Array.isArray(paramTypes) || paramTypes.length === 0` - type metadata validation
- Line 140: `paramTypes.length !== meta.length` - partial mapping check

**getNodeParameter (lines 176-186):**
- Line 177-183: try/catch - parameter extraction error handling

**throwIfInvalid (lines 210-225):**
- Line 212-224: try/catch - context validation error handling

### 1.3 Edge Cases
- Empty metadata array
- Non-array metadata (corrupted)
- Missing TypeScript metadata (emitDecoratorMetadata: false)
- Partial decorator coverage (not all params decorated)
- Missing node parameters (undefined)
- Nested parameters (dot notation)
- Context validation failures
- Multiple parameters (order preservation)
- Single parameter contexts
- No parameters (edge case)

### 1.4 Dependencies to Mock
- `IFunctions` (n8n workflow functions)
  - `getNodeParameter(key, index, fallback, options)`
- `Tracer` (logging and error handling)
  - `debug(message)`
  - `errorAndThrow(message, meta?)`
- `IContext` implementations
  - `throwIfInvalid()`
  - `asLogMetadata()`
- `Reflect` (metadata API)
  - `getMetadata(key, target)`
  - `defineMetadata(key, value, target)`

---

## 2. Test Cases

### BL: Business Logic (Happy Paths)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create context with single parameter | Lines 130-148, happy path with 1 param |
| BL-02 | should create context with multiple parameters | Lines 130-148, preserves param order |
| BL-03 | should handle nested parameters with collection | Line 64 left branch (collection path) |
| BL-04 | should extract parameters in correct order | Lines 143, decorator reversal handling |
| BL-05 | should call context validation after construction | Line 146, validation hook |
| BL-06 | should log debug messages during execution | Lines 131, 147, tracer.debug calls |
| BL-07 | should resolve node parameters with extractValue | Line 179, getNodeParameter options |

### EC: Edge Cases (Boundaries & Unusual Valid Inputs)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle missing optional parameter | Lines 184-185, catch block returns undefined |
| EC-02 | should handle parameter with dot notation | Line 64, collection with nested key |
| EC-03 | should handle context with many parameters (5+) | Lines 143, map over large array |
| EC-04 | should preserve metadata across multiple decorators | Line 63, metadata accumulation |
| EC-05 | should handle undefined node parameter value | Line 180, getNodeParameter returns undefined |
| EC-06 | should call getNodeParameter with correct args | Line 179, index=0, extractValue=true |

### EH: Error Handling (Validation Failures & Errors)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if metadata is not an array | Line 61, mapTo decorator validation |
| EH-02 | should throw if no metadata found | Line 135, first condition (undefined) |
| EH-03 | should throw if metadata array is empty | Line 135, second condition (length === 0) |
| EH-04 | should throw if no type metadata found | Line 138, first condition |
| EH-05 | should throw if type metadata array is empty | Line 138, second condition |
| EH-06 | should throw if partial decorator coverage | Line 140, length mismatch |
| EH-07 | should throw if context validation fails | Lines 212-224, throwIfInvalid error |
| EH-08 | should enrich validation error with context metadata | Lines 217-222, error enrichment |
| EH-09 | should log error before throwing in throwIfInvalid | Line 223, tracer.errorAndThrow |
| EH-10 | should include childError in enriched metadata | Line 221, childError field |

---

## 3. Test Structure

### 3.1 Test Organization

```typescript
describe('ContextFactory', () => {
  // Setup and fixtures

  describe('@mapTo decorator', () => {
    describe('business logic', () => {
      // BL-03, BL-04
    });

    describe('error handling', () => {
      // EH-01
    });
  });

  describe('ContextFactory.read', () => {
    describe('business logic', () => {
      // BL-01, BL-02, BL-05, BL-06, BL-07
    });

    describe('edge cases', () => {
      // EC-01, EC-02, EC-03, EC-04, EC-05, EC-06
    });

    describe('error handling', () => {
      // EH-02 through EH-10
    });
  });
});
```

### 3.2 Fixtures & Test Contexts

```typescript
// Valid test context classes
class SingleParamContext implements IContext {
  constructor(@mapTo('apiKey') public apiKey: string) {}
  throwIfInvalid() { if (!this.apiKey) throw new Error('apiKey required'); }
  asLogMetadata() { return { apiKey: this.apiKey }; }
}

class MultiParamContext implements IContext {
  constructor(
    @mapTo('apiKey') public apiKey: string,
    @mapTo('timeout') public timeout: number,
    @mapTo('retries') public retries: number
  ) {}
  throwIfInvalid() { /* validation */ }
  asLogMetadata() { return { apiKey: this.apiKey, timeout: this.timeout }; }
}

class NestedParamContext implements IContext {
  constructor(
    @mapTo('apiKey') public apiKey: string,
    @mapTo('timeout', 'options') public timeout: number
  ) {}
  throwIfInvalid() { /* validation */ }
  asLogMetadata() { return { apiKey: this.apiKey, timeout: this.timeout }; }
}

// Invalid context for validation testing
class InvalidContext implements IContext {
  constructor(@mapTo('apiKey') public apiKey: string) {}
  throwIfInvalid() { throw new Error('Invalid configuration'); }
  asLogMetadata() { return { apiKey: this.apiKey }; }
}

// Context without decorators (error case)
class NoDecoratorContext implements IContext {
  constructor(public apiKey: string) {}
  throwIfInvalid() {}
  asLogMetadata() { return {}; }
}

// Context with partial decorators (error case)
class PartialDecoratorContext implements IContext {
  constructor(
    @mapTo('apiKey') public apiKey: string,
    public timeout: number // Missing @mapTo
  ) {}
  throwIfInvalid() {}
  asLogMetadata() { return {}; }
}
```

### 3.3 Mock Setup

```typescript
let mockFunctions: jest.Mocked<IFunctions>;
let mockTracer: jest.Mocked<Tracer>;

beforeEach(() => {
  mockFunctions = {
    getNodeParameter: jest.fn(),
  } as any;

  mockTracer = {
    debug: jest.fn(),
    errorAndThrow: jest.fn((msg) => { throw new CoreError(msg); }),
  } as any;
});
```

---

## 4. Coverage Mapping

### 4.1 Line Coverage

| Lines | Test IDs | Description |
|-------|----------|-------------|
| 57-66 | BL-03, EC-02, EC-04, EH-01 | mapTo decorator logic |
| 130-148 | BL-01, BL-02, BL-05, BL-06, BL-07 | ContextFactory.read main flow |
| 135 | EH-02, EH-03 | Metadata validation |
| 138 | EH-04, EH-05 | Type metadata validation |
| 140 | EH-06 | Partial mapping check |
| 143 | BL-04, EC-03 | Parameter extraction loop |
| 146 | BL-05, EH-07 | Validation call |
| 176-186 | BL-07, EC-01, EC-05, EC-06 | getNodeParameter method |
| 177-183 | EC-01 | Try block |
| 184-185 | EC-01 | Catch block |
| 210-225 | EH-07, EH-08, EH-09, EH-10 | throwIfInvalid method |

### 4.2 Branch Coverage

| Branch | True | False | Test IDs |
|--------|------|-------|----------|
| `!Array.isArray(existing)` (61) | EH-01 | BL-01 | Metadata type check |
| `collection ? ... : ...` (64) | BL-03, EC-02 | BL-01 | Nested param path |
| `!Array.isArray(meta) \|\| meta.length === 0` (135) | EH-02, EH-03 | BL-01 | Metadata presence |
| `!Array.isArray(paramTypes) \|\| paramTypes.length === 0` (138) | EH-04, EH-05 | BL-01 | Type metadata presence |
| `paramTypes.length !== meta.length` (140) | EH-06 | BL-01 | Length match |
| try/catch in getNodeParameter (177-185) | BL-07 | EC-01 | Parameter extraction |
| try/catch in throwIfInvalid (212-224) | BL-05 | EH-07 | Validation |

---

## 5. Implementation Notes

### 5.1 Test Setup Considerations

1. **Reflect Metadata Simulation:**
   - Cannot mock Reflect.getMetadata directly (native API)
   - Must create real context classes with decorators applied
   - Decorators execute at class definition time
   - Test different decorator patterns via class fixtures

2. **Metadata State:**
   - Each test context class has its own metadata
   - No cleanup needed between tests (metadata is class-bound)
   - Error cases require classes without decorators or partial decorators

3. **Mock Interactions:**
   - `mockFunctions.getNodeParameter` called once per parameter
   - `mockTracer.debug` called at specific points (start, param fetch, success)
   - `mockTracer.errorAndThrow` called for all validation failures

### 5.2 Test Data Strategy

**Valid Parameter Values:**
```typescript
const validParams = {
  apiKey: 'test-api-key-123',
  timeout: 5000,
  retries: 3,
  'options.timeout': 10000, // Nested parameter
};
```

**Invalid Scenarios:**
- Context validation failure (throwIfInvalid throws)
- Missing required parameters (getNodeParameter throws)
- Metadata corruption (non-array metadata)
- Partial decorator coverage (some params without @mapTo)

### 5.3 Assertion Patterns

**Success Cases:**
```typescript
expect(result).toBeInstanceOf(SingleParamContext);
expect(result.apiKey).toBe('test-api-key-123');
expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith(
  'apiKey', 0, undefined, { extractValue: true }
);
expect(mockTracer.debug).toHaveBeenCalledTimes(3); // start, fetch, success
```

**Error Cases:**
```typescript
expect(() => ContextFactory.read(...)).toThrow(CoreError);
expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(
  expect.stringContaining('🐞 [BUG]'),
  expect.any(Object)
);
```

---

## 6. Success Criteria

- ✅ All 23 test cases implemented
- ✅ Coverage ≥95% for branches, functions, lines, statements
- ✅ All tests pass with `pnpm test`
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Proper use of ARRANGE/ACT/ASSERT pattern
- ✅ Meaningful test descriptions matching BL/EC/EH IDs
- ✅ Mock verification for all external dependencies
