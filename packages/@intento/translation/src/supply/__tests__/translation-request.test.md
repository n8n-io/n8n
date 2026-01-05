# Test Plan: translation-request.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `translation-request.test.ts`

---

## 1. Code Analysis

### Exports
- `TranslationRequest` class (extends `SupplyRequestBase`)

### Class Structure
```typescript
class TranslationRequest extends SupplyRequestBase {
  readonly text: string;
  readonly to: string;
  readonly from?: string;

  constructor(text: string, to: string, from?: string)
  protected throwIfInvalid(): void
  asLogMetadata(): LogMetadata
  asDataObject(): IDataObject
  clone(): this
}
```

### Dependencies to Mock
- `crypto.randomUUID()` (inherited from SupplyRequestBase)
- `Date.now()` (inherited from SupplyRequestBase)

### Branches & Edge Cases
1. Constructor: Validates `to` parameter, `from` is optional
2. `throwIfInvalid()`: Throws if `to` is empty/undefined/whitespace-only
3. `from` can be `undefined` (auto-detection mode)
4. `Object.freeze()` immutability enforcement
5. `asLogMetadata()`: Excludes text, includes requestId and timestamps
6. `asDataObject()`: Includes text but excludes requestId
7. `clone()`: Creates new instance with same data but new requestId/timestamp

### Coverage Targets
- Lines: 10-78 (constructor through clone method)
- Branches: `to` validation (empty, whitespace, undefined), `from` optional
- All public methods: constructor, asLogMetadata, asDataObject, clone
- Error paths: invalid `to` parameter

---

## 2. Test Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create request with all parameters | Lines 26-31, constructor with from |
| BL-02 | should create request without from language | Lines 26-31, constructor without from |
| BL-03 | should auto-generate requestId via parent | Line 26 (super call), inherited UUID generation |
| BL-04 | should auto-generate requestedAt via parent | Line 26 (super call), inherited timestamp |
| BL-05 | should freeze instance after construction | Line 32, Object.freeze enforcement |
| BL-06 | should return log metadata without text | Lines 50-56, asLogMetadata implementation |
| BL-07 | should return data object with text but without requestId | Lines 57-63, asDataObject implementation |
| BL-08 | should clone with same field values | Lines 70-72, clone creates new instance |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle empty string text | Lines 27-29, empty text allowed |
| EC-02 | should preserve whitespace in text | Lines 27-29, whitespace handling |
| EC-03 | should handle special characters in text | Lines 27-29, Unicode/emoji handling |
| EC-04 | should trim whitespace when validating to | Line 42, trim in validation |
| EC-05 | should handle undefined from in all methods | Lines 50-63, from undefined branch |
| EC-06 | should create new requestId on clone | Line 71, clone generates new UUID |
| EC-07 | should create new requestedAt on clone | Line 71, clone generates new timestamp |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw if to is empty string | Line 42, validation fails |
| EH-02 | should throw if to is whitespace only | Line 42, trim check |
| EH-03 | should throw if to is undefined | Line 42, falsy check |
| EH-04 | should throw with descriptive error message | Line 42, error message format |

---

## 3. Test Structure

```
describe('TranslationRequest')
├── business logic (BL-01 to BL-08)
├── edge cases (EC-01 to EC-07)
└── error handling (EH-01 to EH-04)
```

---

## 4. Mock Strategy

### Required Mocks
1. **crypto.randomUUID()**: Mock for predictable requestId
   - Return fixed UUIDs for assertions
   - Return different UUIDs for clone tests

2. **Date.now()**: Mock for predictable timestamps
   - Return fixed timestamp for creation
   - Return different timestamp for clone tests

### Fixtures
```typescript
const MOCK_REQUEST_ID_1 = 'req-uuid-001';
const MOCK_REQUEST_ID_2 = 'req-uuid-002';
const MOCK_TIMESTAMP_1 = 1704412800000;
const MOCK_TIMESTAMP_2 = 1704412800500;
```

---

## 5. Implementation Notes

- Mock `crypto.randomUUID()` at global level for parent constructor
- Mock `Date.now()` for timestamp control
- Test immutability with `Object.isFrozen()` and assignment attempts
- Verify clone creates NEW instances (different requestId/timestamp)
- Test both with and without `from` parameter in multiple scenarios
- Validate error messages contain expected text
- Test whitespace handling explicitly (leading/trailing spaces)

---

## 6. Coverage Verification

**Minimum Targets:**
- Statements: ≥95%
- Branches: ≥95%
- Functions: 100%
- Lines: ≥95%

**Critical Paths:**
- Constructor with all parameters
- Constructor with undefined from
- Validation failure paths (empty, whitespace, undefined)
- All conversion methods (asLogMetadata, asDataObject, clone)
- Immutability enforcement

---

## 7. Success Criteria

- [ ] All 19 test cases pass
- [ ] Coverage ≥95% all metrics
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests execute in <1 second
- [ ] Mock cleanup in afterEach
- [ ] Follows established patterns from similar test files
