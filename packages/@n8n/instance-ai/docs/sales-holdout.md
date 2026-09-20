# Enterprise sales holdout

## Purpose and baseline

Use this case to check whether the Assistant can build outside the HR domain.
Freeze the request and acceptance checks before the first build. Do not add
sales-specific production code before that run. Keep all drafts unpublished.
Use synthetic business records. Do not send real messages or invitations.

The first build uses commit `114881ea746`. It uses a new Assistant thread.
The target is 30 seconds from prompt submission to the completed reply.
Include planning, JEV review, parameter generation, save, and verification.
Report human setup time separately. A saved draft is not a completed task
when required behavior or credentials are missing.

Keep the first result unchanged. Record later repairs and their causes.
After a repair, this case becomes a regression case. Do not describe a repeat
of the same case as an unseen holdout. Reserve the variation below until after
changes to the builder.

## Process basis

- [Salesforce opportunity stages](https://trailhead.salesforce.com/content/learn/modules/leads_opportunities_lightning_experience/work-your-opportunities): track prospecting, qualification, proposals, negotiation, and closed outcomes.
- [MEDDPICC](https://meddicc.com/meddpicc-sales-methodology-and-process): track value, the economic buyer, decision criteria, the decision process, procurement, pain, the champion, and competition. Keep unknown evidence explicit.
- [Mutual action plans](https://www.salesforce.com/blog/sales/mutual-action-plan/?bc=OTH): assign buyer and seller owners, milestones, and target dates. Detect missed milestones.
- [Sales and customer success handoff](https://academy.hubspot.com/lessons/sales-customer-success-handoff): transfer agreed outcomes and deal context through the CRM.
- [Salesforce external IDs](https://developer.salesforce.com/docs/platform/api-rest/guide/dome-upsert.html): use stable keys for repeatable record writes. Confirm the actual object schema first.
- [DocuSign webhook listeners](https://www.docusign.com/blog/developers/dsdev-webhook-listeners-part-1): authenticate callbacks and handle retries. A callback alone does not prove that the expected contract is complete.

These sources inform the case. They do not prescribe one graph or node count.
Custom Salesforce fields need configuration. Do not assume that every account
has a quote, contract, CPQ, or industry-specific license.

## Frozen build request

<!-- SALES_PROMPT_START -->
Build an end-to-end enterprise sales system for our internal sales team. Use Salesforce as the source of truth, Slack for the team, Gmail and Google Calendar for contact and meetings, and DocuSign for signatures. Create the required workflow drafts and a standalone Sales Team Copilot Agent. Keep every artifact unpublished. Use synthetic examples only. Do not contact real people or execute writes against real services. Use the normal question, approval, and credential cards for required setup. Do not reuse HR workflows or HR-specific instructions.

Cover inbound leads and outbound account research through closed-won customer handoff, plus lost and nurture paths. Deduplicate leads and accounts. Preserve opt-outs. Route by territory and owner. Research the account and buying committee with dated source links; distinguish facts from assumptions. A rep approves an outreach draft before it is sent. Capture replies and meeting outcomes in Salesforce. Check availability, time zones, attendees, and duplicate invitations when scheduling discovery or a demo.

Track MEDDPICC evidence and gaps through discovery and qualification. Maintain a mutual action plan with an owner and due date for each milestone. Coordinate solution engineering, demonstrations, proof of value, security reviews, legal review, and procurement. Create tasks and reminders for missing feedback or overdue milestones. Recheck current state before a reminder or stage change. A stage transition needs its exit evidence. Do not invent economic buyers, budget, technical answers, or commercial commitments.

Prepare a proposal from the approved scope. Require the sales manager to approve a discount above 10 percent, and legal to approve nonstandard terms. Rejected proposals return for revision. Send a DocuSign envelope only after the required approvals. Verify the callback identity, envelope, current opportunity, and completed signature before recording Closed Won. Ignore duplicate or stale callbacks. Declined or expired envelopes must remain open for follow-up. Closed Won creates one customer-success handoff with the sold scope, stakeholders, agreed outcomes, commitments, and kickoff task. Closed Lost records a reason and permits a later nurture task only when contact is allowed.

The internal Sales Team Copilot should answer current deal questions, cite CRM evidence, explain qualification gaps, prepare meeting briefs, draft follow-ups, maintain next actions, and help schedule meetings. Use the signed-in staff member's permitted records. Ask for clarification when an account or opportunity is ambiguous. Confirm consequential changes and customer-facing sends. Use bounded research, meeting analysis, deal-desk, and handoff capabilities where they reduce work. Choose separate supporting Agents only when they add a clear benefit. Give the bot usable tools, not just a description of what tools should exist.

Use stable event keys, persistent retry state, and current-record checks so duplicate events, provider timeouts, partial failures, and concurrent edits do not silently lose work or repeat business actions. Do not assume Salesforce custom field API names or stage values. Treat unknown integration configuration as explicit setup. Build the drafts now, then state what was created, what was verified, and what still needs setup. Explain the process in text before making the build decisions.
<!-- SALES_PROMPT_END -->

## Frozen acceptance checks

Each check receives one of: pass, fail, blocked, or not exercised.
A name, note, or placeholder does not prove executable behavior. Each pass
must cite a saved artifact, execution, or observed conversation.

| ID | Required outcome | Evidence |
| --- | --- | --- |
| S01 | New drafts cover intake through won, lost, and nurture paths. | Read the saved graph and trace each path. |
| S02 | Intake deduplicates, preserves opt-outs, and assigns an owner. | Repeat intake; opted-out contact; conflicting owner. |
| S03 | Research distinguishes cited facts from assumptions. | Inspect research output and source dates. |
| S04 | Outreach waits for rep approval and records its result. | Approve, reject, duplicate approval, and send failure. |
| S05 | Scheduling respects availability, time zones, and current attendees. | Conflict, reschedule, and duplicate request. |
| S06 | Qualification records MEDDPICC evidence and unknowns. | Missing buyer or budget does not become invented evidence. |
| S07 | The mutual action plan and technical review have owners and due dates. | Overdue, completed, and reassigned milestone. |
| S08 | Stage changes and reminders use current exit evidence. | Stale event and incomplete qualification. |
| S09 | Discounts above 10 percent need manager approval. | 10 percent, 11 percent, rejection, and expired approval. |
| S10 | Nonstandard terms need legal approval before signature. | Standard terms; pending legal; rejected legal. |
| S11 | Signature events use verified identity and current envelope state. | Wrong envelope, stale event, duplicate, decline, and expiry. |
| S12 | Won creates one complete customer-success handoff. | Repeat completion; missing outcome; handoff retry. |
| S13 | Lost records a reason and respects contact permission. | Nurture permitted and prohibited. |
| S14 | Durable state supports retries and partial failures. | Timeout after an effect; restart; concurrent update. |
| S15 | A standalone internal Agent has usable tools. | Read Agent configuration and tool contracts. |
| S16 | The bot uses permitted current records and clarifies ambiguity. | Assigned deal; another team's deal; ambiguous account. |
| S17 | The bot cites evidence and confirms consequential actions. | Deal brief; unknown fact; draft, confirm, and rejected action. |
| S18 | Existing setup UI is used and all artifacts stay unpublished. | Observe question, approval, credential cards and saved state. |
| S19 | An edit preserves unrelated workflow and Agent behavior. | Change discount threshold to 15 percent; readback and branch checks. |
| S20 | Repair handles a failed integration without discarding valid work. | Repair a reported fixture failure; rerun the affected path. |
| S21 | Equivalent structured inputs produce identical workflow JSON. | Repeat deterministic assembly and compare output. |
| S22 | A full build or edit finishes within 30 seconds. | Server run events, final reply, and saved artifacts. |

## Local verification and shared suite

Use isolated service fixtures for runtime tests. The fixture must implement
the provider contract. It must not supply missing business logic on behalf
of the generated workflow. Keep credentials and private traces outside Git.

The user selected local verification. LangTracer setup is unavailable.
No shared Agent evaluation is authored or published. Local observations do
not count as a passing CI evaluation.

## Reserved variation

After general builder repairs, use a fresh thread for a partner-led expansion
of an existing customer. Require a renewal co-term, two buying entities,
regional ownership, a revised legal package, and a delayed signature callback
from an older envelope. Supply the specific request only at that later run.
Do not encode this variation in generation rules or a production template.

## First local result, 2026-09-20

The baseline failed the 30-second target. The plan approval appeared after
257.4 seconds. The run was stopped after about 27 minutes with three saved,
unpublished drafts. Scheduling and the later sales stages were not complete.
No standalone Sales Team Copilot Agent was created in this run. The proposed
Agent task used the `build-workflow` kind, which also needs correction.

The saved drafts were:

| Draft | Nodes | Local finding |
| --- | --- | --- |
| Inbound Lead Processor | 15 | A duplicate note targets the new lead instead of the existing lead. |
| Account Research & Buying Committee | 12 | Saved draft only. Research output and retry behavior remain unverified. |
| Outreach Draft & Reply Capture | 21 | Both Code nodes fail with `Unexpected token '}'`. Reply lookup also contains a fixed `PLACEHOLDER` email. |

Native Salesforce nodes ran against a local provider fixture. Three intake
checks passed: new-record routing, opt-out routing, and stopping the duplicate
path before owner routing. The existing-record note assertion failed. These
checks used the first seven generated nodes without changing their business
parameters. They do not prove the full intake workflow.

The two outreach Code nodes ran separately with local manual inputs. Their
original code and parameters were unchanged. Both failed. No messages or
invitations were sent. The original draft versions were preserved.

S01, S02, and S22 fail. The partial checks do not establish the other acceptance
criteria. The standard plan approval card was observed. All three saved drafts
remained unpublished. Credential and question cards were not exercised in this
baseline, so S18 is not a complete pass.

General repairs after this baseline expose the compiled node type in build
errors and remove HR-specific wording from the shared workflow guidance.
The repair regression preserves unrelated nodes and connections when an
incorrect plan step selected the wrong node type. This is a regression result,
not a passing repeat of the unseen sales holdout.

The JSON compiler now parses active JavaScript Code nodes before save. It does
not execute their code. The check detected both saved outreach syntax errors
in 8.7 ms on first use and 0.3–0.7 ms on four warm runs. This result covers
syntax, not business behavior or external integration correctness.

The full Turbo build also found an expression-parser import that worked in
Node.js but failed under the editor's source alias. The parser now uses the
public `@n8n/tournament` export. After this fix, all 72 build tasks passed.

## Standalone Agent regression

A separate request tested the Sales Team Copilot without the workflow plan.
It requested Salesforce, Slack, Gmail, Calendar, and DocuSign capabilities.
The Agent handoff started after 62.4 seconds. The embedded builder attempted
its first configuration write after about 11 minutes. Validation rejected
dynamic selectors that used model-generated values without resource lookup.
The run was stopped after more than 15 minutes. The saved Agent was an empty,
unpublished shell. It had no model or instructions. This result fails S15
and S22. It does not establish the setup or conversation checks.

The handoff repeated requirements and the proposed plan in two fields.
The tool now accepts the request and plan once. Additional inspected context
can still be supplied. The embedded builder also used its own medium
reasoning setting, although the host used low effort. It now inherits the
host's thinking policy for initial builds and resumed setup. Regression tests
cover low effort, high effort, disabled thinking, and legacy session defaults.
These changes need a fresh live run before a latency improvement is claimed.
