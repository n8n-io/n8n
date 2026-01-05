# Test Plan: translation-supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `translation-supplier-base.test.ts`

---

## 1. Code Analysis

### Exports
- `TranslationSupplierBase` abstract class (extends `SupplierBase`)

### Class Structure
```typescript
abstract class TranslationSupplierBase extends SupplierBase<TranslationRequest, TranslationResponse, TranslationError> {
  protected onTimeOut(request: TranslationRequest): TranslationError
}
```

### Dependencies to Mock
- `TranslationRequest` (request parameter)
- `TranslationResponse` (success result)
- `TranslationError` (error result)
- `IntentoConnectionType` (connection type)
- `IFunctions` (n8n functions interface)
- Parent class `SupplierBase` dependencies

### Branches & Edge Cases
1. `onTimeOut()`: Creates TranslationError with code 408 and timeout message
2. Inherits all retry/timeout logic from `SupplierBase`
3. Type parameter binding to translation-specific types

### Coverage Targets
- Lines: 14-16 (onTimeOut implementation)
- All translation-specific type handling
- Integration with parent class retry mechanism

---

## 2. Test Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should extend SupplierBase with correct generic types | Class hierarchy verification |
| BL-02 | should create TranslationError on timeout | Lines 14-16, onTimeOut implementation |
| BL-03 | should set error code to 408 for timeout | Line 15, code parameter |
| BL-04 | should set error reason to timeout message | Line 15, reason parameter |
| BL-05 | should include request context in timeout error | Line 15, request parameter usage |
| BL-06 | should integrate with parent retry mechanism | Parent class integration |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle request with undefined from language | Request field handling |
| EC-02 | should preserve request text in timeout error | Request data preservation |
| EC-03 | should work with different target languages | Language variation handling |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should return TranslationError instance from onTimeOut | Return type verification |
| EH-02 | should create retryable error for timeout (408) | Error retryability |

---

## 3. Test Structure

```
describe('TranslationSupplierBase')
├── business logic (BL-01 to BL-06)
├── edge cases (EC-01 to EC-03)
└── error handling (EH-01 to EH-02)
```

---

## 4. Mock Strategy

### Required Mocks
1. **Concrete Implementation**: Create test subclass implementing abstract `supply()` method
2. **TranslationRequest**: Mock with jest-mock-extended for timeout scenarios
3. **IFunctions**: Mock n8n functions interface
4. **ExecutionContext**: Mock context for retry configuration
5. **Tracer**: Mock for logging verification

### Fixtures
```typescript
const MOCK_CONNECTION_TYPE: IntentoConnectionType = 'intento_translationProvider';
const MOCK_REQUEST_ID = 'translation-req-uuid-001';
const MOCK_TIMESTAMP = 1704412800000;
```

---

## 5. Implementation Notes

- Create concrete test implementation `TestTranslationSupplier` extending `TranslationSupplierBase`
- Mock the abstract `supply()` method to control success/failure scenarios
- Test `onTimeOut()` directly by calling it with mock request
- Verify timeout error properties match expected values (code 408, specific message)
- Use same patterns as `supplier-base.test.ts` for consistency
- Test integration with parent retry mechanism by triggering timeout
- Verify error is retryable (408 status code)

---

## 6. Coverage Verification

**Minimum Targets:**
- Statements: ≥95%
- Branches: ≥95%
- Functions: 100%
- Lines: ≥95%

**Critical Paths:**
- `onTimeOut()` method implementation
- TranslationError creation with correct parameters
- Type parameter bindings (TranslationRequest, TranslationResponse, TranslationError)

---

## 7. Success Criteria

- [ ] All 11 test cases pass
- [ ] Coverage ≥95% all metrics
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests execute in <1 second
- [ ] Mock cleanup in afterEach
- [ ] Follows established patterns from supplier-base.test.ts
