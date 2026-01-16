import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { WorkflowService } from '@/workflows/workflow.service';

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowSharingServiceMock: MockProxy<WorkflowSharingService>;
		let workflowRepositoryMock: MockProxy<{ getManyAndCount: jest.Mock }>;

		beforeEach(() => {
			workflowSharingServiceMock = mock<WorkflowSharingService>();
			workflowRepositoryMock = mock();
			workflowRepositoryMock.getManyAndCount.mockResolvedValue({ workflows: [], count: 0 });
			workflowSharingServiceMock.getSharedWorkflowIds.mockResolvedValue([]);

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

	describe('saveNamedVersion()', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let eventServiceMock: MockProxy<EventService>;

		const mockUser = mock<User>({ id: 'user-123' });
		const workflowId = 'workflow-456';

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowHistoryServiceMock = mock<WorkflowHistoryService>();
			workflowRepositoryMock = mock<WorkflowRepository>();
			eventServiceMock = mock<EventService>();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				mock(), // ownershipService
				mock(), // tagService
				workflowHistoryServiceMock, // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // workflowSharingService
				mock(), // projectService
				mock(), // executionRepository
				eventServiceMock, // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
			);
		});

		test('should throw NotFoundError when workflow not found for user', async () => {
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(null);

			await expect(
				workflowService.saveNamedVersion(mockUser, workflowId, { name: 'Test Version' }),
			).rejects.toThrow(NotFoundError);

			expect(workflowFinderServiceMock.findWorkflowForUser).toHaveBeenCalledWith(
				workflowId,
				mockUser,
				['workflow:update'],
				{ includeActiveVersion: true },
			);
		});

		test('should throw NotFoundError when workflow entity not found in repository', async () => {
			const mockWorkflow = mock<WorkflowEntity>({ id: workflowId });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mockWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(null);

			await expect(
				workflowService.saveNamedVersion(mockUser, workflowId, { name: 'Test Version' }),
			).rejects.toThrow(NotFoundError);
		});

		test('should call workflowFinderService with workflow:update scope', async () => {
			const mockWorkflow = mock<WorkflowEntity>({
				id: workflowId,
				versionId: 'version-123',
				nodes: [],
				connections: {},
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mockWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(mockWorkflow);

			await workflowService.saveNamedVersion(mockUser, workflowId, { name: 'Test Version' });

			expect(workflowFinderServiceMock.findWorkflowForUser).toHaveBeenCalledWith(
				workflowId,
				mockUser,
				['workflow:update'],
				{ includeActiveVersion: true },
			);
		});

		test('should call workflowHistoryService.saveVersion with autosaved=false', async () => {
			const mockWorkflow = mock<WorkflowEntity>({
				id: workflowId,
				versionId: 'version-123',
				nodes: [],
				connections: {},
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mockWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(mockWorkflow);

			await workflowService.saveNamedVersion(mockUser, workflowId, { name: 'Test Version' });

			expect(workflowHistoryServiceMock.saveVersion).toHaveBeenCalledWith(
				mockUser,
				expect.objectContaining({ versionId: 'version-123' }),
				workflowId,
				false,
			);
		});

		test('should call workflowHistoryService.updateVersion with name and description', async () => {
			const mockWorkflow = mock<WorkflowEntity>({
				id: workflowId,
				versionId: 'version-123',
				nodes: [],
				connections: {},
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mockWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(mockWorkflow);

			await workflowService.saveNamedVersion(mockUser, workflowId, {
				name: 'Test Version',
				description: 'Test description',
			});

			expect(workflowHistoryServiceMock.updateVersion).toHaveBeenCalledWith(
				'version-123',
				workflowId,
				{ name: 'Test Version', description: 'Test description' },
			);
		});

		test('should use provided versionId when specified', async () => {
			const mockWorkflow = mock<WorkflowEntity>({
				id: workflowId,
				versionId: 'current-version',
				nodes: [],
				connections: {},
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mockWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(mockWorkflow);

			await workflowService.saveNamedVersion(mockUser, workflowId, {
				name: 'Test Version',
				versionId: 'specific-version',
			});

			expect(workflowHistoryServiceMock.saveVersion).toHaveBeenCalledWith(
				mockUser,
				expect.objectContaining({ versionId: 'specific-version' }),
				workflowId,
				false,
			);
			expect(workflowHistoryServiceMock.updateVersion).toHaveBeenCalledWith(
				'specific-version',
				workflowId,
				{ name: 'Test Version' },
			);
		});

		test('should emit workflow-saved event', async () => {
			const mockWorkflow = mock<WorkflowEntity>({
				id: workflowId,
				versionId: 'version-123',
				nodes: [],
				connections: {},
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mockWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(mockWorkflow);

			await workflowService.saveNamedVersion(mockUser, workflowId, { name: 'Test Version' });

			expect(eventServiceMock.emit).toHaveBeenCalledWith('workflow-saved', expect.anything());
		});
	});
});
