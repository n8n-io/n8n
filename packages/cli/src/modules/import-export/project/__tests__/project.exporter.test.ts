import type { Project, ProjectRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { ExportPipeline, ExportPipelineResult } from '../../export-pipeline';
import type { PackageWriter } from '../../package-writer';
import { ProjectExporter } from '../project.exporter';
import type { ProjectSerializer } from '../project.serializer';

describe('ProjectExporter', () => {
	let exporter: ProjectExporter;
	let mockProjectRepository: MockProxy<ProjectRepository>;
	let mockSerializer: MockProxy<ProjectSerializer>;
	let mockExportPipeline: MockProxy<ExportPipeline>;
	let mockWriter: MockProxy<PackageWriter>;

	const emptyPipelineResult: ExportPipelineResult = {
		folders: [],
		workflows: [],
		credentials: [],
		variables: [],
		dataTables: [],
		requirements: { credentials: [], subWorkflows: [], nodeTypes: [], variables: [] },
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockProjectRepository = mock<ProjectRepository>();
		mockSerializer = mock<ProjectSerializer>();
		mockExportPipeline = mock<ExportPipeline>();
		mockWriter = mock<PackageWriter>();

		mockExportPipeline.run.mockResolvedValue(emptyPipelineResult);

		exporter = new ProjectExporter(mockProjectRepository, mockSerializer, mockExportPipeline);
	});

	it('should export a team project', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		mockProjectRepository.findOneByOrFail.mockResolvedValue(project);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });

		const result = await exporter.export(project.id, mockWriter);

		expect(result.entry.id).toBe(project.id);
		expect(result.entry.name).toBe('billing');
		expect(result.entry.target).toMatch(/^projects\/billing-550e84$/);

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith('projects/billing-550e84');
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/project.json',
			expect.any(String),
		);
	});

	it('should throw BadRequestError for personal projects', async () => {
		const project = {
			id: 'personal-1',
			name: 'Personal',
			type: 'personal',
		} as Project;

		mockProjectRepository.findOneByOrFail.mockResolvedValue(project);

		await expect(exporter.export('personal-1', mockWriter)).rejects.toThrow(BadRequestError);
	});

	it('should serialize project data as JSON in the written file', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const serialized = { id: project.id, name: 'billing', description: 'A billing project' };
		mockProjectRepository.findOneByOrFail.mockResolvedValue(project);
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.export(project.id, mockWriter);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should run the export pipeline with correct scope', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		mockProjectRepository.findOneByOrFail.mockResolvedValue(project);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });

		await exporter.export(project.id, mockWriter);

		expect(mockExportPipeline.run).toHaveBeenCalledWith(
			expect.objectContaining({
				basePath: 'projects/billing-550e84',
				projectId: project.id,
				writer: mockWriter,
			}),
		);
	});

	it('should include entity entries from pipeline in manifest', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const folderEntries = [
			{ id: 'folder-1', name: 'invoices', target: 'projects/billing-550e84/folders/invoices' },
		];
		const workflowEntries = [
			{ id: 'wf-1', name: 'sync', target: 'projects/billing-550e84/workflows/sync' },
		];

		mockProjectRepository.findOneByOrFail.mockResolvedValue(project);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });
		mockExportPipeline.run.mockResolvedValue({
			...emptyPipelineResult,
			folders: folderEntries,
			workflows: workflowEntries,
		});

		const result = await exporter.export(project.id, mockWriter);

		expect(result.entry.folders).toEqual(folderEntries);
		expect(result.entry.workflows).toEqual(workflowEntries);
	});

	it('should return requirements from pipeline', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		mockProjectRepository.findOneByOrFail.mockResolvedValue(project);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });
		mockExportPipeline.run.mockResolvedValue({
			...emptyPipelineResult,
			requirements: {
				credentials: [{ id: 'c1', name: 'Slack', type: 'slackApi', usedByWorkflows: ['wf-1'] }],
				subWorkflows: [],
				nodeTypes: [],
				variables: [],
			},
		});

		const result = await exporter.export(project.id, mockWriter);

		expect(result.requirements.credentials).toHaveLength(1);
		expect(result.requirements.credentials[0].id).toBe('c1');
	});
});
