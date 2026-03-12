/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatN8nAiGateway } from '../LmChatN8nAiGateway.node';

jest.mock('@langchain/openai');
jest.mock('@n8n/ai-utilities');

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

describe('LmChatN8nAiGateway', () => {
	let node: LmChatN8nAiGateway;

	const mockNodeDef: INode = {
		id: '1',
		name: 'n8n AI Gateway Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatN8nAiGateway',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (
		nodeOverrides: Partial<INode> = {},
		credentialOverrides: Record<string, unknown> = {},
		workflowSettings: Record<string, unknown> = {},
	) => {
		const nodeDef = { ...mockNodeDef, ...nodeOverrides };
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			nodeDef,
		) as jest.Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://openrouter.ai/api/v1',
			defaultCategory: 'balanced',
			defaultModel: 'openai/gpt-4.1-nano',
			categoryMap: JSON.stringify({
				balanced: 'openai/gpt-4.1-nano',
				cheapest: 'openai/gpt-4.1-nano',
				fastest: 'google/gemini-2.0-flash-001',
				'best-quality': 'anthropic/claude-sonnet-4',
				reasoning: 'openai/o4-mini',
			}),
			...credentialOverrides,
		});
		ctx.getNode = jest.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
			if (paramName === 'options') return {};
			return undefined;
		});
		ctx.getWorkflowSettings = jest.fn().mockReturnValue(workflowSettings);

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatN8nAiGateway();
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'n8n AI Gateway Model',
				name: 'lmChatN8nAiGateway',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require n8nAiGatewayApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'n8nAiGatewayApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});

		it('should have no model parameter in properties', () => {
			const modelProp = node.description.properties.find((p) => p?.name === 'model');
			expect(modelProp).toBeUndefined();
		});
	});

	describe('supplyData', () => {
		it('should resolve balanced category to openai/gpt-4.1-nano by default', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('n8nAiGatewayApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-key',
					model: 'openai/gpt-4.1-nano',
				}),
			);
		});

		it('should resolve credential defaultCategory to correct model', async () => {
			const ctx = setupMockContext({}, { defaultCategory: 'fastest' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'google/gemini-2.0-flash-001',
				}),
			);
		});

		it('should use workflow-level category override over credential default', async () => {
			const ctx = setupMockContext(
				{},
				{ defaultCategory: 'balanced' },
				{ aiGatewayCategory: 'reasoning' },
			);

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'openai/o4-mini',
				}),
			);
		});

		it('should ignore workflow category when set to DEFAULT', async () => {
			const ctx = setupMockContext(
				{},
				{ defaultCategory: 'cheapest' },
				{ aiGatewayCategory: 'DEFAULT' },
			);

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'openai/gpt-4.1-nano',
				}),
			);
		});

		it('should fall back to balanced when no category is set', async () => {
			const ctx = setupMockContext({}, { defaultCategory: undefined, defaultModel: undefined });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'openai/gpt-4.1-nano',
				}),
			);
		});

		it('should fall back to defaultModel for unknown categories', async () => {
			const ctx = setupMockContext(
				{},
				{ defaultCategory: 'unknown-category', defaultModel: 'anthropic/claude-sonnet-4' },
			);

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'anthropic/claude-sonnet-4',
				}),
			);
		});

		it('should use defaultModel from credential when category is manual', async () => {
			const ctx = setupMockContext(
				{},
				{ defaultCategory: 'manual', defaultModel: 'anthropic/claude-sonnet-4' },
			);

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'anthropic/claude-sonnet-4',
				}),
			);
		});

		it('should fall back to gpt-4.1-nano when manual category has no defaultModel', async () => {
			const ctx = setupMockContext({}, { defaultCategory: 'manual', defaultModel: undefined });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'openai/gpt-4.1-nano',
				}),
			);
		});

		it('should use workflow-level aiGatewayModel when category is manual', async () => {
			const ctx = setupMockContext(
				{},
				{ defaultCategory: 'manual', defaultModel: 'openai/gpt-4.1-nano' },
				{ aiGatewayCategory: 'manual', aiGatewayModel: 'anthropic/claude-sonnet-4' },
			);

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'anthropic/claude-sonnet-4',
				}),
			);
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'options')
					return {
						temperature: 0.5,
						maxTokens: 2000,
						topP: 0.9,
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
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should set baseURL from credentials', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'https://openrouter.ai/api/v1',
					}),
				}),
			);
		});

		it('should include the OpenRouter fetch wrapper', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs?.configuration?.fetch).toEqual(expect.any(Function));
		});
	});
});
