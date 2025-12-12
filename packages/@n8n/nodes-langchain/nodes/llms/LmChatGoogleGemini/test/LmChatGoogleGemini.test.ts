import { DynamicRetrievalMode } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { makeN8nLlmFailedAttemptHandler } from '../../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../../N8nLlmTracing';
import { LmChatGoogleGemini } from '../LmChatGoogleGemini.node';

jest.mock('@langchain/google-genai');
jest.mock('../../N8nLlmTracing');
jest.mock('../../n8nLlmFailedAttemptHandler');

const MockedChatGoogleGenerativeAI = jest.mocked(ChatGoogleGenerativeAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

const mockNode: INode = {
	id: '1',
	name: 'Google Gemini Chat Model',
	typeVersion: 1,
	type: 'n8n-nodes-langchain.lmChatGoogleGemini',
	position: [0, 0],
	parameters: {},
};

const setupMockContext = (): jest.Mocked<ISupplyDataFunctions> => {
	const mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
		{},
		mockNode,
	) as jest.Mocked<ISupplyDataFunctions>;

	mockContext.getCredentials = jest.fn().mockResolvedValue({
		apiKey: 'test-api-key',
		host: 'https://generativelanguage.googleapis.com',
	});
	mockContext.getNode = jest.fn().mockReturnValue(mockNode);
	mockContext.getNodeParameter = jest.fn();

	MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
	mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

	return mockContext;
};

describe('LmChatGoogleGemini - Google Search Grounding', () => {
	let lmChatGoogleGemini: LmChatGoogleGemini;

	beforeEach(() => {
		lmChatGoogleGemini = new LmChatGoogleGemini();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('supplyData - Google Search grounding feature', () => {
		it('should not modify bindTools when Google Search grounding is disabled', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'models/gemini-2.5-flash';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 1024,
						temperature: 0.7,
						topK: 40,
						topP: 0.9,
						useGoogleSearchGrounding: false,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			// Create a mock model with bindTools
			const mockBindTools = jest.fn();
			const mockModel = {
				bindTools: mockBindTools,
			};
			MockedChatGoogleGenerativeAI.mockImplementation(
				() => mockModel as unknown as ChatGoogleGenerativeAI,
			);

			await lmChatGoogleGemini.supplyData.call(mockContext, 0);

			// bindTools should not have been modified (still the original mock)
			expect(mockModel.bindTools).toBe(mockBindTools);
		});

		it('should use googleSearch tool format for Gemini 2.0+ models when grounding is enabled', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'models/gemini-2.5-flash';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 1024,
						temperature: 0.7,
						topK: 40,
						topP: 0.9,
						useGoogleSearchGrounding: true,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			// Create a mock model with bindTools that we can spy on
			const originalBindTools = jest.fn().mockReturnValue({});
			const mockModel = {
				bindTools: originalBindTools,
			};
			MockedChatGoogleGenerativeAI.mockImplementation(
				() => mockModel as unknown as ChatGoogleGenerativeAI,
			);

			await lmChatGoogleGemini.supplyData.call(mockContext, 0);

			// bindTools should have been overridden
			expect(mockModel.bindTools).not.toBe(originalBindTools);

			// Call the new bindTools with some tools
			const testTools = [{ name: 'tool1' }];
			mockModel.bindTools(testTools, {});

			// The original bindTools should be called with googleSearch prepended
			expect(originalBindTools).toHaveBeenCalledWith([{ googleSearch: {} }, { name: 'tool1' }], {});
		});

		it('should use googleSearchRetrieval tool format for Gemini 1.x models when grounding is enabled', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'models/gemini-1.5-pro';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 1024,
						temperature: 0.7,
						topK: 40,
						topP: 0.9,
						useGoogleSearchGrounding: true,
						dynamicRetrievalThreshold: 0.5,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			// Create a mock model with bindTools
			const originalBindTools = jest.fn().mockReturnValue({});
			const mockModel = {
				bindTools: originalBindTools,
			};
			MockedChatGoogleGenerativeAI.mockImplementation(
				() => mockModel as unknown as ChatGoogleGenerativeAI,
			);

			await lmChatGoogleGemini.supplyData.call(mockContext, 0);

			// Call the new bindTools
			const testTools = [{ name: 'tool1' }];
			mockModel.bindTools(testTools, {});

			// Should use googleSearchRetrieval with dynamic retrieval config
			expect(originalBindTools).toHaveBeenCalledWith(
				[
					{
						googleSearchRetrieval: {
							dynamicRetrievalConfig: {
								mode: DynamicRetrievalMode.MODE_DYNAMIC,
								dynamicThreshold: 0.5,
							},
						},
					},
					{ name: 'tool1' },
				],
				{},
			);
		});

		it('should use default dynamicRetrievalThreshold of 0.3 for Gemini 1.x models when not specified', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'models/gemini-1.0-pro';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 1024,
						temperature: 0.7,
						topK: 40,
						topP: 0.9,
						useGoogleSearchGrounding: true,
						// dynamicRetrievalThreshold not specified
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			const originalBindTools = jest.fn().mockReturnValue({});
			const mockModel = {
				bindTools: originalBindTools,
			};
			MockedChatGoogleGenerativeAI.mockImplementation(
				() => mockModel as unknown as ChatGoogleGenerativeAI,
			);

			await lmChatGoogleGemini.supplyData.call(mockContext, 0);

			// Call the new bindTools
			mockModel.bindTools([], {});

			// Should use default threshold of 0.3
			expect(originalBindTools).toHaveBeenCalledWith(
				[
					{
						googleSearchRetrieval: {
							dynamicRetrievalConfig: {
								mode: DynamicRetrievalMode.MODE_DYNAMIC,
								dynamicThreshold: 0.3,
							},
						},
					},
				],
				{},
			);
		});

		it('should correctly detect Gemini 1.5 models as legacy', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'models/gemini-1.5-flash';
				if (paramName === 'options') {
					return {
						useGoogleSearchGrounding: true,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			const originalBindTools = jest.fn().mockReturnValue({});
			const mockModel = {
				bindTools: originalBindTools,
			};
			MockedChatGoogleGenerativeAI.mockImplementation(
				() => mockModel as unknown as ChatGoogleGenerativeAI,
			);

			await lmChatGoogleGemini.supplyData.call(mockContext, 0);

			mockModel.bindTools([], {});

			// Should use googleSearchRetrieval (legacy format)
			expect(originalBindTools).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						googleSearchRetrieval: expect.any(Object),
					}),
				]),
				{},
			);
		});

		it('should correctly detect Gemini 3 models as non-legacy', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'models/gemini-3-pro-preview';
				if (paramName === 'options') {
					return {
						useGoogleSearchGrounding: true,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			const originalBindTools = jest.fn().mockReturnValue({});
			const mockModel = {
				bindTools: originalBindTools,
			};
			MockedChatGoogleGenerativeAI.mockImplementation(
				() => mockModel as unknown as ChatGoogleGenerativeAI,
			);

			await lmChatGoogleGemini.supplyData.call(mockContext, 0);

			mockModel.bindTools([], {});

			// Should use googleSearch (non-legacy format)
			expect(originalBindTools).toHaveBeenCalledWith([{ googleSearch: {} }], {});
		});
	});
});
