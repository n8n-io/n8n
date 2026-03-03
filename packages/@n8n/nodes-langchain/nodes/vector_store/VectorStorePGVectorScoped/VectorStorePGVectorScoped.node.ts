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
import {
	columnNamesField,
	createPGVectorNodeArgs,
	distanceStrategyField,
} from '../shared/pgvector';
import { getUserScopedSlot } from '../shared/userScoped';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';

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

// TODO: Use configurePostgres() here to support SSH tunneling.
// Currently this creates a direct pg.Pool without SSH tunnel support.
async function withPool<T>(
	credentials: VectorStorePGVectorScopedApiCredentials,
	callback: (pool: pg.Pool) => Promise<T>,
): Promise<T> {
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
		return await callback(pool);
	} finally {
		await pool.end();
	}
}

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
	const tableName = getUserScopedSlot(this, credentials.tableNamePrefix);

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

	await withPool(credentials, async (pool) => {
		await pool.query(`DELETE FROM "${tableName}" WHERE ${conditions.join(' AND ')}`, values);
	});

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

	const connectionResult = await postgresConnectionTest.call(this, credentialWithSsh);
	if (connectionResult.status === 'Error') {
		return connectionResult;
	}

	const credentials = credential.data as VectorStorePGVectorScopedApiCredentials;

	try {
		const extensionExists = await withPool(credentials, async (pool) => {
			const result = await pool.query<{ exists: boolean }>(
				"SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists",
			);
			return result.rows[0]?.exists;
		});
		if (!extensionExists) {
			return {
				status: 'Error',
				message:
					'The pgvector extension is not enabled. Please install and enable the pgvector extension in your PostgreSQL database.',
			};
		}
	} catch (error) {
		return {
			status: 'Error',
			message: error.message as string,
		};
	}

	return connectionResult;
}

export class VectorStorePGVectorScoped extends createVectorStoreNode(
	createPGVectorNodeArgs({
		hidden: true,
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
			const tableName = getUserScopedSlot(context, credentials.tableNamePrefix, itemIndex);
			const pgConf = await configurePostgres.call(context, credentials);
			return { pool: pgConf.db.$pool as unknown as pg.Pool, tableName };
		},
	}),
) {}
