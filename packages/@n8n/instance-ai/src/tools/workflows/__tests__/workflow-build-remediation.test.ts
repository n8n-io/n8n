import { WorkflowEditorLockedError } from '../../../errors/workflow-editor-locked.error';
import { WorkflowNotFoundError } from '../../../errors/workflow-not-found.error';
import { WorkflowSaveConflictError } from '../../../errors/workflow-save-conflict.error';
import { createSaveFailureRemediation } from '../workflow-build-remediation';

describe('createSaveFailureRemediation', () => {
	it('returns workflow_modified_externally remediation for save conflicts', () => {
		const remediation = createSaveFailureRemediation(new WorkflowSaveConflictError('wf-1'), true);

		expect(remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
			reason: 'workflow_modified_externally',
		});
		expect(remediation.guidance).toContain('get-as-code');
		expect(remediation.guidance).toContain('status "conflict"');
	});

	it('blocks source edits when a user holds the editor write lock', () => {
		const remediation = createSaveFailureRemediation(new WorkflowEditorLockedError('wf-1'), true);

		expect(remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_locked_by_editor',
		});
		expect(remediation.guidance).toContain('editing');
	});

	it('blocks source edits when the editor lock error is nested as cause', () => {
		const remediation = createSaveFailureRemediation(
			new Error('Failed to save workflow', { cause: new WorkflowEditorLockedError('wf-1') }),
			true,
		);

		expect(remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_locked_by_editor',
		});
	});

	it('returns bound_workflow_not_found for WorkflowNotFoundError', () => {
		const remediation = createSaveFailureRemediation(
			new WorkflowNotFoundError('invoice-processing'),
			true,
		);

		expect(remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'bound_workflow_not_found',
		});
	});

	it('returns bound_workflow_not_found when WorkflowNotFoundError is nested as cause', () => {
		const remediation = createSaveFailureRemediation(
			new Error('Failed to load existing workflow invoice-processing to preserve setup values', {
				cause: new WorkflowNotFoundError('invoice-processing'),
			}),
			true,
		);

		expect(remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'bound_workflow_not_found',
		});
	});

	it('returns workflow_id_not_found when no workflow id was bound', () => {
		const remediation = createSaveFailureRemediation(
			new WorkflowNotFoundError('invoice-processing'),
			false,
		);

		expect(remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_id_not_found',
		});
		expect(remediation.guidance).toContain('omit workflowId');
		expect(remediation.guidance).toContain('workflows()');
	});
});
