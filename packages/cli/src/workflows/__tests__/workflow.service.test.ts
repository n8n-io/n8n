import type { LicenseState } from '@n8n/backend-common';
import type { User, ProjectRepository } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import * as WorkflowHelpers from '@/workflow-helpers';

jest.mock('@/permissions.ee/check-access');
jest.mock('@/workflow-helpers');
jest.mock('@/generic-helpers');

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowRepositoryMock: MockProxy<{
			getManyAndCountWithSharingSubquery: jest.Mock;
		}>;
		let roleServiceMock: MockProxy<RoleService>;
		let webhookServiceMock: MockProxy<WebhookService>;

		beforeEach(() => {
			workflowRepositoryMock = mock();
			workflowRepositoryMock.getManyAndCountWithSharingSubquery.mockResolvedValue({
				workflows: [],
				count: 0,
			});

			roleServiceMock = mock<RoleService>();
			roleServiceMock.rolesWithScope.mockResolvedValue(['project:viewer']);

			webhookServiceMock = mock<WebhookService>();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				roleServiceMock, // roleService
				mock(), // projectService
				mock(), // executionRepository
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				mock(), // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				webhookServiceMock, // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // tagRepository
				mock(), // credentialsService
				mock(), // folderService
				mock(), // enterpriseWorkflowService
			);
		});

		test('should use default "workflow:read" scope when requiredScopes is not provided', async () => {
			const user = mock<User>();

			await workflowService.getMany(user);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: ['workflow:read'],
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});

		test('should use provided requiredScopes when specified', async () => {
			const user = mock<User>();
			const customScopes: Scope[] = ['workflow:update'];

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				undefined, // includeFolders
				undefined, // onlySharedWithMe
				customScopes,
			);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', customScopes);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', customScopes);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: customScopes,
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});

		test('should use provided requiredScopes with multiple scopes', async () => {
			const user = mock<User>();
			const customScopes: Scope[] = ['workflow:read', 'workflow:update'];

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				undefined, // includeFolders
				undefined, // onlySharedWithMe
				customScopes,
			);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', customScopes);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', customScopes);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: customScopes,
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});

		test('should use "workflow:execute" scope when required', async () => {
			const user = mock<User>();
			const executeScope: Scope[] = ['workflow:execute'];

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				undefined, // includeFolders
				undefined, // onlySharedWithMe
				executeScope,
			);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', executeScope);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', executeScope);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: executeScope,
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});
	});

	describe('update() redactionPolicy scope enforcement', () => {
		const userHasScopesMock = jest.mocked(userHasScopes);
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowRepositoryMock: MockProxy<{
			update: jest.Mock;
			findOne: jest.Mock;
		}>;

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowRepositoryMock = mock();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionRepository
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // tagRepository
				mock(), // credentialsService
				mock(), // folderService
				mock(), // enterpriseWorkflowService
			);

			jest.clearAllMocks();

			// Pass settings through removeDefaultValues unchanged
			jest.mocked(WorkflowHelpers.removeDefaultValues).mockImplementation((settings) => settings);
		});

		function setupExistingWorkflow(settings: Record<string, unknown> = {}) {
			const existingWorkflow = mock<WorkflowEntity>({
				id: 'workflow-1',
				isArchived: false,
				versionId: 'v1',
				nodes: [],
				connections: {},
				settings,
				activeVersionId: undefined as unknown as string,
				tags: [],
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(existingWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(existingWorkflow);
			return existingWorkflow;
		}

		function createUpdateData(settings: Record<string, unknown>) {
			return { settings } as unknown as WorkflowEntity;
		}

		test('should strip redactionPolicy when user lacks scope and value is changing', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			userHasScopesMock.mockResolvedValue(false);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:updateRedactionSetting'],
				false,
				{ workflowId: 'workflow-1' },
			);
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.not.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		test('should preserve redactionPolicy when user has scope and value is changing', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			userHasScopesMock.mockResolvedValue(true);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:updateRedactionSetting'],
				false,
				{ workflowId: 'workflow-1' },
			);
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		test('should not check scope when redactionPolicy value is unchanged', async () => {
			setupExistingWorkflow({ redactionPolicy: 'all' });

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).not.toHaveBeenCalled();
		});

		test('should not check scope when redactionPolicy is not in incoming settings', async () => {
			setupExistingWorkflow({ redactionPolicy: 'all' });

			const user = mock<User>();
			await workflowService.update(user, createUpdateData({ executionOrder: 'v1' }), 'workflow-1', {
				forceSave: true,
			});

			expect(userHasScopesMock).not.toHaveBeenCalled();
		});
	});

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

				const workflowService = new WorkflowService(
					mock(), // logger
					mock(), // sharedWorkflowRepository
					mock(), // workflowRepository
					mock(), // workflowTagMappingRepository
					mock(), // binaryDataService
					mock(), // ownershipService
					mock(), // tagService
					mock(), // workflowHistoryService
					mock(), // externalHooks
					mock(), // activeWorkflowManager
					mock(), // roleService
					projectServiceMock, // projectService
					mock(), // executionRepository
					mock(), // eventService
					mock(), // globalConfig
					mock(), // folderRepository
					mock(), // workflowFinderService
					mock(), // workflowPublishHistoryRepository
					mock(), // workflowValidationService
					mock(), // nodeTypes
					mock(), // webhookService
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
					workflowService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
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

			const workflowService = new WorkflowService(
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				projectServiceMock,
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				licenseStateMock,
				projectRepositoryMock,
				mock(),
				credentialsServiceMock,
				mock(),
				enterpriseWorkflowServiceMock,
			);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
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
			(projectRepositoryMock as any).manager = {
				transaction: jest.fn(async (cb: any) => cb(transactionManager)),
			};

			const workflowService = new WorkflowService(
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				projectServiceMock,
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				licenseStateMock,
				projectRepositoryMock,
				mock(),
				mock(),
				mock(),
				mock(),
			);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};
			newWorkflow.settings = { redactionPolicy: 'all' };

			await expect(
				workflowService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
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
			(projectRepositoryMock as any).manager = {
				transaction: jest.fn(async (cb: any) => cb(transactionManager)),
			};

			const workflowService = new WorkflowService(
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				projectServiceMock,
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				licenseStateMock,
				projectRepositoryMock,
				mock(),
				mock(),
				mock(),
				mock(),
			);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};
			newWorkflow.settings = { redactionPolicy: 'all' };

			await expect(
				workflowService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
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
