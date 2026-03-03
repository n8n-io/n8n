import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { postgresConnectionTest } from 'n8n-nodes-base/dist/nodes/Postgres/v2/methods/credentialTest';
import type { INodeProperties } from 'n8n-workflow';
import type pg from 'pg';

import {
	collectionField,
	columnNamesField,
	createPGVectorNodeArgs,
	distanceStrategyField,
} from '../shared/pgvector';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: 'n8n_vectors',
		description:
			'The table name to store the vectors in. If table does not exist, it will be created.',
	},
];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [collectionField, columnNamesField],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [distanceStrategyField, collectionField, columnNamesField, metadataFilterField],
	},
];

export class VectorStorePGVector extends createVectorStoreNode(
	createPGVectorNodeArgs({
		meta: {
			description: 'Work with your data in Postgresql with the PGVector extension',
			icon: 'file:postgres.svg',
			displayName: 'Postgres PGVector Store',
			docsUrl:
				'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorepgvector/',
			name: 'vectorStorePGVector',
			credentials: [
				{
					name: 'postgres',
					required: true,
					testedBy: 'postgresConnectionTest',
				},
			],
			operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
		},
		methods: {
			credentialTest: { postgresConnectionTest },
		},
		sharedFields,
		insertFields,
		loadFields: retrieveFields,
		retrieveFields,
		async getPoolAndTableName(context, itemIndex) {
			const tableName = context.getNodeParameter('tableName', itemIndex, '', {
				extractValue: true,
			}) as string;
			const credentials = await context.getCredentials('postgres');
			const pgConf = await configurePostgres.call(context, credentials as PostgresNodeCredentials);
			return { pool: pgConf.db.$pool as unknown as pg.Pool, tableName };
		},
	}),
) {}
