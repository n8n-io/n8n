import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import {
	WorkflowRepository,
	TagRepository,
	SharedWorkflowRepository,
	ExecutionRepository,
} from '@n8n/db';
import type { WorkflowSearchQueryDto } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { WorkflowSearchService } from '@/services/workflow-search.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { ProjectService } from '@/services/project.service.ee';

describe('WorkflowSearchService', () => {
	const logger = mock<Logger>();
	const globalConfig = mock<GlobalConfig>();
	const workflowRepository = mock<WorkflowRepository>();
	const tagRepository = mock<TagRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const executionRepository = mock<ExecutionRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const projectService = mock<ProjectService>();

	let workflowSearchService: WorkflowSearchService;
	let mockUser: User;

	beforeEach(() => {
		jest.clearAllMocks();

		workflowSearchService = new WorkflowSearchService(
			logger,
			globalConfig,
			workflowRepository,
			tagRepository,
			sharedWorkflowRepository,
			executionRepository,
			workflowFinderService,
			projectService,
		);

		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		} as User;
	});

	describe('searchWorkflows', () => {
		it('should return empty results when user has no accessible workflows', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
				query: 'test',
				page: 1,
				limit: 20,
			};

			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([]);

			// Act
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);

			// Assert
			expect(result.results).toHaveLength(0);
			expect(result.pagination.total).toBe(0);
			expect(result.metadata.totalWorkflowsInScope).toBe(0);
		});

		it('should search workflows by name', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
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
			] as WorkflowEntity[];

			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);

			workflowRepository.createQueryBuilder = jest.fn().mockReturnValue({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([mockWorkflows[0]]),
			});

			// Act
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);

			// Assert
			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('Test Workflow 1');
			expect(result.results[0].relevanceScore).toBeGreaterThan(0);
			expect(result.pagination.total).toBe(1);
		});

		it('should apply active filter', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
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
			] as WorkflowEntity[];

			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);

			workflowRepository.createQueryBuilder = jest.fn().mockReturnValue({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockWorkflows),
			});

			// Act
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);

			// Assert
			expect(result.results).toHaveLength(1);
			expect(result.results[0].active).toBe(true);
		});

		it('should apply tags filter', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
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
			] as WorkflowEntity[];

			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);

			workflowRepository.createQueryBuilder = jest.fn().mockReturnValue({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mkReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockWorkflows),
			});

			// Act
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);

			// Assert
			expect(result.results).toHaveLength(1);
			expect(result.results[0].tags).toHaveLength(2);
			expect(result.results[0].tags?.map((t) => t.name)).toEqual(['production', 'automated']);
		});

		it('should include highlights when requested', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
				query: 'test',
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
			] as WorkflowEntity[];

			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				mockWorkflows.map((w) => ({ ...w, projectId: 'project-1' })),
			);

			workflowRepository.createQueryBuilder = jest.fn().mockReturnValue({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(1),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockWorkflows),
			});

			// Act
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);

			// Assert
			expect(result.results).toHaveLength(1);
			expect(result.results[0].highlights).toBeDefined();
			expect(result.results[0].highlights?.name).toContain('<mark>test</mark>');
		});

		it('should handle pagination correctly', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
				page: 2,
				limit: 5,
			};

			workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
				Array.from({ length: 10 }, (_, i) => ({
					id: `workflow-${i}`,
					name: `Workflow ${i}`,
					projectId: 'project-1',
				})) as any[],
			);

			workflowRepository.createQueryBuilder = jest.fn().mockReturnValue({
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(10),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			});

			// Act
			const result = await workflowSearchService.searchWorkflows(searchQuery, mockUser);

			// Assert
			expect(result.pagination.page).toBe(2);
			expect(result.pagination.limit).toBe(5);
			expect(result.pagination.total).toBe(10);
			expect(result.pagination.totalPages).toBe(2);
			expect(result.pagination.hasNext).toBe(false);
			expect(result.pagination.hasPrev).toBe(true);
		});

		it('should handle errors gracefully', async () => {
			// Arrange
			const searchQuery: WorkflowSearchQueryDto = {
				query: 'test',
				page: 1,
				limit: 20,
			};

			workflowFinderService.findAllWorkflowsForUser.mockRejectedValue(
				new Error('Database connection failed'),
			);

			// Act & Assert
			await expect(workflowSearchService.searchWorkflows(searchQuery, mockUser)).rejects.toThrow(
				'Search failed',
			);
		});
	});

	describe('getSearchSuggestions', () => {
		it('should return workflow suggestions', async () => {
			// Arrange
			const request = {
				query: 'test',
				type: 'workflows' as const,
				limit: 5,
			};

			const mockWorkflows = [{ name: 'Test Workflow 1' }, { name: 'Test Workflow 2' }];

			workflowRepository.find.mockResolvedValue(mockWorkflows as WorkflowEntity[]);

			// Act
			const result = await workflowSearchService.getSearchSuggestions(request, mockUser);

			// Assert
			expect(result.suggestions).toHaveLength(2);
			expect(result.suggestions[0].text).toBe('Test Workflow 1');
			expect(result.suggestions[0].type).toBe('workflow');
		});

		it('should return tag suggestions', async () => {
			// Arrange
			const request = {
				query: 'prod',
				type: 'tags' as const,
				limit: 5,
			};

			const mockTags = [{ name: 'production' }, { name: 'product' }];

			tagRepository.find.mockResolvedValue(mockTags as any[]);

			// Act
			const result = await workflowSearchService.getSearchSuggestions(request, mockUser);

			// Assert
			expect(result.suggestions).toHaveLength(2);
			expect(result.suggestions[0].text).toBe('production');
			expect(result.suggestions[0].type).toBe('tag');
		});

		it('should handle suggestion errors gracefully', async () => {
			// Arrange
			const request = {
				query: 'test',
				type: 'workflows' as const,
				limit: 5,
			};

			workflowRepository.find.mockRejectedValue(new Error('Database error'));

			// Act
			const result = await workflowSearchService.getSearchSuggestions(request, mockUser);

			// Assert
			expect(result.suggestions).toHaveLength(0);
			expect(result.query).toBe('test');
			expect(result.type).toBe('workflows');
		});
	});

	describe('relevance scoring', () => {
		it('should score exact name matches highest', () => {
			// This would test the private calculateRelevanceScore method
			// In a real implementation, you might want to expose this for testing
			// or test it indirectly through the search results
		});

		it('should score partial name matches lower than exact matches', () => {
			// Test relevance scoring logic
		});

		it('should give different scores for different match types', () => {
			// Test that name matches score higher than description matches, etc.
		});
	});
});
