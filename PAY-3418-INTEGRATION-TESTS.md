# PAY-3418: Integration Tests for Node Parameter Persistence

## Overview

This document describes the integration tests written for **PAY-3418: Allow dynamic node parameters in Public API schema**.

### The Fix

**File Modified**: `packages/cli/src/public-api/v1/handlers/workflows/spec/schemas/node.yml`

**Change**: Added `additionalProperties: true` to the `parameters` property in the OpenAPI schema.

```yaml
parameters:
  type: object
  additionalProperties: true  # <-- NEW: Allows dynamic node parameters
  example: { additionalProperties: {} }
```

**Problem Solved**: Without this change, the OpenAPI schema validation was stripping out node parameters that were not explicitly defined in the schema, causing Code node parameters like `jsCode` and other dynamic node properties to be lost when workflows were created or updated via the Public API.

---

## Integration Tests Added

All tests are located in: `/Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli/test/integration/public-api/workflows.test.ts`

### Test Suite: `PAY-3418: Node parameter persistence via Public API`

#### 1. **Test: Create workflow with Code node with jsCode parameter and persist it**

**Purpose**: Verify that node parameters like `jsCode` are preserved when creating a workflow via the Public API.

**What It Tests**:
- POST /workflows creates a Code node with JavaScript code
- The jsCode parameter is returned in the response (not stripped)
- GET /workflows/:id retrieves the workflow with jsCode intact
- All related parameters (mode, language) are preserved

**Test Flow** (Arrange-Act-Assert):
1. **Arrange**: Define a Code node with jsCode parameter containing JavaScript code
2. **Act**: Create workflow via POST /workflows
3. **Assert**: Verify jsCode is in response with correct value
4. **Act**: Retrieve workflow via GET /workflows/:id
5. **Assert**: Verify jsCode is persisted and returned correctly

**Key Assertions**:
```typescript
expect(codeNode.parameters.jsCode).toBe(jsCodeValue);
expect(codeNode.parameters.mode).toBe('runOnceForAllItems');
expect(codeNode.parameters.language).toBe('javaScript');
```

---

#### 2. **Test: Update workflow with Code node parameters and preserve them**

**Purpose**: Verify that node parameters are preserved during workflow updates via PUT /workflows/:id.

**What It Tests**:
- Initial workflow creation with Code node
- Updating the workflow with modified jsCode
- Parameters survive the update cycle
- Both POST and PUT endpoints preserve parameters

**Test Flow**:
1. **Arrange**: Create initial workflow with Code node
2. **Act**: Update workflow with different jsCode and mode
3. **Assert**: Verify update response contains new jsCode
4. **Act**: Retrieve updated workflow
5. **Assert**: Verify jsCode persisted after retrieval

**Key Assertions**:
```typescript
expect(updatedCodeNode.parameters.jsCode).toBe(updatedCode);
expect(updatedCodeNode.parameters.mode).toBe('runOnceForEachItem');
expect(retrievedUpdatedNode.parameters.jsCode).toBe(updatedCode);
```

---

#### 3. **Test: Handle Code node with various parameter types and preserve all of them**

**Purpose**: Verify that the `additionalProperties: true` fix allows preservation of arbitrary custom parameters.

**What It Tests**:
- String parameters are preserved
- Numeric parameters are preserved
- Object/nested parameters are preserved
- All custom properties are not stripped by schema validation
- Complex JavaScript code with special characters is preserved

**Test Flow**:
1. **Arrange**: Create Code node with standard params plus custom properties
2. **Act**: Create workflow via POST /workflows
3. **Assert**: Verify all parameters present in response (including custom ones)
4. **Act**: Retrieve workflow via GET /workflows/:id
5. **Assert**: Verify all custom parameters persisted

**Key Assertions**:
```typescript
expect(codeNode.parameters.customProperty1).toBe('custom value');
expect(codeNode.parameters.customProperty2).toBe(123);
expect(codeNode.parameters.customProperty3).toEqual({
  nested: 'object',
  value: true,
});
```

---

#### 4. **Test: Handle Python Code node parameters (if available)**

**Purpose**: Verify the fix applies to all node types using dynamic parameters, not just JavaScript Code nodes.

**What It Tests**:
- Python Code nodes with `pyCode` parameter are preserved
- Language parameter switching works correctly
- Non-JavaScript code parameters survive the API round-trip
- Fix is language-agnostic

**Test Flow**:
1. **Arrange**: Create Code node with Python language and pyCode parameter
2. **Act**: Create workflow via POST /workflows
3. **Assert**: Verify pyCode is present and not stripped
4. **Act**: Retrieve workflow via GET /workflows/:id
5. **Assert**: Verify pyCode persisted

**Key Assertions**:
```typescript
expect(codeNode.parameters.language).toBe('python');
expect(codeNode.parameters.pyCode).toBeDefined();
expect(codeNode.parameters.pyCode).toContain('import json');
```

---

## Test Results

All tests pass successfully:

```
PAY-3418: Node parameter persistence via Public API
  ✓ should create workflow with Code node with jsCode parameter and persist it (13 ms)
  ✓ should update workflow with Code node parameters and preserve them (18 ms)
  ✓ should handle Code node with various parameter types and preserve all of them (13 ms)
  ✓ should handle Python Code node parameters (if available) (11 ms)

Test Suites: 1 passed, 1 total
Tests:       68 passed, 68 total (including 4 new tests for PAY-3418)
```

---

## How to Run the Tests

### Run only the PAY-3418 tests:

```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli
pnpm test workflows.test.ts -- --testNamePattern="PAY-3418"
```

### Run all workflow integration tests:

```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli
pnpm test workflows.test.ts
```

### Run from project root:

```bash
cd /Users/csaba/Downloads/n8n-worktrees/pay-3418
pnpm test:affected  # Only runs affected tests since last commit
```

---

## Test Coverage

### Endpoints Tested
- **POST /workflows** - Creating workflows with dynamic parameters
- **PUT /workflows/:id** - Updating workflows with dynamic parameters
- **GET /workflows/:id** - Retrieving workflows to verify persistence

### Node Types Tested
- **Code (JavaScript)** - Primary focus, most commonly used dynamic parameters
- **Code (Python)** - Validates fix applies to all code node variants

### Parameter Scenarios Tested
1. Single-line JavaScript code
2. Multi-line JavaScript with complex logic
3. Python code with imports
4. Mode variations (runOnceForAllItems, runOnceForEachItem)
5. Language variations (javaScript, python)
6. Custom properties beyond standard node parameters
7. Nested object parameters

---

## Technical Details

### Why This Fix Was Needed

The OpenAPI schema for the node definition was missing `additionalProperties: true` in the `parameters` object. This caused the schema validation layer to:

1. Only allow explicitly defined properties in the schema
2. Strip any unknown properties (like `jsCode`, `pyCode`, and other dynamic parameters)
3. Result in workflows being created/updated without critical node configuration

### How The Fix Works

By adding `additionalProperties: true` to the schema:

```yaml
parameters:
  type: object
  additionalProperties: true  # Allow any property names beyond schema definition
  example: { additionalProperties: {} }
```

The OpenAPI schema validation now:
1. Allows any property name in the `parameters` object
2. Validates that the value type matches JSON schema standards
3. Preserves all parameters through the API request/response cycle

### Files Modified

```
packages/cli/src/public-api/v1/handlers/workflows/spec/schemas/node.yml
- Line 52: Added `additionalProperties: true`

packages/cli/test/integration/public-api/workflows.test.ts
- Lines 1639-2064: Added test suite with 4 comprehensive tests
```

---

## Behavior Verification

### Before Fix
```javascript
// Request
POST /workflows
{
  nodes: [{
    parameters: { jsCode: 'return items;', mode: 'runOnceForAllItems' }
  }]
}

// Response - jsCode STRIPPED!
{
  nodes: [{
    parameters: { mode: 'runOnceForAllItems' }
    // jsCode is missing!
  }]
}
```

### After Fix
```javascript
// Request
POST /workflows
{
  nodes: [{
    parameters: { jsCode: 'return items;', mode: 'runOnceForAllItems' }
  }]
}

// Response - jsCode PRESERVED!
{
  nodes: [{
    parameters: {
      jsCode: 'return items;',
      mode: 'runOnceForAllItems'
    }
  }]
}
```

---

## Linear Ticket

**Issue**: PAY-3418
**Status**: Fixed and tested
**Component**: Public API OpenAPI schema validation

---

## References

- **Schema File**: `/Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli/src/public-api/v1/handlers/workflows/spec/schemas/node.yml`
- **Test File**: `/Users/csaba/Downloads/n8n-worktrees/pay-3418/packages/cli/test/integration/public-api/workflows.test.ts`
- **Test Lines**: 1639-2064
