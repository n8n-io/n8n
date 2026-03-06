import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ImportService } from '@/services/import.service';

import type { ImportScope } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { WorkflowImporter } from '../workflow.importer';
import type { ManifestEntry } from '../../import-export.types';

describe('WorkflowImporter', () => {
	let importer: WorkflowImporter;
	let mockImportService: MockProxy<ImportService>;
	let mockReader: MockProxy<PackageReader>;
	let scope: ImportScope;

	beforeEach(() => {
		jest.clearAllMocks();

		mockImportService = mock<ImportService>();
		mockReader = mock<PackageReader>();

		importer = new WorkflowImporter(mockImportService);

		scope = {
			user: mock(),
			targetProjectId: 'new-project-1',
			reader: mockReader,
			entityOptions: {},
			state: {
				folderIdMap: new Map(),
				credentialBindings: new Map(),
				subWorkflowBindings: new Map(),
			},
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.import(scope, []);

		expect(mockImportService.importWorkflows).not.toHaveBeenCalled();
	});

	it('should preserve original IDs when assignNewIds is false', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'wf-1', name: 'daily-sync', target: 'projects/billing/workflows/daily-sync' },
		];

		const workflow = {
			id: 'wf-1',
			name: 'daily-sync',
			nodes: [],
			connections: {},
			settings: {},
			versionId: 'v1',
			parentFolderId: null,
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		const imported = mockImportService.importWorkflows.mock.calls[0][0][0];
		expect(imported.id).toBe('wf-1');
	});

	it('should derive deterministic ID from sourceId + targetProjectId when assignNewIds is true', async () => {
		scope.assignNewIds = true;

		const entries: ManifestEntry[] = [
			{ id: 'wf-1', name: 'daily-sync', target: 'projects/billing/workflows/daily-sync' },
		];

		const workflow = {
			id: 'wf-1',
			name: 'daily-sync',
			nodes: [],
			connections: {},
			settings: {},
			versionId: 'v1',
			parentFolderId: null,
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		const imported = mockImportService.importWorkflows.mock.calls[0][0][0];
		expect(imported.id).toBe('new-project-1-wf-1');
		expect(imported.name).toBe('daily-sync');
	});

	it('should produce same ID on repeated imports (idempotent)', async () => {
		scope.assignNewIds = true;

		const entries: ManifestEntry[] = [{ id: 'wf-1', name: 'test', target: 'workflows/test' }];

		const workflow = {
			id: 'wf-1',
			name: 'test',
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: null,
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		// First import
		await importer.import(scope, entries);
		const firstId = mockImportService.importWorkflows.mock.calls[0][0][0].id;

		// Second import into same project
		mockImportService.importWorkflows.mockClear();
		scope.state.subWorkflowBindings = new Map();
		await importer.import(scope, entries);
		const secondId = mockImportService.importWorkflows.mock.calls[0][0][0].id;

		expect(firstId).toBe(secondId);
	});

	it('should track old→new ID mapping in context.subWorkflowBindings when assignNewIds is true', async () => {
		scope.assignNewIds = true;

		const entries: ManifestEntry[] = [{ id: 'wf-1', name: 'test', target: 'workflows/test' }];

		const workflow = {
			id: 'wf-1',
			name: 'test',
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: null,
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		expect(scope.state.subWorkflowBindings).toBeDefined();
		expect(scope.state.subWorkflowBindings.get('wf-1')).toBe('new-project-1-wf-1');
	});

	it('should import workflows with remapped folder IDs', async () => {
		scope.state.folderIdMap.set('source-folder-1', 'new-folder-1');

		const entries: ManifestEntry[] = [
			{ id: 'wf-1', name: 'daily-sync', target: 'projects/billing/workflows/daily-sync' },
		];

		const workflow = {
			id: 'wf-1',
			name: 'daily-sync',
			nodes: [],
			connections: {},
			settings: {},
			versionId: 'v1',
			parentFolderId: 'source-folder-1',
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		const imported = mockImportService.importWorkflows.mock.calls[0][0][0] as unknown as Record<
			string,
			unknown
		>;
		expect(imported.parentFolderId).toBe('new-folder-1');
	});

	it('should remap parentFolderId to deterministic folder IDs when assignNewIds is true', async () => {
		scope.assignNewIds = true;
		// Simulate folder importer having already created deterministic folder IDs
		scope.state.folderIdMap.set('folder-1', 'new-project-1-folder-1');

		const entries: ManifestEntry[] = [
			{ id: 'wf-1', name: 'daily-sync', target: 'workflows/daily-sync' },
		];

		const workflow = {
			id: 'wf-1',
			name: 'daily-sync',
			nodes: [],
			connections: {},
			settings: {},
			versionId: 'v1',
			parentFolderId: 'folder-1',
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		const imported = mockImportService.importWorkflows.mock.calls[0][0][0] as unknown as Record<
			string,
			unknown
		>;
		expect(imported.id).toBe('new-project-1-wf-1');
		expect(imported.parentFolderId).toBe('new-project-1-folder-1');
	});

	it('should set parentFolderId to null when folder is not in map', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'wf-1', name: 'test', target: 'projects/billing/workflows/test' },
		];

		const workflow = {
			id: 'wf-1',
			name: 'test',
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: 'unknown-folder',
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		expect(mockImportService.importWorkflows).toHaveBeenCalledWith(
			[expect.objectContaining({ parentFolderId: null })],
			'new-project-1',
			undefined,
		);
	});

	it('should preserve null parentFolderId for root workflows', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'wf-1', name: 'test', target: 'projects/billing/workflows/test' },
		];

		const workflow = {
			id: 'wf-1',
			name: 'test',
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: null,
			isArchived: false,
		};

		mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		expect(mockImportService.importWorkflows).toHaveBeenCalledWith(
			[expect.objectContaining({ parentFolderId: null })],
			'new-project-1',
			undefined,
		);
	});

	it('should import multiple workflows in a single call', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'wf-1', name: 'sync', target: 'projects/billing/workflows/sync' },
			{ id: 'wf-2', name: 'notify', target: 'projects/billing/workflows/notify' },
		];

		mockReader.readFile
			.mockReturnValueOnce(
				JSON.stringify({
					id: 'wf-1',
					name: 'sync',
					nodes: [],
					connections: {},
					versionId: 'v1',
					parentFolderId: null,
					isArchived: false,
				}),
			)
			.mockReturnValueOnce(
				JSON.stringify({
					id: 'wf-2',
					name: 'notify',
					nodes: [],
					connections: {},
					versionId: 'v2',
					parentFolderId: null,
					isArchived: false,
				}),
			);

		mockImportService.importWorkflows.mockResolvedValue(undefined);

		await importer.import(scope, entries);

		expect(mockImportService.importWorkflows).toHaveBeenCalledTimes(1);
		const workflows = mockImportService.importWorkflows.mock.calls[0][0];
		expect(workflows).toHaveLength(2);
	});

	describe('credential remapping', () => {
		it('should remap credential IDs when bindings are provided', async () => {
			scope.state.credentialBindings = new Map([['source-cred-1', 'target-cred-1']]);

			const entries: ManifestEntry[] = [
				{ id: 'wf-1', name: 'test', target: 'projects/billing/workflows/test' },
			];

			const workflow = {
				id: 'wf-1',
				name: 'test',
				nodes: [
					{
						id: 'node-1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: { slackApi: { id: 'source-cred-1', name: 'My Slack' } },
					},
				],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				isArchived: false,
			};

			mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
			mockImportService.importWorkflows.mockResolvedValue(undefined);

			await importer.import(scope, entries);

			const imported = mockImportService.importWorkflows.mock.calls[0][0][0];
			expect(imported.nodes[0].credentials!.slackApi.id).toBe('target-cred-1');
		});

		it('should leave unmapped credential IDs unchanged', async () => {
			scope.state.credentialBindings = new Map([['other-cred', 'target-cred']]);

			const entries: ManifestEntry[] = [
				{ id: 'wf-1', name: 'test', target: 'projects/billing/workflows/test' },
			];

			const workflow = {
				id: 'wf-1',
				name: 'test',
				nodes: [
					{
						id: 'node-1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: { slackApi: { id: 'source-cred-1', name: 'My Slack' } },
					},
				],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				isArchived: false,
			};

			mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
			mockImportService.importWorkflows.mockResolvedValue(undefined);

			await importer.import(scope, entries);

			const imported = mockImportService.importWorkflows.mock.calls[0][0][0];
			expect(imported.nodes[0].credentials!.slackApi.id).toBe('source-cred-1');
		});
	});

	describe('sub-workflow remapping', () => {
		it('should remap sub-workflow IDs using bindings from scope (string format)', async () => {
			// Pre-populate a binding (e.g. from an external workflow resolved during import)
			scope.state.subWorkflowBindings = new Map([['external-wf', 'resolved-external-wf']]);

			const entries: ManifestEntry[] = [
				{ id: 'wf-1', name: 'test', target: 'projects/billing/workflows/test' },
			];

			const workflow = {
				id: 'wf-1',
				name: 'test',
				nodes: [
					{
						id: 'node-1',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [0, 0],
						parameters: { workflowId: 'external-wf' },
					},
				],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				isArchived: false,
			};

			mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
			mockImportService.importWorkflows.mockResolvedValue(undefined);

			await importer.import(scope, entries);

			const imported = mockImportService.importWorkflows.mock.calls[0][0][0];
			expect(imported.nodes[0].parameters.workflowId).toBe('resolved-external-wf');
		});

		it('should remap sub-workflow IDs (object format)', async () => {
			scope.state.subWorkflowBindings = new Map([['external-wf', 'resolved-external-wf']]);

			const entries: ManifestEntry[] = [
				{ id: 'wf-1', name: 'test', target: 'projects/billing/workflows/test' },
			];

			const workflow = {
				id: 'wf-1',
				name: 'test',
				nodes: [
					{
						id: 'node-1',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [0, 0],
						parameters: { workflowId: { value: 'external-wf' } },
					},
				],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				isArchived: false,
			};

			mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
			mockImportService.importWorkflows.mockResolvedValue(undefined);

			await importer.import(scope, entries);

			const imported = mockImportService.importWorkflows.mock.calls[0][0][0];
			expect(imported.nodes[0].parameters.workflowId).toEqual({ value: 'resolved-external-wf' });
		});

		it('should remap cross-references between workflows in the same package', async () => {
			scope.assignNewIds = true;

			const entries: ManifestEntry[] = [
				{ id: 'wf-1', name: 'parent', target: 'workflows/parent' },
				{ id: 'wf-2', name: 'child', target: 'workflows/child' },
			];

			mockReader.readFile
				.mockReturnValueOnce(
					JSON.stringify({
						id: 'wf-1',
						name: 'parent',
						nodes: [
							{
								id: 'node-1',
								name: 'Execute Workflow',
								type: 'n8n-nodes-base.executeWorkflow',
								typeVersion: 1,
								position: [0, 0],
								parameters: { workflowId: 'wf-2' },
							},
						],
						connections: {},
						versionId: 'v1',
						parentFolderId: null,
						isArchived: false,
					}),
				)
				.mockReturnValueOnce(
					JSON.stringify({
						id: 'wf-2',
						name: 'child',
						nodes: [],
						connections: {},
						versionId: 'v2',
						parentFolderId: null,
						isArchived: false,
					}),
				);

			mockImportService.importWorkflows.mockResolvedValue(undefined);

			await importer.import(scope, entries);

			const workflows = mockImportService.importWorkflows.mock.calls[0][0];
			const parentWf = workflows[0];
			const childWf = workflows[1];

			// The parent's executeWorkflow node should reference the child's new ID
			expect(parentWf.nodes[0].parameters.workflowId).toBe(childWf.id);
		});

		it('should not remap executeWorkflow with source=parameter', async () => {
			scope.state.subWorkflowBindings = new Map([['source-wf-2', 'target-wf-2']]);

			const entries: ManifestEntry[] = [
				{ id: 'wf-1', name: 'test', target: 'projects/billing/workflows/test' },
			];

			const workflow = {
				id: 'wf-1',
				name: 'test',
				nodes: [
					{
						id: 'node-1',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [0, 0],
						parameters: { source: 'parameter', workflowId: 'source-wf-2' },
					},
				],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				isArchived: false,
			};

			mockReader.readFile.mockReturnValue(JSON.stringify(workflow));
			mockImportService.importWorkflows.mockResolvedValue(undefined);

			await importer.import(scope, entries);

			const imported = mockImportService.importWorkflows.mock.calls[0][0][0];
			expect(imported.nodes[0].parameters.workflowId).toBe('source-wf-2');
		});
	});
});
