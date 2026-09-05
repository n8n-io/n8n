---
name: post-build-flow
description: >-
  Handles workflow verification and setup after build-workflow succeeds, or when
  the message contains workflow-verification-follow-up or workflow-setup-required.
  Reuse inlined instructions after direct builds. Load when they are absent,
  when verificationReadiness requires action, or on
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
is to call `workflows(action="setup")` with the `workflowId` from the payload. Do
not verify, do not ask, do not write a message first — the inline setup card in
the AI Assistant panel is the user-visible surface. If it returns `deferred:
true`, respect the user's choice and do not retry with any other setup tool.
A result carrying `skippedByUser` names credentials the user already passed on:
never re-open setup for those, in this turn or any later one — see
[Credentials the user skipped](#credentials-the-user-skipped).
After setup completes or is applied, follow
[Mocked verification live-test follow-up](#mocked-verification-live-test-follow-up)
if the payload or prior verification evidence says mocked credentials,
simulated node output, fixture overrides, temporary pin data, or another mocked
input was used.

## Credential setup references

Before selecting an auth type or composing `credentialHints`, load this skill's
`references/credential-setup-recipes.md`. Resolve these requirements during
pre-build discovery so a tagged setup follow-up can open its card immediately.
Use the saved setup result to distinguish resolved, partial, and skipped items.
On normal turns, briefly name the saved artifact and the specific remaining
setup action. Do not reissue an unchanged partial setup card.

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

Use the following verification route:

| Situation | Action |
|---|---|
| Normal build verification or "verify again" | Use `verify-built-workflow` with the workflow ID and available work item ID. |
| Another required trigger or branch | Use `triggerNodeName` or `fixtureOverrides` for a distinct scenario. Combine evidence only for the same current workflow. |
| User explicitly requests a live run | Use `executions(action="run")` and its existing approval flow. Inspect the relevant node outputs. |
| Missing setup or an untestable required path | Report the specific limit. Do not claim full verification or start a live run on your own. |

Inspect each result before another attempt. Follow the shared recovery rules.
Fixture overrides apply only to nodes classified as simulated in the build
outcome. Do not change the requested behavior merely to make a test pass.


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
  **union** across passes. Only treat a required node as unverified when no current pass reached
  it.
- Report per-trigger coverage — name each trigger and whether its branch ran.
  State the scope checked and the simulation limits for each trigger. Claim
  all required paths were checked only when the current passes cover them.
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
     existing evidence as reusable only for the same workflow and unchanged
     behavior. Inspect its coverage and simulation limits before making a claim.

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

2. Judge required-path coverage, not just status. Inspect `nodesNotReached`,
   `lastNodeExecuted`, and `coverageNote`. A successful run is partial evidence
   when a required step remains unreached across the current scenarios. Other
   triggers, mutually exclusive branches, and intentional unused outputs can
   be absent from one run without indicating a defect.
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
     end-to-end verification while a required path remains untested. Combine
     separate trigger and branch scenarios only for the same current workflow.
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
4. When `workflows(action="setup")` opens the inline setup card, the card is the
   user-visible surface. Do not tell the user to open the editor, use the canvas,
   or click a Setup button; the user does not need to navigate anywhere.
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
   follow-up is due, apply its rules for existing requests, declines, and
   deferrals. Do not combine a live-test offer with publication or extra features.
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
8. Do not add a generic testing or extra-feature question to every final reply.
   Offer a next step only when it resolves a known limitation or serves the
   current request. Do not repeat an offer the user declined or deferred.
9. Publish only when the user asks. Apply the publication conditions above.
10. For an explicitly requested error workflow, follow the procedure below.

## Error workflow follow-up

Build an error workflow only when the user requests one or accepts a relevant
offer. Do not make this an automatic question after every publication. Do not
ask whether an error workflow needs another error workflow.

Before building or attaching it, load `workflow-builder` and its
`references/error-workflows.md` file. Use a separate workflow with an Error
Trigger. Publish it through the existing approval flow before assigning its
real workflow ID to the target workflow's `settings.errorWorkflow`. Keep the
assignment scoped to the requested target. Use the bound source file and
`build-workflow` for the target edit. Never substitute an activeVersionId,
workflow name, placeholder, or local SDK ID.

## Mocked verification live-test follow-up

After workflow setup completes or is applied, if the latest verification for
that workflow used mocked credentials, simulated node output, fixture overrides,
temporary pin data, or another mocked input, offer a live test once if the user has not already requested, declined, or
deferred it. Ask only about the live test. If the user already requested it,
continue through the existing run approval flow. Do not run it automatically.
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
2. **Check the available cleanup capability.** A write API does not prove that
   deletion is supported. Inspect the relevant tool or node documentation. Offer
   a supported direct deletion or one-off cleanup workflow when available. If
   neither is available, explain the limit and the documented manual procedure.
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

Apply the shared evidence contract to the current workflow and its material
changes. Earlier verification does not prove later edits. A delegate summary
is not independent execution evidence.

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

**Inspect the saved credential resolution.** When `build-workflow`
returns a resolved credential for a node in `resolvedCredentialsByNode`, that
node is connected to the reported credential — even if your source used an unresolved `newCredential()` call.
A `not_required` setup status alone does not prove connection: inspect its
reason, including skipped setup. Do not ask the user to connect resolved credentials, do not offer the setup card
for them, and do not describe them as missing; at most mention which existing
credential is being used. Route credential setup only when the build outcome
reports mocked credentials or `setupRequirement.status === "required"`.

**Leave ambiguous credential selection for post-build setup.** Reuse an
explicit user selection. With one valid matching credential, use it. With
several candidates and no selection, leave the credential unresolved in the
draft. Do not ask a pre-build credential-choice question.

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

**For standalone credential setup, ask which auth type to use when needed.**
For workflow builds, use the node's required auth type or the user's explicit
choice. Do not introduce a pre-build auth questionnaire.
`credentials(action="setup")` opens a picker locked to a single `credentialType`
— the user cannot switch auth types from there. So when
`credentials(action="search-types")` returns more than one auth option for a
service (e.g. `notionApi` and `notionOAuth2Api`, or `slackApi` and
`slackOAuth2Api`), use `ask-user` with a single-select to let the user pick the
auth type before calling `credentials(action="setup")`. List OAuth2 first and
present it as the recommended option. Exception: the user has clearly indicated
an auth type (e.g. "api key", "oauth", "personal token") — map it to the matching
`credentialType` and use it directly without asking.
