import type { UserRepository } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';

import type { Push } from '@/push';
import type { AccessService } from '@/services/access.service';
import type { WorkflowService } from '@/workflows/workflow.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { WorkflowEditMessage, WorkflowCursorMessage } from '../collaboration.message';
import { CollaborationService } from '../collaboration.service';
import type { CollaborationState } from '../collaboration.state';

jest.mock('@/collaboration/collaboration.state');
jest.mock('@/push');
jest.mock('@n8n/db');
jest.mock('@/services/access.service');
jest.mock('@/workflows/workflow.service');
jest.mock('@/workflows/workflow-finder.service');
jest.mock('n8n-core');

describe('CollaborationService', () => {
	let service: CollaborationService;
	let mockErrorReporter: jest.Mocked<ErrorReporter>;
	let mockPush: jest.Mocked<Push>;
	let mockState: jest.Mocked<CollaborationState>;
	let mockUserRepository: jest.Mocked<UserRepository>;
	let mockAccessService: jest.Mocked<AccessService>;
	let mockWorkflowService: jest.Mocked<WorkflowService>;
	let mockWorkflowFinderService: jest.Mocked<WorkflowFinderService>;

	const mockWorkflow = {
		id: 'workflow-123',
		name: 'Test Workflow',
		nodes: [
			{
				id: 'node-1',
				name: 'Start Node',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			},
		],
		connections: {},
		active: false,
		settings: {},
	};

	beforeEach(() => {
		mockErrorReporter = {
			error: jest.fn(),
		} as any;

		mockPush = {
			on: jest.fn(),
			sendToUsers: jest.fn(),
		} as any;

		mockState = {
			addCollaborator: jest.fn(),
			removeCollaborator: jest.fn(),
			getCollaborators: jest.fn(),
		} as any;

		mockUserRepository = {
			getByIds: jest.fn(),
			manager: {} as any,
			findOneBy: jest.fn(),
		} as any;

		mockAccessService = {
			hasReadAccess: jest.fn(),
		} as any;

		mockWorkflowService = {
			update: jest.fn(),
		} as any;

		mockWorkflowFinderService = {
			findWorkflowForUser: jest.fn(),
		} as any;

		service = new CollaborationService(
			mockErrorReporter,
			mockPush,
			mockState,
			mockUserRepository,
			mockAccessService,
			mockWorkflowService,
			mockWorkflowFinderService,
		);
	});

	describe('handleWorkflowEdit', () => {
		const userId = 'user-123';
		const workflowId = 'workflow-123';
		const operationId = 'op-123';

		const mockAddNodeMessage: WorkflowEditMessage = {
			type: 'workflowEdit',
			workflowId,
			operation: {
				action: 'addNode',
				nodeData: {
					id: 'node-2',
					name: 'New Node',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [200, 200],
					parameters: { url: 'https://example.com' },
				},
			},
			timestamp: Date.now(),
			userId,
			operationId,
		};

		beforeEach(() => {
			mockUserRepository.findOneBy.mockResolvedValue({ id: userId } as any);
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(mockWorkflow as any);
			mockWorkflowService.update.mockResolvedValue(undefined as any);
			mockState.getCollaborators.mockResolvedValue([
				{ userId: 'user-456', lastSeen: new Date().toISOString() },
			]);
		});

		it('should handle add node operation successfully', async () => {
			await service.handleUserMessage(userId, mockAddNodeMessage);

			expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				workflowId,
				{ id: userId },
				['workflow:update'],
			);
			expect(mockWorkflowService.update).toHaveBeenCalledWith(
				{ id: userId },
				expect.objectContaining({
					nodes: expect.arrayContaining([
						expect.objectContaining({ id: 'node-2', name: 'New Node' }),
					]),
				}),
				workflowId,
			);
			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'workflowEditBroadcast',
					data: expect.objectContaining({
						workflowId,
						operation: mockAddNodeMessage.operation,
						userId,
						operationId,
					}),
				}),
				['user-456'],
			);
		});

		it('should reject operation if user lacks write access', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await service.handleUserMessage(userId, mockAddNodeMessage);

			expect(mockWorkflowService.update).not.toHaveBeenCalled();
			expect(mockPush.sendToUsers).not.toHaveBeenCalled();
		});
	});

	describe('handleWorkflowCursor', () => {
		const userId = 'user-123';
		const workflowId = 'workflow-123';

		const mockCursorMessage: WorkflowCursorMessage = {
			type: 'workflowCursor',
			userId,
			workflowId,
			position: { x: 100, y: 200 },
			selectedNodeId: 'node-1',
		};

		beforeEach(() => {
			mockAccessService.hasReadAccess.mockResolvedValue(true);
			mockState.getCollaborators.mockResolvedValue([
				{ userId: 'user-456', lastSeen: new Date().toISOString() },
			]);
		});

		it('should broadcast cursor position to other collaborators', async () => {
			await service.handleUserMessage(userId, mockCursorMessage);

			expect(mockAccessService.hasReadAccess).toHaveBeenCalledWith(userId, workflowId);
			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'workflowCursorBroadcast',
					data: expect.objectContaining({
						workflowId,
						userId,
						position: { x: 100, y: 200 },
						selectedNodeId: 'node-1',
					}),
				}),
				['user-456'],
			);
		});
	});
});
