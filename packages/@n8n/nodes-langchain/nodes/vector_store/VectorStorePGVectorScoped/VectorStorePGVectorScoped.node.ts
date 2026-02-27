import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { postgresConnectionTest } from 'n8n-nodes-base/dist/nodes/Postgres/v2/methods/credentialTest';
import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import pg from 'pg';

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

async function deleteDocuments(
	this: ILoadOptionsFunctions,
	payload: IDataObject | string | undefined,
): Promise<NodeParameterValueType> {
	const { filter, metadataColumnName = 'metadata' } = (
		typeof payload === 'string' ? jsonParse(payload) : (payload ?? {})
	) as { filter: Record<string, string | string[]>; metadataColumnName?: string };

	if (!filter || Object.keys(filter).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'deleteDocuments requires at least one filter field.',
		);
	}

	const credentials = await this.getCredentials<VectorStorePGVectorScopedApiCredentials>(
		'vectorStorePGVectorScopedApi',
	);
	const userId = this.getUserId();
	if (!userId) {
		throw new NodeOperationError(this.getNode(), 'User ID is not available.');
	}

	const sanitizedUserId = userId.replace(/-/g, '_');
	const tableName = `${credentials.tableNamePrefix}_${sanitizedUserId}`;

	const conditions: string[] = [];
	const values: Array<string | string[]> = [];
	let paramIndex = 1;
	for (const [key, value] of Object.entries(filter)) {
		if (Array.isArray(value)) {
			conditions.push(`${metadataColumnName}->>'${key}' = ANY($${paramIndex}::text[])`);
		} else {
			conditions.push(`${metadataColumnName}->>'${key}' = $${paramIndex}`);
		}
		values.push(value);
		paramIndex++;
	}

	// TODO: Use configurePostgres() here to support SSH tunneling.
	// Currently this creates a direct pg.Pool without SSH tunnel support.
	const sslEnabled = credentials.ssl !== 'disable' && credentials.ssl !== undefined;
	const pool = new pg.Pool({
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
		ssl: sslEnabled ? { rejectUnauthorized: !credentials.allowUnauthorizedCerts } : false,
	});

	try {
		await pool.query(`DELETE FROM "${tableName}" WHERE ${conditions.join(' AND ')}`, values);
	} finally {
		await pool.end();
	}

	return null;
}

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
			actionHandler: { deleteDocuments },
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
