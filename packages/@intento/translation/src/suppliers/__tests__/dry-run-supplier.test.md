# Test Plan: dry-run-supplier.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `dry-run-supplier.test.ts`

## Code Surface
**Exports:** DryRunSupplier (class)
**Dependencies:**
- ContextFactory (for reading DelayContext and DryRunContext)
- Delay (for simulating latency)
- TranslationSupplierBase (parent class)
- IFunctions (n8n execution context)
**Branches:** 3 switch cases (pass, override, fail)
**ESLint Considerations:**
- No file-level disables needed
- Type-safe mocks for IFunctions, DelayContext, DryRunContext
- Import order: external → types → implementation

## Test Cases

### DryRunSupplier

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should extend TranslationSupplierBase | Class inheritance |
| BL-02 | should construct with connection and functions | Constructor, lines 31-38 |
| BL-03 | should read DelayContext during construction | Line 36 |
| BL-04 | should read DryRunContext during construction | Line 37 |
| BL-05 | should freeze instance after construction | Line 39 |
| BL-06 | should return original text in pass mode | Lines 58-60, switch case 'pass' |
| BL-07 | should return override text in override mode | Lines 61-63, switch case 'override' |
| BL-08 | should return error in fail mode | Lines 64-66, switch case 'fail' |
| BL-09 | should apply delay before processing | Lines 53-54 |
| BL-10 | should check abort signal before processing | Line 51 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle zero delay configuration | Delay calculation with 0ms |
| EC-02 | should preserve request metadata in responses | Response construction |
| EC-03 | should work with undefined from language | Request with no source language |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when signal is aborted | Line 51, signal?.throwIfAborted() |
| EH-02 | should respect signal during delay | Delay.apply with signal |

## Success Criteria
- [ ] Test plan created with author and date
- [ ] All exports identified and planned
- [ ] All branches covered (100% - 3 switch cases)
- [ ] All error paths tested (abort signal)
- [ ] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
