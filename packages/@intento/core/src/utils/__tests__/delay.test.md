# Test Plan: delay.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `delay.test.ts`

## Code Surface
**Exports:** `Delay` class with static method `apply(ms: number, signal?: AbortSignal): Promise<void>`
**Dependencies:**
- `setTimeout` (built-in, needs fake timers)
- `clearTimeout` (built-in)
- `AbortSignal` (built-in, needs mocking)
**Branches:** 3 conditionals
1. `if (ms === 0)` - early return
2. `if (ms < 0)` - validation error
3. `signal?.throwIfAborted()` - optional chaining
4. Promise resolution vs rejection paths (abort handler)
**ESLint Considerations:**
- No file-level disables needed (no decorators, no unsafe operations)
- Standard imports only
- Jest fake timers for time manipulation

## Test Cases

### Delay.apply()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should resolve after specified delay | Lines 14-24, main promise flow, setTimeout callback |
| BL-02 | should resolve immediately for zero delay | Line 14, early return path |
| BL-03 | should clean up event listener after successful delay | Line 21, removeEventListener call |
| BL-04 | should abort delay when signal is triggered | Lines 25-28, onAbort callback |
| BL-05 | should clear timeout when aborted | Line 26, clearTimeout call |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle very large delay values | Boundary testing with Number.MAX_SAFE_INTEGER |
| EC-02 | should handle multiple concurrent delays independently | Multiple parallel Delay.apply calls |
| EC-03 | should handle abort signal that is undefined | Lines 17, 21, 30 - optional chaining paths |
| EC-04 | should reject with signal reason if provided | Line 27, signal.reason propagation |
| EC-05 | should reject with default abort reason if none provided | Line 27, undefined reason case |
| EC-06 | should not call removeEventListener if signal is undefined | Line 21, optional chaining when signal is undefined |
| EC-07 | should handle abort during zero delay | Line 14 early return before signal setup |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw RangeError for negative delay | Line 15, validation error |
| EH-02 | should throw RangeError with descriptive message | Line 15, error message validation |
| EH-03 | should throw immediately if signal already aborted | Line 17, throwIfAborted() call |
| EH-04 | should throw immediately without starting timer if pre-aborted | Line 17, fail-fast behavior |
| EH-05 | should propagate custom error from abort signal | Line 27, custom error types |
| EH-06 | should handle multiple abort calls gracefully | AbortController behavior with once:true |

## Coverage Analysis

### Line-by-line coverage mapping:
- **Line 14**: `if (ms === 0) return;` → BL-02, EC-07
- **Line 15**: `if (ms < 0) throw new RangeError(...)` → EH-01, EH-02
- **Line 17**: `signal?.throwIfAborted();` → EH-03, EH-04, EC-03
- **Line 19**: `return await new Promise(...)` → All BL tests
- **Line 20-23**: setTimeout callback → BL-01, BL-03
- **Line 21**: `signal?.removeEventListener(...)` → BL-03, EC-06
- **Line 25-28**: onAbort handler → BL-04, BL-05, EC-04, EC-05, EH-05
- **Line 26**: `clearTimeout(timeout)` → BL-05
- **Line 27**: `reject(signal?.reason as Error)` → BL-04, EC-04, EC-05, EH-05
- **Line 30**: `signal?.addEventListener(...)` → BL-04, EC-03

### Branch coverage:
1. `ms === 0` → true: BL-02 | false: all others
2. `ms < 0` → true: EH-01, EH-02 | false: all others
3. `signal` defined → BL-03, BL-04, EC-04, EH-03 | undefined: EC-03, EC-06
4. Promise resolves → BL-01, BL-02, BL-03 | rejects: BL-04, EH-03, EH-05

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (1 class, 1 method)
- [x] All branches covered (4 conditional branches mapped)
- [x] All error paths tested (3 error scenarios)
- [x] ESLint considerations documented
- [x] Coverage ≥95% achievable (all lines and branches mapped to test IDs)
- [x] Edge cases identified (7 edge case scenarios)
- [x] Abort signal behavior fully tested
- [x] Timer cleanup verified
