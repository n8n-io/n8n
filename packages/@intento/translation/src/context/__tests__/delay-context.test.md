# Test Plan: delay-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `delay-context.test.ts`

## Code Surface

**Exports:**
- `DelayContext` class (IContext implementation)
- `CONTEXT_DELAY` constant (INodeProperties array)
- `DelayMode` type

**Dependencies:**
- `intento-core` - `IContext` interface, `mapTo` decorator
- `n8n-workflow` - `INodeProperties` type
- No external APIs, DB, or I/O (pure logic)

**Branches:**
- Constructor: None (simple assignment)
- `throwIfInvalid()`: 4 switch cases (noDelay, randomDelay, fixedDelay, default) + 4 boundary checks
- `calculateDelay()`: 3 switch cases (noDelay, randomDelay, fixedDelay) + default

**ESLint Considerations:**
- Minimal ESLint issues expected (pure TS, no unsafe operations)
- Test frozen object with type assertion for property modification
- CONTEXT_DELAY property access needs type assertions for options array

## Test Cases

### DelayContext Class

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create context with noDelay mode | Constructor, noDelay assignment |
| BL-02 | should create context with fixedDelay mode | Constructor, fixedDelay assignment |
| BL-03 | should create context with randomDelay mode | Constructor, randomDelay assignment |
| BL-04 | should freeze instance after construction | Object.freeze() call in constructor |
| BL-05 | should calculate delay of 0ms for noDelay mode | calculateDelay() noDelay case |
| BL-06 | should calculate exact delay for fixedDelay mode | calculateDelay() fixedDelay case |
| BL-07 | should calculate random delay between 0 and delayValue for randomDelay mode | calculateDelay() randomDelay case, Math.random() |
| BL-08 | should validate successfully for noDelay mode without delayValue | throwIfInvalid() noDelay case, early return |
| BL-09 | should validate successfully for fixedDelay with valid delayValue | throwIfInvalid() fixedDelay case, all validations pass |
| BL-10 | should validate successfully for randomDelay with valid delayValue | throwIfInvalid() randomDelay case, all validations pass |
| BL-11 | should return correct log metadata | asLogMetadata() returns both properties |
| BL-12 | should return log metadata with undefined delayValue for noDelay | asLogMetadata() with undefined value |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle minimum valid delayValue (100ms) | Boundary value at min threshold |
| EC-02 | should return 0 for invalid delayMode in calculateDelay (defensive code) | Default branch in calculateDelay() switch |
| EC-03 | should handle maximum valid delayValue (60000ms) | Boundary value at max threshold |
| EC-04 | should handle randomDelay with minimum value | Random calculation with min boundary |
| EC-05 | should handle randomDelay with maximum value | Random calculation with max boundary |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when fixedDelay mode has no delayValue | throwIfInvalid() !delayValue check for fixedDelay |
| EH-02 | should throw when randomDelay mode has no delayValue | throwIfInvalid() !delayValue check for randomDelay |
| EH-03 | should throw when delayValue is below minimum (100ms) | throwIfInvalid() min boundary check |
| EH-04 | should throw when delayValue is above maximum (60000ms) | throwIfInvalid() max boundary check |
| EH-05 | should throw when delayMode is invalid | throwIfInvalid() default case |
| EH-06 | should throw when delayValue is 0 | Edge of min boundary validation |
| EH-07 | should throw when delayValue is negative | Below min boundary validation |

### CONTEXT_DELAY Node Properties

#### Node Properties (NP-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| NP-01 | should export delay mode property with correct configuration | CONTEXT_DELAY[0] structure verification |
| NP-02 | should have three delay mode options | Options array length |
| NP-03 | should have noDelay option configured correctly | Options[0] structure |
| NP-04 | should have randomDelay option configured correctly | Options[1] structure |
| NP-05 | should have fixedDelay option configured correctly | Options[2] structure |
| NP-06 | should export delay value property with correct configuration | CONTEXT_DELAY[1] structure, typeOptions |
| NP-07 | should only show delay value when randomDelay or fixedDelay selected | displayOptions.show configuration |
| NP-08 | should export exactly two properties | Array length verification |

## Coverage Analysis

**Lines of executable code:** ~80 lines
**Expected test count:** 32 tests
**Coverage areas:**
- Constructor + Object.freeze: 3 tests (BL-01 to BL-04)
- calculateDelay() method: 5 tests (BL-05 to BL-07, EC-02)
- throwIfInvalid() method: 10 tests (BL-08 to BL-10, EH-01 to EH-07)
- asLogMetadata() method: 2 tests (BL-11, BL-12)
- Edge cases: 5 tests (EC-01 to EC-05)
- CONTEXT_DELAY constant: 8 tests (NP-01 to NP-08)

**Branch coverage:**
- throwIfInvalid() switch: All 4 cases covered (noDelay, randomDelay, fixedDelay, default)
- calculateDelay() switch: All 4 cases covered (noDelay, randomDelay, fixedDelay, default) via EC-02
- Boundary validations: All covered (min, max, missing value)

**Error path coverage:**
- All 4 error messages in throwIfInvalid() tested
- All validation conditions tested (missing value, too low, too high, invalid mode)

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (DelayContext, CONTEXT_DELAY, DelayMode)
- [x] All branches covered (100% - all switch cases and conditions including defensive default)
- [x] All error paths tested (all throw statements covered)
- [x] ESLint considerations documented (minimal issues expected)
- [x] Coverage 100% achieved (statements, branches, functions, lines)
- [x] Node properties configuration validated
- [x] Random behavior tested with multiple iterations
- [x] Frozen object immutability verified
- [x] Defensive code in calculateDelay() default case covered

## Implementation Notes

1. **Random delay testing:** Use multiple iterations (50+) to verify randomness and ensure values fall within expected range
2. **Frozen object:** Use type assertion to test that property modification throws
3. **Type assertions:** CONTEXT_DELAY properties need casting for deep property access in tests
4. **No mocking needed:** Pure functions, no external dependencies to mock
5. **Deterministic tests:** All tests except randomDelay are fully deterministic
6. **Math.random() variance:** Random delay test verifies distribution, not exact values
7. **Defensive code coverage:** EC-02 tests the default case in calculateDelay() by creating context with invalid mode (bypasses throwIfInvalid)
8. **EH-06 note:** Value 0 is falsy, so triggers "required" error before boundary check - test expects correct error message
