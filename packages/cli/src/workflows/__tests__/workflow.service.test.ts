import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { WebhookService } from '@/webhooks/webhook.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { WorkflowService } from '@/workflows/workflow.service';

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowSharingServiceMock: MockProxy<WorkflowSharingService>;
		let workflowRepositoryMock: MockProxy<{ getManyAndCount: jest.Mock }>;
		let webhookServiceMock: MockProxy<WebhookService>;

		beforeEach(() => {
			workflowSharingServiceMock = mock<WorkflowSharingService>();
			workflowRepositoryMock = mock();
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
	});
});
