# Test Plan: split-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-12
**Coverage Target:** ≥95% all metrics
**Test File:** `split-context.test.ts`

## Code Surface
**Exports:**
- `SPLIT` constant (configuration object)
- `SplitContext` class (implements IContext)
- `CONTEXT_SPLIT` constant (INodeProperties array)

**Dependencies:**
- `intento-core`: IContext interface, mapTo decorator
- `n8n-workflow`: INodeProperties type
- No mocking needed for this pure logic class

**Branches:** 4 conditionals in `throwIfInvalid()` method
- batchSize < min
- batchSize > max
- segmentSize < min
- segmentSize > max

**ESLint Considerations:**
- No file-level disables needed (pure logic, no unsafe operations)
- Standard import order: external → implementation
- No Reflect.getMetadata usage (decorator handled by intento-core)

## Test Cases

### SPLIT Constant

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should export KEYS with correct collection structure | Constant definition |
| BL-02 | should export BOUNDARIES with correct min/max values | Constant definition |
| BL-03 | should export DEFAULTS matching valid ranges | Constant definition |

### SplitContext Class

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-04 | should create context with default values | Lines 49-56, constructor with defaults |
| BL-05 | should create context with custom valid values | Lines 49-56, constructor with params |
| BL-06 | should set readonly properties correctly | Property assignment lines 53-54 |
| BL-07 | should freeze context object | Line 56, Object.freeze() |
| BL-08 | should return correct log metadata | Lines 78-83, asLogMetadata() method |
| BL-09 | should pass validation with valid values | Lines 67-74, throwIfInvalid() happy path |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should accept batchSize at minimum boundary (1) | Line 67 condition false branch |
| EC-02 | should accept batchSize at maximum boundary (500) | Line 68 condition false branch |
| EC-03 | should accept segmentSize at minimum boundary (200) | Line 69 condition false branch |
| EC-04 | should accept segmentSize at maximum boundary (5000) | Line 70 condition false branch |
| EC-05 | should create immutable object (prevent property mutation) | Object.freeze() behavior verification |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when batchSize below minimum | Line 67 condition true branch |
| EH-02 | should throw when batchSize above maximum | Line 68 condition true branch |
| EH-03 | should throw when segmentSize below minimum | Lines 69-70 condition true branch |
| EH-04 | should throw when segmentSize above maximum | Lines 71-72 condition true branch |
| EH-05 | should throw with descriptive message for batchSize min | Error message verification |
| EH-06 | should throw with descriptive message for batchSize max | Error message verification |
| EH-07 | should throw with descriptive message for segmentSize min | Error message verification |
| EH-08 | should throw with descriptive message for segmentSize max | Error message verification |

### CONTEXT_SPLIT Constant

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-10 | should export valid INodeProperties array | Constant definition |
| BL-11 | should define collection with correct structure | Array structure verification |
| BL-12 | should have batch size option with correct boundaries | Batch size option verification |
| BL-13 | should have segment size option with correct boundaries | Segment size option verification |
| BL-14 | should use SPLIT constants for all keys | Key reference verification |
| BL-15 | should use SPLIT constants for all boundaries | Boundary reference verification |
| BL-16 | should use SPLIT constants for all defaults | Default value reference verification |

## Implementation Notes

### Test Organization
```typescript
describe('split-context', () => {
  describe('SPLIT constant', () => {
    // BL-01, BL-02, BL-03
  });

  describe('SplitContext', () => {
    describe('constructor', () => {
      // BL-04, BL-05, BL-06, BL-07
    });

    describe('throwIfInvalid', () => {
      describe('valid values', () => {
        // BL-09, EC-01, EC-02, EC-03, EC-04
      });

      describe('invalid values', () => {
        // EH-01, EH-02, EH-03, EH-04, EH-05, EH-06, EH-07, EH-08
      });
    });

    describe('asLogMetadata', () => {
      // BL-08
    });

    describe('immutability', () => {
      // EC-05
    });
  });

  describe('CONTEXT_SPLIT constant', () => {
    // BL-10, BL-11, BL-12, BL-13, BL-14, BL-15, BL-16
  });
});
```

### Coverage Strategy

**100% Branch Coverage:**
- 4 validation conditions → 8 tests (true/false for each)
- Boundary tests ensure both branches of each condition tested

**Edge Case Focus:**
- All boundary values (1, 500, 200, 5000)
- Immutability verification (Object.freeze behavior)
- Default value behavior

**Error Message Verification:**
- Each validation error includes specific boundary value
- Messages should be descriptive and actionable

### Test Data
```typescript
const VALID_VALUES = {
  batchSize: {
    min: 1,
    max: 500,
    default: 50,
    typical: 100,
  },
  segmentSize: {
    min: 200,
    max: 5000,
    default: 1000,
    typical: 2000,
  },
};

const INVALID_VALUES = {
  batchSize: {
    tooLow: 0,
    tooHigh: 501,
  },
  segmentSize: {
    tooLow: 199,
    tooHigh: 5001,
  },
};
```

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (SPLIT, SplitContext, CONTEXT_SPLIT)
- [x] All branches covered (4 conditions = 100% coverage)
- [x] All error paths tested (4 validation failures)
- [x] ESLint considerations documented (none needed)
- [x] Coverage ≥95% (targeting 100% for all metrics)
- [x] 24 test cases planned (10 BL, 5 EC, 9 EH)

## Expected Coverage Report
```
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
split-context.ts    |     100 |      100 |     100 |     100 |
```

All statements, branches, functions, and lines will be covered through:
- Constructor variations (defaults, custom values)
- All validation branches (4 conditions × 2 branches = 8 paths)
- Boundary value testing
- Error message verification
- Immutability checks
- Constant structure verification
