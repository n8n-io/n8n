# Test Plan: merge-request.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-13
**Coverage Target:** ≥95% all metrics
**Test File:** `merge-request.test.ts`

## Code Surface
**Exports:** `MergeRequest` class
**Dependencies:**
- `intento-core`: SupplyRequestBase, AgentRequestBase (need mock)
- `n8n-workflow`: LogMetadata, IDataObject (types only)
- `types/*`: ISegment interface (type only)
**Branches:** 1 conditional
- Line 30: `segments.length === 0` check
- `Object.freeze()` on line 26 (immutability enforcement)
**ESLint Considerations:**
- Need proper mock for AgentRequestBase
- Type assertions for test-specific constructs

## Test Cases

### MergeRequest

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create request with segments | Constructor lines 21-26 |
| BL-02 | should inherit agentRequestId from parent request | Line 22 super(request) |
| BL-03 | should generate unique supplyRequestId | Parent class behavior |
| BL-04 | should capture requestedAt timestamp | Parent class behavior |
| BL-05 | should set readonly segments property correctly | Property immutability |
| BL-06 | should freeze object after construction | Line 26 Object.freeze() |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle single segment | Boundary: minimum valid array length |
| EC-02 | should handle multiple segments | Typical array with 3+ segments |
| EC-03 | should preserve segment structure | Segments with all ISegment fields |
| EC-04 | should handle segments with different textPositions | Segments from different text items |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if segments array is empty | Line 30 validation |
| EH-02 | should throw with correct message for empty segments | Error message validation |
| EH-03 | should call super.throwIfInvalid for parent validation | Line 31 super call |
| EH-04 | should allow construction without validation | Validation deferred to throwIfInvalid() call |

#### Metadata & Data (MD-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| MD-01 | should return log metadata with segmentsCount | Lines 34-38, asLogMetadata() |
| MD-02 | should include parent metadata in log output | Line 35 spread operator |
| MD-03 | should return data object with segments array | Lines 40-43, asDataObject() |

## Success Criteria
- [ ] Test plan created with author and date
- [ ] All exports identified and planned
- [ ] All branches covered (100%)
- [ ] All error paths tested
- [ ] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines)
- [ ] Test implementation matches plan IDs
- [ ] All tests pass
- [ ] Lint passes with no errors
- [ ] Typecheck passes
