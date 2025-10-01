import type { SourceControlledFile } from '@n8n/api-types';
import type {
	FolderRepository,
	Project,
	ProjectRepository,
	SharedCredentials,
	SharedCredentialsRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	TagEntity,
	TagRepository,
	WorkflowRepository,
	WorkflowTagMapping,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import { GLOBAL_ADMIN_ROLE, In, PROJECT_OWNER_ROLE, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { captor, mock } from 'jest-mock-extended';
import { Cipher, type InstanceSettings } from 'n8n-core';
import fsp from 'node:fs/promises';

import type { VariablesService } from '../../variables/variables.service.ee';
import { SourceControlExportService } from '../source-control-export.service.ee';
import type { SourceControlScopedService } from '../source-control-scoped.service';
import { SourceControlContext } from '../types/source-control-context';

describe('SourceControlExportService', () => {
	const globalAdminContext = new SourceControlContext(
		Object.assign(new User(), {
			role: GLOBAL_ADMIN_ROLE,
		}),
	);

	const cipher = Container.get(Cipher);
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const tagRepository = mock<TagRepository>();
	const projectRepository = mock<ProjectRepository>();
	const workflowTagMappingRepository = mock<WorkflowTagMappingRepository>();
	const variablesService = mock<VariablesService>();
	const folderRepository = mock<FolderRepository>();
	const sourceControlScopedService = mock<SourceControlScopedService>();

	const service = new SourceControlExportService(
		mock(),
		variablesService,
		tagRepository,
		projectRepository,
		sharedCredentialsRepository,
		sharedWorkflowRepository,
		workflowRepository,
		workflowTagMappingRepository,
		folderRepository,
		sourceControlScopedService,
		mock<InstanceSettings>({ n8nFolder: '/mock/n8n' }),
	);

	const fsWriteFile = jest.spyOn(fsp, 'writeFile');

	beforeEach(() => jest.clearAllMocks());

	describe('exportCredentialsToWorkFolder', () => {
		const credentialData = {
			authUrl: 'test',
			accessTokenUrl: 'test',
			clientId: 'test',
			clientSecret: 'test',
			oauthTokenData: {
				access_token: 'test',
				token_type: 'test',
				expires_in: 123,
				refresh_token: 'test',
			},
		};

		const mockCredentials = mock({
			id: 'cred1',
			name: 'Test Credential',
			type: 'oauth2',
			data: cipher.encrypt(credentialData),
		});

		it('should export credentials to work folder', async () => {
			sharedCredentialsRepository.findByCredentialIds.mockResolvedValue([
				mock<SharedCredentials>({
					credentials: mockCredentials,
					project: mock({
						type: 'personal',
						projectRelations: [
							{
								role: PROJECT_OWNER_ROLE,
								user: mock({ email: 'user@example.com' }),
							},
						],
					}),
				}),
			]);

			// Act
			const result = await service.exportCredentialsToWorkFolder([mock()]);

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);

			const dataCaptor = captor<string>();
			expect(fsWriteFile).toHaveBeenCalledWith(
				'/mock/n8n/git/credential_stubs/cred1.json',
				dataCaptor,
			);
			expect(JSON.parse(dataCaptor.value)).toEqual({
				id: 'cred1',
				name: 'Test Credential',
				type: 'oauth2',
				data: {
					authUrl: '',
					accessTokenUrl: '',
					clientId: '',
					clientSecret: '',
				},
				ownedBy: {
					type: 'personal',
					personalEmail: 'user@example.com',
				},
			});
		});

		it('should handle team project credentials', async () => {
			sharedCredentialsRepository.findByCredentialIds.mockResolvedValue([
				mock<SharedCredentials>({
					credentials: mockCredentials,
					project: mock({
						type: 'team',
						id: 'team1',
						name: 'Test Team',
					}),
				}),
			]);

			// Act
			const result = await service.exportCredentialsToWorkFolder([
				mock<SourceControlledFile>({ id: 'cred1' }),
			]);

			// Assert
			expect(result.count).toBe(1);

			const dataCaptor = captor<string>();
			expect(fsWriteFile).toHaveBeenCalledWith(
				'/mock/n8n/git/credential_stubs/cred1.json',
				dataCaptor,
			);
			expect(JSON.parse(dataCaptor.value)).toEqual({
				id: 'cred1',
				name: 'Test Credential',
				type: 'oauth2',
				data: {
					authUrl: '',
					accessTokenUrl: '',
					clientId: '',
					clientSecret: '',
				},
				ownedBy: {
					type: 'team',
					teamId: 'team1',
					teamName: 'Test Team',
				},
			});
		});

		it('should handle missing credentials', async () => {
			// Arrange
			sharedCredentialsRepository.findByCredentialIds.mockResolvedValue([]);

			// Act
			const result = await service.exportCredentialsToWorkFolder([
				mock<SourceControlledFile>({ id: 'cred1' }),
			]);

			// Assert
			expect(result.missingIds).toHaveLength(1);
			expect(result.missingIds?.[0]).toBe('cred1');
		});
	});

	describe('exportTagsToWorkFolder', () => {
		it('should export tags to work folder', async () => {
			// Arrange
			const mockTag = mock<TagEntity>({
				id: 'tag1',
				name: 'Tag 1',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const mockWorkflow = mock<WorkflowTagMapping>({
				tagId: 'tag1',
				workflowId: 'workflow1',
			});
			tagRepository.find.mockResolvedValue([mockTag]);
			workflowTagMappingRepository.find.mockResolvedValue([mockWorkflow]);
			const fileName = '/mock/n8n/git/tags.json';

			// Act
			const result = await service.exportTagsToWorkFolder(globalAdminContext);

			// Assert
			expect(fsWriteFile).toHaveBeenCalledWith(
				fileName,
				JSON.stringify(
					{
						tags: [
							{
								id: mockTag.id,
								name: mockTag.name,
							},
						],
						mappings: [mockWorkflow],
					},
					null,
					2,
				),
			);
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
			expect(result.files[0]).toMatchObject({ id: '', name: fileName });
		});

		it('should clear tags file and export it when there are no tags', async () => {
			// Arrange
			tagRepository.find.mockResolvedValue([]);
			const fileName = '/mock/n8n/git/tags.json';

			// Act
			const result = await service.exportTagsToWorkFolder(globalAdminContext);

			// Assert
			expect(fsWriteFile).toHaveBeenCalledWith(
				fileName,
				JSON.stringify({ tags: [], mappings: [] }, null, 2),
			);
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(1);
			expect(result.files[0]).toMatchObject({ id: '', name: fileName });
		});
	});

	describe('exportFoldersToWorkFolder', () => {
		it('should export folders to work folder', async () => {
			// Arrange
			folderRepository.find.mockResolvedValue([
				mock({ updatedAt: new Date(), createdAt: new Date() }),
			]);
			workflowRepository.find.mockResolvedValue([mock()]);

			// Act
			const result = await service.exportFoldersToWorkFolder(globalAdminContext);

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});

		it('should not export empty folders', async () => {
			// Arrange
			folderRepository.find.mockResolvedValue([]);

			// Act
			const result = await service.exportFoldersToWorkFolder(globalAdminContext);

			// Assert
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(0);
		});
	});

	describe('exportVariablesToWorkFolder', () => {
		it('should export variables to work folder', async () => {
			// Arrange
			variablesService.getAllCached.mockResolvedValue([mock()]);

			// Act
			const result = await service.exportVariablesToWorkFolder();

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});

		it('should not export empty variables', async () => {
			// Arrange
			variablesService.getAllCached.mockResolvedValue([]);

			// Act
			const result = await service.exportVariablesToWorkFolder();

			// Assert
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(0);
		});
	});

	describe('exportWorkflowsToWorkFolder', () => {
		it('should export workflows to work folder', async () => {
			// Arrange
			workflowRepository.findByIds.mockResolvedValue([mock()]);
			sharedWorkflowRepository.findByWorkflowIds.mockResolvedValue([
				mock<SharedWorkflow>({
					project: mock({
						type: 'personal',
						projectRelations: [{ role: PROJECT_OWNER_ROLE, user: mock() }],
					}),
					workflow: mock(),
				}),
			]);

			// Act
			const result = await service.exportWorkflowsToWorkFolder([mock()]);

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});

		it('should throw an error if workflow has no owner', async () => {
			// Arrange
			sharedWorkflowRepository.findByWorkflowIds.mockResolvedValue([
				mock<SharedWorkflow>({
					project: mock({
						type: 'personal',
						projectRelations: [],
					}),
					workflow: mock({
						id: 'test-workflow-id',
						name: 'TestWorkflow',
					}),
				}),
			]);

			// Act & Assert
			await expect(service.exportWorkflowsToWorkFolder([mock()])).rejects.toThrow(
				'Workflow "TestWorkflow" (ID: test-workflow-id) has no owner',
			);
		});
	});

	describe('exportTeamProjectsToWorkFolder', () => {
		it('should export projects to work folder', async () => {
			// Arrange
			const candidates = [
				mock<SourceControlledFile>({ id: 'project-id-1' }),
				mock<SourceControlledFile>({ id: 'project-id-2' }),
			];

			const project1 = mock<Project>({
				id: 'project-id-1',
				name: 'Project 1',
				icon: { type: 'icon', value: 'icon.png' },
				description: 'Project 1',
				type: 'team',
			});
			const project2 = mock<Project>({
				id: 'project-id-2',
				name: 'Team Project',
				icon: null,
				description: 'Team Project',
				type: 'team',
			});

			const expectedProject1Json = JSON.stringify(
				{
					id: project1.id,
					name: project1.name,
					icon: project1.icon,
					description: project1.description,
					type: 'team',
					owner: {
						type: 'team',
						teamId: project1.id,
						teamName: project1.name,
					},
				},
				null,
				2,
			);
			const expectedProject2Json = JSON.stringify(
				{
					id: project2.id,
					name: project2.name,
					icon: project2.icon,
					description: project2.description,
					type: 'team',
					owner: {
						type: 'team',
						teamId: project2.id,
						teamName: project2.name,
					},
				},
				null,
				2,
			);

			projectRepository.find.mockResolvedValue([project1, project2]);

			// Act
			const result = await service.exportTeamProjectsToWorkFolder(candidates);

			// Assert
			expect(projectRepository.find).toHaveBeenCalledWith({
				where: { id: In([project1.id, project2.id]), type: 'team' },
			});
			expect(fsWriteFile).toHaveBeenCalledWith(
				'/mock/n8n/git/projects/project-id-1.json',
				expectedProject1Json,
			);
			expect(fsWriteFile).toHaveBeenCalledWith(
				'/mock/n8n/git/projects/project-id-2.json',
				expectedProject2Json,
			);
			expect(result.count).toBe(2);
			expect(result.files).toHaveLength(2);
			expect(result.files).toEqual(
				expect.arrayContaining([
					{
						id: 'project-id-1',
						name: '/mock/n8n/git/projects/project-id-1.json',
					},
					{
						id: 'project-id-2',
						name: '/mock/n8n/git/projects/project-id-2.json',
					},
				]),
			);
		});
	});
});
