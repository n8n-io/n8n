# Test Plan: supply-request-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-request-base.test.ts`

## Code Surface
**Exports:** `SupplyRequestBase` (abstract class)
**Dependencies:**
- `AgentRequestBase` (need to mock concrete implementation)
- `crypto.randomUUID()` (mock for deterministic UUID)
- `Date.now()` (mock for deterministic timestamp)
**Branches:**
- 2 conditionals in `throwIfInvalid()` (agentRequestId, supplyRequestId empty checks)
**ESLint Considerations:**
- Type assertions needed: `as AgentRequestBase` for mock
- Import order: types before implementations
- Mock setup for abstract class requires concrete test implementation

## Test Cases

### SupplyRequestBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy agentRequestId from parent request | Line 28, property assignment |
| BL-02 | should generate unique supplyRequestId | Line 29, crypto.randomUUID() |
| BL-03 | should capture current timestamp | Line 30, Date.now() |
| BL-04 | should set readonly agentRequestId | Line 14, readonly property |
| BL-05 | should set readonly supplyRequestId | Line 15, readonly property |
| BL-06 | should set readonly requestedAt | Line 16, readonly property |
| BL-07 | should return complete log metadata | Lines 50-54, asLogMetadata() |
| BL-08 | should pass validation with valid fields | Line 40, throwIfInvalid() happy path |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should generate different supplyRequestIds for multiple instances | Line 29, UUID uniqueness |
| EC-02 | should capture different timestamps for multiple instances | Line 30, timestamp variation |
| EC-03 | should preserve exact agentRequestId from parent | Line 28, no transformation |
| EC-04 | should preserve exact UUID from crypto.randomUUID() | Line 29, exact value |
| EC-05 | should preserve exact timestamp from Date.now() | Line 30, exact value |
| EC-06 | should handle special characters in agentRequestId | Line 28, UUID with special chars |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw Error if agentRequestId is empty | Line 40, first condition |
| EH-02 | should throw Error if agentRequestId is whitespace | Line 40, trim() === '' |
| EH-03 | should throw Error if supplyRequestId is empty | Line 41, second condition |
| EH-04 | should throw Error if supplyRequestId is whitespace | Line 41, trim() === '' |
| EH-05 | should throw Error if agentRequestId is undefined | Line 40, !agentRequestId |
| EH-06 | should throw Error if supplyRequestId is undefined | Line 41, !supplyRequestId |
| EH-07 | should allow construction without validation | Constructor doesn't validate |

## Implementation Notes

### Concrete Test Class
```typescript
class TestSupplyRequest extends SupplyRequestBase {
  asDataObject() { return { test: 'data' }; }
}
```

### Mock Setup
- Mock `crypto.randomUUID()` for deterministic UUID testing
- Mock `Date.now()` for deterministic timestamp testing
- Create mock `AgentRequestBase` instances with known agentRequestId

### Coverage Focus
- Constructor: agentRequestId copy, supplyRequestId generation, requestedAt capture
- throwIfInvalid: empty, whitespace, missing for both IDs
- asLogMetadata: returns all 3 fields correctly
- Readonly properties: verify cannot be reassigned (property descriptor check)
- UUID uniqueness: multiple instances generate different IDs
- Timestamp capture: multiple instances capture different times

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
