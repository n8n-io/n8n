# Test Plan: tracer.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `tracer.test.ts`

## Code Surface
**Exports:**
- `Tracer` class with public methods: `constructor`, `debug`, `info`, `warn`, `error`, `bugDetected`

**Dependencies:**
- `n8n-workflow`: `INode`, `Logger`, `LogMetadata`, `NodeOperationError`
- `IFunctions` from `types/*`
- `Pipeline` from `utils/*`
- `crypto.randomUUID()` (global)

**Branches:**
- Constructor: 1 (traceId resolution)
- getTraceId: 4 (customData check, uniqueIds.length switch with 3 cases)
- getFromPipeline: 2 (for loop conditionals for traceId presence and type check)
- getCustomData: 3 (customData existence, get function existence, traceId type check)
- rememberTraceId: 2 (customData existence, set function existence)
- bugDetected: 1 (typeof error check)

**ESLint Considerations:**
- Type assertions needed: `Reflect.getMetadata` returns (N/A here, but `as Record<string, unknown>` type casts)
- Mock setups: `mock<IFunctions>()`, `mock<Logger>()`
- Import order: types before implementations
- No eslint-disable needed if properly typed

## Test Cases

### Tracer Constructor

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create tracer with traceId from customData | Lines 33-41, getCustomData path |
| BL-02 | should create tracer with traceId from pipeline | Lines 33-41, getFromPipeline path |
| BL-03 | should create tracer with generated UUID when no traceId found | Lines 33-41, randomUUID path |
| BL-04 | should freeze tracer instance | Line 42 |
| BL-05 | should extract workflowId and executionId from functions | Lines 37-39 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle multiple traceIds in pipeline (use first) | Lines 153-157, default case in switch |
| EC-02 | should handle empty pipeline data | Lines 178-189, empty iteration |
| EC-03 | should handle pipeline items without traceId field | Lines 183-185, conditional false path |
| EC-04 | should handle customData without get method | Lines 211-212, early return |
| EC-05 | should handle customData returning non-string traceId | Line 215, ternary false path |
| EC-06 | should handle customData without set method | Lines 231-232, early return |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| (None - constructor doesn't throw) | | |

### Tracer.debug()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-06 | should log debug message with execution context | Lines 53-55 |
| BL-07 | should merge extension metadata with context | Lines 53-55 |

### Tracer.info()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-08 | should log info message with execution context | Lines 64-66 |
| BL-09 | should merge extension metadata with context | Lines 64-66 |

### Tracer.warn()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-10 | should log warn message with execution context | Lines 75-77 |
| BL-11 | should merge extension metadata with context | Lines 75-77 |

### Tracer.error()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-12 | should log error message with execution context | Lines 86-88 |
| BL-13 | should merge extension metadata with context | Lines 86-88 |

### Tracer.bugDetected()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-14 | should log error and throw NodeOperationError with Error object | Lines 103-113 |
| BL-15 | should log error and throw NodeOperationError with string message | Lines 103-113, typeof string branch |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should always throw NodeOperationError (never returns) | Lines 103-113 |
| EH-02 | should include where, error, and extension in log metadata | Lines 104-108 |

### Tracer.getLogMetadata() (private)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-16 | should return metadata with traceId, nodeName, workflowId, executionId | Lines 115-122 |
| BL-17 | should merge extension metadata if provided | Lines 115-122 |
| BL-18 | should work without extension metadata | Lines 115-122, nullish coalescing |

### Tracer.getTraceId() (private, tested via constructor)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| (Covered by BL-01, BL-02, BL-03) | | |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| (Covered by EC-01) | | |

### Tracer.getFromPipeline() (private, tested via constructor)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-19 | should extract traceIds from pipeline json.traceId fields | Lines 178-189 |
| BL-20 | should deduplicate traceIds from multiple nodes | Line 191 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| (Covered by EC-02, EC-03) | | |

### Tracer.getCustomData() (private, tested via constructor)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-21 | should retrieve traceId from customData | Lines 205-215 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| (Covered by EC-04, EC-05) | | |

### Tracer.rememberTraceId() (private, tested via constructor)

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-22 | should store traceId in customData | Lines 225-234 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| (Covered by EC-06) | | |

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All error paths tested
- [x] ESLint considerations documented
- [ ] Coverage ≥95% (statements, branches, functions, lines) - To be verified after implementation
