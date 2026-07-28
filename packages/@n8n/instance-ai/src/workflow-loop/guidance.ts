import type { WorkflowLoopAction } from './workflow-loop-state';

export interface WorkflowLoopGuidanceOptions {
	workItemId?: string;
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
			if (action.mockedCredentialTypes?.length || action.hasUnresolvedPlaceholders) {
				return (
					'Workflow verified successfully with temporary mock data. ' +
					`Call \`workflows(action="setup")\` with workflowId "${action.workflowId ?? 'unknown'}" ` +
					'to open the inline setup card in the AI Assistant panel for credentials, parameters, and triggers. ' +
					'Do not tell the user to open the editor, use the canvas, or click a Setup button. ' +
					'Do not call `credentials(action="setup")` or `apply-workflow-credentials` — `workflows(action="setup")` handles everything.'
				);
			}
			return `Workflow verified successfully. Report completion to the user.${action.workflowId ? ` Workflow ID: ${action.workflowId}` : ''}`;
		}
		case 'verify':
			return (
				`VERIFY: Inspect the persisted workflow ${action.workflowId} with \`workflows(action="get-as-code", workflowId)\` or read the bound workspace source file, then compare it to the requested outcome. ` +
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
