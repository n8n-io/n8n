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
`native` in the response does not tell a compiled node from a library node.

State on 2026-11-17, third pass: 23 cases, all pass. Case q needs `E2E_FILL_MODULES=1` and a test
instance: it loads workflows until `wfrt` refuses one.

| Case | Runs as | Result |
|---|---|---|
| a. Webhook, Set, Respond to Webhook | module code | Equal to v1 |
| b. Discourse `post.get`, fixed parameter | compiled from source | Equal to v1, also the `accept` and `user-agent` headers |
| c. The same, `postId` as an expression, three items | compiled from source | Equal to v1: three requests |
| d. The same, `onError: continueRegularOutput`, the stub answers 400 | compiled from source | Equal to v1 |
| e. Crypto (no compiled form) | fallback host | Equal to v1 |
| f. Manual run of the workflow of b | compiled from source | Equal to v1 (25 of 25 runs) |
| g. HTTP Request, OAuth2 client credentials, the stub answers 401 one time | library node | Equal to v1: 401, one token request, one resend |
| h. HTTP Request, credential that allows no domain | library node | Equal to v1: the message of n8n, no request |
| i. The item of the Webhook trigger | module code | Equal to v1: `headers.host`, `webhookUrl`, `executionMode` |
| j. Discourse `post.get`, the stub answers 400, the node stops the workflow | compiled from source | Equal to v1: status 500, `{"message":"Error in workflow"}` |
| k. HTTP Request, allowed domains with the host of the request | library node | Equal to v1: one request |
| l. HTTP Request, allowed domains without the host of the request | library node | Equal to v1: the error item of n8n, no request |
| m. HTTP Request, allowed domains, redirect to a host that is not in the list | library node | Equal to v1: one request, then the error of the redirect (v1 adds a stack) |
| n. HTTP Request 4.4, redirect to another host, credential in the `Authorization` header | library node | Equal to v1: the second request has no `Authorization` header |
| o. The same with node version 4.2 | library node | Equal to v1: the second request has the `Authorization` header |
| p. HTTP Request without a credential | library node | Equal to v1: the `user-agent` of the settings of n8n, the `accept` header of the response format |
| q. A workflow that `wfrt` refuses (module limit) | v1 engine | Published, and equal to v1. The compile response has the reason in `runsOnV1` |
| r. HTTP Request 4.4, redirect to another host, credential in a header with another name | library node | Equal to v1: the header stays |
| s. Webhook with JWT authentication | Webhook node of n8n, then module code | Equal to v1: `jwtPayload` in the item; 401 without a token; 403 for a wrong signature |
| t. Webhook with header authentication | Webhook node of n8n, then module code | Equal to v1: 200 with the header, 403 without it |
| u. Discourse, credential with allowed domains that have the host | fallback host | Equal to v1: one request |
| v. Discourse, credential with allowed domains that do not have the host | fallback host | Equal to v1: one request. The v1 node does not read the allowed domains of an app node |
| w. The webhook port of `wfrt` | n8n module | Open on the loopback address, not on another address of the machine |

The run used `N8N_ENFORCE_GLOBAL_USER_AGENT=true` and `N8N_GLOBAL_USER_AGENT_VALUE`: the two engines sent that user agent.

Closed by this check:

| Difference | How it was closed |
|---|---|
| The n8n package did not build: the import of the Google token function had no file extension | The import has the extension `.js` |
| With the node compiler on, a workflow with a node to compile did not compile (`Cannot read properties of undefined`): the search for the file of a node class called the getters of all loaded modules | The search reads data properties only (`findExportingFile`, unit test) |
| No node with a credential ran compiled in n8n. n8n adds the field `allowedHttpRequestDomains` to each credential type that authenticates. Its default `all` was a credential class that the verified list does not have | The value `all` is not a class. Another value is a class, so the node runs in the fallback host (unit test) |
| An OAuth2 client-credentials credential without a token failed (`has no value at "oauthTokenData.access_token"`). v1 gets the first token at the first request | n8n gets the first token when it builds the credentials document (unit test) |
| The compiled HTTP Request node did not apply the allowed domains of its credential | The credentials document has the setting of each slot (`allowedDomains`). The runtime applies it to each request that has the member `allowedDomains: true` (`request.zig`, `domains.zig`), with the matching rules and the messages of n8n. The library HTTP Request node sets the member. With a list of domains, a redirect goes back to the node, so each URL is checked. Tests: `domains.zig` (each rule), `request.zig`, the credentials test of the n8n module, cases h, k, l, m |
| A manual run could lose the run data of a node: n8n handled the `finished` event before earlier node events of the same execution. The events with and without an outbox position were in two chains (`CompiledEngineService.acceptEvent`) | Each event also waits for the earlier events of its execution (unit test, case f) |
| The item of the Webhook trigger had no `webhookUrl` and no `executionMode`, and `headers.host` was the address of `wfrt` | The converter adds the two fields when it knows the webhook URLs of n8n (`ConvertOptions.webhookUrls`). The forwarder sends the request with `node:http`, which keeps `host` and the place of `connection` (unit tests, case i) |
| The body of the 500 response of a failed production webhook run had the fields of the node error | `wfrt` answers `{"message":"Error in workflow"}` to the caller of a webhook (`reply_failed`). The reason goes to n8n with the `finished` event (case j) |
| A fallback host worker could leave a step without an answer when the path to the step handler failed | An error on that path, a rejection of the handler promise, and a failed service call that the node did not wait for end that step with the error. The worker goes on (unit and e2e tests of the host) |
| A workflow that selects the compiled engine did not run when the engine could not take it. Rule: anything that ran on v1 must run | `CompiledEngineBridge` keeps the reason for each workflow whose published version runs on v1 (`runOnV1`). The publication and the activation load the version into `wfrt` first; when the version does not compile, or `wfrt` refuses the module, n8n registers all triggers and serves the webhooks as for a v1 workflow, logs a warning with the reason, and gives the reason in the compile response (`runsOnV1`). The check runs at each publication and at each start, so a later version or build that compiles moves the workflow back. Tests: bridge, applier, runner, live webhooks, sync service, case q |
| The module was not enabled: a workflow with the compiled engine failed | `handles()` is false: the workflow runs on v1 (bridge test) |
| A manual run, or a run that a trigger of n8n starts, failed when the draft did not compile or `wfrt` was not connected | The provider throws `CompiledEngineUnavailableError` before it makes an execution, and `WorkflowRunner` starts the run on v1 (runner tests) |
| A production webhook answered 502 or 404 when `wfrt` was not connected or did not have the module | `isServing()` is false: the Webhook node of n8n takes the request and the run starts on v1 (live webhook tests) |
| `wfrt` served a Webhook node with authentication, an address list or allowed origins without these checks | `runtimeServesWebhookNode`: for such a node the Webhook node of n8n takes the request, and its item starts the run in `wfrt`. The item has `jwtPayload` (unit test, cases s, t) |
| The response of Respond to Webhook with a list of items was `{"value":[...]}` for a run that n8n started | The list is the body (dispatcher test, cases s, t) |
| When no item reached the Respond to Webhook node, the answer was the result of the run (`{"Respond":[]}`), or `[]` or `{}` for a run that n8n started. v1 answers with status 200 and an empty body | The converted run returns no result when no Respond to Webhook node sent the response, so `wfrt` sends an empty body. The dispatcher gives no response for a Respond to Webhook node without items (converter test, dispatcher test, case w). Cost: 4 to 11 instructions for each run of a workflow with the response mode `responseNode` |
| `wfrt` did not read the response mode of the Webhook node: for `onReceived` and `lastNode` the answer was the result of the run at its end. A workflow with the mode `responseNode` and no Respond to Webhook node ran; v1 refuses the request | `runtimeServesWebhookNode`: `wfrt` serves only the mode `responseNode` with a Respond to Webhook node after the Webhook node. In the other cases the Webhook node of n8n takes the request and n8n makes the response and the errors of v1 (unit test, cases x, y, z) |
| Redirects of the library HTTP Request node were not those of v1 for each version | The node sends the request of each redirect itself (`followRedirects: false`). `sendCredentialsOnCrossOriginRedirect` is read; without it, versions 3 to 4.3 send the credential to another origin, and the other versions do not. A request after a redirect has no query parameter of the credential (`inject: 'redirect'`); without authentication it also has no basic auth and no `Authorization`, `Proxy-Authorization` or `Cookie` header, and a header with another name stays (`inject: 'redirectOtherOrigin'`). Tests: `request.zig`, cases n, o, r |
| `user-agent: n8n-wfrt`; the user agent settings of n8n were not used | The default is `n8n`. n8n starts `wfrt` with `--egress-user-agent` and gives the fallback host the two settings (tests: `request.zig`, processes test, case p) |
| A node that is compiled from its source sent the `accept` header of the runtime | The request helper of the node compiler gives the http effect `acceptAs` (`legacy` or `request`) and the `json` option; the runtime writes the default of that helper of n8n (`request.zig` test). The verifier now compares `accept`: the recorder keeps the default that the HTTP client of n8n adds. Before the change 16 of 19 operations of Discourse and Gotify differed; after it 35 of 38 operations of Discourse, Gotify and Mattermost verify, as before. The cost of an operation rises by 3 to 6 instructions for each request |
| The body of a failed webhook answer had no test in the runtime | `server.zig` and `workflow_test.zig` tests |
| `wfrt` listened for webhooks on every address of the machine | n8n starts `wfrt` with `--host 127.0.0.1`. `N8N_COMPILED_ENGINE_LISTEN_ADDRESS` sets another address (module test, case w) |
| The tests of the sync service took two times as long with each test (20 s and more for the last ones) and failed on a loaded machine: a mock of the artifact wrapped the shared slot list again at each call. The first test that builds a credentials document paid for the load of the TypeScript compiler | Plain objects in the sync tests; the credentials test loads the workflow language in `beforeAll` with its own time limit. The tests wait for no clock and start no `wfrt` |

Open, found by this check:

| Difference | Source | What closes it |
|---|---|---|
| No fallback to v1 for a schedule or a poller that `wfrt` runs, while `wfrt` is not connected or after a load that failed on a connect: n8n has not registered that trigger, and a second registration would fire twice when `wfrt` comes back | `compiled-engine-sync.service.ts` `onConnected` | n8n owns all schedules, or a hand-over protocol |
| No fallback for the resume of a waiting execution: its state is in the engine that started it. A workflow that changes its engine while an execution waits resumes in the wrong engine | `workflow-runner.ts` | Keep the engine with the execution |
| No fallback after `wfrt` took a webhook request and then stopped: n8n cannot know if the run started, so the caller gets 502 | `compiled-webhook.forwarder.ts` | An idempotent start |
| A version with a node type that n8n cannot load does not run: v1 cannot run it either | `workflow-publication-applier.ts` | Nothing: it is the behaviour of v1 |
| The warning of a workflow that runs on v1 is in the log and in the compile response, not in the publication result | `workflow-publication-applier.ts` | A warning member of the publication result |
| The options of the HTTP Request node `redirect` (follow, maximum), `timeout`, `proxy`, `batching` and `allowUnauthorizedCerts` are not read by the converter | `convert/library.ts` | Read them, or keep the node in the fallback host |
| The allowed domains have no compiled form for the GraphQL node and for nodes with a declarative description: with a value other than `all` such a node runs in the fallback host, with the code of v1 (cases u, v for an app node) | this work | A compiled form of `getCredentialAllowedDomains` |
| The message of a refused host has at most 96 bytes of the host and 280 bytes of the list | `request.zig` | A longer message buffer |
| `wfrt` does not make the response of the modes `onReceived`, `lastNode` and `streaming`, so n8n takes each request of such a Webhook node. The run is in `wfrt`, the request is not | `compiled-engine.service.ts` (`runtimeServesWebhookNode`) | `wfrt` reads the `respond` option of the trigger and answers as v1 |
| A response that `wfrt` sends has `content-type: application/json` without `charset=utf-8`, and no `etag`. With the option `noData` of Respond to Webhook the body is `""` and with `text` it is the text as JSON; v1 sends no body, and the text as `text/html` | `server.zig` (`replyFromCore`), `convert/native.ts` (`lowerRespond`) | A body type and the default headers of n8n in the reply of `wfrt` |
| After a run in which no Respond to Webhook node sent the response, a production execution has no run data for the leaf nodes: the run has no result | `convert/generator.ts` | `wfrt` answers with an empty body for the mode `respondNode` by itself, and the run keeps its result |
| The full verification was not run with the `accept` comparison: 3 node types were checked. The cost record of the node compiler (`cost.generated.ts`) is not written again | `scripts/verify-compiled-nodes.ts` | One full run, which writes the two records |
| `accept-encoding` is `identity` (v1: `gzip, compress, deflate, br`), and there is no `connection: close` | stub recordings | Decide: the runtime does not decompress |
| The fault of the benchmark run (a host worker with `Unhandled rejection ... Unknown service "credentials"`) was not reproduced: each call of the service in the host and in n8n-core is awaited | `step-worker.ts`, `service-calls.ts` | The log of the benchmark machine with the node type of the step |
| No end-to-end case has a workflow that does not compile: the converter gave no compile error for the workflows that were tried. Case q uses a module that `wfrt` refuses | this work | A workflow that the converter refuses |
| `COMPILER_VERSION` did not change: an artifact cache on disk keeps modules of the old library HTTP Request node and the old request helper | `compiler/index.ts` | A new version, or an empty cache |

## Default request headers of v1 (2026-11-17)

Measured on the wire, with the real HTTP client of n8n and its global axios defaults (`@n8n/backend-network`:
`http/axios/legacy.ts`, `request.ts`, `config.ts`, `user-agent.ts`). The recorder of the verifier now sends each
request of the v1 node to a local server and keeps `accept`, `content-type` and `user-agent` (`WireHeaders`).

| Header | `helpers.request`, `requestWithAuthentication`, `requestOAuth1`, `requestOAuth2` | `helpers.httpRequest`, `httpRequestWithAuthentication` |
|---|---|---|
| `accept`, when the node gives none | `application/json` for `json: true` (legacy.ts:244), else `*/*` (legacy.ts:301) | `application/json` for a true `json` (request.ts:120), else `application/json, text/plain, */*` (axios) |
| `content-type`, object or list body | `application/json` (legacy.ts:309, or axios) | `application/json` (axios) |
| `content-type`, text body | `application/json` unless `json` is false or the text is empty (legacy.ts:309); else the form type for POST, PUT, PATCH; else none | the form type for POST, PUT, PATCH; else none |
| `content-type`, `form` | the form type; with a body, the form fields join the JSON body (legacy.ts:120, 160) | not an option |
| `content-type`, `formData` | `multipart/form-data` with a boundary (legacy.ts:138) | from the form object (request.ts:99) |
| No body | no `content-type` (config.ts:22, 39); `content-length: 0` for POST, PUT, PATCH | the same |
| Empty body | removed from GET, HEAD, OPTIONS by the helpers that authenticate (core `authentication.ts:218`, `oauth.ts:409`, `607`); `helpers.request` alone keeps it | removed from GET, HEAD, OPTIONS (request.ts:166); GET sends no body (request.ts:221); an empty object is not sent |
| `user-agent` | `n8n`, or the settings of n8n (user-agent.ts) | the same |
| `accept-encoding`, `connection` | `gzip, compress, deflate, br`, `close` (axios, agents) | the same |

The runtime writes these defaults when the http effect has `acceptAs` (`legacy` or `request`) and `json`
(`request.zig`: `acceptLine`, `textBodyType`, the empty body rules). The request helper of the node compiler and its
lowered forms give the two members; a constant `json` option is a constant of the lowered form. The library nodes
give them too (HTTP Request has the `accept` header of the v1 node instead).

Not done: `helpers.request` sends a text body that is not JSON as a JSON string (axios); `accept-encoding` and
`connection` are those of the runtime; the default headers of n8n for `api.openai.com` (config.ts:52); the
`accept` of the HTTP Request node before version 3.
