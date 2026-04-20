import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockEmbeddings } from '@langchain/aws';
import { getNodeProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { resolveAwsCredentials } from '@utils/aws/resolveAwsCredentials';

import { EmbeddingsAwsBedrock } from '../EmbeddingsAwsBedrock.node';

jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@langchain/aws', () => ({
	BedrockEmbeddings: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: jest
		.fn()
		.mockReturnValue({ displayName: '', name: 'notice', type: 'notice', default: '' }),
	getNodeProxyAgent: jest.fn(),
	logWrapper: <T>(x: T) => x,
}));
jest.mock('@utils/aws/resolveAwsCredentials', () => ({
	resolveAwsCredentials: jest.fn(),
}));

const MockedBedrockRuntimeClient = jest.mocked(BedrockRuntimeClient);
const MockedBedrockEmbeddings = jest.mocked(BedrockEmbeddings);
const mockedGetNodeProxyAgent = jest.mocked(getNodeProxyAgent);
const mockedResolveAwsCredentials = jest.mocked(resolveAwsCredentials);

describe('EmbeddingsAwsBedrock', () => {
	const mockNode: INode = {
		id: '1',
		name: 'Embeddings AWS Bedrock',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.embeddingsAwsBedrock',
		position: [0, 0],
		parameters: {},
	};

	function mockContext(model: string) {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as jest.Mocked<ISupplyDataFunctions>;
		ctx.getNodeParameter = jest
			.fn()
			.mockImplementation((name: string) => (name === 'model' ? model : undefined));
		ctx.getCredentials = jest.fn().mockResolvedValue({});
		ctx.getNode = jest.fn().mockReturnValue(mockNode);
		return ctx;
	}

	beforeEach(() => {
		jest.clearAllMocks();
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		MockedBedrockRuntimeClient.mockImplementation(() => ({}) as BedrockRuntimeClient);
	});

	it('wires resolveAwsCredentials output through BedrockRuntimeClient', async () => {
		const fakeProvider = jest.fn();
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'us-east-1',
			credentials: fakeProvider,
		});

		const node = new EmbeddingsAwsBedrock();
		await node.supplyData.call(mockContext('amazon.titan-embed-text-v1'), 0);

		expect(mockedResolveAwsCredentials).toHaveBeenCalledTimes(1);
		const lastConfig = MockedBedrockRuntimeClient.mock.calls.at(-1)?.[0];
		expect(lastConfig?.credentials).toBe(fakeProvider);
		expect(lastConfig?.region).toBe('us-east-1');
	});

	it('calls getNodeProxyAgent with the concrete Bedrock endpoint URL', async () => {
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'eu-west-2',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
		});
		const node = new EmbeddingsAwsBedrock();
		await node.supplyData.call(mockContext('amazon.titan-embed-text-v1'), 0);
		expect(mockedGetNodeProxyAgent).toHaveBeenCalledWith(
			'https://bedrock-runtime.eu-west-2.amazonaws.com',
		);
	});

	it('accepts arbitrary model values that are not in the loadOptions response', async () => {
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'us-east-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
		});
		const node = new EmbeddingsAwsBedrock();
		await node.supplyData.call(mockContext('custom.model.not-in-list-v1'), 0);
		expect(MockedBedrockEmbeddings).toHaveBeenCalledWith(
			expect.objectContaining({ model: 'custom.model.not-in-list-v1' }),
		);
	});
});
