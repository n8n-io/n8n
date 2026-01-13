# Test Plan: agent-error.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `agent-error.test.ts`

## Code Surface

**Exports:** `AgentError` class
**Dependencies:** `AgentRequestBase` (mock via jest-mock-extended)
**Branches:** 6 branches
- `throwIfInvalid()`: 6 conditions (agentRequestId empty, reason empty, code < 100, code > 599)
**Functions:** 5 public methods
- `constructor()`
- `throwIfInvalid()`
- `asLogMetadata()`
- `asDataObject()`
- (implicit) property getters

**Lines:** 70 total
- Key implementation: 14-18 (constructor), 48-52 (validation)

**ESLint Considerations:**
- No disables expected (type-safe code throughout)
- mock<AgentRequestBase>() from jest-mock-extended for type safety

## Implementation Details

### AgentError Class (lines 14-70)

**Constructor (lines 30-38):**
- Takes `request: AgentRequestBase`, `code: number`, `reason: string`
- Extracts `agentRequestId` from request
- Calculates `latencyMs` as `Date.now() - request.requestedAt`
- Freezes instance with `Object.freeze()`

**Validation (lines 48-52):**
- Checks `agentRequestId` not empty (line 49)
- Checks `reason` not empty (line 50)
- Checks `code` in range 100-599 (line 51)

**Data Methods:**
- `asLogMetadata()`: Returns all 4 fields (lines 54-61)
- `asDataObject()`: Returns code, reason, latencyMs (lines 63-68)

## Test Cases

### AgentError

#### Business Logic (BL-XX)

| ID    | Test Name                                              | Coverage Target                          |
|-------|--------------------------------------------------------|------------------------------------------|
| BL-01 | should create error with request data                 | Lines 31-37, constructor happy path      |
| BL-02 | should calculate latencyMs from request timestamp     | Line 34, latency calculation             |
| BL-03 | should freeze instance after construction             | Line 37, Object.freeze()                 |
| BL-04 | should return complete log metadata                   | Lines 54-61, all 4 fields                |
| BL-05 | should return data object without agentRequestId      | Lines 63-68, 3 fields only               |
| BL-06 | should accept valid HTTP status codes (100-599)       | Line 51, valid code range                |

#### Edge Cases (EC-XX)

| ID    | Test Name                                              | Coverage Target                          |
|-------|--------------------------------------------------------|------------------------------------------|
| EC-01 | should handle timeout error code (408)                | Line 51, specific status code            |
| EC-02 | should handle abort error code (499)                  | Line 51, specific status code            |
| EC-03 | should handle unexpected error code (500)             | Line 51, specific status code            |
| EC-04 | should calculate latencyMs immediately at construction| Line 34, timing behavior                 |
| EC-05 | should preserve all readonly properties               | Lines 15-18, immutability                |
| EC-06 | should handle boundary status codes (100, 599)        | Line 51, boundary values                 |

#### Error Handling (EH-XX)

| ID    | Test Name                                              | Coverage Target                          |
|-------|--------------------------------------------------------|------------------------------------------|
| EH-01 | should throw Error if agentRequestId empty            | Line 49, first validation                |
| EH-02 | should throw Error if reason empty                    | Line 50, second validation               |
| EH-03 | should throw RangeError if code < 100                 | Line 51, lower bound                     |
| EH-04 | should throw RangeError if code > 599                 | Line 51, upper bound                     |
| EH-05 | should pass validation with all valid fields          | Lines 48-51, happy path                  |
| EH-06 | should validate after construction (not throw)        | Lines 48-51, validation contract         |

## Mock Strategy

### AgentRequestBase Mock
```typescript
const mockRequest = mock<AgentRequestBase>({
  agentRequestId: 'test-request-123',
  requestedAt: Date.now() - 1000, // 1 second ago
});
```

### Date.now() Mock (for latency tests)
```typescript
const mockNow = 1704067200000; // 2026-01-01 00:00:00
jest.spyOn(Date, 'now').mockReturnValue(mockNow);
```

## Coverage Targets

- **Statements:** 100% (all 28 statements)
- **Branches:** 100% (all 6 branches)
- **Functions:** 100% (all 5 functions)
- **Lines:** 100% (all 25 lines)

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (6 validation branches)
- [x] All error paths tested (4 validation errors)
- [x] ESLint considerations documented
- [x] Coverage ≥95% target documented (aiming for 100%)
- [x] Mock strategy defined
- [x] 18 test cases spanning BL/EC/EH
