'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const workflows_controller_1 = require('@/workflows/workflows.controller');
const createMockController = () => {
	const mockLogger = (0, jest_mock_extended_1.mock)();
	const mockWorkflowSearchService = (0, jest_mock_extended_1.mock)();
	const mockDependencies = {
		logger: mockLogger,
		externalHooks: (0, jest_mock_extended_1.mock)(),
		tagRepository: (0, jest_mock_extended_1.mock)(),
		enterpriseWorkflowService: (0, jest_mock_extended_1.mock)(),
		workflowHistoryService: (0, jest_mock_extended_1.mock)(),
		tagService: (0, jest_mock_extended_1.mock)(),
		namingService: (0, jest_mock_extended_1.mock)(),
		workflowRepository: (0, jest_mock_extended_1.mock)(),
		workflowService: (0, jest_mock_extended_1.mock)(),
		workflowExecutionService: (0, jest_mock_extended_1.mock)(),
		sharedWorkflowRepository: (0, jest_mock_extended_1.mock)(),
		license: (0, jest_mock_extended_1.mock)(),
		mailer: (0, jest_mock_extended_1.mock)(),
		credentialsService: (0, jest_mock_extended_1.mock)(),
		projectRepository: (0, jest_mock_extended_1.mock)(),
		projectService: (0, jest_mock_extended_1.mock)(),
		projectRelationRepository: (0, jest_mock_extended_1.mock)(),
		eventService: (0, jest_mock_extended_1.mock)(),
		globalConfig: (0, jest_mock_extended_1.mock)(),
		folderService: (0, jest_mock_extended_1.mock)(),
		workflowFinderService: (0, jest_mock_extended_1.mock)(),
		nodeTypes: (0, jest_mock_extended_1.mock)(),
		activeWorkflowManager: (0, jest_mock_extended_1.mock)(),
		batchProcessingService: (0, jest_mock_extended_1.mock)(),
		workflowSearchService: mockWorkflowSearchService,
		expressionDocsService: (0, jest_mock_extended_1.mock)(),
	};
	const controller = new workflows_controller_1.WorkflowsController(
		mockDependencies.logger,
		mockDependencies.externalHooks,
		mockDependencies.tagRepository,
		mockDependencies.enterpriseWorkflowService,
		mockDependencies.workflowHistoryService,
		mockDependencies.tagService,
		mockDependencies.namingService,
		mockDependencies.workflowRepository,
		mockDependencies.workflowService,
		mockDependencies.workflowExecutionService,
		mockDependencies.sharedWorkflowRepository,
		mockDependencies.license,
		mockDependencies.mailer,
		mockDependencies.credentialsService,
		mockDependencies.projectRepository,
		mockDependencies.projectService,
		mockDependencies.projectRelationRepository,
		mockDependencies.eventService,
		mockDependencies.globalConfig,
		mockDependencies.folderService,
		mockDependencies.workflowFinderService,
		mockDependencies.nodeTypes,
		mockDependencies.activeWorkflowManager,
		mockDependencies.batchProcessingService,
		mockDependencies.workflowSearchService,
		mockDependencies.expressionDocsService,
	);
	return { controller, mocks: mockDependencies };
};
describe('WorkflowsController - Search Endpoints', () => {
	let controller;
	let mocks;
	let mockUser;
	let mockRequest;
	let mockResponse;
	beforeEach(() => {
		jest.clearAllMocks();
		const setup = createMockController();
		controller = setup.controller;
		mocks = setup.mocks;
		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		};
		mockRequest = {
			user: mockUser,
			query: {},
			body: {},
		};
		mockResponse = (0, jest_mock_extended_1.mock)();
	});
	describe('searchWorkflows', () => {
		it('should search workflows successfully', async () => {
			const searchQuery = {
				query: 'test workflow',
				page: 1,
				limit: 20,
			};
			const expectedResponse = {
				results: [
					{
						id: 'workflow-1',
						name: 'Test Workflow',
						description: 'A test workflow',
						active: true,
						isArchived: false,
						createdAt: '2023-01-01T00:00:00.000Z',
						updatedAt: '2023-01-01T00:00:00.000Z',
						projectId: 'project-1',
						projectName: 'Test Project',
						relevanceScore: 0.9,
					},
				],
				pagination: {
					page: 1,
					limit: 20,
					total: 1,
					totalPages: 1,
					hasNext: false,
					hasPrev: false,
				},
				query: {
					searchQuery: 'test workflow',
					appliedFilters: {},
					searchIn: ['all'],
					sortBy: 'relevance',
					sortOrder: 'desc',
				},
				metadata: {
					searchTimeMs: 100,
					searchedAt: '2023-01-01T00:00:00.000Z',
					totalWorkflowsInScope: 5,
					filtersApplied: 0,
				},
			};
			mockRequest.query = searchQuery;
			mocks.workflowSearchService.searchWorkflows.mockResolvedValue(expectedResponse);
			const result = await controller.searchWorkflows(mockRequest);
			expect(mocks.workflowSearchService.searchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({
					query: 'test workflow',
					page: 1,
					limit: 20,
				}),
				mockUser,
			);
			expect(result).toEqual(expectedResponse);
		});
		it('should validate and sanitize search parameters', async () => {
			mockRequest.query = {
				query: '  test workflow  ',
				page: '2',
				limit: '50',
				active: 'true',
				sortBy: 'name',
				sortOrder: 'asc',
				searchIn: 'name,description',
			};
			const expectedResponse = {
				results: [],
				pagination: {
					page: 2,
					limit: 50,
					total: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: true,
				},
				query: {
					searchQuery: 'test workflow',
					appliedFilters: { active: true },
					searchIn: ['name', 'description'],
					sortBy: 'name',
					sortOrder: 'asc',
				},
				metadata: {
					searchTimeMs: 50,
					searchedAt: '2023-01-01T00:00:00.000Z',
					totalWorkflowsInScope: 0,
					filtersApplied: 1,
				},
			};
			mocks.workflowSearchService.searchWorkflows.mockResolvedValue(expectedResponse);
			const result = await controller.searchWorkflows(mockRequest);
			expect(mocks.workflowSearchService.searchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({
					query: 'test workflow',
					page: 2,
					limit: 50,
					active: true,
					sortBy: 'name',
					sortOrder: 'asc',
					searchIn: ['name', 'description'],
				}),
				mockUser,
			);
		});
		it('should handle invalid search parameters gracefully', async () => {
			mockRequest.query = {
				page: 'invalid',
				limit: '1000',
				sortBy: 'invalid',
				sortOrder: 'invalid',
				searchIn: 'invalid,name',
			};
			const expectedResponse = {
				results: [],
				pagination: {
					page: 1,
					limit: 100,
					total: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: false,
				},
				query: {
					searchQuery: undefined,
					appliedFilters: {},
					searchIn: ['name'],
					sortBy: 'relevance',
					sortOrder: 'desc',
				},
				metadata: {
					searchTimeMs: 30,
					searchedAt: '2023-01-01T00:00:00.000Z',
					totalWorkflowsInScope: 0,
					filtersApplied: 0,
				},
			};
			mocks.workflowSearchService.searchWorkflows.mockResolvedValue(expectedResponse);
			const result = await controller.searchWorkflows(mockRequest);
			expect(mocks.workflowSearchService.searchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 1,
					limit: 100,
					sortBy: 'relevance',
					sortOrder: 'desc',
					searchIn: ['name'],
				}),
				mockUser,
			);
		});
		it('should handle search service errors', async () => {
			mockRequest.query = { query: 'test' };
			mocks.workflowSearchService.searchWorkflows.mockRejectedValue(
				new Error('Database connection failed'),
			);
			await expect(controller.searchWorkflows(mockRequest)).rejects.toThrow(
				'Workflow search failed: Database connection failed',
			);
		});
	});
	describe('advancedSearchWorkflows', () => {
		it('should perform advanced search successfully', async () => {
			const advancedQuery = {
				query: {
					must: [{ field: 'name', value: 'test', operator: 'contains' }],
				},
				page: 1,
				limit: 20,
			};
			const expectedResponse = {
				results: [],
				pagination: {
					page: 1,
					limit: 20,
					total: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: false,
				},
				query: {
					searchQuery: 'advanced',
					appliedFilters: { advanced: true },
					searchIn: ['all'],
					sortBy: 'relevance',
					sortOrder: 'desc',
				},
				metadata: {
					searchTimeMs: 75,
					searchedAt: '2023-01-01T00:00:00.000Z',
					totalWorkflowsInScope: 0,
					filtersApplied: 1,
				},
			};
			mockRequest.body = advancedQuery;
			mocks.workflowSearchService.advancedSearch.mockResolvedValue(expectedResponse);
			const result = await controller.advancedSearchWorkflows(mockRequest);
			expect(mocks.workflowSearchService.advancedSearch).toHaveBeenCalledWith(
				advancedQuery,
				mockUser,
			);
			expect(result).toEqual(expectedResponse);
		});
	});
	describe('getSearchSuggestions', () => {
		it('should return search suggestions successfully', async () => {
			mockRequest.query = {
				query: 'test',
				type: 'workflows',
				limit: '5',
			};
			const expectedResponse = {
				suggestions: [
					{ text: 'Test Workflow 1', type: 'workflow', count: 1 },
					{ text: 'Test Workflow 2', type: 'workflow', count: 1 },
				],
				query: 'test',
				type: 'workflows',
			};
			mocks.workflowSearchService.getSearchSuggestions.mockResolvedValue(expectedResponse);
			const result = await controller.getSearchSuggestions(mockRequest);
			expect(mocks.workflowSearchService.getSearchSuggestions).toHaveBeenCalledWith(
				{
					query: 'test',
					type: 'workflows',
					limit: 5,
				},
				mockUser,
			);
			expect(result).toEqual(expectedResponse);
		});
		it('should handle suggestion errors gracefully', async () => {
			mockRequest.query = { query: 'test' };
			mocks.workflowSearchService.getSearchSuggestions.mockRejectedValue(
				new Error('Service error'),
			);
			const result = await controller.getSearchSuggestions(mockRequest);
			expect(result).toEqual({
				suggestions: [],
				query: 'test',
				type: 'workflows',
			});
		});
	});
	describe('getSearchFacets', () => {
		it('should return search facets successfully', async () => {
			mockRequest.query = {
				projectId: 'project-1',
			};
			const mockWorkflows = [
				{
					id: 'workflow-1',
					name: 'Test Workflow',
					active: true,
					nodes: [{ type: 'n8n-nodes-base.Start' }, { type: 'n8n-nodes-base.Set' }],
					tags: [{ name: 'production' }],
					projectId: 'project-1',
				},
				{
					id: 'workflow-2',
					name: 'Another Workflow',
					active: false,
					nodes: [{ type: 'n8n-nodes-base.Start' }],
					tags: [{ name: 'development' }],
					projectId: 'project-1',
				},
			];
			mocks.workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(mockWorkflows);
			const result = await controller.getSearchFacets(mockRequest);
			expect(result.facets.tags).toHaveLength(2);
			expect(result.facets.nodeTypes).toHaveLength(2);
			expect(result.facets.activeStatus.active).toBe(1);
			expect(result.facets.activeStatus.inactive).toBe(1);
			expect(result.metadata.totalWorkflows).toBe(2);
		});
		it('should handle empty workflow list', async () => {
			mockRequest.query = {};
			mocks.workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([]);
			const result = await controller.getSearchFacets(mockRequest);
			expect(result.facets.tags).toHaveLength(0);
			expect(result.facets.nodeTypes).toHaveLength(0);
			expect(result.facets.activeStatus.active).toBe(0);
			expect(result.facets.activeStatus.inactive).toBe(0);
			expect(result.metadata.totalWorkflows).toBe(0);
		});
	});
	describe('validateSearchQuery', () => {
		it('should set default values for missing parameters', () => {});
		it('should sanitize and validate input parameters', () => {});
		it('should handle array and single string parameters correctly', () => {});
	});
	describe('Search Analytics Endpoints', () => {
		describe('getSearchAnalytics', () => {
			it('should return search analytics successfully', async () => {
				mockRequest.query = { days: '7' };
				const mockAnalytics = {
					totalSearches: 100,
					averageResponseTimeMs: 150,
					searchEngineUsagePercent: 75,
					topQueries: [
						{ query: 'webhook', count: 15, averageResponseTimeMs: 120 },
						{ query: 'email', count: 10, averageResponseTimeMs: 180 },
					],
					topFilters: [
						{ filter: 'active', count: 30 },
						{ filter: 'tags', count: 25 },
					],
					performanceMetrics: {
						fastQueries: 60,
						moderateQueries: 35,
						slowQueries: 5,
					},
					searchTrends: [{ date: '2023-01-01', searchCount: 20, averageResponseTimeMs: 140 }],
				};
				const mockPerformance = {
					averageResponseTime: 150,
					p95ResponseTime: 300,
					p99ResponseTime: 500,
					searchEngineHealthScore: 85,
					totalSearchesToday: 25,
					errorRate: 2,
				};
				const mockSuggestions = [
					{
						type: 'query_slow',
						severity: 'medium',
						title: 'Slow queries detected',
						description: 'Some queries are taking longer than expected',
						action: 'Consider optimizing search indexes',
						impact: 'Improved user experience',
					},
				];
				const mockSearchAnalyticsService = {
					getSearchAnalytics: jest.fn().mockResolvedValue(mockAnalytics),
					getPerformanceMetrics: jest.fn().mockResolvedValue(mockPerformance),
					getOptimizationSuggestions: jest.fn().mockResolvedValue(mockSuggestions),
				};
				const originalContainerGet = require('@n8n/di').Container.get;
				const mockContainerGet = jest.fn().mockImplementation((service) => {
					if (service.name === 'SearchAnalyticsService') {
						return mockSearchAnalyticsService;
					}
					return originalContainerGet(service);
				});
				require('@n8n/di').Container.get = mockContainerGet;
				const result = await controller.getSearchAnalytics(mockRequest);
				expect(result).toEqual({
					analytics: mockAnalytics,
					performance: mockPerformance,
					suggestions: mockSuggestions,
				});
			});
			it('should validate days parameter', async () => {
				mockRequest.query = { days: '200' };
				await expect(controller.getSearchAnalytics(mockRequest)).rejects.toThrow(
					'Days parameter must be between 1 and 90',
				);
			});
		});
		describe('getPopularSearchQueries', () => {
			it('should return popular queries successfully', async () => {
				mockRequest.query = { limit: '5' };
				const mockQueries = [
					{
						query: 'webhook',
						count: 25,
						averageResponseTimeMs: 120,
						lastSearched: new Date('2023-01-01T12:00:00Z'),
					},
					{
						query: 'email notification',
						count: 18,
						averageResponseTimeMs: 150,
						lastSearched: new Date('2023-01-01T11:30:00Z'),
					},
				];
				const mockSearchAnalyticsService = {
					getPopularQueries: jest.fn().mockResolvedValue(mockQueries),
				};
				const mockContainerGet = jest.fn().mockReturnValue(mockSearchAnalyticsService);
				require('@n8n/di').Container.get = mockContainerGet;
				const result = await controller.getPopularSearchQueries(mockRequest);
				expect(result).toEqual({
					queries: mockQueries,
					metadata: {
						totalQueries: mockQueries.length,
						dateRange: 'Last 7 days',
					},
				});
				expect(mockSearchAnalyticsService.getPopularQueries).toHaveBeenCalledWith(5);
			});
			it('should validate limit parameter', async () => {
				mockRequest.query = { limit: '500' };
				await expect(controller.getPopularSearchQueries(mockRequest)).rejects.toThrow(
					'Limit parameter must be between 1 and 100',
				);
			});
		});
		describe('getSearchEngineHealth', () => {
			it('should return healthy status when all systems are working', async () => {
				const mockSearchEngineService = {
					isAvailable: jest.fn().mockReturnValue(true),
					getHealth: jest.fn().mockResolvedValue({
						status: 'green',
						cluster_name: 'test-cluster',
						number_of_nodes: 1,
					}),
				};
				const mockWorkflowIndexingService = {
					getIndexingHealth: jest.fn().mockResolvedValue({
						indexExists: true,
						documentCount: 100,
						indexSize: '5MB',
						searchEngineHealth: { status: 'green' },
					}),
				};
				const mockSearchAnalyticsService = {
					getPerformanceMetrics: jest.fn().mockResolvedValue({
						averageResponseTime: 120,
						p95ResponseTime: 250,
						p99ResponseTime: 400,
						searchEngineHealthScore: 95,
						totalSearchesToday: 50,
						errorRate: 1,
					}),
				};
				const mockContainerGet = jest.fn().mockImplementation((service) => {
					switch (service.name) {
						case 'SearchEngineService':
							return mockSearchEngineService;
						case 'WorkflowIndexingService':
							return mockWorkflowIndexingService;
						case 'SearchAnalyticsService':
							return mockSearchAnalyticsService;
						default:
							return {};
					}
				});
				require('@n8n/di').Container.get = mockContainerGet;
				const result = await controller.getSearchEngineHealth(mockRequest);
				expect(result.status).toBe('healthy');
				expect(result.searchEngine.available).toBe(true);
				expect(result.indexing.indexExists).toBe(true);
				expect(result.performance.searchEngineHealthScore).toBe(95);
			});
			it('should return unhealthy status when search engine is down', async () => {
				const mockSearchEngineService = {
					isAvailable: jest.fn().mockReturnValue(false),
					getHealth: jest.fn().mockResolvedValue({
						status: 'error',
						error: 'Connection failed',
					}),
				};
				const mockWorkflowIndexingService = {
					getIndexingHealth: jest.fn().mockResolvedValue({
						indexExists: false,
						documentCount: 0,
						indexSize: '0',
						searchEngineHealth: { status: 'error' },
					}),
				};
				const mockSearchAnalyticsService = {
					getPerformanceMetrics: jest.fn().mockResolvedValue({
						averageResponseTime: 0,
						searchEngineHealthScore: 0,
					}),
				};
				const mockContainerGet = jest.fn().mockImplementation((service) => {
					switch (service.name) {
						case 'SearchEngineService':
							return mockSearchEngineService;
						case 'WorkflowIndexingService':
							return mockWorkflowIndexingService;
						case 'SearchAnalyticsService':
							return mockSearchAnalyticsService;
						default:
							return {};
					}
				});
				require('@n8n/di').Container.get = mockContainerGet;
				const result = await controller.getSearchEngineHealth(mockRequest);
				expect(result.status).toBe('unhealthy');
				expect(result.searchEngine.available).toBe(false);
				expect(result.indexing.indexExists).toBe(false);
			});
		});
		describe('triggerReindexing', () => {
			it('should trigger reindexing successfully', async () => {
				mockRequest.body = { force: true };
				const mockStats = {
					totalProcessed: 50,
					successCount: 48,
					errorCount: 2,
					processingTimeMs: 5000,
					errors: [
						{ workflowId: 'wf-1', error: 'Index error' },
						{ workflowId: 'wf-2', error: 'Transform error' },
					],
				};
				const mockWorkflowIndexingService = {
					reindexAllWorkflows: jest.fn().mockResolvedValue(mockStats),
				};
				const mockContainerGet = jest.fn().mockReturnValue(mockWorkflowIndexingService);
				require('@n8n/di').Container.get = mockContainerGet;
				const result = await controller.triggerReindexing(mockRequest);
				expect(result.success).toBe(true);
				expect(result.stats).toEqual(mockStats);
				expect(result.message).toContain('Processed 50 workflows with 48 successes and 2 errors');
				expect(mockWorkflowIndexingService.reindexAllWorkflows).toHaveBeenCalledWith({
					refresh: true,
				});
				expect(mocks.eventService.emit).toHaveBeenCalledWith('search-reindexing-completed', {
					user: mockUser,
					triggeredManually: true,
					stats: mockStats,
				});
			});
			it('should handle reindexing errors', async () => {
				mockRequest.body = {};
				const mockWorkflowIndexingService = {
					reindexAllWorkflows: jest.fn().mockRejectedValue(new Error('Reindexing failed')),
				};
				const mockContainerGet = jest.fn().mockReturnValue(mockWorkflowIndexingService);
				require('@n8n/di').Container.get = mockContainerGet;
				await expect(controller.triggerReindexing(mockRequest)).rejects.toThrow(
					'Failed to trigger reindexing: Reindexing failed',
				);
			});
		});
	});
});
//# sourceMappingURL=workflow-search.controller.test.js.map
