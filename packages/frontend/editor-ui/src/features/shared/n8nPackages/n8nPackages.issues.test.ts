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

	describe('credential-unresolved', () => {
		const issue = {
			type: 'credential-unresolved' as const,
			sourceId: 'cred-1',
			usedBy: [],
		};

		it('names both types for a type mismatch', () => {
			const text = formatImportBlockingIssue({
				...issue,
				kind: 'type_mismatch',
				expectedType: 'slackApi',
				actualType: 'githubApi',
			});

			expect(text).toBe(
				'Credential cred-1 has the type githubApi, but the package needs slackApi.',
			);
		});

		it('uses a text without types for a type mismatch without types', () => {
			expect(formatImportBlockingIssue({ ...issue, kind: 'type_mismatch' })).toBe(
				"Credential cred-1 doesn't have the type that the package needs.",
			);
		});

		it('uses the not-found text for other kinds', () => {
			expect(formatImportBlockingIssue({ ...issue, kind: 'not_found' })).toBe(
				"Credential cred-1 can't be found in this project.",
			);
		});
	});
});
