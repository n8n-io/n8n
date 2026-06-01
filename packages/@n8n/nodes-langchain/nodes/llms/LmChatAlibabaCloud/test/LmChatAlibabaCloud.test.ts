/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatAlibabaCloud } from '../LmChatAlibabaCloud.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

describe('LmChatAlibabaCloud', () => {
	let node: LmChatAlibabaCloud;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Alibaba Cloud Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatAlibabaCloud',
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
			apiKey: 'test-dashscope-key',
			region: 'ap-southeast-1',
			url: 'https://dashscope-intl.aliyuncs.com',
		});
		ctx.getNode = vi.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'qwen-plus';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatAlibabaCloud();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'Alibaba Cloud Chat Model',
				name: 'lmChatAlibabaCloud',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require alibabaCloudApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'alibabaCloudApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with DashScope base URL', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('alibabaCloudApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-dashscope-key',
					model: 'qwen-plus',
					maxRetries: 2,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					configuration: expect.objectContaining({
						baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'qwen-turbo';
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
					model: 'qwen-turbo',
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
				if (paramName === 'model') return 'qwen-plus';
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
				'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
				expect.objectContaining({
					headersTimeout: undefined,
					bodyTimeout: undefined,
				}),
			);
		});

		it('should configure proxy agent with custom timeout', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'qwen-plus';
				if (paramName === 'options') return { timeout: 120000 };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
				expect.objectContaining({
					headersTimeout: 120000,
					bodyTimeout: 120000,
				}),
			);
		});

		it('should use US region base URL', async () => {
			const ctx = setupMockContext();
			ctx.getCredentials = vi.fn().mockResolvedValue({
				apiKey: 'test-key',
				region: 'us-east-1',
				url: 'https://dashscope-us.aliyuncs.com',
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
					}),
				}),
			);
		});

		it('should use Frankfurt region base URL with workspace ID', async () => {
			const ctx = setupMockContext();
			ctx.getCredentials = vi.fn().mockResolvedValue({
				apiKey: 'test-key',
				region: 'eu-central-1',
				workspaceId: 'ws-abc123',
				url: 'https://ws-abc123.eu-central-1.maas.aliyuncs.com',
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'https://ws-abc123.eu-central-1.maas.aliyuncs.com/compatible-mode/v1',
					}),
				}),
			);
		});

		it('should use China (Beijing) region base URL', async () => {
			const ctx = setupMockContext();
			ctx.getCredentials = vi.fn().mockResolvedValue({
				apiKey: 'test-key',
				region: 'cn-beijing',
				url: 'https://dashscope.aliyuncs.com',
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
					}),
				}),
			);
		});

		it('should use Hong Kong region base URL', async () => {
			const ctx = setupMockContext();
			ctx.getCredentials = vi.fn().mockResolvedValue({
				apiKey: 'test-key',
				region: 'cn-hongkong',
				url: 'https://cn-hongkong.dashscope.aliyuncs.com',
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'https://cn-hongkong.dashscope.aliyuncs.com/compatible-mode/v1',
					}),
				}),
			);
		});

		it('should use gateway URL when provided via credentials', async () => {
			const ctx = setupMockContext();
			ctx.getCredentials = vi.fn().mockResolvedValue({
				apiKey: 'gateway-jwt-token',
				url: 'https://gateway.example.com/v1/gateway/alibaba',
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'gateway-jwt-token',
					configuration: expect.objectContaining({
						baseURL: 'https://gateway.example.com/v1/gateway/alibaba/compatible-mode/v1',
					}),
				}),
			);
		});

		it('should throw when eu-central-1 is selected without workspaceId', async () => {
			const ctx = setupMockContext();
			ctx.getCredentials = vi.fn().mockResolvedValue({
				apiKey: 'test-key',
				region: 'eu-central-1',
				url: 'https://undefined.eu-central-1.maas.aliyuncs.com',
			});

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('Workspace ID');
		});
	});
});
