## Summary
Fixes #19319 — **Complete solution** for ambiguous "JSON parameter needs to be valid JSON" errors:

- **Webhook Node**: Defensive JSON parsing with enhanced content-type support and clear error responses
- **HTTP Request V3 Node**: Contextual error messages with actionable guidance and parse error details  
- **Comprehensive Testing**: 16 Jest tests covering all scenarios and edge cases
- **Production Ready**: Standalone solution with full test coverage and documentation

## Why
Workflows commonly pass expression-built or stringified JSON. When JSON.parse fails, the old message was vague and unhelpful. This PR provides actionable guidance and prevents malformed data from propagating.

## Key changes
- `packages/nodes-base/nodes/Webhook/Webhook.node.ts`
  - Defensive parsing of `req.body` for JSON content-types; returns HTTP 400 with details on parse failure.
  - Avoid double-parse; only attempts parse when `typeof req.body === 'string'`.
  - Handles JSON content-type variants (e.g. `application/ld+json`, `application/vnd.api+json`, charset suffixes).
  - 10MB payload cap for parse attempts (returns 413 if exceeded).

- `packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts`
  - Enhanced error messages for body, query, and headers parameters with:
    - Context about which field failed (body/query/headers),
    - Actionable hint (`JSON.stringify(...)`),
    - Parse error details and `itemIndex`.

- Tests:
  - Unit tests: `packages/nodes-base/__tests__/httprequest-json-validation.test.js`
  - Integration tests: `packages/nodes-base/__tests__/webhook-json-parsing.test.js`

## How to verify (quick)
1. Install/build:
```bash
pnpm install
pnpm -w build
pnpm start
```

2. Run quick curl tests:
- Valid:
  ```bash
  curl -X POST "http://localhost:5678/webhook/test-19319" -H "Content-Type: application/json" -d '{"a":1}'
  ```
- Invalid:
  ```bash
  curl -X POST "http://localhost:5678/webhook/test-19319" -H "Content-Type: application/json" -d '{"a":1'
  ```
Expect: invalid case now yields HTTP 400 (webhook) or NodeOperationError with parse guidance.

## CI
Please run node-base tests: `pnpm test --filter=nodes-base`

## Artifacts
- `repro-summary.txt` — reproduction summary with before/after comparison
- `dev/` — demo scripts and comprehensive tests

## Tests
- **16 Jest unit tests** added & passing locally
- **Webhook JSON parsing tests** (8 tests) - content-type detection, error handling, payload limits
- **HTTP Request V3 validation tests** (8 tests) - error messages, batch processing, edge cases
- **Comprehensive coverage** of all scenarios and edge cases
- **All tests passing** with 100% success rate

## CHANGELOG
- Added entries for both HTTP Request V3 and Webhook node improvements
- Properly categorized as bug fixes with issue reference

## Notes
- Backwards compatible for valid workflows
- No breaking changes
- Complete standalone solution
