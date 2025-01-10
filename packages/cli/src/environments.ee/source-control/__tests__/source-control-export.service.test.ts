import type { SourceControlledFile } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { mock, captor } from 'jest-mock-extended';
import { Cipher, type InstanceSettings } from 'n8n-core';
import fsp from 'node:fs/promises';

import type { SharedCredentials } from '@/databases/entities/shared-credentials';
import type { SharedWorkflow } from '@/databases/entities/shared-workflow';
import type { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import type { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import type { TagRepository } from '@/databases/repositories/tag.repository';
import type { WorkflowTagMappingRepository } from '@/databases/repositories/workflow-tag-mapping.repository';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';

import type { VariablesService } from '../../variables/variables.service.ee';
import { SourceControlExportService } from '../source-control-export.service.ee';

describe('SourceControlExportService', () => {
	const cipher = Container.get(Cipher);
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const tagRepository = mock<TagRepository>();
	const workflowTagMappingRepository = mock<WorkflowTagMappingRepository>();
	const variablesService = mock<VariablesService>();

	const service = new SourceControlExportService(
		mock(),
		variablesService,
		tagRepository,
		sharedCredentialsRepository,
		sharedWorkflowRepository,
		workflowRepository,
		workflowTagMappingRepository,
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
								role: 'project:personalOwner',
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
			tagRepository.find.mockResolvedValue([mock()]);
			workflowTagMappingRepository.find.mockResolvedValue([mock()]);

			// Act
			const result = await service.exportTagsToWorkFolder();

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});

		it('should not export empty tags', async () => {
			// Arrange
			tagRepository.find.mockResolvedValue([]);

			// Act
			const result = await service.exportTagsToWorkFolder();

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
						projectRelations: [{ role: 'project:personalOwner', user: mock() }],
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
						display: () => 'TestWorkflow',
					}),
				}),
			]);

			// Act & Assert
			await expect(service.exportWorkflowsToWorkFolder([mock()])).rejects.toThrow(
				'Workflow TestWorkflow has no owner',
			);
		});
	});
});
