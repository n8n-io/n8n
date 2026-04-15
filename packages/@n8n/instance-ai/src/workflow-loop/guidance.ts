import type { WorkflowLoopAction } from './workflow-loop-state';

export interface WorkflowLoopGuidanceOptions {
	workItemId?: string;
}

const CHECKLIST_DONE_NEEDS_SETUP =
	'\n\nUpdate the build checklist via `update-tasks` with these items (use specific credential/trigger names when known): ' +
	'{ id: "build", description: "Build workflow", status: "done" }, ' +
	'{ id: "setup", description: "Set up credentials & triggers", status: "todo" }, ' +
	'{ id: "test", description: "Test workflow after setup", status: "todo" }, ' +
	'{ id: "publish", description: "Publish when ready", status: "todo" }.';

const CHECKLIST_DONE_VERIFIED =
	'\n\nUpdate the build checklist via `update-tasks`: ' +
	'{ id: "build", description: "Build workflow", status: "done" }, ' +
	'{ id: "test", description: "Workflow tested", status: "done" }, ' +
	'{ id: "publish", description: "Publish when ready", status: "todo" }.';

const CHECKLIST_VERIFY =
	'\n\nUpdate the build checklist via `update-tasks`: ' +
	'{ id: "build", description: "Build workflow", status: "done" }, ' +
	'{ id: "test", description: "Test workflow after build", status: "in_progress" }, ' +
	'{ id: "publish", description: "Publish when ready", status: "todo" }.';

const CHECKLIST_REPAIR_VERIFY =
	'\n\nThe workflow was rebuilt or patched after a failed test. Continue the loop automatically: ' +
	'run the workflow again, debug if needed, and call `report-verification-verdict` again. ' +
	'Update the build checklist via `update-tasks`: ' +
	'{ id: "build", description: "Build workflow", status: "done" }, ' +
	'{ id: "test", description: "Test workflow after build", status: "in_progress" }, ' +
	'{ id: "publish", description: "Publish when ready", status: "todo" }.';

const CHECKLIST_BLOCKED =
	'\n\nUpdate the build checklist via `update-tasks`: ' +
	'{ id: "build", description: "Build workflow", status: "done" }, ' +
	'{ id: "test", description: "Test workflow", status: "failed" }, ' +
	'{ id: "publish", description: "Publish when ready", status: "todo" }.';

export function formatWorkflowLoopGuidance(
	action: WorkflowLoopAction,
	options: WorkflowLoopGuidanceOptions = {},
): string {
	switch (action.type) {
		case 'done': {
			if (action.mockedCredentialTypes?.length || action.hasUnresolvedPlaceholders) {
				return (
					'Workflow verified successfully with temporary mock data. ' +
					`Call \`setup-workflow\` with workflowId "${action.workflowId ?? 'unknown'}" ` +
					'to let the user configure credentials, parameters, and triggers through the setup UI. ' +
					'Do not call `setup-credentials` or `apply-workflow-credentials` — `setup-workflow` handles everything.' +
					CHECKLIST_DONE_NEEDS_SETUP
				);
			}
			return (
				`Workflow verified successfully. Report completion to the user.${action.workflowId ? ` Workflow ID: ${action.workflowId}` : ''}` +
				CHECKLIST_DONE_VERIFIED
			);
		}
		case 'verify':
			return (
				`VERIFY: Run workflow ${action.workflowId}. ` +
				`If the build had mocked credentials, use \`verify-built-workflow\` with workItemId "${options.workItemId ?? 'unknown'}". ` +
				'Otherwise use `run-workflow`. ' +
				'If it fails, use `debug-execution` to diagnose. ' +
				`Then call \`report-verification-verdict\` with workItemId "${options.workItemId ?? 'unknown'}" and your findings.` +
				CHECKLIST_VERIFY
			);
		case 'repair_verify':
			return (
				`RE-VERIFY: The workflow ${action.workflowId} was repaired after a failed test. ` +
				'Do not stop at diagnosis text. Run the workflow again immediately. ' +
				'If it fails, use `debug-execution` to diagnose and then call ' +
				` \`report-verification-verdict\` with workItemId "${options.workItemId ?? 'unknown'}".` +
				CHECKLIST_REPAIR_VERIFY
			);
		case 'blocked':
			return (
				`BUILD BLOCKED: ${action.reason}. Explain this to the user and ask how to proceed.` +
				CHECKLIST_BLOCKED
			);
		case 'rebuild':
			return (
				`REBUILD NEEDED: The workflow at ${action.workflowId} needs structural repair. ` +
				'Submit a new `plan` with one `build-workflow` task. ' +
				`In the task spec, explain that workflow "${action.workflowId}" needs structural repair and include these details: ${action.failureDetails}`
			);
		case 'patch':
			return (
				`PATCH NEEDED: Node "${action.failedNodeName}" in workflow ${action.workflowId} needs a targeted fix. ` +
				`Diagnosis: ${action.diagnosis}. ` +
				(action.patch ? `Suggested fix: ${JSON.stringify(action.patch)}. ` : '') +
				'Submit a new `plan` with one `build-workflow` task. ' +
				`In the task spec, set mode "patch", include workflowId "${action.workflowId}", and describe the targeted fix.`
			);
	}
}
