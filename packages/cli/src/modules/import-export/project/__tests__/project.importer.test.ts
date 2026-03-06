import type { Project, ProjectRepository, User } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import type { ImportPipeline } from '../../import-pipeline';
import type { PackageReader } from '../../package-reader';
import { ProjectImporter } from '../project.importer';
import type { ManifestProjectEntry } from '../project.types';

describe('ProjectImporter', () => {
	let importer: ProjectImporter;
	let mockProjectService: MockProxy<ProjectService>;
	let mockProjectRepository: MockProxy<ProjectRepository>;
	let mockImportPipeline: MockProxy<ImportPipeline>;
	let mockReader: MockProxy<PackageReader>;
	let mockUser: MockProxy<User>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockProjectService = mock<ProjectService>();
		mockProjectRepository = mock<ProjectRepository>();
		mockImportPipeline = mock<ImportPipeline>();
		mockReader = mock<PackageReader>();
		mockUser = mock<User>();

		importer = new ProjectImporter(mockProjectService, mockProjectRepository, mockImportPipeline);
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

	it('should create a project when no existing project matches', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-project-1', name: 'billing' }),
		);
		mockProjectRepository.findOne.mockResolvedValue(null);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		const result = await importer.import(entry, mockReader, mockUser);

		expect(mockProjectService.createTeamProject).toHaveBeenCalledWith(mockUser, {
			name: 'billing',
			icon: undefined,
		});
		expect(result).toEqual({
			sourceId: 'source-project-1',
			id: 'new-project-1',
			name: 'billing',
		});
	});

	it('should reuse an existing project with the same name', async () => {
		const entry = makeEntry();
		const existingProject = { id: 'existing-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({
				id: 'source-project-1',
				name: 'billing',
				icon: { type: 'emoji', value: '\u{1F4B0}' },
				description: 'Billing workflows',
			}),
		);
		mockProjectRepository.findOne.mockResolvedValue(existingProject);

		const result = await importer.import(entry, mockReader, mockUser);

		expect(mockProjectService.createTeamProject).not.toHaveBeenCalled();
		expect(mockProjectService.updateProject).toHaveBeenCalledWith('existing-project-1', {
			name: 'billing',
			icon: { type: 'emoji', value: '\u{1F4B0}' },
			description: 'Billing workflows',
		});
		expect(result).toEqual({
			sourceId: 'source-project-1',
			id: 'existing-project-1',
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
		mockProjectRepository.findOne.mockResolvedValue(null);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		await importer.import(entry, mockReader, mockUser);

		expect(mockProjectService.createTeamProject).toHaveBeenCalledWith(mockUser, {
			name: 'billing',
			icon: { type: 'emoji', value: '\u{1F4B0}' },
		});
	});

	it('should update description separately when creating and description present', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({
				id: 'source-project-1',
				name: 'billing',
				description: 'Billing workflows',
			}),
		);
		mockProjectRepository.findOne.mockResolvedValue(null);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		await importer.import(entry, mockReader, mockUser);

		expect(mockProjectService.updateProject).toHaveBeenCalledWith('new-project-1', {
			description: 'Billing workflows',
		});
	});

	it('should not call updateProject when creating and description is absent', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-project-1', name: 'billing' }),
		);
		mockProjectRepository.findOne.mockResolvedValue(null);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		await importer.import(entry, mockReader, mockUser);

		expect(mockProjectService.updateProject).not.toHaveBeenCalled();
	});

	it('should run the import pipeline with entity entries', async () => {
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
		mockProjectRepository.findOne.mockResolvedValue(null);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		await importer.import(entry, mockReader, mockUser);

		expect(mockImportPipeline.importEntities).toHaveBeenCalledWith(
			expect.objectContaining({
				user: mockUser,
				targetProjectId: 'new-project-1',
			}),
			{
				folders: entry.folders,
				workflows: entry.workflows,
				credentials: entry.credentials,
				variables: entry.variables,
				dataTables: entry.dataTables,
			},
			undefined,
		);
	});

	it('should pass resolved bindings to import scope', async () => {
		const entry = makeEntry();
		const createdProject = { id: 'new-project-1', name: 'billing' } as Project;

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-project-1', name: 'billing' }),
		);
		mockProjectRepository.findOne.mockResolvedValue(null);
		mockProjectService.createTeamProject.mockResolvedValue(createdProject);

		const resolvedBindings = {
			credentialBindings: new Map([['src-cred', 'tgt-cred']]),
			subWorkflowBindings: new Map([['src-wf', 'tgt-wf']]),
		};

		await importer.import(entry, mockReader, mockUser, resolvedBindings);

		expect(mockImportPipeline.importEntities).toHaveBeenCalledWith(
			expect.objectContaining({
				state: expect.objectContaining({
					credentialBindings: resolvedBindings.credentialBindings,
					subWorkflowBindings: resolvedBindings.subWorkflowBindings,
				}),
			}),
			expect.any(Object),
			undefined,
		);
	});
});
