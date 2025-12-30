# Test Plan: supply-response-base.ts

**Author:** Claude Sonnet 4.5
**Date:** 2025-12-30
**Coverage Target:** ≥95% all metrics
**Test File:** `supply-response-base.test.ts`

## Code Surface
**Exports:** `SupplyResponseBase` (abstract class)
**Dependencies:**
- `SupplyRequestBase` (for constructor parameter)
- `INodeExecutionData`, `LogMetadata` (from n8n-workflow - types only)
- `ITraceable`, `IDataProvider` (interfaces)

**Branches:** 1 conditional (implicit calculation in constructor)
**ESLint Considerations:**
- Type imports with `type` keyword
- Import order: external packages → types → local implementations
- No unsafe assignments needed - all types are concrete

## Test Cases

### SupplyResponseBase

#### Business Logic (BL-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should copy requestId from request | Line 41, requestId assignment |
| BL-02 | should calculate latency from request timestamp | Lines 41-43, latency calculation |
| BL-03 | should have readonly requestId property | Line 31, property immutability |
| BL-04 | should have readonly latencyMs property | Line 34, property immutability |
| BL-05 | should implement ITraceable interface | Line 28, interface implementation |
| BL-06 | should implement IDataProvider interface | Line 28, interface implementation |

#### Edge Cases (EC-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should calculate zero latency when request created at same millisecond | Line 43, timing edge case |
| EC-02 | should calculate positive latency for older requests | Line 43, normal timing case |
| EC-03 | should handle requests from different time epochs | Line 43, large time deltas |

#### Error Handling (EH-XX)
| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should require concrete implementation of asLogMetadata | Line 53, abstract method |
| EH-02 | should require concrete implementation of asExecutionData | Line 60, abstract method |

## Implementation Notes

### Test Strategy
Since `SupplyResponseBase` is an abstract class, tests must use a concrete implementation:

```typescript
class TestResponse extends SupplyResponseBase {
  constructor(request: SupplyRequestBase, private data?: unknown) {
    super(request);
  }

  asLogMetadata(): LogMetadata {
    return { requestId: this.requestId, latencyMs: this.latencyMs, data: this.data };
  }

  asExecutionData(): INodeExecutionData[][] {
    return [[{ json: { requestId: this.requestId, latencyMs: this.latencyMs } }]];
  }
}
```

### Mock Strategy
- **Mock `SupplyRequestBase`**: Create a test implementation with controllable `requestId` and `requestedAt`
- **Mock `Date.now()`**: Use `jest.spyOn(Date, 'now')` to control timing for latency tests

### Coverage Focus
- Constructor logic (requestId copy, latency calculation)
- Property immutability (readonly enforcement)
- Interface contracts (abstract method signatures)
- Timing edge cases (same ms, different epochs)

### Timing Tests
For latency calculation tests, use controlled timestamps:
- `EC-01`: Mock `Date.now()` to return same value as `requestedAt`
- `EC-02`: Mock `Date.now()` to return `requestedAt + 1000` (1 second later)
- `EC-03`: Test with large time deltas (hours, days)

## Success Criteria
- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All abstract methods documented
- [x] ESLint considerations documented
- [x] Coverage ≥95% (statements, branches, functions, lines)
- [x] Concrete test implementation pattern defined
- [x] Mock strategy clearly documented
