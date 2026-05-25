import type { INodeProperties } from 'n8n-workflow';
import { createVectorStoreNode } from '@n8n/ai-utilities';
import { DB2VectorStore } from './utils/db2VectorStore';
import type { DistanceStrategy } from './utils/types';

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: 'vector_store',
		required: true,
		description: 'Name of the DB2 table to store vectors',
	},
	{
		displayName: 'Distance Strategy',
		name: 'distanceStrategy',
		type: 'options',
		default: 'euclidean',
		description: 'Strategy for calculating distance between vectors',
		options: [
			{
				name: 'Euclidean',
				value: 'euclidean',
			},
			{
				name: 'Cosine',
				value: 'cosine',
			},
			{
				name: 'Dot Product',
				value: 'dot_product',
			},
		],
	},
];

export class VectorStoreDb2 extends createVectorStoreNode({
	meta: {
		displayName: 'DB2 Vector Store',
		name: 'vectorStoreDb2',
		description: 'Work with IBM DB2 Vector Store for embeddings and similarity search',
		icon: 'file:db2.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoredb2/',
		credentials: [
			{
				name: 'db2',
				required: true,
			},
		],
	},
	sharedFields,
	insertFields: [],
	loadFields: [],
	retrieveFields: [],
	updateFields: [],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const credentials = await context.getCredentials('db2');
		const tableName = context.getNodeParameter('tableName', itemIndex) as string;
		const distanceStrategy = context.getNodeParameter(
			'distanceStrategy',
			itemIndex,
		) as DistanceStrategy;

		// Create DB2 connection
		const ibmDb = require('ibm_db');
		const connStr = `DATABASE=${credentials.database};HOSTNAME=${credentials.host};PORT=${credentials.port};PROTOCOL=TCPIP;UID=${credentials.user};PWD=${credentials.password};`;

		const client = await new Promise<any>((resolve, reject) => {
			ibmDb.open(connStr, (err: Error, conn: any) => {
				if (err) reject(err);
				else resolve(conn);
			});
		});

		return await DB2VectorStore.fromExistingIndex(embeddings, {
			client,
			tableName,
			distanceStrategy,
		});
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const vectorStore = await this.getVectorStoreClient(context, undefined, embeddings, itemIndex);
		await vectorStore.addDocuments(documents);
	},
}) {}

// Made with Bob
