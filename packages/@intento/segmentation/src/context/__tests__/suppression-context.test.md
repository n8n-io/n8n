# Test Plan: suppression-context.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-12
**Coverage Target:** ≥95% all metrics
**Test File:** `suppression-context.test.ts`

## Code Surface
**Exports:**
- `SUPPRESSION` constant (configuration object)
- `SuppressionContext` class (implements IContext)
- `CONTEXT_SUPPRESSION` constant (INodeProperties array)

**Dependencies:**
- `intento-core`: IContext interface, mapTo decorator
- `n8n-workflow`: INodeProperties type, LogMetadata type
- No mocking needed for this pure logic class

**Branches:** 2 conditionals in `throwIfInvalid()` method
- enabled && !list (validation check)

**ESLint Considerations:**
- No file-level disables needed (pure logic, no unsafe operations)
- Standard import order: external → implementation
- No Reflect.getMetadata usage (decorator handled by intento-core)

## Test Cases

### SUPPRESSION Constant

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should export KEYS with correct structure | Constant definition |
| BL-02 | should export DEFAULTS with correct value | Constant definition |

### SuppressionContext Class

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-03 | should create context with default values | Lines 28-37, constructor with defaults |
| BL-04 | should create context with custom enabled=true and list | Lines 28-37, constructor with params |
| BL-05 | should create context with enabled=false and no list | Lines 28-37, constructor with enabled false |
| BL-06 | should set readonly properties correctly | Property assignment lines 33-34 |
| BL-07 | should freeze context object | Line 36, Object.freeze() |
| BL-08 | should return correct log metadata when enabled with list | Lines 53-57, asLogMetadata() with data |
| BL-09 | should return correct log metadata when disabled | Lines 53-57, asLogMetadata() disabled |
| BL-10 | should pass validation when disabled without list | Lines 45-47, throwIfInvalid() happy path 1 |
| BL-11 | should pass validation when enabled with list | Lines 45-47, throwIfInvalid() happy path 2 |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle enabled=true with empty list array | Line 47 condition false branch |
| EC-02 | should handle undefined list when enabled=false | Line 47 condition false branch (short-circuit) |
| EC-03 | should return listLength 0 for undefined list | Lines 55, nullish coalescing |
| EC-04 | should create immutable object (prevent property mutation) | Object.freeze() behavior verification |
| EC-05 | should handle list with single item | List variation |
| EC-06 | should handle list with multiple items | List variation |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when enabled=true but list is undefined | Line 47 condition true branch |
| EH-02 | should throw with descriptive error message | Error message verification |

### CONTEXT_SUPPRESSION Constant

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-12 | should export valid INodeProperties array with 2 items | Constant definition |
| BL-13 | should define Enable Custom Suppressions boolean field | First property definition |
| BL-14 | should define Suppression Terms multi-value string field | Second property definition |
| BL-15 | should use SUPPRESSION constants for all keys | Key reference verification |
| BL-16 | should use SUPPRESSION constants for defaults | Default value reference verification |
| BL-17 | should have conditional display for Suppression Terms | displayOptions verification |

## Implementation Notes

### Test Organization
```typescript
describe('suppression-context', () => {
  describe('SUPPRESSION constant', () => {
    // BL-01, BL-02
  });

  describe('SuppressionContext', () => {
    describe('constructor', () => {
      // BL-03, BL-04, BL-05, BL-06, BL-07
    });

    describe('throwIfInvalid', () => {
      describe('valid values', () => {
        // BL-10, BL-11, EC-01, EC-02
      });

      describe('invalid values', () => {
        // EH-01, EH-02
      });
    });

    describe('asLogMetadata', () => {
      // BL-08, BL-09, EC-03, EC-05, EC-06
    });

    describe('immutability', () => {
      // EC-04
    });
  });

  describe('CONTEXT_SUPPRESSION constant', () => {
    // BL-12, BL-13, BL-14, BL-15, BL-16, BL-17
  });
});
```

### Coverage Strategy

**100% Branch Coverage:**
- 1 validation condition with 2 parts (enabled && !list) → test all combinations
- Nullish coalescing operator in asLogMetadata → test both sides

**Edge Case Focus:**
- All combinations: enabled/disabled × list provided/undefined
- Empty array vs undefined list
- List length variations (0, 1, multiple)
- Immutability verification (Object.freeze behavior)
- Default value behavior

**Error Message Verification:**
- Validation error should be descriptive
- Message should explain requirement (list needed when enabled)

### Test Data
```typescript
const VALID_VALUES = {
  suppression: {
    disabledNoList: { enabled: false, list: undefined },
    disabledWithList: { enabled: false, list: ['Dr', 'Prof'] },
    enabledWithList: { enabled: true, list: ['Dr', 'Prof', 'Inc'] },
    enabledEmptyArray: { enabled: true, list: [] },
  },
};

const INVALID_VALUES = {
  suppression: {
    enabledNoList: { enabled: true, list: undefined },
  },
};

const SAMPLE_LISTS = {
  single: ['Dr'],
  multiple: ['Dr', 'Prof', 'Inc', 'Ltd', 'Fig'],
  empty: [],
};
```

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned (SUPPRESSION, SuppressionContext, CONTEXT_SUPPRESSION)
- [x] All branches covered (validation condition with logical AND)
- [x] All error paths tested (1 validation failure)
- [x] ESLint considerations documented (none needed)
- [x] Coverage ≥95% (targeting 100% for all metrics)
- [x] 23 test cases planned (17 BL, 6 EC, 2 EH)

## Expected Coverage Report
```
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
suppression-context.ts    |     100 |      100 |     100 |     100 |
```

All statements, branches, functions, and lines will be covered through:
- Constructor variations (defaults, enabled/disabled, with/without list)
- Validation branches (enabled && !list condition)
- asLogMetadata with different list states (undefined, empty, populated)
- Error message verification
- Immutability checks
- Constant structure verification
