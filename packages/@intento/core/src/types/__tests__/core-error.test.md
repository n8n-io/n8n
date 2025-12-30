# Test Plan: core-error.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `core-error.test.ts`

## Code Surface
**Exports:** `CoreError` (class extending Error)
**Dependencies:** 
- `n8n-workflow` (LogMetadata type import only, no runtime dependency)
- None (pure JavaScript Error class, no mocking needed)

**Branches:** 1 conditional (metadata optional parameter)
**ESLint Considerations:**
- No disables needed (simple class with standard Error patterns)
- Type imports already properly structured
- No complex type assertions required

## Test Cases

### CoreError Class

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create error with message only | Lines 85-88, constructor without metadata |
| BL-02 | should create error with message and metadata | Lines 85-88, constructor with metadata |
| BL-03 | should set error name to 'Intento Core Error' | Line 87, name property |
| BL-04 | should extend Error class | Inheritance verification |
| BL-05 | should preserve error stack trace | Error.stack property from super() |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty metadata object | Line 88, metadata = {} |
| EC-02 | should handle metadata with nested objects | LogMetadata complex structure |
| EC-03 | should be instance of Error and CoreError | instanceof checks for error discrimination |
| EC-04 | should work with Error.cause property | Standard Error chaining |
| EC-05 | should preserve message exactly as provided | Line 86, no message transformation |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should be catchable with try-catch | Standard error throwing |
| EH-02 | should be throwable and rejectable | Promise rejection compatibility |
| EH-03 | should maintain instanceof CoreError after throw | Runtime type checking pattern |

## Coverage Strategy

**Constructor paths:**
- With metadata: `new CoreError(message, metadata)` → BL-02
- Without metadata: `new CoreError(message)` → BL-01

**Property access:**
- `error.message` → BL-05, EC-05
- `error.name` → BL-03
- `error.metadata` → BL-02, EC-01, EC-02
- `error.stack` → BL-05

**Type checking:**
- `error instanceof CoreError` → EC-03, EH-03
- `error instanceof Error` → BL-04, EC-03

**Real-world patterns:**
- Throwing and catching → EH-01
- Promise rejection → EH-02
- Error discrimination (instanceof) → EH-03
- Error chaining with cause → EC-04

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified (CoreError class)
- [x] All branches covered (constructor with/without metadata)
- [x] All error paths tested (throw, catch, reject patterns)
- [x] ESLint considerations documented (none needed)
- [x] Coverage target ≥95% all metrics
- [ ] Tests implemented in core-error.test.ts
- [ ] All tests passing
- [ ] Coverage validated with pnpm jest --coverage

## Implementation Notes

**No mocking needed** - CoreError is a pure class with no external dependencies.

**Key testing patterns:**
1. Direct instantiation: `new CoreError(message, metadata)`
2. Throw/catch: `try { throw error; } catch (e) { expect(e).toBeInstanceOf(CoreError); }`
3. Property validation: Direct property access for message, name, metadata, stack
4. Type checking: instanceof for both CoreError and Error classes

**Metadata examples for tests:**
```typescript
// Simple metadata
{ traceId: 'abc-123', nodeName: 'TestNode' }

// Complex metadata (nested - verify preservation)
{ traceId: 'abc-123', config: { timeout: 5000, retries: 3 } }

// Empty metadata
{}
```
