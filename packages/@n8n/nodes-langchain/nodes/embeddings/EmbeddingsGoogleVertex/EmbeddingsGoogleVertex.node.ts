import { ProjectsClient } from '@google-cloud/resource-manager';
import type { GoogleAuthOptions } from 'google-auth-library';
import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { formatPrivateKey } from 'n8n-nodes-base/dist/utils/utilities';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class EmbeddingsGoogleVertex implements INodeType {
	methods = {
		listSearch: {
			async gcpProjectsList(this: ILoadOptionsFunctions) {
				const results: Array<{ name: string; value: string }> = [];

				const credentials = await this.getCredentials('googleApi');
				const privateKey = formatPrivateKey(credentials.privateKey as string);
				const email = (credentials.email as string).trim();

				const client = new ProjectsClient({
					credentials: {
						client_email: email,
						private_key: privateKey,
					},
				});

				const [projects] = await client.searchProjects();

				for (const project of projects) {
					if (project.projectId) {
						results.push({
							name: project.displayName ?? project.projectId,
							value: project.projectId,
						});
					}
				}

				return { results };
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
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleApiAdcApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['adc'],
					},
				},
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsgooglevertex/',
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
					'Each model is using different dimensional density for embeddings. Please make sure to use the same dimensionality for your vector store. The default model is using 768-dimensional embeddings. You can find available models <a href="https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api">here</a>.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Service Account',
						value: 'serviceAccount',
						description: 'Use a Google Service Account JSON key',
					},
					{
						name: 'Application Default Credentials (ADC)',
						value: 'adc',
						description:
							'Use Application Default Credentials from gcloud CLI or environment variable',
					},
				],
				default: 'serviceAccount',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select or enter your Google Cloud project ID',
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
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
				displayName: 'Project ID',
				name: 'projectIdAdc',
				type: 'string',
				default: '',
				description:
					'Your Google Cloud project ID. If left empty, it will be auto-detected from ADC configuration.',
				displayOptions: {
					show: {
						authentication: ['adc'],
					},
				},
			},
			{
				displayName: 'Model Name',
				name: 'modelName',
				type: 'string',
				description:
					'The model which will generate the embeddings. <a href="https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api">Learn more</a>.',
				default: 'text-embedding-005',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const authentication = this.getNodeParameter('authentication', itemIndex, 'serviceAccount') as
			| 'serviceAccount'
			| 'adc';

		let authOptions: GoogleAuthOptions;
		let region: string;

		if (authentication === 'adc') {
			const credentials = await this.getCredentials('googleApiAdcApi');
			region = credentials.region as string;
			const projectId =
				(this.getNodeParameter('projectIdAdc', itemIndex, '') as string) ||
				(credentials.projectId as string) ||
				'';

			// For ADC, we don't pass explicit credentials - GoogleAuth will use ADC automatically
			authOptions = {};
			if (projectId) {
				authOptions.projectId = projectId;
			}
		} else {
			// Use Service Account credentials
			const credentials = await this.getCredentials('googleApi');
			const privateKey = formatPrivateKey(credentials.privateKey as string);
			const email = (credentials.email as string).trim();
			region = credentials.region as string;
			const projectId = this.getNodeParameter('projectId', itemIndex, '', {
				extractValue: true,
			}) as string;

			authOptions = {
				projectId,
				credentials: {
					client_email: email,
					private_key: privateKey,
				},
			};
		}

		const modelName = this.getNodeParameter('modelName', itemIndex) as string;

		const embeddings = new VertexAIEmbeddings({
			authOptions,
			location: region,
			model: modelName,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
