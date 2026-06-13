import type { Embeddings } from '@langchain/core/embeddings';
import type { DistanceStrategy } from './Db2VectorStore';

export interface Db2QueryCallback<T = unknown> {
	(err: Error | null, rows?: T[]): void;
}

export interface SearchFilter {
	[key: string]: unknown;
}

export interface Db2Statement {
	bindSync(params: unknown[]): void;
	setAttrSync(attr: number, value: number): void;
	execute(callback: (err: Error | null) => void): void;
	executeSync(): unknown;
	closeSync(): void;
	close(callback: (err?: Error | null) => void): void;
}

export interface Db2Connection {
	query<T = unknown>(sql: string, params: unknown[], callback: Db2QueryCallback<T>): void;
	query<T = unknown>(sql: string, callback: Db2QueryCallback<T>): void;
	close(callback: (err?: Error | null) => void): void;
	beginTransaction?(callback: (err?: Error | null) => void): void;
	commitTransaction?(callback: (err?: Error | null) => void): void;
	rollbackTransaction?(callback: (err?: Error | null) => void): void;
	commit?(callback: (err?: Error | null) => void): void;
	rollback?(callback: (err?: Error | null) => void): void;
	prepare?(sql: string, callback: (err: Error | null, stmt: Db2Statement) => void): void;
	prepareSync?(sql: string): Db2Statement;
}

export interface Db2Credentials {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
	ssl?: boolean;
	sslCertificate?: string;
	connectionTimeout?: number;
}

export interface Db2ConnectionConfig {
	DATABASE: string;
	HOSTNAME: string;
	PORT: number;
	UID: string;
	PWD: string;
	PROTOCOL?: string;
	Security?: string;
	SSLServerCertificate?: string;
}

export interface DB2VectorStoreConfig {
	client: Db2Connection;
	embeddingFunction: Embeddings;
	tableName: string;
	schema?: string;
	distanceStrategy?: DistanceStrategy;
	filter?: Record<string, unknown>;
	params?: Record<string, string | number | boolean>;
	batchSize?: number;
	columns?: {
		idColumnName?: string;
		contentColumnName?: string;
		metadataColumnName?: string;
		embeddingColumnName?: string;
	};
	/**
	 * If true, drops the table before creating a new one in fromTexts().
	 * WARNING: This will permanently delete all data in the table.
	 * @default false
	 */
	dropTableBeforeCreate?: boolean;
}

export interface ConnectionPoolConfig {
	maxConnections: number;
	idleTimeoutMs: number;
	connectionTimeoutMs: number;
}

export interface ConnectionPoolEntry {
	connection: Db2Connection;
	lastUsed: number;
	inUse: boolean;
	connectionString: string;
}
