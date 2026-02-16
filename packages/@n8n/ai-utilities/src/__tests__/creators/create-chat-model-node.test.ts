import type { INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';

import { createChatModelNode } from 'src/creators/create-chat-model-node';
import type { ChatModelNodeConfig } from 'src/types/creators';

jest.mock('src/suppliers/supplyModel', () => ({
	supplyModel: jest.fn().mockReturnValue({ response: { __brand: 'MockModel' } }),
}));

const { supplyModel } = jest.requireMock('src/suppliers/supplyModel');

describe('createChatModelNode', () => {
	const mockDescription: INodeTypeDescription = {
		displayName: 'Test Chat Model',
		name: 'testChatModel',
		group: ['transform'],
		version: 1,
		description: 'Test chat model node',
		defaults: {
			name: 'Test Chat Model',
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

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('node construction', () => {
		it('creates a node with description property', () => {
			const config: ChatModelNodeConfig = {
				description: mockDescription,
				getModel: jest.fn(),
			};

			const node = createChatModelNode(config);

			expect(node.description).toEqual(mockDescription);
		});

		it('creates a node with methods property when provided', () => {
			const config: ChatModelNodeConfig = {
				description: mockDescription,
				methods: mockMethods,
				getModel: jest.fn(),
			};

			const node = createChatModelNode(config);

			expect(node.methods).toEqual(mockMethods);
		});
	});

	describe('supplyData', () => {
		it('calls getModel function and supplies the model', async () => {
			const mockModel = {
				type: 'openai' as const,
				baseUrl: 'https://api.openai.com',
				model: 'gpt-4',
				apiKey: 'test-key',
			};

			const getModelFn = jest.fn().mockResolvedValue(mockModel);

			const config: ChatModelNodeConfig = {
				description: mockDescription,
				getModel: getModelFn,
			};

			const node = createChatModelNode(config);

			const result = await node.supplyData!.call(mockContext, 0);

			expect(getModelFn).toHaveBeenCalledWith(mockContext, 0);
			expect(supplyModel).toHaveBeenCalledWith(mockContext, mockModel);
			expect(result).toEqual({ response: { __brand: 'MockModel' } });
		});
	});

	describe('node type compliance', () => {
		it('creates an object that implements INodeType interface', () => {
			const config: ChatModelNodeConfig = {
				description: mockDescription,
				getModel: jest.fn(),
			};

			const node = createChatModelNode(config);

			expect(node).toHaveProperty('description');
			expect(node).toHaveProperty('supplyData');
			expect(typeof node.supplyData).toBe('function');
		});
	});
});
