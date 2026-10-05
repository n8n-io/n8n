import { OpenAIEmbeddings } from '@langchain/openai';
import {
	getConnectionHintNoticeField,
	logWrapper,
	makeN8nLlmFailedAttemptHandler,
} from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { makeDatabricksFailedAttemptHandler } from '@utils/databricks/error-handling';
import { DATABRICKS_REQUEST_TIMEOUT_MS } from '@utils/databricks/constants';
import { createDatabricksGatewayConfig } from '@utils/databricks/gateway-config';
import { EMBEDDINGS_CAPABILITY, makeModelSearch } from '@utils/databricks/model-services';
import {
	DATABRICKS_CREDENTIAL_TYPE,
	type DatabricksOAuth2Credential,
} from '@utils/databricks/token-provider';

const searchModels = makeModelSearch(EMBEDDINGS_CAPABILITY);

export class EmbeddingsDatabricks implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Embeddings Databricks',
		name: 'embeddingsDatabricks',
		hidden: true,
		icon: {
			light: 'file:../../shared/icons/databricks.svg',
			dark: 'file:../../shared/icons/databricks.dark.svg',
		},
		group: ['transform'],
		version: 1,
		description: 'Use Databricks Embeddings',
		defaults: {
			name: 'Embeddings Databricks',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsdatabricks/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		credentials: [
			{
				name: 'databricksOAuth2Api',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: {
							searchListMethod: 'searchModels',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'system.ai.gte-large-en',
					},
				],
				description:
					'The Unity AI Gateway model service. Choose from the list, or enter its full name (catalog.schema.service).',
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
						default: 360000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credential = await this.getCredentials<DatabricksOAuth2Credential>(
			DATABRICKS_CREDENTIAL_TYPE,
		);

		const modelName = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			batchSize?: number;
			stripNewLines?: boolean;
			timeout?: number;
			maxRetries?: number;
		};

		const timeout = options.timeout ?? DATABRICKS_REQUEST_TIMEOUT_MS;
		const { configuration, tokenSource } = createDatabricksGatewayConfig(this, credential, timeout);

		const embeddings = new OpenAIEmbeddings({
			// Placeholder only - the fetch wrapper overwrites the Authorization header
			apiKey: 'databricks-oauth',
			model: modelName,
			...options,
			timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(
				this,
				makeDatabricksFailedAttemptHandler(tokenSource.expiredStatus, modelName),
			),
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
