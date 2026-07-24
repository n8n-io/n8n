import type { IExecuteFunctions, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import type { Database as Db2Database } from 'ibm_db';
import { NodeOperationError, OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import type { Embeddings } from '@langchain/core/embeddings';
import type { Document } from '@langchain/core/documents';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';
import { DB2VectorStore, checkTableExists } from './Db2VectorStore';
import type { DistanceStrategy } from './Db2VectorStore';
import type { Db2Connection, Db2ConnectionConfig, Db2Credentials } from './types';

const db2TableNameField: INodeProperties = {
	displayName: 'Table Name',
	name: 'tableName',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g., VECTOR_STORE',
	description:
		'The DB2 vector store table name. If Schema is provided, the table is resolved within that schema; otherwise the current schema is used.',
};

const sharedFields: INodeProperties[] = [db2TableNameField];

interface Db2Pool {
	open(connStr: string, callback: (err: Error | null, conn?: Db2Connection) => void): void;
	close(callback: () => void): void;
	setMaxPoolSize(size: number): void;
	setConnectTimeout(timeout: number): void;
}

class Db2ConnectionPoolManager {
	private pools: Map<string, Db2Pool> = new Map();
	private readonly maxPoolSize = 10;
	private readonly connectTimeout = 30;

	private buildConnectionString(credentials: Db2Credentials): string {
		const config: Db2ConnectionConfig = {
			DATABASE: credentials.database,
			HOSTNAME: credentials.host,
			PORT: credentials.port,
			UID: credentials.user,
			PWD: credentials.password,
		};

		if (credentials.ssl) {
			config.PROTOCOL = 'TCPIP';
			config.Security = 'SSL';
			if (credentials.sslCertificate) {
				config.SSLServerCertificate = credentials.sslCertificate;
			}
		}

		return Object.entries(config)
			.map(([key, value]) => `${key}=${value}`)
			.join(';');
	}

	private getOrCreatePool(connectionString: string): Db2Pool {
		let pool = this.pools.get(connectionString);

		if (!pool) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const ibmDb = require('ibm_db') as Db2Database;

			// @ts-expect-error Pool exists at runtime but is missing from type definitions
			pool = new ibmDb.Pool() as unknown as Db2Pool;
			pool.setMaxPoolSize(this.maxPoolSize);
			pool.setConnectTimeout(this.connectTimeout);
			this.pools.set(connectionString, pool);
		}

		return pool;
	}

	async acquire(credentials: Db2Credentials): Promise<Db2Connection> {
		const connectionString = this.buildConnectionString(credentials);
		const pool = this.getOrCreatePool(connectionString);

		return await new Promise((resolve, reject) => {
			const timeoutMs = this.connectTimeout * 1000;
			let settled = false;
			let timeoutHandle: NodeJS.Timeout | null = null;

			const cleanup = () => {
				if (timeoutHandle) {
					clearTimeout(timeoutHandle);
					timeoutHandle = null;
				}
			};

			timeoutHandle = setTimeout(() => {
				if (!settled) {
					settled = true;
					cleanup();
					reject(new OperationalError(`Connection timeout after ${timeoutMs}ms`));
				}
			}, timeoutMs);

			try {
				pool.open(connectionString, (err: Error | null, conn?: Db2Connection) => {
					if (settled) {
						if (!err && conn) {
							try {
								conn.close(() => {});
							} catch {}
						}
						return;
					}

					settled = true;
					cleanup();

					if (err) {
						reject(new OperationalError(`Failed to acquire connection from pool: ${err.message}`));
						return;
					}

					if (!conn) {
						reject(new OperationalError('Pool returned null connection'));
						return;
					}

					if (typeof conn.query !== 'function') {
						reject(
							new OperationalError(
								'Invalid connection object received from pool. Connection does not have required query() method.',
							),
						);
						return;
					}

					if (typeof conn.close !== 'function') {
						reject(
							new OperationalError(
								'Invalid connection object received from pool. Connection does not have required close() method.',
							),
						);
						return;
					}

					resolve(conn);
				});
			} catch (error) {
				if (!settled) {
					settled = true;
					cleanup();
					reject(
						new UnexpectedError(
							`Unexpected error acquiring connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
						),
					);
				}
			}
		});
	}

	release(connection: Db2Connection): void {
		try {
			connection.close((err) => {
				if (err) {
					console.error('Error releasing connection to pool:', err);
				}
			});
		} catch (error) {
			console.error('Error releasing connection:', error);
		}
	}

	async shutdown(): Promise<void> {
		const shutdownPromises: Array<Promise<void>> = [];

		for (const [connectionString, pool] of this.pools.entries()) {
			const promise = new Promise<void>((resolve) => {
				try {
					pool.close(() => {
						this.pools.delete(connectionString);
						resolve();
					});
				} catch (error) {
					console.error(`Error closing pool for ${connectionString}:`, error);
					this.pools.delete(connectionString);
					resolve();
				}
			});
			shutdownPromises.push(promise);
		}

		await Promise.all(shutdownPromises);
	}
}

function toDb2Credentials(credentials: Record<string, unknown>): Db2Credentials {
	const host = typeof credentials.host === 'string' ? credentials.host : '';
	const port =
		typeof credentials.port === 'number' ? credentials.port : Number(credentials.port ?? 0);
	const database = typeof credentials.database === 'string' ? credentials.database : '';
	const user = typeof credentials.user === 'string' ? credentials.user : '';
	const password = typeof credentials.password === 'string' ? credentials.password : '';

	if (!host || !database || !user || !password || !Number.isFinite(port) || port <= 0) {
		throw new UserError('Invalid Db2 credentials: missing or invalid required fields');
	}

	return {
		host,
		port,
		database,
		user,
		password,
		ssl: typeof credentials.ssl === 'boolean' ? credentials.ssl : false,
		sslCertificate:
			typeof credentials.sslCertificate === 'string' ? credentials.sslCertificate : undefined,
		connectionTimeout:
			typeof credentials.connectionTimeout === 'number' ? credentials.connectionTimeout : undefined,
	};
}

const connectionPoolManager = new Db2ConnectionPoolManager();

async function getConnection(credentials: Db2Credentials): Promise<Db2Connection> {
	return await connectionPoolManager.acquire(credentials);
}

function wrapDb2Error(
	error: unknown,
	context: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
	operation: 'initialize' | 'populate',
	tableName?: string,
): never {
	if (error instanceof NodeOperationError) {
		throw error;
	}

	if (error instanceof Error && error.message.includes('connect')) {
		const message = error.message.toLowerCase();

		if (message.includes('authentication') || message.includes('password')) {
			throw new NodeOperationError(context.getNode(), 'Failed to authenticate with Db2 database', {
				itemIndex,
				description: 'Please check your credentials (username and password) are correct.',
			});
		}

		if (message.includes('host') || message.includes('connection refused')) {
			throw new NodeOperationError(context.getNode(), 'Failed to connect to Db2 database', {
				itemIndex,
				description:
					'Please check the host and port are correct and the database is accessible from this network.',
			});
		}

		if (message.includes('timeout')) {
			throw new NodeOperationError(context.getNode(), 'Connection to Db2 database timed out', {
				itemIndex,
				description:
					'The database took too long to respond. Please check your network connection and database availability.',
			});
		}

		throw new NodeOperationError(
			context.getNode(),
			`Failed to connect to Db2 database: ${error.message}`,
			{
				itemIndex,
				description: 'Please check your connection settings and ensure the database is accessible.',
			},
		);
	}

	// Check for table structure errors (only relevant for populate operation)
	if (
		operation === 'populate' &&
		tableName &&
		error instanceof Error &&
		(error.message.includes('column') || error.message.includes('SQL0206N'))
	) {
		throw new NodeOperationError(
			context.getNode(),
			`Table '${tableName}' does not have the required structure for vector storage`,
			{
				itemIndex,
				description:
					'The table must have columns: id (CHAR(16)), text (CLOB), embedding (VECTOR), and metadata (BLOB). Use the "Insert" operation to create a properly structured table.',
			},
		);
	}

	const operationText = operation === 'initialize' ? 'initialize' : 'populate';
	const errorMessage = error instanceof Error ? error.message : 'Unknown error';
	const description =
		operation === 'initialize'
			? 'An unexpected error occurred. Please check your configuration and try again.'
			: 'An unexpected error occurred while adding documents. Please check your configuration and try again.';

	throw new NodeOperationError(
		context.getNode(),
		`Failed to ${operationText} Db2 Vector Store: ${errorMessage}`,
		{
			itemIndex,
			description,
		},
	);
}

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Clear Table',
				name: 'clearTable',
				type: 'boolean',
				default: false,
				description:
					'Whether to clear all existing data from the table before inserting new documents',
			},
		],
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
				displayName: 'Distance Strategy',
				name: 'distanceStrategy',
				type: 'options',
				default: 'euclidean',
				description: 'The distance metric to use for similarity search',
				options: [
					{
						name: 'Euclidean',
						value: 'euclidean',
						description: 'Euclidean distance (L2 norm)',
					},
					{
						name: 'Cosine',
						value: 'cosine',
						description: 'Cosine similarity',
					},
					{
						name: 'Dot Product',
						value: 'dot_product',
						description: 'Inner product (dot product)',
					},
				],
			},
			{
				...metadataFilterField,
				description:
					'Filter documents by metadata fields. Supports exact match and array inclusion. Example: {"category": "tech", "year": 2024} or {"tags": ["ai", "ml"]}',
				placeholder: '{"key": "value"}',
				hint: 'Use JSON format. Supports exact match (string/number) and array inclusion (["value1", "value2"])',
			},
		],
	},
];

export class VectorStoreDb2 extends createVectorStoreNode({
	meta: {
		displayName: 'Db2 Vector Store',
		name: 'vectorStoreDb2',
		description: 'Work with IBM Db2 Vector Store for embeddings and similarity search',
		icon: 'file:db2.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoredb2/',
		credentials: [
			{
				name: 'db2Api',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(
		context: IExecuteFunctions | ISupplyDataFunctions,
		filter: unknown,
		embeddings: Embeddings,
		itemIndex: number,
	) {
		const credentials = await context.getCredentials('db2Api');

		// Handle both old resource locator format and new string format
		const tableNameParam = context.getNodeParameter('tableName', itemIndex);
		let tableName: string;

		if (typeof tableNameParam === 'string') {
			tableName = tableNameParam;
		} else if (typeof tableNameParam === 'object' && tableNameParam !== null) {
			// Handle old resource locator format: { mode: 'list', value: 'table_name' }
			const rlc = tableNameParam as { mode?: string; value?: string };
			tableName = rlc.value || '';

			if (!tableName) {
				throw new NodeOperationError(context.getNode(), 'Table name is required', {
					itemIndex,
					description: 'Please provide a valid table name.',
				});
			}
		} else {
			throw new NodeOperationError(context.getNode(), 'Invalid table name parameter', {
				itemIndex,
				description: 'Table name must be a string.',
			});
		}

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			distanceStrategy?: DistanceStrategy;
		};
		const distanceStrategy = (options.distanceStrategy || 'euclidean') as DistanceStrategy;

		let client: Db2Connection | null = null;

		try {
			client = await getConnection(toDb2Credentials(credentials));

			const exists = await checkTableExists(client, tableName);
			if (!exists) {
				throw new NodeOperationError(
					context.getNode(),
					`Table '${tableName}' not found in Db2 database`,
					{
						itemIndex,
						description:
							'Please ensure the table exists. You can create it using the "Insert" operation or verify the table name is correct.',
					},
				);
			}

			const vectorStore = new DB2VectorStore(embeddings, {
				client,
				tableName,
				distanceStrategy,
				embeddingFunction: embeddings,
				filter: filter as Record<string, unknown>,
			});

			return vectorStore;
		} catch (error) {
			// Release connection on error
			if (client) {
				connectionPoolManager.release(client);
			}

			wrapDb2Error(error, context, itemIndex, 'initialize');
		}
	},
	async populateVectorStore(
		context: IExecuteFunctions | ISupplyDataFunctions,
		embeddings: Embeddings,
		documents: Document[],
		itemIndex: number,
	) {
		const credentials = await context.getCredentials('db2Api');

		// Handle both old resource locator format and new string format
		const tableNameParam = context.getNodeParameter('tableName', itemIndex);
		let tableName: string;

		if (typeof tableNameParam === 'string') {
			tableName = tableNameParam;
		} else if (typeof tableNameParam === 'object' && tableNameParam !== null) {
			// Handle old resource locator format: { mode: 'list', value: 'table_name' }
			const rlc = tableNameParam as { mode?: string; value?: string };
			tableName = rlc.value || '';

			if (!tableName) {
				throw new NodeOperationError(context.getNode(), 'Table name is required', {
					itemIndex,
					description: 'Please provide a valid table name.',
				});
			}
		} else {
			throw new NodeOperationError(context.getNode(), 'Invalid table name parameter', {
				itemIndex,
				description: 'Table name must be a string.',
			});
		}

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			clearTable?: boolean;
		};

		const clearTable = options.clearTable ?? false;

		const distanceStrategy = 'euclidean' as DistanceStrategy;

		let client: Db2Connection | null = null;

		try {
			client = await getConnection(toDb2Credentials(credentials));

			const vectorStore = new DB2VectorStore(embeddings, {
				client,
				tableName,
				distanceStrategy,
				embeddingFunction: embeddings,
				batchSize: 100, // Fixed default batch size for DB2 inserts
			});

			if (clearTable) {
				await vectorStore.clearTable();
			}

			await vectorStore.addDocuments(documents);
		} catch (error) {
			wrapDb2Error(error, context, itemIndex, 'populate', tableName);
		} finally {
			// Always release connection after insert operation completes
			if (client) {
				connectionPoolManager.release(client);
			}
		}
	},
	releaseVectorStoreClient(vectorStore: DB2VectorStore) {
		const client = vectorStore.getClient();
		if (client) {
			connectionPoolManager.release(client);
		}
	},
}) {}

process.on('SIGTERM', async () => {
	await connectionPoolManager.shutdown();
});

process.on('SIGINT', async () => {
	await connectionPoolManager.shutdown();
});

export { DB2VectorStore, DistanceStrategy } from './Db2VectorStore';
export { dropTable } from './Db2VectorStore';
