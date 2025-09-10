## Summary
Fixes #19319 — avoid ambiguous "JSON parameter needs to be valid JSON" errors by:
- Parsing string JSON safely at webhook ingress (for JSON content types).
- Parsing string JSON in HttpRequest V3 when appropriate.
- Returning clear, contextual NodeOperationError messages including parse error and guidance to use `JSON.stringify(...)` when inserting expressions.

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
- Unit and integration tests added and passing locally.
- Error messages may be localized in follow-up PR.

## Notes
- Backwards compatible for valid workflows.
- Consider follow-up: UI tooltip suggesting `JSON.stringify(...)` when embedding expressions.
