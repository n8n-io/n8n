# Test Plan: translation-supplier-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-01-05
**Coverage Target:** ≥95% all metrics
**Test File:** `translation-supplier-base.test.ts`

## Code Surface
**Exports:** TranslationSupplierBase (abstract class)
**Dependencies:**
- SupplierBase from intento-core
- TranslationRequest, TranslationResponse, TranslationError types
**Branches:** 0 (class is abstract with no implementation)
**Special Considerations:**
- Abstract class cannot be instantiated directly
- Must test through concrete implementation (DryRunSupplier)
- Tests focus on type constraints and inheritance behavior
- No ESLint disables needed (type-safe implementation)

## Test Cases

### TranslationSupplierBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should extend SupplierBase with correct generic parameters | Class inheritance |
| BL-02 | should be constructible via concrete implementation | Abstract class pattern |
| BL-03 | should pass TranslationRequest type to SupplierBase | Generic type TI |
| BL-04 | should pass TranslationResponse type to SupplierBase | Generic type TS |
| BL-05 | should pass TranslationError type to SupplierBase | Generic type TE |
| BL-06 | should inherit all SupplierBase properties | Property inheritance |
| BL-07 | should inherit supplyWithRetries method | Method inheritance |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should enforce abstract supply method implementation | Abstract method contract |
| EC-02 | should work with different concrete implementations | Polymorphism |
| EC-03 | should maintain type safety across inheritance chain | Type parameter propagation |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should throw when trying to instantiate abstract class directly | Abstract class protection |
| EH-02 | should enforce correct return types from supply method | Type constraints |

## Implementation Strategy

Since `TranslationSupplierBase` is an abstract class with no implementation, tests will:

1. **Use DryRunSupplier** as concrete implementation for testing
2. **Verify inheritance chain** using instanceof and prototype checks
3. **Test type constraints** by checking method signatures and return types
4. **Validate abstract behavior** by attempting direct instantiation (should fail)
5. **Test polymorphism** by using TranslationSupplierBase as type annotation

## Success Criteria
- [ ] Test plan created with author and date
- [ ] All inheritance patterns verified
- [ ] Abstract class behavior validated
- [ ] Type safety confirmed through concrete implementation
- [ ] All tests pass with ≥95% coverage
- [ ] No ESLint or TypeScript errors
