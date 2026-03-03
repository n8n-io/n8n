import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ImportService } from '@/services/import.service';

import type { ProjectImportContext } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { WorkflowImporter } from '../workflow.importer';
import type { ManifestWorkflowEntry } from '../workflow.types';

describe('WorkflowImporter', () => {
	let importer: WorkflowImporter;
	let mockImportService: MockProxy<ImportService>;
	let mockReader: MockProxy<PackageReader>;
	let ctx: ProjectImportContext;

	beforeEach(() => {
		jest.clearAllMocks();

		mockImportService = mock<ImportService>();
		mockReader = mock<PackageReader>();

		importer = new WorkflowImporter(mockImportService);

		ctx = {
			user: mock(),
			projectId: 'new-project-1',
			projectEntry: mock(),
			folderIdMap: new Map(),
			reader: mockReader,
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.importForProject(ctx, []);

		expect(mockImportService.importWorkflows).not.toHaveBeenCalled();
	});

	it('should import workflows with remapped folder IDs', async () => {
		ctx.folderIdMap.set('source-folder-1', 'new-folder-1');

		const entries: ManifestWorkflowEntry[] = [
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

		await importer.importForProject(ctx, entries);

		expect(mockImportService.importWorkflows).toHaveBeenCalledWith(
			[{ ...workflow, parentFolderId: 'new-folder-1' }],
			'new-project-1',
		);
	});

	it('should set parentFolderId to null when folder is not in map', async () => {
		const entries: ManifestWorkflowEntry[] = [
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

		await importer.importForProject(ctx, entries);

		expect(mockImportService.importWorkflows).toHaveBeenCalledWith(
			[expect.objectContaining({ parentFolderId: null })],
			'new-project-1',
		);
	});

	it('should preserve null parentFolderId for root workflows', async () => {
		const entries: ManifestWorkflowEntry[] = [
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

		await importer.importForProject(ctx, entries);

		expect(mockImportService.importWorkflows).toHaveBeenCalledWith(
			[expect.objectContaining({ parentFolderId: null })],
			'new-project-1',
		);
	});

	it('should import multiple workflows in a single call', async () => {
		const entries: ManifestWorkflowEntry[] = [
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

		await importer.importForProject(ctx, entries);

		expect(mockImportService.importWorkflows).toHaveBeenCalledTimes(1);
		const workflows = mockImportService.importWorkflows.mock.calls[0][0];
		expect(workflows).toHaveLength(2);
	});
});
