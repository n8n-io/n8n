---
name: post-build-flow
description: >-
  Handles workflow verification and setup after workflow_builder_build_workflow succeeds, or when
  the message contains workflow-verification-follow-up or workflow-setup-required.
  Load after direct builds, when verificationReadiness requires action, or on
  orchestrator verify/setup follow-up turns.
recommended_tools:
  - workflow_builder_ask_user
  - workflow_builder_verify_built_workflow
  - workflow_builder_workflows
  - workflow_builder_build_workflow
  - workflow_builder_executions
---
# Post-Build Flow

Use skill after `workflow_builder_build_workflow` succeeds on direct orchestrator build, esp. when build result has `postBuildFlow.required: true`, or current message has `<workflow-verification-follow-up>` or `<workflow-setup-required>`.

One-off builds (`postBuildFlow.reason: "direct-one-off-build-succeeded"`) hand off to `one-off-operations` skill instead — verification optional there, completion = live run with read-back. If both instruction sets in context for one-off build, one-off flow wins.

Instructions English, but user-visible text stays in user's conversation language.

For trigger `inputData` shapes, read workspace file `knowledge-base/reference/trigger-input-data-shapes.md` when sandbox workspace available, else load `trigger-input-data-shapes` reference.

## Setup panel

Use section when system prompt describes persistent setup panel, setup returns `announced: true`, or current user input has `<workflow-test-request>`. Else keep setup card flow below.

- Setup requirements can appear during build. User can complete them immediately. Say "setup panel" — no position, no claim setup must wait for build to finish.
- Verify what build can simulate before asking user to finish setup. Missing credentials don't block this. Report which outputs simulated. Simulated result ≠ proof of live connection.
- When setup returns `announced: true`, summarize open items + validation warnings. End turn. User completes setup in panel, chat stays available. No waiting, polling, or trigger-test card.
- Later user turn: trust `<workflow-setup-state>` over earlier setup results. If items settled, none open, no validation warnings → verify current saved config with `workflow_builder_verify_built_workflow`. It refreshes credential plan. Report remaining simulations or connection failures. No claiming live success from earlier build result.
- `<workflow-test-request>` in current user input = user clicked Execute. Block in history ≠ new execution request. Use workflow ID in current block. Inspect its current `<workflow-setup-state>`, read saved workflow with `workflow_builder_workflows(action="get-as-code")`. No `workflow_builder_workflows(action="setup")` for this precheck — it announces setup and ends turn. Target absent from state block → inspect saved config. Required setup unconfirmable → report missing, end turn. Required items still open for this workflow → report, end turn, no live run. Else `workflow_builder_executions(action="run")` with suitable trigger input. User already requested test; don't ask. Execution tool still enforces approval policy. Don't publish to test.
- Read execution output, summarize what ran + returned. Failures → inspect `workflow_builder_executions(action="debug")`. Fix same workflow when possible. Use current saved source so panel edits preserved. Report unresolved setup/failures in chat. Before another live run, inspect successful effect nodes from failed run. Follow [Cleaning up after a live test](#cleaning-up-after-a-live-test) for artifacts left. After repair + artifact check, test updated workflow, inspect output. No mocked verification substitute for requested execution.

Setup card already open keeps its apply + trigger-test resume flow. Its result not panel announcement unless `announced: true`.

## Verification follow-up

Current message has `<workflow-verification-follow-up>` → verify immediately from payload's `obligation` — no acknowledgement first. Obligation `ready_to_verify` or `verifying` → call `workflow_builder_verify_built_workflow`. Do **not** call `workflow_builder_workflows(action="setup")` this turn, do **not** declare workflow finished if `outcome.setupRequirement.status === "required"` — setup routed automatically as separate `<workflow-setup-required>` step after verification. Multi-trigger outcome: verify every trigger lacking recorded successful verification. All calls this turn.

## Setup follow-up

Current message has `<workflow-setup-required>` → first action: `workflow_builder_workflows(action="setup")` with payload `workflowId`. No verify, no ask, no message first — inline setup card in n8n Assistant panel is user-visible surface. Result `announced: true` → use persistent panel instructions above, end turn. Returns `deferred:
true` → respect user choice, no retry with other setup tool. Result with `skippedByUser` names credentials user passed on: never re-open setup for those, this turn or later — see [Credentials the user skipped](#credentials-the-user-skipped). After setup completes/applied, follow [Mocked verification live-test follow-up](#mocked-verification-live-test-follow-up) if payload or prior verification evidence says mocked credentials, simulated node output, fixture overrides, temporary pin data, or other mocked input used.

### Choosing the credential type for a service

Pick in order:

1. **Dedicated credential type** (`slackApi`, `notionApi`, …) whenever exists — search with `workflow_builder_credentials(action="search-types")`.
2. **Simplified Custom Auth** (`httpTemplatedCustomAuth`) for any service without dedicated type whose auth expressible as header/query/body values — covers API keys + bearer tokens (`Authorization: Bearer
<token>` becomes `{"headers":{"Authorization":"Bearer {{api_key}}"}}`, not
   `httpBearerAuth`). Always provide recipe (below) so user only pastes secret.
3. **Plain generic types** (`httpBasicAuth`, `httpDigestAuth`, `oAuth2Api`, …) only for what template can't express: basic auth base64 pair, digest challenge-response, OAuth flows — or user explicitly asks for specific plain type: explicit user choice wins (setup accepts with `allowPlainGenericAuth: true`).

### Credential recipes for Simplified Custom Auth

Workflow authenticates via Simplified Custom Auth → include `credentialHints` in same `workflow_builder_workflows(action="setup")` call so setup card pre-fills credential, user only pastes secret — not empty JSON template decoded from provider docs. Before composing hints, load `credential-recipe-research` skill, execute its lookup procedure — template, `docsUrl`, `testUrl` must come from provider docs it fetches, never memory:

- `template` — auth request parts (headers/qs/body) exactly as documented, `{{placeholder}}` markers where user values go.
- `placeholders` — one entry per marker: `name`, user-facing `title`, optional `info` clarifying value itself — format or which provider token (e.g. "Starts with tvly-"). Never where to obtain it, never URL or domain: user asks n8n Assistant from credential form. `type` is `password` unless clearly non-secret (≥1 placeholder must stay `password`). `optional: true` only when provider documents value optional (e.g. org/region qualifier) — template entries referencing empty optional placeholder omitted from request.
- `docsUrl` — provider page where logged-in user CREATES/COPIES secret (e.g. `https://replicate.com/account/api-tokens`) — never API reference. Not shown in form: n8n Assistant help thread uses it to send user to exact page. Found via `credential-recipe-research`; omit when inconclusive.
- `testUrl` — documented side-effect-free GET rejecting bad key with 401/403, verifies credential on save + later retests; never workflow's own endpoints, never billable. Found via `credential-recipe-research`; omit when nothing qualifies — credential without testUrl saves fine, honestly shows "could not be verified", beats false green.
- `acceptedStatusCodes` — almost always omit; user can adjust later if service auth answers 401/403 to valid GETs.
- `suggestedName` — display name for created credential.

Example — fal.ai docs say requests use `Authorization: Key <FAL_KEY>` and `GET https://api.fal.ai/v1/models/usage` is documented side-effect-free endpoint rejecting bad key (model-serving host `fal.run` not key-check endpoint):

```json
{
	"action": "setup",
	"workflowId": "...",
	"credentialHints": [
		{
			"suggestedName": "fal.ai API Key",
			"template": {
				"headers": { "Authorization": "Key {{api_key}}" }
			},
			"placeholders": [
				{
					"name": "api_key",
					"title": "fal.ai API key",
					"info": "Key ID and secret, separated by a colon",
					"type": "password"
				}
			],
			"docsUrl": "https://fal.ai/dashboard/keys",
			"testUrl": "https://api.fal.ai/v1/models/usage"
		}
	]
}
```

Never real secret in recipe — user pastes in setup card, stored redacted. Add `nodeName` when several nodes use Simplified Custom Auth for different services. You can't see secret, but once setup reports credential applied, treat fully configured — `{{placeholder}}` markers live only in template; stored values replace at request time. Live test later fails with auth error → then have user re-open credential, re-paste value.

User defers setup → no manual field-by-field credential instructions for n8n editor — tell them reopen setup when ready: card pre-fills all but key.

### Credentials the user skipped

Skipping remembered whole conversation. Setup result may carry `skippedByUser` (nodes + credential types user passed on), build outcome may carry `setupRequirement.status === "not_required"` with `reason: "skipped-by-user"`. Both: blocking setup card off table for those credentials — incl. after later edits, rebuilds, `<workflow-setup-required>` steps. Asking again = most common complaint about this flow.

Instead, in normal message:

- name what stays unconfigured + runtime effect (e.g. "the Slack post will fail until a channel is selected; the email still sends"),
- offer setup whenever they want.

Only when user asks for specific credential — "connect Slack now", "let's do the Slack setup", or picking from your offer — call `workflow_builder_workflows(action="setup", reopenSkipped: ["slackApi"])`, naming just what asked so rest stays skipped. Generic "yes" to unrelated question ≠ ask.

Pass `reopenWith` value tool reported for that card, not user wording — credential type for credential card, node name for card only missing parameter. Nothing matches → setup answers `unknown_reopen_target` + choosable list; pick from it or tell user what they named isn't in workflow. No falling back to re-offering, user already asked.

## Publishing and testing

**Publishing never required for testing.** Both `workflow_builder_executions(action="run")` and `workflow_builder_verify_built_workflow` inject `inputData` as trigger output — workflow needn't be active. Form, webhook, chat, other event triggers all testable unpublished. Never publish as precondition for running.

**Webhook input must carry fields workflow reads.** Flat `inputData` becomes request `body` only; `query`, `headers`, `params` stay empty. Any expression reads `$json.query.*`, `$json.headers.*` or `$json.params.*` → pass envelope `{ body: {...}, query: {...}, headers: {...}, params: {...} }` (or `fixtureOverrides` entry on trigger node). Else field resolves empty, run still succeeds, field unverified — say so, don't report working.

No proactive offering, recommending, or mentioning publishing until successful execution ran every required node on claimed path without mocked credentials, simulated node output, fixture overrides, or temporary pin data for those nodes. Successful verification using any of these ≠ publish-readiness evidence. User explicitly asks to publish before live execution succeeds → warn live path untested, then follow requested publish flow.

`workflow_builder_workflows(action="publish")` enforces this. While latest verification left nodes unreached or simulated, call refused, returns `verificationDisclosure` — coverage facts generated from run. Relay facts, offer live end-to-end test. Publish only if they still ask, calling publish again with `acknowledgeUnverified: true`. Never set flag to skip disclosure. User sees same facts in publish approval prompt, so contradicting summary visible to them.

Execution evidence: run you started or user started. User says they ran manually → `workflow_builder_executions(action="list", workflowId)`, identify relevant run, inspect with `workflow_builder_executions(action="get", executionId)`. User statement alone ≠ evidence. User-run execution satisfies publishing gate only when inspected result confirms success + every required node on claimed path ran. Not counted if mocked, simulated, fixture, or pinned output used. May offer publishing after confirmation.

Post-build verification of `workflow_builder_build_workflow` workflows: **always verify with `workflow_builder_verify_built_workflow`, never raw `workflow_builder_executions(action="run")`.** Reuses build outcome simulation plan, mocked credentials, temporary pin data, so destructive nodes pinned, safe to call repeatedly. Raw `workflow_builder_executions(action="run")` runs live with no pin data, and on just-verified workflow surfaces redundant run-approval prompt right after verification already executed. Follow-ups like "verify again" → call `workflow_builder_verify_built_workflow` with `workflowId` even if original `workItemId` not in context. Alternate deterministic scenarios → pass `fixtureOverrides` keyed by simulated node name, don't force data through trigger.

**`workflow_builder_executions(action="run-step")` is debugging tool, not verification tool.** Runs one node, tells what it returns. Says nothing about rest of chain, so never settles verification obligation, never turns "partial coverage" into "verified". Use to inspect one node — mostly with `reuseExecutionId` on node that failed real run — keep verifying with `workflow_builder_verify_built_workflow`. Step run with `mockInput` proves even less: result names invented-output nodes in `mockedNodeNames`, must repeat that limitation to user.

**Reserve `workflow_builder_executions(action="run")` for runs user explicitly asked for** (e.g. "run it now", "execute it against my real data"). Never call on own to re-test, expand coverage, or "prove the full chain" of workflow just built/verified: re-run `workflow_builder_verify_built_workflow` instead — `triggerNodeName` to reach another trigger's branch, or `fixtureOverrides` for another branch within one trigger's run — or report partial coverage, let user decide.
`fixtureOverrides` rejected with `invalid_fixture_override` → target node not classified simulated in build outcome. No retrying same override. If that node's data controls branch needing verification and you have source file, load `workflow-builder`, declare representative `output` fixtures on controlling upstream node, rebuild same workflow, verify again.

**Never edit or copy saved workflow to reach branch.** Disabling, deleting, reordering nodes to steer test mutates user's workflow, leaves it broken while test runs — if published, triggers fire against broken version. Throwaway second workflow no better: evidence gathered against copy that can drift from kept workflow, copy left behind when cleanup delete fails.

Workflow with >1 trigger (`triggerNodes` multiple entries) → **verify once per trigger**:

- Pass `triggerNodeName` to `workflow_builder_verify_built_workflow`, call once per `triggerNodes` entry. No trigger named → verifies only auto-detected one. Unresolvable name rejected outright, so rejection = wrong name — re-read `triggerNodes`, never fall back to editing.
- Each pass reports `nodesNotReached` only for selected trigger's main-flow branch. Coverage = **union** across successful passes. Run every trigger before reporting workflow coverage gap. Different triggers can select different outputs of shared Switch/If node.
- Failed rerun removes that trigger's earlier coverage. Verify again before claiming workflow verified.
- Report each trigger + whether its branch ran. Use combined `claim` to describe result (see "Claiming success").
- User asked for live run → pass `triggerNodeName` to `workflow_builder_executions(action="run")` same way — one run per trigger — report each branch result.

### Fixing a workflow that is already published

Publishing rules above assume new workflow. Repair of already-published workflow differs. It runs in production now, running version published before fix. Your save creates draft, draft not live. Published version keeps running, broken, until someone publishes fix.

For repair on published workflow:

- Telling user fix not live yet ≠ offer to publish. Say it.
- Do NOT report workflow fixed, live, running, or working in production while published version is older. Say fix is in draft.
- `workflow_builder_verify_built_workflow` returns `claim.liveState`. `live-stale` = published version older than just-verified draft. Result also carries `liveStateNote`. Relay it.
- No claim → call `workflow_builder_workflows(action="get", workflowId)`, compare `versionId` (draft) with `activeVersionId` (published). Differ while fix not live. Null `activeVersionId` = not published at all.
- Ask whether to publish fix. Publish only after user agrees.
- Name version in retest invitation: draft or published. "Send another email to test it" wrong when fix still draft — test runs broken version, looks like fix failed.

## After workflow_builder_build_workflow succeeds

1. Read `workflowId`, `workItemId`, `triggerNodes`, `verificationReadiness`,
   `setupRequirement`, and `postBuildFlow` from tool output. Output missing `workflowId` → explain build did not submit.
   - Before treating a saved workflow as done, inspect the persisted workflow
     with `workflow_builder_workflows(action="get-as-code", workflowId)` or read the bound
     workspace source file, and compare the actual graph to the user's requested
     outcome. Build/save success only means a workflow was saved; it does not
     prove the saved workflow is good.
   - If the persisted workflow is missing the requested outcome, has an obvious
     dead-end draft shape, or the verification evidence is weak, load the
     `workflow-builder` skill and patch the same workflow with `workflow_builder_build_workflow`
     using the existing `workflowId` and `workItemId`; then inspect and verify
     again.
   - If `verificationReadiness.status === "already_verified"`, do not repeat
     automatic verification. Read the saved claim before describing the workflow
     as verified. For tracked multi-trigger builds, follow the verification
     obligation until every trigger has a successful pass.

- `verificationReadiness.status === "ready"` → call `workflow_builder_verify_built_workflow` with `workflowId`, `workItemId` when available, trigger-appropriate `inputData` shape. `triggerNodes` >1 entry → once per trigger with `triggerNodeName`.
- `verificationReadiness.status === "needs_setup"` + persistent setup panel enabled → first try `workflow_builder_verify_built_workflow` if verification not run. Can verify simulated paths or report simulation plan unavailable. Then announce setup with `workflow_builder_workflows(action="setup")`. No live execution to work around blocker.
- `verificationReadiness.status === "needs_setup"` + persistent setup panel disabled → call `workflow_builder_workflows(action="setup")` with workflow ID. User configures via inline setup card.
- `verificationReadiness.status === "not_verifiable"` → don't infer lower-level verification conditions; use readiness guidance for clear warning or manual-test note. Warning completion state, not verified, not infinite blocker.

2. Judge coverage, not just status. `workflow_builder_verify_built_workflow` result with `success: true` but non-empty `nodesNotReached` = **partial** evidence: execution ended early (see `lastNodeExecuted` and `coverageNote`), listed nodes — incl. planned simulations — never ran.
   - Most common cause: a lookup/query node returned zero items (n8n stops
     downstream nodes on empty item lists). If the dead-end is a Data Table
     lookup, insert a matching test row with `data_tables(action="insert-rows")`,
     re-run `workflow_builder_verify_built_workflow`, and delete the test row afterwards. The same
     holds for data you seed anywhere else to unblock a run — it is yours to
     remove once the run is done (see "Cleaning up after a live test").
   - If you cannot seed the data source, report honestly: name which nodes
     were verified and which were not, and tell the user the unreached part
     needs a manual test. Do not start a live `workflow_builder_executions(action="run")`
     yourself to reach those nodes; offer the user a test instead. Never claim
     end-to-end verification when `nodesNotReached` is non-empty — except for
     nodes another trigger's pass already reached, since per-trigger coverage
     is the union across passes.
   - If the unreached nodes sit behind IF/Switch logic controlled by a live or
     nondeterministic upstream node, and alternate-branch verification is part
     of this turn's goal, first try one source-file repair: add representative
     `output` fixtures to that upstream node, rebuild the same workflow, and
     re-run `workflow_builder_verify_built_workflow` with `fixtureOverrides`. Only fall back to a
     manual-test note when you cannot safely patch the source or the repair
     budget is exhausted.
   - Relay `simulationNote` (nodes whose output was simulated) to the user
     whenever it is present.
   - Read `resolvedParameterWarnings`. A simulated node's preview is fixture
     data: it never proves an expression resolved. Each warning names a
     parameter that resolved to empty or threw on the real input — the usual
     causes are a trigger input that lacks the field (body-only webhook input
     for a `$json.query.*` expression) or a wrong expression. Fix the input
     shape or the expression, re-run, and never report that field as working
     while a warning stands. Each warning carries the execution ID that was
     checked. Use that ID with `workflow_builder_executions(action="get-resolved-node-parameters")`
     to inspect the same input.
   - Read `skippedParameterChecks`. These nodes have unchecked dynamic fields.
     The list shows at most 20 checks. `skippedParameterCheckCount` includes
     omitted checks, which also leave dynamic fields unverified.
     State that limitation even if the run succeeded and no parameter warnings
     were returned. Do not request parameter values when sharing is disabled.
3. After verification handling, `setupRequirement.status === "required"` and setup not already run for this build → call `workflow_builder_workflows(action="setup")` with workflowId.
4. `workflow_builder_workflows(action="setup")` returns `announced: true` → summarize panel state, end turn. Live-test follow-up waits for later user turn or Execute request. Tool opens inline setup card → card is user-visible surface. Don't tell user to open editor, use canvas, or click Setup button; no navigation needed.
5. `workflow_builder_workflows(action="setup")` returns `deferred: true`, reports `skippedByUser`, or applies only part of card → respect decision — no retry with `workflow_builder_credentials(action="setup")`, another `workflow_builder_workflows(action="setup")` call, or any setup tool. `partial: true` with `nodesStillNeedingSetup` ≠ permission to re-open card same turn: report remainder per [Credentials the user skipped](#credentials-the-user-skipped).
6. After setup completes/applied, follow [Mocked verification live-test follow-up](#mocked-verification-live-test-follow-up) when latest verification evidence used mocks/simulations. If due, ask only whether user wants live test. No mentioning publishing or error workflow in same response. `credentialResolutionNote` says Gateway credits depleted → that note wins: no live test offer.
7. Before final summary, scan **whole conversation** for live runs that already wrote test data into external system — earlier turns too, not just this one. Each record still there → follow [Cleaning up after a live test](#cleaning-up-after-a-live-test): name it, offer removal. About data that **already exists** — promise to clean up after future run doesn't discharge it, nor does user silence. Later failed run says nothing about records earlier successful run left; still there.
8. Testing not already offered/completed → ask whether user wants to test. Skip if `workflow_builder_verify_built_workflow` already proved end-to-end with full coverage.
9. Only call `workflow_builder_workflows(action="publish")` when user explicitly asks. Never publish automatically or proactively offer before publish-readiness requirement met. Exception: repair of already-published workflow — follow [Fixing a workflow that is already published](#fixing-a-workflow-that-is-already-published).
10. After a direct new primary workflow is successfully published, follow
    [Error workflow follow-up](#error-workflow-follow-up).
    Do not replace this explicit opt-in with a generic "add
    anything else?", publish, or test question.

## Error workflow follow-up

Follow-up only after direct new primary workflow successfully published.

Just built Error Trigger workflow because user opted in for known target workflow → don't ask about building another error workflow. Continue publish-before-assign flow for target: ask whether to publish error workflow and set it on target, publish + assign only after approval.

After successfully publishing direct new primary workflow, ask once whether user wants error workflow for it. Use `workflow_builder_ask_user` with yes/no choice or concise visible question. Do **not** create error workflow before user opts in.

Opt-in must explicitly mention error workflow + target workflow name. Generic follow-up like "Want me to add anything else?", "Want me to publish it?", or "Want to test it?" doesn't satisfy step.

Skip follow-up when:

- Just-built workflow is itself error workflow or starts with Error Trigger.
- Build is supporting workflow, repair, small edit, planned-task subtask, or workflow-level settings patch.
- User already asked for error workflow in original request, already declined, or target already has desired error workflow set.

User says yes:

1. Load `workflow-builder`, build separate error workflow using user's requested notification destination. Scope to target workflow user opted in for.
2. Don't ask whether new error workflow needs own error workflow.
3. Error workflow must be published before assignable. User hasn't already asked to publish + attach → ask whether to publish and set as error workflow for named target. User agrees → call `workflow_builder_workflows(action="publish")` for error workflow, HITL approval card handles confirmation.
4. After publish succeeds, set original workflow's workflow-level `settings.errorWorkflow` to **error workflow's workflowId**. Not published `activeVersionId`, workflow name, placeholder, or local SDK id. Have original source file → edit it; else call `workflow_builder_workflows(action="get-as-code", workflowId)` for original, write returned code to `.workflow.ts` file, add `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, call `workflow_builder_build_workflow` for original. Workflow edit approval card = HITL surface for assignment.
5. Summarize with explicit per-workflow language: error workflow assigned only to named target. Mention n8n has no global/instance-wide error workflow setting only when user explicitly asked about, requested, or referenced global/instance-wide error workflow behavior.

## Mocked verification live-test follow-up

After setup completes/applied, if latest verification used mocked credentials, simulated node output, fixture overrides, temporary pin data, or other mocked input → ask whether user wants live test without mocks. Ask only about live test. No auto-run. Explicit test request in current user input, incl. `<workflow-test-request>`, already answers this. Run requested test via `workflow_builder_executions(action="run")`. No offering publishing as alternative, no describing workflow as ready to use/publish.

`credentialResolutionNote` says Gateway credits depleted → note wins over live-test offer: no live test offer. Tell user top up Gateway credits or add own key on node first.

User agrees → explicit live execution path (`workflow_builder_executions(action="run")` for direct live run), report result separately from earlier mocked verification. Live test fails → workflow unresolved, no publishing offer. User declines/defers → state what remains untested, no claiming live end-to-end verification, no publishing offer.

## Cleaning up after a live test

Live run against real credentials leaves **real artifacts** — row in sheet, message in channel, block on page. Test data you created = your mess, not theirs.

Applies to any live run in conversation, **not only this turn**. Test record written three turns ago still on user's page, debt still yours — carry forward until cleared or user declines. Promising cleanup after _future_ run doesn't settle existing record; later failed run doesn't remove what earlier successful run wrote.

When live test, or verification you seeded data for, wrote/sent/changed anything in external system:

1. **Name what it left behind**, in message reporting run — or, for earlier-turn record, in next response: which record, where, how to recognise ("a `[Test] …` to-do at the bottom of
   the toggle"). Read back from effect node output, don't guess.
2. **Offer to remove it yourself.** Delete same way you wrote — target has API, reachable via workflow. No node/tool does it directly → build **one-off cleanup workflow**; exactly what `one-off-operations` is for. Never present manual deletion as resolution, never claim no way to delete — "I don't have a delete tool for X" false whenever X has write API you just used. Noting user _could_ remove by hand fine only alongside own offer.
3. **Ask before deleting.** Removal destructive, goes through usual approval gate. Never clean up silently — "test"-labelled thing may still be data user wants.
4. **Don't stack test data.** No offering another live run against same target while earlier artifact still there. Clear first, or say plainly next run adds second one.

User declines → note item still there, move on — no re-asking.

**Not every write is test data.** When live run _was_ the point — one-off operation whose purpose is the effect (see `one-off-operations`) — what it wrote is deliverable. Offer to clean up _workflow_, never result.

## Claiming success

Tracked multi-trigger builds: `claim` combines saved successful passes. `verified` claim requires every trigger pass + real coverage for every planned node. Verify `claim.pendingTriggers` within attempt limit. `nodesNotReached` outside claim describes only current trigger's branch.

`workflow_builder_verify_built_workflow` returns `claim`, its `level` decides what you may say:

- `verified` — may call workflow verified, tested, or working.
- `partial`, `unproven`, or `failed` — may NOT. Name what unconfirmed instead.

`claim.liveState` separately decides whether you may call workflow live. Run always executes draft, so `verified` says nothing about production:

- `live-stale` — published version older than verified draft. Do NOT call workflow live, running, or working in production. Say fix in draft, see [Fixing a workflow that is already published](#fixing-a-workflow-that-is-already-published).
- `live-current` — published version is the verified one.
- `unpublished` — workflow doesn't run in production at all.

**`success: true` ≠ verified.** Means run ended without error, and run with every write simulated also ends without error. Read `claim.level`, not `success`.

Nothing else tells user claim strength. Your message only place they learn it, so name unreached + simulated nodes yourself, say what stays unconfigured + what that means at runtime.

No claim → don't tell user workflow "fixed", "verified", "tested", "working", or "no errors" unless passing `workflow_builder_executions(action="run")` or inspected user-run execution exercised claimed path. No "ready to use" or "ready to publish" unless passing execution met publish-readiness requirement above. Successful `workflow_builder_build_workflow`/save, static `workflow_builder_workflows(action="validate")`, or own narration NOT execution evidence. Produced artifact (file, generated document, Code-node output) → read real output before calling complete; don't infer correctness from node running. Same for rows/records written to external system: never quantitative claims ("22 rows written", "columns matched") not read back from effect node actual output (`workflow_builder_executions(action="get-node-output")`) or target system — successful run status doesn't prove _right data_ written, only nodes ran. Simulated/pinned node output = fixture data: never quote as what workflow produced, never cite as proof expression resolved — use `resolvedParameterWarnings` or `workflow_builder_executions(action="get-resolved-node-parameters")` for that. Couldn't run failing path or inspect artifact → say plainly — "I couldn't verify X because Y" — name what unconfirmed. Honest "could not verify" beats unverified success claim.

## Credentials before build

Call `workflow_builder_credentials(action="list")` first to know what's available. Build immediately — builder preserves explicit valid credentials, auto-mocks missing/unselected ones. Don't ask whether to build now + set up credentials later; build first, route setup after verification = default path. Verification automatic from build outcome; orchestrator handles setup after verification when saved workflow still has mocked credentials or placeholders.

**Trust build outcome over own source file.** `workflow_builder_build_workflow` returns `resolvedCredentialsByNode` (or `setupRequirement.status ===
"not_required"`) → saved workflow already connected to existing credentials — even if source used unresolved `newCredential()` call. Don't ask user to connect those, don't offer setup card for them, don't describe as missing; at most mention which existing credential used. Route credential setup only when build outcome reports mocked credentials or `setupRequirement.status === "required"`.

**Ask once when service has multiple credentials of same type.** `workflow_builder_credentials(action="list")` shows >1 entry of needed type (e.g. two `openAiApi` accounts, three Google Calendar accounts) → `workflow_builder_ask_user` single-select to pick one before building, use chosen credential name in workflow code. Exception: user already named credential — use directly. Single candidate → auto-apply, no ask.

**Honor explicit "create a new credential" request.** User asks for new credential of type → never pick existing one, never ask to choose among existing — not even when exactly one exists (build would otherwise attach silently, skip setup entirely). Pass credential type in `preferNewCredentials` on both `workflow_builder_build_workflow` and `workflow_builder_workflows(action="setup")` (or `preferNew: true` on `workflow_builder_credentials(action="setup")` entry). Setup then opens on credential creation while still listing existing ones, so user can change mind — say so in one short sentence, no re-litigating. Skipped that card earlier → pass `reopenSkipped` alongside: `preferNewCredentials` decides what card offers, `reopenSkipped` decides whether card comes back at all.

**Ask which auth type when service supports more than one.** `workflow_builder_credentials(action="setup")` opens picker locked to single `credentialType` — user can't switch auth types there. So when `workflow_builder_credentials(action="search-types")` returns >1 auth option for service (e.g. `notionApi` and `notionOAuth2Api`, or `slackApi` and `slackOAuth2Api`), use `workflow_builder_ask_user` single-select to pick auth type before calling `workflow_builder_credentials(action="setup")`. List OAuth2 first, present as recommended. Exception: user clearly indicated auth type (e.g. "api key", "oauth", "personal token") — map to matching `credentialType`, use directly without asking.