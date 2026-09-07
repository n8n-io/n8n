---
name: post-build-flow
description: >-
  Handles workflow verification and setup after build-workflow succeeds, or when
  the message contains workflow-verification-follow-up or workflow-setup-required.
  Load after direct builds, when verificationReadiness requires action, or on
  orchestrator verify/setup follow-up turns.
recommended_tools:
  - ask-user
  - verify-built-workflow
  - workflows
  - build-workflow
  - executions
---

# Post-Build Flow

Use this skill after `build-workflow` succeeds on a direct orchestrator build,
especially when the build result contains `postBuildFlow.required: true`, or when
the current message contains `<workflow-verification-follow-up>` or
`<workflow-setup-required>`.

One-off builds (`postBuildFlow.reason: "direct-one-off-build-succeeded"`) hand
off to the `one-off-operations` skill instead — verification is optional there
and completion is a live run with read-back. If both sets of instructions are
in context for a one-off build, the one-off flow wins.

These instructions are in English, but user-visible text you write while
following them stays in the user's conversation language.

For trigger `inputData` shapes, read
`${N8N_WORKSPACE_DIR}/knowledge-base/reference/trigger-input-data-shapes.md` in
the sandbox workspace when available, or load this skill's
`references/trigger-input-data-shapes.md` linked file.

## Verification follow-up

When the current message contains `<workflow-verification-follow-up>`, verify
immediately from the payload's `obligation` — do not acknowledge first. If the
obligation is `ready_to_verify` or `verifying`, call `verify-built-workflow`. Do
**not** call `workflows(action="setup")` in this turn and do **not** declare the
workflow finished if `outcome.setupRequirement.status === "required"` — setup is
routed automatically as a separate `<workflow-setup-required>` step after
verification.

## Setup follow-up

When the current message contains `<workflow-setup-required>`, your first action
is to call `workflows(action="setup")` with the `workflowId` from the payload and
a `summary` of what this turn did and what is still outstanding. Do not verify and
do not ask first; the inline setup card in the AI Assistant panel is where the user
configures credentials, and your `summary` is rendered above it. The card's own
one-line message reports nothing, so a turn that built, saved, published, or
deferred anything must say so in `summary`. If setup returns `deferred:
true`, respect the user's choice and do not retry with any other setup tool.
A result carrying `skippedByUser` names credentials the user already passed on:
never re-open setup for those, in this turn or any later one — see
[Credentials the user skipped](#credentials-the-user-skipped).
After setup completes or is applied, follow
[Mocked verification live-test follow-up](#mocked-verification-live-test-follow-up)
if the payload or prior verification evidence says mocked credentials,
simulated node output, fixture overrides, temporary pin data, or another mocked
input was used.

### Choosing the credential type for a service

Pick in this order:

1. **A dedicated credential type** (`slackApi`, `notionApi`, …) whenever one
   exists — search with `credentials(action="search-types")`.
2. **Simplified Custom Auth** (`httpTemplatedCustomAuth`) for any service
   without a dedicated type whose auth is expressible as header/query/body
   values — which covers API keys and bearer tokens (`Authorization: Bearer
<token>` becomes `{"headers":{"Authorization":"Bearer {{api_key}}"}}`, not
   `httpBearerAuth`). Always provide a recipe (below) so the user only pastes
   their secret.
3. **Plain generic types** (`httpBasicAuth`, `httpDigestAuth`, `oAuth2Api`, …)
   only for what a template cannot express: basic auth's base64-encoded pair,
   digest's challenge-response, OAuth flows — or when the user explicitly asks
   for a specific plain type: an explicit user choice wins (setup accepts it
   with `allowPlainGenericAuth: true`).

### Credential recipes for Simplified Custom Auth

When the workflow authenticates a service through Simplified Custom Auth,
include `credentialHints` in the same `workflows(action="setup")` call so the
setup card pre-fills the credential and the user only pastes their secret —
instead of facing an empty JSON template they'd have to decode from the
provider's docs. Before composing the hints, load the
`credential-recipe-research` skill and execute its lookup procedure — the
template, `docsUrl` and `testUrl` must come from the provider documentation
it has you fetch, never from memory:

- `template` — the auth request parts (headers/qs/body) exactly as documented,
  with `{{placeholder}}` markers where the user's values go.
- `placeholders` — one entry per marker: `name`, user-facing `title`, an
  optional `info` clarifying the value itself — its format or which of the
  provider's tokens it is (e.g. "Starts with tvly-"). Never where to obtain
  it, and never a URL or domain: the user asks the AI Assistant for that from
  the credential form. `type` is `password` unless clearly non-secret (at
  least one placeholder must stay `password`). Add `optional: true` only when
  the provider documents the value as optional (e.g. an org/region
  qualifier) — template entries referencing an empty optional placeholder are
  omitted from the request.
- `docsUrl` — the provider page where a logged-in user CREATES/COPIES the
  secret (e.g. `https://replicate.com/account/api-tokens`) — never the API
  reference. Not shown in the form: the AI Assistant help thread uses it to
  send the user to the exact page. Found via the `credential-recipe-research`
  procedure; omit when it finds nothing conclusive.
- `testUrl` — a documented side-effect-free GET that rejects a bad key with
  401/403, used to verify the credential on save and later retests; never one
  of the workflow's own endpoints, never anything billable. Found via the
  `credential-recipe-research` procedure; omit when nothing qualifies — a
  credential without a testUrl saves fine and honestly shows "could not be
  verified", which beats a false green.
- `acceptedStatusCodes` — almost always omit; the user can adjust it later on
  the credential if a service's auth answers 401/403 to valid GETs.
- `suggestedName` — display name for the created credential.

Example — fal.ai's docs say requests use `Authorization: Key <FAL_KEY>` and
`GET https://api.fal.ai/v1/models/usage` is a documented side-effect-free
endpoint that rejects a bad key (the model-serving host `fal.run` is not a
key-check endpoint):

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

Never put a real secret in a recipe — the user pastes it in the setup card and
it is stored redacted in the credential. Add `nodeName` when several nodes use
Simplified Custom Auth for different services. You cannot see the secret, but
once setup reports the credential applied, treat it as fully configured — the
`{{placeholder}}` markers live only in the template; the stored values replace
them at request time. If a live test later fails with an auth error, that is
the moment to have the user re-open the credential and re-paste the value.

If the user defers setup instead, don't hand them manual field-by-field
credential instructions for the n8n editor — tell them to reopen setup when
they're ready: the card pre-fills everything except their key.

### Credentials the user skipped

Skipping is remembered for the whole conversation. A setup result may carry
`skippedByUser` (nodes and credential types the user passed on), and a build
outcome may carry `setupRequirement.status === "not_required"` with
`reason: "skipped-by-user"`. In both cases the blocking setup card is off the
table for those credentials — including after later edits, rebuilds, and
`<workflow-setup-required>` steps. Asking again is the single most common
complaint about this flow.

Instead, in your normal message:

- name what stays unconfigured and what happens at runtime (e.g. "the Slack post
  will fail until a channel is selected; the email still sends"),
- offer to set it up whenever they want.

Only once the user asks for a specific credential — "connect Slack now", "let's
do the Slack setup", or picking it out of an offer you made — call
`workflows(action="setup", reopenSkipped: ["slackApi"])`, naming just what they
asked for so the rest stays skipped. A generic "yes" to an unrelated question is
not an ask.

Pass the `reopenWith` value the tool reported for that card, not the user's
wording — a credential type for a credential card, a node name for one that was
only missing a parameter. If nothing matches, setup answers with
`unknown_reopen_target` and the list you can choose from; pick from it or tell
the user what they named isn't part of this workflow. Don't fall back to
re-offering, the user already asked.

## Publishing and testing

**Publishing is never required for testing.** Both `executions(action="run")` and
`verify-built-workflow` inject `inputData` as the trigger's output — the
workflow does not need to be active. Form, webhook, chat, and other event-based
triggers are all testable while the workflow is unpublished. Never publish a
workflow as a precondition for running it.

Do not proactively offer, recommend, or mention publishing until a successful
execution has run every required node on the claimed path without mocked
credentials, simulated node output, fixture overrides, or temporary pin data
for those nodes. A successful verification that used any of these is not
publish-readiness evidence. If the user explicitly asks to publish before a
live execution succeeds, warn that the live path remains untested, then follow
the requested publish flow.

Execution evidence can come from a run you started or a run the user started.
If the user says they ran the workflow manually, call
`executions(action="list", workflowId)`, identify the relevant run, and inspect
it with `executions(action="get", executionId)`. The user's statement alone is
not execution evidence. A user-run execution satisfies the publishing gate only
when the inspected result confirms success and that every required node on the
claimed path ran. Do not count it if mocked, simulated, fixture, or pinned output
was used. You may offer publishing after that confirmation.

For workflows produced by `build-workflow`, **always verify with
`verify-built-workflow`, never with raw `executions(action="run")`.** It reuses
the build outcome simulation plan, mocked credentials, and temporary pin data, so
destructive nodes are pinned and it is safe to call repeatedly. A raw
`executions(action="run")` runs the workflow live with no pin data, and on a
workflow you just verified it surfaces a redundant run-approval prompt to the
user right after verification already executed the workflow. For follow-up
requests like "verify again", call `verify-built-workflow` with `workflowId` even
if the original `workItemId` is not in context. For alternate deterministic
scenarios, pass `fixtureOverrides` keyed by simulated node name instead of trying
to force data through the trigger.

**Reserve `executions(action="run")` for runs the user explicitly asked for**
(e.g. "run it now", "execute it against my real data"). Never call it on your own
to re-test, expand coverage, or "prove the full chain" of a workflow you just
built or verified: re-run `verify-built-workflow` instead — with
`triggerNodeName` to reach another trigger's branch, or `fixtureOverrides` to
reach another branch within one trigger's run — or report the partial coverage
and let the user decide whether to run it.
If `fixtureOverrides` is rejected with `invalid_fixture_override`, the target
node was not classified as simulated in the build outcome. Do not retry the same
override. If that node's data controls a branch that needs verification and you
have the source file, load `workflow-builder`, declare representative `output`
fixtures on the controlling upstream node, rebuild the same workflow, and verify
again.

**Never edit or copy a saved workflow to reach a branch.** Disabling, deleting,
or reordering nodes to steer a test mutates the user's workflow and leaves it
broken for as long as the test runs — if it is published, its triggers fire
against the broken version. Building a throwaway second workflow is no better:
the evidence is gathered against a copy that can drift from the workflow the
user keeps, and the copy is left behind whenever the cleanup delete fails.

For a workflow with more than one trigger (`triggerNodes` has multiple entries),
**verify once per trigger**:

- Pass `triggerNodeName` to `verify-built-workflow` and call it once for each
  entry in `triggerNodes`. Naming no trigger verifies only the auto-detected
  one. An unresolvable name is rejected outright, so a rejected call means the
  name is wrong — re-read `triggerNodes`, never fall back to editing.
- Each pass covers its own trigger's branch, so its `nodesNotReached` will list
  the other triggers' nodes. That is expected, not a defect: coverage is the
  **union** across passes. Only treat a node as unverified once no pass reached
  it.
- Report per-trigger coverage — name each trigger and whether its branch ran.
  Claim the workflow is verified only when every trigger's branch has a
  successful pass.
- When the user asked for a live run, pass `triggerNodeName` to
  `executions(action="run")` the same way — one run per trigger — and report
  each branch's result.

## After build-workflow succeeds

1. Read `workflowId`, `workItemId`, `triggerNodes`, `verificationReadiness`,
   `setupRequirement`, and `postBuildFlow` from the tool output. If the output
   is missing a `workflowId`, explain that the build did not submit.
   - Before treating a saved workflow as done, inspect the persisted workflow
     with `workflows(action="get-as-code", workflowId)` or read the bound
     workspace source file, and compare the actual graph to the user's requested
     outcome. Build/save success only means a workflow was saved; it does not
     prove the saved workflow is good.
   - If the persisted workflow is missing the requested outcome, has an obvious
     dead-end draft shape, or the verification evidence is weak, load the
     `workflow-builder` skill and patch the same workflow with `build-workflow`
     using the existing `workflowId` and `workItemId`; then inspect and verify
     again.
   - If `verificationReadiness.status === "already_verified"`, treat the
     workflow as verified and do **not** call `verify-built-workflow` again.

- If `verificationReadiness.status === "ready"`, call
  `verify-built-workflow` with the `workflowId`, the `workItemId` when you
  have it, and the trigger-appropriate `inputData` shape. When `triggerNodes`
  has more than one entry, call it once per trigger with `triggerNodeName`.
- If `verificationReadiness.status === "needs_setup"`, call
  `workflows(action="setup")` with the workflowId so the user can configure it
  through the inline setup card in the AI Assistant panel.
- If `verificationReadiness.status === "not_verifiable"`, do not infer
  lower-level verification conditions; use the readiness guidance to give a
  clear warning or manual-test note. This is a warning completion state, not
  a verified state and not an infinite blocker.

2. Judge coverage, not just status. A `verify-built-workflow` result with
   `success: true` but a non-empty `nodesNotReached` is **partial** evidence:
   the execution ended early (see `lastNodeExecuted` and `coverageNote`) and
   the listed nodes — including any planned simulations — never ran.
   - Most common cause: a lookup/query node returned zero items (n8n stops
     downstream nodes on empty item lists). If the dead-end is a Data Table
     lookup, insert a matching test row with `data-tables(action="insert-rows")`,
     re-run `verify-built-workflow`, and delete the test row afterwards. The same
     holds for data you seed anywhere else to unblock a run — it is yours to
     remove once the run is done (see "Cleaning up after a live test").
   - If you cannot seed the data source, report honestly: name which nodes
     were verified and which were not, and tell the user the unreached part
     needs a manual test. Do not start a live `executions(action="run")`
     yourself to reach those nodes; offer the user a test instead. Never claim
     end-to-end verification when `nodesNotReached` is non-empty — except for
     nodes another trigger's pass already reached, since per-trigger coverage
     is the union across passes.
   - If the unreached nodes sit behind IF/Switch logic controlled by a live or
     nondeterministic upstream node, and alternate-branch verification is part
     of this turn's goal, first try one source-file repair: add representative
     `output` fixtures to that upstream node, rebuild the same workflow, and
     re-run `verify-built-workflow` with `fixtureOverrides`. Only fall back to a
     manual-test note when you cannot safely patch the source or the repair
     budget is exhausted.
   - Relay `simulationNote` (nodes whose output was simulated) to the user
     whenever it is present.
3. After verification handling, if `setupRequirement.status === "required"` and
   setup has not already run for this build, call `workflows(action="setup")`
   with the workflowId.
4. When `workflows(action="setup")` opens the inline setup card, the card is where
   the user configures credentials. Do not tell the user to open the editor, use the
   canvas, or click a Setup button; the user does not need to navigate anywhere.
   The card ends the turn, so the `summary` you pass to `workflows(action="setup")`
   is the turn's only report: name what you built, saved, published, or deferred
   before the card, and name what is still outstanding. The same applies to the
   `summary` on `build-workflow` and `workflows(action="publish")` — every card that
   can end a turn carries one, and it is rejected without it.
5. When `workflows(action="setup")` returns `deferred: true`, or reports
   `skippedByUser`, or applies only part of the card, respect the user's
   decision — do not retry with `credentials(action="setup")`, another
   `workflows(action="setup")` call, or any other setup tool. `partial: true`
   with `nodesStillNeedingSetup` is not permission to re-open the card in the
   same turn: report what remains as described in
   [Credentials the user skipped](#credentials-the-user-skipped).
6. After setup completes or is applied, follow
   [Mocked verification live-test follow-up](#mocked-verification-live-test-follow-up)
   when the latest verification evidence used mocks or simulations. If this
   follow-up is due, ask only whether the user wants the live test. Do not
   mention publishing or ask about the error workflow in the same response.
   If `credentialResolutionNote` says Gateway credits are depleted,
   that note wins: do not offer a live test.
7. Before your final summary, scan the **whole conversation** for live runs that
   already wrote test data into an external system — earlier turns included, not
   just this one. For each such record still sitting there, follow
   [Cleaning up after a live test](#cleaning-up-after-a-live-test): name it and
   offer to remove it. This is about data that **already exists** — a promise to
   clean up after some future run does not discharge it, and neither does the
   user's silence. If a later run failed, that says nothing about records an
   earlier successful run left behind; they are still there.
8. If testing has not already been offered or completed, ask whether the user
   wants to test the workflow. Skip this if `verify-built-workflow` already
   proved it works end-to-end with full coverage.
9. Only call `workflows(action="publish")` when the user explicitly asks to
   publish. Never publish automatically or proactively offer publishing before
   the publish-readiness requirement above is met.
10. After a direct new primary workflow is successfully published, follow
    [Error workflow follow-up](#error-workflow-follow-up).
    Do not replace this explicit opt-in with a generic "add
    anything else?", publish, or test question.

## Error workflow follow-up

This follow-up comes only after a direct new primary workflow is successfully published.

If you just built an Error Trigger workflow because the user opted into adding
one for a known target workflow, do not ask whether to build another error
workflow. Continue the publish-before-assign flow for the target workflow:
ask whether to publish the error workflow and set it on that target workflow,
then publish and assign only after the user approves.

After successfully publishing a direct new primary workflow,
ask once whether the user wants to build an error workflow for that workflow.
Use `ask-user` with a yes/no choice or a concise visible question. Do **not**
create an error workflow before the user opts in.

The opt-in must explicitly mention an error workflow and the target workflow
name. A generic follow-up like "Want me to add anything else?", "Want me to
publish it?", or "Want to test it?" does not satisfy this step.

Skip this follow-up when:

- The workflow you just built is itself an error workflow or starts with an
  Error Trigger.
- The build is a supporting workflow, repair, small edit, planned-task
  subtask, or workflow-level settings patch.
- The user already asked for an error workflow in the original request, already
  declined one, or the target workflow already has the desired error workflow
  set.

If the user says yes:

1. Load `workflow-builder` and build a separate error workflow using the user's
   requested notification destination. Keep the error workflow scoped to the
   target workflow the user opted in for.
2. Do not ask whether this new error workflow needs its own error workflow.
3. The error workflow must be published before it can be assigned. If the user
   has not already asked you to publish and attach it, ask whether to publish it
   and set it as the error workflow for the named target workflow. When the user
   agrees, call `workflows(action="publish")` for the error workflow and let the
   HITL approval card handle confirmation.
4. After publish succeeds, set the original workflow's workflow-level
   `settings.errorWorkflow` to the **error workflow's workflowId**. Do not use
   the published `activeVersionId`, workflow name, a placeholder, or a local SDK
   id. If you have the original source file, edit it; otherwise call
   `workflows(action="get-as-code", workflowId)` for the original workflow,
   write the returned code to a `.workflow.ts` file, add
   `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, and call
   `build-workflow` for the original workflow. The workflow edit approval card
   is the HITL surface for this assignment.
5. Summarize the result with explicit per-workflow language: this error
   workflow was assigned only to the named target workflow. Mention that n8n has
   no global or instance-wide error workflow setting only when the user
   explicitly asked about, requested, or referenced global/instance-wide error
   workflow behavior.

## Mocked verification live-test follow-up

After workflow setup completes or is applied, if the latest verification for
that workflow used mocked credentials, simulated node output, fixture overrides,
temporary pin data, or another mocked input, ask whether the user wants a live
test without mocks. Ask only about the live test. Do not run it automatically.
Do not offer publishing as an alternative or describe the workflow as ready to
use or publish.

If `credentialResolutionNote` says Gateway credits are depleted, that
note wins over this live-test offer: do not offer a live test. Tell the user
they must top up Gateway credits or add their own key on the node first.

If the user agrees, use the explicit live execution path (`executions(action="run")`
for a direct live run) and report the result separately from the earlier mocked
verification. If the live test fails, treat the workflow as unresolved and do
not offer publishing. If the user declines or defers, state what remains
untested, do not claim live end-to-end verification, and do not offer
publishing.

## Cleaning up after a live test

A live run against real credentials leaves **real artifacts** — a row in their
sheet, a message in their channel, a block on their page. Test data you created
is your mess, not theirs.

This applies to any live run in the conversation, **not only one from this
turn**. A test record written three turns ago is still on the user's page now,
and the debt is still yours — carry it forward until it is cleared or the user
declines. Undertaking to clean up after some _future_ run does not settle a
record that already exists, and a run that failed afterwards does not remove
what an earlier successful run wrote.

When a live test, or a verification you seeded data for, wrote/sent/changed
anything in an external system:

1. **Name what it left behind**, in the message that reports the run — or, for a
   record from an earlier turn, in your next response: which record, where, and
   how to recognise it ("a `[Test] …` to-do at the bottom of
   the toggle"). Read it back from the effect node's output rather than guessing.
2. **Offer to remove it yourself.** You can delete it the same way you wrote it —
   the target has an API and you can reach it with a workflow. When no node or
   tool does it directly, build a **one-off cleanup workflow**; that is exactly
   what `one-off-operations` is for. Never present manual deletion as how this
   gets resolved, and never claim you have no way to delete it — "I don't have a
   delete tool for X" is false whenever X has a write API you just used. Noting
   that the user _could_ also remove it by hand is fine only alongside your own
   offer.
3. **Ask before deleting.** Removal is destructive, so it goes through the usual
   approval gate. Never clean up silently — something labelled "test" may still
   be data the user wants.
4. **Don't stack test data.** Do not offer another live run against the same
   target while an earlier test artifact is still sitting there. Clear it first,
   or say plainly that the next run will add a second one.

If the user declines, note that the item is still there and move on — don't
re-ask.

**Not every write is test data.** When the live run _was_ the point — a one-off
operation whose whole purpose is the effect (see `one-off-operations`) — what it
wrote is the deliverable. There you offer to clean up the _workflow_, never the
result.

## Claiming success

Do not tell the user a workflow is "fixed", "verified", "tested", "working", or
has "no errors" unless you have a passing `verify-built-workflow`,
`executions(action="run")`, or inspected user-run execution that exercised the
path being claimed. Do not call a workflow "ready to use" or "ready to publish"
unless a passing execution met the publish-readiness requirement above. A
successful `build-workflow`/save, a static `workflows(action="validate")`, or
your own narration are NOT execution evidence. For a produced artifact (a file,
generated document, or Code-node output), read the real output before calling it
complete; do not infer correctness from the fact that a node ran. The same
applies to rows or records written to an external system: never make quantitative
claims ("22 rows written", "columns matched") that you did not read back from
the effect node's actual output (`executions(action="get-node-output")`) or from
the target system itself — a successful run status does not prove the _right
data_ was written, only that nodes ran. If you could not run the
failing path or inspect the artifact, say so plainly — "I couldn't verify X
because Y" — and name what is unconfirmed. An honest "could not verify" beats an
unverified success claim.

## Credentials before build

Call `credentials(action="list")` first to know what's available. Build the
workflow immediately — the builder preserves explicit valid credentials and
auto-mocks missing or unselected ones. Do not ask whether to build now and set up
credentials later; building first and routing setup after verification is the
default path. Workflow verification is automatic from the build outcome; the
orchestrator handles workflow setup after verification when the saved workflow
still has mocked credentials or placeholders.

**Trust the build outcome over your own source file.** When `build-workflow`
returns `resolvedCredentialsByNode` (or `setupRequirement.status ===
"not_required"`), the saved workflow is already connected to existing
credentials — even if your source used an unresolved `newCredential()` call.
Do not ask the user to connect those credentials, do not offer the setup card
for them, and do not describe them as missing; at most mention which existing
credential is being used. Route credential setup only when the build outcome
reports mocked credentials or `setupRequirement.status === "required"`.

**Ask once when a service has multiple credentials of the same type.** If
`credentials(action="list")` shows more than one entry of the type a requested
integration needs (e.g. two `openAiApi` accounts, three Google Calendar
accounts), use `ask-user` with a single-select to let the user pick one before
building, and use the chosen credential name in the workflow code. Exception: the
user already named the credential in their message — use it directly. With a
single candidate, auto-apply and do not ask.

**Honor an explicit "create a new credential" request.** When the user asks for a
new credential of a type, never pick an existing one for them and never ask them
to choose among existing ones — not even when exactly one exists (the build would
otherwise attach it silently and skip setup entirely). Pass the credential type in
`preferNewCredentials` on both `build-workflow` and `workflows(action="setup")`
(or `preferNew: true` on the `credentials(action="setup")` entry). Setup then
opens on credential creation while still listing the existing credentials, so the
user can change their mind — say so in one short sentence rather than
re-litigating the choice. If they had skipped that card earlier, pass
`reopenSkipped` alongside it: `preferNewCredentials` decides what the card offers,
`reopenSkipped` decides whether the card comes back at all.

**Ask which auth type to use when a service supports more than one.**
`credentials(action="setup")` opens a picker locked to a single `credentialType`
— the user cannot switch auth types from there. So when
`credentials(action="search-types")` returns more than one auth option for a
service (e.g. `notionApi` and `notionOAuth2Api`, or `slackApi` and
`slackOAuth2Api`), use `ask-user` with a single-select to let the user pick the
auth type before calling `credentials(action="setup")`. List OAuth2 first and
present it as the recommended option. Exception: the user has clearly indicated
an auth type (e.g. "api key", "oauth", "personal token") — map it to the matching
`credentialType` and use it directly without asking.
