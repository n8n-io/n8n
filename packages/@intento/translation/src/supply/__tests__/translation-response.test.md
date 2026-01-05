# Test Plan: translation-response.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `translation-response.test.ts`

---

## 1. Code Analysis

### Exports
- `TranslationResponse` class (extends `SupplyResponseBase`)

### Class Structure
```typescript
class TranslationResponse extends SupplyResponseBase {
  readonly from?: string;
  readonly to: string;
  readonly text: string;
  readonly translation: string;
  readonly detectedLanguage?: string;

  constructor(request: TranslationRequest, translation: string, detectedLanguage?: string)
  asLogMetadata(): LogMetadata
  asDataObject(): IDataObject
}
```

### Dependencies to Mock
- `TranslationRequest` (parameter type)
- `Date.now()` (inherited from SupplyResponseBase for latency calculation)

### Branches & Edge Cases
1. Constructor: Copies `from`, `to`, `text` from request + adds `translation` and `detectedLanguage`
2. `from` can be `undefined` (auto-detection mode)
3. `detectedLanguage` is optional (only relevant when `from` was undefined)
4. `asLogMetadata()`: Excludes text/translation, includes detectedLanguage
5. `asDataObject()`: Includes all fields including text/translation
6. Inherited behavior: `requestId` and `latencyMs` from parent

### Coverage Targets
- Lines: 10-62 (constructor through asDataObject)
- Branches: `from` undefined/defined, `detectedLanguage` undefined/defined
- All public methods: constructor, asLogMetadata, asDataObject
- Parent class integration: requestId, latencyMs calculation

---

## 2. Test Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy from, to, text from request | Lines 30-32, field assignment from request |
| BL-02 | should store translation result | Line 33, translation storage |
| BL-03 | should store detectedLanguage when provided | Line 34, detectedLanguage storage |
| BL-04 | should call parent constructor with request | Line 29, super call with requestId/latency |
| BL-05 | should return log metadata without text/translation | Lines 41-48, asLogMetadata implementation |
| BL-06 | should return data object with all fields | Lines 50-58, asDataObject implementation |
| BL-07 | should correlate response to request via requestId | Inherited from parent, verify correlation |
| BL-08 | should calculate latency from request timestamp | Inherited from parent, verify calculation |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle undefined from language | Line 30, from undefined branch |
| EC-02 | should handle undefined detectedLanguage | Line 34, detectedLanguage undefined branch |
| EC-03 | should handle both from and detectedLanguage defined | Lines 30,34 both defined scenario |
| EC-04 | should preserve empty string in text | Line 32, empty text handling |
| EC-05 | should preserve empty string in translation | Line 33, empty translation handling |
| EC-06 | should handle special characters in text/translation | Lines 32-33, Unicode/emoji |
| EC-07 | should handle zero latency (immediate response) | Parent behavior, same timestamp |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should include detectedLanguage in metadata when present | Line 44, metadata field inclusion |
| EH-02 | should exclude detectedLanguage from metadata when undefined | Line 44, undefined handling |
| EH-03 | should include detectedLanguage in data object when present | Line 55, data object field inclusion |

---

## 3. Test Structure

```
describe('TranslationResponse')
├── business logic (BL-01 to BL-08)
├── edge cases (EC-01 to EC-07)
└── error handling (EH-01 to EH-03)
```

---

## 4. Mock Strategy

### Required Mocks
1. **TranslationRequest**: Mock with jest-mock-extended
   - `requestId`, `requestedAt` (for parent constructor)
   - `from`, `to`, `text` (translation-specific fields)

2. **Date.now()**: Mock for latency calculations
   - Control timestamps for predictable latency

### Fixtures
```typescript
const MOCK_REQUEST_ID = 'translation-req-uuid-001';
const MOCK_REQUEST_TIMESTAMP = 1704412800000;
const MOCK_RESPONSE_TIMESTAMP_250 = 1704412800250; // +250ms
const MOCK_RESPONSE_TIMESTAMP_0 = 1704412800000; // 0ms latency
```

---

## 5. Implementation Notes

- Use `jest-mock-extended` for TranslationRequest mocking (avoid frozen property issues)
- Test both with and without `from` language
- Test both with and without `detectedLanguage`
- Verify metadata excludes text/translation (prevent log bloat)
- Verify data object includes all fields
- Test correlation between request and response via requestId
- Validate latency calculation from parent class

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
- Constructor with undefined detectedLanguage
- Both conversion methods (asLogMetadata, asDataObject)
- Parent class integration (requestId, latencyMs)

---

## 7. Success Criteria

- [ ] All 18 test cases pass
- [ ] Coverage ≥95% all metrics
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests execute in <1 second
- [ ] Mock cleanup in afterEach
- [ ] Follows established patterns from similar test files
