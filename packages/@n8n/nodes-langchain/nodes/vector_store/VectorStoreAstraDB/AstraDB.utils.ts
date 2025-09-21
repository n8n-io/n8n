import { OperationalError } from 'n8n-workflow';
import { DataAPIClient } from '@datastax/astra-db-ts';

export type AstraDBCredential = {
	endpoint: string;
	token: string;
	keyspace: string;
};

export async function createAstraDBClient(credentials: AstraDBCredential): Promise<DataAPIClient> {
	try {
		const client = new DataAPIClient(credentials.token);

		return client;
	} catch (error) {
		throw new OperationalError(
			`Failed to create Astra DB client: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

export async function getCollection(
	client: DataAPIClient,
	endpoint: string,
	keyspace: string,
	collectionName: string,
) {
	try {
		const db = client.db(endpoint, {
			keyspace: keyspace,
		});
		const collection = db.collection(collectionName);
		return collection;
	} catch (error) {
		throw new OperationalError(
			`Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

export async function ensureCollectionExists(
	client: DataAPIClient,
	endpoint: string,
	keyspace: string,
	collectionName: string,
	dimension?: number,
) {
	try {
		const db = client.db(endpoint, {
			keyspace: keyspace,
		});

		// Check if collection exists
		const collections = await db.listCollections();
		const collectionExists = collections.some((col) => col.name === collectionName);

		if (!collectionExists) {
			// Create collection with vector support if dimension is provided
			const options: any = {};
			if (dimension) {
				options.vector = {
					dimension,
					metric: 'cosine',
				};
			}

			await db.createCollection(collectionName, options);
		}

		return db.collection(collectionName);
	} catch (error) {
		throw new OperationalError(
			`Failed to ensure collection ${collectionName} exists: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

export function parseFilter(filter: any): any {
	if (!filter || typeof filter !== 'object') {
		return undefined;
	}

	// Handle simple filters
	if (filter.path && filter.operator && filter.value !== undefined) {
		const { path, operator, value } = filter;

		switch (operator.toLowerCase()) {
			case 'eq':
			case 'equal':
				return { [path]: { $eq: value } };
			case 'ne':
			case 'not_equal':
				return { [path]: { $ne: value } };
			case 'gt':
			case 'greater_than':
				return { [path]: { $gt: value } };
			case 'gte':
			case 'greater_than_equal':
				return { [path]: { $gte: value } };
			case 'lt':
			case 'less_than':
				return { [path]: { $lt: value } };
			case 'lte':
			case 'less_than_equal':
				return { [path]: { $lte: value } };
			case 'in':
				return { [path]: { $in: Array.isArray(value) ? value : [value] } };
			case 'nin':
			case 'not_in':
				return { [path]: { $nin: Array.isArray(value) ? value : [value] } };
			case 'exists':
				return { [path]: { $exists: value } };
			case 'regex':
				return { [path]: { $regex: value } };
			default:
				throw new OperationalError(`Unsupported filter operator: ${operator}`);
		}
	}

	// Handle composite filters
	if (filter.AND && Array.isArray(filter.AND)) {
		return { $and: filter.AND.map(parseFilter) };
	}

	if (filter.OR && Array.isArray(filter.OR)) {
		return { $or: filter.OR.map(parseFilter) };
	}

	// Handle direct MongoDB-style filters
	return filter;
}

export function buildVectorSearchQuery(
	queryVector: number[],
	limit: number = 10,
	filter?: any,
	includeSimilarity?: boolean,
) {
	const searchQuery: any = {
		$vector: queryVector,
		$limit: limit,
	};

	if (filter) {
		searchQuery.$filter = parseFilter(filter);
	}

	if (includeSimilarity) {
		searchQuery.$includeSimilarity = true;
	}

	return searchQuery;
}

export function transformDocumentForInsertion(document: any, textKey: string = 'text'): any {
	// Ensure the document has the required structure for Astra DB
	const transformedDoc = { ...document };

	// If the document doesn't have a text field but has the specified textKey, use it
	if (!transformedDoc.text && transformedDoc[textKey]) {
		transformedDoc.text = transformedDoc[textKey];
	}

	// Add timestamp if not present
	if (!transformedDoc.timestamp) {
		transformedDoc.timestamp = new Date().toISOString();
	}

	return transformedDoc;
}

export function extractSimilarityScore(result: any): number | undefined {
	// Astra DB returns similarity scores in different formats depending on the query
	if (result.$similarity !== undefined) {
		return result.$similarity;
	}

	if (result.similarity !== undefined) {
		return result.similarity;
	}

	return undefined;
}
