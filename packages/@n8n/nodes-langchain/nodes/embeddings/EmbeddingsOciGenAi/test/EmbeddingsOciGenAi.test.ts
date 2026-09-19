import { logWrapper } from '@n8n/ai-utilities';
import { OciGenAiEmbeddings } from '@oracle/langchain-oci';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type {
	ILoadOptionsFunctions,
	INode,
	INodeProperties,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import type { Mocked } from 'vitest';

const { createClient, getOnDemandEmbeddingModelFallbacks, ociGenAiEmbeddingsConstructor } =
	vi.hoisted(() => ({
		createClient: vi.fn(),
		getOnDemandEmbeddingModelFallbacks: vi.fn(),
		ociGenAiEmbeddingsConstructor: vi.fn().mockImplementation(function MockOciGenAiEmbeddings() {}),
	}));

vi.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: vi.fn(() => ({
		displayName: 'Connection hint',
		name: 'connectionHint',
		type: 'notice',
		default: '',
	})),
	logWrapper: vi.fn((instance: unknown) => instance),
}));

vi.mock('@oracle/langchain-oci', () => ({
	OciGenAiEmbeddings: ociGenAiEmbeddingsConstructor,
}));

vi.mock('../../../../utils/ociGenAi', () => ({
	createOciGenAiClient: createClient,
	getOciEmbeddingModelCapabilities: (modelId: string) =>
		modelId.toLowerCase() === 'cohere.embed-v4.0'
			? { outputDimensions: [256, 512, 1024, 1536] }
			: undefined,
	getOciEmbeddingModelIdsWithOutputDimensions: () => ['cohere.embed-v4.0'],
	getOnDemandEmbeddingModelFallbacks,
	isOciGenAiCredentials: () => true,
	loadOciSdk: async () => ({
		genaiInference: {
			models: {
				EmbedTextDetails: {
					Truncate: { None: 'NONE', Start: 'START', End: 'END' },
				},
			},
		},
		langchainOci: { OciGenAiEmbeddings: ociGenAiEmbeddingsConstructor },
	}),
	validateOciCompartmentId: (value: string) => {
		if (!value.startsWith('ocid1.compartment.')) throw new Error('Invalid OCI Compartment OCID');
		return value;
	},
	validateOciModelId: (value: string) => value,
}));

import { EmbeddingsOciGenAi } from '../EmbeddingsOciGenAi.node';

const MockedOciGenAiEmbeddings = vi.mocked(OciGenAiEmbeddings);
const mockedLogWrapper = vi.mocked(logWrapper);

describe('EmbeddingsOciGenAi', () => {
	const mockNode: INode = {
		id: '1',
		name: 'Embeddings OCI Generative AI',
		type: '@n8n/n8n-nodes-langchain.embeddingsOciGenAi',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const createContext = (): Mocked<ISupplyDataFunctions> => {
		const context = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;
		context.getCredentials = vi.fn().mockResolvedValue({
			authentication: 'apiKey',
			regionId: 'us-chicago-1',
		});
		context.getNode = vi.fn().mockReturnValue(mockNode);
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'cohere.embed-v4.0';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') {
				return {
					batchSize: 24,
					maxConcurrency: 3,
					outputDimensions: 1024,
					timeout: 45,
					truncate: 'END',
				};
			}
			return '';
		});
		return context;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		createClient.mockResolvedValue({ client: 'inference' });
	});

	it('does not run a credential test when the credential editor opens', () => {
		const node = new EmbeddingsOciGenAi();

		expect(node.description.credentials).toEqual([{ name: 'ociGenAiApi', required: true }]);
		expect(node.methods).not.toHaveProperty('credentialTest');
	});

	it('explains how each truncation option handles oversized input', () => {
		const node = new EmbeddingsOciGenAi();
		const options = node.description.properties.find((property) => property.name === 'options');
		const truncate = options?.options?.find((property) => property.name === 'truncate');

		expect(truncate).toMatchObject({
			default: 'NONE',
			description:
				'Controls how OCI handles input that exceeds the model token limit. None returns an error. Start removes tokens from the beginning. End removes tokens from the end.',
		});
	});

	it('explains output dimension compatibility with the selected model and vector store', () => {
		const node = new EmbeddingsOciGenAi();
		const options = node.description.properties.find((property) => property.name === 'options');
		const outputDimensions = options?.options?.filter(
			(property) => property.name === 'outputDimensions',
		) as INodeProperties[] | undefined;
		const knownModelDimensions = outputDimensions?.find((property) => property.type === 'options');
		const customDimensions = outputDimensions?.find((property) => property.type === 'string');

		expect(knownModelDimensions).toMatchObject({
			default: '',
			description:
				'Number of dimensions in the returned embedding vector. Default uses the model setting. Changing this value can require a vector store with matching dimensions.',
		});
		expect(knownModelDimensions?.options).toEqual([
			{ name: 'Default', value: '' },
			{ name: '256', value: 256 },
			{ name: '512', value: 512 },
			{ name: '1024', value: 1024 },
			{ name: '1536', value: 1536 },
		]);
		expect(knownModelDimensions?.displayOptions).toEqual({
			show: { '/model.value': ['cohere.embed-v4.0'] },
		});
		expect(customDimensions).toMatchObject({
			default: '',
			placeholder: '1536',
			description:
				'Optional number of dimensions in the returned embedding vector. Leave empty to use the model default. OCI validates values for models without known dimension metadata.',
			displayOptions: { hide: { '/model.value': ['cohere.embed-v4.0'] } },
		});
	});

	it('explains the maximum concurrency throughput tradeoff', () => {
		const node = new EmbeddingsOciGenAi();
		const options = node.description.properties.find((property) => property.name === 'options');
		const maxConcurrency = options?.options?.find((property) => property.name === 'maxConcurrency');

		expect(maxConcurrency).toMatchObject({
			typeOptions: {
				minValue: 1,
				maxValue: 10,
			},
			description:
				'Maximum number of OCI embedding requests to run concurrently. Higher values can improve bulk ingestion throughput but can increase throttling.',
		});
	});

	it('uses OpenAI-compatible timeout semantics', () => {
		const node = new EmbeddingsOciGenAi();
		const options = node.description.properties.find((property) => property.name === 'options');
		const timeout = options?.options?.find((property) => property.name === 'timeout');

		expect(timeout).toMatchObject({
			default: -1,
			typeOptions: { minValue: -1 },
			description:
				'Maximum amount of time a request is allowed to take in seconds. Set to -1 for no timeout.',
		});
	});

	it('returns regional embedding models matching the search filter', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		const search = node.methods.listSearch?.searchEmbeddingModels;
		getOnDemandEmbeddingModelFallbacks.mockReturnValue([
			{
				displayName: 'Cohere Embed 4',
				modelId: 'cohere.embed-v4.0',
				regions: ['us-chicago-1'],
			},
		]);

		if (!search) throw new Error('Embedding model search is not configured');
		await expect(
			search.call(context as unknown as ILoadOptionsFunctions, 'embed'),
		).resolves.toEqual({
			results: [{ name: 'Cohere Embed 4', value: 'cohere.embed-v4.0' }],
		});
		expect(getOnDemandEmbeddingModelFallbacks).toHaveBeenCalledWith('us-chicago-1', 'embed');
	});

	it('creates OCI embeddings with the selected model and options', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();

		const result = await node.supplyData.call(context, 0);
		expect(createClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), 45000);

		expect(MockedOciGenAiEmbeddings).toHaveBeenCalledWith(
			expect.objectContaining({
				client: { client: 'inference' },
				compartmentId: 'ocid1.compartment.oc1..test',
				onDemandModelId: 'cohere.embed-v4.0',
				batchSize: 24,
				maxConcurrency: 3,
				maxRetries: 0,
				outputDimensions: 1024,
				truncate: 'END',
			}),
		);
		expect(mockedLogWrapper).toHaveBeenCalledWith(expect.any(MockedOciGenAiEmbeddings), context);
		expect(result).toHaveProperty('response');
	});

	it('uses embedding defaults and omits unset optional request parameters', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return { mode: 'id', value: 'cohere.embed-v4.0' };
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return {};
			return '';
		});

		await node.supplyData.call(context, 0);
		expect(createClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined);

		expect(MockedOciGenAiEmbeddings).toHaveBeenCalledWith({
			client: { client: 'inference' },
			compartmentId: 'ocid1.compartment.oc1..test',
			batchSize: 96,
			maxConcurrency: 2,
			maxRetries: 0,
			onDemandModelId: 'cohere.embed-v4.0',
		});
	});

	it('requires an endpoint ID for dedicated embeddings', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'dedicated';
			if (name === 'options') return {};
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(
			'Dedicated Endpoint ID is required',
		);
		expect(createClient).not.toHaveBeenCalled();
	});

	it('creates embeddings for a dedicated endpoint without reading an on-demand model', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') throw new Error('Model must not be read for dedicated serving');
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'dedicated';
			if (name === 'dedicatedEndpointId') {
				return 'ocid1.generativeaidededicatedaiendpoint.oc1..test';
			}
			if (name === 'options') return {};
			return '';
		});

		await node.supplyData.call(context, 0);

		expect(MockedOciGenAiEmbeddings).toHaveBeenCalledWith(
			expect.objectContaining({
				dedicatedEndpointId: 'ocid1.generativeaidededicatedaiendpoint.oc1..test',
			}),
		);
	});

	it('rejects an invalid compartment before creating an inference client', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'compartmentId') return 'invalid-compartment';
			return name === 'options' ? {} : '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow('Invalid OCI Compartment OCID');
		expect(createClient).not.toHaveBeenCalled();
	});

	it.each([
		[{ batchSize: 97 }, 'Batch Size must be an integer between 1 and 96.'],
		[{ maxConcurrency: 0 }, 'Maximum Concurrency must be an integer between 1 and 10.'],
		[{ maxConcurrency: 11 }, 'Maximum Concurrency must be an integer between 1 and 10.'],
		[{ timeout: 0 }, 'Timeout must be -1 or a positive integer in seconds.'],
		[{ timeout: -2 }, 'Timeout must be -1 or a positive integer in seconds.'],
		[{ timeout: 1.5 }, 'Timeout must be -1 or a positive integer in seconds.'],
	])('rejects invalid embedding request option %o', async (options, errorMessage) => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'cohere.embed-v4.0';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return options;
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(errorMessage);
		expect(createClient).not.toHaveBeenCalled();
	});

	it('passes output dimensions for a model without verified capability metadata to OCI', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'cohere.embed-english-v3.0';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return { outputDimensions: '1024' };
			return '';
		});

		await node.supplyData.call(context, 0);

		expect(MockedOciGenAiEmbeddings).toHaveBeenCalledWith(
			expect.objectContaining({
				onDemandModelId: 'cohere.embed-english-v3.0',
				outputDimensions: 1024,
			}),
		);
	});

	it('passes the selected truncation mode to OCI', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'cohere.embed-v4.0';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return { truncate: 'START' };
			return '';
		});

		await node.supplyData.call(context, 0);

		expect(MockedOciGenAiEmbeddings).toHaveBeenCalledWith(
			expect.objectContaining({ truncate: 'START' }),
		);
	});

	it('rejects non-positive or non-integer custom output dimensions', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'new.embedding-model';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return { outputDimensions: '1.5' };
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(
			'Output Dimensions must be a positive integer.',
		);
		expect(createClient).not.toHaveBeenCalled();
	});

	it('rejects non-numeric custom output dimensions before creating an inference client', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'new.embedding-model';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return { outputDimensions: 'not-a-number' };
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(
			'Output Dimensions must be a positive integer.',
		);
		expect(createClient).not.toHaveBeenCalled();
	});

	it('rejects unsupported output dimensions for Cohere Embed 4', async () => {
		const node = new EmbeddingsOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'cohere.embed-v4.0';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return { outputDimensions: 768 };
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(
			'Output Dimensions is not supported by the selected OCI embedding model.',
		);
		expect(createClient).not.toHaveBeenCalled();
	});
});
