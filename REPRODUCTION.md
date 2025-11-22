# Reproduction Guide for Issue #19319

## Quick Reproduction (3 commands)

### 1. Start n8n
```bash
pnpm install
pnpm -w build
pnpm start
```

### 2. Create test workflow
- Webhook node: POST, path: `test-19319`
- HTTP Request node: POST to `https://httpbin.org/post`, Content-Type: `application/json`, Raw Body: `{{ $node["Webhook"].json["body"] }}`

### 3. Test cases

**Valid JSON (should work):**
```bash
curl -X POST "http://localhost:5678/webhook/test-19319" \
  -H "Content-Type: application/json" \
  -d '{"message": "hello world"}'
```

**Invalid JSON (should show improved error):**
```bash
curl -X POST "http://localhost:5678/webhook/test-19319" \
  -H "Content-Type: application/json" \
  -d '{"message": "hello world"'
```

## Expected Results

### Before Fix
- **Webhook**: Returns HTTP 200, passes malformed data downstream
- **HTTP Request**: Fails with vague error: `"JSON parameter needs to be valid JSON"`

### After Fix
- **Webhook**: Returns HTTP 400 with clear error details
- **HTTP Request**: Fails with contextual error: `"JSON parameter needs to be valid JSON. The HTTP Request node received a string that is not valid JSON for the request body. If you build the JSON using expressions, wrap with JSON.stringify(...) to ensure proper formatting. Parse error: Expected ',' or '}' after property value in JSON at position 25"`

## Test Coverage
- ✅ Unit tests: `test-httprequest-unit.js`
- ✅ Integration tests: `test-webhook-integration.js`
- ✅ Edge cases: `test-edge-cases.js`
- ✅ Comprehensive: `test-comprehensive-fix.js`

## Files Modified
- `packages/nodes-base/nodes/Webhook/Webhook.node.ts`
- `packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts`
