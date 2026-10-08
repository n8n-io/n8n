import { googleApiCredentialTest } from 'n8n-nodes-base/google-service-account';
import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

import { getVertexEndpoint, vertexLocationField } from '../../llms/gemini-common/vertex-location';

import {
	googleVertexAuthentication,
	googleVertexCredentials,
	resolveGoogleVertexCredentials,
	searchGoogleProjects,
} from '@utils/google-vertex';

export class EmbeddingsGoogleVertex implements INodeType {
	methods = {
		credentialTest: { googleApiCredentialTest },
		listSearch: {
			async gcpProjectsList(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			) {
				return await searchGoogleProjects(
					await this.getCredentials('googleApi'),
					filter,
					paginationToken,
				);
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Embeddings Google Vertex',
		name: 'embeddingsGoogleVertex',
		icon: 'file:google.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Google Vertex Embeddings',
		defaults: {
			name: 'Embeddings Google Vertex',
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.host }}',
		},
		credentials: googleVertexCredentials,
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsgooglevertex/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],

		properties: [
			googleVertexAuthentication,
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName:
					'Each model is using different dimensional density for embeddings. Please make sure to use the same dimensionality for your vector store. The default model is using 768-dimensional embeddings. You can find available models <a href="https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api">here</a>.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				displayOptions: { show: { authentication: ['googleApi'] } },
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select or enter your Google Cloud project ID',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'gcpProjectsList',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Model Name',
				name: 'modelName',
				type: 'string',
				description:
					'The model which will generate the embeddings. <a href="https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api">Learn more</a>.',
				default: 'text-embedding-005',
			},
			vertexLocationField,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const { projectId, credentials, location } = await resolveGoogleVertexCredentials(
			this,
			itemIndex,
		);
		const endpoint = getVertexEndpoint(location);

		const modelName = this.getNodeParameter('modelName', itemIndex) as string;

		const embeddings = new VertexAIEmbeddings({
			authOptions: {
				projectId,
				credentials,
			},
			location,
			...(endpoint ? { endpoint } : {}),
			model: modelName,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
