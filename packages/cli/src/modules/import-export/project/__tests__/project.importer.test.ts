import type { Project, User } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import type { DataTableImporter } from '../../data-table/data-table.importer';
import type { FolderImporter } from '../../folder/folder.importer';
import type { PackageReader } from '../../package-reader';
import type { VariableImporter } from '../../variable/variable.importer';
import type { WorkflowImporter } from '../../workflow/workflow.importer';
import { ProjectImporter } from '../project.importer';
import type { ManifestProjectEntry } from '../project.types';

describe('ProjectImporter', () => {
	let importer: ProjectImporter;
	let mockProjectService: MockProxy<ProjectService>;
	let mockFolderImporter: MockProxy<FolderImporter>;
	let mockWorkflowImporter: MockProxy<WorkflowImporter>;
	let mockVariableImporter: MockProxy<VariableImporter>;
	let mockDataTableImporter: MockProxy<DataTableImporter>;
	let mockReader: MockProxy<PackageReader>;
	let mockUser: MockProxy<User>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockProjectService = mock<ProjectService>();
		mockFolderImporter = mock<FolderImporter>();
		mockWorkflowImporter = mock<WorkflowImporter>();
		mockVariableImporter = mock<VariableImporter>();
		mockDataTableImporter = mock<DataTableImporter>();
		mockReader = mock<PackageReader>();
		mockUser = mock<User>();

		importer = new ProjectImporter(
			mockProjectService,
			mockFolderImporter,
			mockWorkflowImporter,
			mockVariableImporter,
			mockDataTableImporter,
		);
	});

	const makeEntry = (overrides?: Partial<ManifestProjectEntry>): ManifestProjectEntry => ({
		id: 'source-project-1',
		name: 'billing',
		target: 'projects/billing-550e84',
		folders: [],
		workflows: [],
		credentials: [],
		variables: [],
		dataTables: [],
		...overrides,
	});

	it('should create a project and return mapping', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-project-1', name: 'billing' }),
		);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		const result = await importer.import([entry], mockReader, mockUser);

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]).toEqual({
			sourceId: 'source-project-1',
			id: 'new-project-1',
			name: 'billing',
		});
	});

	it('should pass name and icon to createTeamProject', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({
				id: 'source-project-1',
				name: 'billing',
				icon: { type: 'emoji', value: '\u{1F4B0}' },
			}),
		);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		await importer.import([entry], mockReader, mockUser);

		expect(mockProjectService.createTeamProject).toHaveBeenCalledWith(mockUser, {
			name: 'billing',
			icon: { type: 'emoji', value: '\u{1F4B0}' },
		});
	});

	it('should update description separately when present', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({
				id: 'source-project-1',
				name: 'billing',
				description: 'Billing workflows',
			}),
		);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		await importer.import([entry], mockReader, mockUser);

		expect(mockProjectService.updateProject).toHaveBeenCalledWith('new-project-1', {
			description: 'Billing workflows',
		});
	});

	it('should not call updateProject when description is absent', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-project-1', name: 'billing' }),
		);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		await importer.import([entry], mockReader, mockUser);

		expect(mockProjectService.updateProject).not.toHaveBeenCalled();
	});

	it('should call entity importers in correct order', async () => {
		const entry = makeEntry({
			folders: [{ id: 'f-1', name: 'invoices', target: 'projects/billing/folders/invoices' }],
			workflows: [{ id: 'wf-1', name: 'sync', target: 'projects/billing/workflows/sync' }],
			variables: [{ id: 'v-1', name: 'API_URL', target: 'projects/billing/variables/api-url' }],
			dataTables: [
				{ id: 'dt-1', name: 'customers', target: 'projects/billing/data-tables/customers' },
			],
		});

		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-project-1', name: 'billing' }),
		);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		const callOrder: string[] = [];
		mockFolderImporter.importForProject.mockImplementation(async () => {
			callOrder.push('folders');
		});
		mockWorkflowImporter.importForProject.mockImplementation(async () => {
			callOrder.push('workflows');
		});
		mockVariableImporter.importForProject.mockImplementation(async () => {
			callOrder.push('variables');
		});
		mockDataTableImporter.importForProject.mockImplementation(async () => {
			callOrder.push('dataTables');
		});

		await importer.import([entry], mockReader, mockUser);

		expect(callOrder).toEqual(['folders', 'workflows', 'variables', 'dataTables']);
	});

	it('should import multiple projects', async () => {
		const entries = [
			makeEntry({ id: 'p-1', name: 'billing', target: 'projects/billing' }),
			makeEntry({ id: 'p-2', name: 'marketing', target: 'projects/marketing' }),
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'p-1', name: 'billing' }))
			.mockReturnValueOnce(JSON.stringify({ id: 'p-2', name: 'marketing' }));

		mockProjectService.createTeamProject
			.mockResolvedValueOnce({ id: 'new-1', name: 'billing' } as Project)
			.mockResolvedValueOnce({ id: 'new-2', name: 'marketing' } as Project);

		const result = await importer.import(entries, mockReader, mockUser);

		expect(result.projects).toHaveLength(2);
		expect(mockProjectService.createTeamProject).toHaveBeenCalledTimes(2);
	});
});
