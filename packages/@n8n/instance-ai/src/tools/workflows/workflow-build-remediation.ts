import type { WorkflowSourceCompileFailureReason } from './workflow-source-compiler';
import { WorkflowSaveConflictError } from '../../errors/workflow-save-conflict.error';
import { createRemediation } from '../../workflow-loop/remediation';
import type { RemediationMetadata } from '../../workflow-loop/workflow-loop-state';

function isWorkflowNotFoundError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /workflow not found/i.test(message);
}

function getFailureText(error: unknown): string {
	return (error instanceof Error ? error.message : String(error)).toLowerCase();
}

function isCredentialSaveFailure(text: string): boolean {
	if (!text.includes('credential')) return false;

	return (
		text.includes('not found') ||
		text.includes('missing') ||
		text.includes('not accessible') ||
		text.includes('no access') ||
		text.includes('do not have access') ||
		text.includes("don't have access") ||
		text.includes('not shared') ||
		text.includes('unauthorized')
	);
}

function isPermissionSaveFailure(text: string): boolean {
	return (
		text.includes('blocked by admin') ||
		text.includes('read-only') ||
		text.includes('permission') ||
		text.includes('forbidden') ||
		text.includes('not authorized')
	);
}

export function createCodeFixableRemediation(input: {
	reason: string;
	guidance: string;
}): RemediationMetadata {
	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason: input.reason,
		guidance: input.guidance,
	});
}

export function createWorkflowModifiedExternallyRemediation(): RemediationMetadata {
	return createCodeFixableRemediation({
		reason: 'workflow_modified_externally',
		guidance:
			'The workflow was modified outside this conversation since your last save (canvas edit, setup, credential change, or version revert). Call workflows(action="get-as-code", workflowId), re-apply your intended change to the returned code, write it to the same filePath, then call build-workflow again with the same filePath.',
	});
}

export function createSaveFailureRemediation(
	error: unknown,
	hasBoundWorkflowId: boolean,
): RemediationMetadata {
	if (error instanceof WorkflowSaveConflictError) {
		return createWorkflowModifiedExternallyRemediation();
	}

	const text = getFailureText(error);

	if (isCredentialSaveFailure(text)) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'workflow_save_credential_setup_required',
			guidance:
				'Workflow save failed because a credential is missing or inaccessible. Stop code edits and route the workflow through setup.',
		});
	}

	if (hasBoundWorkflowId && isWorkflowNotFoundError(error)) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'bound_workflow_not_found',
			guidance:
				'The saved workflow bound to this source file no longer exists. Stop editing this source and explain that the workflow must be restored or a new build started.',
		});
	}

	if (isPermissionSaveFailure(text)) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_save_permission_blocked',
			guidance:
				'Workflow save is blocked by permissions or read-only instance configuration. Stop editing and explain the blocker to the user.',
		});
	}

	return createCodeFixableRemediation({
		reason: 'workflow_save_failed',
		guidance:
			'The workflow did not save. Edit the workspace source file using the returned filePath, then call build-workflow again with the same filePath.',
	});
}

export function createSourceCompileRemediation(input: {
	reason: WorkflowSourceCompileFailureReason;
	editable: boolean;
}): RemediationMetadata {
	if (!input.editable) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: input.reason,
			guidance:
				'The workflow source could not be built because the Instance AI sandbox is unavailable. Stop editing and explain the infrastructure blocker to the user.',
		});
	}

	const isWorkflowJsonFailure =
		input.reason === 'workflow_json_parse_failed' || input.reason === 'workflow_json_invalid';

	return createCodeFixableRemediation({
		reason: input.reason,
		guidance: isWorkflowJsonFailure
			? 'Edit the workspace WorkflowJSON file using filePath, then call build-workflow again with the same filePath.'
			: 'Edit the workspace source file using filePath, then call build-workflow again with the same filePath.',
	});
}
