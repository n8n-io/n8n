# CONTEXT-242 reproduction

The exact error is reproducible when a client keeps the 2.39.8 output schema and calls the updated tool. The rejected property is `nextCursor` at the response root. A fresh schema passes validation. This is a confirmed reproduction of the stale-schema failure. It does not confirm that Claude retained this schema in the reported instance.

Do not close the ticket as invalid or already fixed. The current tool has the same source as 2.42.6. The reported failure after a client refresh still needs evidence from the affected connection.

## Ticket context

- [CONTEXT-242](https://linear.app/n8n/issue/CONTEXT-242): Triage, Medium priority, no human assignee. Labels: GitHub, Instance MCP server, bug, lane:autofix-adore.
- [GitHub issue 40870](https://github.com/n8n-io/n8n/issues/40870): open. The only comment acknowledges the report.
- Report: an upgrade from 2.39.8 to 2.42.6 causes all `search_workflow_executions` calls to fail in a Claude custom connector. Empty results fail too. Other read tools work. The reporter says a tool-list refresh did not help.
- Environment: Docker on Ubuntu, PostgreSQL 16, external runners, Coolify, OAuth scopes `workflow:read` and `execution:read`.
- Linear comments: a session placeholder; Flaky's initial assessment, which found matching response and schema fields; and Flaky's later successful empty-result test on master. The last test did not cover the upgrade or Claude.
- No images or Loom links appear in the ticket or its comments. The linked Currents recording could not be opened with the web tool. Its contents were not verified.
- This is an instance MCP tool, not a workflow node. A node popularity score does not apply. Flaky estimated XS. A cache-invalidation change can have wider scope than a tool-specific schema change.

## Evidence

Investigation branch: `context-242-community-issue-instance-level-mcp`.
Master revision: `b09efb706cc9f8b7f4d4328e5bfe13fee9e145eb`.

The source comparison establishes these facts:

1. The 2.39.8 schema contains `data`, `count`, `estimated`, and optional `error`. Its generated JSON Schema forbids extra root properties.
2. The 2.42.6 schema adds `nextCursor`. Its response adds the same property, even when its value is null.
3. Removing the `nextCursor` declaration from the 2.42.6 schema produces the exact 2.39.8 source declaration. This was checked programmatically against both Git tags.
4. The complete tool source in 2.42.6 and current master has the same Git blob: `8b47b195ddbe1d7c4ab47e8e1be554c36caa4ed1`.
5. The schema converter has the same Git blob in all three versions: `fb060f46a5f0b053772fdc31dfaec70ec1ac7222`.
6. Commit `415fbdef9d` introduced the cursor contract change. Before this patch, the advertised MCP server version depends on feature flags, rather than the n8n release.

## Reproduction

The test uses the real tool handler, schema converter, MCP server SDK, validating MCP client SDK, and Ajv. Database lookup and telemetry services are mocked. The HTTP test uses `createMcpHandler` with `legacy: 'stateless'` and a fresh server per request. Requests pass through an in-process fetch adapter.

1. Publish the old output schema.
2. Call `tools/list` from the client. This caches its validator.
3. Call the tool. The old response succeeds.
4. Switch the server to the current schema and handler. Keep the client's cached schema.
5. Call with `{ "workflowId": "wf-1", "limit": 5 }`.
6. The client rejects the empty response with the reported error:

```text
Structured content does not match the tool's output schema: data must NOT have additional properties
```

Ajv identifies the mismatch:

```json
{
  "instancePath": "",
  "keyword": "additionalProperties",
  "params": { "additionalProperty": "nextCursor" }
}
```

7. Call `tools/list` again. The tool count stays the same, but the new schema includes `nextCursor`.
8. Repeat the tool call. It succeeds.

Both the in-memory transport and the stateless HTTP handler reproduce this sequence. The tests pass because they assert the exact rejection and subsequent recovery.

Fresh-schema checks also pass for empty results, populated results with a next-page cursor, unavailable counts, database errors, access errors, and invalid cursors.

## Run the tests

From `packages/cli`:

```sh
N8N_USER_FOLDER=/private/tmp/context-242-tests pnpm test src/modules/mcp/__tests__/search-executions.schema.test.ts src/modules/mcp/__tests__/tool-schema.util.test.ts
```

Result: 15 tests passed. This includes eight new reproduction/conformance tests and seven existing schema-converter tests. Focused type-aware lint passed.

The initial package typecheck failed on existing errors and stale shared declarations. The final log has no errors for the new test file. Log: `/private/tmp/context-242-typecheck-final.log`. At that stage, the existing `search-executions.tool.test.ts` suite could not load because the local `@n8n/api-types` build lacked exports used by telemetry. Rebuilding that package resolved the test import failure during implementation.

## Interpretation and remaining evidence

The stale-schema condition explains the exact error and why empty results fail. It also explains why a successful fresh-session test does not rule out the ticket. No database or runner output can add arbitrary root fields here: the handler constructs the response explicitly.

[KNO-75](https://linear.app/n8n/issue/KNO-75) tracks tool contract changes without cache invalidation signals. It is the closer match to this reproduction. [KNO-189](https://linear.app/n8n/issue/KNO-189) tracks conformance between a tool's current schema and current response. Those match in the tested cases.

The reporter says refreshing did not help. The SDK test recovers after an actual `tools/list` response is processed. These are different observations. Capture the redacted raw `tools/list` output schema and `tools/call` structured content from the failing Claude connection to resolve the difference. Check whether the validator's schema includes `nextCursor`. A client cache or a proxy serving old metadata remains a hypothesis for that connection.

The initial investigation did not run Claude. The follow-up below tested Claude Code. Neither investigation ran the Claude.ai custom connector, the full Docker upgrade, PostgreSQL, OAuth authentication, or external task runners. The installed test client SDK is 1.31.0 and the server SDK is 2.0.0. The initial investigation changed no production code. The implementation follow-up is below. No comments were posted to Linear or GitHub.

## Claude Code follow-up

Tested the installed Claude Code CLI, version 2.1.275, against the real tool and MCP HTTP handler with synthetic services. Each run exposed only the test tool. The same Claude process called the tool twice with identical arguments. The server switched contracts after the first call in the upgrade cases.

| Case | First call | Second call |
| --- | --- | --- |
| Current schema from the start | Success | Success |
| Old schema, then current response | Success | Exact reported validation error |
| Old schema, then current response and server version change | Success | Exact reported validation error |

Each trace contains `server/discover`, `subscriptions/listen`, one `tools/list`, and two `tools/call` requests. Claude used protocol version `2026-07-28`. It requested tool-list change notifications. It did not fetch the schema again between the calls. Changing the advertised server version from `1.1.0` to `2.42.6` did not cause automatic recovery in this test.

Both responses contained an empty `data` array. The added field was `nextCursor: null` at the root. The raw tool result confirms the error; Claude's generated explanation of the cause is not used as evidence.

The user requires continued operation across upgrades without manual reconnection. A server version change alone does not meet that requirement in this test. Notification delivery and contract negotiation remain design questions.

The probe source, server traces, and extracted tool results are saved in `/private/tmp/context-242-claude-evidence`. The probe was removed from the test discovery path so routine tests cannot start paid CLI sessions.

A fourth run sent `notifications/tools/list_changed` through the SDK's shared handler after the first call. Claude fetched `tools/list` again without user action. The second call then succeeded with `nextCursor: null`. The request order was `server/discover`, `subscriptions/listen`, `tools/list`, `tools/call`, `tools/list`, `tools/call`. Evidence: `notification-server-trace.json` and `notification-tool-results.json` in the same evidence directory.

This test used one running process and sent the notification 50 ms after the first call handler ran. It proves that Claude Code responds to the notification. It does not establish ordering guarantees for concurrent calls, process restarts, or rolling upgrades. Before this patch, the n8n controller creates a new MCP handler per request without supplying a shared event bus. Its default notification buses therefore cannot connect separate requests.


## Implementation and limits

The patch adds `McpToolChangeService`. The controller gives each request a shared event bus for its authenticated user, grant, and client. Server creation hashes the published tool definitions, including input and output schemas. A changed hash sends `notifications/tools/list_changed`. A new subscription also receives this signal after its acknowledgement. This covers changes missed during a disconnect.

Each request still builds its own MCP server. Tool handlers keep the request's user and authorization context. The service sends only channel and revision hashes through the existing Redis pub/sub system. It closes active HTTP handlers during shutdown. Separate local revision tracking prevents unchanged servers from republishing after a peer announces a different version. The advertised server version now uses the n8n version.

The installed Claude Code CLI was tested again with the production notification service and a separate MCP handler for each HTTP request. The test exposed only the synthetic read tool. No manual refresh was performed.

| Case | Observed result |
| --- | --- |
| Change detected on the next tool call | The first call succeeds. The call after the change fails with the exact schema error. Claude fetches tools automatically. The third call succeeds. |
| Notification service restart with the HTTP listener retained | The first call succeeds. Two calls after the restart fail before Claude reconnects. Claude then opens a new subscription and fetches tools. No successful post-refresh call was measured in this run. |

The restart test replaces the service and closes its active handlers. It is not a full process restart or a Docker deployment. The tests used mocked execution services. They did not run a Redis cluster or the Claude.ai connector.

The notification implementation does not meet the stronger requirement that every call continue to succeed during an incompatible upgrade. A notification does not acknowledge that the client has installed the new validator. The old schema forbids `nextCursor`, while the newer schema requires it. No single structured response can satisfy both. The observed calls do not identify the client's cached schema revision. A complete compatibility solution needs client coordination or an explicit contract version. Arbitrary server delays cannot provide that guarantee. Retrying a tool after client-side validation can repeat side effects.

The shared notification bus serves the modern `subscriptions/listen` protocol. The legacy GET endpoint still returns 405. Legacy clients that do not subscribe remain outside this fix. Mixed-version rolling deployments can still return a schema from one version and a result from another.

Keep CONTEXT-242 open. This patch fixes missing notification delivery for modern clients. It does not establish uninterrupted upgrades or resolve the original Claude.ai report.

Probe source and raw results: `/private/tmp/context-242-claude-evidence/implementation-claude.probe.test.ts`, `implementation-upgrade-results.json`, and `implementation-restart-results.json`. The probe is outside test discovery so normal test runs cannot launch Claude.


### Implementation verification

173 focused unit tests pass across nine files. After correcting the pub/sub test logger, the three affected suites were rerun and all 83 tests passed. The other six suites had already passed. Coverage includes current and cached execution schemas, controller cleanup, modern and legacy requests, notification ordering, reconnects, subscription limits, channel isolation, Redis publication failures, and the pub/sub registry, publisher, and subscriber.

Formatting, type-aware lint on changed CLI files, lint on the decorator event-name file, and `git diff --check` pass. Full repository typechecks and suites remain for CI. The local API-types and decorators build outputs were rebuilt with their existing `build:unchecked` scripts to update stale declarations. These builds do not establish type correctness.

The live Claude probes are separate from these passing unit tests. The uninterrupted-call assertion failed after restart. The observed automatic-recovery assertion passed for a schema change with an open subscription.
