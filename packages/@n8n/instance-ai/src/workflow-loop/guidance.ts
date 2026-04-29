import type { WorkflowLoopAction } from './workflow-loop-state';

export interface WorkflowLoopGuidanceOptions {
	workItemId?: string;
}

export function formatWorkflowLoopGuidance(
	action: WorkflowLoopAction,
	options: WorkflowLoopGuidanceOptions = {},
): string {
	switch (action.type) {
		case 'done': {
			if (action.mockedCredentialTypes?.length || action.hasUnresolvedPlaceholders) {
				return (
					'Workflow verified successfully with temporary mock data. ' +
					`Call \`workflows(action="setup")\` with workflowId "${action.workflowId ?? 'unknown'}" ` +
					'to let the user configure credentials, parameters, and triggers through the setup UI. ' +
					'Do not call `credentials(action="setup")` or `apply-workflow-credentials` — `workflows(action="setup")` handles everything.'
				);
			}
			return `Workflow verified successfully. Report completion to the user.${action.workflowId ? ` Workflow ID: ${action.workflowId}` : ''}`;
		}
		case 'verify':
			return (
				`VERIFY: Run workflow ${action.workflowId}. ` +
				`If the build had mocked credentials, use \`verify-built-workflow\` with workItemId "${options.workItemId ?? 'unknown'}". ` +
				'Otherwise use `executions(action="run")`. ' +
				'If it fails, use `executions(action="debug")` to diagnose. ' +
				`Then call \`report-verification-verdict\` with workItemId "${options.workItemId ?? 'unknown'}" and your findings.`
			);
		case 'blocked':
			return `BUILD BLOCKED: ${action.reason}. Explain this to the user and ask how to proceed.`;
		case 'rebuild':
			return (
				`REBUILD NEEDED: Workflow "${action.workflowId}" needs structural repair. ` +
				`Call \`build-workflow-with-agent\` directly with \`workflowId: "${action.workflowId}"\` ` +
				'(no plan — this is a single-task rebuild, and the `workflowId` parameter is required ' +
				'so the builder updates the existing workflow instead of creating a duplicate). ' +
				`In the \`task\` parameter, describe the structural repair and include these details: ${action.failureDetails}`
			);
		case 'patch':
			return (
				`PATCH NEEDED: Node "${action.failedNodeName}" in workflow ${action.workflowId} needs a targeted fix. ` +
				`Diagnosis: ${action.diagnosis}. ` +
				(action.patch ? `Suggested fix: ${JSON.stringify(action.patch)}. ` : '') +
				`Call \`build-workflow-with-agent\` directly with \`workflowId: "${action.workflowId}"\` ` +
				'(no plan — this is a single-task patch, and the `workflowId` parameter is required ' +
				'so the builder updates the existing workflow instead of creating a duplicate). ' +
				'In the `task` parameter, describe the targeted fix to apply.'
			);
	}
}
