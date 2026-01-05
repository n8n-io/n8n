# Test Plan: dry-run-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** 100% all metrics
**Test File:** `dry-run-context.test.ts`

## Code Surface

**Exports:**
- `DryRunContext` class (IContext implementation)
- `CONTEXT_DRY_RUN` constant (INodeProperties array)
- `DryRunMode` type

**Dependencies:**
- `intento-core` - `IContext` interface, `mapTo` decorator
- `n8n-workflow` - `INodeProperties` type
- No external APIs, DB, or I/O (pure logic)

**Branches:**
- Constructor: None (simple assignment)
- `throwIfInvalid()`: 3 switch cases (pass, override, fail) + multiple validation conditions per mode
  - pass mode: 1 condition (no extra fields)
  - override mode: 2 conditions (override required, no error fields)
  - fail mode: 3 conditions (errorCode required, errorMessage required, no override)

**ESLint Considerations:**
- Minimal ESLint issues expected (pure TS, no unsafe operations)
- Test frozen object with type assertion for property modification
- CONTEXT_DRY_RUN property access needs type assertions for options array

## Test Cases

### DryRunContext Class

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create context with pass mode | Constructor, pass mode assignment |
| BL-02 | should create context with override mode | Constructor, override mode with override text |
| BL-03 | should create context with fail mode | Constructor, fail mode with error details |
| BL-04 | should freeze instance after construction | Object.freeze() call in constructor |
| BL-05 | should validate successfully for pass mode without extra fields | throwIfInvalid() pass case, early return |
| BL-06 | should validate successfully for override mode with override text | throwIfInvalid() override case, all validations pass |
| BL-07 | should validate successfully for fail mode with error details | throwIfInvalid() fail case, all validations pass |
| BL-08 | should return correct log metadata for pass mode | asLogMetadata() with undefined extra fields |
| BL-09 | should return correct log metadata for override mode | asLogMetadata() with override text |
| BL-10 | should return correct log metadata for fail mode | asLogMetadata() with error details |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty string for override in override mode | Empty string validation |
| EC-02 | should handle minimum error code (100) | Boundary value at min |
| EC-03 | should handle maximum error code (599) | Boundary value at max |
| EC-04 | should handle empty error message in fail mode | Empty string for errorMessage |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when pass mode has override field set | Pass mode with override validation |
| EH-02 | should throw when pass mode has errorCode field set | Pass mode with errorCode validation |
| EH-03 | should throw when pass mode has errorMessage field set | Pass mode with errorMessage validation |
| EH-04 | should throw when pass mode has all extra fields set | Pass mode with all extra fields validation |
| EH-05 | should throw when override mode has no override text | Override mode missing override validation |
| EH-06 | should throw when override mode has errorCode set | Override mode with errorCode validation |
| EH-07 | should throw when override mode has errorMessage set | Override mode with errorMessage validation |
| EH-08 | should throw when override mode has both error fields set | Override mode with error fields validation |
| EH-09 | should throw when fail mode has no errorCode | Fail mode missing errorCode validation |
| EH-10 | should throw when fail mode has no errorMessage | Fail mode missing errorMessage validation |
| EH-11 | should throw when fail mode has override field set | Fail mode with override validation |
| EH-12 | should throw when fail mode missing both errorCode and errorMessage | Fail mode missing all required fields |

### CONTEXT_DRY_RUN Node Properties

#### Node Properties (NP-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| NP-01 | should export dry run mode property with correct configuration | CONTEXT_DRY_RUN[0] structure verification |
| NP-02 | should have three dry run mode options | Options array length |
| NP-03 | should have pass mode option configured correctly | Options[0] structure |
| NP-04 | should have override mode option configured correctly | Options[1] structure |
| NP-05 | should have fail mode option configured correctly | Options[2] structure |
| NP-06 | should export override response property with correct configuration | CONTEXT_DRY_RUN[1] structure |
| NP-07 | should only show override response when override mode selected | displayOptions.show configuration for override |
| NP-08 | should export error code property with correct configuration | CONTEXT_DRY_RUN[2] structure |
| NP-09 | should only show error code when fail mode selected | displayOptions.show configuration for errorCode |
| NP-10 | should export error message property with correct configuration | CONTEXT_DRY_RUN[3] structure |
| NP-11 | should only show error message when fail mode selected | displayOptions.show configuration for errorMessage |
| NP-12 | should export exactly four properties | Array length verification |

## Coverage Analysis

**Lines of executable code:** ~110 lines
**Expected test count:** 34 tests
**Coverage areas:**
- Constructor + Object.freeze: 4 tests (BL-01 to BL-04)
- throwIfInvalid() method: 19 tests (BL-05 to BL-07, EC-01 to EC-04, EH-01 to EH-12)
- asLogMetadata() method: 3 tests (BL-08 to BL-10)
- CONTEXT_DRY_RUN constant: 12 tests (NP-01 to NP-12)

**Branch coverage:**
- throwIfInvalid() switch: All 3 cases covered (pass, override, fail)
- Pass mode validations: All covered (override, errorCode, errorMessage, all combined)
- Override mode validations: All covered (missing override, errorCode set, errorMessage set, both set)
- Fail mode validations: All covered (missing errorCode, missing errorMessage, override set, all missing)

**Error path coverage:**
- All 9 unique error messages in throwIfInvalid() tested
- All validation conditions tested per mode
- Mutual exclusivity enforced and tested

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned (DryRunContext, CONTEXT_DRY_RUN, DryRunMode)
- [x] All branches covered (100% - all switch cases and validation conditions)
- [x] All error paths tested (all throw statements covered)
- [x] ESLint considerations documented (minimal issues expected)
- [x] Coverage 100% target for all metrics
- [x] Node properties configuration validated (4 properties)
- [x] Frozen object immutability verified
- [x] Mutual exclusivity of mode-specific fields validated

## Implementation Notes

1. **Mode validation:** Each mode has different required/forbidden fields - test all combinations
2. **Frozen object:** Use type assertion to test that property modification throws
3. **Type assertions:** CONTEXT_DRY_RUN properties need casting for deep property access in tests
4. **No mocking needed:** Pure functions, no external dependencies to mock
5. **Deterministic tests:** All tests are fully deterministic
6. **Empty strings:** Test empty string handling for override and errorMessage (valid edge cases)
7. **Error code bounds:** Test boundary values (100, 599) but don't validate in code (user responsibility)
8. **Mutual exclusivity:** Key design principle - fields for one mode must not be set for another mode
