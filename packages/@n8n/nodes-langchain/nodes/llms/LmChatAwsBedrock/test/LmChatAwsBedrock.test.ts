import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { ChatBedrockConverse } from '@langchain/aws';
import { makeN8nLlmFailedAttemptHandler, getNodeProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatAwsBedrock } from '../LmChatAwsBedrock.node';

vi.mock('@langchain/aws', () => ({
	ChatBedrockConverse: vi.fn(),
}));
vi.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: vi
		.fn()
		.mockReturnValue({ displayName: '', name: 'notice', type: 'notice', default: '' }),
	makeN8nLlmFailedAttemptHandler: vi.fn(),
	N8nLlmTracing: vi.fn(),
	getNodeProxyAgent: vi.fn(),
}));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
	BedrockRuntimeClient: vi.fn(),
}));
const MockedBedrockRuntimeClient = vi.mocked(BedrockRuntimeClient);
const MockedChatBedrockConverse = vi.mocked(ChatBedrockConverse);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetNodeProxyAgent = vi.mocked(getNodeProxyAgent);

describe('LmChatAwsBedrock', () => {
	let node: LmChatAwsBedrock;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'AWS Bedrock Chat Model',
		typeVersion: 1.1,
		type: 'n8n-nodes-langchain.lmChatAwsBedrock',
		position: [0, 0],
		parameters: {},
	};

	const defaultCredentials = {
		region: 'us-east-1',
		secretAccessKey: 'test-secret',
		accessKeyId: 'test-key',
		sessionToken: '',
	};

	const setupMockContext = (overrides: { credentials?: Record<string, unknown> } = {}) => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = vi
			.fn()
			.mockResolvedValue(overrides.credentials ?? defaultCredentials);
		mockContext.getNode = vi.fn().mockReturnValue(mockNode);
		//@ts-expect-error - Mocking
		mockContext.getNodeParameter = vi.fn();

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetNodeProxyAgent.mockReturnValue(undefined);

		return mockContext;
	};

	beforeEach(() => {
		node = new LmChatAwsBedrock();
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should use credential region for standard model IDs', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'amazon.nova-pro-v1:0';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'us-east-1' }),
			);
			expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'us-east-1' }),
			);
		});

		it('should use credential region for inference profile IDs (not ARNs)', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'eu.amazon.nova-pro-v1:0';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'us-east-1' }),
			);
			expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'us-east-1' }),
			);
		});

		it('should extract region from inference profile ARN and use it', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model')
					return 'arn:aws:bedrock:eu-west-3:851725222089:inference-profile/eu.amazon.nova-pro-v1:0';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'eu-west-3' }),
			);
			expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'eu-west-3' }),
			);
		});

		it('should extract region from foundation model ARN', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model')
					return 'arn:aws:bedrock:ap-southeast-1::foundation-model/anthropic.claude-v2';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'ap-southeast-1' }),
			);
			expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'ap-southeast-1' }),
			);
		});

		it('should pass model name and options to ChatBedrockConverse', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'amazon.nova-pro-v1:0';
				if (paramName === 'options') return { temperature: 0.5, maxTokensToSample: 1000 };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'amazon.nova-pro-v1:0',
					temperature: 0.5,
					maxTokens: 1000,
				}),
			);
		});
	});
});
