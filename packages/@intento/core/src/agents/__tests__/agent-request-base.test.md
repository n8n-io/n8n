# Test Plan: agent-request-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `agent-request-base.test.ts`

## Code Surface

**Exports:** `AgentRequestBase` abstract class
**Dependencies:**
- `crypto.randomUUID()` (global, needs spy)
- `Date.now()` (global, needs spy)
**Branches:** 2 branches
- `throwIfInvalid()`: 2 conditions (agentRequestId falsy check, trim() empty check)
**Functions:** 4 methods
- `constructor()`
- `throwIfInvalid()`
- `asLogMetadata()`
- `asDataObject()` (abstract - tested via concrete subclass)

**Lines:** 51 total
- Key implementation: 21-23 (constructor), 34 (validation)

**ESLint Considerations:**
- No disables expected (type-safe code throughout)
- Need concrete test subclass to instantiate abstract class

## Implementation Details

### AgentRequestBase Abstract Class (lines 11-51)

**Constructor (lines 21-23):**
- Calls `crypto.randomUUID()` to generate unique `agentRequestId`
- Calls `Date.now()` to capture `requestedAt` timestamp
- Sets both as readonly properties

**Validation (lines 34):**
- Checks `agentRequestId` not falsy (null, undefined, empty string)
- Checks `agentRequestId.trim()` not empty (whitespace-only)
- Note: Does NOT validate `requestedAt`

**Data Methods:**
- `asLogMetadata()`: Returns agentRequestId and requestedAt (lines 37-42)
- `asDataObject()`: Abstract method (line 50)

## Test Cases

### AgentRequestBase

#### Business Logic (BL-XX)

| ID    | Test Name                                              | Coverage Target                          |
|-------|--------------------------------------------------------|------------------------------------------|
| BL-01 | should generate unique agentRequestId on construction | Line 22, crypto.randomUUID() call        |
| BL-02 | should capture timestamp on construction              | Line 23, Date.now() call                 |
| BL-03 | should set readonly agentRequestId                    | Line 12, readonly enforcement            |
| BL-04 | should set readonly requestedAt                       | Line 13, readonly enforcement            |
| BL-05 | should return complete log metadata                   | Lines 37-42, both fields                 |
| BL-06 | should pass validation with valid agentRequestId      | Line 34, happy path                      |

#### Edge Cases (EC-XX)

| ID    | Test Name                                              | Coverage Target                          |
|-------|--------------------------------------------------------|------------------------------------------|
| EC-01 | should generate different IDs for multiple instances  | Line 22, UUID uniqueness                 |
| EC-02 | should capture different timestamps for instances     | Line 23, timestamp independence          |
| EC-03 | should preserve exact UUID from crypto.randomUUID()   | Line 22, no transformation               |
| EC-04 | should preserve exact timestamp from Date.now()       | Line 23, no transformation               |
| EC-05 | should handle UUID with special characters            | Line 22, UUID format                     |

#### Error Handling (EH-XX)

| ID    | Test Name                                              | Coverage Target                          |
|-------|--------------------------------------------------------|------------------------------------------|
| EH-01 | should throw Error if agentRequestId is empty string  | Line 34, first condition                 |
| EH-02 | should throw Error if agentRequestId is whitespace    | Line 34, trim() check                    |
| EH-03 | should pass validation (requestedAt not validated)    | Line 34, no timestamp validation         |
| EH-04 | should allow construction (no validation in ctor)     | Lines 21-23, no throws                   |

## Mock Strategy

### Test Subclass
```typescript
class TestAgentRequest extends AgentRequestBase {
  asDataObject(): IDataObject {
    return {
      agentRequestId: this.agentRequestId,
      requestedAt: this.requestedAt,
      testField: 'test-value',
    };
  }
}
```

### crypto.randomUUID() Mock
```typescript
const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
jest.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);
```

### Date.now() Mock
```typescript
const mockNow = 1704067200000; // 2026-01-01 00:00:00
jest.spyOn(Date, 'now').mockReturnValue(mockNow);
```

## Coverage Targets

- **Statements:** 100% (all 11 statements)
- **Branches:** 100% (both validation branches)
- **Functions:** 100% (4 functions including test subclass)
- **Lines:** 100% (all 8 executable lines)

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (2 validation branches)
- [x] All error paths tested (2 validation errors)
- [x] ESLint considerations documented
- [x] Coverage ≥95% target documented (aiming for 100%)
- [x] Mock strategy defined for crypto and Date
- [x] 15 test cases spanning BL/EC/EH
