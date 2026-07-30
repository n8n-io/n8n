import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { getNodeProxyAgent } from '@n8n/ai-utilities';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import {
	UserError,
	type ILoadOptionsFunctions,
	type INode,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { resolveAwsCredentials } from '@utils/aws/resolveAwsCredentials';

import { BedrockInvokeModelEmbeddings } from '../BedrockInvokeModelEmbeddings';
import { EmbeddingsAwsBedrock } from '../EmbeddingsAwsBedrock.node';

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
	BedrockRuntimeClient: vi.fn(),
}));
vi.mock('../BedrockInvokeModelEmbeddings', () => ({
	BedrockInvokeModelEmbeddings: vi.fn().mockImplementation(function () {
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
vi.mock('@smithy/node-http-handler', () => ({
	NodeHttpHandler: vi.fn(),
}));

const MockedBedrockRuntimeClient = vi.mocked(BedrockRuntimeClient);
const MockedBedrockInvokeModelEmbeddings = vi.mocked(BedrockInvokeModelEmbeddings);
const MockedNodeHttpHandler = vi.mocked(NodeHttpHandler);
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

	function mockContext(model: string, options: Record<string, unknown> = {}) {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;
		ctx.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return model;
			if (name === 'options') return options;
			return undefined;
		});
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
		expect(MockedBedrockInvokeModelEmbeddings).toHaveBeenCalledWith(
			expect.objectContaining({ model: 'custom.model.not-in-list-v1' }),
		);
	});

	it('keeps the credential region for a non-ARN model (including region-prefixed profile IDs)', async () => {
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'us-east-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
		});
		const node = new EmbeddingsAwsBedrock();
		await node.supplyData.call(mockContext('eu.cohere.embed-v4:0'), 0);
		expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
			expect.objectContaining({ region: 'us-east-1' }),
		);
	});

	it('overrides the credential region with the region from a model ARN', async () => {
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'us-east-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
		});
		const node = new EmbeddingsAwsBedrock();
		await node.supplyData.call(
			mockContext('arn:aws:bedrock:eu-west-3:123456789012:inference-profile/eu.cohere.embed-v4:0'),
			0,
		);
		expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
			expect.objectContaining({ region: 'eu-west-3' }),
		);
	});

	it('throws when the ARN region is not supported', async () => {
		mockedResolveAwsCredentials.mockResolvedValue({
			region: 'us-east-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
		});
		const node = new EmbeddingsAwsBedrock();
		await expect(
			node.supplyData.call(
				mockContext('arn:aws:bedrock:not-a-region:123456789012:inference-profile/x'),
				0,
			),
		).rejects.toThrow();
		expect(MockedBedrockRuntimeClient).not.toHaveBeenCalled();
	});

	describe('options', () => {
		beforeEach(() => {
			mockedResolveAwsCredentials.mockResolvedValue({
				region: 'us-east-1',
				credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
			});
		});

		it('applies max retries as SDK maxAttempts', async () => {
			const node = new EmbeddingsAwsBedrock();
			await node.supplyData.call(mockContext('amazon.titan-embed-text-v1', { maxRetries: 5 }), 0);

			expect(MockedBedrockRuntimeClient.mock.calls.at(-1)?.[0]?.maxAttempts).toBe(6);
		});

		it('applies the timeout to the request handler', async () => {
			const node = new EmbeddingsAwsBedrock();
			await node.supplyData.call(mockContext('amazon.titan-embed-text-v1', { timeout: 30000 }), 0);

			expect(MockedNodeHttpHandler).toHaveBeenCalledWith(
				expect.objectContaining({ requestTimeout: 30000, throwOnRequestTimeout: true }),
			);
		});

		it('leaves maxAttempts and request handler unset without options', async () => {
			const node = new EmbeddingsAwsBedrock();
			await node.supplyData.call(mockContext('amazon.titan-embed-text-v1'), 0);

			const lastConfig = MockedBedrockRuntimeClient.mock.calls.at(-1)?.[0];
			expect(lastConfig?.maxAttempts).toBeUndefined();
			expect(lastConfig?.requestHandler).toBeUndefined();
		});

		it('passes parsed additional model request fields to the embeddings', async () => {
			const node = new EmbeddingsAwsBedrock();
			await node.supplyData.call(
				mockContext('amazon.titan-embed-text-v2:0', {
					additionalModelRequestFields: '{"dimensions": 512, "normalize": false}',
				}),
				0,
			);

			expect(MockedBedrockInvokeModelEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					additionalModelRequestFields: { dimensions: 512, normalize: false },
				}),
			);
		});

		it('ignores an empty additional fields object', async () => {
			const node = new EmbeddingsAwsBedrock();
			await node.supplyData.call(
				mockContext('amazon.titan-embed-text-v2:0', { additionalModelRequestFields: ' {} ' }),
				0,
			);

			expect(MockedBedrockInvokeModelEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({ additionalModelRequestFields: undefined }),
			);
		});

		it('throws a UserError for invalid additional fields JSON', async () => {
			const node = new EmbeddingsAwsBedrock();

			await expect(
				node.supplyData.call(
					mockContext('amazon.titan-embed-text-v2:0', { additionalModelRequestFields: 'not-json' }),
					0,
				),
			).rejects.toThrow(UserError);
		});

		it.each(['[1, 2]', '"text"', '42', 'true', 'null'])(
			'throws a UserError for non-object additional fields JSON: %s',
			async (additionalModelRequestFields) => {
				const node = new EmbeddingsAwsBedrock();

				await expect(
					node.supplyData.call(
						mockContext('amazon.titan-embed-text-v2:0', { additionalModelRequestFields }),
						0,
					),
				).rejects.toThrow('Additional Model Request Fields must be a JSON object');
			},
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

	describe('listModels', () => {
		const node = new EmbeddingsAwsBedrock();

		const foundationResponse = {
			modelSummaries: [
				{
					modelId: 'amazon.titan-embed-text-v2:0',
					modelName: 'Titan Text Embeddings V2',
					modelArn: 'arn:aws:bedrock:eu-central-1::foundation-model/amazon.titan-embed-text-v2:0',
					inferenceTypesSupported: ['ON_DEMAND'],
				},
				{
					modelId: 'cohere.embed-v4:0',
					modelName: 'Cohere Embed 4',
					modelArn: 'arn:aws:bedrock:eu-central-1::foundation-model/cohere.embed-v4:0',
					inferenceTypesSupported: ['INFERENCE_PROFILE'],
				},
			],
		};
		const profilesResponse = {
			inferenceProfileSummaries: [
				{
					inferenceProfileId: 'eu.cohere.embed-v4:0',
					inferenceProfileName: 'EU Cohere Embed 4',
					inferenceProfileArn:
						'arn:aws:bedrock:eu-central-1:123456789012:inference-profile/eu.cohere.embed-v4:0',
					description: 'Routes requests across EU regions',
					models: [
						{ modelArn: 'arn:aws:bedrock:eu-central-1::foundation-model/cohere.embed-v4:0' },
					],
				},
				{
					inferenceProfileId: 'eu.anthropic.claude-sonnet-4-6-v1:0',
					inferenceProfileName: 'EU Anthropic Claude Sonnet 4.6',
					inferenceProfileArn:
						'arn:aws:bedrock:eu-central-1:123456789012:inference-profile/eu.anthropic.claude-sonnet-4-6-v1:0',
					models: [
						{
							modelArn:
								'arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-sonnet-4-6-v1:0',
						},
					],
				},
			],
		};

		const createLoadOptionsContext = (
			authentication: 'iam' | 'assumeRole',
			httpMock: ReturnType<typeof vi.fn>,
		) =>
			({
				getNodeParameter: vi.fn().mockReturnValue(authentication),
				getCredentials: vi.fn().mockResolvedValue({ region: 'eu-central-1' }),
				helpers: { httpRequestWithAuthentication: httpMock },
				logger: { warn: vi.fn() },
			}) as unknown as ILoadOptionsFunctions;

		const httpMockFor = (
			foundation: Promise<unknown> | unknown,
			profiles: Promise<unknown> | unknown,
		) =>
			vi.fn().mockImplementation(async (_credentialsType: string, options: { url: string }) => {
				return options.url.startsWith('/foundation-models') ? await foundation : await profiles;
			});

		it('lists on-demand embedding models and embedding inference profiles, sorted by name', async () => {
			const httpMock = httpMockFor(foundationResponse, profilesResponse);
			const ctx = createLoadOptionsContext('iam', httpMock);

			const options = await node.methods.loadOptions.listModels.call(ctx);

			expect(options).toEqual([
				{
					name: 'EU Cohere Embed 4',
					value: 'eu.cohere.embed-v4:0',
					description: 'Routes requests across EU regions',
				},
				{
					name: 'Titan Text Embeddings V2',
					value: 'amazon.titan-embed-text-v2:0',
					// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
					description:
						'arn:aws:bedrock:eu-central-1::foundation-model/amazon.titan-embed-text-v2:0',
				},
			]);
		});

		it('excludes profile-only foundation models from the standalone options', async () => {
			const httpMock = httpMockFor(foundationResponse, profilesResponse);
			const ctx = createLoadOptionsContext('iam', httpMock);

			const options = await node.methods.loadOptions.listModels.call(ctx);

			expect(options.map((o) => o.value)).not.toContain('cohere.embed-v4:0');
		});

		it('drops inference profiles whose models are not embedding models', async () => {
			const httpMock = httpMockFor(foundationResponse, profilesResponse);
			const ctx = createLoadOptionsContext('iam', httpMock);

			const options = await node.methods.loadOptions.listModels.call(ctx);

			expect(options.map((o) => o.value)).not.toContain('eu.anthropic.claude-sonnet-4-6-v1:0');
		});

		it('uses the assume-role credential when authentication is assumeRole', async () => {
			const httpMock = httpMockFor(foundationResponse, profilesResponse);
			const ctx = createLoadOptionsContext('assumeRole', httpMock);

			await node.methods.loadOptions.listModels.call(ctx);

			expect(ctx.getCredentials).toHaveBeenCalledWith('awsAssumeRole');
			expect(httpMock).toHaveBeenCalledWith('awsAssumeRole', expect.any(Object));
		});

		it('returns only foundation models when the profiles request fails', async () => {
			const httpMock = httpMockFor(
				foundationResponse,
				Promise.reject(new Error('AccessDenied: ListInferenceProfiles')),
			);
			const ctx = createLoadOptionsContext('iam', httpMock);

			const options = await node.methods.loadOptions.listModels.call(ctx);

			expect(options.map((o) => o.value)).toEqual(['amazon.titan-embed-text-v2:0']);
		});

		it('returns all profiles unfiltered when the foundation-models request fails', async () => {
			const httpMock = httpMockFor(
				Promise.reject(new Error('AccessDenied: ListFoundationModels')),
				profilesResponse,
			);
			const ctx = createLoadOptionsContext('iam', httpMock);

			const options = await node.methods.loadOptions.listModels.call(ctx);

			expect(options.map((o) => o.value)).toEqual([
				'eu.anthropic.claude-sonnet-4-6-v1:0',
				'eu.cohere.embed-v4:0',
			]);
		});

		it('throws when both requests fail', async () => {
			const httpMock = httpMockFor(
				Promise.reject(new Error('AccessDenied')),
				Promise.reject(new Error('AccessDenied')),
			);
			const ctx = createLoadOptionsContext('iam', httpMock);

			await expect(node.methods.loadOptions.listModels.call(ctx)).rejects.toThrow('AccessDenied');
		});

		it('rejects an unsupported region before making any request', async () => {
			const httpMock = httpMockFor(foundationResponse, profilesResponse);
			const ctx = createLoadOptionsContext('iam', httpMock);
			(ctx.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
				region: 'not-a-region',
			});

			await expect(node.methods.loadOptions.listModels.call(ctx)).rejects.toThrow();
			expect(httpMock).not.toHaveBeenCalled();
		});
	});
});
