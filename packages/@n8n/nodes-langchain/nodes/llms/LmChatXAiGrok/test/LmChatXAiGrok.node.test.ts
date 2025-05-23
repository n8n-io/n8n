import { ChatOpenAI } from '@langchain/openai';
import { ChatXAI } from '@langchain/xai';
import { mock } from 'jest-mock-extended';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatXAiGrok } from '../LmChatXAiGrok.node';

// Mock dependencies
jest.mock('@utils/sharedFields', () => ({
	getConnectionHintNoticeField: jest.fn(),
}));

jest.mock('../../../vendors/OpenAi/helpers/error-handling', () => ({
	openAiFailedAttemptHandler: jest.fn(),
}));

jest.mock('../../n8nLlmFailedAttemptHandler', () => ({
	makeN8nLlmFailedAttemptHandler: jest.fn(),
}));

jest.mock('../../N8nLlmTracing', () => ({
	N8nLlmTracing: jest.fn(),
}));

describe('LmChatXAiGrok', () => {
	const mockGetCredentials = jest.fn().mockResolvedValue({
		apiKey: 'test-key',
		url: 'https://test-url',
	});

	const mockGetNodeParameter = jest.fn();

	const mockNode = mock<INode>();

	const mockContext = {
		getCredentials: mockGetCredentials,
		getNodeParameter: mockGetNodeParameter,
		getNode: () => mockNode,
	} as unknown as ISupplyDataFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
		mockNode.typeVersion = 1.0;
		mockGetNodeParameter.mockImplementation((param) => {
			if (param === 'model') return 'grok-2-vision-1212';
			if (param === 'options')
				return {
					temperature: 0.7,
					maxTokens: 1000,
					timeout: 60000,
					maxRetries: 2,
				};
			return undefined;
		});
	});

	it('should return ChatOpenAI instance for version 1.0 with correct parameters', async () => {
		const node = new LmChatXAiGrok();
		const result = await node.supplyData.call(mockContext, 0);

		const model = result.response as ChatOpenAI;
		expect(model).toBeInstanceOf(ChatOpenAI);
		expect(model.modelName).toBe('grok-2-vision-1212');
		expect(model.temperature).toBe(0.7);
		expect(model.maxTokens).toBe(1000);
		expect(model.timeout).toBe(60000);

		expect(mockGetCredentials).toHaveBeenCalledWith('xAiApi');
		expect(mockGetNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockGetNodeParameter).toHaveBeenCalledWith('options', 0, {});
	});

	it('should return ChatXAI instance for version 1.1 with correct parameters', async () => {
		mockNode.typeVersion = 1.1;
		const node = new LmChatXAiGrok();
		const result = await node.supplyData.call(mockContext, 0);

		const model = result.response as ChatXAI;
		expect(model).toBeInstanceOf(ChatXAI);
		expect(model.model).toBe('grok-2-vision-1212');
		expect(model.temperature).toBe(0.7);
		expect(model.maxTokens).toBe(1000);
		expect(model.timeout).toBe(60000);

		expect(mockGetCredentials).toHaveBeenCalledWith('xAiApi');
		expect(mockGetNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockGetNodeParameter).toHaveBeenCalledWith('options', 0, {});
	});
});
