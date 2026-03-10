# Webhook Error Handling Fix - Summary

## Root Cause Analysis

The bug was a **systemic execution lifecycle issue** affecting multiple layers:

1. **Error Classification**: Node validation errors (like "JSON parameter needs to be valid JSON") were not properly classified, defaulting to 500 Internal Server Error instead of 400 Bad Request
2. **Execution Lifecycle**: Errors occurring during webhook execution (before workflow run) might not create execution records, making failures invisible in execution history
3. **HTTP Semantics**: All errors returned HTTP 200 with error messages embedded in response body, violating HTTP semantics
4. **Error Visibility**: Errors lacked metadata (node name, parameter, reason) making debugging impossible

## Files Modified

### 1. `packages/cli/src/webhooks/webhook-error-classifier.ts` (NEW)
**Purpose**: Centralized error classification and metadata extraction

**Key Functions**:
- `classifyWebhookError()`: Converts errors to appropriate `ResponseError` types with correct HTTP status codes
  - `NodeOperationError` → `BadRequestError` (400)
  - `NodeApiError` with 4xx codes → `BadRequestError` (400)
  - `NodeApiError` with 5xx codes → `InternalServerError` (500)
  - All other errors → `InternalServerError` (500)
- `extractErrorMetadata()`: Extracts node name, parameter, error type for execution records

### 2. `packages/cli/src/webhooks/webhook-helpers.ts` (MODIFIED)
**Purpose**: Main webhook execution flow - fixed error handling and execution lifecycle

**Key Changes**:
1. **Error Classification**: All errors are now classified using `classifyWebhookError()` before sending responses
2. **Execution Creation**: Execution is always created via `WorkflowRunner.run()` even when early errors occur
3. **Error Metadata**: Error metadata (node name, parameter) is extracted and included in execution records
4. **HTTP Status Codes**: Proper status codes (400/500) are returned instead of 200
5. **Early Error Handling**: Errors during `runWebhook()` are stored and sent after execution is created, ensuring execution appears in history

**Specific Changes**:
- Line 50: Added import for error classifier
- Line 34: Added `ExecutionError` type import
- Line 455: Added `earlyError` variable to store classified errors
- Lines 497-550: Updated error handling in `runWebhook()` catch block:
  - Classifies errors using `classifyWebhookError()`
  - Extracts error metadata using `extractErrorMetadata()`
  - Stores classified error for later response
  - Includes metadata in execution data
- Lines 657-664: Send early error response after execution is created
- Lines 770-781: Classify execution errors for proper HTTP status codes
- Lines 836-846: Classify errors in execution promise catch block
- Lines 849-859: Classify errors in outer catch block

### 3. `packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts` (MODIFIED - from previous fix)
**Purpose**: Fixed JSON parameter validation to handle all input types correctly

**Note**: This was the initial fix attempt, but the real issue was in the webhook execution lifecycle, not just JSON parsing.

## Error Classification Rules

### 400 Bad Request (Client Errors)
- `NodeOperationError`: Node parameter validation errors
- `NodeApiError` with 4xx HTTP codes: API client errors
- Webhook input validation errors

### 500 Internal Server Error (Server Errors)
- `NodeApiError` with 5xx HTTP codes: API server errors
- Runtime execution errors
- Unexpected errors

## Execution Lifecycle Guarantees

1. **Execution Always Created**: Even when validation errors occur before workflow execution, an execution record is created via `WorkflowRunner.run()`
2. **Error Metadata Included**: Execution records include:
   - Node name where error occurred
   - Parameter name (if applicable)
   - Error type
   - Error description
3. **Execution Visible in History**: All failed executions appear in execution history with full error details

## HTTP Response Semantics

### Before Fix
- All errors returned HTTP 200
- Error messages embedded in response body
- No distinction between client and server errors

### After Fix
- Validation errors return HTTP 400 Bad Request
- Runtime errors return HTTP 500 Internal Server Error
- Error responses follow standard HTTP error format:
  ```json
  {
    "code": 400,
    "message": "JSON parameter needs to be valid JSON (Node: Http Request, Parameter: jsonBody)",
    "meta": { ... }
  }
  ```

## Testing Requirements

The following scenarios must be tested:

1. **Valid JSON via webhook**: Should execute successfully
2. **Invalid JSON in node parameter**: Should return 400, execution in history
3. **Invalid JSON in webhook body**: Should return 400, execution in history
4. **Runtime API error**: Should return 500, execution in history
5. **Execution history presence**: All failures must appear in execution history
6. **Error metadata**: Execution records must include node name, parameter, error type

## Validation

### Why Execution is Always Created
- `WorkflowRunner.run()` is called even when early errors occur
- Error data is merged into execution data via `runExecutionDataMerge`
- Execution is created before error response is sent

### Why Errors are Debuggable
- Error metadata (node name, parameter) is extracted and included in:
  - Execution records (`resultData.error`)
  - Error logs (via `ErrorReporter`)
  - HTTP error responses (via `ResponseError.meta`)
- Error classification provides clear error types

### Why HTTP Semantics are Correct
- `classifyWebhookError()` maps errors to appropriate HTTP status codes
- `ResponseError` types enforce correct status codes
- `sendErrorResponse()` uses `error.httpStatusCode` from classified errors
- No more HTTP 200 on failures

## Migration Notes

- No breaking changes to API
- Existing webhook integrations continue to work
- Error responses now have proper HTTP status codes
- Execution history will now show previously invisible validation failures
