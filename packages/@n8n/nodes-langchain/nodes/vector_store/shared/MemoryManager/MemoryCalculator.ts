import type { Document } from '@langchain/core/documents';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';

import type { IMemoryCalculator } from './types';

// Memory estimation constants
const FLOAT_SIZE_BYTES = 8; // Size of a float64 in bytes
const CHAR_SIZE_BYTES = 2; // Size of a JavaScript character in bytes(2 bytes per character in UTF-16)
const VECTOR_OVERHEAD_BYTES = 200; // Estimated overhead per vector
const EMBEDDING_DIMENSIONS = 1536; // Fixed embedding dimensions
const EMBEDDING_SIZE_BYTES = EMBEDDING_DIMENSIONS * FLOAT_SIZE_BYTES;
const AVG_METADATA_SIZE_BYTES = 100; // Average size for simple metadata

/**
 * Calculates memory usage for vector stores and documents
 */
export class MemoryCalculator implements IMemoryCalculator {
	/**
	 * Fast batch size estimation for multiple documents
	 */
	estimateBatchSize(documents: Document[]): number {
		if (documents.length === 0) return 0;

		let totalContentSize = 0;
		let totalMetadataSize = 0;

		// Single pass through documents for content and metadata estimation
		for (const doc of documents) {
			if (doc.pageContent) {
				totalContentSize += doc.pageContent.length * CHAR_SIZE_BYTES;
			}

			// Metadata size estimation
			if (doc.metadata) {
				// For simple objects, estimate based on key count
				const metadataKeys = Object.keys(doc.metadata).length;
				if (metadataKeys > 0) {
					// For each key, estimate the key name plus a typical value
					// plus some overhead for object structure
					totalMetadataSize += metadataKeys * AVG_METADATA_SIZE_BYTES;
				}
			}
		}

		// Fixed size components (embedding vectors and overhead)
		// Each embedding is a fixed-size array of floating point numbers
		const embeddingSize = documents.length * EMBEDDING_SIZE_BYTES;

		// Object overhead, each vector is stored with additional JS object structure
		const overhead = documents.length * VECTOR_OVERHEAD_BYTES;

		// Calculate total batch size with a safety factor to avoid underestimation
		const calculatedSize = totalContentSize + totalMetadataSize + embeddingSize + overhead;

		return Math.ceil(calculatedSize);
	}

	/**
	 * Calculate the size of a vector store by examining its contents
	 */
	calculateVectorStoreSize(vectorStore: MemoryVectorStore): number {
		if (!vectorStore.memoryVectors || vectorStore.memoryVectors.length === 0) {
			return 0;
		}

		let storeSize = 0;

		// Calculate size of each vector
		for (const vector of vectorStore.memoryVectors) {
			// Size of embedding (float64 array)
			storeSize += vector.embedding.length * FLOAT_SIZE_BYTES;

			// Size of content string (2 bytes per character in JS)
			storeSize += vector.content ? vector.content.length * CHAR_SIZE_BYTES : 0;

			// Estimate metadata size
			if (vector.metadata) {
				// Use a more accurate calculation for metadata
				const metadataStr = JSON.stringify(vector.metadata);
				storeSize += metadataStr.length * CHAR_SIZE_BYTES;
			}

			// Add overhead for object structure
			storeSize += VECTOR_OVERHEAD_BYTES;
		}

		return Math.ceil(storeSize);
	}
}
