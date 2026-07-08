/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { OpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmOpenAi } from '../LMOpenAi/LmOpenAi.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedN8nLlmTracing = vi.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

describe('LmOpenAi', () => {
	let lmOpenAi: LmOpenAi;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenAI Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmOpenAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (credentials: Record<string, unknown> = { apiKey: 'test-api-key' }) => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = vi.fn().mockResolvedValue(credentials);
		mockContext.getNode = vi.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'gpt-3.5-turbo-instruct';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as never);
		return mockContext;
	};

	beforeEach(() => {
		lmOpenAi = new LmOpenAi();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should construct the model with an N8nLlmTracing callback', async () => {
			const mockContext = setupMockContext();

			await lmOpenAi.supplyData.call(mockContext, 0);

			expect(OpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'gpt-3.5-turbo-instruct',
					callbacks: expect.arrayContaining([expect.any(Object)]),
				}),
			);
		});

		it('should pass empty redactedHeaders to N8nLlmTracing when no custom header is configured', async () => {
			const mockContext = setupMockContext();

			await lmOpenAi.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext, { redactedHeaders: [] });
		});

		it('should pass the declared header name to N8nLlmTracing', async () => {
			const mockContext = setupMockContext({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-custom-header',
				headerValue: 'secret-value',
			});

			await lmOpenAi.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext, {
				redactedHeaders: ['x-custom-header'],
			});
		});
	});
});
