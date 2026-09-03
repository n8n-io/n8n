import type { VerificationClaim, WorkflowLoopAction } from './workflow-loop-state';

export interface WorkflowLoopGuidanceOptions {
	workItemId?: string;
}

function formatNodeList(names: readonly string[], max = 8): string {
	if (names.length <= max) return names.join(', ');
	return `${names.slice(0, max).join(', ')} and ${String(names.length - max)} more`;
}

/**
 * Lead sentence for a completed build. Derived from the claim so the guidance
 * never tells the model a partially covered run was verified — that sentence
 * was the strongest license for the false success claims in AIA-31.
 */
function formatClaimLead(claim: VerificationClaim | undefined): string {
	if (isVerifiedClaim(claim)) return 'Workflow verified successfully.';

	const facts: string[] = [
		`${String(claim.reachedNodeCount)} of ${String(claim.plannedNodeCount)} planned node(s) ran.`,
	];
	if (claim.nodesNotReached.length > 0) {
		facts.push(`Never reached, so UNVERIFIED: ${formatNodeList(claim.nodesNotReached)}.`);
	}
	if (claim.simulatedNodes.length > 0) {
		facts.push(
			'Output was simulated, so nothing real happened at: ' +
				`${formatNodeList(claim.simulatedNodes.map((node) => node.nodeName))}.`,
		);
	}

	const lead =
		claim.level === 'unproven'
			? 'The workflow changed, but it is NOT verified. ' +
				`The node(s) this change was about were never proven: ${formatNodeList(claim.unprovenTargets)}.`
			: 'The workflow ran without errors, but it is NOT fully verified.';

	// The verdict block the user sees is rendered from this same claim, so the
	// model must not write a stronger claim next to it.
	const rules = [
		'Do NOT call the workflow verified, tested, working, or ready to publish.',
		'Do NOT offer to publish it.',
		claim.liveTestRecommended ? 'Offer a live end-to-end test instead.' : '',
	].filter((rule) => rule !== '');

	return [lead, ...facts, ...rules].join(' ');
}

function isVerifiedClaim(claim: VerificationClaim | undefined): boolean {
	// A missing claim means no run reported one (e.g. a trigger-only build), so
	// the pre-claim wording still applies.
	return claim === undefined || claim.level === 'verified';
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
				return (
					`${claimLead} It still uses temporary mock data. ` +
					`Call \`workflows(action="setup")\` with workflowId "${action.workflowId ?? 'unknown'}" ` +
					'to open the inline setup card in the AI Assistant panel for credentials, parameters, and triggers. ' +
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
