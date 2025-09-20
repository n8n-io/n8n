import { DataAPIClient } from '@datastax/astra-db-ts';
import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, INode } from 'n8n-workflow';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type {
	IAstraDbCredentials,
	IAstraDbCollection,
	IAstraDbInsertManyOptions,
	IAstraDbUpdateOptions,
	IAstraDbVectorDocument,
	IAstraDbFindAndDoSomethingOptions,
	IAstraDbInsertResult,
	IAstraDbUpdateResult,
	IAstraDbDeleteResult,
	IAstraDbFindResult,
	IAstraDbFindAndModifyResult,
	IAstraDbEstimatedDocumentCountResult,
	IAstraDbEstimatedDocumentCountOptions,
} from './astraDb.types';

/**
 * Initialize Astra DB client
 */
export async function connectAstraClient(credentials: IAstraDbCredentials): Promise<DataAPIClient> {
	try {
		const client = new DataAPIClient(credentials.token);
		return client;
	} catch (error) {
		throw new Error(
			`Failed to connect to Astra DB: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Validate Astra DB credentials
 */
export function validateAstraCredentials(
	node: INode,
	credentials: IDataObject,
): IAstraDbCredentials {
	if (!credentials.endpoint || typeof credentials.endpoint !== 'string') {
		throw new NodeOperationError(node, 'Astra DB endpoint is required');
	}
	if (!credentials.token || typeof credentials.token !== 'string') {
		throw new NodeOperationError(node, 'Astra DB token is required');
	}

	return {
		endpoint: credentials.endpoint.trim(),
		token: credentials.token.trim(),
		//keyspace: credentials.keyspace ? credentials.keyspace.toString().trim() : undefined,
	};
}

/**
 * Validate keyspace or collection name
 */
export function validateKeyspaceCollectionName(node: INode, name: string): void {
	if (!name || typeof name !== 'string') {
		throw new NodeOperationError(node, 'Name is required');
	}
	if (!/^[a-z][a-z0-9_]*$/.test(name)) {
		throw new NodeOperationError(
			node,
			'Invalid name format. Must start with a letter and contain only lowercase letters, numbers, and underscores',
		);
	}
}

/**
 * Validate query object
 */
export function validateQuery(node: INode, query: any): void {
	if (typeof query !== 'object' || query === null) {
		throw new NodeOperationError(node, 'Query must be a valid JSON object');
	}
}

/**
 * Validate document for vector operations
 */
export function validateVectorDocument(
	node: INode,
	document: IAstraDbVectorDocument,
	operation: 'vector' | 'vectorize',
): void {
	if (operation === 'vector') {
		if (!document.$vector || !Array.isArray(document.$vector)) {
			throw new NodeOperationError(
				node,
				'Document must include $vector field with array of numbers',
			);
		}
		if (document.$vector.length === 0) {
			throw new NodeOperationError(node, 'Vector array cannot be empty');
		}
	} else if (operation === 'vectorize') {
		if (!document.$vectorize || typeof document.$vectorize !== 'string') {
			throw new NodeOperationError(node, 'Document must include $vectorize field with text string');
		}
		if (document.$vectorize.trim().length === 0) {
			throw new NodeOperationError(node, 'Vectorize text cannot be empty');
		}
	}
}

/**
 * Handle Astra DB errors with proper categorization
 */
export function handleAstraError(node: INode, error: any, operation: string): never {
	if (error.code === 'UNAUTHENTICATED' || error.message?.includes('authentication')) {
		throw new NodeOperationError(node, 'Authentication failed', {
			description: 'Please check your Astra DB token',
		});
	}

	if (error.message?.includes('rate limit') || error.message?.includes('throttle')) {
		throw new NodeOperationError(node, 'Rate limit exceeded', {
			description: 'Please wait before retrying the operation',
		});
	}

	if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
		throw new NodeOperationError(node, 'Resource not found', {
			description: `The specified collection or document does not exist: ${error.message}`,
		});
	}

	throw new NodeOperationError(
		node,
		`Astra DB ${operation} failed: ${error.message || 'Unknown error'}`,
	);
}

/**
 * Format Astra DB response consistently
 */
export function formatAstraResponse(result: any, operation: string): any {
	// Add operation metadata to response
	return {
		...result,
		_operation: operation,
		_timestamp: new Date().toISOString(),
	};
}

/**
 * Parse operation options
 */
export function parseAstraOptions(node: INode, options: any): any {
	if (!options || typeof options !== 'object') {
		return {};
	}

	const parsedOptions: any = {};

	if (options.limit !== undefined) {
		parsedOptions.limit = parseInt(options.limit, 10);
	}
	if (options.skip !== undefined) {
		parsedOptions.skip = parseInt(options.skip, 10);
	}
	if (options.sort) {
		try {
			parsedOptions.sort =
				typeof options.sort === 'string' ? JSON.parse(options.sort) : options.sort;
		} catch (error) {
			throw new NodeOperationError(node, 'Invalid sort option format');
		}
	}
	if (options.projection) {
		try {
			parsedOptions.projection =
				typeof options.projection === 'string'
					? JSON.parse(options.projection)
					: options.projection;
		} catch (error) {
			throw new NodeOperationError(node, 'Invalid projection option format');
		}
	}
	if (options.upsert !== undefined) {
		parsedOptions.upsert = Boolean(options.upsert);
	}
	if (options.returnDocument) {
		parsedOptions.returnDocument = options.returnDocument;
	}
	if (options.timeout !== undefined) {
		parsedOptions.timeout = parseInt(options.timeout, 60000);
	}
	if (options.includeResultMetadata !== undefined) {
		parsedOptions.includeResultMetadata = Boolean(options.includeResultMetadata);
	}

	return parsedOptions;
}

/**
 * Insert single document
 */
export async function insertOneDocument(
	node: INode,
	collection: IAstraDbCollection,
	document: any,
): Promise<IAstraDbInsertResult> {
	try {
		const result = await collection.insertOne(document);
		return {
			insertedId: result.insertedId?.toString(),
		};
	} catch (error) {
		handleAstraError(node, error, 'insert one');
	}
}

/**
 * Insert multiple documents
 */
export async function insertManyDocuments(
	node: INode,
	collection: IAstraDbCollection,
	documents: any[],
	options?: IAstraDbInsertManyOptions,
): Promise<IAstraDbInsertResult> {
	try {
		const result = await collection.insertMany(documents, {
			chunkSize: options?.chunkSize || 20,
			concurrency: options?.concurrency || 3,
			ordered: options?.ordered || false,
			timeout: options?.timeout || 60000,
		});

		return {
			insertedCount: result.insertedCount,
			insertedIds: result.insertedIds
				?.map((id) => id?.toString())
				.filter((id): id is string => id !== undefined),
		};
	} catch (error) {
		handleAstraError(node, error, 'insert many');
	}
}

/**
 * Insert document with vector embeddings
 */
// export async function insertWithVectorEmbeddings(
// 	node: INode,
// 	collection: IAstraDbCollection,
// 	document: IAstraDbVectorDocument
// ): Promise<IAstraDbInsertResult> {
// 	try {
// 		validateVectorDocument(node, document, 'vector');

// 		const result = await collection.insertOne(document);
// 		return {
// 			insertedId: result.insertedId?.toString(),
// 		};
// 	} catch (error) {
// 		handleAstraError(node, error, 'insert with vector embeddings');
// 	}
// }

/**
 * Insert document with vectorize
 */
// export async function insertWithVectorize(
// 	node: INode,
// 	collection: IAstraDbCollection,
// 	document: IAstraDbVectorDocument
// ): Promise<IAstraDbInsertResult> {
// 	try {
// 		validateVectorDocument(node, document, 'vectorize');

// 		const result = await collection.insertOne(document);
// 		return {
// 			insertedId: result.insertedId?.toString(),
// 		};
// 	} catch (error) {
// 		handleAstraError(node, error, 'insert with vectorize');
// 	}
// }

/**
 * Update documents
 */
export async function updateDocuments(
	node: INode,
	collection: IAstraDbCollection,
	filter: any,
	update: any,
	options?: IAstraDbUpdateOptions,
): Promise<IAstraDbUpdateResult> {
	try {
		const result = await collection.updateMany(filter, update, {
			upsert: options?.upsert || false,
			timeout: options?.timeout || 60000,
		});
		return {
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
			upsertedId: result.upsertedId?.toString(),
			upsertedCount: result.upsertedCount,
		};
	} catch (error) {
		handleAstraError(node, error, 'update');
	}
}

/**
 * Delete documents
 */
export async function deleteDocuments(
	node: INode,
	collection: IAstraDbCollection,
	filter: any,
): Promise<IAstraDbDeleteResult> {
	try {
		const result = await collection.deleteMany(filter);
		return {
			deletedCount: result.deletedCount,
		};
	} catch (error) {
		handleAstraError(node, error, 'delete');
	}
}

/**
 * Find documents
 */
export async function findDocuments(
	node: INode,
	collection: IAstraDbCollection,
	filter: any,
	options?: any,
): Promise<IAstraDbFindResult> {
	try {
		Logger.debug(`Finding documents in collection with filter: ${JSON.stringify(filter)}`);
		if (options !== undefined) {
			Logger.debug(`Options: ${JSON.stringify(options)}`);
		}
		const result = await collection.find(filter, options);
		const documents = await result.toArray();
		Logger.debug(`Found ${documents.length} documents`);
		return {
			documents: documents,
		};
	} catch (error) {
		handleAstraError(node, error, 'find');
	}
}

/**
 * Find single document
 */
export async function findOneDocument(
	node: INode,
	collection: IAstraDbCollection,
	filter: any,
	options?: any,
): Promise<any> {
	try {
		const result = await collection.findOne(filter, options);
		return result;
	} catch (error) {
		handleAstraError(node, error, 'find one');
	}
}

/**
 * Find and update document
 */
export async function findAndUpdateDocument(
	node: INode,
	collection: IAstraDbCollection,
	filter: any,
	update: any,
	options?: IAstraDbFindAndDoSomethingOptions,
): Promise<IAstraDbFindAndModifyResult> {
	try {
		const result = await collection.findOneAndUpdate(filter, update, {
			upsert: options?.upsert || false,
			returnDocument: options?.returnDocument || 'after',
			sort: options?.sort,
			projection: options?.projection,
			timeout: options?.timeout || 60000,
			//includeResultMetadata: options?.includeResultMetadata || false,
		});
		Logger.info(`Found and updated document: ${JSON.stringify(result)}`);
		return {
			document: result?.document,
			matchedCount: result?.matchedCount || 0,
			modifiedCount: result?.modifiedCount || 0,
			upsertedId: result?.upsertedId?.toString(),
		};
	} catch (error) {
		handleAstraError(node, error, 'find one and update');
	}
}

/**
 * Find and replace document
 */
export async function findAndReplaceDocument(
	node: INode,
	collection: IAstraDbCollection,
	filter: any,
	replacement: any,
	options?: IAstraDbFindAndDoSomethingOptions,
): Promise<IAstraDbFindAndModifyResult> {
	try {
		const result = await collection.findOneAndReplace(filter, replacement, {
			upsert: options?.upsert || false,
			returnDocument: options?.returnDocument || 'after',
			sort: options?.sort,
			projection: options?.projection,
			timeout: options?.timeout || 60000,
			//includeResultMetadata: options?.includeResultMetadata || false,
		});
		Logger.info(`Found and replaced document: ${JSON.stringify(result)}`);
		return {
			document: result?.document,
			matchedCount: result?.matchedCount || 0,
			modifiedCount: result?.modifiedCount || 0,
			upsertedId: result?.upsertedId?.toString(),
		};
	} catch (error) {
		handleAstraError(node, error, 'find one and replace');
	}
}

/**
 * Find and delete document
 */
export async function findAndDeleteDocument(
	node: INode,
	collection: IAstraDbCollection,
	filter: any,
	options?: IAstraDbFindAndDoSomethingOptions,
): Promise<IAstraDbFindAndModifyResult> {
	try {
		const result = await collection.findOneAndDelete(filter, {
			projection: options?.projection,
			sort: options?.sort,
			timeout: options?.timeout || 60000,
			//includeResultMetadata: options?.includeResultMetadata || false,
		});
		Logger.info(`Found and deleted document: ${JSON.stringify(result)}`);
		return {
			document: result?.document,
			matchedCount: result?.matchedCount || 0,
			modifiedCount: result?.modifiedCount || 0,
			upsertedId: result?.upsertedId?.toString(),
		};
	} catch (error) {
		handleAstraError(node, error, 'find one and delete');
	}
}

/**
 * Estimated document count
 */
export async function estimatedDocumentCount(
	node: INode,
	collection: IAstraDbCollection,
	options?: IAstraDbEstimatedDocumentCountOptions,
): Promise<IAstraDbEstimatedDocumentCountResult> {
	try {
		const result = await collection.estimatedDocumentCount({
			timeout: options?.timeout || 60000,
		});

		return {
			estimatedDocumentCount: result,
		};
	} catch (error) {
		handleAstraError(node, error, 'estimated document count');
	}
}
