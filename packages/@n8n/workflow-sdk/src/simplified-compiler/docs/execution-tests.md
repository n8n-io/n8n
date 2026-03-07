# Execution Tests

## Task Runner Disabling

The execution test harness (`execution-utils.ts`) disables the n8n task runner in `resolveImports()` by setting `TaskRunnersConfig.enabled = false` via the DI container. This forces the Code node to use the in-process `JavaScriptSandbox` instead of `JsTaskRunnerSandbox` (which requires a running task broker that doesn't exist in the test environment). Without this, all Code node executions fail with `Cannot read properties of undefined (reading 'ok')`.

## Nock-Based HTTP Mocking

The execution test harness supports nock interceptors for fixtures that need HTTP nodes to actually execute (instead of using pin data). This validates request URLs, methods, and bodies against a mock backend.

### Architecture

| File | Purpose |
|------|---------|
| `mock-credentials-helper.ts` | Mock `ICredentialsHelper` returning pre-defined credential data by type |
| `__fixtures__/<dir>/nock.ts` | Per-fixture nock interceptor setup (exports `setupNock()`) |
| `execution-utils.ts` | Proxy `set` trap, credential helper wiring, filter conditions patcher |
| `execution.test.ts` | Nock lifecycle (`afterEach: nock.cleanAll()`), pin data stripping, fixture nock loading |
| `fixture-loader.ts` | `hasNock` detection via `existsSync(join(dirPath, 'nock.ts'))` |

### How It Works

1. `fixture-loader.ts` detects `nock.ts` in fixture directories -> sets `hasNock: true`
2. Test loads nock module via `require()` and calls `setupNock()`
3. `stripHttpPinData()` removes pin data for `httpRequest` nodes (so they actually execute via nock)
4. `patchFilterConditions()` adds missing `options` to IF/Switch filter conditions (see below)
5. HTTP nodes make requests -> nock intercepts and returns mock responses
6. `afterEach: nock.cleanAll()` prevents cross-test contamination

### Adding a Nock Fixture

1. Create `__fixtures__/<dir>/nock.ts`:
```typescript
import nock from 'nock';
export function setupNock(): void {
    nock('https://api.example.com').get('/data').reply(200, { result: 'mock' });
}
```
2. Remove the fixture from `SKIP_REASONS` in `execution.test.ts`
3. Run `pnpm test execution.test.ts` to verify

### Filter Conditions Patching

**Problem**: The compiler emits IF/Switch `conditions` parameters without `options` (`caseSensitive`, `typeValidation`, `version`). The n8n frontend normally resolves these from `typeOptions.filter` expressions when saving a workflow. The execution engine expects them to be present.

**Solution**: `patchFilterConditions()` recursively walks node parameters and adds default filter options (`caseSensitive: true`, `typeValidation: 'loose'`, `version: 2`) to any `FilterValue` object missing `options`. Applied only for nock fixtures (pin-data fixtures skip IF/Switch evaluation).

**Why `loose` type validation**: The compiler may emit `exists` checks with `type: 'string'` where the resolved value is an object (e.g., checking if a response exists). Strict validation rejects this. Loose validation is more appropriate for compiler-generated workflows.

### Mock Credentials Helper

`MockCredentialsHelper` extends `ICredentialsHelper` and returns pre-defined credential data by type:
- `httpHeaderAuth` -> `{ name: 'Authorization', value: 'Bearer test-token' }`
- `httpBasicAuth` / `httpDigestAuth` -> `{ user: 'test-user', password: 'test-pass' }`
- `oAuth2Api` -> valid token structure with `access_token: 'test-oauth2-token'`

Wired into `buildAdditionalData()` via `credentialsHelper` override.

### Proxy `set` Trap

The `additionalData` Proxy now has a `set` trap because `_getCredentials()` writes `additionalData.executionContext = this.getExecutionContext()` during credential resolution. Without the `set` trap, this write fails silently and credential resolution breaks.

## Execution Expectations

Optional `expectations.json` files per fixture define expected request bodies and node output items. After execution, mismatches are collected and the test fails if any exist. The HTML report shows inline match/mismatch badges with diff tables.

### File Map

| File | Purpose |
|------|---------|
| `expectation-matcher.ts` | `deepPartialMatch`, `deepExactMatch`, `matchRequests`, `matchNodes`, `checkExpectations` |
| `expectation-matcher.test.ts` | 40 unit tests for all matcher functions |
| `__fixtures__/<dir>/expectations.json` | Per-fixture expected values (optional) |

### expectations.json Schema

```json
{
  "requests": {
    "POST api.example.com/data": {
      "requestBody": { "model": "gpt-4", "temperature": 0.3 },
      "requestHeaders": { "authorization": "Bearer tok" }
    },
    "POST httpbin.org/post#2": {
      "requestBody": { "status": "done" }
    }
  },
  "nodes": {
    "Set searchInput": {
      "items": [{ "searchInput": "hello" }]
    }
  }
}
```

- **`requests`**: keyed by `"METHOD url"`. `#N` suffix for Nth duplicate (1-indexed after first).
- **`nodes`**: keyed by node name. `items` = shorthand for output index 0.
- Both sections optional. Only specified entries are checked.

### Matching Rules

- **`requestBody`**: **exact match** via `deepExactMatch` -- all keys in expected must be in actual AND all keys in actual must be in expected. No extra keys allowed. `{}` does NOT match `{text: "hello"}`.
- **`requestHeaders`**: **partial match** via `deepPartialMatch` -- only checks specified headers. Extra headers in actual (like `accept`, `user-agent`, `host`) are ignored. This is necessary because HTTP requests always have many auto-generated headers.
- **`nodes.items`**: **partial match** via `deepPartialMatch` -- only checks specified fields. Extra keys in actual items are ignored.
- **Arrays**: element-by-element. For exact match, actual cannot have more elements. For partial, actual can have more.
- **Mismatch format**: `{ path: string, expected: unknown, actual: unknown }`.
- **Collect all**: don't fail-fast, gather every mismatch so the test shows everything at once.

### Integration

- **`fixture-loader.ts`**: Detects `expectations.json` -> sets `hasExpectations: true`, loads `expectations` on the `Fixture` object.
- **`execution.test.ts`**: After execution, calls `checkExpectations()` if fixture has expectations. Stores `expectationMismatches` in execution data JSON. Asserts `toHaveLength(0)`.
- **`generate-report.ts`**: Reads `expectationMismatches` from execution data. Shows green "expected" badge when all match, red "N mismatch(es)" badge when mismatches exist. Execution section shows "EXPECT FAIL" (red) when mismatches present even if workflow execution itself succeeded. Collapsed diff table shows Path | Expected | Actual for each mismatch.

### Current Expectation Status

w01 and w25 have `expectations.json` with correct resolved values. Both currently **fail** because the execution harness sends unresolved n8n expressions (e.g., `={{ $('NodeName').first().json.prop }}`) as literal request body strings instead of resolved values. This documents the gap -- expressions in HTTP request bodies are not resolved in the test environment.
