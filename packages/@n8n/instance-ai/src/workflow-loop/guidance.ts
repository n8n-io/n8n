import { describeClaimCoverage, formatClaimHeadline } from './render-claim';
import type { VerificationClaim, WorkflowLoopAction } from './workflow-loop-state';

export interface WorkflowLoopGuidanceOptions {
	workItemId?: string;
	/** Setup panel v2: `workflows(action="setup")` announces instead of opening a card. */
	setupPanelEnabled?: boolean;
}

/**
 * Lead sentence for a completed build. Derived from the claim so the guidance
 * never tells the model a partially covered run was verified — that sentence
 * was the strongest license for the false success claims in AIA-31.
 */
function formatClaimLead(claim: VerificationClaim | undefined): string {
	if (claim?.level === 'verified') return 'Workflow verified successfully.';

	// No claim means no verification run recorded a verdict for this build — a
	// trigger-only workflow, or a verdict reported without verifying. Saying
	// "verified successfully" here let a model reach that sentence with no run
	// evidence at all. A live run the model inspected is still valid evidence,
	// so ask it to name that rather than refusing the claim outright.
	if (claim === undefined) {
		return (
			'Build complete. No automatic verification evidence is recorded for this workflow. ' +
			'If you are relying on a live run you inspected, say which execution. ' +
			'Otherwise do NOT call the workflow verified, tested, or working.'
		);
	}

	// The claim is the only honest reading of the run, and nothing else tells
	// the user how strong it is, so these rules carry the whole disclosure.
	const rules = [
		'Do NOT call the workflow verified, tested, working, or ready to publish.',
		'Do NOT offer to publish it.',
		(claim.pendingTriggers?.length ?? 0) > 0
			? 'Follow the verification obligation for the remaining triggers. Respect its attempt limit.'
			: claim.liveTestRecommended
				? 'Offer a live end-to-end test instead.'
				: '',
	].filter((rule) => rule !== '');

	return [formatClaimHeadline(claim), ...describeClaimCoverage(claim), ...rules].join(' ');
}

function isVerifiedClaim(claim: VerificationClaim | undefined): boolean {
	return claim?.level === 'verified';
}

function formatSourceFileInstruction(sourceFilePath: string | undefined): string {
	if (!sourceFilePath) {
		return 'edit the workspace source file, then call `build-workflow` with that filePath';
	}

	return `edit workspace source file "${sourceFilePath}", then call \`build-workflow\` with filePath "${sourceFilePath}"`;
}

export function formatWorkflowLoopGuidance(
	action: WorkflowLoopAction,
	options: WorkflowLoopGuidanceOptions = {},
): string {
	switch (action.type) {
		case 'ignored':
			return `STALE REPORT IGNORED: ${action.reason}`;
		case 'continue_building':
			return `BUILD FAILED: ${action.reason}. Fix the workflow source file: ${formatSourceFileInstruction(action.sourceFilePath)}.`;
		case 'done': {
			const claimLead = formatClaimLead(action.claim);
			if (action.setupSkippedByUser) {
				return (
					claimLead +
					' The credentials it still needs are ones the user ' +
					'skipped earlier in this conversation, so do NOT open the setup card again. Tell them ' +
					'which parts stay unconfigured and what that means when the workflow runs, and offer ' +
					'to set them up whenever they want.'
				);
			}
			if (action.mockedCredentialTypes?.length || action.hasUnresolvedPlaceholders) {
				if (options.setupPanelEnabled) {
					return (
						'Workflow verified successfully with temporary mock data. ' +
						`Call \`workflows(action="setup")\` with workflowId "${action.workflowId ?? 'unknown'}" once: ` +
						'it lists the remaining credentials and values in the setup panel next to the chat and returns them to you. ' +
						'When the result has `announced: true`, summarize it, report any validation warnings, and end your turn. ' +
						'Otherwise follow the returned guidance for validation errors, approvals, skipped items, or an existing setup card. ' +
						'Do not call `credentials(action="setup")` or `apply-workflow-credentials`, and do not tell the user to open the editor or canvas.'
					);
				}
				return (
					`${claimLead} It still uses temporary mock data. ` +
					`Call \`workflows(action="setup")\` with workflowId "${action.workflowId ?? 'unknown'}" ` +
					'to open the inline setup card in the n8n Assistant panel for credentials, parameters, and triggers. ' +
					'Do not tell the user to open the editor, use the canvas, or click a Setup button. ' +
					'Do not call `credentials(action="setup")` or `apply-workflow-credentials` — `workflows(action="setup")` handles everything.'
				);
			}
			const closing = isVerifiedClaim(action.claim)
				? 'Report completion to the user.'
				: 'Report the outcome to the user.';
			return `${claimLead} ${closing}${action.workflowId ? ` Workflow ID: ${action.workflowId}` : ''}`;
		}
		case 'verify':
			return (
				`VERIFY: Inspect the persisted workflow ${action.workflowId}: read the bound workspace source file you just built, or call \`workflows(action="get-as-code", workflowId)\` when you need to check for outside changes — it refreshes the file when the saved workflow changed and returns a node index. If it reports status "conflict", the file has unbuilt edits: build or discard them and call it again before trusting the index. Compare the relevant lines to the requested outcome. ` +
				'Build/save success only means a workflow was saved. ' +
				`Use \`verify-built-workflow\` with workflowId "${action.workflowId ?? 'unknown'}"` +
				(options.workItemId ? ` and workItemId "${options.workItemId}"` : '') +
				'; it reuses the build outcome simulation plan and is safe to call multiple times. ' +
				'For alternate deterministic scenarios, pass `fixtureOverrides` for nodes already classified as simulated. ' +
				'If it fails, use `executions(action="debug")` to diagnose. ' +
				'If the saved graph or run evidence is not good enough, report `needs_patch` or `needs_rebuild` and keep repairing the same workflow source file. ' +
				`Then call \`report-verification-verdict\` with workItemId "${options.workItemId ?? 'unknown'}", \`workflowInspection\`, and your findings.`
			);
		case 'blocked':
			return `BUILD BLOCKED: ${action.reason}. Explain this to the user and ask how to proceed.`;
		case 'rebuild':
			return (
				`REBUILD NEEDED: Workflow "${action.workflowId}" needs structural repair. ` +
				`Load the \`workflow-builder\` skill, ${formatSourceFileInstruction(action.sourceFilePath)}. ` +
				`Use workflowId "${action.workflowId}" on the first build-workflow call if the file is not already bound, and workItemId "${options.workItemId ?? 'unknown'}" for this repair. ` +
				`Apply this structural repair in the source file: ${action.failureDetails}`
			);
		case 'patch':
			return (
				`PATCH NEEDED: Node "${action.failedNodeName}" in workflow ${action.workflowId} needs a targeted fix. ` +
				`Diagnosis: ${action.diagnosis}. ` +
				(action.patch ? `Suggested fix: ${JSON.stringify(action.patch)}. ` : '') +
				`Load the \`workflow-builder\` skill, ${formatSourceFileInstruction(action.sourceFilePath)}. ` +
				`Use workflowId "${action.workflowId}" on the first build-workflow call if the file is not already bound, and workItemId "${options.workItemId ?? 'unknown'}" for this repair.`
			);
	}
}
