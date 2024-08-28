/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { OpenAIEmbeddings } from '@langchain/openai';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class EmbeddingsAzureOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Azure OpenAI',
		name: 'embeddingsAzureOpenAi',
		icon: 'file:azure.svg',
		credentials: [
			{
				name: 'azureOpenAiApi',
				required: true,
			},
		],
		group: ['transform'],
		version: 1,
		description: 'Use Embeddings Azure OpenAI',
		defaults: {
			name: 'Embeddings Azure OpenAI',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsazureopenai/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
			{
				displayName: 'Model (Deployment) Name',
				name: 'model',
				type: 'string',
				description: 'The name of the model(deployment) to use',
				default: '',
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
						default: 512,
						typeOptions: { maxValue: 2048 },
						description: 'Maximum number of documents to send in each request',
						type: 'number',
					},
					{
						displayName: 'Strip New Lines',
						name: 'stripNewLines',
						default: true,
						description: 'Whether to strip new lines from the input text',
						type: 'boolean',
					},
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

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings');
		const credentials = await this.getCredentials<{
			apiKey: string;
			resourceName: string;
			apiVersion: string;
		}>('azureOpenAiApi');
		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			batchSize?: number;
			stripNewLines?: boolean;
			timeout?: number;
		};

		if (options.timeout === -1) {
			options.timeout = undefined;
		}

		const embeddings = new OpenAIEmbeddings({
			azureOpenAIApiDeploymentName: modelName,
			azureOpenAIApiInstanceName: credentials.resourceName,
			azureOpenAIApiKey: credentials.apiKey,
			azureOpenAIApiVersion: credentials.apiVersion,
			...options,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
