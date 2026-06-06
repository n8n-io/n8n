import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeProperties,
	INodePropertyOptions,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import type { Database as Db2Database } from 'ibm_db';
import { NodeOperationError, OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import type { Embeddings } from '@langchain/core/embeddings';
import type { Document } from '@langchain/core/documents';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';
import { DB2VectorStore, checkTableExists } from './Db2VectorStore';
import type { DistanceStrategy } from './Db2VectorStore';
import type { Db2Connection, Db2ConnectionConfig, Db2Credentials } from './types';
import { db2Schema, db2TableNameRLC, db2ColumnOptions } from '../shared/descriptions';

const sharedFields: INodeProperties[] = [db2TableNameRLC, db2Schema, db2ColumnOptions];

interface Db2Pool {
	open(connStr: string, callback: (err: Error | null, conn?: Db2Connection) => void): void;
	close(callback: () => void): void;
	setMaxPoolSize(size: number): void;
	setConnectTimeout(timeout: number): void;
}

class Db2ConnectionPool {
	private pool: Db2Pool | null = null;
	private connectionString: string | null = null;
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

	private initializePool(credentials: Db2Credentials): void {
		const connectionString = this.buildConnectionString(credentials);

		if (this.pool && this.connectionString === connectionString) {
			return;
		}

		if (this.pool) {
			this.pool.close(() => {});
		}

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const ibmDb = require('ibm_db') as Db2Database;

		// @ts-expect-error Pool exists at runtime but is missing from type definitions
		this.pool = new ibmDb.Pool() as unknown as Db2Pool;
		this.pool.setMaxPoolSize(this.maxPoolSize);
		this.pool.setConnectTimeout(this.connectTimeout);
		this.connectionString = connectionString;
	}

	async acquire(credentials: Db2Credentials): Promise<Db2Connection> {
		this.initializePool(credentials);

		const pool = this.pool;
		const connectionString = this.connectionString;

		if (!pool || !connectionString) {
			throw new UnexpectedError('Connection pool not initialized');
		}

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
		if (!this.pool) {
			return;
		}

		await new Promise<void>((resolve) => {
			try {
				this.pool?.close(() => {
					this.pool = null;
					this.connectionString = null;
					resolve();
				});
			} catch (error) {
				console.error('Error during pool shutdown:', error);
				this.pool = null;
				this.connectionString = null;
				resolve();
			}
		});
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

const connectionPool = new Db2ConnectionPool();

async function getConnection(credentials: Db2Credentials): Promise<Db2Connection> {
	return await connectionPool.acquire(credentials);
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
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 100,
				description: 'Number of documents to insert in each batch. Optimal range: 50-200.',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
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
	methods: {
		listSearch: {
			async db2TableNameSearch(
				this: ILoadOptionsFunctions,
			): Promise<{ results: INodePropertyOptions[] }> {
				const credentials = await this.getCredentials('db2Api');

				const connStr = `DATABASE=${credentials.database};HOSTNAME=${credentials.host};PORT=${credentials.port};PROTOCOL=TCPIP;UID=${credentials.user};PWD=${credentials.password}`;

				const ibmDb = await import('ibm_db');

				return await new Promise((resolve, reject) => {
					ibmDb.open(connStr, (err, conn) => {
						if (err) {
							reject(new OperationalError('Failed to connect to DB2', { cause: err }));
							return;
						}

						const query = `
							SELECT TABNAME, TABSCHEMA
							FROM SYSCAT.TABLES
							WHERE TABSCHEMA = CURRENT SCHEMA
								AND TYPE = 'T'
							ORDER BY TABNAME
						`;

						conn.query(query, (queryErr, rows) => {
							conn.close(() => {});

							if (queryErr) {
								reject(new OperationalError('Failed to list tables', { cause: queryErr as Error }));
								return;
							}

							const results = (rows || []).map((row) => {
								const rowData = row as unknown as Record<string, unknown>;
								const tableName = rowData.TABNAME || rowData.tabname || rowData.name;
								const schemaName = rowData.TABSCHEMA || rowData.tabschema || rowData.schema;

								return {
									name: schemaName ? `${schemaName}.${tableName}` : String(tableName),
									value: String(tableName),
								};
							});

							resolve({ results });
						});
					});
				});
			},
		},
	},
	async getVectorStoreClient(
		context: IExecuteFunctions | ISupplyDataFunctions,
		filter: unknown,
		embeddings: Embeddings,
		itemIndex: number,
	) {
		const credentials = await context.getCredentials('db2Api');
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const schema = context.getNodeParameter('schema', itemIndex, '') as string;

		const columnNames = context.getNodeParameter('columnNames', itemIndex, {}) as {
			idColumnName?: string;
			contentColumnName?: string;
			metadataColumnName?: string;
			embeddingColumnName?: string;
		};

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			distanceStrategy?: DistanceStrategy;
		};
		const distanceStrategy = (options.distanceStrategy || 'euclidean') as DistanceStrategy;

		try {
			const client = await getConnection(toDb2Credentials(credentials));

			const exists = await checkTableExists(client, tableName, schema || undefined);
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
				schema: schema || undefined,
				distanceStrategy,
				embeddingFunction: embeddings,
				filter: filter as Record<string, unknown>,
				columns: {
					idColumnName: columnNames.idColumnName,
					contentColumnName: columnNames.contentColumnName,
					metadataColumnName: columnNames.metadataColumnName,
					embeddingColumnName: columnNames.embeddingColumnName,
				},
			});

			return vectorStore;
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}

			if (error instanceof Error && error.message.includes('connect')) {
				const message = error.message.toLowerCase();

				if (message.includes('authentication') || message.includes('password')) {
					throw new NodeOperationError(
						context.getNode(),
						'Failed to authenticate with Db2 database',
						{
							itemIndex,
							description: 'Please check your credentials (username and password) are correct.',
						},
					);
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
						description:
							'Please check your connection settings and ensure the database is accessible.',
					},
				);
			}

			throw new NodeOperationError(
				context.getNode(),
				`Failed to initialize Db2 Vector Store: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{
					itemIndex,
					description:
						'An unexpected error occurred. Please check your configuration and try again.',
				},
			);
		}
	},
	async populateVectorStore(
		context: IExecuteFunctions | ISupplyDataFunctions,
		embeddings: Embeddings,
		documents: Document[],
		itemIndex: number,
	) {
		const credentials = await context.getCredentials('db2Api');
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const schema = context.getNodeParameter('schema', itemIndex, '') as string;

		const columnNames = context.getNodeParameter('columnNames', itemIndex, {}) as {
			idColumnName?: string;
			contentColumnName?: string;
			metadataColumnName?: string;
			embeddingColumnName?: string;
		};

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			batchSize?: number;
			clearTable?: boolean;
		};

		const batchSize = options.batchSize ?? 100;
		const clearTable = options.clearTable ?? false;

		const distanceStrategy = 'euclidean' as DistanceStrategy;

		try {
			const client = await getConnection(toDb2Credentials(credentials));

			const vectorStore = new DB2VectorStore(embeddings, {
				client,
				tableName,
				schema: schema || undefined,
				distanceStrategy,
				embeddingFunction: embeddings,
				batchSize,
				columns: {
					idColumnName: columnNames.idColumnName,
					contentColumnName: columnNames.contentColumnName,
					metadataColumnName: columnNames.metadataColumnName,
					embeddingColumnName: columnNames.embeddingColumnName,
				},
			});

			if (clearTable) {
				await vectorStore.clearTable();
			}

			await vectorStore.addDocuments(documents);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}

			if (error instanceof Error && error.message.includes('connect')) {
				const message = error.message.toLowerCase();

				if (message.includes('authentication') || message.includes('password')) {
					throw new NodeOperationError(
						context.getNode(),
						'Failed to authenticate with Db2 database',
						{
							itemIndex,
							description: 'Please check your credentials (username and password) are correct.',
						},
					);
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
						description:
							'Please check your connection settings and ensure the database is accessible.',
					},
				);
			}

			if (
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

			throw new NodeOperationError(
				context.getNode(),
				`Failed to populate Db2 Vector Store: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{
					itemIndex,
					description:
						'An unexpected error occurred while adding documents. Please check your configuration and try again.',
				},
			);
		}
	},
	releaseVectorStoreClient(vectorStore: DB2VectorStore) {
		const client = vectorStore.getClient();
		if (client) {
			connectionPool.release(client);
		}
	},
}) {}

process.on('SIGTERM', async () => {
	await connectionPool.shutdown();
});

process.on('SIGINT', async () => {
	await connectionPool.shutdown();
});

export { DB2VectorStore, ExtendedDB2VectorStore, DistanceStrategy } from './Db2VectorStore';
export { dropTable } from './Db2VectorStore';
