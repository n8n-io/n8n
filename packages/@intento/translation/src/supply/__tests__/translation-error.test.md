# Test Plan: translation-error.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `translation-error.test.ts`

---

## 1. Code Analysis

### Exports
- `TranslationError` class (default export)

### Class Structure
```typescript
class TranslationError extends SupplyErrorBase {
  readonly from?: string;
  readonly to: string;
  readonly text: string;

  constructor(request: TranslationRequest, code: number, reason: string)
  asLogMetadata(): LogMetadata
  asDataObject(): IDataObject
  asError(node: INode): NodeOperationError
}
```

### Dependencies to Mock
- `TranslationRequest` (from `supply/translation-request`)
- `INode` (from n8n-workflow)
- `SupplyErrorBase` (inherited behavior)

### Branches & Edge Cases
1. Constructor: Copies `from`, `to`, `text` from request + calls super
2. `from` can be `undefined` (optional source language)
3. `asLogMetadata()`: Excludes text, includes all other fields
4. `asDataObject()`: Includes text field
5. `asError()`: Creates NodeOperationError with formatted message
6. `Object.freeze()` immutability
7. Inherited `isRetryable()` logic (tested via parent)

### Coverage Targets
- Lines: 15-34 (constructor through asError method)
- Branches: from undefined vs defined
- All public methods: constructor, asLogMetadata, asDataObject, asError

---

## 2. Test Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy from, to, text from request | Lines 24-26, constructor field assignment |
| BL-02 | should call parent constructor with request, code, reason | Line 23, super call with inherited fields |
| BL-03 | should freeze instance after construction | Line 28, Object.freeze call |
| BL-04 | should return log metadata without text field | Lines 36-44, asLogMetadata implementation |
| BL-05 | should return data object with text field | Lines 46-54, asDataObject implementation |
| BL-06 | should create NodeOperationError with formatted message | Lines 56-59, asError implementation |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle undefined from language | Line 24, from undefined branch |
| EC-02 | should preserve empty string in text | Lines 24-26, empty string handling |
| EC-03 | should handle zero latency (same timestamp) | Inherited from SupplyErrorBase |
| EC-04 | should handle special characters in text | Lines 24-26, Unicode/special chars |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should include error code in message | Line 57, error message format |
| EH-02 | should include error reason in message | Line 57, error message format |
| EH-03 | should pass node context to NodeOperationError | Lines 56-58, node parameter |

---

## 3. Test Structure

```
describe('TranslationError')
├── business logic (BL-01 to BL-06)
├── edge cases (EC-01 to EC-04)
└── error handling (EH-01 to EH-03)
```

---

## 4. Mock Strategy

### Required Mocks
1. **TranslationRequest**: Mock with controllable values
   - `requestId`, `requestedAt` (inherited)
   - `from`, `to`, `text` (translation-specific)

2. **INode**: Mock with jest-mock-extended
   - Minimal interface for `asError()` tests

3. **Date.now()**: Mock for latency calculations
   - Control timestamps for predictable latency

### Fixtures
```typescript
const MOCK_REQUEST_ID = 'translation-req-uuid-001';
const MOCK_REQUEST_TIMESTAMP = 1704412800000;
const MOCK_ERROR_TIMESTAMP = 1704412800250; // +250ms
const CODE_BAD_REQUEST = 400;
const CODE_RATE_LIMIT = 429;
const CODE_SERVER_ERROR = 500;
```

---

## 5. Implementation Notes

- Follow existing patterns from `supply-error-base.test.ts`
- Use `jest-mock-extended` for INode mocking
- Create MockTranslationRequest class similar to MockRequest pattern
- Test both with and without `from` language in multiple tests
- Verify immutability with `Object.isFrozen()` and property assignment attempts
- Compare output formats between `asLogMetadata()` and `asDataObject()`
- Validate error message format includes emoji, code, and reason

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
- All three conversion methods (asLogMetadata, asDataObject, asError)
- Immutability enforcement

---

## 7. Success Criteria

- [ ] All 13 test cases pass
- [ ] Coverage ≥95% all metrics
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests execute in <1 second
- [ ] Mock cleanup in afterEach
- [ ] Follows established patterns from similar test files
