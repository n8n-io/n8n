/**
 * Type definitions for DB2 Vector Store integration
 */

import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';

/**
 * Distance strategy for similarity search
 */
export enum DistanceStrategy {
	EUCLIDEAN = 'euclidean',
	COSINE = 'cosine',
	DOT_PRODUCT = 'dot_product',
}

/**
 * DB2 connection configuration
 */
export interface DB2ConnectionConfig {
	hostname: string;
	port: number;
	database: string;
	username: string;
	password: string;
	ssl?: boolean;
	sslServerCertificate?: string;
}

/**
 * DB2 Vector Store configuration
 */
export interface DB2VectorStoreConfig {
	client: any; // ibm_db connection
	embeddingFunction: Embeddings;
	tableName: string;
	distanceStrategy?: DistanceStrategy;
	query?: string;
	params?: Record<string, any>;
}

/**
 * Column mapping for DB2 table
 */
export interface ColumnMapping {
	id: string;
	text: string;
	embedding: string;
	metadata: string;
}

/**
 * Document with score from similarity search
 */
export interface DocumentWithScore {
	document: Document;
	score: number;
}

/**
 * Document with embedding from similarity search
 */
export interface DocumentWithEmbedding {
	document: Document;
	embedding: number[];
	score: number;
}

/**
 * Filter for similarity search
 */
export interface SearchFilter {
	[key: string]: any;
}

/**
 * Options for adding texts
 */
export interface AddTextsOptions {
	ids?: string[];
	metadatas?: Record<string, any>[];
}

/**
 * Options for similarity search
 */
export interface SimilaritySearchOptions {
	k?: number;
	filter?: SearchFilter;
}

/**
 * Options for MMR search
 */
export interface MMRSearchOptions extends SimilaritySearchOptions {
	fetchK?: number;
	lambdaMult?: number;
}

/**
 * DB2 operation result
 */
export interface DB2OperationResult {
	success: boolean;
	message?: string;
	data?: any;
	error?: string;
}

/**
 * Table creation options
 */
export interface TableCreationOptions {
	embeddingDimension: number;
	dropIfExists?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	error?: string;
}

// Made with Bob
