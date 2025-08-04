'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const collaboration_message_1 = require('../collaboration.message');
describe('Collaboration Message Parsing', () => {
	describe('parseWorkflowMessage', () => {
		it('should parse valid workflowEdit message', async () => {
			const message = {
				type: 'workflowEdit',
				workflowId: 'workflow-123',
				operation: {
					action: 'addNode',
					nodeData: {
						id: 'node-123',
						name: 'Test Node',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [100, 200],
						parameters: { url: 'https://example.com' },
					},
				},
				timestamp: Date.now(),
				userId: 'user-123',
				operationId: 'op-123',
			};
			const result = await (0, collaboration_message_1.parseWorkflowMessage)(message);
			expect(result).toEqual(message);
			expect(result.type).toBe('workflowEdit');
		});
		it('should parse valid workflowCursor message', async () => {
			const message = {
				type: 'workflowCursor',
				workflowId: 'workflow-123',
				position: { x: 150, y: 250 },
				selectedNodeId: 'node-1',
				userId: 'user-123',
			};
			const result = await (0, collaboration_message_1.parseWorkflowMessage)(message);
			expect(result).toEqual(message);
			expect(result.type).toBe('workflowCursor');
		});
		it('should parse removeNode operation', async () => {
			const message = {
				type: 'workflowEdit',
				workflowId: 'workflow-123',
				operation: {
					action: 'removeNode',
					nodeId: 'node-123',
				},
				timestamp: Date.now(),
				userId: 'user-123',
				operationId: 'op-123',
			};
			const result = await (0, collaboration_message_1.parseWorkflowMessage)(message);
			expect(result.type).toBe('workflowEdit');
			expect(result.operation.action).toBe('removeNode');
		});
		it('should parse updateNode operation', async () => {
			const message = {
				type: 'workflowEdit',
				workflowId: 'workflow-123',
				operation: {
					action: 'updateNode',
					nodeId: 'node-123',
					changes: {
						name: 'Updated Node',
						parameters: { newParam: 'value' },
					},
				},
				timestamp: Date.now(),
				userId: 'user-123',
				operationId: 'op-123',
			};
			const result = await (0, collaboration_message_1.parseWorkflowMessage)(message);
			expect(result.type).toBe('workflowEdit');
			expect(result.operation.action).toBe('updateNode');
		});
		it('should parse addConnection operation', async () => {
			const message = {
				type: 'workflowEdit',
				workflowId: 'workflow-123',
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
				userId: 'user-123',
				operationId: 'op-123',
			};
			const result = await (0, collaboration_message_1.parseWorkflowMessage)(message);
			expect(result.type).toBe('workflowEdit');
			expect(result.operation.action).toBe('addConnection');
		});
		it('should parse removeConnection operation', async () => {
			const message = {
				type: 'workflowEdit',
				workflowId: 'workflow-123',
				operation: {
					action: 'removeConnection',
					connection: {
						source: 'node-1',
						sourceIndex: 0,
						destination: 'node-2',
						destinationIndex: 0,
					},
				},
				timestamp: Date.now(),
				userId: 'user-123',
				operationId: 'op-123',
			};
			const result = await (0, collaboration_message_1.parseWorkflowMessage)(message);
			expect(result.type).toBe('workflowEdit');
			expect(result.operation.action).toBe('removeConnection');
		});
		it('should reject invalid message type', async () => {
			const invalidMessage = {
				type: 'invalidType',
				workflowId: 'workflow-123',
				userId: 'user-123',
			};
			await expect(
				(0, collaboration_message_1.parseWorkflowMessage)(invalidMessage),
			).rejects.toThrow();
		});
		it('should reject message with missing workflowId', async () => {
			const invalidMessage = {
				type: 'workflowEdit',
				operation: {
					action: 'addNode',
					nodeData: {
						id: 'node-123',
						name: 'Test Node',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [100, 200],
					},
				},
				timestamp: Date.now(),
				userId: 'user-123',
				operationId: 'op-123',
			};
			await expect(
				(0, collaboration_message_1.parseWorkflowMessage)(invalidMessage),
			).rejects.toThrow();
		});
		it('should reject workflowEdit message with invalid operation', async () => {
			const invalidMessage = {
				type: 'workflowEdit',
				workflowId: 'workflow-123',
				operation: {
					action: 'invalidAction',
					nodeId: 'node-123',
				},
				timestamp: Date.now(),
				userId: 'user-123',
				operationId: 'op-123',
			};
			await expect(
				(0, collaboration_message_1.parseWorkflowMessage)(invalidMessage),
			).rejects.toThrow();
		});
		it('should handle cursor message without position', async () => {
			const message = {
				type: 'workflowCursor',
				workflowId: 'workflow-123',
				userId: 'user-123',
			};
			const result = await (0, collaboration_message_1.parseWorkflowMessage)(message);
			expect(result).toEqual(message);
			expect(result.type).toBe('workflowCursor');
		});
	});
});
//# sourceMappingURL=collaboration-integration.test.js.map
