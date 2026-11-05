import { formatImportBlockingIssue } from './n8nPackages.issues';

describe('formatImportBlockingIssue', () => {
	it('names a lineage conflict by the existing workflow, or by the source ID without one', () => {
		const issue = {
			type: 'workflow-lineage-conflict' as const,
			sourceWorkflowId: 'source-id',
			projectId: 'project-id',
			existingWorkflows: [{ id: 'existing-id', name: 'Existing flow', isArchived: false }],
		};

		expect(formatImportBlockingIssue(issue)).toContain('Existing flow');
		expect(formatImportBlockingIssue({ ...issue, existingWorkflows: [] })).toContain('source-id');
	});
});
