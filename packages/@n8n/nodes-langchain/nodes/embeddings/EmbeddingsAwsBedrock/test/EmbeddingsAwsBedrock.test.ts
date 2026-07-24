import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockEmbeddings } from '@langchain/aws';
import { getNodeProxyAgent } from '@n8n/ai-utilities';
import { resolveAwsCredentials } from '@utils/aws/resolveAwsCredentials';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { UserError, type INode, type ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsAwsBedrock } from '../EmbeddingsAwsBedrock.node';

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
	BedrockRuntimeClient: vi.fn(),
}));
vi.mock('@langchain/aws', () => ({
	BedrockEmbeddings: vi.fn().mockImplementation(function () {
		return {};
	}),
}));
vi.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: vi
		.fn()
		.mockReturnValue({ displayName: '', name: 'notice', type: 'notice', default: '' }),
	getNodeProxyAgent: vi.fn(),
	logWrapper: <T>(x: T) => x,
}));
vi.mock('@utils/aws/resolveAwsCredentials', () => ({
	resolveAwsCredentials: vi.fn(),
}));

const MockedBedrockRuntimeClient = vi.mocked(BedrockRuntimeClient);
const MockedBedrockEmbeddings = vi.mocked(BedrockEmbeddings);
const mockedGetNodeProxyAgent = vi.mocked(getNodeProxyAgent);
const mockedResolveAwsCredentials = vi.mocked(resolveAwsCredentials);

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
		) as Mocked<ISupplyDataFunctions>;
		ctx.getNodeParameter = vi
			.fn()
			.mockImplementation((name: string) => (name === 'model' ? model : undefined));
		ctx.getCredentials = vi.fn().mockResolvedValue({});
		ctx.getNode = vi.fn().mockReturnValue(mockNode);
		return ctx;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		MockedBedrockRuntimeClient.mockImplementation(function () {
			return {};
		} as unknown as typeof BedrockRuntimeClient);
	});

	it('wires resolveAwsCredentials output through BedrockRuntimeClient', async () => {
		const fakeProvider = vi.fn();
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

	it('passes the supply item index to resolveAwsCredentials', async () => {
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'us-east-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
		});
		const node = new EmbeddingsAwsBedrock();
		const ctx = mockContext('amazon.titan-embed-text-v1');

		await node.supplyData.call(ctx, 3);

		expect(mockedResolveAwsCredentials).toHaveBeenCalledWith(ctx, 3);
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

	it('uses the region-specific domain for the China partition endpoint', async () => {
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'cn-north-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
		});
		const node = new EmbeddingsAwsBedrock();
		await node.supplyData.call(mockContext('amazon.titan-embed-text-v1'), 0);
		expect(mockedGetNodeProxyAgent).toHaveBeenCalledWith(
			'https://bedrock-runtime.cn-north-1.amazonaws.com.cn',
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

	describe('runtime endpoint override', () => {
		it('routes inference and the proxy agent to the override endpoint when set', async () => {
			mockedResolveAwsCredentials.mockResolvedValue({
				region: 'us-east-1',
				credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
				bedrockRuntimeEndpoint: 'https://vpce-abc.bedrock-runtime.us-east-1.vpce.amazonaws.com',
			});
			const node = new EmbeddingsAwsBedrock();
			await node.supplyData.call(mockContext('amazon.titan-embed-text-v1'), 0);

			const expected = 'https://vpce-abc.bedrock-runtime.us-east-1.vpce.amazonaws.com';
			expect(mockedGetNodeProxyAgent).toHaveBeenCalledWith(expected);
			expect(MockedBedrockRuntimeClient.mock.calls.at(-1)?.[0]?.endpoint).toBe(expected);
		});

		it('leaves the SDK endpoint unset when no override is present', async () => {
			mockedResolveAwsCredentials.mockResolvedValue({
				region: 'us-east-1',
				credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
			});
			const node = new EmbeddingsAwsBedrock();
			await node.supplyData.call(mockContext('amazon.titan-embed-text-v1'), 0);

			expect(MockedBedrockRuntimeClient.mock.calls.at(-1)?.[0]?.endpoint).toBeUndefined();
		});

		it('throws a UserError for an invalid override', async () => {
			mockedResolveAwsCredentials.mockResolvedValue({
				region: 'us-east-1',
				credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
				bedrockRuntimeEndpoint: 'ftp://bedrock-runtime.us-east-1.amazonaws.com',
			});
			const node = new EmbeddingsAwsBedrock();

			await expect(
				node.supplyData.call(mockContext('amazon.titan-embed-text-v1'), 0),
			).rejects.toThrow(UserError);
		});
	});
});
