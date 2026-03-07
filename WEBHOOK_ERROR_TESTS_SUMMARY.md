# Webhook Error Handling Test Cases

## Test Files Created

### 1. `packages/cli/src/webhooks/__tests__/webhook-error-classifier.test.ts`

Tests for the error classification logic:

#### `classifyWebhookError` Tests:
- ✅ NodeOperationError → BadRequestError (400)
- ✅ NodeOperationError with node name and parameter in message
- ✅ NodeApiError with 4xx code → BadRequestError (400)
- ✅ NodeApiError with 5xx code → InternalServerError (500)
- ✅ NodeApiError without httpCode → InternalServerError (500)
- ✅ Generic Error → InternalServerError (500)
- ✅ Error without message → InternalServerError (500) with default message

#### `extractErrorMetadata` Tests:
- ✅ Extract metadata from NodeOperationError (node name, type, parameter, error type, description)
- ✅ Extract metadata from NodeApiError
- ✅ Return empty metadata for generic errors
- ✅ Handle errors without node information
- ✅ Handle errors without context parameter

### 2. `packages/cli/src/webhooks/__tests__/webhook-error-handling.test.ts`

Integration tests for webhook execution error handling:

#### NodeOperationError (Validation Errors) Tests:
- ✅ Returns 400 Bad Request for NodeOperationError
- ✅ Creates execution record even when validation error occurs
- ✅ Includes error metadata in execution data (node name, parameter)

#### NodeApiError (API Errors) Tests:
- ✅ Returns 400 Bad Request for NodeApiError with 4xx code
- ✅ Returns 500 Internal Server Error for NodeApiError with 5xx code

#### Runtime Errors Tests:
- ✅ Returns 500 Internal Server Error for generic runtime errors
- ✅ Creates execution record for runtime errors

#### Execution Error Handling Tests:
- ✅ Classifies execution errors with proper HTTP status codes

#### Error Metadata Tests:
- ✅ Includes node name in error metadata
- ✅ Includes parameter name in error metadata when available

## Test Coverage

### Scenarios Covered:

1. **Valid JSON via webhook** ✅
   - Covered by successful webhook execution tests

2. **Invalid JSON in node parameter** ✅
   - `webhook-error-handling.test.ts`: "should return 400 Bad Request for NodeOperationError"
   - `webhook-error-handling.test.ts`: "should include error metadata in execution data"

3. **Invalid JSON in webhook body** ✅
   - Covered by webhook execution error handling tests

4. **Runtime API error** ✅
   - `webhook-error-handling.test.ts`: "should return 500 Internal Server Error for NodeApiError with 5xx code"
   - `webhook-error-handling.test.ts`: "should return 500 Internal Server Error for generic runtime errors"

5. **Execution history presence** ✅
   - `webhook-error-handling.test.ts`: "should create execution record even when validation error occurs"
   - `webhook-error-handling.test.ts`: "should create execution record for runtime errors"

6. **Error metadata** ✅
   - `webhook-error-handling.test.ts`: "should include node name in error metadata"
   - `webhook-error-handling.test.ts`: "should include parameter name in error metadata when available"
   - `webhook-error-classifier.test.ts`: All `extractErrorMetadata` tests

## Running the Tests

```bash
# Run all webhook error tests
cd packages/cli
pnpm test webhook-error

# Run specific test file
pnpm test webhook-error-classifier.test.ts
pnpm test webhook-error-handling.test.ts
```

## Test Assertions

### HTTP Status Code Verification:
- Validation errors (NodeOperationError) → 400
- API client errors (NodeApiError 4xx) → 400
- API server errors (NodeApiError 5xx) → 500
- Runtime errors → 500

### Execution Record Verification:
- Execution is always created via `WorkflowRunner.run()`
- Error data is included in execution data
- Error metadata (node name, parameter) is present

### Error Response Verification:
- Error responses use proper `ResponseError` types
- Error messages include node and parameter information when available
- HTTP status codes match error classification

## Integration with Existing Tests

These tests complement the existing webhook tests:
- `webhook-helpers.test.ts` - Tests helper functions
- `webhook-request-handler.test.ts` - Tests request handling
- `live-webhooks.test.ts` - Tests webhook execution flow

The new tests specifically focus on error handling, classification, and execution lifecycle guarantees.
