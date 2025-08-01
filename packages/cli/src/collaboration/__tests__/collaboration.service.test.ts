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
		} as any;

		mockAccessService = {
			hasReadAccess: jest.fn(),
		} as any;

		mockWorkflowService = {
			get: jest.fn(),
			update: jest.fn(),
		} as any;

		service = new CollaborationService(
			mockErrorReporter,
			mockPush,
			mockState,
			mockUserRepository,
			mockAccessService,
			mockWorkflowService,
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
			mockAccessService.hasWriteAccess.mockResolvedValue(true);
			mockWorkflowService.get.mockResolvedValue(mockWorkflow);
			mockWorkflowService.update.mockResolvedValue(undefined);
			mockState.getCollaborators.mockResolvedValue([
				{ userId: 'user-456', lastSeen: new Date().toISOString() },
			]);
		});

		it('should handle add node operation successfully', async () => {
			await service.handleUserMessage(userId, mockAddNodeMessage);

			expect(mockAccessService.hasWriteAccess).toHaveBeenCalledWith(userId, workflowId);
			expect(mockWorkflowService.get).toHaveBeenCalledWith(workflowId, true);
			expect(mockWorkflowService.update).toHaveBeenCalledWith(
				userId,
				workflowId,
				expect.objectContaining({
					nodes: expect.arrayContaining([
						expect.objectContaining({ id: 'node-2', name: 'New Node' }),
					]),
				}),
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
			mockAccessService.hasWriteAccess.mockResolvedValue(false);

			await service.handleUserMessage(userId, mockAddNodeMessage);

			expect(mockWorkflowService.get).not.toHaveBeenCalled();
			expect(mockWorkflowService.update).not.toHaveBeenCalled();
			expect(mockPush.sendToUsers).not.toHaveBeenCalled();
		});

		it('should handle remove node operation and clean up connections', async () => {
			const workflowWithConnections = {
				...mockWorkflow,
				nodes: [
					{
						id: 'node-1',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 100],
					},
					{
						id: 'node-2',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [200, 200],
					},
				],
				connections: {
					'node-1': {
						'0': [{ node: 'node-2', type: 'main', index: 0 }],
					},
				},
			};

			mockWorkflowService.get.mockResolvedValue(workflowWithConnections);

			const removeNodeMessage: WorkflowEditMessage = {
				type: 'workflowEdit',
				workflowId,
				operation: {
					action: 'removeNode',
					nodeId: 'node-2',
				},
				timestamp: Date.now(),
				userId,
				operationId,
			};

			await service.handleUserMessage(userId, removeNodeMessage);

			expect(mockWorkflowService.update).toHaveBeenCalledWith(
				userId,
				workflowId,
				expect.objectContaining({
					nodes: expect.not.arrayContaining([expect.objectContaining({ id: 'node-2' })]),
					connections: expect.objectContaining({
						'node-1': {
							'0': [],
						},
					}),
				}),
			);
		});

		it('should handle update node operation', async () => {
			const updateNodeMessage: WorkflowEditMessage = {
				type: 'workflowEdit',
				workflowId,
				operation: {
					action: 'updateNode',
					nodeId: 'node-1',
					changes: {
						name: 'Updated Start Node',
						parameters: { newParam: 'value' },
					},
				},
				timestamp: Date.now(),
				userId,
				operationId,
			};

			await service.handleUserMessage(userId, updateNodeMessage);

			expect(mockWorkflowService.update).toHaveBeenCalledWith(
				userId,
				workflowId,
				expect.objectContaining({
					nodes: expect.arrayContaining([
						expect.objectContaining({
							id: 'node-1',
							name: 'Updated Start Node',
							parameters: { newParam: 'value' },
						}),
					]),
				}),
			);
		});

		it('should handle add connection operation', async () => {
			const workflowWithTwoNodes = {
				...mockWorkflow,
				nodes: [
					{
						id: 'node-1',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 100],
					},
					{
						id: 'node-2',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [200, 200],
					},
				],
				connections: {},
			};

			mockWorkflowService.get.mockResolvedValue(workflowWithTwoNodes);

			const addConnectionMessage: WorkflowEditMessage = {
				type: 'workflowEdit',
				workflowId,
				operation: {
					action: 'addConnection',
					connection: {
						source: 'node-1',
						sourceIndex: 0,
						destination: 'node-2',
						destinationIndex: 0,
						type: 'main',
					},
				},
				timestamp: Date.now(),
				userId,
				operationId,
			};

			await service.handleUserMessage(userId, addConnectionMessage);

			expect(mockWorkflowService.update).toHaveBeenCalledWith(
				userId,
				workflowId,
				expect.objectContaining({
					connections: {
						'node-1': {
							'0': [{ node: 'node-2', type: 'main', index: 0 }],
						},
					},
				}),
			);
		});

		it('should apply operational transform for conflicting operations', async () => {
			// Simulate adding two nodes at the same position
			const firstNodeMessage: WorkflowEditMessage = {
				...mockAddNodeMessage,
				operation: {
					action: 'addNode',
					nodeData: {
						id: 'node-2',
						name: 'First Node',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [200, 200],
						parameters: {},
					},
				},
			};

			const secondNodeMessage: WorkflowEditMessage = {
				...mockAddNodeMessage,
				operation: {
					action: 'addNode',
					nodeData: {
						id: 'node-3',
						name: 'Second Node',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [200, 200], // Same position as first node
						parameters: {},
					},
				},
				operationId: 'op-124',
			};

			// Process first operation
			await service.handleUserMessage(userId, firstNodeMessage);

			// Process second operation - should be transformed to avoid conflict
			await service.handleUserMessage(userId, secondNodeMessage);

			const updateCalls = mockWorkflowService.update.mock.calls;
			expect(updateCalls).toHaveLength(2);

			// Second node should have adjusted position
			const secondCallArgs = updateCalls[1][2];
			const secondNode = secondCallArgs.nodes.find((node: any) => node.id === 'node-3');
			expect(secondNode.position[0]).toBeGreaterThan(200);
			expect(secondNode.position[1]).toBeGreaterThan(200);
		});

		it('should handle workflow not found error', async () => {
			mockWorkflowService.get.mockResolvedValue(null);

			await service.handleUserMessage(userId, mockAddNodeMessage);

			expect(mockErrorReporter.error).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Error handling workflow edit operation'),
				}),
			);
		});
	});

	describe('handleWorkflowCursor', () => {
		const userId = 'user-123';
		const workflowId = 'workflow-123';

		const mockCursorMessage: WorkflowCursorMessage = {
			type: 'workflowCursor',
			workflowId,
			position: { x: 150, y: 250 },
			selectedNodeId: 'node-1',
			userId,
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
						position: { x: 150, y: 250 },
						selectedNodeId: 'node-1',
					}),
				}),
				['user-456'],
			);
		});

		it('should reject cursor update if user lacks read access', async () => {
			mockAccessService.hasReadAccess.mockResolvedValue(false);

			await service.handleUserMessage(userId, mockCursorMessage);

			expect(mockPush.sendToUsers).not.toHaveBeenCalled();
		});

		it('should handle cursor message without position or selected node', async () => {
			const minimalCursorMessage: WorkflowCursorMessage = {
				type: 'workflowCursor',
				workflowId,
				userId,
			};

			await service.handleUserMessage(userId, minimalCursorMessage);

			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'workflowCursorBroadcast',
					data: expect.objectContaining({
						workflowId,
						userId,
						position: undefined,
						selectedNodeId: undefined,
					}),
				}),
				['user-456'],
			);
		});
	});

	describe('cleanupWorkflowHistory', () => {
		it('should clean up operation history and counters', () => {
			const workflowId = 'workflow-123';

			// Simulate some operation history
			(service as any).operationHistory.set(workflowId, []);
			(service as any).operationCounter.set(workflowId, 5);

			service.cleanupWorkflowHistory(workflowId);

			expect((service as any).operationHistory.has(workflowId)).toBe(false);
			expect((service as any).operationCounter.has(workflowId)).toBe(false);
		});
	});

	describe('operational transform conflict resolution', () => {
		const userId = 'user-123';
		const workflowId = 'workflow-123';

		beforeEach(() => {
			mockAccessService.hasWriteAccess.mockResolvedValue(true);
			mockWorkflowService.get.mockResolvedValue(mockWorkflow);
			mockWorkflowService.update.mockResolvedValue(undefined);
			mockState.getCollaborators.mockResolvedValue([]);
		});

		it('should cancel update operation if node was already removed', async () => {
			// First, remove a node
			const removeMessage: WorkflowEditMessage = {
				type: 'workflowEdit',
				workflowId,
				operation: {
					action: 'removeNode',
					nodeId: 'node-1',
				},
				timestamp: Date.now(),
				userId,
				operationId: 'op-1',
			};

			await service.handleUserMessage(userId, removeMessage);

			// Then try to update the same node - should be cancelled
			const updateMessage: WorkflowEditMessage = {
				type: 'workflowEdit',
				workflowId,
				operation: {
					action: 'updateNode',
					nodeId: 'node-1',
					changes: { name: 'Updated Node' },
				},
				timestamp: Date.now() + 1000,
				userId,
				operationId: 'op-2',
			};

			await service.handleUserMessage(userId, updateMessage);

			// Should only have one update call (for the remove operation)
			expect(mockWorkflowService.update).toHaveBeenCalledTimes(1);
		});
	});
});
