import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type { ProxyAgent } from 'undici';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import { getProxyAgent } from '@utils/httpProxyAgent';

/**
 * Extended VoyageEmbeddings class that supports HTTP proxy configuration.
 * Overrides the private embeddingWithRetry method to inject proxy support into fetch.
 *
 * Note: We use 'any' casting to bypass TypeScript's private member restrictions since
 * the embeddingWithRetry method is actually accessible at runtime (JavaScript doesn't
 * enforce true private members for classes compiled from TypeScript).
 */
class VoyageEmbeddingsWithProxy extends VoyageEmbeddings {
	private proxyAgent?: ProxyAgent;

	constructor(
		fields: ConstructorParameters<typeof VoyageEmbeddings>[0] & { proxyAgent?: ProxyAgent },
	) {
		super(fields);
		this.proxyAgent = fields.proxyAgent;

		// Override the embeddingWithRetry method at runtime to add proxy support
		const self = this as any;
		self.embeddingWithRetry = async (request: any) => {
			const makeCompletionRequest = async () => {
				const url = self.apiUrl;
				const fetchOptions: RequestInit = {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${self.apiKey}`,
						...self.headers,
					},
					body: JSON.stringify(request),
				};

				// Add proxy agent if configured
				if (this.proxyAgent) {
					(fetchOptions as any).dispatcher = this.proxyAgent;
				}

				const response = await fetch(url, fetchOptions);
				const json = await response.json();
				return json;
			};

			return self.caller.call(makeCompletionRequest);
		};
	}
}

export class EmbeddingsVoyageAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings VoyageAI',
		name: 'embeddingsVoyageAi',
		icon: 'file:voyageAi.svg',
		group: ['transform'],
		version: 1,
		description: "Use VoyageAI's Embeddings models",
		defaults: {
			name: 'Embeddings VoyageAI',
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.url }}',
		},
		credentials: [
			{
				name: 'voyageAiApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsvoyageai/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName:
					'Each model uses different dimensional density for embeddings. Ensure you use the same dimensionality for your vector store. The default model uses 1024-dimensional embeddings.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description:
					'The model which will generate the embeddings. <a href="https://docs.voyageai.com/docs/embeddings" target="_blank">Learn more</a>.',
				default: 'voyage-3.5',
				options: [
					{
						name: 'Voyage-3-Large (1024 Dimensions)',
						value: 'voyage-3-large',
						description: 'Previous generation general-purpose model',
					},
					{
						name: 'Voyage-3.5 (1024 Dimensions)',
						value: 'voyage-3.5',
						description: 'Latest general-purpose model, best quality',
					},
					{
						name: 'Voyage-3.5-Lite (1024 Dimensions)',
						value: 'voyage-3.5-lite',
						description: 'Optimized for latency and cost',
					},
					{
						name: 'Voyage-Code-3 (1024 Dimensions)',
						value: 'voyage-code-3',
						description: 'Optimized for code retrieval',
					},
					{
						name: 'Voyage-Finance-2 (1024 Dimensions)',
						value: 'voyage-finance-2',
						description: 'Optimized for finance domain',
					},
					{
						name: 'Voyage-Law-2 (1024 Dimensions)',
						value: 'voyage-law-2',
						description: 'Optimized for legal domain',
					},
					{
						name: 'Voyage-Multilingual-2 (1024 Dimensions)',
						value: 'voyage-multilingual-2',
						description: 'Optimized for multilingual content',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Batch Size',
						name: 'batchSize',
						type: 'number',
						default: 512,
						typeOptions: { maxValue: 1000 },
						description: 'Maximum number of documents to send in each request (max 1000)',
					},
					{
						displayName: 'Input Type',
						name: 'inputType',
						type: 'options',
						default: '',
						description:
							'Type of input for optimized embeddings. Embeddings with and without input_type are compatible.',
						options: [
							{
								name: 'None',
								value: '',
								description: 'No optimization',
							},
							{
								name: 'Query',
								value: 'query',
								description: 'Optimize for search queries',
							},
							{
								name: 'Document',
								value: 'document',
								description: 'Optimize for documents to be searched',
							},
						],
					},
					{
						displayName: 'Output Dimension',
						name: 'outputDimension',
						type: 'options',
						default: 0,
						description:
							'The number of dimensions for the output embeddings. Only supported by voyage-3.5, voyage-3.5-lite, and voyage-code-3 models.',
						options: [
							{
								name: 'Default (1024)',
								value: 0,
							},
							{
								name: '256',
								value: 256,
							},
							{
								name: '512',
								value: 512,
							},
							{
								name: '1024',
								value: 1024,
							},
							{
								name: '2048',
								value: 2048,
							},
						],
					},
					{
						displayName: 'Truncate',
						name: 'truncation',
						type: 'boolean',
						default: true,
						description:
							'Whether to truncate input texts that exceed the maximum context length. If false, an error will be raised for oversized inputs.',
					},
					{
						displayName: 'Encoding Format',
						name: 'encodingFormat',
						type: 'options',
						default: 'float',
						description: 'The format to return the embeddings in',
						options: [
							{
								name: 'Float',
								value: 'float',
								description: 'Standard floating-point numbers',
							},
							{
								name: 'Base64',
								value: 'base64',
								description: 'Base64-encoded binary format',
							},
						],
					},
					{
						displayName: 'Output Data Type',
						name: 'outputDtype',
						type: 'options',
						default: 'float',
						description:
							'The data type for embeddings. Quantization options reduce storage and improve latency.',
						options: [
							{
								name: 'Float (Full Precision)',
								value: 'float',
							},
							{
								name: 'Int8 (8-Bit Integer)',
								value: 'int8',
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings VoyageAI');

		const modelName = this.getNodeParameter('modelName', itemIndex, 'voyage-3.5') as string;
		const credentials = await this.getCredentials<{ apiKey: string; url?: string }>('voyageAiApi');

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			batchSize?: number;
			inputType?: string;
			outputDimension?: number;
			truncation?: boolean;
			encodingFormat?: 'float' | 'base64';
			outputDtype?: 'float' | 'int8';
		};

		// Get base URL from credentials (defaults to https://api.voyageai.com/v1)
		const baseURL = credentials.url || 'https://api.voyageai.com/v1';

		// Configure proxy support
		const proxyAgent = getProxyAgent(baseURL);

		// Convert empty string to undefined for inputType
		const inputType =
			options.inputType && options.inputType !== ''
				? (options.inputType as 'query' | 'document')
				: undefined;

		// Convert 0 to undefined for outputDimension (0 means "use default")
		const outputDimension =
			options.outputDimension && options.outputDimension !== 0
				? options.outputDimension
				: undefined;

		const embeddings = new VoyageEmbeddingsWithProxy({
			apiKey: credentials.apiKey,
			modelName,
			batchSize: options.batchSize,
			inputType,
			outputDimension,
			truncation: options.truncation,
			encodingFormat: options.encodingFormat,
			outputDtype: options.outputDtype,
			proxyAgent,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
