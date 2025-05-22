import {
	MatchingEngine,
	MatchingEngineArgs,
} from '@langchain/community/vectorstores/googlevertexai';
import { GoogleCloudStorageDocstore } from '@langchain/community/stores/doc/gcs';
import { Embeddings } from '@langchain/core/embeddings';
import {
	type INodeProperties,
	type IDataObject,
	NodeOperationError,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
} from 'n8n-workflow';
import {
	IndexServiceClient,
	IndexEndpointServiceClient,
} from '@google-cloud/aiplatform/build/src/v1'; // Using v1 as per typical usage

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { metadataFilterField } from '@utils/sharedFields';

const googleApiCredentialsNotice: INodeProperties = {
	displayName:
		'Note: This node uses Google Cloud credentials. Ensure your service account has the "Vertex AI User" role or equivalent permissions.',
	name: 'googleApiCredentialsNotice',
	type: 'notice',
	default: '',
};

const vertexAiRegionField: INodeProperties = {
	displayName: 'Region',
	name: 'region',
	type: 'string',
	default: 'us-central1',
	required: true,
	description: 'The Google Cloud region where your resources are located.',
	placeholder: 'us-central1',
};

async function vertexAiIndexSearch(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('googleCloudApi');
	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'Google Cloud API credentials are required.');
	}

	const region = this.getNodeParameter('region', '') as string;
	if (!region) {
		// Do not throw, let user select region first. List search should not fail if a dependent field is not yet set.
		return [];
	}

	const clientOptions = {
		apiEndpoint: `${region}-aiplatform.googleapis.com`,
		credentials: credentials.gcpCredentials, // Pass the actual credentials object
	};

	const client = new IndexServiceClient(clientOptions);

	// Ensure project_id is available. For service accounts, it's usually in credentials.project_id
	const projectId = (credentials.gcpCredentials as IDataObject)?.project_id as string ?? credentials.projectId as string;

	if (!projectId) {
		throw new NodeOperationError(
			this.getNode(),
			'Project ID not found in credentials. Ensure your service account key JSON is correctly configured.',
		);
	}

	const parent = `projects/${projectId}/locations/${region}`;

	try {
		const [indexes] = await client.listIndexes({ parent });
		if (!indexes) return [];
		return indexes.map((index) => {
			const nameParts = index.name?.split('/');
			const id = nameParts?.[nameParts.length - 1] ?? index.name;
			return {
				name: index.displayName || id || 'Unnamed Index',
				value: id || '', // Ensure value is the actual ID
			};
		});
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error as Error);
	}
}

async function vertexAiIndexEndpointSearch(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('googleCloudApi');
	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'Google Cloud API credentials are required.');
	}

	const region = this.getNodeParameter('region', '') as string;
	if (!region) {
		return [];
	}

	const clientOptions = {
		apiEndpoint: `${region}-aiplatform.googleapis.com`,
		credentials: credentials.gcpCredentials,
	};

	const client = new IndexEndpointServiceClient(clientOptions);
	const projectId = (credentials.gcpCredentials as IDataObject)?.project_id as string ?? credentials.projectId as string;


	if (!projectId) {
		throw new NodeOperationError(
			this.getNode(),
			'Project ID not found in credentials. Ensure your service account key JSON is correctly configured.',
		);
	}
	const parent = `projects/${projectId}/locations/${region}`;

	try {
		const [endpoints] = await client.listIndexEndpoints({ parent });
		if (!endpoints) return [];
		return endpoints.map((endpoint) => {
			const nameParts = endpoint.name?.split('/');
			const id = nameParts?.[nameParts.length - 1] ?? endpoint.name;
			return {
				name: endpoint.displayName || id || 'Unnamed Endpoint',
				value: id || '', // Ensure value is the actual ID
			};
		});
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error as Error);
	}
}

const sharedFields: INodeProperties[] = [
	googleApiCredentialsNotice,
	vertexAiRegionField,
	{
		displayName: 'Index ID',
		name: 'indexId',
		type: 'options',
		default: '',
		required: true,
		description: 'The ID of the Matching Engine index. Choose from the list or enter a valid Index ID.',
		typeOptions: {
			listSearchMethod: 'vertexAiIndexSearch',
			dependsOn: ['googleCloudApi', 'region'],
			loadOptionsMethod: 'vertexAiIndexSearch', // For consistency if listSearchMethod is used for dynamic options
		},
	},
	{
		displayName: 'Index Endpoint ID',
		name: 'indexEndpointId',
		type: 'options',
		default: '',
		required: true,
		description:
			'The ID of the public Matching Engine index endpoint. Choose from the list or enter a valid Index Endpoint ID.',
		typeOptions: {
			listSearchMethod: 'vertexAiIndexEndpointSearch',
			dependsOn: ['googleCloudApi', 'region'],
			loadOptionsMethod: 'vertexAiIndexEndpointSearch', // For consistency
		},
	},
	{
		displayName: 'GCS Bucket Name',
		name: 'gcsBucketName',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the GCS bucket for the document store.',
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Vertex AI Filter',
				name: 'vertexAiFilter',
				type: 'json',
				default: '',
				description:
					'Vertex AI Matching Engine filter. Array of restrictions (e.g., [{namespace: "color", allowList: ["red"]}]). Refer to LangChain documentation for googlevertexai.MatchingEngine.similaritySearch',
				typeOptions: {
					rows: 5,
				},
			},
			metadataFilterField, // Standard metadata filter, which might be translated to allowList internally by Langchain
		],
	},
];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			// No specific insert options identified for MatchingEngine.fromDocuments beyond shared ones.
			// Add if any are found in the future.
		],
	},
];

const updateFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			// No specific update options identified. Updates likely handled by re-insertion.
			// Add if any are found in the future.
		],
	},
];

export class VectorStoreVertexAI extends createVectorStoreNode<
	MatchingEngine,
	MatchingEngineArgs
>({
	meta: {
		displayName: 'Vertex AI Vector Store',
		name: 'vectorStoreVertexAI',
		icon: 'file:vertexai.svg', // Assuming you have a vertexai.svg icon
		description: 'Work with your data in Google Cloud Vertex AI Matching Engine',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorevertexai/', // Replace with actual docs URL
		credentials: [
			{
				name: 'googleCloudApi', // Assuming a generic Google Cloud API credential type
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'], // Adjust as needed
	},
	methods: {
		listSearch: {
			vertexAiIndexSearch,
			vertexAiIndexEndpointSearch,
		},
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields, // Or define specific load fields
	retrieveFields,
	updateFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const indexId = context.getNodeParameter('indexId', itemIndex, '') as string; // This will now be the full resource name or just ID based on listSearch
		const indexEndpointId = context.getNodeParameter('indexEndpointId', itemIndex, '') as string; // Same as above
		const gcsBucketName = context.getNodeParameter('gcsBucketName', itemIndex, '') as string;
		const region = context.getNodeParameter('region', itemIndex, 'us-central1') as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			vertexAiFilter?: IDataObject | string;
		};

		// Extract actual ID if full resource name is provided by listSearch
		const finalIndexId = indexId.includes('/') ? indexId.split('/').pop()! : indexId;
		const finalIndexEndpointId = indexEndpointId.includes('/')
			? indexEndpointId.split('/').pop()!
			: indexEndpointId;


		if (!finalIndexId) {
			throw new NodeOperationError(context.getNode(), 'Index ID is required.', { itemIndex });
		}
		if (!finalIndexEndpointId) {
			throw new NodeOperationError(context.getNode(), 'Index Endpoint ID is required.', {
				itemIndex,
			});
		}
		if (!gcsBucketName) {
			throw new NodeOperationError(context.getNode(), 'GCS Bucket Name is required.', { itemIndex });
		}

		const credentials = await context.getCredentials('googleCloudApi');

		if (!credentials) {
			throw new NodeOperationError(context.getNode(), 'Google Cloud API credentials are required.', {
				itemIndex,
			});
		}

		const gcpCreds = credentials.gcpCredentials as IDataObject;

		const docstore = new GoogleCloudStorageDocstore({
			bucket: gcsBucketName,
			credentials: gcpCreds,
		});

		let vertexFilterToUse = filter; // Langchain's base filter from metadata

		// If specific vertexAiFilter is provided, parse and use it
		if (options.vertexAiFilter) {
			if (typeof options.vertexAiFilter === 'string' && options.vertexAiFilter.trim() !== '') {
				try {
					vertexFilterToUse = JSON.parse(options.vertexAiFilter);
				} catch (e) {
					throw new NodeOperationError(
						context.getNode(),
						'Vertex AI Filter is not valid JSON.',
						{ itemIndex },
					);
				}
			} else if (typeof options.vertexAiFilter === 'object') {
				vertexFilterToUse = options.vertexAiFilter;
			}
		}

		const client = new MatchingEngine(embeddings, {
			index: finalIndexId,
			indexEndpoint: finalIndexEndpointId,
			docstore,
			filter: vertexFilterToUse,
			credentials: gcpCreds,
			apiEndpoint: `${region}-aiplatform.googleapis.com`, // Pass API endpoint
		});
		return client;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const indexId = context.getNodeParameter('indexId', itemIndex, '') as string;
		const indexEndpointId = context.getNodeParameter('indexEndpointId', itemIndex, '') as string;
		const gcsBucketName = context.getNodeParameter('gcsBucketName', itemIndex, '') as string;
		const region = context.getNodeParameter('region', itemIndex, 'us-central1') as string;

		const finalIndexId = indexId.includes('/') ? indexId.split('/').pop()! : indexId;
		const finalIndexEndpointId = indexEndpointId.includes('/')
			? indexEndpointId.split('/').pop()!
			: indexEndpointId;

		if (!finalIndexId) {
			throw new NodeOperationError(context.getNode(), 'Index ID is required.', { itemIndex });
		}
		if (!finalIndexEndpointId) {
			throw new NodeOperationError(context.getNode(), 'Index Endpoint ID is required.', {
				itemIndex,
			});
		}
		if (!gcsBucketName) {
			throw new NodeOperationError(context.getNode(), 'GCS Bucket Name is required.', { itemIndex });
		}

		const credentials = await context.getCredentials('googleCloudApi');

		if (!credentials) {
			throw new NodeOperationError(context.getNode(), 'Google Cloud API credentials are required.', {
				itemIndex,
			});
		}
		const gcpCreds = credentials.gcpCredentials as IDataObject;

		const docstore = new GoogleCloudStorageDocstore({
			bucket: gcsBucketName,
			credentials: gcpCreds,
		});

		try {
			await MatchingEngine.fromDocuments(documents, embeddings, {
				index: finalIndexId,
				indexEndpoint: finalIndexEndpointId,
				docstore,
				credentials: gcpCreds,
				apiEndpoint: `${region}-aiplatform.googleapis.com`, // Pass API endpoint
			});
		} catch (error) {
			throw new NodeOperationError(
				context.getNode(),
				`Error populating Vertex AI Vector Store: ${error.message}`,
				{ itemIndex },
			);
		}
	},
}) {}
