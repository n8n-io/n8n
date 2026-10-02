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
			credentials: { matched: ['cred-1'], stubbed: [] },
			dataTables: { matched: 1, created: 0 },
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
			credentials: { matched: [], stubbed: [] },
			dataTables: { matched: 0, created: 0 },
			variables: { matched: [], missing: [], created: [], stubbed: [], updated: [] },
			tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
		});

		expect(result.success).toBe(true);
	});
});

describe('ImportBlockedErrorDto', () => {
	const baseBody = (issue: Record<string, unknown>) => ({
		message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
		issues: [issue],
	});

	test.each([
		[
			'workflow-conflict',
			{
				type: 'workflow-conflict',
				sourceWorkflowId: 'wf-1',
				existingWorkflowId: 'wf-2',
				name: 'My workflow',
			},
		],
		[
			'workflow-lineage-conflict',
			{
				type: 'workflow-lineage-conflict',
				sourceWorkflowId: 'wf-1',
				projectId: 'proj-1',
				existingWorkflows: [{ id: 'wf-2', name: 'My workflow', isArchived: false }],
			},
		],
		[
			'workflow-id-conflict',
			{
				type: 'workflow-id-conflict',
				sourceWorkflowId: 'wf-1',
				existingWorkflowId: 'wf-2',
				existingProjectId: null,
				isArchived: true,
				name: 'My workflow',
			},
		],
		[
			'workflow-folder-conflict',
			{
				type: 'workflow-folder-conflict',
				sourceWorkflowId: 'wf-1',
				existingWorkflowId: 'wf-2',
				existingParentFolderId: null,
				targetFolderId: 'folder-1',
				name: 'My workflow',
			},
		],
		[
			'workflow-archive-forbidden',
			{
				type: 'workflow-archive-forbidden',
				sourceWorkflowId: 'wf-1',
				existingWorkflowId: 'wf-2',
				name: 'My workflow',
				projectId: 'proj-1',
				transition: 'archive',
			},
		],
		[
			'credential-unresolved',
			{
				type: 'credential-unresolved',
				kind: 'type_mismatch',
				sourceId: 'cred-1',
				targetId: 'cred-2',
				expectedType: 'httpBasicAuth',
				actualType: 'oAuth2Api',
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'project-conflict',
			{
				type: 'project-conflict',
				kind: 'fail-policy',
				sourceProjectId: 'proj-1',
				name: 'My project',
			},
		],
		[
			'folder-conflict',
			{
				type: 'folder-conflict',
				kind: 'parent-mismatch',
				sourceFolderId: 'folder-1',
				name: 'My folder',
				existingParentFolderId: null,
				expectedParentFolderId: 'folder-2',
				existingProjectId: null,
			},
		],
		[
			'workflow-removal-forbidden',
			{
				type: 'workflow-removal-forbidden',
				workflowId: 'wf-1',
				name: 'My workflow',
				projectId: 'proj-1',
			},
		],
		[
			'workflow-removal-conflict',
			{
				type: 'workflow-removal-conflict',
				sourceWorkflowId: 'wf-1',
				workflowId: 'wf-2',
				projectId: 'proj-1',
			},
		],
		[
			'folder-removal-forbidden',
			{
				type: 'folder-removal-forbidden',
				folderId: 'folder-1',
				name: 'My folder',
				projectId: 'proj-1',
			},
		],
		[
			'data-table-unresolved',
			{
				type: 'data-table-unresolved',
				kind: 'schema-incompatible',
				sourceId: 'dt-1',
				name: 'My table',
				missingColumns: ['col-a'],
				typeMismatches: [{ column: 'col-b', expectedType: 'string', actualType: 'number' }],
				extraColumns: ['col-c'],
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'tag-unresolved',
			{
				type: 'tag-unresolved',
				kind: 'rename-drift',
				sourceId: 'tag-1',
				name: 'prod',
				existingTagId: 'tag-2',
				existingName: 'staging',
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'tag-unresolved (permission-denied, no sourceId/name)',
			{
				type: 'tag-unresolved',
				kind: 'permission-denied',
				missingScope: 'tag:create',
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'variable-unresolved',
			{
				type: 'variable-unresolved',
				name: 'MY_VAR',
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'variable-conflict',
			{
				type: 'variable-conflict',
				name: 'MY_VAR',
				projectId: 'proj-1',
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'variable-limit-exceeded',
			{
				type: 'variable-limit-exceeded',
				limit: 10,
				remaining: 1,
				requested: 2,
				names: ['MY_VAR'],
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'missing-node-type',
			{
				type: 'missing-node-type',
				nodeType: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				usedByWorkflows: ['wf-1'],
			},
		],
		[
			'policy-violation',
			{
				type: 'policy-violation',
				sourceWorkflowId: 'wf-1',
				name: 'My workflow',
				violations: [{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Blocked' }],
			},
		],
	])('accepts a %s blocking issue', (_label, issue) => {
		const result = ImportBlockedErrorDto.safeParse(baseBody(issue));

		expect(result.success).toBe(true);
	});

	it('rejects an issue with an unrecognised type', () => {
		const result = ImportBlockedErrorDto.safeParse(baseBody({ type: 'unknown-type' }));

		expect(result.success).toBe(false);
	});
});
