import { Db, Collection } from '@datastax/astra-db-ts';

/**
 * Type alias for Astra DB database object
 */
export type IAstraDbDatabase = Db;

/**
 * Type alias for Astra DB collection object
 */
export type IAstraDbCollection = Collection;

/**
 * Credentials interface for Astra DB
 */
export interface IAstraDbCredentials {
	endpoint: string;
	token: string;
}

/**
 * Main operation interface for Astra DB operations
 */
export interface IAstraDbOperation {
	operation:
		| 'insertOne'
		| 'insertMany'
		| 'updateMany'
		| 'delete'
		| 'findMany'
		| 'findOne'
		| 'findAndUpdate'
		| 'findAndReplace'
		| 'findAndDelete'
		| 'estimatedDocumentCount';
	collection: string;
	query?: any;
	data?: any;
	filter?: any;
	update?: any;
	replacement?: any;
	options?: IAstraDbOptions;
}

/**
 * General options for Astra DB operations
 */
export interface IAstraDbOptions {
	limit?: number;
	skip?: number;
	sort?: any;
	projection?: any;
	upsert?: boolean;
	returnDocument?: 'before' | 'after';
	chunkSize?: number;
	concurrency?: number;
	ordered?: boolean;
}

/**
 * Specific options for insert many operations
 */
export interface IAstraDbInsertManyOptions {
	chunkSize?: number;
	concurrency?: number;
	ordered?: boolean;
	generalMethodTimeoutMs?: number;
	requestTimeoutMs?: number;
	timeout?: number;
}

/**
 * Document interface for vector operations
 */
export interface IAstraDbVectorDocument {
	[key: string]: any;
	$vector?: number[];
	$vectorize?: string;
	$lexical?: string;
	$hybrid?: string;
}

/**
 * Options for find and update|replace|delete operations
 */
export interface IAstraDbFindAndDoSomethingOptions {
	upsert?: boolean;
	returnDocument?: 'before' | 'after';
	sort?: any;
	projection?: any;
	timeout?: number;
	includeResultMetadata?: boolean;
}

/**
 * Options for update operations
 */
export interface IAstraDbUpdateOptions {
	upsert?: boolean;
	timeout?: number;
}

/**
 * Options for estimated document count operations
 */
export interface IAstraDbEstimatedDocumentCountOptions {
	timeout?: number;
}

/**
 * Error types for Astra DB operations
 */
export enum AstraDbErrorType {
	CONNECTION_ERROR = 'CONNECTION_ERROR',
	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	QUERY_ERROR = 'QUERY_ERROR',
	RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

/**
 * Result interface for insert operations
 */
export interface IAstraDbInsertResult {
	insertedId?: string;
	insertedIds?: string[];
	insertedCount?: number;
}

/**
 * Result interface for update operations
 */
export interface IAstraDbUpdateResult {
	matchedCount: number;
	modifiedCount: number;
	upsertedId?: string;
	upsertedCount?: number;
}

/**
 * Result interface for delete operations
 */
export interface IAstraDbDeleteResult {
	deletedCount: number;
}

/**
 * Result interface for find operations
 */
export interface IAstraDbFindResult {
	documents: any[];
	count?: number;
}

/**
 * Result interface for find and update/replace operations
 */
export interface IAstraDbFindAndModifyResult {
	document?: any;
	matchedCount: number;
	modifiedCount: number;
	upsertedId?: string;
}

/**
 * Result interface for estimated document count operations
 */
export interface IAstraDbEstimatedDocumentCountResult {
	estimatedDocumentCount: number;
}
