import type {
	User,
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { WebhookService } from '@/webhooks/webhook.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { WorkflowService } from '@/workflows/workflow.service';

const memberRole = mock({ scopes: [] as Array<{ slug: Scope }> });
const adminRole = mock({ scopes: [mock({ slug: 'project:read' as Scope })] });

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowSharingServiceMock: MockProxy<WorkflowSharingService>;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let projectRelationRepositoryMock: MockProxy<ProjectRelationRepository>;
		let projectRepositoryMock: MockProxy<ProjectRepository>;
		let webhookServiceMock: MockProxy<WebhookService>;

		beforeEach(() => {
			workflowSharingServiceMock = mock<WorkflowSharingService>();
			workflowRepositoryMock = mock<WorkflowRepository>();
			projectRelationRepositoryMock = mock<ProjectRelationRepository>();
			projectRepositoryMock = mock<ProjectRepository>();
			workflowRepositoryMock.getManyAndCount.mockResolvedValue({ workflows: [], count: 0 });
			workflowSharingServiceMock.getSharedWorkflowIds.mockResolvedValue([]);
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
				mock(), // roleService
				workflowSharingServiceMock, // workflowSharingService
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
				projectRepositoryMock, // projectRepository
				projectRelationRepositoryMock, // projectRelationRepository
			);
		});

		test('should use default "workflow:read" scope when requiredScopes is not provided', async () => {
			const user = mock<User>();

			await workflowService.getMany(user);

			expect(workflowSharingServiceMock.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
				scopes: ['workflow:read'],
			});
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

			expect(workflowSharingServiceMock.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
				scopes: customScopes,
			});
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

			expect(workflowSharingServiceMock.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
				scopes: customScopes,
			});
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

			expect(workflowSharingServiceMock.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
				scopes: executeScope,
			});
		});

		test('should pass accessible project IDs when includeFolders is true and no projectId filter', async () => {
			const user = mock<User>({ id: 'user-1', role: memberRole });
			const projectIds = ['project-1', 'project-2'];
			projectRelationRepositoryMock.findAllByUser.mockResolvedValue(
				projectIds.map((projectId) => mock({ projectId })),
			);
			workflowRepositoryMock.getWorkflowsAndFoldersWithCount.mockResolvedValue([[], 0]);

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				true, // includeFolders
			);

			expect(projectRelationRepositoryMock.findAllByUser).toHaveBeenCalledWith('user-1');
			expect(workflowRepositoryMock.getWorkflowsAndFoldersWithCount).toHaveBeenCalledWith(
				[],
				undefined,
				projectIds,
			);
		});

		test('should use projectId directly as accessible project ID when projectId filter is set', async () => {
			const user = mock<User>({ id: 'user-1', role: memberRole });
			projectRepositoryMock.findOneBy.mockResolvedValue(mock<Project>({ type: 'team' }));
			workflowSharingServiceMock.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepositoryMock.getWorkflowsAndFoldersWithCount.mockResolvedValue([[], 0]);

			await workflowService.getMany(
				user,
				{ filter: { projectId: 'some-project' } }, // options with projectId
				undefined, // includeScopes
				true, // includeFolders
			);

			expect(projectRelationRepositoryMock.findAllByUser).not.toHaveBeenCalled();
			expect(workflowRepositoryMock.getWorkflowsAndFoldersWithCount).toHaveBeenCalledWith(
				['wf-1'],
				{ filter: { projectId: 'some-project' } },
				['some-project'],
			);
		});

		test('should pass empty accessible project IDs for user with no project relations', async () => {
			const user = mock<User>({ id: 'user-1', role: memberRole });
			projectRelationRepositoryMock.findAllByUser.mockResolvedValue([]);
			workflowRepositoryMock.getWorkflowsAndFoldersWithCount.mockResolvedValue([[], 0]);

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				true, // includeFolders
			);

			expect(workflowRepositoryMock.getWorkflowsAndFoldersWithCount).toHaveBeenCalledWith(
				[],
				undefined,
				[],
			);
		});

		test('should not query accessible project IDs when includeFolders is false', async () => {
			const user = mock<User>({ id: 'user-1' });

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				false, // includeFolders
			);

			expect(projectRelationRepositoryMock.findAllByUser).not.toHaveBeenCalled();
		});

		test('should skip folder filtering for admin users with global project:read scope', async () => {
			const user = mock<User>({ id: 'admin-1', role: adminRole });
			workflowRepositoryMock.getWorkflowsAndFoldersWithCount.mockResolvedValue([[], 0]);

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				true, // includeFolders
			);

			expect(projectRelationRepositoryMock.findAllByUser).not.toHaveBeenCalled();
			expect(workflowRepositoryMock.getWorkflowsAndFoldersWithCount).toHaveBeenCalledWith(
				[],
				undefined,
				undefined,
			);
		});
	});
});
