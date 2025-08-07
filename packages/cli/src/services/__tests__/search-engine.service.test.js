'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const search_engine_service_1 = require('../search-engine.service');
const n8n_workflow_1 = require('n8n-workflow');
describe('SearchEngineService', () => {
	let service;
	let mockLogger;
	let mockGlobalConfig;
	const mockElasticsearchClient = {
		indices: {
			create: jest.fn(),
			delete: jest.fn(),
			exists: jest.fn(),
			refresh: jest.fn(),
		},
		index: jest.fn(),
		bulk: jest.fn(),
		search: jest.fn(),
		delete: jest.fn(),
		ping: jest.fn(),
		cluster: {
			health: jest.fn(),
		},
		close: jest.fn(),
	};
	beforeEach(() => {
		mockLogger = {
			info: jest.fn(),
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		mockGlobalConfig = {
			getEnv: jest.fn(),
		};
		mockGlobalConfig.getEnv.mockImplementation((key) => {
			const config = {
				N8N_SEARCH_ENGINE_ENABLED: 'true',
				N8N_SEARCH_ENGINE_TYPE: 'elasticsearch',
				N8N_SEARCH_ENGINE_HOST: 'localhost',
				N8N_SEARCH_ENGINE_PORT: '9200',
				N8N_SEARCH_ENGINE_INDEX_PREFIX: 'n8n_test',
				N8N_SEARCH_ENGINE_MAX_RETRIES: '3',
				N8N_SEARCH_ENGINE_REQUEST_TIMEOUT: '30000',
			};
			return config[key];
		});
		service = new search_engine_service_1.SearchEngineService(mockLogger, mockGlobalConfig);
		jest.doMock('@elastic/elasticsearch', () => ({
			Client: jest.fn().mockImplementation(() => mockElasticsearchClient),
		}));
	});
	afterEach(() => {
		jest.clearAllMocks();
		jest.resetModules();
	});
	describe('Configuration', () => {
		it('should load configuration from environment variables', () => {
			expect(mockGlobalConfig.getEnv).toHaveBeenCalledWith('N8N_SEARCH_ENGINE_ENABLED');
			expect(mockGlobalConfig.getEnv).toHaveBeenCalledWith('N8N_SEARCH_ENGINE_TYPE');
			expect(mockGlobalConfig.getEnv).toHaveBeenCalledWith('N8N_SEARCH_ENGINE_HOST');
			expect(mockGlobalConfig.getEnv).toHaveBeenCalledWith('N8N_SEARCH_ENGINE_PORT');
		});
		it('should return false for isAvailable when disabled', () => {
			mockGlobalConfig.getEnv.mockImplementation((key) => {
				if (key === 'N8N_SEARCH_ENGINE_ENABLED') return 'false';
				return '';
			});
			const disabledService = new search_engine_service_1.SearchEngineService(
				mockLogger,
				mockGlobalConfig,
			);
			expect(disabledService.isAvailable()).toBe(false);
		});
	});
	describe('Initialization', () => {
		it('should initialize Elasticsearch client successfully', async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			await service.initialize();
			expect(mockLogger.info).toHaveBeenCalledWith('Initializing search engine client', {
				type: 'elasticsearch',
				host: 'localhost',
				port: 9200,
			});
			expect(mockLogger.info).toHaveBeenCalledWith('Search engine client initialized successfully');
		});
		it('should handle initialization failure', async () => {
			mockElasticsearchClient.ping.mockRejectedValue(new Error('Connection failed'));
			await expect(service.initialize()).rejects.toThrow(n8n_workflow_1.ApplicationError);
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize search engine client', {
				error: 'Connection failed',
				type: 'elasticsearch',
			});
		});
		it('should skip initialization when disabled', async () => {
			mockGlobalConfig.getEnv.mockImplementation((key) => {
				if (key === 'N8N_SEARCH_ENGINE_ENABLED') return 'false';
				return '';
			});
			const disabledService = new search_engine_service_1.SearchEngineService(
				mockLogger,
				mockGlobalConfig,
			);
			await disabledService.initialize();
			expect(mockLogger.info).toHaveBeenCalledWith('Search engine integration is disabled');
		});
	});
	describe('Index Management', () => {
		beforeEach(async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			await service.initialize();
		});
		it('should create index with mapping', async () => {
			mockElasticsearchClient.indices.exists.mockResolvedValue({ body: false });
			mockElasticsearchClient.indices.create.mockResolvedValue({});
			const mapping = {
				properties: {
					title: { type: 'text' },
					content: { type: 'text' },
				},
			};
			await service.createIndex('test_index', mapping);
			expect(mockElasticsearchClient.indices.create).toHaveBeenCalledWith({
				index: 'n8n_test_test_index',
				body: {
					mappings: mapping,
					settings: expect.objectContaining({
						number_of_shards: 1,
						number_of_replicas: 0,
					}),
				},
			});
		});
		it('should skip creating index if it already exists', async () => {
			mockElasticsearchClient.indices.exists.mockResolvedValue({ body: true });
			await service.createIndex('test_index', {});
			expect(mockElasticsearchClient.indices.create).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('Index already exists', {
				index: 'n8n_test_test_index',
			});
		});
		it('should delete index successfully', async () => {
			mockElasticsearchClient.indices.exists.mockResolvedValue({ body: true });
			mockElasticsearchClient.indices.delete.mockResolvedValue({});
			await service.deleteIndex('test_index');
			expect(mockElasticsearchClient.indices.delete).toHaveBeenCalledWith({
				index: 'n8n_test_test_index',
			});
		});
		it('should handle delete index when index does not exist', async () => {
			mockElasticsearchClient.indices.exists.mockResolvedValue({ body: false });
			await service.deleteIndex('test_index');
			expect(mockElasticsearchClient.indices.delete).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('Index does not exist', {
				index: 'n8n_test_test_index',
			});
		});
	});
	describe('Document Operations', () => {
		beforeEach(async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			await service.initialize();
		});
		it('should index a document successfully', async () => {
			mockElasticsearchClient.index.mockResolvedValue({});
			const document = {
				id: 'doc1',
				title: 'Test Document',
				content: 'Test content',
			};
			await service.indexDocument('test_index', document);
			expect(mockElasticsearchClient.index).toHaveBeenCalledWith({
				index: 'n8n_test_test_index',
				id: 'doc1',
				body: document,
			});
		});
		it('should perform bulk indexing successfully', async () => {
			mockElasticsearchClient.bulk.mockResolvedValue({
				body: { errors: false, items: [] },
			});
			const operations = [
				{
					operation: 'index',
					index: 'test_index',
					id: 'doc1',
					document: { title: 'Document 1' },
				},
				{
					operation: 'delete',
					index: 'test_index',
					id: 'doc2',
				},
			];
			await service.bulkIndex(operations);
			expect(mockElasticsearchClient.bulk).toHaveBeenCalledWith({
				body: [
					{ index: { _index: 'n8n_test_test_index', _id: 'doc1' } },
					{ title: 'Document 1' },
					{ delete: { _index: 'n8n_test_test_index', _id: 'doc2' } },
				],
			});
		});
		it('should handle bulk indexing with errors', async () => {
			mockElasticsearchClient.bulk.mockResolvedValue({
				body: {
					errors: true,
					items: [{ index: { error: 'Failed to index' } }],
				},
			});
			const operations = [
				{
					operation: 'index',
					index: 'test_index',
					id: 'doc1',
					document: { title: 'Document 1' },
				},
			];
			await service.bulkIndex(operations);
			expect(mockLogger.warn).toHaveBeenCalledWith('Bulk operation completed with errors', {
				operations: 1,
				errors: [{ index: { error: 'Failed to index' } }],
			});
		});
		it('should delete a document successfully', async () => {
			mockElasticsearchClient.delete.mockResolvedValue({});
			await service.deleteDocument('test_index', 'doc1');
			expect(mockElasticsearchClient.delete).toHaveBeenCalledWith({
				index: 'n8n_test_test_index',
				id: 'doc1',
			});
		});
		it('should handle delete document when document does not exist', async () => {
			const error = new Error('Not found');
			error.statusCode = 404;
			mockElasticsearchClient.delete.mockRejectedValue(error);
			await service.deleteDocument('test_index', 'doc1');
			expect(mockLogger.debug).toHaveBeenCalledWith('Document not found', {
				index: 'n8n_test_test_index',
				id: 'doc1',
			});
		});
	});
	describe('Search Operations', () => {
		beforeEach(async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			await service.initialize();
		});
		it('should perform search successfully', async () => {
			const mockSearchResponse = {
				body: {
					hits: {
						hits: [
							{
								_id: 'doc1',
								_score: 1.5,
								_source: { title: 'Test Document', content: 'Test content' },
								highlight: { title: ['<mark>Test</mark> Document'] },
							},
						],
						total: { value: 1 },
						max_score: 1.5,
					},
				},
			};
			mockElasticsearchClient.search.mockResolvedValue(mockSearchResponse);
			const searchQuery = {
				query: 'test',
				from: 0,
				size: 10,
				highlight: true,
			};
			const result = await service.search('test_index', searchQuery);
			expect(result).toEqual({
				hits: [
					{
						id: 'doc1',
						score: 1.5,
						source: { title: 'Test Document', content: 'Test content' },
						highlight: { title: ['<mark>Test</mark> Document'] },
					},
				],
				total: 1,
				maxScore: 1.5,
				searchTimeMs: expect.any(Number),
				aggregations: undefined,
			});
			expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
				index: 'n8n_test_test_index',
				body: {
					query: {
						bool: {
							must: [
								{
									multi_match: {
										query: 'test',
										fields: ['name^3', 'description^2', 'content', 'tags.name^2', 'nodeTypes'],
										type: 'best_fields',
										fuzziness: 'AUTO',
									},
								},
							],
						},
					},
					from: 0,
					size: 10,
					highlight: {
						fields: {
							name: {},
							description: {},
							content: {},
						},
						pre_tags: ['<mark>'],
						post_tags: ['</mark>'],
					},
				},
			});
		});
		it('should handle empty search query', async () => {
			const mockSearchResponse = {
				body: {
					hits: {
						hits: [],
						total: { value: 0 },
						max_score: null,
					},
				},
			};
			mockElasticsearchClient.search.mockResolvedValue(mockSearchResponse);
			const searchQuery = {
				query: '',
				from: 0,
				size: 10,
			};
			const result = await service.search('test_index', searchQuery);
			expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
				index: 'n8n_test_test_index',
				body: {
					query: { match_all: {} },
					from: 0,
					size: 10,
				},
			});
		});
		it('should apply filters to search query', async () => {
			const mockSearchResponse = {
				body: {
					hits: {
						hits: [],
						total: { value: 0 },
						max_score: null,
					},
				},
			};
			mockElasticsearchClient.search.mockResolvedValue(mockSearchResponse);
			const searchQuery = {
				query: 'test',
				filters: {
					active: true,
					tags: ['tag1', 'tag2'],
				},
				from: 0,
				size: 10,
			};
			await service.search('test_index', searchQuery);
			expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
				index: 'n8n_test_test_index',
				body: {
					query: {
						bool: {
							must: [
								{
									multi_match: {
										query: 'test',
										fields: ['name^3', 'description^2', 'content', 'tags.name^2', 'nodeTypes'],
										type: 'best_fields',
										fuzziness: 'AUTO',
									},
								},
								{ term: { active: true } },
								{ terms: { tags: ['tag1', 'tag2'] } },
							],
						},
					},
					from: 0,
					size: 10,
				},
			});
		});
		it('should handle search errors', async () => {
			mockElasticsearchClient.search.mockRejectedValue(new Error('Search failed'));
			const searchQuery = {
				query: 'test',
				from: 0,
				size: 10,
			};
			await expect(service.search('test_index', searchQuery)).rejects.toThrow(
				n8n_workflow_1.ApplicationError,
			);
		});
	});
	describe('Health Check', () => {
		beforeEach(async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			await service.initialize();
		});
		it('should get cluster health successfully', async () => {
			const mockHealthResponse = {
				body: {
					status: 'green',
					cluster_name: 'test-cluster',
					number_of_nodes: 1,
				},
			};
			mockElasticsearchClient.cluster.health.mockResolvedValue(mockHealthResponse);
			const health = await service.getHealth();
			expect(health).toEqual({
				status: 'green',
				cluster_name: 'test-cluster',
				number_of_nodes: 1,
			});
		});
		it('should return unavailable status when not initialized', async () => {
			const uninitializedService = new search_engine_service_1.SearchEngineService(
				mockLogger,
				mockGlobalConfig,
			);
			const health = await uninitializedService.getHealth();
			expect(health).toEqual({ status: 'unavailable' });
		});
		it('should handle health check errors', async () => {
			mockElasticsearchClient.cluster.health.mockRejectedValue(new Error('Health check failed'));
			const health = await service.getHealth();
			expect(health).toEqual({
				status: 'error',
				error: 'Health check failed',
			});
		});
	});
	describe('Error Handling', () => {
		it('should throw ApplicationError when search engine not available', async () => {
			const uninitializedService = new search_engine_service_1.SearchEngineService(
				mockLogger,
				mockGlobalConfig,
			);
			await expect(uninitializedService.createIndex('test', {})).rejects.toThrow(
				'Search engine is not available',
			);
			await expect(uninitializedService.indexDocument('test', { id: '1' })).rejects.toThrow(
				'Search engine is not available',
			);
			await expect(uninitializedService.search('test', { query: 'test' })).rejects.toThrow(
				'Search engine is not available',
			);
		});
		it('should handle bulk operations with empty array', async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			await service.initialize();
			await service.bulkIndex([]);
			expect(mockElasticsearchClient.bulk).not.toHaveBeenCalled();
		});
	});
	describe('Connection Management', () => {
		it('should close client connection successfully', async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			mockElasticsearchClient.close.mockResolvedValue({});
			await service.initialize();
			await service.close();
			expect(mockElasticsearchClient.close).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('Search engine client closed');
			expect(service.isAvailable()).toBe(false);
		});
		it('should handle close errors gracefully', async () => {
			mockElasticsearchClient.ping.mockResolvedValue({});
			mockElasticsearchClient.close.mockRejectedValue(new Error('Close failed'));
			await service.initialize();
			await service.close();
			expect(mockLogger.error).toHaveBeenCalledWith('Error closing search engine client', {
				error: 'Close failed',
			});
		});
	});
});
//# sourceMappingURL=search-engine.service.test.js.map
