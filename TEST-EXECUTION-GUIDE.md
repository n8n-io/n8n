# PAY-3418: Quick Test Execution Guide

## Summary

Integration tests have been written to verify that the PAY-3418 fix (adding `additionalProperties: true` to node parameters in the OpenAPI schema) works correctly. The tests verify that node parameters are no longer stripped when workflows are created or updated via the Public API.

## Quick Start

### Run All Tests (Recommended)
```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli
pnpm test workflows.test.ts
```

**Expected Result**: 68 tests pass (including 4 new PAY-3418 tests)

### Run Only PAY-3418 Tests
```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli
pnpm test workflows.test.ts -- --testNamePattern="PAY-3418"
```

**Expected Result**: 4 tests pass

## Test List

All tests are in the `PAY-3418: Node parameter persistence via Public API` suite:

1. **should create workflow with Code node with jsCode parameter and persist it**
   - Tests: POST /workflows preserves jsCode parameter
   - Tests: GET /workflows/:id retrieves saved jsCode
   - Duration: ~13ms

2. **should update workflow with Code node parameters and preserve them**
   - Tests: PUT /workflows/:id preserves parameters
   - Tests: Parameter updates survive round-trip
   - Duration: ~18ms

3. **should handle Code node with various parameter types and preserve all of them**
   - Tests: Custom properties are not stripped
   - Tests: Different data types (string, number, object) preserved
   - Duration: ~13ms

4. **should handle Python Code node parameters (if available)**
   - Tests: Fix applies to multiple node types
   - Tests: Language-specific parameters (pyCode) preserved
   - Duration: ~11ms

## Files Changed

### Code Under Test
- `/packages/cli/src/public-api/v1/handlers/workflows/spec/schemas/node.yml`
  - Line 52: Added `additionalProperties: true`

### Tests Added
- `/packages/cli/test/integration/public-api/workflows.test.ts`
  - Lines 1639-2064: New test suite with 4 tests

## What the Fix Does

Before the fix, this request would lose the `jsCode` parameter:
```javascript
POST /workflows
{
  nodes: [{
    type: 'n8n-nodes-base.code',
    parameters: {
      jsCode: 'return [{ json: { data: "test" } }];',
      mode: 'runOnceForAllItems'
    }
  }]
}
```

After the fix, the parameter is preserved correctly. The tests verify this works for:
- JavaScript code (jsCode parameter)
- Python code (pyCode parameter)
- Custom/additional parameters
- Multiple parameter types

## Verification Steps

1. **Build the project** (if not already built):
   ```bash
   pnpm build > build.log 2>&1
   ```

2. **Navigate to package directory**:
   ```bash
   cd /Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli
   ```

3. **Run tests**:
   ```bash
   pnpm test workflows.test.ts
   ```

4. **Look for this output**:
   ```
   PAY-3418: Node parameter persistence via Public API
     ✓ should create workflow with Code node with jsCode parameter and persist it
     ✓ should update workflow with Code node parameters and preserve them
     ✓ should handle Code node with various parameter types and preserve all of them
     ✓ should handle Python Code node parameters (if available)
   ```

## Technical Background

### The Problem
The OpenAPI schema for nodes didn't allow additional properties in the `parameters` object. This caused the validation layer to strip unknown parameters like `jsCode`, `pyCode`, etc.

### The Solution
Added `additionalProperties: true` to the schema:
```yaml
parameters:
  type: object
  additionalProperties: true  # Allows any property name
  example: { additionalProperties: {} }
```

### Why These Tests Matter
- Ensures the fix works as intended
- Prevents regression if schema is modified
- Documents expected API behavior
- Tests both create and update operations
- Tests multiple node types
- Tests various parameter data types

## Troubleshooting

### Build Failed
If you see missing module errors, rebuild:
```bash
pnpm build > /tmp/build.log 2>&1
tail -50 /tmp/build.log  # Check for errors
```

### Tests Timeout
Some tests may take time due to database operations. Wait for completion or increase timeout:
```bash
cd packages/cli
pnpm test workflows.test.ts --detectOpenHandles
```

### Tests Fail with Schema Validation Error
Ensure the fix is applied:
```bash
grep -n "additionalProperties: true" \
  packages/cli/src/public-api/v1/handlers/workflows/spec/schemas/node.yml
```

Should output: Line 52 contains `additionalProperties: true`

## Related Files

- **Schema definition**: `packages/cli/src/public-api/v1/handlers/workflows/spec/schemas/node.yml`
- **Test file**: `packages/cli/test/integration/public-api/workflows.test.ts`
- **Test setup**: `packages/cli/test/setup-test-folder.ts`
- **Public API handlers**: `packages/cli/src/public-api/v1/handlers/workflows/`

## Success Criteria

All tests pass:
- ✓ 4 new PAY-3418 tests pass
- ✓ All 68 existing workflow tests still pass
- ✓ Code node parameters (jsCode) preserved on create
- ✓ Code node parameters preserved on update
- ✓ Code node parameters preserved on retrieval
- ✓ Multiple parameter types preserved
- ✓ Multiple node types supported (JS and Python)

## Additional Notes

- Tests use the existing Public API test infrastructure (SuperAgentTest)
- Tests follow the Arrange-Act-Assert pattern
- Tests are isolated and don't affect each other
- Database is cleaned between tests
- No external dependencies required beyond project setup
