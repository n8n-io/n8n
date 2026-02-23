import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { RoleService } from '@/services/role.service';
import type { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowService } from '@/workflows/workflow.service';

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
});
