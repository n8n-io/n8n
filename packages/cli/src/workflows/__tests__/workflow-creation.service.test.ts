import type { LicenseState } from '@n8n/backend-common';
import type { User, ProjectRepository } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { ProjectService } from '@/services/project.service.ee';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

jest.mock('@/permissions.ee/check-access');
jest.mock('@/workflow-helpers');
jest.mock('@/generic-helpers');

describe('WorkflowCreationService', () => {
	describe('createWorkflow()', () => {
		describe('credential retrieval', () => {
			test('should include global credentials when checking credential permissions', async () => {
				const credentialsServiceMock = mock<CredentialsService>();
				const enterpriseWorkflowServiceMock = mock<EnterpriseWorkflowService>();
				const licenseStateMock = mock<LicenseState>();
				const projectServiceMock = mock<ProjectService>();
				const projectRepositoryMock = mock<ProjectRepository>();

				credentialsServiceMock.getMany.mockResolvedValue([]);
				licenseStateMock.isSharingLicensed.mockReturnValue(true);
				enterpriseWorkflowServiceMock.validateCredentialPermissionsToUser.mockImplementation(() => {
					throw new Error('Stopping for test');
				});
				projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);

				const workflowCreationService = new WorkflowCreationService(
					mock(), // logger
					mock(), // sharedWorkflowRepository
					mock(), // tagService
					mock(), // workflowHistoryService
					mock(), // externalHooks
					projectServiceMock, // projectService
					mock(), // eventService
					mock(), // globalConfig
					mock(), // workflowFinderService
					licenseStateMock, // licenseState
					projectRepositoryMock, // projectRepository
					mock(), // tagRepository
					credentialsServiceMock, // credentialsService
					mock(), // folderService
					enterpriseWorkflowServiceMock, // enterpriseWorkflowService
				);

				const user = mock<User>();
				const newWorkflow = new WorkflowEntity();
				newWorkflow.name = 'Test';
				newWorkflow.nodes = [];
				newWorkflow.connections = {};

				await expect(
					workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
				).rejects.toThrow();

				expect(credentialsServiceMock.getMany).toHaveBeenCalledWith(user, {
					includeGlobal: true,
				});
			});
		});

		test('should throw BadRequestError when user lacks access to credentials in workflow', async () => {
			const credentialsServiceMock = mock<CredentialsService>();
			const enterpriseWorkflowServiceMock = mock<EnterpriseWorkflowService>();
			const licenseStateMock = mock<LicenseState>();
			const projectServiceMock = mock<ProjectService>();
			const projectRepositoryMock = mock<ProjectRepository>();

			credentialsServiceMock.getMany.mockResolvedValue([]);
			licenseStateMock.isSharingLicensed.mockReturnValue(true);
			enterpriseWorkflowServiceMock.validateCredentialPermissionsToUser.mockImplementation(() => {
				throw new Error('User does not have access');
			});
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);

			const workflowCreationService = new WorkflowCreationService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				projectServiceMock, // projectService
				mock(), // eventService
				mock(), // globalConfig
				mock(), // workflowFinderService
				licenseStateMock, // licenseState
				projectRepositoryMock, // projectRepository
				mock(), // tagRepository
				credentialsServiceMock, // credentialsService
				mock(), // folderService
				enterpriseWorkflowServiceMock, // enterpriseWorkflowService
			);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow(
				'The workflow you are trying to save contains credentials that are not shared with you',
			);
		});
	});

	describe('redaction policy scope enforcement on create', () => {
		const userHasScopesMock = jest.mocked(userHasScopes);

		test('should strip redactionPolicy when user lacks scope', async () => {
			const projectServiceMock = mock<ProjectService>();
			const projectRepositoryMock = mock<ProjectRepository>();
			const licenseStateMock = mock<LicenseState>();

			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			userHasScopesMock.mockResolvedValue(false);

			const transactionManager = {
				save: jest.fn().mockRejectedValue(new Error('Stopping for test')),
			};
			(projectRepositoryMock as never as { manager: unknown }).manager = {
				transaction: jest.fn(
					async (cb: (em: unknown) => Promise<void>) => await cb(transactionManager),
				),
			};

			const workflowCreationService = new WorkflowCreationService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				projectServiceMock, // projectService
				mock(), // eventService
				mock(), // globalConfig
				mock(), // workflowFinderService
				licenseStateMock, // licenseState
				projectRepositoryMock, // projectRepository
				mock(), // tagRepository
				mock(), // credentialsService
				mock(), // folderService
				mock(), // enterpriseWorkflowService
			);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};
			newWorkflow.settings = { redactionPolicy: 'all' };

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow('Stopping for test');

			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:updateRedactionSetting'],
				false,
				{ projectId: 'project-1' },
			);
		});

		test('should preserve redactionPolicy when user has scope', async () => {
			const projectServiceMock = mock<ProjectService>();
			const projectRepositoryMock = mock<ProjectRepository>();
			const licenseStateMock = mock<LicenseState>();

			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			userHasScopesMock.mockResolvedValue(true);

			const transactionManager = {
				save: jest.fn().mockRejectedValue(new Error('Stopping for test')),
			};
			(projectRepositoryMock as never as { manager: unknown }).manager = {
				transaction: jest.fn(
					async (cb: (em: unknown) => Promise<void>) => await cb(transactionManager),
				),
			};

			const workflowCreationService = new WorkflowCreationService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				projectServiceMock, // projectService
				mock(), // eventService
				mock(), // globalConfig
				mock(), // workflowFinderService
				licenseStateMock, // licenseState
				projectRepositoryMock, // projectRepository
				mock(), // tagRepository
				mock(), // credentialsService
				mock(), // folderService
				mock(), // enterpriseWorkflowService
			);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};
			newWorkflow.settings = { redactionPolicy: 'all' };

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow('Stopping for test');

			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:updateRedactionSetting'],
				false,
				{ projectId: 'project-1' },
			);

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('all');
		});
	});
});
