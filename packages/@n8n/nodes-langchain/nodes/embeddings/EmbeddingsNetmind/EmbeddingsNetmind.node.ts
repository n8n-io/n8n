/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { OpenAIEmbeddings } from '@langchain/openai';
import {
	NodeConnectionType,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type { ClientOptions } from 'openai';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class EmbeddingsNetmind implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Netmind',
		name: 'embeddingsNetmind',
		icon: 'file:netmind.svg',
		credentials: [
			{
				name: 'netmindApi',
				required: true,
			},
		],
		group: ['transform'],
		version: 1,
		description: 'Use Embeddings Netmind',
		defaults: {
			name: 'Embeddings Netmind',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://netmind.ai/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiEmbedding],
		outputNames: ['Embeddings'],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials?.url }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description: 'The name of the model to use',
				default: '',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: 'https://api.netmind.ai/v1/model?page_size=100',
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
											pass: `={{$responseItem.model_type === 'Embedding'}}`,
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.model_name}}',
											value: '={{$responseItem.model_name}}',
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
						displayName: 'Timeout',
						name: 'timeout',
						default: -1,
						description:
							'Maximum amount of time a request is allowed to take in seconds. Set to -1 for no timeout.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings');
		const credentials = await this.getCredentials<{ apiKey: string }>('netmindApi');
		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			timeout?: number;
		};

		if (options.timeout === -1) {
			options.timeout = undefined;
		}

		const configuration: ClientOptions = {};
		configuration.baseURL = credentials.url;
		const embeddings = new OpenAIEmbeddings(
			{
				model: modelName,
				apiKey: credentials.apiKey,
				...options,
			},
			configuration,
		);

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
