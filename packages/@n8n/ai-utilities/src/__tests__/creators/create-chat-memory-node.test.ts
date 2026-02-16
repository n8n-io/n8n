import type { INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';

import { createChatMemoryNode } from 'src/creators/create-chat-memory-node';
import type { ChatMemoryNodeConfig, ChatMemoryOptions } from 'src/types/creators';
import type { ChatMemory } from 'src/types/memory';

jest.mock('src/suppliers/supplyMemory', () => ({
	supplyMemory: jest.fn().mockReturnValue({ response: { __brand: 'MockMemory' } }),
}));

const { supplyMemory } = jest.requireMock('src/suppliers/supplyMemory');

describe('createChatMemoryNode', () => {
	const mockDescription: INodeTypeDescription = {
		displayName: 'Test Chat Memory',
		name: 'testChatMemory',
		group: ['transform'],
		version: 1,
		description: 'Test chat memory node',
		defaults: {
			name: 'Test Chat Memory',
		},
		inputs: [],
		outputs: [],
		properties: [],
	};

	const mockMethods = {
		listSearch: {
			searchMethod: jest.fn(),
		},
	};

	const mockContext = {
		getNode: jest.fn(),
		addOutputData: jest.fn(),
		addInputData: jest.fn(),
		getNextRunIndex: jest.fn(),
	} as unknown as ISupplyDataFunctions;

	const mockChatHistory = {
		getMessages: jest.fn(),
		addMessage: jest.fn(),
		addMessages: jest.fn(),
		clear: jest.fn(),
	};

	const mockMemory: ChatMemory = {
		loadMessages: jest.fn(),
		saveTurn: jest.fn(),
		clear: jest.fn(),
		chatHistory: mockChatHistory,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('node construction', () => {
		it('creates a node with description property', () => {
			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				getMemory: jest.fn(),
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			expect(instance.description).toEqual(mockDescription);
		});

		it('creates a node with methods property when provided', () => {
			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				methods: mockMethods,
				getMemory: jest.fn(),
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			expect(instance.methods).toEqual(mockMethods);
		});
	});

	describe('supplyData', () => {
		it('calls getMemory and supplies the memory', async () => {
			const getMemoryFn = jest.fn().mockResolvedValue(mockMemory);

			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				getMemory: getMemoryFn,
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			const result = await instance.supplyData.call(mockContext, 0);

			expect(getMemoryFn).toHaveBeenCalledWith(mockContext, 0);
			expect(supplyMemory).toHaveBeenCalledWith(mockContext, mockMemory, undefined);
			expect(result).toEqual({ response: { __brand: 'MockMemory' } });
		});

		it('handles async getMemory function correctly', async () => {
			const getMemoryFn = jest.fn().mockImplementation(async () => {
				// Simulate async operation
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockMemory;
			});

			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				getMemory: getMemoryFn,
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			const result = await instance.supplyData.call(mockContext, 0);

			expect(getMemoryFn).toHaveBeenCalledWith(mockContext, 0);
			expect(supplyMemory).toHaveBeenCalledWith(mockContext, mockMemory, undefined);
			expect(result).toEqual({ response: { __brand: 'MockMemory' } });
		});
	});

	describe('memory options', () => {
		it('passes memoryOptions to supplyMemory when provided', async () => {
			const closeFunction = jest.fn();
			const memoryOptions: ChatMemoryOptions = {
				closeFunction,
			};

			const getMemoryFn = jest.fn().mockResolvedValue(mockMemory);

			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				getMemory: getMemoryFn,
				memoryOptions,
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			await instance.supplyData.call(mockContext, 0);

			expect(supplyMemory).toHaveBeenCalledWith(mockContext, mockMemory, memoryOptions);
		});

		it('passes undefined memoryOptions when not provided', async () => {
			const getMemoryFn = jest.fn().mockResolvedValue(mockMemory);

			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				getMemory: getMemoryFn,
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			await instance.supplyData.call(mockContext, 0);

			expect(supplyMemory).toHaveBeenCalledWith(mockContext, mockMemory, undefined);
		});

		it('handles memoryOptions with closeFunction correctly', async () => {
			const closeFunction = jest.fn().mockResolvedValue(undefined);
			const memoryOptions: ChatMemoryOptions = {
				closeFunction,
			};

			const getMemoryFn = jest.fn().mockResolvedValue(mockMemory);

			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				getMemory: getMemoryFn,
				memoryOptions,
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			await instance.supplyData.call(mockContext, 0);

			expect(supplyMemory).toHaveBeenCalledWith(mockContext, mockMemory, {
				closeFunction,
			});
		});
	});

	describe('node type compliance', () => {
		it('creates a class that implements INodeType interface', () => {
			const config: ChatMemoryNodeConfig = {
				description: mockDescription,
				getMemory: jest.fn(),
			};

			const NodeClass = createChatMemoryNode(config);
			const instance = new (NodeClass as any)();

			expect(instance).toHaveProperty('description');
			expect(instance).toHaveProperty('supplyData');
			expect(typeof instance.supplyData).toBe('function');
		});
	});
});
