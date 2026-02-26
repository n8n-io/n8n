import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { postgresConnectionTest } from 'n8n-nodes-base/dist/nodes/Postgres/v2/methods/credentialTest';
import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type pg from 'pg';

import { metadataFilterField } from '@utils/sharedFields';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import {
	columnNamesField,
	createPGVectorNodeArgs,
	distanceStrategyField,
} from '../shared/pgvector';

type VectorStorePGVectorScopedApiCredentials = PostgresNodeCredentials & {
	tableNamePrefix: string;
};

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [columnNamesField],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [distanceStrategyField, columnNamesField, metadataFilterField],
	},
];

async function vectorStorePGVectorScopedApiConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentialWithSsh: ICredentialsDecrypted = {
		...credential,
		data: { ...(credential.data ?? {}), sshTunnel: false },
	};
	return await postgresConnectionTest.call(this, credentialWithSsh);
}

export class VectorStorePGVectorScoped extends createVectorStoreNode(
	createPGVectorNodeArgs({
		methods: {
			credentialTest: { vectorStorePGVectorScopedApiConnectionTest },
		},
		meta: {
			description:
				'Work with your data in Postgresql with PGVector, scoped per user via credential table prefix',
			icon: 'file:postgres.svg',
			displayName: 'Postgres PGVector Store (User-Scoped)',
			docsUrl:
				'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorepgvector/',
			name: 'vectorStorePGVectorScoped',
			credentials: [
				{
					name: 'vectorStorePGVectorScopedApi',
					required: true,
					testedBy: 'vectorStorePGVectorScopedApiConnectionTest',
				},
			],
			operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
		},
		sharedFields: [],
		insertFields,
		loadFields: retrieveFields,
		retrieveFields,
		async getPoolAndTableName(context, itemIndex) {
			const credentials = await context.getCredentials<VectorStorePGVectorScopedApiCredentials>(
				'vectorStorePGVectorScopedApi',
			);
			const userId = context.getUserId();
			if (!userId) {
				throw new NodeOperationError(
					context.getNode(),
					'User ID is not available. This node requires an authenticated user session.',
					{ itemIndex },
				);
			}
			const sanitizedUserId = userId.replace(/-/g, '_');
			const tableName = `${credentials.tableNamePrefix}_${sanitizedUserId}`;
			const pgConf = await configurePostgres.call(context, credentials);
			return { pool: pgConf.db.$pool as unknown as pg.Pool, tableName };
		},
	}),
) {}
