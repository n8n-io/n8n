import type { User, WorkflowRepository } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { WebhookService } from '@/webhooks/webhook.service';
import type { RoleService } from '@/services/role.service';
import type { ProjectService } from '@/services/project.service.ee';
import { WorkflowService } from '@/workflows/workflow.service';

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let roleServiceMock: MockProxy<RoleService>;
		let projectServiceMock: MockProxy<ProjectService>;
		let webhookServiceMock: MockProxy<WebhookService>;

		beforeEach(() => {
			workflowRepositoryMock = mock<WorkflowRepository>();
			workflowRepositoryMock.getManyAndCountForUser.mockResolvedValue({ workflows: [], count: 0 });
			roleServiceMock = mock<RoleService>();
			roleServiceMock.rolesWithScope.mockResolvedValue(['project:owner', 'project:admin']);
			projectServiceMock = mock<ProjectService>();
			projectServiceMock.getProjectRelationsForUser.mockResolvedValue([]);
			webhookServiceMock = mock<WebhookService>();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				roleServiceMock, // roleService
				projectServiceMock, // projectService
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
			);
		});

		const createUserWithRole = (scopes: Scope[] = []) => {
			const user = mock<User>();
			user.role = {
				scopes: scopes.map((slug) => ({ slug })),
			} as User['role'];
			return user;
		};

		test('should use default "workflow:read" scope when requiredScopes is not provided', async () => {
			const user = createUserWithRole([]);

			await workflowService.getMany(user);

			// Should call roleService to get roles for 'workflow:read' scope
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
		});

		test('should use provided requiredScopes when specified', async () => {
			const user = createUserWithRole([]);
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
		});

		test('should use provided requiredScopes with multiple scopes', async () => {
			const user = createUserWithRole([]);
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
		});

		test('should use "workflow:execute" scope when required', async () => {
			const user = createUserWithRole([]);
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
		});

		test('should skip role fetching for users with global scope', async () => {
			const user = createUserWithRole(['workflow:read']);

			await workflowService.getMany(user);

			// Should NOT call roleService for users with global scope
			expect(roleServiceMock.rolesWithScope).not.toHaveBeenCalled();

			// Should call repository with isGlobalScope: true
			expect(workflowRepositoryMock.getManyAndCountForUser).toHaveBeenCalledWith(
				expect.objectContaining({ isGlobalScope: true }),
				undefined,
			);
		});
	});
});
