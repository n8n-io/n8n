# Bugs found in the v1 engine

This file lists bugs in n8n's v1 engine (n8n-core, n8n-workflow, n8n-nodes-base and the task runner) that the
compiled-engine work found. Each entry tells what v1 does, why it is wrong, where the code is, and what the compiled
engine does. The compiled engine copies v1's behaviour unless the entry says otherwise, because the replay checks
the compiled engine against v1.

Add an entry when you find a new bug. Do not put customer data here: describe the workflow shape, not its content.

| # | Area | Summary | Severity | Compiled engine |
|---|---|---|---|---|
| 1 | Credentials | Recorded Future sends no API key | High (the credential does not work) | Copies v1 |
| 2 | Expressions | A live error object in an item breaks `$input` calls | Medium | Differs (gives the items) |
| 3 | Reference instance | One workflow can stop the whole instance from answering | High | Not affected |
| 4 | Credentials | OpenAI sends an empty `OpenAI-Organization` header | Low | Leaves the empty header out |
| 5 | HTTP Request | The error message holds the raw response body | Low (a pitfall) | Copies v1 |

## 1. Recorded Future sends no API key

- **Where:** `packages/nodes-base/credentials/RecordedFutureApi.credentials.ts`, `authenticate`.
- **What v1 does:** the generic `authenticate` reads `{{$credentials.accessToken}}`, but the credential type has no
  `accessToken` field. Its field is `apiKey`. So v1 sends the request without the key, and the service refuses it.
- **Found by:** the credential audit (`scripts/credential-audit.ts`, results in `credential-audit.md`).
- **Fix:** read `{{$credentials.apiKey}}` in `authenticate`. The fix is in n8n-nodes-base and is not made yet.
- **Compiled engine:** it uses v1's rule, so it fails in the same way.

## 2. A live error object in an item breaks `$input` calls (bundle 09808)

- **Where:** n8n 2.42.2, expression evaluation in the isolate (the expression bridge).
- **What v1 does:** a node that fails and goes on (`onError: continueRegularOutput`) can put its live `NodeApiError`
  object into `json.error`, for example Airtable "search". The bridge cannot copy that object. Then
  `$input.first()`, `$input.all()`, `$('Node').first()` and `$('Node').all()` throw inside the isolate, and the
  expression gives null. Property access such as `$json.error.message` still works.
- **Compiled engine:** items are JSON, so these calls give the items. The bundle is left out of the replay counts.
- **Also in:** `gym-diff.md`, section "2026-11-13: full dataset and v1 quirks".

## 3. One workflow can stop the whole instance from answering

- **Where:** the reference n8n 2.42.2 of the engine test bed (regular mode, SQLite).
- **What v1 does:** while two workflows ran, the n8n main process used about 130% CPU and answered nothing, not even
  `/healthz` or a login, for up to 10 minutes each time. It happened four times on 2026-11-13. A restart was the only
  way back. The two workflows have these node types (no content):
  - schedule trigger and webhook, Data Table (3), Code (2), Switch, If, Limit, HTTP Request 4.2 (2), Respond to
    Webhook (2);
  - schedule trigger (2), Loop Over Items, Execute Workflow, Code (3), Merge 3.2 (2), Set 3.4 (2), Google BigQuery
    (2), Google Cloud Storage.
- **Why it is a bug:** the work of one execution blocks the main event loop of the instance. Code nodes run in the
  task runner, so the blocking work is in the main process (a node, the data handling, or saving the execution).
  The node or step that blocks is not known yet.
- **Next step:** run each workflow alone on a fresh n8n with a CPU profile of the main process.
- **Compiled engine:** not affected. The test bed skips the two workflows (`prepare/SKIPPED.txt` of the test bed).

## 4. OpenAI sends an empty `OpenAI-Organization` header

- **Where:** `packages/nodes-base/credentials/OpenAiApi.credentials.ts`, `authenticate`.
- **What v1 does:** when the organization field is empty, v1 still sends `OpenAI-Organization: ` with an empty value.
- **Why it matters:** little. Most servers ignore an empty header, but a strict proxy can refuse it.
- **Compiled engine:** the credential rule leaves the empty header out (`credential-audit.md`).

## 5. The HTTP Request error message holds the raw response body

- **Where:** `packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts` (~lines 896-926), versions 4.2 to 4.4.
- **What v1 does:** with "continue on fail", the error item's `error.message` is `<status> - "<response body>"`, with
  the body's double quotes unescaped. A later node that puts `{{ $json.error.message }}` into a JSON string (for
  example a Respond to Webhook body) gets invalid JSON and fails.
- **Why it matters:** it is v1's documented output shape, but a pitfall for users.
- **Compiled engine:** copies v1 (behaviour case `29-http-error-message-42`).
