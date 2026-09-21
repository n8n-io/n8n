import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import type { WorkflowSourceCompileFailureReason } from './workflow-source-compiler';
import { isWorkflowEditorLockedError } from '../../errors/workflow-editor-locked.error';
import { isWorkflowNotFoundError } from '../../errors/workflow-not-found.error';
import { WorkflowSaveConflictError } from '../../errors/workflow-save-conflict.error';
import { createRemediation } from '../../workflow-loop/remediation';
import type { RemediationMetadata } from '../../workflow-loop/workflow-loop-state';

export const INVALID_WORKFLOW_ID_GUIDANCE =
	'Call build-workflow again with the same filePath and omit workflowId to create a new workflow only if that value was never a real n8n workflow id (for example an SDK slug). ' +
	'If you meant an existing workflow, confirm the id with workflows() first — missing and inaccessible look the same. ' +
	'workflowId must be a real n8n workflow id from a prior build-workflow or workflows() tool result — never the first argument of workflow(slug, name).';

function getFailureText(error: unknown): string {
	return getErrorMessage(error).toLowerCase();
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
			'The workflow was modified outside this conversation since your last save (canvas edit, setup, credential change, or version revert). Call workflows(action="get-as-code", workflowId): it regenerates the bound source file from the saved workflow. Re-apply your intended change in that file with workspace_str_replace_file, then call build-workflow again with the same filePath. If get-as-code reports status "conflict", the file still holds your unbuilt edits on top of the old version: delete the file, call get-as-code again, and re-apply the change before building.',
	});
}

export function createWorkflowLockedByEditorRemediation(): RemediationMetadata {
	return createRemediation({
		category: 'blocked',
		shouldEdit: false,
		reason: 'workflow_locked_by_editor',
		guidance:
			'The workflow could not be saved because someone is editing it in the n8n editor right now — saving would overwrite their work. Stop editing the source and tell the user to finish or close their editing session, then retry.',
	});
}

export function createSaveFailureRemediation(
	error: unknown,
	hasBoundWorkflowId: boolean,
): RemediationMetadata {
	if (error instanceof WorkflowSaveConflictError) {
		return createWorkflowModifiedExternallyRemediation();
	}

	if (isWorkflowEditorLockedError(error)) {
		return createWorkflowLockedByEditorRemediation();
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

	if (isWorkflowNotFoundError(error)) {
		if (hasBoundWorkflowId) {
			return createRemediation({
				category: 'blocked',
				shouldEdit: false,
				reason: 'bound_workflow_not_found',
				guidance:
					'The saved workflow bound to this source file no longer exists. Stop editing this source and explain that the workflow must be restored or a new build started.',
			});
		}

		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_id_not_found',
			guidance: INVALID_WORKFLOW_ID_GUIDANCE,
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
