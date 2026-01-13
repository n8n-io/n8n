# Test Plan: delay-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `delay-context.test.ts`

## Code Surface
**Exports:**
- `DelayContext` (class implementing IContext)
- `DelayMode` (type)
- `CONTEXT_DELAY` (INodeProperties array - UI configuration, no tests needed)

**Dependencies:**
- `mapTo` decorator from intento-core (needs Reflect.getMetadata mocking)
- `IContext` interface contract (throwIfInvalid, asLogMetadata)
- `Math.random()` for randomDelay mode (needs mocking for deterministic tests)

**Branches:**
- L54: `switch (this.delayMode)` - 4 cases (NO_DELAY, RANDOM_DELAY, FIXED_DELAY, default)
- L56-63: validation switch with early return, two mode cases, default
- L82: `switch (this.delayMode)` - 4 cases for calculateDelay
- L58-59: `if (!this.delayValue)` - missing value check
- L60-61: `if (this.delayValue < min)` - lower boundary
- L62-63: `if (this.delayValue > max)` - upper boundary

**ESLint Considerations:**
- Type assertions needed for decorator metadata mocks
- Mock Math.random() for deterministic randomDelay tests
- Import order: external (intento-core) → implementation

## Test Strategy

Mock `@mapTo` decorator by setting up `Reflect.getMetadata` to return parameter keys.
Mock `Math.random()` for predictable randomDelay calculations.
Test all validation branches and calculateDelay modes.

## Test Cases

### DelayContext

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should construct with noDelay mode and no value | Lines 38-44, constructor + freeze |
| BL-02 | should construct with fixedDelay mode and value | Lines 38-44, full construction |
| BL-03 | should construct with randomDelay mode and value | Lines 38-44, mode variation |
| BL-04 | should be immutable after construction | Line 43, Object.freeze validation |
| BL-05 | should return correct log metadata | Lines 68-72, asLogMetadata |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle delayValue at minimum boundary (100) | Line 60, boundary check |
| EC-02 | should handle delayValue at maximum boundary (60000) | Line 62, boundary check |
| EC-03 | should calculate zero delay for noDelay mode | Line 84, NO_DELAY case |
| EC-04 | should calculate exact delay for fixedDelay mode | Line 89, FIXED_DELAY case |
| EC-05 | should calculate random delay within range [0, delayValue) | Lines 86-88, RANDOM_DELAY case |
| EC-06 | should return 0 for unknown delay mode | Line 92, default case |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw Error if delayValue missing for randomDelay | Line 59, validation error |
| EH-02 | should throw Error if delayValue missing for fixedDelay | Line 59, validation error |
| EH-03 | should throw RangeError if delayValue below minimum (100) | Line 61, lower bound |
| EH-04 | should throw RangeError if delayValue above maximum (60000) | Line 63, upper bound |
| EH-05 | should throw Error for invalid delayMode string | Line 65, default case |
| EH-06 | should not throw for noDelay mode without value | Line 56, early return |

#### Metadata & Data (MD-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| MD-01 | should include both mode and value in log metadata | Lines 68-72, full metadata |
| MD-02 | should include undefined delayValue in metadata when not provided | Lines 68-72, partial metadata |

## Implementation Notes

### Mock Setup Pattern
```typescript
// Mock @mapTo decorator
jest.spyOn(Reflect, 'getMetadata').mockImplementation((key, target, propertyKey) => {
  if (key === 'design:paramtypes') return [String, Number];
  if (key === 'custom:mapTo') {
    if (propertyKey === undefined) return ['delay_context_delay_mode', 'delay_context_delay_value'];
  }
  return undefined;
});

// Mock Math.random for deterministic tests
jest.spyOn(Math, 'random').mockReturnValue(0.5); // Returns 50% of delayValue
```

### Random Delay Test Strategy
Test multiple random values to ensure range:
- 0.0 → should return 0 (floor of 0)
- 0.5 → should return floor(delayValue * 0.5)
- 0.999 → should return floor(delayValue * 0.999) < delayValue

### Validation Order Testing
Ensure validation checks in correct order:
1. Mode-specific checks (noDelay early return)
2. Value presence check
3. Range checks (min, max)
4. Unknown mode check

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (DelayContext, DelayMode)
- [x] All branches covered (6 conditional branches)
- [x] All error paths tested (5 error scenarios)
- [x] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
