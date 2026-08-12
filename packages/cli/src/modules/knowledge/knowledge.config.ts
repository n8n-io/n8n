import { Config, Env } from '@n8n/config';

/** Configuration for the knowledge connectors module. */
@Config
export class KnowledgeConfig {
	/**
	 * How often in minutes a source becomes eligible for another sync.
	 * Default: 60
	 */
	@Env('N8N_KNOWLEDGE_SYNC_INTERVAL_MINUTES')
	syncIntervalMinutes: number = 60;

	/**
	 * Characters per chunk when splitting a document for embedding.
	 * Default: 1500
	 */
	@Env('N8N_KNOWLEDGE_CHUNK_SIZE')
	chunkSize: number = 1500;

	/**
	 * Characters shared between two consecutive chunks, so context spanning a
	 * chunk boundary stays retrievable.
	 * Default: 200
	 */
	@Env('N8N_KNOWLEDGE_CHUNK_OVERLAP')
	chunkOverlap: number = 200;

	/**
	 * Documents longer than this are truncated before chunking.
	 * Default: 200000
	 */
	@Env('N8N_KNOWLEDGE_MAX_DOCUMENT_CHARS')
	maxDocumentChars: number = 200_000;

	/**
	 * Number of chunks sent to the embedding provider in a single request.
	 * Default: 100
	 */
	@Env('N8N_KNOWLEDGE_EMBEDDING_BATCH_SIZE')
	embeddingBatchSize: number = 100;

	/**
	 * Number of results returned by a search when the caller does not ask for a
	 * specific amount.
	 * Default: 8
	 */
	@Env('N8N_KNOWLEDGE_DEFAULT_TOP_K')
	defaultTopK: number = 8;
}
