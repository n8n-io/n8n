import type { Project, ProjectRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { CredentialExporter } from '../../credential/credential.exporter';
import type { DataTableExporter } from '../../data-table/data-table.exporter';
import type { FolderExporter } from '../../folder/folder.exporter';
import type { ExportContext, ProjectExportContext } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import type { VariableExporter } from '../../variable/variable.exporter';
import type { WorkflowExporter } from '../../workflow/workflow.exporter';
import { ProjectExporter } from '../project.exporter';
import type { ProjectSerializer } from '../project.serializer';

describe('ProjectExporter', () => {
	let exporter: ProjectExporter;
	let mockProjectRepository: MockProxy<ProjectRepository>;
	let mockSerializer: MockProxy<ProjectSerializer>;
	let mockFolderExporter: MockProxy<FolderExporter>;
	let mockWorkflowExporter: MockProxy<WorkflowExporter>;
	let mockCredentialExporter: MockProxy<CredentialExporter>;
	let mockVariableExporter: MockProxy<VariableExporter>;
	let mockDataTableExporter: MockProxy<DataTableExporter>;
	let mockWriter: MockProxy<PackageWriter>;
	let context: ExportContext;

	beforeEach(() => {
		jest.clearAllMocks();

		mockProjectRepository = mock<ProjectRepository>();
		mockSerializer = mock<ProjectSerializer>();
		mockFolderExporter = mock<FolderExporter>();
		mockWorkflowExporter = mock<WorkflowExporter>();
		mockCredentialExporter = mock<CredentialExporter>();
		mockVariableExporter = mock<VariableExporter>();
		mockDataTableExporter = mock<DataTableExporter>();
		mockWriter = mock<PackageWriter>();

		mockFolderExporter.exportForProject.mockResolvedValue([]);
		mockWorkflowExporter.exportForProject.mockResolvedValue([]);
		mockCredentialExporter.exportForProject.mockResolvedValue([]);
		mockVariableExporter.exportForProject.mockResolvedValue([]);
		mockDataTableExporter.exportForProject.mockResolvedValue([]);

		exporter = new ProjectExporter(
			mockProjectRepository,
			mockSerializer,
			mockFolderExporter,
			mockWorkflowExporter,
			mockCredentialExporter,
			mockVariableExporter,
			mockDataTableExporter,
		);

		context = {
			user: mock(),
			projectIds: ['project-1'],
		};
	});

	it('should have key "projects"', () => {
		expect(exporter.key).toBe('projects');
	});

	it('should export a team project', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });

		const entries = await exporter.export(context, mockWriter);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe(project.id);
		expect(entries[0].name).toBe('billing');
		expect(entries[0].target).toMatch(/^projects\/billing-550e84$/);

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

		mockProjectRepository.find.mockResolvedValue([project]);

		await expect(exporter.export(context, mockWriter)).rejects.toThrow(BadRequestError);
	});

	it('should export multiple projects', async () => {
		const projects = [
			{ id: 'aaaaaa-1111', name: 'billing', type: 'team' } as Project,
			{ id: 'bbbbbb-2222', name: 'marketing', type: 'team' } as Project,
		];

		context.projectIds = ['aaaaaa-1111', 'bbbbbb-2222'];
		mockProjectRepository.find.mockResolvedValue(projects);
		mockSerializer.serialize
			.mockReturnValueOnce({ id: projects[0].id, name: projects[0].name })
			.mockReturnValueOnce({ id: projects[1].id, name: projects[1].name });

		const entries = await exporter.export(context, mockWriter);

		expect(entries).toHaveLength(2);
		expect(mockWriter.writeDirectory).toHaveBeenCalledTimes(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});

	it('should serialize project data as JSON in the written file', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const serialized = { id: project.id, name: 'billing', description: 'A billing project' };
		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.export(context, mockWriter);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should pass ProjectExportContext to sub-exporters', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });

		await exporter.export(context, mockWriter);

		const expectedCtx: ProjectExportContext = {
			projectId: project.id,
			projectTarget: 'projects/billing-550e84',
			folderPathMap: new Map(),
			writer: mockWriter,
		};

		expect(mockFolderExporter.exportForProject).toHaveBeenCalledWith(expectedCtx);
		expect(mockWorkflowExporter.exportForProject).toHaveBeenCalledWith(expectedCtx);
		expect(mockCredentialExporter.exportForProject).toHaveBeenCalledWith(expectedCtx);
		expect(mockVariableExporter.exportForProject).toHaveBeenCalledWith(expectedCtx);
		expect(mockDataTableExporter.exportForProject).toHaveBeenCalledWith(expectedCtx);
	});

	it('should attach folder entries from FolderExporter to manifest', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const folderEntries = [
			{
				id: 'folder-1',
				name: 'invoices',
				target: 'projects/billing-550e84/folders/invoices-folder',
			},
		];

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });
		mockFolderExporter.exportForProject.mockResolvedValue(folderEntries);

		const entries = await exporter.export(context, mockWriter);

		expect(entries[0].folders).toEqual(folderEntries);
	});

	it('should attach workflow entries from WorkflowExporter to manifest', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const workflowEntries = [
			{
				id: 'wf-1',
				name: 'daily-sync',
				target: 'projects/billing-550e84/workflows/daily-sync-wf1',
			},
		];

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });
		mockWorkflowExporter.exportForProject.mockResolvedValue(workflowEntries);

		const entries = await exporter.export(context, mockWriter);

		expect(entries[0].workflows).toEqual(workflowEntries);
	});

	it('should attach credential entries from CredentialExporter to manifest', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const credentialEntries = [
			{
				id: 'cred-1',
				name: 'Slack Token',
				target: 'projects/billing-550e84/credentials/slack-token-cred-1',
			},
		];

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });
		mockCredentialExporter.exportForProject.mockResolvedValue(credentialEntries);

		const entries = await exporter.export(context, mockWriter);

		expect(entries[0].credentials).toEqual(credentialEntries);
	});

	it('should attach variable entries from VariableExporter to manifest', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const variableEntries = [
			{
				id: 'var-1',
				name: 'API_URL',
				target: 'projects/billing-550e84/variables/api-url-var-1',
			},
		];

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });
		mockVariableExporter.exportForProject.mockResolvedValue(variableEntries);

		const entries = await exporter.export(context, mockWriter);

		expect(entries[0].variables).toEqual(variableEntries);
	});

	it('should attach dataTable entries from DataTableExporter to manifest', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const dataTableEntries = [
			{
				id: 'dt-1',
				name: 'customers',
				target: 'projects/billing-550e84/data-tables/customers-dt-1',
			},
		];

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });
		mockDataTableExporter.exportForProject.mockResolvedValue(dataTableEntries);

		const entries = await exporter.export(context, mockWriter);

		expect(entries[0].dataTables).toEqual(dataTableEntries);
	});
});
