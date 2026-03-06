import type { Project, SharedCredentialsRepository, User, VariablesRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { Readable } from 'node:stream';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { ProjectService } from '@/services/project.service.ee';

import type { BindingResolver } from '../binding-resolver';
import type { ExportPipeline } from '../export-pipeline';
import type { ImportPipeline } from '../import-pipeline';
import type { ProjectExporter, ProjectExportResult } from '../project/project.exporter';
import type { ProjectImporter } from '../project/project.importer';
import { ImportExportService } from '../import-export.service';
import type {
	ImportRequest,
	ManifestProjectEntry,
	PackageRequirements,
} from '../import-export.types';

// Mock the TarPackageWriter and constants
jest.mock('../tar-package-writer', () => ({
	TarPackageWriter: jest.fn().mockImplementation(() => ({
		writeFile: jest.fn(),
		writeDirectory: jest.fn(),
		finalize: jest.fn().mockReturnValue(
			new Readable({
				read() {
					this.push(null);
				},
			}),
		),
	})),
}));

jest.mock('../tar-package-reader', () => ({
	TarPackageReader: {
		fromBuffer: jest.fn(),
	},
}));

jest.mock('@/constants', () => ({
	N8N_VERSION: '2.10.0',
}));

describe('ImportExportService', () => {
	let service: ImportExportService;
	let mockProjectService: MockProxy<ProjectService>;
	let mockProjectExporter: MockProxy<ProjectExporter>;
	let mockProjectImporter: MockProxy<ProjectImporter>;
	let mockExportPipeline: MockProxy<ExportPipeline>;
	let mockImportPipeline: MockProxy<ImportPipeline>;
	let mockInstanceSettings: MockProxy<InstanceSettings>;
	let mockLoadNodesAndCredentials: MockProxy<LoadNodesAndCredentials>;
	let mockBindingResolver: MockProxy<BindingResolver>;
	let mockSharedCredentialsRepository: MockProxy<SharedCredentialsRepository>;
	let mockVariablesRepository: MockProxy<VariablesRepository>;
	let mockUser: MockProxy<User>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockProjectService = mock<ProjectService>();
		mockProjectExporter = mock<ProjectExporter>();
		mockProjectImporter = mock<ProjectImporter>();
		mockExportPipeline = mock<ExportPipeline>();
		mockImportPipeline = mock<ImportPipeline>();
		mockInstanceSettings = mock<InstanceSettings>({ instanceId: 'test-instance-id' });
		mockLoadNodesAndCredentials = mock<LoadNodesAndCredentials>();
		mockBindingResolver = mock<BindingResolver>();
		mockSharedCredentialsRepository = mock<SharedCredentialsRepository>();
		mockVariablesRepository = mock<VariablesRepository>();
		mockUser = mock<User>();

		// By default, recognize all node types (built-in)
		mockLoadNodesAndCredentials.recognizesNode.mockReturnValue(true);

		// By default, binding resolver returns empty bindings
		mockBindingResolver.resolve.mockResolvedValue({
			credentialBindings: new Map(),
			subWorkflowBindings: new Map(),
		});

		service = new ImportExportService(
			mockProjectService,
			mockProjectExporter,
			mockProjectImporter,
			mockExportPipeline,
			mockImportPipeline,
			mockInstanceSettings,
			mockLoadNodesAndCredentials,
			mockBindingResolver,
			mockSharedCredentialsRepository,
			mockVariablesRepository,
		);
	});

	describe('exportPackage', () => {
		const emptyExportResult: ProjectExportResult = {
			entry: {
				id: 'p',
				name: 'p',
				target: 'projects/p',
				folders: [],
				workflows: [],
				credentials: [],
				variables: [],
				dataTables: [],
			},
			requirements: { credentials: [], subWorkflows: [], nodeTypes: [], variables: [] },
		};

		it('should validate permissions for all projects', async () => {
			const project1 = mock<Project>();
			const project2 = mock<Project>();

			mockProjectService.getProjectWithScope
				.mockResolvedValueOnce(project1)
				.mockResolvedValueOnce(project2);

			mockProjectExporter.export.mockResolvedValue(emptyExportResult);

			await service.exportPackage({
				type: 'projects',
				user: mockUser,
				projectIds: ['project-1', 'project-2'],
			});

			expect(mockProjectService.getProjectWithScope).toHaveBeenCalledTimes(2);
			expect(mockProjectService.getProjectWithScope).toHaveBeenCalledWith(mockUser, 'project-1', [
				'project:read',
			]);
			expect(mockProjectService.getProjectWithScope).toHaveBeenCalledWith(mockUser, 'project-2', [
				'project:read',
			]);
		});

		it('should throw NotFoundError when user lacks access to a project', async () => {
			mockProjectService.getProjectWithScope.mockResolvedValue(null);

			await expect(
				service.exportPackage({
					type: 'projects',
					user: mockUser,
					projectIds: ['missing-project'],
				}),
			).rejects.toThrow('not found or you do not have access');
		});

		it('should return a readable stream', async () => {
			mockProjectService.getProjectWithScope.mockResolvedValue(mock<Project>());
			mockProjectExporter.export.mockResolvedValue(emptyExportResult);

			const result = await service.exportPackage({
				type: 'projects',
				user: mockUser,
				projectIds: ['project-1'],
			});

			expect(result).toBeInstanceOf(Readable);
		});

		it('should run the project exporter and write the manifest with requirements', async () => {
			const requirements: PackageRequirements = {
				credentials: [{ id: 'c1', name: 'Slack', type: 'slackApi', usedByWorkflows: ['wf-1'] }],
				subWorkflows: [],
				nodeTypes: [],
				variables: [],
			};

			const projectEntry = {
				id: 'project-1',
				name: 'billing',
				target: 'projects/billing-projec',
				folders: [],
				workflows: [],
				credentials: [],
				variables: [],
				dataTables: [],
			} as ManifestProjectEntry;

			mockProjectService.getProjectWithScope.mockResolvedValue(mock<Project>());
			mockProjectExporter.export.mockResolvedValue({ entry: projectEntry, requirements });

			await service.exportPackage({
				type: 'projects',
				user: mockUser,
				projectIds: ['project-1'],
			});

			expect(mockProjectExporter.export).toHaveBeenCalledTimes(1);

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageWriter } = jest.requireMock('../tar-package-writer') as {
				TarPackageWriter: jest.Mock;
			};
			const writerInstance = TarPackageWriter.mock.results[0].value;
			expect(writerInstance.writeFile).toHaveBeenCalledWith(
				'manifest.json',
				expect.stringContaining('"packageFormatVersion"'),
			);

			const manifestJson = JSON.parse(String(writerInstance.writeFile.mock.calls[0][1]));
			expect(manifestJson).toMatchObject({
				packageFormatVersion: '1',
				sourceN8nVersion: '2.10.0',
				sourceId: 'test-instance-id',
				projects: [projectEntry],
				requirements,
			});
			expect(manifestJson.exportedAt).toBeDefined();
		});

		it('should export standalone workflows via pipeline', async () => {
			mockExportPipeline.run.mockResolvedValue({
				folders: [],
				workflows: [{ id: 'wf-1', name: 'sync', target: './workflows/sync-wf1' }],
				credentials: [],
				variables: [],
				dataTables: [],
				requirements: { credentials: [], subWorkflows: [], nodeTypes: [], variables: [] },
			});

			const result = await service.exportPackage({
				type: 'workflows',
				user: mockUser,
				workflowIds: ['wf-1'],
			});

			expect(result).toBeInstanceOf(Readable);
			expect(mockExportPipeline.run).toHaveBeenCalledWith(
				expect.objectContaining({
					basePath: '.',
					workflowIds: ['wf-1'],
				}),
			);
		});

		it('should export folders via pipeline with folders and workflows in manifest', async () => {
			const folders = [{ id: 'f-1', name: 'invoices', target: './folders/invoices-f1' }];
			const workflows = [
				{ id: 'wf-1', name: 'sync', target: './folders/invoices-f1/workflows/sync-wf1' },
			];
			const requirements = { credentials: [], subWorkflows: [], nodeTypes: [], variables: [] };

			mockExportPipeline.run.mockResolvedValue({
				folders,
				workflows,
				credentials: [],
				variables: [],
				dataTables: [],
				requirements,
			});

			const result = await service.exportPackage({
				type: 'folders',
				user: mockUser,
				folderIds: ['f-1'],
			});

			expect(result).toBeInstanceOf(Readable);
			expect(mockExportPipeline.run).toHaveBeenCalledWith(
				expect.objectContaining({
					basePath: '.',
					folderIds: ['f-1'],
				}),
			);

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageWriter } = jest.requireMock('../tar-package-writer') as {
				TarPackageWriter: jest.Mock;
			};
			const writerInstance = TarPackageWriter.mock.results[0].value;
			const manifestJson = JSON.parse(String(writerInstance.writeFile.mock.calls[0][1]));

			expect(manifestJson.folders).toEqual(folders);
			expect(manifestJson.workflows).toEqual(workflows);
			expect(manifestJson.requirements).toEqual(requirements);
			expect(manifestJson.projects).toBeUndefined();
		});
	});

	describe('analyzePackage', () => {
		it('should return summary and requirements from manifest', async () => {
			const manifest = {
				packageFormatVersion: '1',
				exportedAt: '2024-01-01T00:00:00.000Z',
				sourceN8nVersion: '2.10.0',
				sourceId: 'source-instance',
				projects: [
					{
						id: 'p-1',
						name: 'billing',
						target: 'projects/billing',
						folders: [{ id: 'f-1', name: 'invoices', target: 'x' }],
						workflows: [
							{ id: 'wf-1', name: 'sync', target: 'x' },
							{ id: 'wf-2', name: 'notify', target: 'x' },
						],
						credentials: [{ id: 'c-1', name: 'slack', target: 'x' }],
						variables: [],
						dataTables: [],
					},
				],
				requirements: {
					credentials: [
						{ id: 'ext-c1', name: 'External', type: 'httpApi', usedByWorkflows: ['wf-1'] },
					],
					subWorkflows: [],
					nodeTypes: [
						{ type: 'n8n-nodes-base.slack', typeVersion: 1, usedByWorkflows: ['wf-1'] },
						{ type: 'community-nodes.customNode', typeVersion: 1, usedByWorkflows: ['wf-1'] },
					],
				},
			};

			// n8n-nodes-base.slack is installed, community-nodes.customNode is not
			mockLoadNodesAndCredentials.recognizesNode.mockImplementation(
				(type: string) => type === 'n8n-nodes-base.slack',
			);

			const mockReader = {
				readFile: jest.fn().mockReturnValue(JSON.stringify(manifest)),
				hasFile: jest.fn(),
			};

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageReader } = jest.requireMock('../tar-package-reader') as {
				TarPackageReader: { fromBuffer: jest.Mock };
			};
			TarPackageReader.fromBuffer.mockResolvedValue(mockReader);

			const result = await service.analyzePackage(Buffer.from('fake'));

			expect(result.packageFormatVersion).toBe('1');
			expect(result.summary).toEqual({
				projects: 1,
				workflows: 2,
				credentials: 1,
				variables: 0,
				dataTables: 0,
				folders: 1,
			});
			expect(result.requirements.credentials).toHaveLength(1);
			// Only the unrecognized community node should remain
			expect(result.requirements.nodeTypes).toHaveLength(1);
			expect(result.requirements.nodeTypes[0].type).toBe('community-nodes.customNode');
		});

		it('should filter out all installed node types from requirements', async () => {
			const manifest = {
				packageFormatVersion: '1',
				exportedAt: '2024-01-01T00:00:00.000Z',
				sourceN8nVersion: '2.10.0',
				sourceId: 'source-instance',
				projects: [],
				requirements: {
					credentials: [],
					subWorkflows: [],
					nodeTypes: [
						{ type: 'n8n-nodes-base.slack', typeVersion: 1, usedByWorkflows: ['wf-1'] },
						{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4, usedByWorkflows: ['wf-1'] },
					],
				},
			};

			// All node types are installed
			mockLoadNodesAndCredentials.recognizesNode.mockReturnValue(true);

			const mockReader = {
				readFile: jest.fn().mockReturnValue(JSON.stringify(manifest)),
				hasFile: jest.fn(),
			};

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageReader } = jest.requireMock('../tar-package-reader') as {
				TarPackageReader: { fromBuffer: jest.Mock };
			};
			TarPackageReader.fromBuffer.mockResolvedValue(mockReader);

			const result = await service.analyzePackage(Buffer.from('fake'));

			expect(result.requirements.nodeTypes).toHaveLength(0);
		});

		it('should return empty requirements for packages without them', async () => {
			const manifest = {
				packageFormatVersion: '1',
				exportedAt: '2024-01-01T00:00:00.000Z',
				sourceN8nVersion: '2.10.0',
				sourceId: 'source-instance',
				workflows: [{ id: 'wf-1', name: 'sync', target: 'x' }],
			};

			const mockReader = {
				readFile: jest.fn().mockReturnValue(JSON.stringify(manifest)),
				hasFile: jest.fn(),
			};

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageReader } = jest.requireMock('../tar-package-reader') as {
				TarPackageReader: { fromBuffer: jest.Mock };
			};
			TarPackageReader.fromBuffer.mockResolvedValue(mockReader);

			const result = await service.analyzePackage(Buffer.from('fake'));

			expect(result.requirements).toEqual({
				credentials: [],
				subWorkflows: [],
				nodeTypes: [],
				variables: [],
			});
		});

		it('should throw BadRequestError for unsupported format version', async () => {
			const manifest = {
				packageFormatVersion: '999',
				exportedAt: '2024-01-01T00:00:00.000Z',
				sourceN8nVersion: '2.10.0',
				sourceId: 'source-instance',
			};

			const mockReader = {
				readFile: jest.fn().mockReturnValue(JSON.stringify(manifest)),
				hasFile: jest.fn(),
			};

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageReader } = jest.requireMock('../tar-package-reader') as {
				TarPackageReader: { fromBuffer: jest.Mock };
			};
			TarPackageReader.fromBuffer.mockResolvedValue(mockReader);

			await expect(service.analyzePackage(Buffer.from('fake'))).rejects.toThrow(
				'Unsupported package format version',
			);
		});
	});

	describe('importPackage', () => {
		it('should parse manifest and delegate to import pipeline for standalone import', async () => {
			const manifest = {
				packageFormatVersion: '1',
				exportedAt: '2024-01-01T00:00:00.000Z',
				sourceN8nVersion: '2.10.0',
				sourceId: 'source-instance',
				workflows: [{ id: 'wf-1', name: 'sync', target: './workflows/sync' }],
			};

			const mockReader = {
				readFile: jest.fn().mockReturnValue(JSON.stringify(manifest)),
				hasFile: jest.fn().mockReturnValue(false),
			};

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageReader } = jest.requireMock('../tar-package-reader') as {
				TarPackageReader: { fromBuffer: jest.Mock };
			};
			TarPackageReader.fromBuffer.mockResolvedValue(mockReader);

			mockProjectService.getPersonalProject.mockResolvedValue({ id: 'personal-proj' } as never);

			const request: ImportRequest = {
				user: mockUser,
				mode: 'auto',
				createCredentialStubs: false,
				withVariableValues: true,
				overwriteVariableValues: false,
			};

			const result = await service.importPackage(Buffer.from('fake'), request);

			expect(TarPackageReader.fromBuffer).toHaveBeenCalledWith(Buffer.from('fake'));
			expect(mockImportPipeline.importEntities).toHaveBeenCalledWith(
				expect.objectContaining({
					user: mockUser,
					targetProjectId: 'personal-proj',
				}),
				expect.objectContaining({
					workflows: manifest.workflows,
				}),
				expect.objectContaining({
					createCredentialStubs: false,
				}),
			);
			expect(result).toMatchObject({ projects: [], workflows: 1 });
		});

		it('should throw BadRequestError for unsupported format version', async () => {
			const manifest = {
				packageFormatVersion: '999',
				exportedAt: '2024-01-01T00:00:00.000Z',
				sourceN8nVersion: '2.10.0',
				sourceId: 'source-instance',
				projects: [],
			};

			const mockReader = {
				readFile: jest.fn().mockReturnValue(JSON.stringify(manifest)),
				hasFile: jest.fn(),
			};

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageReader } = jest.requireMock('../tar-package-reader') as {
				TarPackageReader: { fromBuffer: jest.Mock };
			};
			TarPackageReader.fromBuffer.mockResolvedValue(mockReader);

			const request: ImportRequest = {
				user: mockUser,
				mode: 'auto',
				createCredentialStubs: false,
				withVariableValues: true,
				overwriteVariableValues: false,
			};

			await expect(service.importPackage(Buffer.from('fake'), request)).rejects.toThrow(
				'Unsupported package format version',
			);
		});
	});
});
