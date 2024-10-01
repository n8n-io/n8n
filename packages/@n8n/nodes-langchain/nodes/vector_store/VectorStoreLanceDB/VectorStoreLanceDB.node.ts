import { connect, type ConnectionOptions } from '@lancedb/lancedb';
import { LanceDB as LanceDBVectorStore } from '@langchain/community/vectorstores/lancedb';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeProperties,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { join } from 'node:path';

import type { LanceDbApiCredentials } from '../../../credentials/LanceDbApi.credentials';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

export const lanceDBTableNameRLC: INodeProperties = {
	displayName: 'Table Name',
	name: 'tableName',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'lanceDBTableNameSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

const insertFields: INodeProperties[] = [
	{
		displayName: 'The notice about file system storage',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Clear Store',
		name: 'clearStore',
		type: 'boolean',
		default: false,
		description: 'Whether to clear the store before inserting new data',
	},
	{
		displayName: 'Write Mode',
		name: 'writeMode',
		type: 'options',
		options: [
			{
				name: 'Append',
				value: 'create',
			},
			{
				name: 'Overwrite',
				value: 'overwrite',
			},
		],
		default: 'create',
		description: 'How to write data to the store',
	},
];

const getConnectionOptions = async (
	context: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
): Promise<[string, Partial<ConnectionOptions>]> => {
	const credentials = await context.getCredentials<LanceDbApiCredentials>('lanceDbApi');
	if (credentials.connectionType === 'localFile') {
		return [join(context.helpers.getStoragePath(), credentials.fileName), {}];
	} else {
		return [credentials.dbUri, { apiKey: credentials.apiKey }];
	}
};

export const VectorStoreLanceDB = createVectorStoreNode({
	meta: {
		displayName: 'LanceDB Vector Store',
		name: 'vectorStoreLanceDB',
		description: 'LanceDB description',
		icon: 'file:lancedb.png',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorelancedb/',
		credentials: [
			{
				name: 'lanceDbApi',
				required: true,
			},
		],
	},
	sharedFields: [lanceDBTableNameRLC],
	insertFields,
	loadFields: [],
	retrieveFields: [
		{
			displayName: 'Filter',
			name: 'filter',
			type: 'json',
			default: '{}',
			description: 'Filter to apply to the search results',
			hint: 'Example: {"key": "value"}',
		},
		{
			displayName: 'Number of Results',
			name: 'k',
			type: 'number',
			default: 4,
			description: 'Number of results to return',
		},
	],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;

		const [dbUri, connectOptions] = await getConnectionOptions(context);
		const db = await connect(dbUri, connectOptions);
		const table = await db.openTable(tableName);
		return new LanceDBVectorStore(embeddings, { table });
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;

		const [dbUri, connectOptions] = await getConnectionOptions(context);

		const clearStore = context.getNodeParameter('clearStore', itemIndex) as boolean;
		const writeMode = context.getNodeParameter('writeMode', itemIndex) as 'create' | 'overwrite';

		if (clearStore) {
			const db = await connect(dbUri, connectOptions);
			await db.dropTable(tableName);
			console.log('cleared lancedb');
		}

		await LanceDBVectorStore.fromDocuments(documents, embeddings, {
			tableName,
			uri: dbUri,
			mode: writeMode,
			// TODO: add support for connectOptions to langchain to make the node work with lancedb cloud
		});
	},

	methods: {
		listSearch: {
			async lanceDBTableNameSearch(this: ILoadOptionsFunctions) {
				const [dbUri, connectOptions] = await getConnectionOptions(this);

				const db = await connect(dbUri, connectOptions);
				const tables = await db.tableNames();

				return {
					results: tables.map((t) => ({
						name: t,
						value: t,
					})),
				};
			},
		},
	},
});
