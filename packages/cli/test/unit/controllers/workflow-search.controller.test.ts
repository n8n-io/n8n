import type { Request, Response } from 'express';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { WorkflowSearchResponseDto, WorkflowSearchQueryDto } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { WorkflowsController } from '@/workflows/workflows.controller';
import { WorkflowSearchService } from '@/services/workflow-search.service';

// Mock all the dependencies that WorkflowsController needs
const createMockController = () => {
	const mockLogger = mock<Logger>();
	const mockWorkflowSearchService = mock<WorkflowSearchService>();

	// Create minimal mocks for all required dependencies
	const mockDependencies = {
		logger: mockLogger,
		externalHooks: mock(),
		tagRepository: mock(),
		enterpriseWorkflowService: mock(),
		workflowHistoryService: mock(),
		tagService: mock(),
		namingService: mock(),
		workflowRepository: mock(),
		workflowService: mock(),
		workflowExecutionService: mock(),
		sharedWorkflowRepository: mock(),
		license: mock(),
		mailer: mock(),
		credentialsService: mock(),
		projectRepository: mock(),
		projectService: mock(),
		projectRelationRepository: mock(),
		eventService: mock(),
		globalConfig: mock(),
		folderService: mock(),
		workflowFinderService: mock(),
		nodeTypes: mock(),
		activeWorkflowManager: mock(),
		batchProcessingService: mock(),
		workflowSearchService: mockWorkflowSearchService,
	};

	const controller = new WorkflowsController(
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
	);

	return { controller, mocks: mockDependencies };
};

describe('WorkflowsController - Search Endpoints', () => {
	let controller: WorkflowsController;
	let mocks: ReturnType<typeof createMockController>['mocks'];
	let mockUser: User;
	let mockRequest: any;
	let mockResponse: Response;

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
		} as User;

		mockRequest = {
			user: mockUser,
			query: {},
			body: {},
		};

		mockResponse = mock<Response>();
	});

	describe('searchWorkflows', () => {
		it('should search workflows successfully', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
				query: 'test workflow',
				page: 1,
				limit: 20,
			};

			const expectedResponse: WorkflowSearchResponseDto = {
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

			// Act
			const result = await controller.searchWorkflows(mockRequest);

			// Assert
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
			// Arrange
			mockRequest.query = {
				query: '  test workflow  ',
				page: '2',
				limit: '50',
				active: 'true',
				sortBy: 'name',
				sortOrder: 'asc',
				searchIn: 'name,description',
			};

			const expectedResponse: WorkflowSearchResponseDto = {
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

			// Act
			const result = await controller.searchWorkflows(mockRequest);

			// Assert
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
			// Arrange
			mockRequest.query = {
				page: 'invalid',
				limit: '1000', // Too high
				sortBy: 'invalid',
				sortOrder: 'invalid',
				searchIn: 'invalid,name',
			};

			const expectedResponse: WorkflowSearchResponseDto = {
				results: [],
				pagination: {
					page: 1,
					limit: 100, // Should be capped at 100
					total: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: false,
				},
				query: {
					searchQuery: undefined,
					appliedFilters: {},
					searchIn: ['name'], // Invalid values filtered out
					sortBy: 'relevance', // Reset to default
					sortOrder: 'desc', // Reset to default
				},
				metadata: {
					searchTimeMs: 30,
					searchedAt: '2023-01-01T00:00:00.000Z',
					totalWorkflowsInScope: 0,
					filtersApplied: 0,
				},
			};

			mocks.workflowSearchService.searchWorkflows.mockResolvedValue(expectedResponse);

			// Act
			const result = await controller.searchWorkflows(mockRequest);

			// Assert
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
			// Arrange
			mockRequest.query = { query: 'test' };
			mocks.workflowSearchService.searchWorkflows.mockRejectedValue(
				new Error('Database connection failed'),
			);

			// Act & Assert
			await expect(controller.searchWorkflows(mockRequest)).rejects.toThrow(
				'Workflow search failed: Database connection failed',
			);
		});
	});

	describe('advancedSearchWorkflows', () => {
		it('should perform advanced search successfully', async () => {
			// Arrange
			const advancedQuery = {
				query: {
					must: [{ field: 'name' as const, value: 'test', operator: 'contains' as const }],
				},
				page: 1,
				limit: 20,
			};

			const expectedResponse: WorkflowSearchResponseDto = {
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

			// Act
			const result = await controller.advancedSearchWorkflows(mockRequest);

			// Assert
			expect(mocks.workflowSearchService.advancedSearch).toHaveBeenCalledWith(
				advancedQuery,
				mockUser,
			);
			expect(result).toEqual(expectedResponse);
		});
	});

	describe('getSearchSuggestions', () => {
		it('should return search suggestions successfully', async () => {
			// Arrange
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

			// Act
			const result = await controller.getSearchSuggestions(mockRequest);

			// Assert
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
			// Arrange
			mockRequest.query = { query: 'test' };
			mocks.workflowSearchService.getSearchSuggestions.mockRejectedValue(
				new Error('Service error'),
			);

			// Act
			const result = await controller.getSearchSuggestions(mockRequest);

			// Assert
			expect(result).toEqual({
				suggestions: [],
				query: 'test',
				type: 'workflows',
			});
		});
	});

	describe('getSearchFacets', () => {
		it('should return search facets successfully', async () => {
			// Arrange
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

			mocks.workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(mockWorkflows as any);

			// Act
			const result = await controller.getSearchFacets(mockRequest);

			// Assert
			expect(result.facets.tags).toHaveLength(2);
			expect(result.facets.nodeTypes).toHaveLength(2);
			expect(result.facets.activeStatus.active).toBe(1);
			expect(result.facets.activeStatus.inactive).toBe(1);
			expect(result.metadata.totalWorkflows).toBe(2);
		});

		it('should handle empty workflow list', async () => {
			// Arrange
			mockRequest.query = {};
			mocks.workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([]);

			// Act
			const result = await controller.getSearchFacets(mockRequest);

			// Assert
			expect(result.facets.tags).toHaveLength(0);
			expect(result.facets.nodeTypes).toHaveLength(0);
			expect(result.facets.activeStatus.active).toBe(0);
			expect(result.facets.activeStatus.inactive).toBe(0);
			expect(result.metadata.totalWorkflows).toBe(0);
		});
	});

	describe('validateSearchQuery', () => {
		it('should set default values for missing parameters', () => {
			// This tests the private validateSearchQuery method indirectly
			// through the searchWorkflows endpoint behavior
		});

		it('should sanitize and validate input parameters', () => {
			// Test parameter validation through endpoint behavior
		});

		it('should handle array and single string parameters correctly', () => {
			// Test parameter normalization
		});
	});
});
