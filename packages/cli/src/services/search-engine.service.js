'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SearchEngineService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
let SearchEngineService = class SearchEngineService {
	constructor(logger, globalConfig) {
		this.logger = logger;
		this.globalConfig = globalConfig;
		this.client = null;
		this.isInitialized = false;
		this.config = this.loadConfiguration();
	}
	async initialize() {
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
				throw new n8n_workflow_1.ApplicationError(
					`Failed to initialize ${this.config.type}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}
	isAvailable() {
		return this.config.enabled && this.isInitialized && this.client !== null;
	}
	async createIndex(indexName, mapping) {
		if (!this.isAvailable()) {
			throw new n8n_workflow_1.ApplicationError('Search engine is not available');
		}
		const fullIndexName = this.getFullIndexName(indexName);
		try {
			const exists = await this.indexExists(fullIndexName);
			if (exists) {
				this.logger.debug('Index already exists', { index: fullIndexName });
				return;
			}
			if (this.config.type === 'elasticsearch') {
				await this.client.indices.create({
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
				await this.client.indices.create({
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
			throw new n8n_workflow_1.ApplicationError(
				`Failed to create index ${fullIndexName}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async deleteIndex(indexName) {
		if (!this.isAvailable()) {
			throw new n8n_workflow_1.ApplicationError('Search engine is not available');
		}
		const fullIndexName = this.getFullIndexName(indexName);
		try {
			const exists = await this.indexExists(fullIndexName);
			if (!exists) {
				this.logger.debug('Index does not exist', { index: fullIndexName });
				return;
			}
			if (this.config.type === 'elasticsearch') {
				await this.client.indices.delete({
					index: fullIndexName,
				});
			} else {
				await this.client.indices.delete({
					index: fullIndexName,
				});
			}
			this.logger.info('Index deleted successfully', { index: fullIndexName });
		} catch (error) {
			this.logger.error('Failed to delete index', {
				index: fullIndexName,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError(
				`Failed to delete index ${fullIndexName}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async indexDocument(indexName, document) {
		if (!this.isAvailable()) {
			throw new n8n_workflow_1.ApplicationError('Search engine is not available');
		}
		const fullIndexName = this.getFullIndexName(indexName);
		try {
			if (this.config.type === 'elasticsearch') {
				await this.client.index({
					index: fullIndexName,
					id: document.id,
					body: document,
				});
			} else {
				await this.client.index({
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
			throw new n8n_workflow_1.ApplicationError(
				`Failed to index document: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async bulkIndex(operations) {
		if (!this.isAvailable()) {
			throw new n8n_workflow_1.ApplicationError('Search engine is not available');
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
				const response = await this.client.bulk({ body });
				if (response.body.errors) {
					this.logger.warn('Bulk operation completed with errors', {
						operations: operations.length,
						errors: response.body.items.filter(
							(item) => item.index?.error || item.update?.error || item.delete?.error,
						),
					});
				}
			} else {
				const response = await this.client.bulk({ body });
				if (response.body.errors) {
					this.logger.warn('Bulk operation completed with errors', {
						operations: operations.length,
						errors: response.body.items.filter(
							(item) => item.index?.error || item.update?.error || item.delete?.error,
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
			throw new n8n_workflow_1.ApplicationError(
				`Failed to perform bulk operation: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async search(indexName, searchQuery) {
		if (!this.isAvailable()) {
			throw new n8n_workflow_1.ApplicationError('Search engine is not available');
		}
		const fullIndexName = this.getFullIndexName(indexName);
		const startTime = Date.now();
		try {
			const query = this.buildQuery(searchQuery);
			const searchParams = {
				index: fullIndexName,
				body: {
					query,
					from: searchQuery.from || 0,
					size: searchQuery.size || 20,
				},
			};
			if (searchQuery.sort && searchQuery.sort.length > 0) {
				searchParams.body.sort = searchQuery.sort.map((s) => ({
					[s.field]: { order: s.order },
				}));
			}
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
				response = await this.client.search(searchParams);
			} else {
				response = await this.client.search(searchParams);
			}
			const searchTimeMs = Date.now() - startTime;
			const body = response.body;
			const result = {
				hits: body.hits.hits.map((hit) => ({
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
			throw new n8n_workflow_1.ApplicationError(
				`Search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async deleteDocument(indexName, id) {
		if (!this.isAvailable()) {
			throw new n8n_workflow_1.ApplicationError('Search engine is not available');
		}
		const fullIndexName = this.getFullIndexName(indexName);
		try {
			if (this.config.type === 'elasticsearch') {
				await this.client.delete({
					index: fullIndexName,
					id,
				});
			} else {
				await this.client.delete({
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
			throw new n8n_workflow_1.ApplicationError(
				`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async refreshIndex(indexName) {
		if (!this.isAvailable()) {
			return;
		}
		const fullIndexName = this.getFullIndexName(indexName);
		try {
			if (this.config.type === 'elasticsearch') {
				await this.client.indices.refresh({
					index: fullIndexName,
				});
			} else {
				await this.client.indices.refresh({
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
	async getHealth() {
		if (!this.isAvailable()) {
			return { status: 'unavailable' };
		}
		try {
			let response;
			if (this.config.type === 'elasticsearch') {
				response = await this.client.cluster.health();
			} else {
				response = await this.client.cluster.health();
			}
			return response.body;
		} catch (error) {
			this.logger.error('Failed to get cluster health', {
				error: error instanceof Error ? error.message : String(error),
			});
			return { status: 'error', error: error instanceof Error ? error.message : String(error) };
		}
	}
	async close() {
		if (this.client) {
			try {
				if (this.config.type === 'elasticsearch') {
					await this.client.close();
				} else {
					await this.client.close();
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
	loadConfiguration() {
		return {
			enabled: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_ENABLED') === 'true',
			type: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_TYPE') || 'elasticsearch',
			host: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_HOST') || 'localhost',
			port: parseInt(this.globalConfig.getEnv('N8N_SEARCH_ENGINE_PORT') || '9200', 10),
			username: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_USERNAME'),
			password: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_PASSWORD'),
			ssl: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_SSL') === 'true',
			apiKey: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_API_KEY'),
			indexPrefix: this.globalConfig.getEnv('N8N_SEARCH_ENGINE_INDEX_PREFIX') || 'n8n',
			maxRetries: parseInt(this.globalConfig.getEnv('N8N_SEARCH_ENGINE_MAX_RETRIES') || '3', 10),
			requestTimeout: parseInt(
				this.globalConfig.getEnv('N8N_SEARCH_ENGINE_REQUEST_TIMEOUT') || '30000',
				10,
			),
		};
	}
	async initializeElasticsearch() {
		const { Client } = await Promise.resolve().then(() =>
			__importStar(require('@elastic/elasticsearch')),
		);
		const clientConfig = {
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
				rejectUnauthorized: false,
			};
		}
		this.client = new Client(clientConfig);
	}
	async initializeOpenSearch() {
		const { Client } = await Promise.resolve().then(() =>
			__importStar(require('@opensearch-project/opensearch')),
		);
		const clientConfig = {
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
				rejectUnauthorized: false,
			};
		}
		this.client = new Client(clientConfig);
	}
	async testConnection() {
		if (!this.client) {
			throw new n8n_workflow_1.ApplicationError('Client not initialized');
		}
		if (this.config.type === 'elasticsearch') {
			await this.client.ping();
		} else {
			await this.client.ping();
		}
	}
	async indexExists(indexName) {
		if (!this.client) {
			return false;
		}
		try {
			if (this.config.type === 'elasticsearch') {
				const response = await this.client.indices.exists({
					index: indexName,
				});
				return response.body;
			} else {
				const response = await this.client.indices.exists({
					index: indexName,
				});
				return response.body;
			}
		} catch (error) {
			return false;
		}
	}
	getFullIndexName(indexName) {
		return `${this.config.indexPrefix}_${indexName}`;
	}
	buildQuery(searchQuery) {
		if (!searchQuery.query || searchQuery.query.trim() === '') {
			return { match_all: {} };
		}
		const mustClauses = [];
		mustClauses.push({
			multi_match: {
				query: searchQuery.query,
				fields: ['name^3', 'description^2', 'content', 'tags.name^2', 'nodeTypes'],
				type: 'best_fields',
				fuzziness: 'AUTO',
			},
		});
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
};
exports.SearchEngineService = SearchEngineService;
exports.SearchEngineService = SearchEngineService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [backend_common_1.Logger, config_1.GlobalConfig]),
	],
	SearchEngineService,
);
//# sourceMappingURL=search-engine.service.js.map
