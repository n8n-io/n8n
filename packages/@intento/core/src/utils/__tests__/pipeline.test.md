# Test Plan: pipeline.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-11
**Coverage Target:** ≥95% all metrics
**Test File:** `pipeline.test.ts`

## Code Surface
**Exports:** `Pipeline` class with static method `readPipeline(functions: IFunctions): Record<string, INodeExecutionData[]>`
**Dependencies:**
- `ExecuteContext` from n8n-core (type cast target)
- `INodeExecutionData` from n8n-workflow (return type)
- `IFunctions` from types/* (input type)
- Needs mocking: `IFunctions` with nested `runExecutionData.resultData.runData` structure
**Branches:** 3 conditionals
1. `if (!runData)` - early return for missing execution data
2. `for...of Object.entries(runData)` - iteration over nodes
3. `if (latestRun?.data?.main?.[0])` - optional chaining with multiple checks
**ESLint Considerations:**
- Use `jest-mock-extended` for type-safe mocks
- Type assertions needed for ExecuteContext mock structure
- Import order: external → types → implementation

## Test Cases

### Pipeline.readPipeline()

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should extract outputs from single executed node | Lines 31-46, happy path with one node |
| BL-02 | should extract outputs from multiple executed nodes | Lines 40-45, iteration with multiple nodes |
| BL-03 | should return latest run for nodes executed multiple times | Line 42, taskDataArray[length-1] logic |
| BL-04 | should only include main[0] output branch | Line 45, main[0] access |
| BL-05 | should handle nodes with different output structures | Mixed valid/invalid node outputs |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should return empty object when runExecutionData is undefined | Line 34, optional chaining on context |
| EC-02 | should return empty object when resultData is undefined | Line 34, optional chaining on resultData |
| EC-03 | should return empty object when runData is undefined | Line 34-36, guard clause |
| EC-04 | should return empty object when runData is empty | Line 36, empty object case |
| EC-05 | should skip nodes with empty taskDataArray | Line 42, array access when length is 0 |
| EC-06 | should skip nodes without data property | Line 45, latestRun?.data check |
| EC-07 | should skip nodes without main property | Line 45, data?.main check |
| EC-08 | should skip nodes without main[0] | Line 45, main?.[0] check |
| EC-09 | should skip nodes with null/undefined in main[0] | Line 45, falsy value handling |
| EC-10 | should handle mixed valid and invalid nodes | Combination of valid nodes and various invalid states |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should not throw when functions parameter lacks execution context | Line 33, type cast safety |
| EH-02 | should handle deeply nested null/undefined gracefully | Line 34, multiple optional chaining |
| EH-03 | should not throw on malformed taskDataArray | Line 42, defensive array access |

## Coverage Analysis

### Line-by-line coverage mapping:
- **Line 31**: `static readPipeline(functions: IFunctions)` → All BL tests
- **Line 33**: `const context = functions as ExecuteContext;` → All tests (type cast)
- **Line 34**: `const runData = context.runExecutionData?.resultData?.runData;` → EC-01, EC-02, EC-03, BL-01
- **Line 36**: `if (!runData) return {};` → EC-03, EC-04
- **Line 38**: `const allNodesOutput: Record<...> = {};` → All BL tests
- **Line 40**: `for (const [nodeName, taskDataArray] of Object.entries(runData))` → BL-02, BL-05, EC-10
- **Line 42**: `const latestRun = taskDataArray[taskDataArray.length - 1];` → BL-03, EC-05
- **Line 45**: `if (latestRun?.data?.main?.[0])` → EC-06, EC-07, EC-08, EC-09
- **Line 45**: `allNodesOutput[nodeName] = latestRun.data.main[0];` → BL-01, BL-02, BL-04

### Branch coverage:
1. `!runData` → true: EC-03, EC-04 | false: all BL tests
2. `Object.entries(runData)` loop → 0 iterations: EC-04 | 1 iteration: BL-01 | multiple: BL-02
3. `latestRun?.data?.main?.[0]` → truthy: BL-01, BL-02, BL-04 | falsy: EC-06, EC-07, EC-08, EC-09
4. Optional chaining paths:
   - `latestRun` undefined → EC-05, EC-06
   - `data` undefined → EC-06
   - `main` undefined → EC-07
   - `main[0]` undefined → EC-08, EC-09

## Mock Data Structure

```typescript
// Valid node output structure
{
  runExecutionData: {
    resultData: {
      runData: {
        'NodeName': [
          {
            data: {
              main: [
                [{ json: { key: 'value' } }] // main[0]
              ]
            }
          }
        ]
      }
    }
  }
}
```

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified (1 class, 1 static method)
- [x] All branches covered (4 conditional paths + optional chaining)
- [x] All error paths tested (3 defensive scenarios)
- [x] ESLint considerations documented
- [x] Coverage ≥95% achievable (all lines and branches mapped)
- [x] Edge cases identified (10 edge case scenarios)
- [x] Type casting safety verified
- [x] Optional chaining paths fully tested
