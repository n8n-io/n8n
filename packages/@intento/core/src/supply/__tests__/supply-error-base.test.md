# Test Plan: supply-error-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-error-base.test.ts`

## Code Surface
**Exports:** SupplyErrorBase (abstract class)
**Dependencies:**
- SupplyRequestBase (mock concrete subclass)
- Date.now() (spy for latency control)
- INode, NodeOperationError (mock for asError testing)

**Branches:** 0 conditionals (abstract base class with straight-line constructor)
**ESLint Considerations:**
- Import order: jest-mock-extended before type imports
- Type safety: Create concrete test subclass to test abstract class
- No unsafe assignments needed (mock types are concrete)

## Test Cases

### SupplyErrorBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should initialize requestId from request | Line 57, property assignment |
| BL-02 | should calculate latencyMs from request timestamp | Lines 58-59, Date.now() - request.requestedAt |
| BL-03 | should initialize code from parameter | Line 60, property assignment |
| BL-04 | should initialize reason from parameter | Line 61, property assignment |
| BL-05 | should copy requestId from request object | Line 57, correlation pattern |
| BL-06 | should implement ITraceable interface | Interface contract |
| BL-07 | should implement IDataProvider interface | Interface contract |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle zero latency when error immediate | Lines 58-59, Date.now() === request.requestedAt |
| EC-02 | should handle large latency values | Lines 58-59, multi-second delays |
| EC-03 | should preserve negative error codes | Line 60, code can be negative |
| EC-04 | should handle empty reason string | Line 61, reason = '' |
| EC-05 | should handle very long reason strings | Line 61, reason with 1000+ chars |
| EC-06 | should have readonly properties | Property immutability |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should require concrete implementations of asLogMetadata | Abstract method contract |
| EH-02 | should require concrete implementations of asExecutionData | Abstract method contract |
| EH-03 | should require concrete implementations of asError | Abstract method contract |

## Mock Strategy

### Concrete Test Subclass
Create `TestSupplyError` extending `SupplyErrorBase` with:
- Simple implementations of abstract methods
- Return predictable values for assertions
- Preserve all base class behavior

### Mock SupplyRequestBase
Create `TestSupplyRequest` extending `SupplyRequestBase` with:
- Controllable requestId and requestedAt
- Simple implementations of abstract methods

### Spy Date.now()
- Control time for latency calculation tests
- Verify latency formula: Date.now() - request.requestedAt

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified (SupplyErrorBase abstract class)
- [x] All branches covered (0 branches, straight-line code)
- [x] All properties tested (requestId, latencyMs, code, reason)
- [x] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] Tests pass TypeScript and ESLint checks
