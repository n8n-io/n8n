/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class EmbeddingsVoyageAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings VoyageAI',
		name: 'embeddingsVoyageAi',
		icon: { light: 'file:voyageai.svg', dark: 'file:voyageai.dark.png' },
		group: ['transform'],
		version: 1,
		description: 'Use VoyageAI Embeddings',
		defaults: {
			name: 'Embeddings VoyageAI',
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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName:
					'VoyageAI provides different models with varying dimensions. Make sure to use the same dimensionality for your vector store.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description: 'The model which will generate the embeddings',
				default: 'voyage-3.5',
				options: [
					{
						name: 'Voyage-3.5 (1024 (default), 256, 512, 2048)',
						value: 'voyage-3.5',
					},
					{
						name: 'Voyage-3-large (2048, 1024 (default), 512, 256 dimensions)',
						value: 'voyage-3-large',
					},
					{
						name: 'Voyage-3.5-lite (1024 (default), 256, 512, 2048 dimensions)',
						value: 'voyage-3.5-lite',
					},
					{
						name: 'voyage-code-3  (1024 (default), 256, 512, 2048 dimensions)',
						value: 'voyage-code-3',
					},
					{
						name: 'Voyage-finance-2 (1024 dimensions)',
						value: 'voyage-finance-2',
					},
					{
						name: 'Voyage-code-2 (1536 dimensions)',
						value: 'voyage-code-2',
					},
					{
						name: 'Voyage-law-2 (1024 dimensions)',
						value: 'voyage-law-2',
					},
				],
			},
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				description: 'The type of input text for better embedding results',
				default: '',
				options: [
					{
						name: 'None',
						value: '',
						description: 'No specific input type',
					},
					{
						name: 'Query',
						value: 'query',
						description: 'For search or retrieval queries',
					},
					{
						name: 'Document',
						value: 'document',
						description:
							'For documents or content that you want to be retrievable (embeddeings stored in vector store)',
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
						displayName: 'Truncation',
						name: 'truncation',
						default: true,
						description:
							'Whether to truncate the input texts to the maximum length allowed by the model',
						type: 'boolean',
					},
					{
						displayName: 'Output Dimension',
						name: 'outputDimension',
						default: undefined,
						description: 'The desired dimension of the output embeddings',
						type: 'options',
						options: [
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
								name: '1536',
								value: 1536,
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
						default: 'float',
						description: 'The data type of the output embeddings',
						type: 'options',
						options: [
							{
								name: 'Float',
								value: 'float',
							},
							{
								name: 'Int8',
								value: 'int8',
							},
						],
					},
					{
						displayName: 'Encoding Format',
						name: 'encodingFormat',
						default: 'float',
						description: 'The format of the output embeddings',
						type: 'options',
						options: [
							{
								name: 'Float',
								value: 'float',
							},
							{
								name: 'Base64',
								value: 'base64',
							},
							{
								name: 'UBinary',
								value: 'ubinary',
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings VoyageAI');
		const modelName = this.getNodeParameter('modelName', itemIndex, 'voyage-2') as string;
		const inputType = this.getNodeParameter('inputType', itemIndex, '') as string | undefined;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			truncation?: boolean;
			outputDimension?: number;
			outputDtype?: string;
			encodingFormat?: string;
		};

		const credentials = await this.getCredentials('voyageAiApi');

		const embeddings = new VoyageEmbeddings({
			apiKey: credentials.apiKey as string,
			modelName: modelName,
			inputType: inputType || undefined,
			...options,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
