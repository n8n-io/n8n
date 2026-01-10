import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatOpenRouter } from '../LmChatOpenRouter/LmChatOpenRouter.node';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

jest.mock('@langchain/openai');
jest.mock('../N8nLlmTracing');
jest.mock('../n8nLlmFailedAttemptHandler');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatOpenRouter', () => {
	let lmChatOpenRouter: LmChatOpenRouter;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenRouter Chat Model',
		typeVersion: 1.2,
		type: 'n8n-nodes-langchain.lmChatOpenRouter',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const node = { ...mockNode, ...nodeOverrides };
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			node,
		) as jest.Mocked<ISupplyDataFunctions>;

		// Setup default mocks
		mockContext.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});
		mockContext.getNode = jest.fn().mockReturnValue(node);
		mockContext.getNodeParameter = jest.fn();

		// Mock the constructors/functions properly
		MockedN8nLlmTracing.mockImplementation(() => ({}) as any);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatOpenRouter = new LmChatOpenRouter();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should handle reasoningEffort chat model option', async () => {
			const mockContext = setupMockContext();
			const options = {
				reasoningEffort: 'high',
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					reasoningEffort: options.reasoningEffort,
					timeout: 60000,
					maxRetries: 2,
					onFailedAttempt: expect.any(Function),
				}),
			);
		});
	});
});
