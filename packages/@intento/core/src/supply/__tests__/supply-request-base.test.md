# Test Plan: supply-request-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-request-base.test.ts`

## Code Surface
**Exports:** `SupplyRequestBase` (abstract class)
**Dependencies:**
- `INodeExecutionData`, `LogMetadata` (from n8n-workflow - types only)
- `ITraceable`, `IDataProvider` (interfaces)
- `crypto.randomUUID()` (built-in Web Crypto API)
- `Date.now()` (built-in Date API)

**Branches:** 0 conditionals (straightforward constructor)
**ESLint Considerations:**
- Type imports with `type` keyword
- Import order: external packages → types → local implementations
- Mock crypto.randomUUID() and Date.now() for deterministic tests

## Test Cases

### SupplyRequestBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should generate unique requestId using crypto.randomUUID | Line 65, requestId generation |
| BL-02 | should capture timestamp at construction | Line 67, requestedAt assignment |
| BL-03 | should have readonly requestId property | Line 50, property immutability |
| BL-04 | should have readonly requestedAt property | Line 53, property immutability |
| BL-05 | should implement ITraceable interface | Line 47, interface implementation |
| BL-06 | should implement IDataProvider interface | Line 47, interface implementation |
| BL-07 | should generate different IDs for multiple instances | UUID uniqueness verification |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should capture increasing timestamps for sequential requests | Timestamp ordering |
| EC-02 | should generate RFC 4122 v4 compliant UUIDs | UUID format validation |
| EC-03 | should maintain timestamp precision in milliseconds | Timestamp accuracy |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should require concrete implementation of asLogMetadata | Line 75, abstract method |
| EH-02 | should require concrete implementation of asExecutionData | Line 88, abstract method |
| EH-03 | should require concrete implementation of clone | Line 103, abstract method |

## Implementation Notes

### Test Strategy
Since `SupplyRequestBase` is an abstract class, tests must use a concrete implementation:

```typescript
class TestRequest extends SupplyRequestBase {
  constructor(private readonly data: unknown = {}) {
    super();
  }

  asLogMetadata(): LogMetadata {
    return { requestId: this.requestId, requestedAt: this.requestedAt, data: this.data };
  }

  asExecutionData(): INodeExecutionData[][] {
    return [[{ json: { requestId: this.requestId, data: this.data } }]];
  }

  clone(): this {
    return new TestRequest(this.data) as this;
  }
}
```

### Mock Strategy
- **Mock `crypto.randomUUID()`**: Use jest.spyOn for deterministic UUID testing
- **Mock `Date.now()`**: Use jest.spyOn to control timestamp values
- **UUID Validation**: Test format matches RFC 4122 v4 pattern

### Coverage Focus
- Constructor logic (UUID generation, timestamp capture)
- Property immutability (readonly enforcement)
- Interface contracts (abstract method signatures)
- ID uniqueness across multiple instances
- Timestamp ordering and precision

### UUID Testing
For UUID format validation:
```typescript
const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
expect(request.requestId).toMatch(uuidV4Regex);
```

### Clone Method Testing
- Should create new instance with same data
- New instance gets new requestId (from new super() call)
- New instance gets new requestedAt timestamp
- Clone maintains data integrity

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All abstract methods documented
- [x] ESLint considerations documented
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Concrete test implementation pattern defined
- [x] Mock strategy clearly documented
- [x] UUID and timestamp testing approach defined
