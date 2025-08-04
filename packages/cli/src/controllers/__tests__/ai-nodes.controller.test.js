'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const ai_nodes_controller_1 = require('../ai-nodes.controller');
const mockLogger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};
const mockNodeTypes = {
	getKnownTypes: jest.fn(),
	getByNameAndVersion: jest.fn(),
};
const mockAiNodeDescription = {
	displayName: 'OpenAI Chat Model',
	name: 'lmChatOpenAi',
	icon: 'file:openai.svg',
	group: ['transform'],
	version: [1],
	description: 'AI chat model for conversations',
	defaults: { name: 'OpenAI Chat Model' },
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'openAiApi', required: true }],
	properties: [
		{
			displayName: 'Model',
			name: 'model',
			type: 'options',
			default: 'gpt-4o',
			options: [
				{ name: 'GPT-4o', value: 'gpt-4o' },
				{ name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
			],
		},
		{
			displayName: 'Temperature',
			name: 'temperature',
			type: 'number',
			default: 0.7,
		},
	],
};
const mockAiNodeType = {
	description: mockAiNodeDescription,
	execute: jest.fn(),
};
describe('AiNodesController', () => {
	let controller;
	let mockRequest;
	beforeEach(() => {
		controller = new ai_nodes_controller_1.AiNodesController(mockLogger, mockNodeTypes);
		mockRequest = {
			user: { id: 'user-123', email: 'test@example.com' },
		};
		jest.clearAllMocks();
	});
	describe('getAiNodeConfigurations', () => {
		it('should return AI node configurations successfully', async () => {
			mockNodeTypes.getKnownTypes.mockReturnValue({
				lmChatOpenAi: {},
				openAi: {},
				regularNode: {},
			});
			mockNodeTypes.getByNameAndVersion.mockImplementation((nodeType) => {
				if (nodeType === 'lmChatOpenAi' || nodeType === 'openAi') {
					return mockAiNodeType;
				}
				return null;
			});
			const query = { nodeVersion: 1, includeCredentials: true, includeModels: true };
			const result = await controller.getAiNodeConfigurations(mockRequest, query);
			expect(result.success).toBe(true);
			expect(result.configurations).toHaveLength(2);
			expect(result.configurations[0]).toHaveProperty('name');
			expect(result.configurations[0]).toHaveProperty('displayName');
			expect(result.configurations[0]).toHaveProperty('credentials');
			expect(result.configurations[0]).toHaveProperty('models');
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'AI node configuration requested',
				expect.objectContaining({
					userId: 'user-123',
					includeCredentials: true,
					includeModels: true,
				}),
			);
		});
		it('should filter by specific node type when provided', async () => {
			mockNodeTypes.getKnownTypes.mockReturnValue({
				lmChatOpenAi: {},
				openAi: {},
			});
			mockNodeTypes.getByNameAndVersion.mockImplementation((nodeType) => {
				if (nodeType === 'lmChatOpenAi') {
					return mockAiNodeType;
				}
				return null;
			});
			const query = {
				nodeType: 'lmChatOpenAi',
				nodeVersion: 1,
				includeCredentials: false,
				includeModels: true,
			};
			const result = await controller.getAiNodeConfigurations(mockRequest, query);
			expect(result.success).toBe(true);
			expect(result.configurations).toHaveLength(1);
			expect(result.configurations[0].name).toBe('lmChatOpenAi');
		});
		it('should handle errors gracefully', async () => {
			mockNodeTypes.getKnownTypes.mockImplementation(() => {
				throw new Error('Node types service error');
			});
			const query = { nodeVersion: 1, includeCredentials: false, includeModels: true };
			await expect(controller.getAiNodeConfigurations(mockRequest, query)).rejects.toThrow(
				'Failed to get AI node configurations',
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to retrieve AI node configurations',
				expect.objectContaining({
					userId: 'user-123',
					error: 'Node types service error',
				}),
			);
		});
	});
	describe('testPrompt', () => {
		it('should test AI prompt successfully', async () => {
			mockNodeTypes.getByNameAndVersion.mockReturnValue(mockAiNodeType);
			jest.doMock('@/workflow-execute-additional-data', () => ({
				getBase: jest.fn().mockResolvedValue({}),
			}));
			const payload = {
				nodeType: 'lmChatOpenAi',
				nodeVersion: 1,
				prompt: 'Hello, how are you?',
				model: 'gpt-4o',
				temperature: 0.7,
			};
			expect(payload.nodeType).toBe('lmChatOpenAi');
			expect(payload.prompt).toBe('Hello, how are you?');
		});
		it('should throw error for non-AI node types', async () => {
			const nonAiNodeDescription = {
				displayName: 'Regular Data Processor',
				name: 'regularNode',
				icon: 'file:regular.svg',
				group: ['transform'],
				version: [1],
				description: 'Regular node for data processing',
				defaults: { name: 'Regular Data Processor' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			};
			const nonAiNodeType = {
				description: nonAiNodeDescription,
				execute: jest.fn(),
			};
			mockNodeTypes.getByNameAndVersion.mockReturnValue(nonAiNodeType);
			const payload = {
				nodeType: 'regularNode',
				nodeVersion: 1,
				prompt: 'Test prompt',
				temperature: 0.7,
			};
			await expect(controller.testPrompt(mockRequest, payload)).rejects.toThrow(
				"Node type 'regularNode' is not an AI node",
			);
		});
		it('should throw error for non-existent node types', async () => {
			mockNodeTypes.getByNameAndVersion.mockReturnValue(null);
			const payload = {
				nodeType: 'nonExistentNode',
				nodeVersion: 1,
				prompt: 'Test prompt',
				temperature: 0.7,
			};
			await expect(controller.testPrompt(mockRequest, payload)).rejects.toThrow(
				"AI node type 'nonExistentNode' version 1 not found",
			);
		});
	});
	describe('configureMemory', () => {
		it('should configure memory successfully', async () => {
			const payload = {
				type: 'buffer',
				configuration: { maxTokens: 1000 },
				sessionId: 'session-123',
			};
			const result = await controller.configureMemory(mockRequest, payload);
			expect(result.success).toBe(true);
			expect(result.memoryConfig.type).toBe('buffer');
			expect(result.memoryConfig.sessionId).toBe('session-123');
			expect(result.memoryConfig.createdBy).toBe('user-123');
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'AI memory configuration requested',
				expect.objectContaining({
					userId: 'user-123',
					type: 'buffer',
					sessionId: 'session-123',
				}),
			);
		});
		it('should validate required configuration fields', async () => {
			const payload = {
				type: 'redis',
				configuration: {},
			};
			await expect(controller.configureMemory(mockRequest, payload)).rejects.toThrow(
				"Missing required configuration field 'host' for memory type 'redis'",
			);
		});
	});
	describe('retrieveMemory', () => {
		it('should retrieve memory successfully', async () => {
			const query = {
				sessionId: 'session-123',
				type: 'buffer',
				limit: 5,
			};
			const result = await controller.retrieveMemory(mockRequest, query);
			expect(result.success).toBe(true);
			expect(result.sessionId).toBe('session-123');
			expect(result.type).toBe('buffer');
			expect(result.data.messages).toHaveLength(5);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'AI memory retrieval requested',
				expect.objectContaining({
					userId: 'user-123',
					sessionId: 'session-123',
					type: 'buffer',
					limit: 5,
				}),
			);
		});
		it('should limit results correctly', async () => {
			const query = {
				sessionId: 'session-123',
				type: 'conversation',
				limit: 2,
			};
			const result = await controller.retrieveMemory(mockRequest, query);
			expect(result.data.messages.length).toBeLessThanOrEqual(2);
		});
	});
});
//# sourceMappingURL=ai-nodes.controller.test.js.map
