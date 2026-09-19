import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import type { OciGenAiEmbeddings } from '@oracle/langchain-oci';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
	type INodeProperties,
	type INode,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type { models as ociModels } from 'oci-generativeaiinference';

import {
	awaitOciGenAiRequest,
	createOciGenAiClient,
	getOciEmbeddingModelCapabilities,
	getOciEmbeddingModelIdsWithOutputDimensions,
	getOnDemandEmbeddingModelFallbacks,
	isOciGenAiCredentials,
	loadOciSdk,
	validateOciCompartmentId,
	validateOciModelId,
} from '../../../utils/ociGenAi';

const DEFAULT_BATCH_SIZE = 96;
const DEFAULT_MAX_CONCURRENCY = 2;
const NO_REQUEST_TIMEOUT = -1;
const MAX_CONCURRENCY = 10;
const DEFAULT_OUTPUT_DIMENSIONS = '';

type ResourceLocatorValue = {
	mode: string;
	value: string;
};

type OciEmbeddingsOptions = {
	batchSize?: number;
	maxConcurrency?: number;
	outputDimensions?: number | string;
	timeout?: number;
	truncate?: 'NONE' | 'START' | 'END';
};

type OciGenAiEmbeddingsConstructor = new (
	params: ConstructorParameters<typeof OciGenAiEmbeddings>[0] & { requestTimeout?: number },
) => OciGenAiEmbeddings;

/** Creates an embeddings wrapper that applies the node's request timeout. */
async function createN8nOciGenAiEmbeddings(): Promise<OciGenAiEmbeddingsConstructor> {
	const { langchainOci } = await loadOciSdk();
	const { OciGenAiEmbeddings } = langchainOci as unknown as {
		OciGenAiEmbeddings: typeof import('@oracle/langchain-oci').OciGenAiEmbeddings;
	};

	return class N8nOciGenAiEmbeddings extends OciGenAiEmbeddings {
		private readonly requestTimeout: number | undefined;

		constructor(
			params: ConstructorParameters<typeof OciGenAiEmbeddings>[0] & { requestTimeout?: number },
		) {
			super(params);
			this.requestTimeout = params.requestTimeout;
		}

		override async embedDocuments(documents: string[]): Promise<number[][]> {
			return await awaitOciGenAiRequest(super.embedDocuments(documents), this.requestTimeout);
		}

		override async embedQuery(text: string): Promise<number[]> {
			return await awaitOciGenAiRequest(super.embedQuery(text), this.requestTimeout);
		}
	};
}

function isResourceLocatorValue(value: unknown): value is ResourceLocatorValue {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return typeof candidate.mode === 'string' && typeof candidate.value === 'string';
}

function getModelId(node: INode, value: unknown, itemIndex?: number): string {
	if (isResourceLocatorValue(value)) {
		try {
			return validateOciModelId(value.value);
		} catch (error) {
			throw new NodeOperationError(node, error as Error, { itemIndex });
		}
	}

	if (typeof value === 'string') {
		try {
			return validateOciModelId(value);
		} catch (error) {
			throw new NodeOperationError(node, error as Error, { itemIndex });
		}
	}

	throw new NodeOperationError(node, 'Invalid model value provided', { itemIndex });
}

function getTruncate(
	value: unknown,
	models: typeof import('oci-generativeaiinference').models,
): ociModels.EmbedTextDetails.Truncate | undefined {
	switch (value) {
		case 'NONE':
			return models.EmbedTextDetails.Truncate.None;
		case 'START':
			return models.EmbedTextDetails.Truncate.Start;
		case 'END':
			return models.EmbedTextDetails.Truncate.End;
		default:
			return undefined;
	}
}

function supportsOutputDimensions(modelId: string | undefined, value: number): boolean {
	return (
		getOciEmbeddingModelCapabilities(modelId ?? '')?.outputDimensions?.includes(value) ?? false
	);
}

const outputDimensionsProperties: INodeProperties[] =
	getOciEmbeddingModelIdsWithOutputDimensions().flatMap((modelId) => {
		const outputDimensions = getOciEmbeddingModelCapabilities(modelId)?.outputDimensions;
		if (!outputDimensions) return [];

		return [
			{
				displayName: 'Output Dimensions',
				name: 'outputDimensions',
				type: 'options',
				options: [
					{
						name: 'Default',
						value: DEFAULT_OUTPUT_DIMENSIONS,
					},
					...outputDimensions.map((value) => ({
						name: String(value),
						value,
					})),
				],
				default: DEFAULT_OUTPUT_DIMENSIONS,
				displayOptions: {
					show: {
						'/model.value': [modelId],
					},
				},
				description:
					'Number of dimensions in the returned embedding vector. Default uses the model setting. Changing this value can require a vector store with matching dimensions.',
			},
		];
	});

const customOutputDimensionsProperty: INodeProperties = {
	displayName: 'Output Dimensions',
	name: 'outputDimensions',
	type: 'string',
	default: '',
	placeholder: '1536',
	displayOptions: {
		hide: {
			'/model.value': [...getOciEmbeddingModelIdsWithOutputDimensions()],
		},
	},
	description:
		'Optional number of dimensions in the returned embedding vector. Leave empty to use the model default. OCI validates values for models without known dimension metadata.',
};

const modelProperty: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'resourceLocator',
	default: {
		mode: 'list',
		value: '',
	},
	required: true,
	displayOptions: {
		show: {
			servingMode: ['onDemand'],
		},
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select an embedding model...',
			typeOptions: {
				searchListMethod: 'searchEmbeddingModels',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'cohere.embed-v4.0',
		},
	],
	description:
		'From List shows known on-demand embedding models for the selected region. Use ID to specify another supported OCI embedding model.',
};

const compartmentProperty: INodeProperties = {
	displayName: 'Compartment OCID',
	name: 'compartmentId',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'ocid1.compartment.oc1..aaaa...',
	description: 'OCID of the compartment authorized to use OCI Generative AI',
};

const servingModeProperty: INodeProperties = {
	displayName: 'Serving Mode',
	name: 'servingMode',
	type: 'options',
	options: [
		{
			name: 'On Demand',
			value: 'onDemand',
			description: 'Use an on-demand OCI Generative AI model',
		},
		{
			name: 'Dedicated Endpoint',
			value: 'dedicated',
			description: 'Use a model deployed to an OCI Generative AI dedicated endpoint',
		},
	],
	default: 'onDemand',
};

const dedicatedEndpointProperty: INodeProperties = {
	displayName: 'Dedicated Endpoint ID',
	name: 'dedicatedEndpointId',
	type: 'string',
	default: '',
	placeholder: 'ocid1.generativeaidededicatedaiendpoint.oc1...',
	displayOptions: {
		show: {
			servingMode: ['dedicated'],
		},
	},
	description: 'OCID of the dedicated AI endpoint hosting the embedding model',
};

const optionsProperty: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Batch Size',
			name: 'batchSize',
			type: 'number',
			default: DEFAULT_BATCH_SIZE,
			typeOptions: {
				minValue: 1,
				maxValue: 96,
			},
			description: 'Maximum number of texts included in one OCI embedding request',
		},
		{
			displayName: 'Maximum Concurrency',
			name: 'maxConcurrency',
			type: 'number',
			default: DEFAULT_MAX_CONCURRENCY,
			typeOptions: {
				minValue: 1,
				maxValue: MAX_CONCURRENCY,
			},
			description:
				'Maximum number of OCI embedding requests to run concurrently. Higher values can improve bulk ingestion throughput but can increase throttling.',
		},
		{
			displayName: 'Timeout',
			name: 'timeout',
			type: 'number',
			default: NO_REQUEST_TIMEOUT,
			typeOptions: {
				minValue: NO_REQUEST_TIMEOUT,
			},
			description:
				'Maximum amount of time a request is allowed to take in seconds. Set to -1 for no timeout.',
		},
		...outputDimensionsProperties,
		customOutputDimensionsProperty,
		{
			displayName: 'Truncate',
			name: 'truncate',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'NONE',
				},
				{
					name: 'Start',
					value: 'START',
				},
				{
					name: 'End',
					value: 'END',
				},
			],
			default: 'NONE',
			description:
				'Controls how OCI handles input that exceeds the model token limit. None returns an error. Start removes tokens from the beginning. End removes tokens from the end.',
		},
	],
};

export class EmbeddingsOciGenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings OCI Generative AI',
		name: 'embeddingsOciGenAi',
		icon: 'file:../../shared/icons/oracle.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate embeddings using OCI Generative AI',
		defaults: {
			name: 'Embeddings OCI Generative AI',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.oracle.com/en-us/iaas/Content/generative-ai/home.htm',
					},
				],
			},
		},
		credentials: [
			{
				name: 'ociGenAiApi',
				required: true,
			},
		],
		inputs: [],
		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			modelProperty,
			compartmentProperty,
			servingModeProperty,
			dedicatedEndpointProperty,
			optionsProperty,
		],
	};

	methods = {
		listSearch: {
			async searchEmbeddingModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('ociGenAiApi');
				if (!isOciGenAiCredentials(credentials)) {
					throw new NodeOperationError(this.getNode(), 'Invalid OCI Generative AI credentials');
				}

				// listModels(TEXT_EMBEDDINGS) does not reliably establish on-demand availability per
				// region, so the selector uses the curated regional list. Manual ID entry supports new models.
				const results = getOnDemandEmbeddingModelFallbacks(credentials.regionId, filter).map(
					(model): INodeListSearchItems => ({
						name: model.displayName,
						value: model.modelId,
					}),
				);

				return { results };
			},
		},
	};

	// Build the LangChain embeddings model that n8n supplies to connected AI nodes.
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('ociGenAiApi');
		if (!isOciGenAiCredentials(credentials)) {
			throw new NodeOperationError(this.getNode(), 'Invalid OCI Generative AI credentials', {
				itemIndex,
			});
		}

		let compartmentId: string;
		try {
			compartmentId = validateOciCompartmentId(
				this.getNodeParameter('compartmentId', itemIndex, '') as string,
			);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
		}

		const servingMode = this.getNodeParameter('servingMode', itemIndex, 'onDemand') as
			| 'onDemand'
			| 'dedicated';

		const dedicatedEndpointId = (
			this.getNodeParameter('dedicatedEndpointId', itemIndex, '') as string
		).trim();

		if (servingMode === 'dedicated' && !dedicatedEndpointId) {
			throw new NodeOperationError(
				this.getNode(),
				'Dedicated Endpoint ID is required when using Dedicated Endpoint serving mode.',
				{ itemIndex },
			);
		}

		const model =
			servingMode === 'onDemand'
				? getModelId(this.getNode(), this.getNodeParameter('model', itemIndex), itemIndex)
				: undefined;

		const options = this.getNodeParameter('options', itemIndex, {}) as OciEmbeddingsOptions;

		const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
		const maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
		const timeout = options.timeout ?? NO_REQUEST_TIMEOUT;

		if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 96) {
			throw new NodeOperationError(
				this.getNode(),
				'Batch Size must be an integer between 1 and 96.',
				{ itemIndex },
			);
		}

		if (
			!Number.isInteger(maxConcurrency) ||
			maxConcurrency < 1 ||
			maxConcurrency > MAX_CONCURRENCY
		) {
			throw new NodeOperationError(
				this.getNode(),
				`Maximum Concurrency must be an integer between 1 and ${MAX_CONCURRENCY}.`,
				{ itemIndex },
			);
		}

		if (!Number.isInteger(timeout) || timeout === 0 || timeout < NO_REQUEST_TIMEOUT) {
			throw new NodeOperationError(
				this.getNode(),
				'Timeout must be -1 or a positive integer in seconds.',
				{ itemIndex },
			);
		}

		const outputDimensionsValue = options.outputDimensions;
		const outputDimensions =
			outputDimensionsValue === undefined || outputDimensionsValue === ''
				? undefined
				: Number(outputDimensionsValue);

		if (
			outputDimensions !== undefined &&
			(!Number.isInteger(outputDimensions) || outputDimensions < 1)
		) {
			throw new NodeOperationError(
				this.getNode(),
				'Output Dimensions must be a positive integer.',
				{ itemIndex },
			);
		}

		// Only validate dimensions for models with verified capability metadata. OCI validates new or
		// manually entered models whose capabilities are not yet available to n8n.
		if (
			outputDimensions !== undefined &&
			getOciEmbeddingModelCapabilities(model ?? '')?.outputDimensions !== undefined &&
			!supportsOutputDimensions(model, outputDimensions)
		) {
			throw new NodeOperationError(
				this.getNode(),
				'Output Dimensions is not supported by the selected OCI embedding model.',
				{ itemIndex },
			);
		}

		const client = await createOciGenAiClient(
			credentials,
			this.helpers.getSecureEgressFilter(),
			timeout === NO_REQUEST_TIMEOUT ? undefined : timeout * 1000,
		);
		const [{ genaiInference }, N8nOciGenAiEmbeddings] = await Promise.all([
			loadOciSdk(),
			createN8nOciGenAiEmbeddings(),
		]);
		const truncate = getTruncate(options.truncate, genaiInference.models);

		const embeddings = new N8nOciGenAiEmbeddings({
			client,
			compartmentId,
			batchSize,
			maxConcurrency,
			// Do not repeat an operation after the node-level request timeout has elapsed.
			maxRetries: 0,
			...(timeout === NO_REQUEST_TIMEOUT ? {} : { requestTimeout: timeout * 1000 }),
			...(outputDimensions !== undefined ? { outputDimensions } : {}),
			...(truncate !== undefined ? { truncate } : {}),
			...(servingMode === 'dedicated' ? { dedicatedEndpointId } : { onDemandModelId: model }),
		});

		return {
			// Dynamic import resolves a separate LangChain declaration identity; the runtime class is the
			// same OCI embeddings implementation expected by logWrapper.
			response: logWrapper(embeddings as unknown as OciGenAiEmbeddings, this),
		};
	}
}
