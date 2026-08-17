/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatMelious } from '../LmChatMelious.node';
import { searchModels } from '../methods/searchModels';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

const MELIOUS_BASE_URL = 'https://api.melious.ai/v1';

describe('LmChatMelious', () => {
	let node: LmChatMelious;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Melious Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatMelious',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const nodeDef = { ...mockNodeDef, ...nodeOverrides };
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			nodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'sk-mel-test-key',
			url: MELIOUS_BASE_URL,
		});
		ctx.getNode = vi.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'glm-5.1';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatMelious();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'Melious Chat Model',
				name: 'lmChatMelious',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require meliousApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'meliousApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});

		it('should default to glm-5.1 and offer a searchable model list', () => {
			// `getConnectionHintNoticeField` is mocked away, so it contributes an empty slot
			const model = node.description.properties
				.filter(Boolean)
				.find((property) => property.name === 'model');

			expect(model).toMatchObject({
				type: 'resourceLocator',
				default: { mode: 'list', value: 'glm-5.1' },
			});
			expect(model?.modes?.[0]).toMatchObject({
				name: 'list',
				typeOptions: { searchListMethod: 'searchModels', searchable: true },
			});
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with the Melious base URL', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('meliousApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'sk-mel-test-key',
					model: 'glm-5.1',
					maxRetries: 2,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					configuration: expect.objectContaining({
						baseURL: MELIOUS_BASE_URL,
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'qwen3.8-max';
				if (paramName === 'options')
					return {
						temperature: 0.5,
						maxTokens: 2000,
						topP: 0.9,
						frequencyPenalty: 0.3,
						presencePenalty: 0.2,
						timeout: 60000,
						maxRetries: 5,
					};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'qwen3.8-max',
					temperature: 0.5,
					maxTokens: 2000,
					topP: 0.9,
					frequencyPenalty: 0.3,
					presencePenalty: 0.2,
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should set response_format in modelKwargs when responseFormat is provided', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'glm-5.1';
				if (paramName === 'options') return { responseFormat: 'json_object' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { response_format: { type: 'json_object' } },
				}),
			);
		});

		it('should not set modelKwargs when no responseFormat', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should configure proxy agent with credentials URL', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				MELIOUS_BASE_URL,
				expect.objectContaining({
					headersTimeout: undefined,
					bodyTimeout: undefined,
				}),
			);
		});

		it('should configure proxy agent with custom timeout', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'glm-5.1';
				if (paramName === 'options') return { timeout: 120000 };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				MELIOUS_BASE_URL,
				expect.objectContaining({
					headersTimeout: 120000,
					bodyTimeout: 120000,
				}),
			);
		});
	});

	describe('searchModels', () => {
		const buildLoadOptionsContext = (data: Array<{ id: string; _meta?: { type?: string } }>) =>
			({
				getCredentials: vi.fn().mockResolvedValue({ url: MELIOUS_BASE_URL }),
				helpers: {
					httpRequestWithAuthentication: vi.fn().mockResolvedValue({ data }),
				},
			}) as unknown as Mocked<ILoadOptionsFunctions>;

		it('should request the model metadata and surface only chat models, sorted', async () => {
			const ctx = buildLoadOptionsContext([
				{ id: 'qwen3.8-max', _meta: { type: 'chat' } },
				{ id: 'whisper-large-v3', _meta: { type: 'audio' } },
				{ id: 'glm-5.1', _meta: { type: 'chat' } },
				{ id: 'bge-m3', _meta: { type: 'embeddings' } },
				{ id: 'flux-2-dev', _meta: { type: 'image' } },
				{ id: 'qwen3guard-gen-8b', _meta: { type: 'guardrail' } },
			]);

			const result = await searchModels.call(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('meliousApi', {
				url: `${MELIOUS_BASE_URL}/models`,
				qs: { include_meta: true },
			});
			expect(result.results).toEqual([
				{ name: 'glm-5.1', value: 'glm-5.1' },
				{ name: 'qwen3.8-max', value: 'qwen3.8-max' },
			]);
		});

		it('should apply a case-insensitive search filter', async () => {
			const ctx = buildLoadOptionsContext([
				{ id: 'glm-5.1', _meta: { type: 'chat' } },
				{ id: 'glm-5.2', _meta: { type: 'chat' } },
				{ id: 'kimi-k3', _meta: { type: 'chat' } },
			]);

			const result = await searchModels.call(ctx, 'GLM');

			expect(result.results).toEqual([
				{ name: 'glm-5.1', value: 'glm-5.1' },
				{ name: 'glm-5.2', value: 'glm-5.2' },
			]);
		});

		it('should keep models that carry no metadata', async () => {
			const ctx = buildLoadOptionsContext([{ id: 'glm-5.1' }, { id: 'kimi-k3', _meta: {} }]);

			const result = await searchModels.call(ctx);

			expect(result.results).toEqual([
				{ name: 'glm-5.1', value: 'glm-5.1' },
				{ name: 'kimi-k3', value: 'kimi-k3' },
			]);
		});

		it('should return an empty list when the response has no models', async () => {
			const ctx = {
				getCredentials: vi.fn().mockResolvedValue({ url: MELIOUS_BASE_URL }),
				helpers: {
					httpRequestWithAuthentication: vi.fn().mockResolvedValue({}),
				},
			} as unknown as Mocked<ILoadOptionsFunctions>;

			const result = await searchModels.call(ctx);

			expect(result.results).toEqual([]);
		});
	});
});
