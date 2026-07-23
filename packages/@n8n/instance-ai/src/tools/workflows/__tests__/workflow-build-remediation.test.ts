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
	});
});
