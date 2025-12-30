# Test Plan: delay.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `delay.test.ts`

## Code Surface
**Exports:** `Delay` class with static method `apply(ms: number, signal?: AbortSignal): Promise<void>`
**Dependencies:** AbortSignal (Web API), setTimeout, clearTimeout, addEventListener, removeEventListener
**Branches:** 3 main conditionals (line 31: `if (ms === 0)`, line 34: `if (ms < 0)`, line 37: `signal?.throwIfAborted()`) + Promise executor with abort handling
**ESLint Considerations:**
- No file-level disables needed
- Use fake timers for deterministic timeout testing
- AbortController for signal testing

## Test Cases

### Delay.apply

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should resolve after specified delay without signal | Lines 39-54, normal completion path |
| BL-02 | should resolve immediately for 0ms delay | Line 31, early return optimization |
| BL-03 | should handle multiple concurrent delays independently | Parallel promise execution |
| BL-04 | should clean up timeout when completed normally | Lines 41-42, removeEventListener call |
| BL-05 | should clean up abort listener after timeout fires | Line 42, memory leak prevention |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should throw RangeError for negative delay | Lines 34-35, validation |
| EC-02 | should reject immediately if signal already aborted | Line 37, fail-fast check |
| EC-03 | should reject when signal aborts during delay | Lines 46-50, abort handler |
| EC-04 | should reject with signal reason when aborted | Line 49, error propagation |
| EC-05 | should handle signal without reason (undefined) | Line 49, as Error cast |
| EC-06 | should work with signal that never aborts | Optional signal path |
| EC-07 | should handle abort at exact moment timeout fires | Race condition edge case |
| EC-08 | should handle very long delays (boundary test) | Large ms values (e.g., 1 day) |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should clear timeout when abort fires | Line 48, clearTimeout call |
| EH-02 | should remove listener via once:true after abort | Line 53, automatic cleanup |
| EH-03 | should handle AbortError correctly | Error type and message verification |
| EH-04 | should not leak listeners on repeated delays | Memory leak verification |
| EH-05 | should handle invalid delay values gracefully | Type coercion edge cases |

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (Delay.apply)
- [x] All branches covered (100%): ms === 0, ms < 0, signal checks
- [x] All error paths tested (RangeError, AbortError)
- [x] ESLint considerations documented (fake timers, AbortController)
- [x] Coverage ≥95% (statements, branches, functions, lines)
