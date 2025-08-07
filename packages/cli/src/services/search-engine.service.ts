import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ApplicationError } from 'n8n-workflow';

export interface SearchEngineConfig {
	enabled: boolean;
	type: 'elasticsearch' | 'opensearch';
	host: string;
	port: number;
	username?: string;
	password?: string;
	ssl?: boolean;
	apiKey?: string;
	indexPrefix: string;
	maxRetries: number;
	requestTimeout: number;
}

export interface SearchQuery {
	query: string;
	filters?: Record<string, any>;
	sort?: Array<{ field: string; order: 'asc' | 'desc' }>;
	from?: number;
	size?: number;
	highlight?: boolean;
}

export interface SearchResult<T = any> {
	hits: Array<{
		id: string;
		score: number;
		source: T;
		highlight?: Record<string, string[]>;
	}>;
	total: number;
	maxScore: number;
	searchTimeMs: number;
	aggregations?: Record<string, any>;
}

export interface IndexDocument {
	id: string;
	[key: string]: any;
}

export interface BulkIndexOperation {
	operation: 'index' | 'update' | 'delete';
	index: string;
	id: string;
	document?: any;
}

@Service()
export class SearchEngineService {
	private client: ElasticsearchClient | OpenSearchClient | null = null;
	private isInitialized = false;
	private readonly config: SearchEngineConfig;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {
		this.config = this.loadConfiguration();
	}

	/**
	 * Initialize the search engine client
	 */
	async initialize(): Promise<void> {
		if (!this.config.enabled) {
			this.logger.info('Search engine integration is disabled');
			return;
		}

		try {
			this.logger.info('Initializing search engine client', {
				type: this.config.type,
				host: this.config.host,
				port: this.config.port,
			});

			if (this.config.type === 'elasticsearch') {
				await this.initializeElasticsearch();
			} else {
				await this.initializeOpenSearch();
			}

			await this.testConnection();
			this.isInitialized = true;

			this.logger.info('Search engine client initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize search engine client', {
				error: error instanceof Error ? error.message : String(error),
				type: this.config.type,
			});

			if (this.config.enabled) {
				throw new ApplicationError(
					`Failed to initialize ${this.config.type}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	/**
	 * Check if search engine is available and initialized
	 */
	isAvailable(): boolean {
		return this.config.enabled && this.isInitialized && this.client !== null;
	}

	/**
	 * Create an index with mapping
	 */
	async createIndex(indexName: string, mapping: any): Promise<void> {
		if (!this.isAvailable()) {
			throw new ApplicationError('Search engine is not available');
		}

		const fullIndexName = this.getFullIndexName(indexName);

		try {
			const exists = await this.indexExists(fullIndexName);
			if (exists) {
				this.logger.debug('Index already exists', { index: fullIndexName });
				return;
			}

			if (this.config.type === 'elasticsearch') {
				await (this.client as ElasticsearchClient).indices.create({
					index: fullIndexName,
					body: {
						mappings: mapping,
						settings: {
							number_of_shards: 1,
							number_of_replicas: 0,
							analysis: {
								analyzer: {
									workflow_analyzer: {
										type: 'custom',
										tokenizer: 'standard',
										filter: ['lowercase', 'stop', 'snowball'],
									},
								},
							},
						},
					},
				});
			} else {
				await (this.client as any).indices.create({
					index: fullIndexName,
					body: {
						mappings: mapping,
						settings: {
							number_of_shards: 1,
							number_of_replicas: 0,
							analysis: {
								analyzer: {
									workflow_analyzer: {
										type: 'custom',
										tokenizer: 'standard',
										filter: ['lowercase', 'stop', 'snowball'],
									},
								},
							},
						},
					},
				});
			}

			this.logger.info('Index created successfully', { index: fullIndexName });
		} catch (error) {
			this.logger.error('Failed to create index', {
				index: fullIndexName,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError(
				`Failed to create index ${fullIndexName}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Delete an index
	 */
	async deleteIndex(indexName: string): Promise<void> {
		if (!this.isAvailable()) {
			throw new ApplicationError('Search engine is not available');
		}

		const fullIndexName = this.getFullIndexName(indexName);

		try {
			const exists = await this.indexExists(fullIndexName);
			if (!exists) {
				this.logger.debug('Index does not exist', { index: fullIndexName });
				return;
			}

			if (this.config.type === 'elasticsearch') {
				await (this.client as ElasticsearchClient).indices.delete({
					index: fullIndexName,
				});
			} else {
				await (this.client as any).indices.delete({
					index: fullIndexName,
				});
			}

			this.logger.info('Index deleted successfully', { index: fullIndexName });
		} catch (error) {
			this.logger.error('Failed to delete index', {
				index: fullIndexName,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError(
				`Failed to delete index ${fullIndexName}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Index a single document
	 */
	async indexDocument(indexName: string, document: IndexDocument): Promise<void> {
		if (!this.isAvailable()) {
			throw new ApplicationError('Search engine is not available');
		}

		const fullIndexName = this.getFullIndexName(indexName);

		try {
			if (this.config.type === 'elasticsearch') {
				await (this.client as ElasticsearchClient).index({
					index: fullIndexName,
					id: document.id,
					body: document,
				});
			} else {
				await (this.client as any).index({
					index: fullIndexName,
					id: document.id,
					body: document,
				});
			}

			this.logger.debug('Document indexed successfully', {
				index: fullIndexName,
				id: document.id,
			});
		} catch (error) {
			this.logger.error('Failed to index document', {
				index: fullIndexName,
				id: document.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError(
				`Failed to index document: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Bulk index multiple documents
	 */
	async bulkIndex(operations: BulkIndexOperation[]): Promise<void> {
		if (!this.isAvailable()) {
			throw new ApplicationError('Search engine is not available');
		}

		if (operations.length === 0) {
			return;
		}

		try {
			const body = operations.flatMap((op) => {
				const fullIndexName = this.getFullIndexName(op.index);
				const header = { [op.operation]: { _index: fullIndexName, _id: op.id } };

				if (op.operation === 'delete') {
					return [header];
				}

				return [header, op.document];
			});

			if (this.config.type === 'elasticsearch') {
				const response = await (this.client as ElasticsearchClient).bulk({ body });

				if (response.body.errors) {
					this.logger.warn('Bulk operation completed with errors', {
						operations: operations.length,
						errors: response.body.items.filter(
							(item: any) => item.index?.error || item.update?.error || item.delete?.error,
						),
					});
				}
			} else {
				const response = await (this.client as any).bulk({ body });

				if (response.body.errors) {
					this.logger.warn('Bulk operation completed with errors', {
						operations: operations.length,
						errors: response.body.items.filter(
							(item: any) => item.index?.error || item.update?.error || item.delete?.error,
						),
					});
				}
			}

			this.logger.debug('Bulk operation completed', {
				operations: operations.length,
			});
		} catch (error) {
			this.logger.error('Failed to perform bulk operation', {
				operations: operations.length,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError(
				`Failed to perform bulk operation: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Search documents
	 */
	async search<T = any>(indexName: string, searchQuery: SearchQuery): Promise<SearchResult<T>> {
		if (!this.isAvailable()) {
			throw new ApplicationError('Search engine is not available');
		}

		const fullIndexName = this.getFullIndexName(indexName);
		const startTime = Date.now();

		try {
			const query = this.buildQuery(searchQuery);
			const searchParams: any = {
				index: fullIndexName,
				body: {
					query,
					from: searchQuery.from || 0,
					size: searchQuery.size || 20,
				},
			};

			// Add sorting
			if (searchQuery.sort && searchQuery.sort.length > 0) {
				searchParams.body.sort = searchQuery.sort.map((s) => ({
					[s.field]: { order: s.order },
				}));
			}

			// Add highlighting
			if (searchQuery.highlight) {
				searchParams.body.highlight = {
					fields: {
						name: {},
						description: {},
						content: {},
					},
					pre_tags: ['<mark>'],
					post_tags: ['</mark>'],
				};
			}

			let response;
			if (this.config.type === 'elasticsearch') {
				response = await (this.client as ElasticsearchClient).search(searchParams);
			} else {
				response = await (this.client as any).search(searchParams);
			}

			const searchTimeMs = Date.now() - startTime;
			const body = response.body;

			const result: SearchResult<T> = {
				hits: body.hits.hits.map((hit: any) => ({
					id: hit._id,
					score: hit._score,
					source: hit._source,
					highlight: hit.highlight,
				})),
				total: typeof body.hits.total === 'object' ? body.hits.total.value : body.hits.total,
				maxScore: body.hits.max_score || 0,
				searchTimeMs,
				aggregations: body.aggregations,
			};

			this.logger.debug('Search completed', {
				index: fullIndexName,
				query: searchQuery.query,
				hits: result.hits.length,
				total: result.total,
				searchTimeMs,
			});

			return result;
		} catch (error) {
			this.logger.error('Search failed', {
				index: fullIndexName,
				query: searchQuery.query,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError(
				`Search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Delete a document
	 */
	async deleteDocument(indexName: string, id: string): Promise<void> {
		if (!this.isAvailable()) {
			throw new ApplicationError('Search engine is not available');
		}

		const fullIndexName = this.getFullIndexName(indexName);

		try {
			if (this.config.type === 'elasticsearch') {
				await (this.client as ElasticsearchClient).delete({
					index: fullIndexName,
					id,
				});
			} else {
				await (this.client as any).delete({
					index: fullIndexName,
					id,
				});
			}

			this.logger.debug('Document deleted successfully', {
				index: fullIndexName,
				id,
			});
		} catch (error) {
			if (error.statusCode === 404) {
				this.logger.debug('Document not found', { index: fullIndexName, id });
				return;
			}

			this.logger.error('Failed to delete document', {
				index: fullIndexName,
				id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError(
				`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Refresh an index
	 */
	async refreshIndex(indexName: string): Promise<void> {
		if (!this.isAvailable()) {
			return;
		}

		const fullIndexName = this.getFullIndexName(indexName);

		try {
			if (this.config.type === 'elasticsearch') {
				await (this.client as ElasticsearchClient).indices.refresh({
					index: fullIndexName,
				});
			} else {
				await (this.client as any).indices.refresh({
					index: fullIndexName,
				});
			}

			this.logger.debug('Index refreshed', { index: fullIndexName });
		} catch (error) {
			this.logger.warn('Failed to refresh index', {
				index: fullIndexName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Get cluster health
	 */
	async getHealth(): Promise<any> {
		if (!this.isAvailable()) {
			return { status: 'unavailable' };
		}

		try {
			let response;
			if (this.config.type === 'elasticsearch') {
				response = await (this.client as ElasticsearchClient).cluster.health();
			} else {
				response = await (this.client as any).cluster.health();
			}

			return response.body;
		} catch (error) {
			this.logger.error('Failed to get cluster health', {
				error: error instanceof Error ? error.message : String(error),
			});
			return { status: 'error', error: error instanceof Error ? error.message : String(error) };
		}
	}

	/**
	 * Close the client connection
	 */
	async close(): Promise<void> {
		if (this.client) {
			try {
				if (this.config.type === 'elasticsearch') {
					await (this.client as ElasticsearchClient).close();
				} else {
					await (this.client as any).close();
				}
				this.logger.info('Search engine client closed');
			} catch (error) {
				this.logger.error('Error closing search engine client', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
			this.client = null;
			this.isInitialized = false;
		}
	}

	// Private methods

	private loadConfiguration(): SearchEngineConfig {
		return {
			enabled: process.env.N8N_SEARCH_ENGINE_ENABLED === 'true',
			type:
				(process.env.N8N_SEARCH_ENGINE_TYPE as 'elasticsearch' | 'opensearch') || 'elasticsearch',
			host: process.env.N8N_SEARCH_ENGINE_HOST || 'localhost',
			port: parseInt(process.env.N8N_SEARCH_ENGINE_PORT || '9200', 10),
			username: process.env.N8N_SEARCH_ENGINE_USERNAME,
			password: process.env.N8N_SEARCH_ENGINE_PASSWORD,
			ssl: process.env.N8N_SEARCH_ENGINE_SSL === 'true',
			apiKey: process.env.N8N_SEARCH_ENGINE_API_KEY,
			indexPrefix: process.env.N8N_SEARCH_ENGINE_INDEX_PREFIX || 'n8n',
			maxRetries: parseInt(process.env.N8N_SEARCH_ENGINE_MAX_RETRIES || '3', 10),
			requestTimeout: parseInt(process.env.N8N_SEARCH_ENGINE_REQUEST_TIMEOUT || '30000', 10),
		};
	}

	private async initializeElasticsearch(): Promise<void> {
		const { Client } = await import('@elastic/elasticsearch');

		const clientConfig: any = {
			node: `${this.config.ssl ? 'https' : 'http'}://${this.config.host}:${this.config.port}`,
			maxRetries: this.config.maxRetries,
			requestTimeout: this.config.requestTimeout,
		};

		if (this.config.apiKey) {
			clientConfig.auth = {
				apiKey: this.config.apiKey,
			};
		} else if (this.config.username && this.config.password) {
			clientConfig.auth = {
				username: this.config.username,
				password: this.config.password,
			};
		}

		if (this.config.ssl) {
			clientConfig.ssl = {
				rejectUnauthorized: false, // For development - should be configurable
			};
		}

		this.client = new Client(clientConfig);
	}

	private async initializeOpenSearch(): Promise<void> {
		const { Client } = await import('@opensearch-project/opensearch');

		const clientConfig: any = {
			node: `${this.config.ssl ? 'https' : 'http'}://${this.config.host}:${this.config.port}`,
			maxRetries: this.config.maxRetries,
			requestTimeout: this.config.requestTimeout,
		};

		if (this.config.username && this.config.password) {
			clientConfig.auth = {
				username: this.config.username,
				password: this.config.password,
			};
		}

		if (this.config.ssl) {
			clientConfig.ssl = {
				rejectUnauthorized: false, // For development - should be configurable
			};
		}

		this.client = new Client(clientConfig) as any;
	}

	private async testConnection(): Promise<void> {
		if (!this.client) {
			throw new ApplicationError('Client not initialized');
		}

		if (this.config.type === 'elasticsearch') {
			await (this.client as ElasticsearchClient).ping();
		} else {
			await (this.client as any).ping();
		}
	}

	private async indexExists(indexName: string): Promise<boolean> {
		if (!this.client) {
			return false;
		}

		try {
			if (this.config.type === 'elasticsearch') {
				const response = await (this.client as ElasticsearchClient).indices.exists({
					index: indexName,
				});
				return response.body;
			} else {
				const response = await (this.client as any).indices.exists({
					index: indexName,
				});
				return response.body;
			}
		} catch (error) {
			return false;
		}
	}

	private getFullIndexName(indexName: string): string {
		return `${this.config.indexPrefix}_${indexName}`;
	}

	private buildQuery(searchQuery: SearchQuery): any {
		if (!searchQuery.query || searchQuery.query.trim() === '') {
			return { match_all: {} };
		}

		const mustClauses = [];

		// Main text query
		mustClauses.push({
			multi_match: {
				query: searchQuery.query,
				fields: ['name^3', 'description^2', 'content', 'tags.name^2', 'nodeTypes'],
				type: 'best_fields',
				fuzziness: 'AUTO',
			},
		});

		// Apply filters
		if (searchQuery.filters) {
			Object.entries(searchQuery.filters).forEach(([field, value]) => {
				if (value !== undefined && value !== null) {
					if (Array.isArray(value)) {
						mustClauses.push({
							terms: { [field]: value },
						});
					} else if (typeof value === 'boolean') {
						mustClauses.push({
							term: { [field]: value },
						});
					} else {
						mustClauses.push({
							term: { [field]: value },
						});
					}
				}
			});
		}

		return {
			bool: {
				must: mustClauses,
			},
		};
	}
}
