import { ImportBlockedErrorDto, ImportResultDto } from '../import-result.dto';

describe('ImportResultDto', () => {
	it('accepts a project-package happy-path result', () => {
		const result = ImportResultDto.safeParse({
			package: {
				sourceN8nVersion: '1.0.0',
				sourceId: 'source-1',
				exportedAt: '2024-01-01T00:00:00.000Z',
			},
			workflows: [
				{
					sourceWorkflowId: 'wf-1',
					localId: 'wf-1',
					name: 'My workflow',
					projectId: 'proj-1',
					parentFolderId: null,
					activeVersionId: 'ver-1',
					isArchived: false,
					publishing: { state: 'published' },
					status: 'created',
				},
			],
			removedWorkflows: [
				{
					workflowId: 'wf-removed',
					name: 'Old workflow',
					projectId: 'proj-1',
					parentFolderId: 'folder-1',
					deletion: 'archived',
				},
			],
			removedFolders: [
				{
					folderId: 'folder-removed',
					name: 'Old folder',
					projectId: 'proj-1',
					parentFolderId: null,
				},
			],
			folders: [
				{
					sourceFolderId: 'folder-1',
					localId: 'folder-1',
					name: 'My folder',
					parentFolderId: null,
					status: 'created',
				},
			],
			projects: [
				{ sourceProjectId: 'proj-1', localId: 'proj-1', name: 'My project', status: 'created' },
			],
			bindings: {
				workflows: { 'wf-1': 'wf-1' },
				credentials: { 'cred-1': 'cred-1' },
			},
			credentials: {
				matched: ['cred-1'],
				stubbed: [],
				seeded: [],
				incomplete: [],
				updated: [],
			},
			dataTables: { matched: 1, created: 0, updated: 0 },
			variables: { matched: [], missing: [], created: [], stubbed: [], updated: [] },
			tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
		});

		expect(result.success).toBe(true);
	});

	it('accepts a workflow with a blocked/failed publishing outcome and the optional fields it carries', () => {
		const result = ImportResultDto.safeParse({
			package: {
				sourceN8nVersion: '1.0.0',
				sourceId: 'source-1',
				exportedAt: '2024-01-01T00:00:00.000Z',
			},
			workflows: [
				{
					sourceWorkflowId: 'wf-1',
					localId: 'wf-1',
					name: 'My workflow',
					projectId: 'proj-1',
					parentFolderId: null,
					activeVersionId: null,
					isArchived: false,
					publishing: {
						state: 'blocked',
						blockedReason: 'stub-credential',
					},
					status: 'updated',
				},
			],
			removedWorkflows: [],
			removedFolders: [],
			folders: [],
			projects: [],
			bindings: { workflows: {}, credentials: {} },
			credentials: { matched: [], stubbed: [], seeded: [], incomplete: [], updated: [] },
			dataTables: { matched: 0, created: 0, updated: 0 },
			variables: { matched: [], missing: [], created: [], stubbed: [], updated: [] },
			tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
		});

		expect(result.success).toBe(true);
	});
});

describe('ImportBlockedErrorDto', () => {
	it.each([
		{ kind: 'task-id', sourceTaskId: 'task-1', success: true },
		{ kind: 'task-id', sourceTaskId: undefined, success: false },
		{ kind: 'existing', sourceTaskId: undefined, success: true },
		{ kind: 'existing', sourceTaskId: 'task-1', success: false },
		{ kind: 'id', sourceTaskId: undefined, success: true },
		{ kind: 'id', sourceTaskId: 'task-1', success: false },
	])(
		'validates $kind conflicts with sourceTaskId=$sourceTaskId',
		({ kind, sourceTaskId, success }) => {
			const result = ImportBlockedErrorDto.safeParse({
				message: 'The package import is blocked.',
				issues: [
					{
						type: 'agent-conflict',
						kind,
						sourceAgentId: 'agent-1',
						projectId: 'proj-1',
						sourceTaskId,
						targetIds: ['target-1'],
					},
				],
			});

			expect(result.success).toBe(success);
		},
	);
});
