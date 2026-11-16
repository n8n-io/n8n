# Parity with the v1 engine: the list of differences

Status: 2026-11-16. The goal is that a workflow on the compiled engine does what it does on v1. This file lists
each known difference, where it comes from, and its state. A difference is closed only with a test against v1.
Add a row when a new difference is found. The sources are `docs/spec.md`, the README of the n8n module
(`packages/cli/src/modules/compiled-engine/`), `progress.md` and the replay results.

## Closed

| Difference | How it was closed |
|---|---|
| A trigger other than Webhook or Schedule did not fire; the workflow had to stay on v1 | n8n runs every trigger and poller that `wfrt` does not run, and starts the run in `wfrt` |
| Only one trigger of a workflow worked | A run starts at the trigger that fired |
| Only the first item of a trigger was passed | All items are passed, with their files |
| A converted schedule fired at second 0, minute 0 or hour 0 where v1 fires at a time from the workflow id and the node id | The converter writes the cron expression of v1 (test against `toCronExpression`) |
| The trigger item of a schedule was `{ scheduledAt }` | The item of the v1 node is the default |
| A Schedule Trigger rule with an interval above 1, and the Interval node, had the rhythm of the runtime | They stay triggers of n8n, which keeps the rhythm of v1 |
| A compiled request of a plain request helper got the authentication of the credential, which v1 does not add | `inject: false` on the `http` effect (runtime test, and the check against v1) |
| Request options `auth` and `form` of n8n's request helper had no compiled form | Basic auth of a call in the `http` effect; a form encoder |
| A credential type that authenticates in code could not be used by a compiled node | The node compiler compiles that code with the node |
| A compiled error had no class name, HTTP code or description | A compiled NodeApiError or NodeOperationError has the name, the HTTP code and the description; `instanceof` works |
| Node code that computes a value from a credential field did not compile | The value is a derived value of the credential: n8n computes it where the credential data is |
| A compiled node could behave differently from the v1 node | A node runs compiled only when its operation is in the list that `scripts/verify-compiled-nodes.ts` makes against the v1 node |
| An OAuth2 refresh happened only on status 401, only in the HTTP Request node, and a minted Google service-account token had no renewal on a rejected request or in a manual run | The runtime renews each renewable credential slot with one protocol (`docs/credentials-plan.md`, "Renewal"): before the value expires, and after a response with status 401 or the `tokenExpiredStatusCode` of the credential. It then sends the request again once, as `requestOAuth2` of n8n-core does. A request with a multipart body gets the renewal and no resend, as in v1. Tests: `renew.zig`, `server.zig`, and the n8n module. No test with a real service yet |

## Open

| Difference | Source | What closes it |
|---|---|---|
| Partial runs and "execute step" run the whole workflow | n8n module README | Start at a node with given run data; the converter has no entry for it |
| A run that an n8n trigger starts uses the path of a manual run (`trace: true`, row made by n8n) | this work | A production start call for trigger runs |
| Binary data only in n8n's filesystem mode; S3 and database modes are missing | `progress.md` | A store interface in the runtime (`docs/compiler-plan.md`, binary data) |
| A sub-workflow is compiled into the parent: n8n has no row for the sub-execution | `progress.md` | A sub-execution record, or a call of a loaded module |
| `$json` and `Object.keys($json)` show `$binary`; a core node keeps binary data where v1 drops it | spec section 10 | Binary data as a handle outside the item |
| All nodes of one batch see the same `$now`; v1 reads the clock at each evaluation | spec section 10 | Decide: v1 values differ by milliseconds only |
| Token renewal: the HTTP Request library node still asks for an OAuth2 refresh in its own code after a 401. When the token is refused also after the renewal of the runtime, there is a second renewal and a third request (v1: one renewal, two requests) | this work | Remove the 401 code from `src/nodes/http-request.ts`, then `wfrt aot-gen` |
| Token renewal: the options `skipTokenRefresh`, `skipRefreshWhileTokenIsFresh`, `preAuthenticationRetryStatusCode` and a `tokenExpiredStatusCode` that a node gives are not in the credentials document. The runtime uses the statuses of the credential, else 401 | this work | The node compiler writes the option of the node into the request |
| Token renewal: a request with a status 401 and a minted service-account token is sent again once with a new token; v1 makes a token for each request and does not send again. After a failed renewal for a multipart request the step gets the first response; v1 gives the renewal error | this work | Decide: the results are equal when the service accepts the token |
| Project variables are not sent to the runtime | n8n module README | Send them with the workflow |
| The log and the outbox are not encrypted at rest | `progress.md` | Card ENCRYPT |
| 140 of 18,782 certified bundles do not match v1 in the replay (99.25%) | `progress.md` | The focus runs |
| A node with "continue on fail" or an error output is not compiled from its source | this work | Errors with the description and the HTTP code of v1 |
| Request options without a compiled form: full responses, nested form values, streams | verifier, 2026-11-16 | The options one by one, each with the check against v1 |
| A compiled node drops its execution hints (`this.addExecutionHints`): the output data is the same, the editor shows no hint | node compiler, 2026-11-16 | A place for hints in the run result of a node |
| A statement that branches on a secret credential field does not compile (Mailchimp reads the data centre from the API key) | verifier, 2026-11-16 | Decide: evaluate such a condition at publish, which puts one bit of the secret in the module |
| Python Code nodes run in a process that is not a sandbox | spec section 10 | n8n's task runner |
| Polling triggers in a manual run poll in the host | spec 9.8 | Done by n8n when it runs the trigger; check |

## Not a difference in what a workflow does

These change where code runs, not the result: a node that does not compile runs in the fallback host with the
code of v1; a trigger's own requests run in n8n.
