# Test Plan: supply-error.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-error.test.ts`

## Code Surface
**Exports:** `SupplyError` (class)
**Dependencies:**
- `SupplyRequestBase` (need to mock concrete implementation)
- `Date.now()` (mock for deterministic latency)
- `INode` (mock for asError())
**Branches:**
- 4 conditionals in `throwIfInvalid()` (agentRequestId, supplyRequestId, reason empty checks, code range)
**ESLint Considerations:**
- Type assertions needed: `as SupplyRequestBase` for mock, `as INode` for mock
- Import order: types before implementations
- Mock setup for abstract base requires concrete test types

## Test Cases

### SupplyError

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy agentRequestId from request | Line 36, property assignment |
| BL-02 | should copy supplyRequestId from request | Line 37, property assignment |
| BL-03 | should calculate latencyMs from request timestamp | Line 39, Date.now() - requestedAt |
| BL-04 | should set code from constructor parameter | Line 40, code assignment |
| BL-05 | should set reason from constructor parameter | Line 41, reason assignment |
| BL-06 | should set isRetriable from constructor parameter | Line 42, isRetriable assignment |
| BL-07 | should return complete log metadata | Lines 66-73, asLogMetadata() |
| BL-08 | should return minimal data object | Lines 83-87, asDataObject() |
| BL-09 | should convert to NodeOperationError | Line 98, asError() |
| BL-10 | should pass validation with all valid fields | Line 54, throwIfInvalid() happy path |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle different HTTP status codes | Lines 40, various codes |
| EC-02 | should calculate different latencies for different timestamps | Line 39, multiple constructions |
| EC-03 | should preserve exact IDs from request | Lines 36-37, no transformation |
| EC-04 | should handle zero latency (same timestamp) | Line 39, edge case |
| EC-05 | should handle large latency values | Line 39, old timestamp |
| EC-06 | should handle isRetriable true and false | Line 42, boolean values |
| EC-07 | should handle boundary HTTP codes (100, 599) | Line 56, range validation edges |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw Error if agentRequestId is empty | Line 54, first condition |
| EH-02 | should throw Error if agentRequestId is whitespace | Line 54, trim() === '' |
| EH-03 | should throw Error if supplyRequestId is empty | Line 55, second condition |
| EH-04 | should throw Error if supplyRequestId is whitespace | Line 55, trim() === '' |
| EH-05 | should throw Error if reason is empty | Line 56, third condition |
| EH-06 | should throw Error if reason is whitespace | Line 56, trim() === '' |
| EH-07 | should throw RangeError if code is below 100 | Line 57, code < 100 |
| EH-08 | should throw RangeError if code is above 599 | Line 57, code > 599 |
| EH-09 | should throw Error if agentRequestId is undefined | Line 54, !agentRequestId |
| EH-10 | should throw Error if supplyRequestId is undefined | Line 55, !supplyRequestId |
| EH-11 | should throw Error if reason is undefined | Line 56, !reason |
| EH-12 | should allow construction without validation | Constructor doesn't validate |

## Implementation Notes

### Mock Setup
- Mock `Date.now()` for deterministic latency testing
- Create mock `SupplyRequestBase` instances with known IDs and timestamp
- Create mock `INode` for asError() testing

### Coverage Focus
- Constructor: all 6 property assignments, latencyMs calculation
- throwIfInvalid: all 4 validation branches (3 field checks + code range)
- asLogMetadata: returns all 6 fields
- asDataObject: returns 3 fields (code, reason, latencyMs)
- asError: creates NodeOperationError with reason
- Edge cases: HTTP code boundaries, latency extremes, boolean values

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All error paths tested
- [x] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] TypeScript compiles
