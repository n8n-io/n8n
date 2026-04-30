import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockEmbeddings } from '@langchain/aws';
import { getNodeProxyAgent, logWrapper } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { resolveAwsCredentials } from '../../../../utils/aws';
import { EmbeddingsAwsBedrock } from '../EmbeddingsAwsBedrock.node';

jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@langchain/aws');
jest.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: jest
		.fn()
		.mockReturnValue({ displayName: '', name: 'notice', type: 'notice', default: '' }),
	getNodeProxyAgent: jest.fn(),
	logWrapper: jest.fn().mockImplementation((embeddings) => embeddings),
}));
jest.mock('../../../../utils/aws', () => ({
	awsNodeCredentials: [],
	awsNodeAuthOptions: { displayName: '', name: 'authentication', type: 'options', default: 'iam' },
	resolveAwsCredentials: jest.fn(),
}));

const MockedBedrockRuntimeClient = jest.mocked(BedrockRuntimeClient);
const MockedBedrockEmbeddings = jest.mocked(BedrockEmbeddings);
const mockedGetNodeProxyAgent = jest.mocked(getNodeProxyAgent);
const mockedLogWrapper = jest.mocked(logWrapper);
const mockedResolveAwsCredentials = jest.mocked(resolveAwsCredentials);

const defaultResolvedCredentials = {
	region: 'us-east-1',
	credentials: {
		accessKeyId: 'test-key',
		secretAccessKey: 'test-secret',
	},
};

describe('EmbeddingsAwsBedrock', () => {
	let node: EmbeddingsAwsBedrock;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Embeddings AWS Bedrock',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.embeddingsAwsBedrock',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as jest.Mocked<ISupplyDataFunctions>;

		mockContext.getNode = jest.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = jest.fn();

		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		MockedBedrockRuntimeClient.mockImplementation(() => ({}) as BedrockRuntimeClient);
		MockedBedrockEmbeddings.mockImplementation(() => ({}) as unknown as BedrockEmbeddings);
		mockedResolveAwsCredentials.mockResolvedValue(defaultResolvedCredentials);

		return mockContext;
	};

	beforeEach(() => {
		node = new EmbeddingsAwsBedrock();
		jest.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should use credential region', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'amazon.titan-embed-text-v1';
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(mockedResolveAwsCredentials).toHaveBeenCalledWith(ctx, 0);
			expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
				expect.objectContaining({ region: 'us-east-1' }),
			);
			expect(MockedBedrockEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'amazon.titan-embed-text-v1',
					region: 'us-east-1',
				}),
			);
		});

		it('should pass resolved credentials to BedrockRuntimeClient', async () => {
			const ctx = setupMockContext();
			mockedResolveAwsCredentials.mockResolvedValueOnce({
				region: 'us-west-2',
				credentials: {
					accessKeyId: 'assumed-access-key',
					secretAccessKey: 'assumed-secret',
					sessionToken: 'assumed-token',
				},
			});
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'amazon.titan-embed-text-v1';
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
				expect.objectContaining({
					region: 'us-west-2',
					credentials: {
						accessKeyId: 'assumed-access-key',
						secretAccessKey: 'assumed-secret',
						sessionToken: 'assumed-token',
					},
				}),
			);
		});

		it('should propagate errors from credential resolution', async () => {
			const ctx = setupMockContext();
			mockedResolveAwsCredentials.mockRejectedValueOnce(new Error('STS AssumeRole failed'));
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'amazon.titan-embed-text-v1';
				return undefined;
			});

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('STS AssumeRole failed');
		});

		it('should wrap embeddings with logWrapper', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'amazon.titan-embed-text-v1';
				return undefined;
			});

			const result = await node.supplyData.call(ctx, 0);

			expect(mockedLogWrapper).toHaveBeenCalledWith(expect.any(Object), ctx);
			expect(result).toHaveProperty('response');
		});
	});
});
