import { VoyageAIClient } from 'voyageai';
import { Embeddings } from '@langchain/core/embeddings';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type INodeExecutionData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

/**
 * Custom embeddings class that wraps VoyageAI contextualized embeddings API.
 * This class pre-processes input items by grouping chunks by document ID,
 * calls the VoyageAI SDK, and returns pre-computed embeddings.
 */
class VoyageAIContextualizedEmbeddings extends Embeddings {
	private client: VoyageAIClient;
	private model: string;
	private inputType?: 'query' | 'document';
	private outputDimension?: number;
	private outputDtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';
	private executeFunctions: ISupplyDataFunctions;
	private documentIdField: string;
	private textField: string;
	private node: ReturnType<ISupplyDataFunctions['getNode']>;

	// Cache for pre-computed embeddings
	private embeddingsCache: number[][] | null = null;
	private currentDocuments: string[] | null = null;

	constructor(fields: {
		apiKey: string;
		baseURL?: string;
		model: string;
		inputType?: 'query' | 'document';
		outputDimension?: number;
		outputDtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';
		executeFunctions: ISupplyDataFunctions;
		documentIdField: string;
		textField: string;
		node: ReturnType<ISupplyDataFunctions['getNode']>;
	}) {
		super({});

		this.model = fields.model;
		this.inputType = fields.inputType;
		this.outputDimension = fields.outputDimension;
		this.outputDtype = fields.outputDtype;
		this.executeFunctions = fields.executeFunctions;
		this.documentIdField = fields.documentIdField;
		this.textField = fields.textField;
		this.node = fields.node;

		// Create VoyageAI client
		this.client = new VoyageAIClient({
			apiKey: fields.apiKey,
			environment: fields.baseURL,
		});
	}

	/**
	 * Pre-compute embeddings for all input items.
	 * This method groups chunks by document ID and calls the contextualized embeddings API.
	 */
	async precomputeEmbeddings(items: INodeExecutionData[]): Promise<void> {
		// Group chunks by document ID
		const documentGroups = new Map<string, string[]>();
		const documentOrder: string[] = []; // Track order of chunks

		for (const item of items) {
			const docId = item.json[this.documentIdField];
			const text = item.json[this.textField];

			if (docId === undefined || docId === null) {
				throw new NodeOperationError(
					this.node,
					`Missing document ID in field: ${this.documentIdField}`,
				);
			}
			if (!text) {
				throw new NodeOperationError(this.node, `Missing text in field: ${this.textField}`);
			}

			const docIdStr = String(docId);

			if (!documentGroups.has(docIdStr)) {
				documentGroups.set(docIdStr, []);
			}
			documentGroups.get(docIdStr)!.push(String(text));
			documentOrder.push(String(text));
		}

		// Convert to string[][]
		const inputs = Array.from(documentGroups.values());

		// Validate limits per API documentation
		if (inputs.length > 1000) {
			throw new NodeOperationError(this.node, 'Maximum 1,000 document groups exceeded');
		}
		const totalChunks = inputs.flat().length;
		if (totalChunks > 16000) {
			throw new NodeOperationError(this.node, 'Maximum 16,000 chunks exceeded');
		}

		try {
			// Call VoyageAI contextualized embeddings API
			const response = await this.client.contextualizedEmbed({
				inputs,
				model: this.model,
				inputType: this.inputType,
				outputDimension: this.outputDimension,
				outputDtype: this.outputDtype,
			});

			// Flatten embeddings to match input items order
			if (!response.data) {
				throw new NodeOperationError(this.node, 'No embeddings data returned from VoyageAI API');
			}

			const allEmbeddings: number[][] = [];
			for (const docEmbeddings of response.data) {
				if (Array.isArray(docEmbeddings)) {
					for (const embedding of docEmbeddings) {
						if (embedding.embedding) {
							allEmbeddings.push(embedding.embedding);
						}
					}
				}
			}

			// Cache the results
			this.embeddingsCache = allEmbeddings;
			this.currentDocuments = documentOrder;

			this.executeFunctions.logger.debug(
				`VoyageAI contextualized embeddings: processed ${totalChunks} chunks from ${inputs.length} documents`,
			);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(this.node, `VoyageAI API error: ${error.message}`);
		}
	}

	/**
	 * Embed documents by returning pre-computed embeddings.
	 * This assumes precomputeEmbeddings() was called first.
	 */
	async embedDocuments(documents: string[]): Promise<number[][]> {
		if (!this.embeddingsCache || !this.currentDocuments) {
			throw new NodeOperationError(
				this.node,
				'Embeddings not pre-computed. This should not happen in normal operation.',
			);
		}

		// Map documents to their cached embeddings
		const embeddings: number[][] = [];
		for (const doc of documents) {
			const index = this.currentDocuments.indexOf(doc);
			if (index === -1) {
				throw new NodeOperationError(this.node, `Document not found in pre-computed cache: ${doc}`);
			}
			embeddings.push(this.embeddingsCache[index]);
		}

		return embeddings;
	}

	/**
	 * Embed a single query.
	 * For queries, we use the standard embeddings API without contextualization.
	 */
	async embedQuery(query: string): Promise<number[]> {
		try {
			const response = await this.client.embed({
				input: query,
				model: this.model,
				inputType: this.inputType || 'query',
				outputDimension: this.outputDimension,
				outputDtype: this.outputDtype,
			});

			if (!response.data || response.data.length === 0 || !response.data[0].embedding) {
				throw new NodeOperationError(this.node, 'No embedding data returned from VoyageAI API');
			}

			return response.data[0].embedding;
		} catch (error) {
			throw new NodeOperationError(this.node, `VoyageAI API error: ${error.message}`);
		}
	}
}

export class EmbeddingsVoyageAiContextualized implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings VoyageAI Contextualized',
		name: 'embeddingsVoyageAiContextualized',
		icon: 'file:voyageAi.svg',
		group: ['transform'],
		version: 1,
		description:
			'Generate contextual embeddings for document chunks using VoyageAI, preserving inter-chunk relationships',
		defaults: {
			name: 'Embeddings VoyageAI Contextualized',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsvoyageaicontextualized/',
					},
				],
			},
		},

		inputs: [NodeConnectionTypes.Main],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName:
					'This node processes document chunks grouped by a document ID field to generate context-aware embeddings. Chunks with the same document ID will be processed together to preserve inter-chunk relationships.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Document ID Field',
				name: 'documentIdField',
				type: 'string',
				default: 'documentId',
				required: true,
				description:
					'The field name containing the document identifier. Chunks with the same document ID will be processed together to preserve context.',
				placeholder: 'documentId',
			},
			{
				displayName: 'Text Field',
				name: 'textField',
				type: 'string',
				default: 'text',
				required: true,
				description: 'The field name containing the chunk text to embed',
				placeholder: 'text',
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
						description: 'The number of dimensions for the output embeddings. Default is 1024.',
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
						displayName: 'Output Data Type',
						name: 'outputDtype',
						type: 'options',
						default: 'float',
						description:
							'The data type for embeddings. Quantization options reduce storage and improve latency.',
						options: [
							{
								name: 'Binary',
								value: 'binary',
							},
							{
								name: 'Float (Full Precision)',
								value: 'float',
							},
							{
								name: 'Int8 (8-Bit Integer)',
								value: 'int8',
							},
							{
								name: 'Ubinary (Unsigned Binary)',
								value: 'ubinary',
							},
							{
								name: 'Uint8 (Unsigned 8-Bit Integer)',
								value: 'uint8',
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for VoyageAI contextualized embeddings');

		const credentials = await this.getCredentials<{ apiKey: string; url?: string }>('voyageAiApi');

		// Get parameters
		const documentIdField = this.getNodeParameter('documentIdField', 0) as string;
		const textField = this.getNodeParameter('textField', 0) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			inputType?: string;
			outputDimension?: number;
			outputDtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';
		};

		// Get base URL from credentials (defaults to https://api.voyageai.com/v1)
		const baseURL = credentials.url || 'https://api.voyageai.com/v1';

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

		// Create embeddings instance
		const embeddings = new VoyageAIContextualizedEmbeddings({
			apiKey: credentials.apiKey,
			baseURL,
			model: 'voyage-context-3',
			inputType,
			outputDimension,
			outputDtype: options.outputDtype,
			executeFunctions: this,
			documentIdField,
			textField,
			node: this.getNode(),
		});

		// Get input items to pre-compute embeddings
		const items = this.getInputData();

		// Pre-compute embeddings for all items
		await embeddings.precomputeEmbeddings(items);

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
