# Test Plan: dry-run-supplier.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `dry-run-supplier.test.ts`

---

## 1. Code Analysis

### Exports
- `DryRunSupplier` class (extends `TranslationSupplierBase`)

### Class Structure
```typescript
class DryRunSupplier extends TranslationSupplierBase {
  private readonly delayContext: DelayContext;
  private readonly dryRunContext: DryRunContext;

  constructor(connection: IntentoConnectionType, functions: IFunctions)
  protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError>
}
```

### Dependencies to Mock
- `IFunctions` (n8n functions interface)
- `ContextFactory` (for reading DelayContext and DryRunContext)
- `Delay.apply()` (delay utility)
- `TranslationRequest` (request parameter)
- `DelayContext` (delay configuration)
- `DryRunContext` (mode configuration)
- `Tracer` (logging)

### Branches & Edge Cases
1. Constructor: Reads DelayContext and DryRunContext, freezes instance
2. `supply()`: Three execution paths based on mode
   - 'pass': Returns original text unchanged
   - 'override': Returns predefined override text
   - 'fail': Returns TranslationError with custom code/message
3. Delay application before all modes
4. Abort signal checking at entry
5. Logging for each mode

### Coverage Targets
- Lines: 10-60 (constructor through all mode branches)
- Branches: 3 mode cases (pass, override, fail)
- Abort signal handling
- Delay application
- Context reading and freezing

---

## 2. Test Inventory

### BL-XX: Business Logic

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should extend TranslationSupplierBase | Class hierarchy |
| BL-02 | should read DelayContext during construction | Lines 24-25, context reading |
| BL-03 | should read DryRunContext during construction | Lines 24-25, context reading |
| BL-04 | should freeze instance after construction | Line 27, Object.freeze |
| BL-05 | should apply delay before processing in pass mode | Lines 35-36, delay application |
| BL-06 | should return original text in pass mode | Lines 39-41, pass mode logic |
| BL-07 | should return override text in override mode | Lines 42-44, override mode logic |
| BL-08 | should return error in fail mode | Lines 45-47, fail mode logic |

### EC-XX: Edge Cases

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should handle zero delay (noDelay mode) | Lines 35-36, zero delay |
| EC-02 | should handle fixed delay | Lines 35-36, delay calculation |
| EC-03 | should pass detected language in pass mode | Line 40, detectedLanguage param |
| EC-04 | should preserve request context in all modes | Request field usage |
| EC-05 | should handle undefined from language | Request field handling |
| EC-06 | should handle empty override text | Line 43, empty string |
| EC-07 | should handle special characters in override | Line 43, special chars |

### EH-XX: Error Handling

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should check abort signal at entry | Line 34, signal check |
| EH-02 | should throw if aborted before processing | Line 34, throwIfAborted |
| EH-03 | should create error with correct code in fail mode | Line 46, errorCode usage |
| EH-04 | should create error with correct message in fail mode | Line 46, errorMessage usage |

---

## 3. Test Structure

```
describe('DryRunSupplier')
├── business logic (BL-01 to BL-08)
├── edge cases (EC-01 to EC-07)
└── error handling (EH-01 to EH-04)
```

---

## 4. Mock Strategy

### Required Mocks
1. **IFunctions**: Mock n8n functions interface
2. **ContextFactory.read()**: Mock to return test contexts
3. **Delay.apply()**: Mock to track delay calls
4. **TranslationRequest**: Mock with jest-mock-extended
5. **DelayContext**: Mock with calculateDelay method
6. **DryRunContext**: Mock with mode and conditional fields
7. **Tracer**: Mock for logging verification
8. **AbortSignal**: Create real AbortController for testing

### Fixtures
```typescript
const MOCK_CONNECTION_TYPE: IntentoConnectionType = 'intento_translationProvider';
const MOCK_REQUEST_ID = 'dry-run-req-001';
const MOCK_DELAY_MS = 500;
```

---

## 5. Implementation Notes

- Mock `ContextFactory.read()` to return different contexts per test
- Mock `Delay.apply()` as jest.Mock to track calls
- Use real AbortController for signal testing
- Test all three modes (pass, override, fail) separately
- Verify delay is always applied before mode logic
- Verify logging calls for each mode
- Test abort signal interruption
- Verify instance is frozen after construction
- Match patterns from translation-supplier-base.test.ts

---

## 6. Coverage Verification

**Minimum Targets:**
- Statements: ≥95%
- Branches: ≥95% (3 mode branches + abort check)
- Functions: 100%
- Lines: ≥95%

**Critical Paths:**
- Constructor with context reading
- All three mode branches (pass, override, fail)
- Delay application
- Abort signal handling
- Response/error creation

---

## 7. Success Criteria

- [ ] All 19 test cases pass
- [ ] Coverage ≥95% all metrics
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests execute in <2 seconds
- [ ] Mock cleanup in afterEach
- [ ] Follows established patterns from similar test files
