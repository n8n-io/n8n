import { PGVectorStore, type PGVectorStoreArgs } from '@langchain/community/vectorstores/pgvector';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { postgresConnectionTest } from 'n8n-nodes-base/dist/nodes/Postgres/v2/methods/credentialTest';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type pg from 'pg';
import { getUserScopedSlot } from '../shared/userScoped';
import { ExtendedPGVectorStore } from '../VectorStorePGVector/VectorStorePGVector.node';

type ChatHubVectorStorePGVectorApiCredentials = PostgresNodeCredentials & {
	tableNamePrefix: string;
};

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [metadataFilterField],
	},
];

async function deleteDocuments(
	this: ILoadOptionsFunctions,
	payload: IDataObject | string | undefined,
): Promise<NodeParameterValueType> {
	const { filter } = (typeof payload === 'string' ? jsonParse(payload) : (payload ?? {})) as {
		filter: Record<string, string | string[]>;
	};

	const credentials = await this.getCredentials<ChatHubVectorStorePGVectorApiCredentials>(
		'chatHubVectorStorePGVectorApi',
	);
	const tableName = getUserScopedSlot(this, credentials.tableNamePrefix);

	const pgConf = await configurePostgres.call(this, credentials as PostgresNodeCredentials);
	const pool = pgConf.db.$pool as unknown as pg.Pool;

	if (!filter || Object.keys(filter).length === 0) {
		// The table is user-scoped (one table per user), so dropping it is safe
		// and avoids leaving empty ghost tables after user deletion.
		await pool.query(`DROP TABLE IF EXISTS "${tableName}"`);
		return null;
	}

	const conditions: string[] = [];
	const values: Array<string | string[]> = [];
	let paramIndex = 1;
	for (const [key, value] of Object.entries(filter)) {
		if (Array.isArray(value)) {
			conditions.push(`metadata->>($${paramIndex}::text) = ANY($${paramIndex + 1}::text[])`);
		} else {
			conditions.push(`metadata->>($${paramIndex}::text) = $${paramIndex + 1}`);
		}
		values.push(key, value);
		paramIndex += 2;
	}
	await pool.query(`DELETE FROM "${tableName}" WHERE ${conditions.join(' AND ')}`, values);

	return null;
}

async function chatHubVectorStorePGVectorApiConnectionTest(
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

	const credentials = credential.data as ChatHubVectorStorePGVectorApiCredentials;

	try {
		const pgConf = await configurePostgres.call(this, credentials as PostgresNodeCredentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;
		const result = await pool.query<{ exists: boolean }>(
			"SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists",
		);
		const extensionExists = result.rows[0]?.exists;
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

export class ChatHubVectorStorePGVector extends createVectorStoreNode({
	hidden: true,
	methods: {
		credentialTest: { chatHubVectorStorePGVectorApiConnectionTest },
		actionHandler: { deleteDocuments },
	},
	meta: {
		description: 'Internal-use vector store for ChatHub',
		icon: 'file:../VectorStorePGVector/postgres.svg',
		displayName: 'ChatHub PGVector Store',
		docsUrl: 'https://docs.n8n.io',
		name: 'chatHubVectorStorePGVector',
		credentials: [
			{
				name: 'chatHubVectorStorePGVectorApi',
				required: true,
				testedBy: 'chatHubVectorStorePGVectorApiConnectionTest',
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	sharedFields: [],
	insertFields: [],
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const credentials = await context.getCredentials<ChatHubVectorStorePGVectorApiCredentials>(
			'chatHubVectorStorePGVectorApi',
		);
		const tableName = getUserScopedSlot(context, credentials.tableNamePrefix, itemIndex);
		const pgConf = await configurePostgres.call(context, credentials as PostgresNodeCredentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;

		const config: PGVectorStoreArgs = {
			pool,
			tableName,
			filter,
		};

		return await ExtendedPGVectorStore.initialize(embeddings, config);
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const credentials = await context.getCredentials<ChatHubVectorStorePGVectorApiCredentials>(
			'chatHubVectorStorePGVectorApi',
		);
		const tableName = getUserScopedSlot(context, credentials.tableNamePrefix, itemIndex);
		const pgConf = await configurePostgres.call(context, credentials as PostgresNodeCredentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;

		const config: PGVectorStoreArgs = {
			pool,
			tableName,
		};

		const vectorStore = await PGVectorStore.fromDocuments(documents, embeddings, config);
		vectorStore.client?.release();
	},

	releaseVectorStoreClient(vectorStore) {
		vectorStore.client?.release();
	},
}) {}
