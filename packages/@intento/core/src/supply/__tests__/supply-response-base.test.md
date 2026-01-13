# Test Plan: supply-response-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-response-base.test.ts`

## Code Surface
**Exports:** SupplyResponseBase (abstract class)
**Dependencies:**
- SupplyRequestBase (must create concrete test implementation)
- Date.now() (needs mocking for deterministic tests)
**Branches:**
- 4 validation conditions in throwIfInvalid() (2 checks × 2 conditions each)
- 1 arithmetic operation (Date.now() - request.requestedAt)
**ESLint Considerations:**
- Import order: n8n-workflow types → local types → implementation
- No disables needed if properly typed
- Abstract class requires concrete test implementation

## Test Cases

### SupplyResponseBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy agentRequestId from request | Line 27, property assignment |
| BL-02 | should copy supplyRequestId from request | Line 28, property assignment |
| BL-03 | should calculate latencyMs from request timestamp | Line 30, arithmetic operation |
| BL-04 | should return all three fields in asLogMetadata | Lines 51-56, return object |
| BL-05 | should have readonly properties | Lines 13-15, property immutability |
| BL-06 | should validate successfully with valid IDs | Lines 40-43, validation passes |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should calculate latency correctly with time difference | Line 30, varied timestamps |
| EC-02 | should handle zero latency (same timestamp) | Line 30, edge case |
| EC-03 | should preserve exact ID values without modification | Lines 27-28, value preservation |
| EC-04 | should handle special characters in IDs | Lines 27-28, string edge case |
| EC-05 | should calculate negative latency if clock adjusted backward | Line 30, clock skew edge case |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if agentRequestId is empty string | Line 41, first condition left branch |
| EH-02 | should throw if agentRequestId is whitespace only | Line 41, first condition right branch |
| EH-03 | should throw if agentRequestId is undefined | Line 41, first condition (nullish check) |
| EH-04 | should throw if supplyRequestId is empty string | Line 42, second condition left branch |
| EH-05 | should throw if supplyRequestId is whitespace only | Line 42, second condition right branch |
| EH-06 | should throw if supplyRequestId is undefined | Line 42, second condition (nullish check) |
| EH-07 | should allow construction without calling throwIfInvalid | Lines 26-31, constructor bypass |

## Implementation Notes

### Concrete Test Class
Since SupplyResponseBase is abstract, create concrete test implementation:

```typescript
class TestSupplyResponse extends SupplyResponseBase {
  constructor(request: SupplyRequestBase) {
    super(request);
  }

  asDataObject(): IDataObject {
    return {
      agentRequestId: this.agentRequestId,
      supplyRequestId: this.supplyRequestId,
      latencyMs: this.latencyMs,
    };
  }
}
```

### Mock Setup
Mock Date.now() for deterministic latency calculations:

```typescript
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(2000);
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### Test Request Factory
Create helper to generate test requests:

```typescript
const createTestRequest = (
  agentRequestId: string,
  supplyRequestId: string,
  requestedAt: number
): SupplyRequestBase => {
  return {
    agentRequestId,
    supplyRequestId,
    requestedAt,
    throwIfInvalid: jest.fn(),
    asLogMetadata: jest.fn(),
    asDataObject: jest.fn(),
  } as unknown as SupplyRequestBase;
};
```

## Coverage Targets

**Lines to cover:**
- 27-28: Property assignments (agentRequestId, supplyRequestId)
- 30: Latency calculation
- 41-42: Validation conditions (4 branches total)
- 51-56: asLogMetadata return object
- 66: asDataObject abstract declaration (covered by concrete implementation)

**Expected Coverage:** 100% statements, 100% branches, 100% functions, 100% lines

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (SupplyResponseBase)
- [x] All branches covered (4 validation branches + latency calc)
- [x] All error paths tested (6 validation failure scenarios)
- [x] ESLint considerations documented
- [x] Coverage ≥95% target set (aiming for 100%)
- [x] Concrete test implementation strategy defined
- [x] Mock strategy documented (Date.now)
