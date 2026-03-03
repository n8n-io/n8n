import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ProjectExportContext } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import { WorkflowExporter } from '../workflow.exporter';
import type { WorkflowSerializer } from '../workflow.serializer';

describe('WorkflowExporter', () => {
	let exporter: WorkflowExporter;
	let mockWorkflowRepository: MockProxy<WorkflowRepository>;
	let mockSerializer: MockProxy<WorkflowSerializer>;
	let mockWriter: MockProxy<PackageWriter>;
	let ctx: ProjectExportContext;

	const projectTarget = 'projects/billing-550e84';

	beforeEach(() => {
		jest.clearAllMocks();

		mockWorkflowRepository = mock<WorkflowRepository>();
		mockSerializer = mock<WorkflowSerializer>();
		mockWriter = mock<PackageWriter>();

		exporter = new WorkflowExporter(mockWorkflowRepository, mockSerializer);

		ctx = {
			projectId: 'project-1',
			projectTarget,
			folderPathMap: new Map(),
			writer: mockWriter,
		};
	});

	it('should return empty array when project has no workflows', async () => {
		mockWorkflowRepository.find.mockResolvedValue([]);

		const entries = await exporter.exportForProject(ctx);

		expect(entries).toEqual([]);
		expect(mockWriter.writeDirectory).not.toHaveBeenCalled();
		expect(mockWriter.writeFile).not.toHaveBeenCalled();
	});

	it('should export a root-level workflow', async () => {
		const workflow = {
			id: 'abc12300-0000-0000-0000-000000000000',
			name: 'daily-sync',
			parentFolder: null,
		} as WorkflowEntity;

		mockWorkflowRepository.find.mockResolvedValue([workflow]);
		mockSerializer.serialize.mockReturnValue({
			id: workflow.id,
			name: workflow.name,
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: null,
			isArchived: false,
		});

		const entries = await exporter.exportForProject(ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe(workflow.id);
		expect(entries[0].name).toBe('daily-sync');
		expect(entries[0].target).toBe('projects/billing-550e84/workflows/daily-sync-abc123');

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith(
			'projects/billing-550e84/workflows/daily-sync-abc123',
		);
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/workflows/daily-sync-abc123/workflow.json',
			expect.any(String),
		);
	});

	it('should export a workflow inside a folder', async () => {
		const workflow = {
			id: 'def45600-0000-0000-0000-000000000000',
			name: 'invoice-gen',
			parentFolder: { id: 'folder-1' },
		} as unknown as WorkflowEntity;

		ctx.folderPathMap.set('folder-1', 'projects/billing-550e84/folders/invoices-folder1');

		mockWorkflowRepository.find.mockResolvedValue([workflow]);
		mockSerializer.serialize.mockReturnValue({
			id: workflow.id,
			name: workflow.name,
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: 'folder-1',
			isArchived: false,
		});

		const entries = await exporter.exportForProject(ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].target).toBe(
			'projects/billing-550e84/folders/invoices-folder1/workflows/invoice-gen-def456',
		);
	});

	it('should fall back to project root when folder is not in path map', async () => {
		const workflow = {
			id: 'abc12300-0000-0000-0000-000000000000',
			name: 'orphaned-workflow',
			parentFolder: { id: 'unknown-folder' },
		} as unknown as WorkflowEntity;

		mockWorkflowRepository.find.mockResolvedValue([workflow]);
		mockSerializer.serialize.mockReturnValue({
			id: workflow.id,
			name: workflow.name,
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: 'unknown-folder',
			isArchived: false,
		});

		const entries = await exporter.exportForProject(ctx);

		expect(entries[0].target).toBe('projects/billing-550e84/workflows/orphaned-workflow-abc123');
	});

	it('should export multiple workflows', async () => {
		const workflows = [
			{
				id: 'aaa11100-0000-0000-0000-000000000000',
				name: 'workflow-a',
				parentFolder: null,
			},
			{
				id: 'bbb22200-0000-0000-0000-000000000000',
				name: 'workflow-b',
				parentFolder: null,
			},
		] as WorkflowEntity[];

		mockWorkflowRepository.find.mockResolvedValue(workflows);
		mockSerializer.serialize
			.mockReturnValueOnce({
				id: workflows[0].id,
				name: workflows[0].name,
				nodes: [],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				isArchived: false,
			})
			.mockReturnValueOnce({
				id: workflows[1].id,
				name: workflows[1].name,
				nodes: [],
				connections: {},
				versionId: 'v2',
				parentFolderId: null,
				isArchived: false,
			});

		const entries = await exporter.exportForProject(ctx);

		expect(entries).toHaveLength(2);
		expect(mockWriter.writeDirectory).toHaveBeenCalledTimes(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});

	it('should serialize workflow data as JSON in the written file', async () => {
		const workflow = {
			id: 'abc12300-0000-0000-0000-000000000000',
			name: 'daily-sync',
			parentFolder: null,
		} as WorkflowEntity;

		const serialized = {
			id: workflow.id,
			name: workflow.name,
			nodes: [],
			connections: {},
			versionId: 'v1',
			parentFolderId: null,
			isArchived: false,
		};

		mockWorkflowRepository.find.mockResolvedValue([workflow]);
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.exportForProject(ctx);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should query workflows by project id with parentFolder relation', async () => {
		mockWorkflowRepository.find.mockResolvedValue([]);

		await exporter.exportForProject(ctx);

		expect(mockWorkflowRepository.find).toHaveBeenCalledWith({
			where: { shared: { projectId: 'project-1' } },
			relations: ['parentFolder'],
		});
	});
});
