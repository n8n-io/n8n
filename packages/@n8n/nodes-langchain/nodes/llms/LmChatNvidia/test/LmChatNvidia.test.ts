/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatNvidia } from '../LmChatNvidia.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

describe('LmChatNvidia', () => {
	let node: LmChatNvidia;

	const mockNodeDef: INode = {
		id: '1',
		name: 'NVIDIA Nemotron Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatNvidia',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (
		credentialOverrides: Partial<{ apiKey: string; url: string }> = {},
		nodeOverrides: Partial<INode> = {},
	) => {
		const nodeDef = { ...mockNodeDef, ...nodeOverrides };
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			nodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://integrate.api.nvidia.com/v1',
			...credentialOverrides,
		});
		ctx.getNode = vi.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'nvidia/llama-3.1-nemotron-70b-instruct';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatNvidia();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'NVIDIA Nemotron Chat Model',
				name: 'lmChatNvidia',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require a single nvidiaApi credential', () => {
			expect(node.description.credentials).toEqual([{ name: 'nvidiaApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});

		it('should filter to Nemotron models in loadOptions', () => {
			const modelProp = node.description.properties.find((p) => p?.name === 'model');
			expect(modelProp).toBeDefined();
			const postReceive = (modelProp?.typeOptions as any)?.loadOptions?.routing?.output
				?.postReceive as Array<{ type: string; properties: { pass?: string } }>;
			const filterStep = postReceive.find((step) => step.type === 'filter');
			expect(filterStep?.properties.pass).toMatch(/nemotron/i);
		});
	});

	describe('supplyData', () => {
		it('should pass credential url to ChatOpenAI configuration', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('nvidiaApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-key',
					model: 'nvidia/llama-3.1-nemotron-70b-instruct',
					configuration: expect.objectContaining({
						baseURL: 'https://integrate.api.nvidia.com/v1',
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should accept a self-hosted base URL on the same credential', async () => {
			const ctx = setupMockContext({ url: 'http://localhost:8000/v1', apiKey: '' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'http://localhost:8000/v1',
					}),
				}),
			);
		});

		it('should fall back to a placeholder apiKey when the credential has none', async () => {
			const ctx = setupMockContext({ apiKey: '' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'unused',
				}),
			);
		});

		it('should pass options through to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'nvidia/llama-3.1-nemotron-70b-instruct';
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
				if (paramName === 'model') return 'nvidia/llama-3.1-nemotron-70b-instruct';
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
	});
});
