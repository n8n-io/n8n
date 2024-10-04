import { LanceDB } from '@langchain/community/vectorstores/lancedb';
import { connect, WriteMode } from 'vectordb';

import type { ILoadOptionsFunctions, INodeProperties } from 'n8n-workflow';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';

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
];

export const VectorStoreLanceDB = createVectorStoreNode({
	meta: {
		displayName: 'LanceDB Vector Store',
		name: 'vectorStoreLanceDB',
		description: 'LanceDB description',
		icon: 'file:lancedb.png',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorelancedb/',
	},
	sharedFields: [lanceDBTableNameRLC],
	insertFields,
	loadFields: [],
	retrieveFields: [],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;

		const dbUri = context.helpers.getVectorStorePath();

		const db = await connect(dbUri);
		const table = await db.openTable(tableName);

		const client = new LanceDB(embeddings, { table });

		// const test = await client.similaritySearch('horror movie', 5);
		//
		// console.log(test);

		return client;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;

		const dbUri = context.helpers.getVectorStorePath();

		const clearStore = context.getNodeParameter('clearStore', itemIndex) as boolean;

		if (clearStore) {
			const db = await connect(dbUri);
			await db.dropTable(tableName);
			console.log('cleared lancedb');
		}

		await LanceDB.fromDocuments(documents, embeddings, {
			tableName,
			uri: dbUri,
			mode: WriteMode.Append,
		});
	},
	methods: {
		listSearch: {
			async lanceDBTableNameSearch(this: ILoadOptionsFunctions) {
				const dbUri = this.helpers.getVectorStorePath();
				const db = await connect(dbUri);

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
