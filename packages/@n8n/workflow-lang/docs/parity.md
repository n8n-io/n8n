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
| The HTTP Request library node has no compiled form in the runtime (`aot_gen.zig`) since its 401 code was removed: it runs in the interpreter | this work | `wfrt aot-gen` once, after the cards of the round are merged |
| Token renewal: the options `skipRefreshWhileTokenIsFresh` and `preAuthenticationRetryStatusCode` of a node are not in the request. With `skipRefreshWhileTokenIsFresh` v1 renews on a status other than 401 only when the token is past its expiry; the runtime renews on each such status (Jira, Confluence: one renewal more for a missing page) | this work | The node compiler writes the options into the request; the runtime needs the expiry of the token |
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

## End-to-end check in a running n8n (2026-11-17)

The check runs each workflow two times in one n8n: with the engine setting `compiled` and on v1. A local HTTP stub
stands in for the vendors. n8n starts `wfrt` (release build) and the fallback host, with
`N8N_ENABLED_MODULES=compiled-engine` and `N8N_COMPILED_ENGINE_COMPILE_NODES=true`. The script compares the webhook
response, the execution status and the requests that the stub got (method, path, query, body, credential headers).

To repeat it:

```bash
(cd workflow-runtime && zig build -Drelease=true)
pnpm build > build.log 2>&1
N8N_USER_FOLDER=<test folder> N8N_ENABLED_MODULES=compiled-engine \
  N8N_COMPILED_ENGINE_COMPILE_NODES=true ./packages/cli/bin/n8n start
N8N_URL=http://localhost:5678 node packages/cli/scripts/compiled-engine-node-compile-e2e.mjs
```

A node ran compiled from its source when the compile response has the diagnostic `node-compiled` for it. The place
`native` in the response does not tell a compiled node from a library node. A request of `wfrt` has the user agent
`n8n-wfrt`.

| Case | Runs as | Result |
|---|---|---|
| a. Webhook, Set, Respond to Webhook | module code | Equal to v1 |
| b. Discourse `post.get`, fixed parameter | compiled from source | Equal to v1 |
| c. The same, `postId` as an expression, three items | compiled from source | Equal to v1: three requests |
| d. The same, `onError: continueRegularOutput`, the stub answers 400 | compiled from source | Equal to v1 |
| e. Crypto (no compiled form) | fallback host | Equal to v1 |
| f. Manual run of the workflow of b | compiled from source | Equal to v1 in 10 of 13 runs: see "Open" |
| g. HTTP Request, OAuth2 client credentials, the stub answers 401 one time | library node | Equal to v1: 401, one token request, one resend |

Closed by this check:

| Difference | How it was closed |
|---|---|
| The n8n package did not build: the import of the Google token function had no file extension | The import has the extension `.js` |
| With the node compiler on, a workflow with a node to compile did not compile (`Cannot read properties of undefined`): the search for the file of a node class called the getters of all loaded modules | The search reads data properties only (`findExportingFile`, unit test) |
| No node with a credential ran compiled in n8n. n8n adds the field `allowedHttpRequestDomains` to each credential type that authenticates. Its default `all` was a credential class that the verified list does not have | The value `all` is not a class. Another value is a class, so the node runs in the fallback host (unit test) |
| An OAuth2 client-credentials credential without a token failed (`has no value at "oauthTokenData.access_token"`). v1 gets the first token at the first request | n8n gets the first token when it builds the credentials document (unit test) |

Open, found by this check:

| Difference | Source | What closes it |
|---|---|---|
| The compiled HTTP Request node does not read `allowedHttpRequestDomains` and `allowedDomains` of its credential. With the value `none`, v1 refuses the request, and the compiled engine sends it with the credential (case h) | `getCredentialAllowedDomains` in the v1 node (`HttpRequest/GenericFunctions.ts`) and in `routing-node.ts`; the converter has no code for the fields | The converter writes the check into the module, or keeps such a node in the fallback host |
| A manual run can lose the run data of a node that is not a leaf. The `finished` event (outbox) can come before the `step` and `trace` events (ring) of the same execution. `CompiledEngineDispatcher.finish` saves the execution at `finished` and ignores later events (case f, 3 of 13 runs) | `compiled-engine.dispatcher.ts`, `finish` and `apply` | `wfrt` sends `finished` after the ring events of the execution, or `finished` names the last trace and the dispatcher waits for it |
| The item of the Webhook trigger has no `webhookUrl` and no `executionMode`, and `headers.host` is the address of `wfrt` (case i). The fetch call of the forwarder cannot set `host` | `Webhook/utils.ts` (v1); `compiled-webhook.forwarder.ts` | The runtime adds the two fields; the forwarder sends the host in a header that `wfrt` reads |
| When a node fails in a production webhook run, the body of the 500 response has the name, the message, the HTTP code and the description of the node error. v1 answers `{"message":"Error in workflow"}` (case j) | `wfrt` webhook response | The response of v1 |
| A request of a compiled node has other transport headers: `user-agent: n8n-wfrt` (v1: `n8n`), `accept: application/json,text/*;q=0.9,*/*;q=0.8` (v1: `application/json`), `accept-encoding: identity`, no `connection: close` | stub recordings of case b | Decide; the `accept` header can change the answer of an API |
| When the publish compile fails, `POST /workflows/:id/activate` succeeds and the workflow is active, but `wfrt` has no route: the webhook answers 404 `no route`. Seen one time, with the compile error of the second closed row | `workflow-publication-applier.ts`, `apply` returns `failed` after the publish | Run the workflow on v1, or refuse the publish with the compile error |
