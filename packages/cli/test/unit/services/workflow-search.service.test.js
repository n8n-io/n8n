'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const workflow_search_service_1 = require('@/services/workflow-search.service');
describe('WorkflowSearchService', () => {
	const logger = (0, jest_mock_extended_1.mock)();
	const globalConfig = (0, jest_mock_extended_1.mock)();
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const tagRepository = (0, jest_mock_extended_1.mock)();
	const sharedWorkflowRepository = (0, jest_mock_extended_1.mock)();
	const executionRepository = (0, jest_mock_extended_1.mock)();
	const workflowFinderService = (0, jest_mock_extended_1.mock)();
	const projectService = (0, jest_mock_extended_1.mock)();
	const searchEngineService = (0, jest_mock_extended_1.mock)();
	const workflowIndexingService = (0, jest_mock_extended_1.mock)();
	let workflowSearchService;
	let mockUser;
	beforeEach(() => {
		jest.clearAllMocks();
		searchEngineService.isAvailable.mockReturnValue(false);
		workflowSearchService = new workflow_search_service_1.WorkflowSearchService(
			logger,
			globalConfig,
			workflowRepository,
			tagRepository,
			sharedWorkflowRepository,
			executionRepository,
			workflowFinderService,
			projectService,
			searchEngineService,
			workflowIndexingService,
		);
		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		};
	});
	describe('searchWorkflows', () => {
		it('should return empty results when user has no accessible workflows', async () => {
			const searchQuery = {
				query: 'test',
				page: 1,
				limit: 20,
			};
			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([]);
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);
			expect(result.results).toHaveLength(0);
			expect(result.pagination.total).toBe(0);
			expect(result.metadata.totalWorkflowsInScope).toBe(0);
		});
		it('should search workflows by name', async () => {
			const searchQuery = {
				query: 'test workflow',
				searchIn: ['name'],
				page: 1,
				limit: 20,
			};
			const mockWorkflows = [
				{
					id: 'workflow-1',
					name: 'Test Workflow 1',
					description: 'A test workflow',
					active: true,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [{ type: 'n8n-nodes-base.Start', name: 'Start' }],
					connections: {},
					tags: [],
				},
				{
					id: 'workflow-2',
					name: 'Another Workflow',
					description: 'Another test workflow',
					active: false,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [{ type: 'n8n-nodes-base.Start', name: 'Start' }],
					connections: {},
					tags: [],
				},
			];
			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);
			workflowRepository.createQueryBuilder.mockImplementation(() => ({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([mockWorkflows[0]]),
			}));
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('Test Workflow 1');
			expect(result.results[0].relevanceScore).toBeGreaterThan(0);
			expect(result.pagination.total).toBe(1);
		});
		it('should apply active filter', async () => {
			const searchQuery = {
				active: true,
				page: 1,
				limit: 20,
			};
			const mockWorkflows = [
				{
					id: 'workflow-1',
					name: 'Active Workflow',
					active: true,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [],
					connections: {},
					tags: [],
				},
			];
			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);
			workflowRepository.createQueryBuilder.mockImplementation(() => ({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockWorkflows),
			}));
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].active).toBe(true);
		});
		it('should apply tags filter', async () => {
			const searchQuery = {
				searchIn: ['all'],
				fuzzySearch: false,
				caseSensitive: false,
				exactMatch: false,
				sortBy: 'relevance',
				sortOrder: 'desc',
				includeContent: false,
				includeStats: false,
				includeHighlights: true,
				tags: ['production', 'automated'],
				page: 1,
				limit: 20,
			};
			const mockTags = [
				{ id: 'tag-1', name: 'production' },
				{ id: 'tag-2', name: 'automated' },
			];
			const mockWorkflows = [
				{
					id: 'workflow-1',
					name: 'Tagged Workflow',
					active: true,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [],
					connections: {},
					tags: mockTags,
				},
			];
			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);
			workflowRepository.createQueryBuilder.mockImplementation(() => ({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockWorkflows),
			}));
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].tags).toHaveLength(2);
			expect(result.results[0].tags?.map((t) => t.name)).toEqual(['production', 'automated']);
		});
		it('should include highlights when requested', async () => {
			const searchQuery = {
				query: 'test',
				searchIn: ['all'],
				fuzzySearch: false,
				caseSensitive: false,
				exactMatch: false,
				sortBy: 'relevance',
				sortOrder: 'desc',
				includeContent: false,
				includeStats: false,
				includeHighlights: true,
				page: 1,
				limit: 20,
			};
			const mockWorkflows = [
				{
					id: 'workflow-1',
					name: 'Test Workflow',
					description: 'A test description',
					active: true,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [],
					connections: {},
					tags: [],
				},
			];
			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);
			workflowRepository.createQueryBuilder.mockImplementation(() => ({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockWorkflows),
			}));
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].highlights).toBeDefined();
			expect(result.results[0].highlights?.name).toContain('<mark>Test</mark>');
		});
		it('should handle pagination correctly', async () => {
			const searchQuery = {
				searchIn: ['all'],
				fuzzySearch: false,
				caseSensitive: false,
				exactMatch: false,
				sortBy: 'relevance',
				sortOrder: 'desc',
				includeContent: false,
				includeStats: false,
				includeHighlights: true,
				page: 2,
				limit: 5,
			};
			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				Array.from({ length: 10 }, (_, i) => ({
					id: `workflow-${i}`,
					name: `Workflow ${i}`,
					projectId: 'project-1',
				})),
			);
			workflowRepository.createQueryBuilder.mockImplementation(() => ({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(10),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			}));
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);
			expect(result.pagination.page).toBe(2);
			expect(result.pagination.limit).toBe(5);
			expect(result.pagination.total).toBe(10);
			expect(result.pagination.totalPages).toBe(2);
			expect(result.pagination.hasNext).toBe(false);
			expect(result.pagination.hasPrev).toBe(true);
		});
		it('should handle errors gracefully', async () => {
			const searchQuery = {
				query: 'test',
				searchIn: ['all'],
				fuzzySearch: false,
				caseSensitive: false,
				exactMatch: false,
				sortBy: 'relevance',
				sortOrder: 'desc',
				includeContent: false,
				includeStats: false,
				includeHighlights: true,
				page: 1,
				limit: 20,
			};
			workflowFinderService.findAllWorkflowsForUser.mockRejectedValue(
				new Error('Database connection failed'),
			);
			await expect(workflowSearchService.searchWorkflows(searchQuery, mockUser)).rejects.toThrow(
				'Search failed',
			);
		});
	});
	describe('getSearchSuggestions', () => {
		it('should return workflow suggestions', async () => {
			const request = {
				query: 'test',
				type: 'workflows',
				limit: 5,
			};
			const mockWorkflows = [{ name: 'Test Workflow 1' }, { name: 'Test Workflow 2' }];
			workflowRepository.find.mockResolvedValue(mockWorkflows);
			const result = await workflowSearchService.getSearchSuggestions(request, mockUser);
			expect(result.suggestions).toHaveLength(2);
			expect(result.suggestions[0].text).toBe('Test Workflow 1');
			expect(result.suggestions[0].type).toBe('workflow');
		});
		it('should return tag suggestions', async () => {
			const request = {
				query: 'prod',
				type: 'tags',
				limit: 5,
			};
			const mockTags = [{ name: 'production' }, { name: 'product' }];
			tagRepository.find.mockResolvedValue(mockTags);
			const result = await workflowSearchService.getSearchSuggestions(request, mockUser);
			expect(result.suggestions).toHaveLength(2);
			expect(result.suggestions[0].text).toBe('production');
			expect(result.suggestions[0].type).toBe('tag');
		});
		it('should handle suggestion errors gracefully', async () => {
			const request = {
				query: 'test',
				type: 'workflows',
				limit: 5,
			};
			workflowRepository.find.mockRejectedValue(new Error('Database error'));
			const result = await workflowSearchService.getSearchSuggestions(request, mockUser);
			expect(result.suggestions).toHaveLength(0);
			expect(result.query).toBe('test');
			expect(result.type).toBe('workflows');
		});
	});
	describe('relevance scoring', () => {
		it('should score exact name matches highest', () => {});
		it('should score partial name matches lower than exact matches', () => {});
		it('should give different scores for different match types', () => {});
	});
});
//# sourceMappingURL=workflow-search.service.test.js.map
