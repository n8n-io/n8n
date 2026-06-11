import type { WorkflowLoopAction } from './workflow-loop-state';

export interface WorkflowLoopGuidanceOptions {
	workItemId?: string;
}

export function formatWorkflowLoopGuidance(
	action: WorkflowLoopAction,
	options: WorkflowLoopGuidanceOptions = {},
): string {
	switch (action.type) {
		case 'ignored':
			return `STALE REPORT IGNORED: ${action.reason}`;
		case 'continue_building':
			return `SUBMIT FAILED: ${action.reason}. Fix the workflow code and call \`submit-workflow\` again.`;
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
				`VERIFY: Inspect the persisted workflow ${action.workflowId} with \`workflows(action="get-json")\` and compare it to the requested outcome. ` +
				'Build/save success only means a workflow was saved. ' +
				`If the build had mocked credentials, use \`verify-built-workflow\` with workItemId "${options.workItemId ?? 'unknown'}". ` +
				'Otherwise use `executions(action="run")`. ' +
				'If it fails, use `executions(action="debug")` to diagnose. ' +
				'If the saved graph or run evidence is not good enough, report `needs_patch` or `needs_rebuild` and keep patching the same workflow. ' +
				`Then call \`report-verification-verdict\` with workItemId "${options.workItemId ?? 'unknown'}", \`workflowInspection\`, and your findings.`
			);
		case 'blocked':
			return `BUILD BLOCKED: ${action.reason}. Explain this to the user and ask how to proceed.`;
		case 'rebuild':
			return (
				`REBUILD NEEDED: Workflow "${action.workflowId}" needs structural repair. ` +
				'Load the `workflow-builder` skill, then call `build-workflow` directly ' +
				`with \`workflowId: "${action.workflowId}"\` ` +
				`and \`workItemId: "${options.workItemId ?? 'unknown'}"\` ` +
				'(no plan — this is a single-task rebuild; `workflowId` and `workItemId` are required ' +
				'so the builder updates the existing workflow instead of creating a duplicate). ' +
				`Use SDK code or a targeted patch to apply this structural repair: ${action.failureDetails}`
			);
		case 'patch':
			return (
				`PATCH NEEDED: Node "${action.failedNodeName}" in workflow ${action.workflowId} needs a targeted fix. ` +
				`Diagnosis: ${action.diagnosis}. ` +
				(action.patch ? `Suggested fix: ${JSON.stringify(action.patch)}. ` : '') +
				'Load the `workflow-builder` skill, then call `build-workflow` directly ' +
				`with \`workflowId: "${action.workflowId}"\` ` +
				`and \`workItemId: "${options.workItemId ?? 'unknown'}"\` ` +
				'(no plan — this is a single-task patch; `workflowId` and `workItemId` are required ' +
				'so the builder updates the existing workflow instead of creating a duplicate). ' +
				'Use patch mode when the edit is small.'
			);
	}
}
