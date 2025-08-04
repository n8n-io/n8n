'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const collaboration_service_1 = require('../collaboration.service');
jest.mock('@/collaboration/collaboration.state');
jest.mock('@/push');
jest.mock('@n8n/db');
jest.mock('@/services/access.service');
jest.mock('@/workflows/workflow.service');
jest.mock('@/workflows/workflow-finder.service');
jest.mock('n8n-core');
describe('CollaborationService', () => {
	let service;
	let mockErrorReporter;
	let mockPush;
	let mockState;
	let mockUserRepository;
	let mockAccessService;
	let mockWorkflowService;
	let mockWorkflowFinderService;
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
		};
		mockPush = {
			on: jest.fn(),
			sendToUsers: jest.fn(),
		};
		mockState = {
			addCollaborator: jest.fn(),
			removeCollaborator: jest.fn(),
			getCollaborators: jest.fn(),
		};
		mockUserRepository = {
			getByIds: jest.fn(),
			manager: {},
			findOneBy: jest.fn(),
		};
		mockAccessService = {
			hasReadAccess: jest.fn(),
		};
		mockWorkflowService = {
			update: jest.fn(),
		};
		mockWorkflowFinderService = {
			findWorkflowForUser: jest.fn(),
		};
		service = new collaboration_service_1.CollaborationService(
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
		const mockAddNodeMessage = {
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
			mockUserRepository.findOneBy.mockResolvedValue({ id: userId });
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(mockWorkflow);
			mockWorkflowService.update.mockResolvedValue(undefined);
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
		const mockCursorMessage = {
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
//# sourceMappingURL=collaboration.service.test.js.map
