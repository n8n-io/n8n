# Test Plan: agent-response-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `agent-response-base.test.ts`

## Code Surface
**Exports:** `AgentResponseBase` (abstract class)
**Dependencies:** 
- `AgentRequestBase` (need to mock concrete implementation)
- `Date.now()` (mock for deterministic latency)
**Branches:** 
- 1 conditional in `throwIfInvalid()` (if !agentRequestId || trim === '')
**ESLint Considerations:**
- Type assertions needed: `as AgentRequestBase` for concrete test class
- Import order: types before implementations
- Mock setup for abstract class requires concrete test implementation

## Test Cases

### AgentResponseBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy agentRequestId from request | Line 25, property assignment |
| BL-02 | should calculate latencyMs from request timestamp | Line 27, Date.now() - requestedAt |
| BL-03 | should set readonly agentRequestId | Line 13, readonly property |
| BL-04 | should set readonly latencyMs | Line 14, readonly property |
| BL-05 | should return complete log metadata | Lines 50-53, asLogMetadata() |
| BL-06 | should pass validation with valid agentRequestId | Line 40, throwIfInvalid() happy path |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should calculate different latencies for different requests | Lines 27, multiple constructions |
| EC-02 | should preserve exact agentRequestId from request | Line 25, no transformation |
| EC-03 | should calculate latency at exact construction time | Line 27, immediate calculation |
| EC-04 | should handle zero latency (same timestamp) | Line 27, edge case requestedAt = now |
| EC-05 | should handle large latency values | Line 27, old requestedAt timestamp |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw Error if agentRequestId is empty string | Line 40, first condition |
| EH-02 | should throw Error if agentRequestId is whitespace | Line 40, trim() === '' |
| EH-03 | should throw Error if agentRequestId is missing | Line 40, !agentRequestId |
| EH-04 | should allow construction without validation | Constructor doesn't validate |

## Implementation Notes

### Concrete Test Class
```typescript
class TestAgentResponse extends AgentResponseBase {
  asDataObject() { return { test: 'data' }; }
}
```

### Mock Setup
- Mock `Date.now()` for deterministic latency testing
- Create mock `AgentRequestBase` instances with known agentRequestId and requestedAt

### Coverage Focus
- Constructor: agentRequestId assignment, latencyMs calculation
- throwIfInvalid: empty, whitespace, missing agentRequestId
- asLogMetadata: returns correct structure
- Readonly properties: verify cannot be reassigned (property descriptor check)

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
