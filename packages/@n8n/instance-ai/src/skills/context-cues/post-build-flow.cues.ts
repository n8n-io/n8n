import { type ContextCueSet, whileSkillActive } from '@n8n/agents';

/**
 * Context cues for the `post-build-flow` skill. The build tool activates
 * the skill after a direct build, and it stays active through verification,
 * setup, live tests, cleanup, publishing and the final summary. Each phase
 * looks different in the step text, so retrieval scores these cues on
 * every step and each one matches in its own phase.
 */
export const POST_BUILD_FLOW_CUES: ContextCueSet = {
	id: 'post-build-flow',
	isActive: whileSkillActive('post-build-flow'),
	cues: [
		// Verification
		{
			id: 'verify-with-verify-tool',
			text: 'Verify a built workflow with `workflow_builder_verify_built_workflow`, never with raw `run_workflow`. It reuses the simulation plan and pins destructive nodes, so it is safe to repeat. For "verify again", call it with `workflowId` even without the `workItemId`.',
			appliesWhen:
				'About to test, re-test or verify a workflow that was just built, or the user asks to verify it again.',
		},
		{
			id: 'run-workflow-only-on-request',
			text: 'Call `run_workflow` only when the user explicitly asked for a run. To reach another trigger use `triggerNodeName`; to reach another branch use `fixtureOverrides`; otherwise report the partial coverage and let the user decide.',
			appliesWhen:
				'Verification did not reach some nodes or branches and the agent wants more coverage or to prove the full chain.',
		},
		{
			id: 'step-run-is-not-verification',
			text: '`run_workflow_step` runs one node. It never settles verification or turns partial coverage into verified. With `mockInput`, repeat the `mockedNodeNames` limitation to the user.',
			appliesWhen: 'Running or reading the result of a single node step run during verification.',
		},
		{
			id: 'never-edit-to-reach-branch',
			text: "Never disable, delete or reorder nodes, or build a throwaway copy, to steer a test to a branch. It breaks the user's saved (maybe published) workflow, or gathers evidence on a copy that drifts.",
			appliesWhen:
				'Trying to make a test run go down a specific branch or reach a specific trigger of a saved workflow.',
		},
		{
			id: 'invalid-fixture-override',
			text: 'After `invalid_fixture_override`, do not retry the same override: the node is not simulated. Load `workflow-builder`, add `output` fixtures on the controlling upstream node, rebuild the same workflow and verify again.',
			appliesWhen:
				'A verification call with fixtureOverrides was rejected as an invalid fixture override.',
		},
		{
			id: 'verify-each-trigger',
			text: "With several `triggerNodes`, verify once per trigger with `triggerNodeName`. Coverage is the union of successful passes; a failed rerun removes that trigger's coverage. A rejected name means the name is wrong: re-read `triggerNodes`.",
			appliesWhen: 'Verifying a workflow that has more than one trigger node.',
		},
		{
			id: 'empty-lookup-seed-and-remove',
			text: 'Non-empty `nodesNotReached` with `success: true` is partial evidence, usually a lookup that returned zero items. Seed a matching test row (e.g. `insert_data_table_rows`), verify again once, then delete the row. If you cannot seed, or the second pass still does not reach them, name the unreached nodes and offer a manual test; do not start a live run.',
			appliesWhen:
				'Verification succeeded but stopped early and lists nodes not reached, often after an empty lookup or query.',
		},
		{
			id: 'no-repeat-partial-verify',
			phase: 'after-build',
			text: 'A partial verify result (`nodesNotReached`, pending triggers) does not change when you verify again with the same input. Verify again only with something new for the unreached part: a `fixtureOverrides` entry, another `triggerNodeName`, other `inputData` or a seeded test row. Otherwise report which nodes were not reached.',
			appliesWhen:
				'A verification result left nodes or triggers unreached and the agent is about to verify again.',
		},
		{
			id: 'verify-stop-is-final',
			phase: 'after-build',
			text: 'When verify returns `remediation.shouldEdit: false` (waiting for a human decision, unresolved setup value, missing credentials, external blocker), verification is done for this turn. Do not verify again and do not edit the code. Route to `setup_workflow` if the guidance says so; otherwise report the blocker.',
			appliesWhen:
				'A verification result says to stop code edits, or that the workflow waits for user action or setup.',
		},
		{
			id: 'resolved-parameter-warnings',
			text: "A simulated preview never proves an expression resolved. While a `resolvedParameterWarnings` entry stands, fix the input shape or expression and re-run; never report that field as working. Use `get_resolved_node_parameters` with the warning's execution ID. Also state `skippedParameterChecks` as unverified.",
			appliesWhen:
				'A verification result contains resolved parameter warnings or skipped parameter checks.',
		},
		{
			id: 'webhook-input-envelope',
			text: 'Flat webhook `inputData` becomes only the request `body`. When expressions read `$json.query`, `$json.headers` or `$json.params`, pass `{ body, query, headers, params }`, or say the field is unverified.',
			appliesWhen:
				'Composing inputData to verify or run a workflow that starts with a Webhook trigger.',
		},
		{
			id: 'publish-not-needed-to-test',
			text: 'Never publish a workflow to test it. `run_workflow` and verification inject `inputData` as the trigger output, so form, webhook and chat triggers are testable unpublished.',
			appliesWhen:
				'About to test a workflow with a form, webhook, chat or other event trigger that is not published.',
		},
		// Setup
		{
			id: 'setup-required-first-action',
			text: 'On `<workflow-setup-required>`, the first action is `setup_workflow` with the payload `workflowId`: no message, no question, no verification first.',
			appliesWhen: 'The current message contains a workflow-setup-required block.',
		},
		{
			id: 'setup-card-no-navigation',
			text: 'The inline setup card is the user-visible surface. Do not tell the user to open the editor, use the canvas or click a Setup button.',
			appliesWhen: 'Telling the user how to finish credential or parameter setup for the workflow.',
		},
		{
			id: 'setup-deferred-no-retry',
			text: 'After `deferred: true`, `skippedByUser` or `partial: true`, do not retry with `setup_credentials`, another `setup_workflow` call or any other setup tool. Report what remains.',
			appliesWhen: 'A setup call returned deferred, partial or skipped by user.',
		},
		{
			id: 'skipped-credentials-stay-skipped',
			text: 'Skipped credentials stay skipped for the whole conversation, after rebuilds too. Name what stays unconfigured and its runtime effect, and offer setup. Call `setup_workflow(reopenSkipped: [...])` only after the user asks for that credential, with the tool\'s `reopenWith` value. A generic "yes" is not an ask.',
			appliesWhen:
				'The user skipped a credential earlier, or a build outcome says setup is not required because it was skipped by the user.',
		},
		{
			id: 'trust-build-credentials',
			text: 'Trust `resolvedCredentialsByNode` over your source file: those nodes are already connected even if the source used `newCredential()`. Route setup only for mocked credentials or `setupRequirement.status === "required"`.',
			appliesWhen: 'Deciding whether credentials still need setup after a build.',
		},
		{
			id: 'workflow-test-request-current-only',
			requiresAny: ['<workflow-test-request>'],
			text: 'Only `<workflow-test-request>` in the current user input requests a run; one in history does not. Precheck with `<workflow-setup-state>` and `get_workflow_as_code`, never `setup_workflow`, which announces setup and ends the turn.',
			appliesWhen:
				'The user clicked Execute in the setup panel, or a workflow-test-request block is present.',
		},
		// Live test and publishing
		{
			id: 'no-publish-before-live-test',
			text: 'Until a non-simulated execution succeeds on the claimed path, do not offer, recommend or mention publishing, and never offer it as an alternative to the live test. After setup with mocked evidence, ask only about the live test.',
			appliesWhen:
				'Setup finished or verification used mocks or simulated output, and the agent is about to suggest next steps.',
		},
		{
			id: 'user-run-needs-evidence',
			text: "A user-run execution counts only after `list_executions` and `get_execution` confirm it succeeded on the required path. The user's statement alone is not evidence.",
			appliesWhen: 'The user says they ran, tested or triggered the workflow themselves.',
		},
		{
			id: 'gateway-depleted-no-live-test',
			text: 'When `credentialResolutionNote` says Gateway credits are depleted, do not offer a live test. Tell the user to top up Gateway credits or add their own key on the node.',
			appliesWhen: 'A credential resolution note says Gateway credits are depleted.',
		},
		{
			id: 'error-workflow-opt-in',
			text: 'After a direct new primary workflow is published, load `error-workflows` and ask its explicit opt-in. Do not replace it with a generic "anything else?", publish or test question.',
			appliesWhen: 'A new primary workflow was just published successfully.',
		},
		// Cleanup
		{
			id: 'cleanup-offer-not-manual',
			text: 'Offer to delete test data yourself, through a one-off cleanup workflow when no tool does it. Never claim you have no way to delete it when you just wrote it through an API, and never present manual deletion as the fix. Ask before deleting.',
			appliesWhen: 'A live run wrote, sent or changed records in an external system.',
		},
		{
			id: 'cleanup-earlier-turns',
			text: 'Test records from earlier turns are still there. Name and offer to remove them in your next response. A later failed run or a promise to clean up after a future run does not settle them. Do not start another live run on the same target until they are cleared, or say it adds a second one.',
			appliesWhen:
				'Writing a final summary or offering another live run after earlier live runs wrote test data.',
		},
		// Claims
		{
			id: 'success-is-not-verified',
			text: '`success: true` means no error, not verified: an all-simulated run also succeeds. Read `claim.level`; only `verified` lets you say verified, tested or working. Name unreached and simulated nodes yourself.',
			appliesWhen: 'Reporting the result of a verification run to the user.',
		},
		{
			id: 'live-stale',
			text: 'With `claim.liveState: "live-stale"`, the published version is older than the verified draft. Do not call the workflow live or working in production; say the fix is in the draft and follow `publishing`.',
			appliesWhen: 'Fixing or verifying a workflow that is already published.',
		},
		{
			id: 'read-back-before-claiming',
			text: 'Never make quantitative claims ("22 rows written") you did not read back with `get_execution_node_output` or from the target system. Simulated or pinned output is fixture data: never quote it as what the workflow produced.',
			appliesWhen:
				'Describing what a run wrote, produced or sent, such as rows, records, files or messages.',
		},
	],
};
