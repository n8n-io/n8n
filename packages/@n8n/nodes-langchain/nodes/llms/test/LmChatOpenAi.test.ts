/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import {
	NodeOperationError,
	type IDataObject,
	type INode,
	type INodeProperties,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { wrapChatModelMessageInput } from '@utils/chatModelMessageWrapper';

import * as common from '../LMChatOpenAi/common';
import { LmChatOpenAi } from '../LMChatOpenAi/LmChatOpenAi.node';
import { OpenAiAccountChatModel } from '../LMChatOpenAi/OpenAiAccountChatModel';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');
vi.mock('../LMChatOpenAi/common');
vi.mock('@utils/chatModelMessageWrapper', () => ({
	wrapChatModelMessageInput: vi.fn((model) => model),
}));

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const MockedN8nLlmTracing = vi.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedCommon = vi.mocked(common);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedWrapChatModelMessageInput = vi.mocked(wrapChatModelMessageInput);
const { openAiDefaultHeaders: defaultHeaders } = Container.get(AiConfig);
const JWT_ACCOUNT_CLAIM = 'https://api.openai.com/auth';

function makeOpenAiAccountToken(accountId: string) {
	const payload = Buffer.from(
		JSON.stringify({ [JWT_ACCOUNT_CLAIM]: { chatgpt_account_id: accountId } }),
	).toString('base64url');

	return `test-header.${payload}.test-signature`;
}

describe('LmChatOpenAi', () => {
	let lmChatOpenAi: LmChatOpenAi;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenAI Chat Model',
		typeVersion: 1.2,
		type: 'n8n-nodes-langchain.lmChatOpenAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const node = { ...mockNode, ...nodeOverrides };
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			node,
		) as Mocked<ISupplyDataFunctions>;

		// Setup default mocks
		mockContext.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});
		mockContext.getNode = vi.fn().mockReturnValue(node);
		//@ts-expect-error - Mocking
		mockContext.getNodeParameter = vi.fn();

		// Mock the constructors/functions properly
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return mockContext;
	};

	beforeEach(() => {
		lmChatOpenAi = new LmChatOpenAi();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(lmChatOpenAi.description).toMatchObject({
				displayName: 'OpenAI Chat Model',
				name: 'lmChatOpenAi',
				group: ['transform'],
				version: [1, 1.1, 1.2, 1.3],
				description: 'For advanced usage with an AI chain',
			});
		});

		it('should have correct credentials configuration', () => {
			expect(lmChatOpenAi.description.credentials).toEqual([
				{
					name: 'openAiApi',
					required: true,
					displayOptions: {
						show: {
							authentication: ['apiKey'],
						},
					},
				},
				{
					name: 'openAiOAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth2'],
						},
					},
				},
			]);
		});

		it('should have correct output configuration', () => {
			expect(lmChatOpenAi.description.outputs).toEqual(['ai_languageModel']);
			expect(lmChatOpenAi.description.outputNames).toEqual(['Model']);
		});

		it('should expose Extra Body as an advanced JSON option', () => {
			const options = lmChatOpenAi.description.properties.find(
				(property) => property?.name === 'options',
			);

			expect(options).toBeDefined();
			expect(options).toMatchObject({
				options: expect.arrayContaining([
					expect.objectContaining({
						displayName: 'Extra Body',
						name: 'extraBody',
						type: 'json',
						default: '{}',
					}),
				]),
			});
		});

		it('should hide options the OpenAI account backend cannot honour', () => {
			const optionsProperty = lmChatOpenAi.description.properties.find(
				(property) => property?.name === 'options',
			) as INodeProperties;
			const hiddenAuth = (property?: INodeProperties) =>
				property?.displayOptions?.hide?.['/authentication'];

			expect(
				hiddenAuth(
					lmChatOpenAi.description.properties.find(
						(property) => property?.name === 'responsesApiEnabled',
					),
				),
			).toEqual(['oAuth2']);

			for (const name of [
				'baseURL',
				'extraBody',
				'frequencyPenalty',
				'maxRetries',
				'presencePenalty',
				'responseFormat',
				'temperature',
				'topP',
			]) {
				const matches = (optionsProperty.options as INodeProperties[]).filter(
					(option) => option.name === name,
				);
				expect(matches.length).toBeGreaterThan(0);
				for (const option of matches) {
					expect(hiddenAuth(option)).toEqual(['oAuth2']);
				}
			}

			// Options the Codex backend does honour must stay visible for both auth modes
			for (const name of ['maxTokens', 'timeout']) {
				const option = (optionsProperty.options as INodeProperties[]).find(
					(candidate) => candidate.name === name,
				);
				expect(hiddenAuth(option)).toBeUndefined();
			}
		});

		it('should offer Reasoning Effort to both auth modes', () => {
			const optionsProperty = lmChatOpenAi.description.properties.find(
				(property) => property?.name === 'options',
			) as INodeProperties;
			const variants = (optionsProperty.options as INodeProperties[]).filter(
				(option) => option.name === 'reasoningEffort',
			);

			expect(variants).toHaveLength(2);
			expect(variants[0].displayOptions?.hide?.['/authentication']).toEqual(['oAuth2']);
			expect(variants[0].displayOptions?.show).toHaveProperty('/model');
			expect(variants[1].displayOptions?.show?.['/authentication']).toEqual(['oAuth2']);
			expect(variants[1].displayOptions?.show).toHaveProperty('/openAiAccountModel');
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI instance with basic configuration (version >= 1.2)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });

			// Mock getNodeParameter to handle the proper parameter names for v1.2
			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'apiKey';
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('openAiApi');
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model.value', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					maxRetries: 2,
					configuration: {
						defaultHeaders,
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);

			expect(result).toEqual({
				response: expect.any(Object),
			});
		});

		it('should create ChatOpenAI instance with basic configuration (version < 1.2)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.1 });

			// Mock getNodeParameter to handle the proper parameter names for v1.1
			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					maxRetries: 2,
					configuration: {
						defaultHeaders,
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should handle custom baseURL from options', async () => {
			const customBaseURL = 'https://custom-api.example.com/v1';
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options')
					return {
						baseURL: customBaseURL,
						timeout: 30000,
						maxRetries: 5,
					};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					baseURL: customBaseURL,
					timeout: 30000,
					maxRetries: 5,
					configuration: {
						baseURL: customBaseURL,
						fetchOptions: {
							dispatcher: {},
						},
						defaultHeaders,
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should handle custom baseURL from credentials', async () => {
			const customURL = 'https://custom-openai.example.com/v1';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: customURL,
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					maxRetries: 2,
					configuration: {
						baseURL: customURL,
						fetchOptions: {
							dispatcher: {},
						},
						defaultHeaders,
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should create OpenAI account model with OAuth token-backed credentials', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				oauthTokenData: {
					access_token: makeOpenAiAccountToken('account-1'),
				},
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'oAuth2';
				if (paramName === 'model.value') return 'gpt-5-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('openAiOAuth2Api');
			expect(MockedChatOpenAI).not.toHaveBeenCalled();
			expect(mockedGetProxyAgent).toHaveBeenCalledWith('https://chatgpt.com/backend-api', {
				headersTimeout: undefined,
				bodyTimeout: undefined,
			});
			expect(result.response).toBeInstanceOf(OpenAiAccountChatModel);
			expect(result.response).toMatchObject({ model: 'gpt-5.4-mini' });
			// the Codex prompt conversion already handles empty tool-call content
			expect(mockedWrapChatModelMessageInput).not.toHaveBeenCalled();
		});

		it('should use the selected OpenAI account model for OAuth credentials', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				oauthTokenData: {
					access_token: makeOpenAiAccountToken('account-1'),
				},
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'oAuth2';
				if (paramName === 'openAiAccountModel.value') return 'gpt-5.3-codex';
				if (paramName === 'model.value') return 'gpt-5-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(result.response).toBeInstanceOf(OpenAiAccountChatModel);
			expect(result.response).toMatchObject({ model: 'gpt-5.3-codex' });
		});

		it('should pass supported OpenAI account options to the OAuth model', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				oauthTokenData: {
					access_token: makeOpenAiAccountToken('account-1'),
				},
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'oAuth2';
				if (paramName === 'model.value') return 'gpt-5-mini';
				if (paramName === 'options')
					return {
						maxTokens: 1000,
						timeout: 45000,
						reasoningEffort: 'high',
					};
				return undefined;
			});

			const result = await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(result.response).toBeInstanceOf(OpenAiAccountChatModel);
			expect(result.response).toMatchObject({
				maxOutputTokens: 1000,
				timeout: 45000,
				reasoningEffort: 'high',
			});
		});

		it('should handle custom headers from credentials', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					maxRetries: 2,
					configuration: {
						defaultHeaders: {
							...defaultHeaders,
							'X-Custom-Header': 'custom-value',
						},
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should handle all available options v1.2', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });
			const options = {
				frequencyPenalty: 0.5,
				maxTokens: 1000,
				presencePenalty: 0.3,
				temperature: 0.8,
				topP: 0.9,
				timeout: 45000,
				maxRetries: 3,
				responseFormat: 'json_object' as const,
				reasoningEffort: 'high' as const,
			};

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					frequencyPenalty: 0.5,
					maxTokens: 1000,
					presencePenalty: 0.3,
					temperature: 0.8,
					topP: 0.9,
					timeout: 45000,
					maxRetries: 3,
					configuration: {
						defaultHeaders,
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {
						response_format: { type: 'json_object' },
						reasoning_effort: 'high',
					},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should only add valid reasoning effort to modelKwargs', async () => {
			const mockContext = setupMockContext();
			const options = {
				reasoningEffort: 'invalid' as 'low' | 'medium' | 'high',
			};

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'gpt-4o-mini',
					modelKwargs: {}, // Should not include invalid reasoning_effort
				}),
			);
		});

		it('should create N8nLlmTracing callback', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext, { redactedHeaders: [] });
		});

		it('should pass the declared header name to N8nLlmTracing', async () => {
			const mockContext = setupMockContext();
			mockContext.getCredentials = vi.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-custom-header',
				headerValue: 'secret-value',
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext, {
				redactedHeaders: ['x-custom-header'],
			});
		});

		it('should create failed attempt handler', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(
				mockContext,
				expect.any(Function), // openAiFailedAttemptHandler
			);
		});

		it('should use default values for maxRetries when not provided', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			// timeout is now controlled at the undici level via fetchOptions dispatcher
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					maxRetries: 2,
				}),
			);
		});

		it('should set supportsStrictToolCalling to false for OpenAI-compatible backends', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					supportsStrictToolCalling: false,
				}),
			);
		});

		it('should prioritize options.baseURL over credentials.url', async () => {
			const optionsBaseURL = 'https://options-api.example.com/v1';
			const credentialsURL = 'https://credentials-api.example.com/v1';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: credentialsURL,
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options')
					return {
						baseURL: optionsBaseURL,
					};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: {
						baseURL: optionsBaseURL,
						fetchOptions: {
							dispatcher: {},
						},
						defaultHeaders,
					},
				}),
			);
		});

		it('should handle text response format correctly v1.2', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });
			const options = {
				responseFormat: 'text' as const,
			};

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						response_format: { type: 'text' },
					},
				}),
			);
		});

		it('should handle all reasoning effort values correctly', async () => {
			const reasoningEffortValues = ['low', 'medium', 'high'] as const;

			for (const effort of reasoningEffortValues) {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model.value') return 'gpt-4o-mini';
					if (paramName === 'options')
						return {
							reasoningEffort: effort,
						};
					return undefined;
				});

				await lmChatOpenAi.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: {
							reasoning_effort: effort,
						},
					}),
				);

				vi.clearAllMocks();
			}
		});

		it('should merge extraBody into modelKwargs for Chat Completions', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });
			const options = {
				extraBody: '{"enable_search":true,"custom_temperature":0.25}',
				responseFormat: 'json_object' as const,
				reasoningEffort: 'high' as const,
			};

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						response_format: { type: 'json_object' },
						reasoning_effort: 'high',
						enable_search: true,
						custom_temperature: 0.25,
					},
				}),
			);
		});

		it('should merge extraBody into modelKwargs for Responses API', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });
			const options = {
				extraBody: '{"enable_search":true}',
				promptCacheKey: 'cache_key_1',
			};
			const mockResponsesParams = {
				prompt_cache_key: 'cache_key_1',
			};

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'responsesApiEnabled') return true;
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			//@ts-expect-error - Mocking
			mockedCommon.prepareAdditionalResponsesParams = vi.fn().mockReturnValue(mockResponsesParams);
			//@ts-expect-error - Mocking
			mockedCommon.formatBuiltInTools = vi.fn().mockReturnValue([]);

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					useResponsesApi: true,
					modelKwargs: {
						prompt_cache_key: 'cache_key_1',
						enable_search: true,
					},
				}),
			);
		});

		it('should reject invalid extraBody JSON values', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return { extraBody: 'not json' };
				return undefined;
			});

			const result = lmChatOpenAi.supplyData.call(mockContext, 0);
			await expect(result).rejects.toThrow('The value in the "Extra Body" field is not valid JSON');
			await expect(result).rejects.toThrow(NodeOperationError);
		});

		it.each(['[1,2]', '"invalid"', 'true', 'null'])(
			'should reject extraBody JSON values that are not objects: %s',
			async (extraBody) => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model.value') return 'gpt-4o-mini';
					if (paramName === 'options') return { extraBody };
					return undefined;
				});

				const result = lmChatOpenAi.supplyData.call(mockContext, 0);
				await expect(result).rejects.toThrow(
					'The value in the "Extra Body" field must be a JSON object',
				);
				await expect(result).rejects.toThrow(NodeOperationError);
			},
		);

		it('should wrap Chat Completions models to normalize empty tool-call content', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });
			const wrappedModel = { wrapped: true };

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});
			mockedWrapChatModelMessageInput.mockReturnValueOnce(wrappedModel as never);

			const result = await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockedWrapChatModelMessageInput).toHaveBeenCalledTimes(1);
			expect(mockedWrapChatModelMessageInput).toHaveBeenCalledWith(
				MockedChatOpenAI.mock.instances[0],
			);
			expect(result.response).toBe(wrappedModel);
		});

		it('should not wrap Responses API models', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'responsesApiEnabled') return true;
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});
			//@ts-expect-error - Mocking
			mockedCommon.formatBuiltInTools = vi.fn().mockReturnValue([]);

			const result = await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockedWrapChatModelMessageInput).not.toHaveBeenCalled();
			expect(result.response).toBe(MockedChatOpenAI.mock.instances[0]);
		});
	});

	describe('methods', () => {
		beforeEach(() => {
			setupMockContext();
		});

		it('should have searchModels method', () => {
			expect(lmChatOpenAi.methods).toEqual({
				listSearch: {
					searchModels: expect.any(Function),
				},
			});
		});

		it('should force Responses API and include additional params for v1.3', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			const options: IDataObject = {
				conversationId: 'conv_123',
				promptCacheKey: 'cache_key_1',
				safetyIdentifier: 'user-42',
				serviceTier: 'priority' as const,
				topLogprobs: 10,
				metadata: '{"team":"ai"}',
				textFormat: {
					textOptions: [{ type: 'json_object', verbosity: 'high' }],
				},
				promptConfig: {
					promptOptions: [{ promptId: 'p_1', version: '1', variables: '{"name":"n8n"}' }],
				},
			};

			const mockResponsesParams = {
				custom: true,
			};

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'responsesApiEnabled') return true;
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			//@ts-expect-error - Mocking
			mockedCommon.prepareAdditionalResponsesParams = vi.fn().mockReturnValue(mockResponsesParams);

			//@ts-expect-error - Mocking
			mockedCommon.formatBuiltInTools = vi.fn().mockReturnValue([]);

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockedCommon.prepareAdditionalResponsesParams).toHaveBeenCalledWith(options);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					useResponsesApi: true,
					modelKwargs: mockResponsesParams,
				}),
			);
		});

		it('should attach built-in tools to model metadata (v1.3)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			const builtInTools: IDataObject = {
				webSearch: { searchContextSize: 'high', allowedDomains: 'google.com, wikipedia.org' },
				fileSearch: { vectorStoreIds: '["vs_1"]', filters: '{}', maxResults: 2 },
				codeInterpreter: true,
			};

			const mockTools = [
				{
					customTools: true,
				},
			];

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'responsesApiEnabled') return true;
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				if (paramName === 'builtInTools') return builtInTools;
				return undefined;
			});

			//@ts-expect-error - Mocking
			mockedCommon.formatBuiltInTools = vi.fn().mockReturnValue(mockTools);

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockedCommon.formatBuiltInTools).toHaveBeenCalledWith(builtInTools);

			const instance: unknown = MockedChatOpenAI.mock.instances[0];
			expect(instance).toBeDefined();
			expect((instance as { metadata?: { tools?: unknown } }).metadata).toBeDefined();
			expect((instance as { metadata?: { tools?: unknown } }).metadata?.tools).toEqual(mockTools);
		});
	});
});
