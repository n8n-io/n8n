# Test Plan: split-request.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `split-request.test.ts`

## Code Surface
**Exports:** `SplitRequest` class
**Dependencies:**
- `intento-core`: SupplyRequestBase, AgentRequestBase (need mock)
- `n8n-workflow`: LogMetadata, IDataObject (types only)
**Branches:** 3 conditionals
- Line 36: `text.length === 0` check
- Line 37: `segmentLimit <= 0` check
- `Object.freeze()` on line 32 (immutability enforcement)
**ESLint Considerations:**
- Need proper mock for AgentRequestBase
- Type assertions for test-specific constructs

## Test Cases

### SplitRequest

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create request with all parameters | Constructor lines 25-32 |
| BL-02 | should create request without optional from parameter | Constructor with from=undefined |
| BL-03 | should inherit agentRequestId from parent request | Line 26 super(request) |
| BL-04 | should generate unique supplyRequestId | Parent class behavior |
| BL-05 | should capture requestedAt timestamp | Parent class behavior |
| BL-06 | should set readonly properties correctly | Properties immutability |
| BL-07 | should freeze object after construction | Line 32 Object.freeze() |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle single text item | Boundary: minimum valid array length |
| EC-02 | should handle multiple text items | Typical array with 3+ items |
| EC-03 | should handle segmentLimit = 1 | Boundary: minimum valid positive number |
| EC-04 | should handle large segmentLimit | Typical large number (e.g., 10000) |
| EC-05 | should handle from parameter with language code | Optional param: "en", "ru", etc. |
| EC-06 | should handle undefined from parameter explicitly | Optional param: undefined vs not provided |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if text array is empty | Line 36 validation |
| EH-02 | should throw with correct message for empty text | Error message validation |
| EH-03 | should throw if segmentLimit is zero | Line 37 validation (boundary) |
| EH-04 | should throw if segmentLimit is negative | Line 37 validation (invalid) |
| EH-05 | should throw with correct message for invalid segmentLimit | Error message validation |
| EH-06 | should call super.throwIfInvalid for parent validation | Line 38 super call |
| EH-07 | should allow construction without validation | Validation deferred to throwIfInvalid() call |

#### Metadata & Data (MD-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| MD-01 | should return log metadata with textCount | Lines 41-47, asLogMetadata() |
| MD-02 | should return log metadata with segmentLimit | asLogMetadata() |
| MD-03 | should return log metadata with from when provided | asLogMetadata() with optional field |
| MD-04 | should include parent metadata in log output | Line 42 spread operator |
| MD-05 | should return data object with text array | Lines 50-55, asDataObject() |
| MD-06 | should return data object with segmentLimit | asDataObject() |
| MD-07 | should return data object with from when provided | asDataObject() with optional field |

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All error paths tested
- [x] ESLint considerations documented
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Test implementation matches plan IDs
- [x] All tests pass (27/27 passed)
- [x] Lint passes with no errors
- [x] Typecheck passes
