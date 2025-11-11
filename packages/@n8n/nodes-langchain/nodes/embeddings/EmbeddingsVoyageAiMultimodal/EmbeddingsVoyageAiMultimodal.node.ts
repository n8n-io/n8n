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
	type IBinaryData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

/**
 * Converts binary image data to a data URI
 */
function dataUriFromImageData(
	binaryData: IBinaryData,
	bufferData: Buffer,
	node: ReturnType<ISupplyDataFunctions['getNode']>,
): string {
	if (!binaryData.mimeType?.startsWith('image/')) {
		throw new NodeOperationError(
			node,
			`${binaryData.mimeType} is not a supported type of binary data. Only images are supported.`,
		);
	}
	return `data:${binaryData.mimeType};base64,${bufferData.toString('base64')}`;
}

/**
 * Custom embeddings class that wraps VoyageAI multimodal embeddings API.
 * This class supports text, image URLs, and binary images.
 */
class VoyageAIMultimodalEmbeddings extends Embeddings {
	private client: VoyageAIClient;
	private model: string;
	private inputType?: 'query' | 'document';
	private truncation: boolean;
	private executeFunctions: ISupplyDataFunctions;
	private node: ReturnType<ISupplyDataFunctions['getNode']>;

	// Cache for pre-computed embeddings
	private embeddingsCache: number[][] | null = null;
	private currentDocuments: string[] | null = null;

	constructor(fields: {
		apiKey: string;
		baseURL?: string;
		model: string;
		inputType?: 'query' | 'document';
		truncation?: boolean;
		executeFunctions: ISupplyDataFunctions;
		node: ReturnType<ISupplyDataFunctions['getNode']>;
	}) {
		super({});

		this.model = fields.model;
		this.inputType = fields.inputType;
		this.truncation = fields.truncation ?? true;
		this.executeFunctions = fields.executeFunctions;
		this.node = fields.node;

		// Create VoyageAI client
		// Note: Proxy support would need to be added via fetch interceptor if required
		this.client = new VoyageAIClient({
			apiKey: fields.apiKey,
			environment: fields.baseURL,
		});
	}

	/**
	 * Pre-compute embeddings for all input items with multimodal content.
	 */
	async precomputeEmbeddings(items: INodeExecutionData[]): Promise<void> {
		// Get content type parameter from first item
		const contentType = this.executeFunctions.getNodeParameter('contentType', 0, 'text') as string;

		// Build inputs for each item
		const inputs: Array<{
			content: Array<{
				type: string;
				text?: string;
				imageUrl?: string;
				imageBase64?: string;
			}>;
		}> = [];

		const documentOrder: string[] = []; // Track text for cache lookup

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const content: Array<{
				type: string;
				text?: string;
				imageUrl?: string;
				imageBase64?: string;
			}> = [];

			// Handle text input
			if (
				contentType === 'text' ||
				contentType === 'textAndImageUrl' ||
				contentType === 'textAndBinary'
			) {
				const textInput = this.executeFunctions.getNodeParameter('textInput', i, '') as string;
				if (textInput) {
					content.push({
						type: 'text',
						text: textInput,
					});
					documentOrder.push(textInput);
				} else if (contentType === 'text') {
					throw new NodeOperationError(
						this.node,
						'Text input is required when content type is "Text Only"',
					);
				}
			}

			// Handle image URL input
			if (contentType === 'textAndImageUrl' || contentType === 'imageUrl') {
				const imageUrl = this.executeFunctions.getNodeParameter('imageUrl', i) as string;
				if (!imageUrl) {
					throw new NodeOperationError(
						this.node,
						'Image URL is required for the selected content type',
					);
				}
				content.push({
					type: 'image_url',
					imageUrl,
				});
				// Add placeholder to document order for image-only content
				if (contentType === 'imageUrl') {
					documentOrder.push(`[image:${imageUrl}]`);
				}
			}

			// Handle binary image input
			if (contentType === 'textAndBinary' || contentType === 'binary') {
				const binaryDataKey = this.executeFunctions.getNodeParameter(
					'binaryDataKey',
					i,
					'data',
				) as string;
				const binaryData = item.binary?.[binaryDataKey];

				if (!binaryData) {
					throw new NodeOperationError(this.node, `No binary data found at key: ${binaryDataKey}`);
				}

				// Validate image MIME type
				if (!binaryData.mimeType?.startsWith('image/')) {
					throw new NodeOperationError(
						this.node,
						`Invalid MIME type: ${binaryData.mimeType}. Must be an image (PNG, JPEG, WEBP, or GIF).`,
					);
				}

				// Validate size (20MB limit)
				const maxSize = 20 * 1024 * 1024;
				if (binaryData.fileSize && Number(binaryData.fileSize) > maxSize) {
					throw new NodeOperationError(this.node, 'Image exceeds 20MB size limit');
				}

				// Convert binary data to base64 data URI
				const bufferData = await this.executeFunctions.helpers.getBinaryDataBuffer(
					i,
					binaryDataKey,
				);
				const dataUri = dataUriFromImageData(binaryData, bufferData, this.node);

				content.push({
					type: 'image_base64',
					imageBase64: dataUri,
				});

				// Add placeholder to document order for image-only content
				if (contentType === 'binary') {
					documentOrder.push(`[image:binary:${binaryDataKey}]`);
				}
			}

			if (content.length === 0) {
				throw new NodeOperationError(
					this.node,
					'At least one content item (text or image) is required',
				);
			}

			inputs.push({ content });
		}

		// Validate limits per API documentation
		if (inputs.length > 1000) {
			throw new NodeOperationError(this.node, 'Maximum 1,000 inputs exceeded');
		}

		try {
			// Call VoyageAI multimodal embeddings API
			const response = await this.client.multimodalEmbed({
				inputs,
				model: this.model,
				inputType: this.inputType,
				truncation: this.truncation,
			});

			// Extract embeddings
			if (!response.data || response.data.length === 0) {
				throw new NodeOperationError(this.node, 'No embeddings data returned from VoyageAI API');
			}

			const allEmbeddings: number[][] = [];
			for (const item of response.data) {
				if (item.embedding) {
					allEmbeddings.push(item.embedding);
				}
			}

			if (allEmbeddings.length !== inputs.length) {
				throw new NodeOperationError(
					this.node,
					`Expected ${inputs.length} embeddings but received ${allEmbeddings.length}`,
				);
			}

			// Cache the results
			this.embeddingsCache = allEmbeddings;
			this.currentDocuments = documentOrder;

			this.executeFunctions.logger.debug(
				`VoyageAI multimodal embeddings: processed ${inputs.length} inputs`,
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
				// If exact match not found, return first embedding (single-item case)
				if (this.embeddingsCache.length === 1) {
					embeddings.push(this.embeddingsCache[0]);
				} else {
					throw new NodeOperationError(
						this.node,
						`Document not found in pre-computed cache: ${doc}`,
					);
				}
			} else {
				embeddings.push(this.embeddingsCache[index]);
			}
		}

		return embeddings;
	}

	/**
	 * Embed a single query (text-only, no images).
	 */
	async embedQuery(query: string): Promise<number[]> {
		try {
			const response = await this.client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: query,
							},
						],
					},
				],
				model: this.model,
				inputType: this.inputType || 'query',
				truncation: this.truncation,
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

export class EmbeddingsVoyageAiMultimodal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings VoyageAI Multimodal',
		name: 'embeddingsVoyageAiMultimodal',
		icon: 'file:voyageAi.svg',
		group: ['transform'],
		version: 1,
		description:
			'Generate multimodal embeddings from text and images using VoyageAI voyage-multimodal-3 model',
		defaults: {
			name: 'Embeddings VoyageAI Multimodal',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsvoyageaimultimodal/',
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
					'This node generates embeddings from text, images, or both using the voyage-multimodal-3 model. Images can be provided via URL or as binary data.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				default: 'text',
				required: true,
				description: 'What type of content to embed',
				options: [
					{
						name: 'Binary Image Only',
						value: 'binary',
						description: 'Embed image from binary data only',
					},
					{
						name: 'Image URL Only',
						value: 'imageUrl',
						description: 'Embed image from URL only',
					},
					{
						name: 'Text + Binary Image',
						value: 'textAndBinary',
						description: 'Embed text and image from binary data',
					},
					{
						name: 'Text + Image URL',
						value: 'textAndImageUrl',
						description: 'Embed text and image from URL',
					},
					{
						name: 'Text Only',
						value: 'text',
						description: 'Embed text content only',
					},
				],
			},
			{
				displayName: 'Text Input',
				name: 'textInput',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						contentType: ['text', 'textAndImageUrl', 'textAndBinary'],
					},
				},
				description: 'The text content to embed',
				placeholder: 'Enter text to embed...',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						contentType: ['textAndImageUrl', 'imageUrl'],
					},
				},
				required: true,
				description: 'The URL of the image to embed (PNG, JPEG, WEBP, or GIF)',
				placeholder: 'https://example.com/image.jpg',
			},
			{
				displayName: 'Binary Data Key',
				name: 'binaryDataKey',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						contentType: ['textAndBinary', 'binary'],
					},
				},
				required: true,
				description: 'The key in the binary data to use for the image',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options',
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
						displayName: 'Truncation',
						name: 'truncation',
						type: 'boolean',
						default: true,
						description:
							'Whether to automatically truncate inputs that exceed the maximum token length',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for VoyageAI multimodal embeddings');

		const credentials = await this.getCredentials<{ apiKey: string; url?: string }>('voyageAiApi');

		// Get options
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			inputType?: string;
			truncation?: boolean;
		};

		// Get base URL from credentials
		const baseURL = credentials.url || 'https://api.voyageai.com/v1';

		// Convert empty string to undefined for inputType
		const inputType =
			options.inputType && options.inputType !== ''
				? (options.inputType as 'query' | 'document')
				: undefined;

		// Create embeddings instance
		const embeddings = new VoyageAIMultimodalEmbeddings({
			apiKey: credentials.apiKey,
			baseURL,
			model: 'voyage-multimodal-3',
			inputType,
			truncation: options.truncation,
			executeFunctions: this,
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
