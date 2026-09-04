import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { makeN8nLlmFailedAttemptHandler } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatGoogleGemini } from '../LmChatGoogleGemini.node';

vi.mock('@langchain/google-genai');
vi.mock('@n8n/ai-utilities');

const MockedChatGoogleGenerativeAI = vi.mocked(ChatGoogleGenerativeAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatGoogleGemini', () => {
	let lmChatGoogleGemini: LmChatGoogleGemini;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Google Gemini Chat Model',
		typeVersion: 1.1,
		type: 'n8n-nodes-langchain.lmChatGoogleGemini',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			host: 'https://generativelanguage.googleapis.com',
		});
		mockContext.getNode = vi.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'modelName') return 'models/gemini-2.5-flash';
			if (paramName === 'options') {
				return {
					maxOutputTokens: 1024,
					temperature: 0.7,
					topK: 40,
					topP: 0.9,
				};
			}
			if (paramName === 'options.safetySettings.values') return null;
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatGoogleGemini = new LmChatGoogleGemini();
		vi.clearAllMocks();
	});

	it('should normalize tool schemas before binding tools', async () => {
		const mockContext = setupMockContext();
		const bindTools = vi.fn().mockReturnValue('bound-model');

		MockedChatGoogleGenerativeAI.mockImplementationOnce(function () {
			return { bindTools };
		} as unknown as typeof ChatGoogleGenerativeAI);

		const result = await lmChatGoogleGemini.supplyData.call(mockContext, 0);
		(result.response as { bindTools: typeof bindTools }).bindTools([
			{
				name: 'mcp_tool',
				schema: {
					type: 'object',
					properties: {
						value: { type: ['string', 'null'], exclusiveMinimum: 0 },
					},
				},
			},
		]);

		const boundTool = bindTools.mock.calls[0][0][0] as {
			schema: { properties: { value: { type: string; nullable: boolean } } };
		};

		expect(boundTool.schema.properties.value).toEqual({ type: 'string', nullable: true });
	});
});
