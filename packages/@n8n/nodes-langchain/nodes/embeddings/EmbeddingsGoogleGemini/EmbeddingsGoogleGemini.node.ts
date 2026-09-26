import {
	NodeConnectionTypes,
	NodeOperationError,
	type INode,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';

import { GeminiEmbeddings } from './helpers';

/**
 * The `minValue` and `numberPrecision` constraints only apply to values typed into the editor, so
 * an expression can still resolve to a fraction or to a value below 1. Such a value is rejected
 * here, because the API answers it with a request error that does not name the parameter.
 */
function parseOutputDimensionality(node: INode, value: unknown): number | undefined {
	if (value === undefined || value === null || value === '') return undefined;

	const dimensionality = typeof value === 'string' ? Number(value) : value;
	if (
		typeof dimensionality !== 'number' ||
		!Number.isInteger(dimensionality) ||
		dimensionality < 1
	) {
		throw new NodeOperationError(node, `Invalid output dimensionality: ${JSON.stringify(value)}`, {
			description: 'The output dimensionality must be a whole number of 1 or more.',
		});
	}

	return dimensionality;
}

export class EmbeddingsGoogleGemini implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Google Gemini',
		name: 'embeddingsGoogleGemini',
		icon: 'file:google.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Google Gemini Embeddings',
		defaults: {
			name: 'Embeddings Google Gemini',
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.host }}',
		},
		credentials: [
			{
				name: 'googlePalmApi',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsgooglegemini/',
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
					'Each model uses a different embedding dimensionality. Make sure your vector store is configured for the same dimensionality. The default model (gemini-embedding-001) returns 3072-dimensional embeddings unless the Output Dimensionality option is set.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description:
					'The model which will generate the embeddings. <a href="https://developers.generativeai.google/api/rest/generativelanguage/models/list">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/v1beta/models',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'models',
										},
									},
									{
										type: 'filter',
										properties: {
											pass: "={{ $responseItem.name.includes('embedding') }}",
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.name}}',
											value: '={{$responseItem.name}}',
											description: '={{$responseItem.description}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				default: 'models/gemini-embedding-001',
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
						displayName: 'Output Dimensionality',
						name: 'outputDimensionality',
						default: undefined,
						description:
							'The number of dimensions the returned embeddings should have, e.g. 768, 1536 or 3072 for gemini-embedding-001. Leave unset to use the model default.',
						type: 'number',
						typeOptions: { minValue: 1, numberPrecision: 0 },
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings Google Gemini');
		const modelName = this.getNodeParameter(
			'modelName',
			itemIndex,
			'models/gemini-embedding-001',
		) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			outputDimensionality?: unknown;
		};
		const outputDimensionality = parseOutputDimensionality(
			this.getNode(),
			options.outputDimensionality,
		);

		const credentials = await this.getCredentials('googlePalmApi');
		const embeddings = new GeminiEmbeddings({
			apiKey: credentials.apiKey as string,
			baseUrl: credentials.host as string,
			model: modelName,
			outputDimensionality,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
