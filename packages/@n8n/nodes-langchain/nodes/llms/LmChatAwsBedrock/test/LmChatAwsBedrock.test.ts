import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { ChatBedrockConverse } from '@langchain/aws';
import {
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getNodeProxyAgent,
} from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatAwsBedrock } from '../LmChatAwsBedrock.node';

jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@langchain/aws');
jest.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: jest
		.fn()
		.mockReturnValue({ displayName: '', name: 'notice', type: 'notice', default: '' }),
	makeN8nLlmFailedAttemptHandler: jest.fn(),
	N8nLlmTracing: jest.fn(),
	getNodeProxyAgent: jest.fn(),
}));

const MockedBedrockRuntimeClient = jest.mocked(BedrockRuntimeClient);
const MockedChatBedrockConverse = jest.mocked(ChatBedrockConverse);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetNodeProxyAgent = jest.mocked(getNodeProxyAgent);

describe('LmChatAwsBedrock', () => {
	let node: LmChatAwsBedrock;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

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
		) as jest.Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = jest
			.fn()
			.mockResolvedValue(overrides.credentials ?? defaultCredentials);
		mockContext.getNode = jest.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = jest.fn();

		MockedN8nLlmTracing.mockImplementation(() => ({}) as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		MockedBedrockRuntimeClient.mockImplementation(() => ({}) as BedrockRuntimeClient);
		MockedChatBedrockConverse.mockImplementation(() => ({}) as unknown as ChatBedrockConverse);

		return mockContext;
	};

	beforeEach(() => {
		node = new LmChatAwsBedrock();
		jest.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should use credential region for standard model IDs', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
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
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
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
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
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
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
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
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
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
