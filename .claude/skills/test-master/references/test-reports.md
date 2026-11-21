# Test Reports

## Test Report Template

```markdown
# Test Report: {Feature Name}

**Date**: YYYY-MM-DD
**Tester**: {Name}
**Version**: {App Version}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | X |
| Passed | X |
| Failed | X |
| Skipped | X |
| Coverage | X% |

## Test Scope

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests
- [ ] Performance tests
- [ ] Security tests

## Findings

### [CRITICAL] {Issue Title}
- **Location**: src/api/users.ts:45
- **Steps to Reproduce**:
  1. Send POST to /api/users without auth
  2. Request succeeds with 201
- **Expected**: 401 Unauthorized
- **Actual**: 201 Created
- **Impact**: Unauthorized user creation
- **Fix**: Add auth middleware

### [HIGH] {Issue Title}
- **Location**: src/services/orders.ts:123
- **Description**: N+1 query in order list
- **Impact**: 3s response time with 100 orders
- **Fix**: Add eager loading for order items

### [MEDIUM] {Issue Title}
- **Details**: ...

### [LOW] {Issue Title}
- **Details**: ...

## Coverage Analysis

| Module | Lines | Branches | Functions |
|--------|-------|----------|-----------|
| api/ | 85% | 78% | 90% |
| services/ | 92% | 85% | 95% |
| utils/ | 100% | 100% | 100% |

### Coverage Gaps
- `src/api/admin.ts` - 0% (no tests)
- `src/services/payment.ts:45-60` - Error handling untested

## Recommendations

1. **Immediate**: Add auth middleware to admin routes
2. **High Priority**: Optimize order queries
3. **Medium Priority**: Add tests for payment error handling
4. **Low Priority**: Increase branch coverage in api/

## Performance Results

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| GET /users | 45ms | 120ms | 250ms |
| POST /orders | 150ms | 400ms | 800ms |

## Sign-off

- [ ] All critical issues addressed
- [ ] Coverage meets threshold (80%)
- [ ] Performance meets SLA
```

## Severity Definitions

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Security vulnerability, data loss, system crash |
| **HIGH** | Major functionality broken, severe performance |
| **MEDIUM** | Feature partially working, workaround exists |
| **LOW** | Minor issue, cosmetic, edge case |

## Quick Reference

| Section | Content |
|---------|---------|
| Summary | High-level metrics |
| Findings | Issues by severity |
| Coverage | Code coverage analysis |
| Recommendations | Prioritized actions |
| Sign-off | Approval criteria |
