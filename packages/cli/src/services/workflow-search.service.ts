import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import {
	WorkflowRepository,
	TagRepository,
	SharedWorkflowRepository,
	ExecutionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import { In, Like, ILike, Between, MoreThan, LessThan, IsNull, Not } from '@n8n/typeorm';
import type {
	WorkflowSearchQueryDto,
	WorkflowSearchResponseDto,
	WorkflowSearchResultItemDto,
	AdvancedWorkflowSearchDto,
	WorkflowSearchSuggestionsDto,
	WorkflowSearchSuggestionsResponseDto,
} from '@n8n/api-types';
import { ApplicationError } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { ProjectService } from '@/services/project.service.ee';
import { SearchEngineService, type SearchQuery } from './search-engine.service';
import { WorkflowIndexingService, type WorkflowSearchDocument } from './workflow-indexing.service';

interface SearchContext {
	user: User;
	userWorkflowIds: string[];
	startTime: number;
}

interface SearchFilters {
	where: FindOptionsWhere<WorkflowEntity>[];
	joins: string[];
	parameters: Record<string, any>;
}

@Service()
export class WorkflowSearchService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly tagRepository: TagRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly projectService: ProjectService,
		private readonly searchEngineService: SearchEngineService,
		private readonly workflowIndexingService: WorkflowIndexingService,
	) {}

	/**
	 * Perform comprehensive workflow search with full-text and metadata filtering
	 */
	async searchWorkflows(
		searchQuery: WorkflowSearchQueryDto,
		user: User,
	): Promise<WorkflowSearchResponseDto> {
		const startTime = Date.now();

		this.logger.debug('Workflow search requested', {
			userId: user.id,
			query: searchQuery.query,
			searchIn: searchQuery.searchIn,
			searchMethod: this.searchEngineService.isAvailable() ? 'search_engine' : 'database',
			filters: Object.keys(searchQuery).filter(
				(k) => searchQuery[k as keyof WorkflowSearchQueryDto] !== undefined,
			),
		});

		try {
			// Get workflows user has access to
			const userWorkflowIds = await this.getUserAccessibleWorkflowIds(user, searchQuery.projectId);

			if (userWorkflowIds.length === 0) {
				return this.createEmptyResponse(searchQuery, startTime, 0);
			}

			const context: SearchContext = {
				user,
				userWorkflowIds,
				startTime,
			};

			let response: WorkflowSearchResponseDto;

			// Use search engine if available and query has text search
			if (this.searchEngineService.isAvailable() && this.shouldUseSearchEngine(searchQuery)) {
				response = await this.executeSearchEngineQuery(searchQuery, context);
			} else {
				// Fallback to database search
				response = await this.executeDatabaseSearch(searchQuery, context);
			}

			this.logger.debug('Workflow search completed', {
				userId: user.id,
				resultsCount: response.results.length,
				totalCount: response.pagination.total,
				searchTimeMs: response.metadata.searchTimeMs,
				method:
					this.searchEngineService.isAvailable() && this.shouldUseSearchEngine(searchQuery)
						? 'search_engine'
						: 'database',
			});

			return response;
		} catch (error) {
			this.logger.error('Workflow search failed', {
				userId: user.id,
				query: searchQuery.query,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError('Search failed', {
				cause: error,
				extra: { userId: user.id, query: searchQuery.query },
			});
		}
	}

	/**
	 * Perform advanced workflow search with complex boolean queries
	 */
	async advancedSearch(
		searchQuery: AdvancedWorkflowSearchDto,
		user: User,
	): Promise<WorkflowSearchResponseDto> {
		const startTime = Date.now();

		this.logger.debug('Advanced workflow search requested', {
			userId: user.id,
			queryStructure: {
				mustClauses: searchQuery.query?.must?.length || 0,
				shouldClauses: searchQuery.query?.should?.length || 0,
				mustNotClauses: searchQuery.query?.mustNot?.length || 0,
			},
		});

		try {
			// Get accessible workflows
			const userWorkflowIds = await this.getUserAccessibleWorkflowIds(user);

			if (userWorkflowIds.length === 0) {
				return this.createEmptyResponse(
					this.convertAdvancedToBasicQuery(searchQuery),
					startTime,
					0,
				);
			}

			const context: SearchContext = {
				user,
				userWorkflowIds,
				startTime,
			};

			// Build advanced search filters
			const filters = await this.buildAdvancedSearchFilters(searchQuery, context);

			// Execute search
			const { workflows, totalCount } = await this.executeAdvancedSearch(
				filters,
				searchQuery,
				context,
			);

			// Process results
			const processedResults = await this.processAdvancedSearchResults(
				workflows,
				searchQuery,
				context,
			);

			// Calculate pagination
			const pagination = this.calculatePagination(
				searchQuery.page || 1,
				searchQuery.limit || 20,
				totalCount,
			);

			const response: WorkflowSearchResponseDto = {
				results: processedResults,
				pagination,
				query: {
					searchQuery: 'advanced',
					appliedFilters: { advanced: true, ...searchQuery.filters },
					searchIn: ['all'],
					sortBy: searchQuery.sort?.[0]?.field || 'relevance',
					sortOrder: searchQuery.sort?.[0]?.order || 'desc',
				},
				metadata: {
					searchTimeMs: Date.now() - startTime,
					searchedAt: new Date().toISOString(),
					totalWorkflowsInScope: userWorkflowIds.length,
					filtersApplied: this.countAdvancedFilters(searchQuery),
				},
				facets: searchQuery.include?.facets
					? await this.generateFacets(
							userWorkflowIds,
							this.convertAdvancedToBasicQuery(searchQuery),
						)
					: undefined,
			};

			this.logger.debug('Advanced workflow search completed', {
				userId: user.id,
				resultsCount: processedResults.length,
				totalCount,
				searchTimeMs: response.metadata.searchTimeMs,
			});

			return response;
		} catch (error) {
			this.logger.error('Advanced workflow search failed', {
				userId: user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new ApplicationError('Advanced search failed', {
				cause: error,
				extra: { userId: user.id },
			});
		}
	}

	/**
	 * Get search suggestions for autocomplete
	 */
	async getSearchSuggestions(
		request: WorkflowSearchSuggestionsDto,
		user: User,
	): Promise<WorkflowSearchSuggestionsResponseDto> {
		this.logger.debug('Search suggestions requested', {
			userId: user.id,
			query: request.query,
			type: request.type,
		});

		try {
			const suggestions = [];

			switch (request.type) {
				case 'workflows':
					suggestions.push(
						...(await this.getWorkflowSuggestions(request.query, user, request.limit)),
					);
					break;
				case 'tags':
					suggestions.push(...(await this.getTagSuggestions(request.query, user, request.limit)));
					break;
				case 'nodeTypes':
					suggestions.push(
						...(await this.getNodeTypeSuggestions(request.query, user, request.limit)),
					);
					break;
				case 'users':
					suggestions.push(...(await this.getUserSuggestions(request.query, user, request.limit)));
					break;
				default:
					// Return mixed suggestions
					suggestions.push(
						...(await this.getWorkflowSuggestions(
							request.query,
							user,
							Math.ceil(request.limit / 2),
						)),
						...(await this.getTagSuggestions(request.query, user, Math.floor(request.limit / 2))),
					);
					break;
			}

			return {
				suggestions: suggestions.slice(0, request.limit),
				query: request.query,
				type: request.type,
			};
		} catch (error) {
			this.logger.error('Search suggestions failed', {
				userId: user.id,
				query: request.query,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				suggestions: [],
				query: request.query,
				type: request.type,
			};
		}
	}

	/**
	 * Determine if search engine should be used for this query
	 */
	private shouldUseSearchEngine(searchQuery: WorkflowSearchQueryDto): boolean {
		// Use search engine for text queries
		if (searchQuery.query && searchQuery.query.trim().length > 0) {
			return true;
		}

		// Use search engine for complex queries with multiple filters
		const filterCount = Object.keys(this.getAppliedFilters(searchQuery)).length;
		if (filterCount > 2) {
			return true;
		}

		// Use search engine for node type searches
		if (searchQuery.nodeTypes && searchQuery.nodeTypes.length > 0) {
			return true;
		}

		return false;
	}

	/**
	 * Execute search using search engine
	 */
	private async executeSearchEngineQuery(
		searchQuery: WorkflowSearchQueryDto,
		context: SearchContext,
	): Promise<WorkflowSearchResponseDto> {
		try {
			// Build search engine query
			const engineQuery: SearchQuery = {
				query: searchQuery.query || '*',
				filters: this.buildSearchEngineFilters(searchQuery, context),
				sort: this.buildSearchEngineSort(searchQuery),
				from: ((searchQuery.page || 1) - 1) * (searchQuery.limit || 20),
				size: searchQuery.limit || 20,
				highlight: searchQuery.includeHighlights !== false,
			};

			// Execute search
			const searchResult = await this.searchEngineService.search<WorkflowSearchDocument>(
				'workflows',
				engineQuery,
			);

			// Convert search engine results to workflow entities
			const workflowIds = searchResult.hits.map((hit) => hit.id);
			const workflows = await this.getWorkflowsByIds(workflowIds, context);

			// Process results with search engine scores and highlights
			const processedResults = await this.processSearchEngineResults(
				searchResult,
				workflows,
				searchQuery,
				context,
			);

			// Calculate pagination
			const pagination = this.calculatePagination(
				searchQuery.page || 1,
				searchQuery.limit || 20,
				searchResult.total,
			);

			// Generate facets if needed
			const facets = searchQuery.includeStats
				? await this.generateFacets(context.userWorkflowIds, searchQuery)
				: undefined;

			return {
				results: processedResults,
				pagination,
				query: {
					searchQuery: searchQuery.query,
					appliedFilters: this.getAppliedFilters(searchQuery),
					searchIn: searchQuery.searchIn || ['all'],
					sortBy: searchQuery.sortBy || 'relevance',
					sortOrder: searchQuery.sortOrder || 'desc',
				},
				metadata: {
					searchTimeMs: Date.now() - context.startTime,
					searchedAt: new Date().toISOString(),
					totalWorkflowsInScope: context.userWorkflowIds.length,
					filtersApplied: Object.keys(this.getAppliedFilters(searchQuery)).length,
					searchEngine: {
						used: true,
						indexSearchTimeMs: searchResult.searchTimeMs,
						maxScore: searchResult.maxScore,
					},
				},
				facets,
			};
		} catch (error) {
			this.logger.warn('Search engine query failed, falling back to database search', {
				error: error instanceof Error ? error.message : String(error),
			});

			// Fallback to database search
			return this.executeDatabaseSearch(searchQuery, context);
		}
	}

	/**
	 * Execute search using database (fallback method)
	 */
	private async executeDatabaseSearch(
		searchQuery: WorkflowSearchQueryDto,
		context: SearchContext,
	): Promise<WorkflowSearchResponseDto> {
		// Build search filters
		const filters = await this.buildSearchFilters(searchQuery, context);

		// Execute search query
		const { workflows, totalCount } = await this.executeSearch(filters, searchQuery, context);

		// Process and score results
		const processedResults = await this.processSearchResults(workflows, searchQuery, context);

		// Calculate pagination
		const pagination = this.calculatePagination(
			searchQuery.page || 1,
			searchQuery.limit || 20,
			totalCount,
		);

		// Generate facets if needed
		const facets = searchQuery.includeStats
			? await this.generateFacets(context.userWorkflowIds, searchQuery)
			: undefined;

		return {
			results: processedResults,
			pagination,
			query: {
				searchQuery: searchQuery.query,
				appliedFilters: this.getAppliedFilters(searchQuery),
				searchIn: searchQuery.searchIn || ['all'],
				sortBy: searchQuery.sortBy || 'relevance',
				sortOrder: searchQuery.sortOrder || 'desc',
			},
			metadata: {
				searchTimeMs: Date.now() - context.startTime,
				searchedAt: new Date().toISOString(),
				totalWorkflowsInScope: context.userWorkflowIds.length,
				filtersApplied: Object.keys(this.getAppliedFilters(searchQuery)).length,
				searchEngine: {
					used: false,
					reason: 'fallback',
				},
			},
			facets,
		};
	}

	/**
	 * Build filters for search engine query
	 */
	private buildSearchEngineFilters(
		searchQuery: WorkflowSearchQueryDto,
		context: SearchContext,
	): Record<string, any> {
		const filters: Record<string, any> = {};

		// User access filter - only search accessible workflows
		filters.id = context.userWorkflowIds;

		// Active status filter
		if (typeof searchQuery.active === 'boolean') {
			filters.active = searchQuery.active;
		}

		// Archive status filter
		if (typeof searchQuery.isArchived === 'boolean') {
			filters.isArchived = searchQuery.isArchived;
		}

		// Tags filter
		if (searchQuery.tags && searchQuery.tags.length > 0) {
			filters['tags.name'] = searchQuery.tags;
		}

		// Node types filter
		if (searchQuery.nodeTypes && searchQuery.nodeTypes.length > 0) {
			filters.nodeTypes = searchQuery.nodeTypes;
		}

		// Project filter
		if (searchQuery.projectId) {
			filters.projectId = searchQuery.projectId;
		}

		// Folder filter
		if (searchQuery.folderId) {
			filters.folderId = searchQuery.folderId;
		}

		// Webhook filter
		if (searchQuery.hasWebhooks !== undefined) {
			filters.hasWebhooks = searchQuery.hasWebhooks;
		}

		// Cron trigger filter
		if (searchQuery.hasCronTriggers !== undefined) {
			filters.hasCronTriggers = searchQuery.hasCronTriggers;
		}

		return filters;
	}

	/**
	 * Build sort configuration for search engine
	 */
	private buildSearchEngineSort(
		searchQuery: WorkflowSearchQueryDto,
	): Array<{ field: string; order: 'asc' | 'desc' }> {
		const sortBy = searchQuery.sortBy || 'relevance';
		const sortOrder = (searchQuery.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

		switch (sortBy) {
			case 'name':
				return [{ field: 'name.keyword', order: sortOrder }];
			case 'createdAt':
				return [{ field: 'createdAt', order: sortOrder }];
			case 'updatedAt':
				return [{ field: 'updatedAt', order: sortOrder }];
			case 'executionCount':
				return [{ field: 'executionCount', order: sortOrder }];
			case 'relevance':
			default:
				return [{ field: '_score', order: 'desc' }];
		}
	}

	/**
	 * Get workflows by IDs maintaining order
	 */
	private async getWorkflowsByIds(
		workflowIds: string[],
		context: SearchContext,
	): Promise<WorkflowEntity[]> {
		if (workflowIds.length === 0) {
			return [];
		}

		// Get workflows by IDs
		const workflows = await this.workflowRepository.find({
			where: { id: In(workflowIds) },
			relations: ['tags', 'shared', 'shared.project', 'parentFolder'],
		});

		// Create a map for quick lookup
		const workflowMap = new Map<string, WorkflowEntity>();
		workflows.forEach((workflow) => {
			workflowMap.set(workflow.id, workflow);
		});

		// Return workflows in the same order as the search results
		return workflowIds
			.map((id) => workflowMap.get(id))
			.filter((workflow): workflow is WorkflowEntity => workflow !== undefined);
	}

	/**
	 * Process search engine results with scores and highlights
	 */
	private async processSearchEngineResults(
		searchResult: any,
		workflows: WorkflowEntity[],
		searchQuery: WorkflowSearchQueryDto,
		context: SearchContext,
	): Promise<WorkflowSearchResultItemDto[]> {
		const results: WorkflowSearchResultItemDto[] = [];

		// Create a map of search hits by ID for quick lookup
		const hitMap = new Map();
		searchResult.hits.forEach((hit: any) => {
			hitMap.set(hit.id, hit);
		});

		for (const workflow of workflows) {
			const hit = hitMap.get(workflow.id);

			// Build result item
			const resultItem: WorkflowSearchResultItemDto = {
				id: workflow.id,
				name: workflow.name,
				description: workflow.description || undefined,
				active: workflow.active,
				isArchived: workflow.isArchived,
				createdAt: workflow.createdAt.toISOString(),
				updatedAt: workflow.updatedAt.toISOString(),
				projectId: '', // Will be filled from shared workflow info
				projectName: '', // Will be filled from shared workflow info
				relevanceScore: hit ? hit.score : 0,
			};

			// Add optional fields based on query options
			if (searchQuery.includeContent) {
				resultItem.content = {
					nodes: workflow.nodes,
					connections: workflow.connections,
					settings: workflow.settings,
				};
			}

			if (searchQuery.includeStats) {
				resultItem.stats = await this.getWorkflowStats(workflow.id);
			}

			if (searchQuery.includeHighlights && hit && hit.highlight) {
				resultItem.highlights = hit.highlight;
			}

			// Add metadata
			this.addWorkflowMetadata(resultItem, workflow);

			results.push(resultItem);
		}

		return results;
	}

	/**
	 * Get workflow IDs that user has access to
	 */
	private async getUserAccessibleWorkflowIds(user: User, projectId?: string): Promise<string[]> {
		// Use existing workflow finder service to get accessible workflows
		const workflows = await this.workflowFinderService.findAllWorkflowsForUser(
			user,
			['workflow:read'],
			undefined,
			projectId,
		);

		return workflows.map((w) => w.id);
	}

	/**
	 * Build search filters from query parameters
	 */
	private async buildSearchFilters(
		query: WorkflowSearchQueryDto,
		context: SearchContext,
	): Promise<SearchFilters> {
		const where: FindOptionsWhere<WorkflowEntity>[] = [];
		const joins: string[] = [];
		const parameters: Record<string, any> = {};

		// Base filter: only accessible workflows
		where.push({ id: In(context.userWorkflowIds) });

		// Active status filter
		if (typeof query.active === 'boolean') {
			where.push({ active: query.active });
		}

		// Archive status filter
		if (typeof query.isArchived === 'boolean') {
			where.push({ isArchived: query.isArchived });
		}

		// Date range filters
		this.addDateRangeFilters(where, query);

		// Full-text search across specified fields
		if (query.query && query.query.trim()) {
			this.addFullTextSearchFilters(where, query, parameters);
		}

		// Node types filter
		if (query.nodeTypes && query.nodeTypes.length > 0) {
			this.addNodeTypesFilter(where, query.nodeTypes, parameters);
		}

		// Tags filter
		if (query.tags && query.tags.length > 0) {
			joins.push('workflow.tags');
			where.push({ tags: { name: In(query.tags) } });
		}

		// Folder filter
		if (query.folderId) {
			if (query.folderId === 'root') {
				where.push({ parentFolder: IsNull() });
			} else {
				where.push({ parentFolder: { id: query.folderId } });
			}
		}

		// Webhook and cron trigger filters
		if (query.hasWebhooks || query.hasCronTriggers) {
			this.addTriggerFilters(where, query, parameters);
		}

		// Execution count filter
		if (query.executionCount) {
			await this.addExecutionCountFilter(where, query.executionCount, context);
		}

		return { where, joins, parameters };
	}

	/**
	 * Execute the search query
	 */
	private async executeSearch(
		filters: SearchFilters,
		query: WorkflowSearchQueryDto,
		context: SearchContext,
	) {
		const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');

		// Apply where conditions
		if (filters.where.length > 0) {
			filters.where.forEach((condition, index) => {
				if (index === 0) {
					queryBuilder.where(condition);
				} else {
					queryBuilder.andWhere(condition);
				}
			});
		}

		// Apply joins
		filters.joins.forEach((join) => {
			const [relation, alias] = join.split(' as ');
			queryBuilder.leftJoinAndSelect(relation, alias || relation.split('.')[1]);
		});

		// Set parameters
		queryBuilder.setParameters(filters.parameters);

		// Apply sorting
		this.applySorting(queryBuilder, query);

		// Get total count
		const totalCount = await queryBuilder.getCount();

		// Apply pagination
		const offset = ((query.page || 1) - 1) * (query.limit || 20);
		queryBuilder.skip(offset).take(query.limit || 20);

		// Execute query
		const workflows = await queryBuilder.getMany();

		return { workflows, totalCount };
	}

	/**
	 * Process search results and add relevance scoring
	 */
	private async processSearchResults(
		workflows: WorkflowEntity[],
		query: WorkflowSearchQueryDto,
		context: SearchContext,
	): Promise<WorkflowSearchResultItemDto[]> {
		const results: WorkflowSearchResultItemDto[] = [];

		for (const workflow of workflows) {
			// Calculate relevance score
			const relevanceScore = this.calculateRelevanceScore(workflow, query);

			// Build result item
			const resultItem: WorkflowSearchResultItemDto = {
				id: workflow.id,
				name: workflow.name,
				description: workflow.description || undefined,
				active: workflow.active,
				isArchived: workflow.isArchived,
				createdAt: workflow.createdAt.toISOString(),
				updatedAt: workflow.updatedAt.toISOString(),
				projectId: '', // Will be filled from shared workflow info
				projectName: '', // Will be filled from shared workflow info
				relevanceScore,
			};

			// Add optional fields based on query options
			if (query.includeContent) {
				resultItem.content = {
					nodes: workflow.nodes,
					connections: workflow.connections,
					settings: workflow.settings,
				};
			}

			if (query.includeStats) {
				resultItem.stats = await this.getWorkflowStats(workflow.id);
			}

			if (query.includeHighlights && query.query) {
				resultItem.highlights = this.generateHighlights(workflow, query);
			}

			// Add metadata
			this.addWorkflowMetadata(resultItem, workflow);

			results.push(resultItem);
		}

		// Sort by relevance if needed
		if (query.sortBy === 'relevance') {
			results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
		}

		return results;
	}

	/**
	 * Calculate relevance score for a workflow based on search query
	 */
	private calculateRelevanceScore(workflow: WorkflowEntity, query: WorkflowSearchQueryDto): number {
		if (!query.query) return 1.0;

		const searchTerm = query.query.toLowerCase();
		let score = 0;

		// Exact name match gets highest score
		if (workflow.name.toLowerCase() === searchTerm) {
			score += 10;
		} else if (workflow.name.toLowerCase().includes(searchTerm)) {
			score += 5;
		}

		// Description match
		if (workflow.description && workflow.description.toLowerCase().includes(searchTerm)) {
			score += 3;
		}

		// Node content match (simplified)
		if (workflow.nodes) {
			const nodeContent = JSON.stringify(workflow.nodes).toLowerCase();
			if (nodeContent.includes(searchTerm)) {
				score += 2;
			}
		}

		// Tag match
		if (workflow.tags) {
			const tagNames = workflow.tags.map((t) => t.name.toLowerCase()).join(' ');
			if (tagNames.includes(searchTerm)) {
				score += 4;
			}
		}

		// Normalize score to 0-1 range
		return Math.min(score / 10, 1.0);
	}

	/**
	 * Generate search term highlights
	 */
	private generateHighlights(workflow: WorkflowEntity, query: WorkflowSearchQueryDto): any {
		if (!query.query) return undefined;

		const searchTerm = query.query.toLowerCase();
		const highlights: any = {};

		// Name highlights
		if (workflow.name.toLowerCase().includes(searchTerm)) {
			highlights.name = [this.highlightText(workflow.name, searchTerm)];
		}

		// Description highlights
		if (workflow.description && workflow.description.toLowerCase().includes(searchTerm)) {
			highlights.description = [this.highlightText(workflow.description, searchTerm)];
		}

		// Tag highlights
		if (workflow.tags) {
			const matchingTags = workflow.tags.filter((t) => t.name.toLowerCase().includes(searchTerm));
			if (matchingTags.length > 0) {
				highlights.tags = matchingTags.map((t) => this.highlightText(t.name, searchTerm));
			}
		}

		return Object.keys(highlights).length > 0 ? highlights : undefined;
	}

	/**
	 * Highlight search terms in text
	 */
	private highlightText(text: string, searchTerm: string): string {
		const regex = new RegExp(`(${searchTerm})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}

	/**
	 * Add workflow metadata to result item
	 */
	private addWorkflowMetadata(
		resultItem: WorkflowSearchResultItemDto,
		workflow: WorkflowEntity,
	): void {
		// Extract node information
		if (workflow.nodes) {
			resultItem.nodeTypes = [...new Set(workflow.nodes.map((n) => n.type))];
			resultItem.nodeCount = workflow.nodes.length;
		}

		// Add tags
		if (workflow.tags) {
			resultItem.tags = workflow.tags.map((t) => ({ id: t.id, name: t.name }));
		}

		// Add folder info
		if (workflow.parentFolder) {
			resultItem.folderId = workflow.parentFolder.id;
			resultItem.folderName = workflow.parentFolder.name;
		}
	}

	/**
	 * Get workflow execution statistics
	 */
	private async getWorkflowStats(workflowId: string) {
		try {
			// Get execution statistics from the execution repository
			const executionStats = await this.executionRepository
				.createQueryBuilder('execution')
				.select([
					'COUNT(*) as totalExecutions',
					'COUNT(CASE WHEN execution.finished = true AND execution.status = :successStatus THEN 1 END) as successfulExecutions',
					'COUNT(CASE WHEN execution.finished = true AND execution.status != :successStatus THEN 1 END) as failedExecutions',
					'MAX(execution.startedAt) as lastExecutedAt',
					'AVG(CASE WHEN execution.finished = true AND execution.stoppedAt IS NOT NULL AND execution.startedAt IS NOT NULL THEN EXTRACT(EPOCH FROM execution.stoppedAt - execution.startedAt) * 1000 END) as avgExecutionTime',
				])
				.where('execution.workflowId = :workflowId', { workflowId })
				.setParameter('successStatus', 'success')
				.getRawOne();

			return {
				totalExecutions: parseInt(executionStats.totalExecutions) || 0,
				successfulExecutions: parseInt(executionStats.successfulExecutions) || 0,
				failedExecutions: parseInt(executionStats.failedExecutions) || 0,
				lastExecutedAt: executionStats.lastExecutedAt || undefined,
				avgExecutionTime: executionStats.avgExecutionTime
					? Math.round(parseFloat(executionStats.avgExecutionTime))
					: undefined,
			};
		} catch (error) {
			this.logger.warn('Failed to get workflow execution statistics', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Return default stats on error
			return {
				totalExecutions: 0,
				successfulExecutions: 0,
				failedExecutions: 0,
				lastExecutedAt: undefined,
				avgExecutionTime: undefined,
			};
		}
	}

	/**
	 * Add full-text search filters
	 */
	private addFullTextSearchFilters(
		where: FindOptionsWhere<WorkflowEntity>[],
		query: WorkflowSearchQueryDto,
		parameters: Record<string, any>,
	): void {
		const searchTerm = query.query!.trim();
		const searchIn = query.searchIn || ['all'];
		const caseSensitive = query.caseSensitive || false;
		const likeOperator = caseSensitive ? Like : ILike;

		const searchConditions: FindOptionsWhere<WorkflowEntity>[] = [];

		if (searchIn.includes('all') || searchIn.includes('name')) {
			searchConditions.push({ name: likeOperator(`%${searchTerm}%`) });
		}

		if (searchIn.includes('all') || searchIn.includes('description')) {
			searchConditions.push({ description: likeOperator(`%${searchTerm}%`) });
		}

		// For node content search, we'd need a more sophisticated approach
		// This is a simplified version
		if (searchIn.includes('all') || searchIn.includes('nodes')) {
			// In a real implementation, you might want to use full-text search
			// or maintain a separate search index
			parameters.nodeSearch = `%${searchTerm}%`;
		}

		if (searchConditions.length > 0) {
			where.push(...searchConditions);
		}
	}

	/**
	 * Add date range filters
	 */
	private addDateRangeFilters(
		where: FindOptionsWhere<WorkflowEntity>[],
		query: WorkflowSearchQueryDto,
	): void {
		if (query.createdAfter && query.createdBefore) {
			where.push({
				createdAt: Between(new Date(query.createdAfter), new Date(query.createdBefore)),
			});
		} else if (query.createdAfter) {
			where.push({ createdAt: MoreThan(new Date(query.createdAfter)) });
		} else if (query.createdBefore) {
			where.push({ createdAt: LessThan(new Date(query.createdBefore)) });
		}

		if (query.updatedAfter && query.updatedBefore) {
			where.push({
				updatedAt: Between(new Date(query.updatedAfter), new Date(query.updatedBefore)),
			});
		} else if (query.updatedAfter) {
			where.push({ updatedAt: MoreThan(new Date(query.updatedAfter)) });
		} else if (query.updatedBefore) {
			where.push({ updatedAt: LessThan(new Date(query.updatedBefore)) });
		}
	}

	/**
	 * Add node types filter
	 */
	private addNodeTypesFilter(
		where: FindOptionsWhere<WorkflowEntity>[],
		nodeTypes: string[],
		parameters: Record<string, any>,
	): void {
		// This would require a more sophisticated query to search within JSON
		// For now, we'll use a basic approach
		parameters.nodeTypes = nodeTypes;
	}

	/**
	 * Add trigger filters
	 */
	private addTriggerFilters(
		where: FindOptionsWhere<WorkflowEntity>[],
		query: WorkflowSearchQueryDto,
		parameters: Record<string, any>,
	): void {
		if (query.hasWebhooks) {
			parameters.hasWebhooks = true;
		}

		if (query.hasCronTriggers) {
			parameters.hasCronTriggers = true;
		}
	}

	/**
	 * Add execution count filter
	 */
	private async addExecutionCountFilter(
		where: FindOptionsWhere<WorkflowEntity>[],
		executionCount: { min?: number; max?: number },
		context: SearchContext,
	): Promise<void> {
		try {
			// Build subquery to get workflows with execution counts in the specified range
			const executionCountSubquery = this.executionRepository
				.createQueryBuilder('execution')
				.select('execution.workflowId')
				.addSelect('COUNT(*)', 'executionCount')
				.where('execution.workflowId IN (:...workflowIds)', {
					workflowIds: context.userWorkflowIds.length > 0 ? context.userWorkflowIds : [''],
				})
				.groupBy('execution.workflowId');

			// Apply min filter
			if (executionCount.min !== undefined) {
				executionCountSubquery.having('COUNT(*) >= :minCount', { minCount: executionCount.min });
			}

			// Apply max filter
			if (executionCount.max !== undefined) {
				executionCountSubquery.having('COUNT(*) <= :maxCount', { maxCount: executionCount.max });
			}

			// Get the workflow IDs that match the execution count criteria
			const matchingWorkflows = await executionCountSubquery.getRawMany();
			const matchingWorkflowIds = matchingWorkflows.map((row) => row.workflowId);

			if (matchingWorkflowIds.length > 0) {
				where.push({ id: In(matchingWorkflowIds) });
			} else {
				// No workflows match the criteria, add impossible condition
				where.push({ id: In(['__no_match__']) });
			}
		} catch (error) {
			this.logger.warn('Failed to apply execution count filter', {
				executionCount,
				error: error instanceof Error ? error.message : String(error),
			});
			// On error, don't filter by execution count
		}
	}

	/**
	 * Apply sorting to query builder
	 */
	private applySorting(queryBuilder: any, query: WorkflowSearchQueryDto): void {
		const sortBy = query.sortBy || 'relevance';
		const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

		switch (sortBy) {
			case 'name':
				queryBuilder.orderBy('workflow.name', sortOrder);
				break;
			case 'createdAt':
				queryBuilder.orderBy('workflow.createdAt', sortOrder);
				break;
			case 'updatedAt':
				queryBuilder.orderBy('workflow.updatedAt', sortOrder);
				break;
			case 'executionCount':
				// Would need to join with execution statistics
				queryBuilder.orderBy('workflow.updatedAt', sortOrder); // Fallback
				break;
			case 'relevance':
			default:
				// Relevance sorting is handled in post-processing
				queryBuilder.orderBy('workflow.updatedAt', 'DESC');
				break;
		}
	}

	/**
	 * Calculate pagination information
	 */
	private calculatePagination(page: number, limit: number, total: number) {
		const totalPages = Math.ceil(total / limit);

		return {
			page,
			limit,
			total,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		};
	}

	/**
	 * Get applied filters for response metadata
	 */
	private getAppliedFilters(query: WorkflowSearchQueryDto): Record<string, any> {
		const filters: Record<string, any> = {};

		if (query.active !== undefined) filters.active = query.active;
		if (query.isArchived !== undefined) filters.isArchived = query.isArchived;
		if (query.tags?.length) filters.tags = query.tags;
		if (query.nodeTypes?.length) filters.nodeTypes = query.nodeTypes;
		if (query.projectId) filters.projectId = query.projectId;
		if (query.folderId) filters.folderId = query.folderId;
		if (query.createdAfter) filters.createdAfter = query.createdAfter;
		if (query.createdBefore) filters.createdBefore = query.createdBefore;

		return filters;
	}

	/**
	 * Generate facets for filtering UI
	 */
	private async generateFacets(userWorkflowIds: string[], query: WorkflowSearchQueryDto) {
		try {
			if (userWorkflowIds.length === 0) {
				return undefined;
			}

			// Get workflows with basic info for facet generation
			const workflows = await this.workflowRepository
				.createQueryBuilder('workflow')
				.leftJoinAndSelect('workflow.tags', 'tags')
				.leftJoinAndSelect('workflow.shared', 'shared')
				.leftJoinAndSelect('shared.project', 'project')
				.leftJoinAndSelect('workflow.parentFolder', 'parentFolder')
				.select([
					'workflow.id',
					'workflow.active',
					'workflow.isArchived',
					'workflow.createdAt',
					'workflow.updatedAt',
					'workflow.nodes',
					'tags.id',
					'tags.name',
					'shared.projectId',
					'project.id',
					'project.name',
					'parentFolder.id',
					'parentFolder.name',
				])
				.where('workflow.id IN (:...workflowIds)', { workflowIds: userWorkflowIds })
				.getMany();

			// Generate facets
			const facets = {
				activeStatus: this.generateActiveStatusFacet(workflows),
				archiveStatus: this.generateArchiveStatusFacet(workflows),
				tags: this.generateTagsFacet(workflows),
				nodeTypes: this.generateNodeTypesFacet(workflows),
				projects: this.generateProjectsFacet(workflows),
				folders: this.generateFoldersFacet(workflows),
				dateRanges: this.generateDateRangesFacet(workflows),
			};

			return facets;
		} catch (error) {
			this.logger.warn('Failed to generate search facets', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private generateActiveStatusFacet(workflows: WorkflowEntity[]) {
		const activeCount = workflows.filter((w) => w.active).length;
		const inactiveCount = workflows.length - activeCount;

		return {
			active: { count: activeCount, label: 'Active' },
			inactive: { count: inactiveCount, label: 'Inactive' },
		};
	}

	private generateArchiveStatusFacet(workflows: WorkflowEntity[]) {
		const archivedCount = workflows.filter((w) => w.isArchived).length;
		const notArchivedCount = workflows.length - archivedCount;

		return {
			archived: { count: archivedCount, label: 'Archived' },
			notArchived: { count: notArchivedCount, label: 'Not Archived' },
		};
	}

	private generateTagsFacet(workflows: WorkflowEntity[]) {
		const tagCounts = new Map<string, { count: number; name: string }>();

		workflows.forEach((workflow) => {
			if (workflow.tags) {
				workflow.tags.forEach((tag) => {
					const existing = tagCounts.get(tag.id);
					if (existing) {
						existing.count++;
					} else {
						tagCounts.set(tag.id, { count: 1, name: tag.name });
					}
				});
			}
		});

		return Array.from(tagCounts.entries())
			.map(([id, data]) => ({
				id,
				name: data.name,
				count: data.count,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 20); // Limit to top 20 tags
	}

	private generateNodeTypesFacet(workflows: WorkflowEntity[]) {
		const nodeTypeCounts = new Map<string, number>();

		workflows.forEach((workflow) => {
			if (workflow.nodes && Array.isArray(workflow.nodes)) {
				const uniqueNodeTypes = new Set<string>();
				workflow.nodes.forEach((node: any) => {
					if (node.type && typeof node.type === 'string') {
						uniqueNodeTypes.add(node.type);
					}
				});

				uniqueNodeTypes.forEach((nodeType) => {
					nodeTypeCounts.set(nodeType, (nodeTypeCounts.get(nodeType) || 0) + 1);
				});
			}
		});

		return Array.from(nodeTypeCounts.entries())
			.map(([nodeType, count]) => ({
				nodeType,
				count,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 15); // Limit to top 15 node types
	}

	private generateProjectsFacet(workflows: WorkflowEntity[]) {
		const projectCounts = new Map<string, { count: number; name: string }>();

		workflows.forEach((workflow) => {
			if (workflow.shared && workflow.shared.length > 0) {
				const sharedInfo = workflow.shared[0]; // Take first shared info
				if (sharedInfo.project) {
					const projectId = sharedInfo.project.id;
					const existing = projectCounts.get(projectId);
					if (existing) {
						existing.count++;
					} else {
						projectCounts.set(projectId, {
							count: 1,
							name: sharedInfo.project.name,
						});
					}
				}
			}
		});

		return Array.from(projectCounts.entries())
			.map(([id, data]) => ({
				id,
				name: data.name,
				count: data.count,
			}))
			.sort((a, b) => b.count - a.count);
	}

	private generateFoldersFacet(workflows: WorkflowEntity[]) {
		const folderCounts = new Map<string, { count: number; name: string }>();

		workflows.forEach((workflow) => {
			if (workflow.parentFolder) {
				const folderId = workflow.parentFolder.id;
				const existing = folderCounts.get(folderId);
				if (existing) {
					existing.count++;
				} else {
					folderCounts.set(folderId, {
						count: 1,
						name: workflow.parentFolder.name,
					});
				}
			} else {
				// Root folder
				const existing = folderCounts.get('root');
				if (existing) {
					existing.count++;
				} else {
					folderCounts.set('root', {
						count: 1,
						name: 'Root',
					});
				}
			}
		});

		return Array.from(folderCounts.entries())
			.map(([id, data]) => ({
				id,
				name: data.name,
				count: data.count,
			}))
			.sort((a, b) => b.count - a.count);
	}

	private generateDateRangesFacet(workflows: WorkflowEntity[]) {
		const now = new Date();
		const ranges = {
			lastDay: new Date(now.getTime() - 24 * 60 * 60 * 1000),
			lastWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
			lastMonth: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
			lastYear: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
		};

		return {
			createdAt: {
				lastDay: workflows.filter((w) => w.createdAt >= ranges.lastDay).length,
				lastWeek: workflows.filter((w) => w.createdAt >= ranges.lastWeek).length,
				lastMonth: workflows.filter((w) => w.createdAt >= ranges.lastMonth).length,
				lastYear: workflows.filter((w) => w.createdAt >= ranges.lastYear).length,
			},
			updatedAt: {
				lastDay: workflows.filter((w) => w.updatedAt >= ranges.lastDay).length,
				lastWeek: workflows.filter((w) => w.updatedAt >= ranges.lastWeek).length,
				lastMonth: workflows.filter((w) => w.updatedAt >= ranges.lastMonth).length,
				lastYear: workflows.filter((w) => w.updatedAt >= ranges.lastYear).length,
			},
		};
	}

	/**
	 * Get workflow name suggestions
	 */
	private async getWorkflowSuggestions(query: string, user: User, limit: number) {
		const workflows = await this.workflowRepository.find({
			where: { name: ILike(`%${query}%`) },
			select: ['name'],
			take: limit,
		});

		return workflows.map((w) => ({
			text: w.name,
			type: 'workflow' as const,
			count: 1,
		}));
	}

	/**
	 * Get tag suggestions
	 */
	private async getTagSuggestions(query: string, user: User, limit: number) {
		const tags = await this.tagRepository.find({
			where: { name: ILike(`%${query}%`) },
			take: limit,
		});

		return tags.map((t) => ({
			text: t.name,
			type: 'tag' as const,
			count: 1,
		}));
	}

	/**
	 * Get node type suggestions
	 */
	private async getNodeTypeSuggestions(query: string, user: User, limit: number) {
		try {
			// Get user's accessible workflows
			const userWorkflowIds = await this.getUserAccessibleWorkflowIds(user);

			if (userWorkflowIds.length === 0) {
				return [];
			}

			// Query workflows to extract node types that match the search query
			const workflows = await this.workflowRepository
				.createQueryBuilder('workflow')
				.select(['workflow.id', 'workflow.nodes'])
				.where('workflow.id IN (:...workflowIds)', { workflowIds: userWorkflowIds })
				.getMany();

			// Extract and count unique node types
			const nodeTypeCount = new Map<string, number>();

			workflows.forEach((workflow) => {
				if (workflow.nodes && Array.isArray(workflow.nodes)) {
					workflow.nodes.forEach((node: any) => {
						if (node.type && typeof node.type === 'string') {
							const nodeType = node.type;
							// Filter by query if provided
							if (!query || nodeType.toLowerCase().includes(query.toLowerCase())) {
								nodeTypeCount.set(nodeType, (nodeTypeCount.get(nodeType) || 0) + 1);
							}
						}
					});
				}
			});

			// Convert to suggestions array and sort by count
			const suggestions = Array.from(nodeTypeCount.entries())
				.map(([nodeType, count]) => ({
					text: nodeType,
					type: 'nodeType' as const,
					count,
				}))
				.sort((a, b) => b.count - a.count)
				.slice(0, limit);

			return suggestions;
		} catch (error) {
			this.logger.warn('Failed to get node type suggestions', {
				query,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	/**
	 * Get user suggestions
	 */
	private async getUserSuggestions(query: string, user: User, limit: number) {
		// This would require querying users that the current user can see
		// For now, return empty array
		return [];
	}

	/**
	 * Build advanced search filters
	 */
	private async buildAdvancedSearchFilters(
		query: AdvancedWorkflowSearchDto,
		context: SearchContext,
	): Promise<SearchFilters> {
		const where: FindOptionsWhere<WorkflowEntity>[] = [];
		const joins: string[] = [];
		const parameters: Record<string, any> = {};

		// Base filter: only accessible workflows
		where.push({ id: In(context.userWorkflowIds) });

		// Process boolean query structure
		if (query.query) {
			if (query.query.must && query.query.must.length > 0) {
				await this.processBooleanClauses(query.query.must, 'must', where, joins, parameters);
			}

			if (query.query.should && query.query.should.length > 0) {
				await this.processBooleanClauses(query.query.should, 'should', where, joins, parameters);
			}

			if (query.query.mustNot && query.query.mustNot.length > 0) {
				await this.processBooleanClauses(query.query.mustNot, 'mustNot', where, joins, parameters);
			}
		}

		// Process filters
		if (query.filters) {
			await this.processAdvancedFilters(query.filters, where, joins, parameters);
		}

		// Process ranges
		if (query.ranges) {
			this.processAdvancedRanges(query.ranges, where, parameters);
		}

		return { where, joins, parameters };
	}

	private async processBooleanClauses(
		clauses: any[],
		clauseType: 'must' | 'should' | 'mustNot',
		where: FindOptionsWhere<WorkflowEntity>[],
		joins: string[],
		parameters: Record<string, any>,
	): Promise<void> {
		for (const clause of clauses) {
			if (clause.match) {
				// Handle match clauses (field: value)
				const field = Object.keys(clause.match)[0];
				const value = clause.match[field];

				if (field === 'name') {
					const condition = { name: ILike(`%${value}%`) };
					if (clauseType === 'mustNot') {
						where.push({ name: Not(ILike(`%${value}%`)) });
					} else {
						where.push(condition);
					}
				} else if (field === 'description') {
					const condition = { description: ILike(`%${value}%`) };
					if (clauseType === 'mustNot') {
						where.push({ description: Not(ILike(`%${value}%`)) });
					} else {
						where.push(condition);
					}
				}
			} else if (clause.term) {
				// Handle term clauses (exact match)
				const field = Object.keys(clause.term)[0];
				const value = clause.term[field];

				if (field === 'active') {
					const condition = { active: value };
					if (clauseType === 'mustNot') {
						where.push({ active: Not(value) });
					} else {
						where.push(condition);
					}
				} else if (field === 'isArchived') {
					const condition = { isArchived: value };
					if (clauseType === 'mustNot') {
						where.push({ isArchived: Not(value) });
					} else {
						where.push(condition);
					}
				}
			} else if (clause.terms) {
				// Handle terms clauses (multiple values)
				const field = Object.keys(clause.terms)[0];
				const values = clause.terms[field];

				if (field === 'tags.name') {
					if (!joins.includes('workflow.tags')) {
						joins.push('workflow.tags');
					}
					const condition = { tags: { name: In(values) } };
					if (clauseType === 'mustNot') {
						where.push({ tags: { name: Not(In(values)) } });
					} else {
						where.push(condition);
					}
				}
			}
		}
	}

	private async processAdvancedFilters(
		filters: Record<string, any>,
		where: FindOptionsWhere<WorkflowEntity>[],
		joins: string[],
		parameters: Record<string, any>,
	): Promise<void> {
		// Process standard filters
		Object.entries(filters).forEach(([key, value]) => {
			switch (key) {
				case 'active':
					if (typeof value === 'boolean') {
						where.push({ active: value });
					}
					break;
				case 'isArchived':
					if (typeof value === 'boolean') {
						where.push({ isArchived: value });
					}
					break;
				case 'tags':
					if (Array.isArray(value) && value.length > 0) {
						joins.push('workflow.tags');
						where.push({ tags: { name: In(value) } });
					}
					break;
				case 'nodeTypes':
					if (Array.isArray(value) && value.length > 0) {
						this.addNodeTypesFilter(where, value, parameters);
					}
					break;
				case 'projectId':
					if (typeof value === 'string') {
						joins.push('workflow.shared');
						where.push({ shared: { projectId: value } });
					}
					break;
				case 'folderId':
					if (value === 'root') {
						where.push({ parentFolder: IsNull() });
					} else if (typeof value === 'string') {
						where.push({ parentFolder: { id: value } });
					}
					break;
			}
		});
	}

	private processAdvancedRanges(
		ranges: Record<string, any>,
		where: FindOptionsWhere<WorkflowEntity>[],
		parameters: Record<string, any>,
	): void {
		Object.entries(ranges).forEach(([field, range]) => {
			if (field === 'createdAt' || field === 'updatedAt') {
				if (range.gte && range.lte) {
					where.push({
						[field]: Between(new Date(range.gte), new Date(range.lte)),
					});
				} else if (range.gte) {
					where.push({ [field]: MoreThan(new Date(range.gte)) });
				} else if (range.lte) {
					where.push({ [field]: LessThan(new Date(range.lte)) });
				}
			}
		});
	}

	/**
	 * Execute advanced search
	 */
	private async executeAdvancedSearch(
		filters: SearchFilters,
		query: AdvancedWorkflowSearchDto,
		context: SearchContext,
	) {
		const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');

		// Apply where conditions
		if (filters.where.length > 0) {
			filters.where.forEach((condition, index) => {
				if (index === 0) {
					queryBuilder.where(condition);
				} else {
					queryBuilder.andWhere(condition);
				}
			});
		}

		// Apply joins
		filters.joins.forEach((join) => {
			const [relation, alias] = join.split(' as ');
			queryBuilder.leftJoinAndSelect(relation, alias || relation.split('.')[1]);
		});

		// Set parameters
		queryBuilder.setParameters(filters.parameters);

		// Apply sorting
		if (query.sort && query.sort.length > 0) {
			query.sort.forEach((sortConfig, index) => {
				const direction = sortConfig.order.toUpperCase() as 'ASC' | 'DESC';
				if (index === 0) {
					queryBuilder.orderBy(`workflow.${sortConfig.field}`, direction);
				} else {
					queryBuilder.addOrderBy(`workflow.${sortConfig.field}`, direction);
				}
			});
		} else {
			queryBuilder.orderBy('workflow.updatedAt', 'DESC');
		}

		// Get total count
		const totalCount = await queryBuilder.getCount();

		// Apply pagination
		const offset = ((query.page || 1) - 1) * (query.limit || 20);
		queryBuilder.skip(offset).take(query.limit || 20);

		// Execute query
		const workflows = await queryBuilder.getMany();

		return { workflows, totalCount };
	}

	/**
	 * Process advanced search results
	 */
	private async processAdvancedSearchResults(
		workflows: WorkflowEntity[],
		query: AdvancedWorkflowSearchDto,
		context: SearchContext,
	): Promise<WorkflowSearchResultItemDto[]> {
		const results: WorkflowSearchResultItemDto[] = [];

		for (const workflow of workflows) {
			// Build result item
			const resultItem: WorkflowSearchResultItemDto = {
				id: workflow.id,
				name: workflow.name,
				description: workflow.description || undefined,
				active: workflow.active,
				isArchived: workflow.isArchived,
				createdAt: workflow.createdAt.toISOString(),
				updatedAt: workflow.updatedAt.toISOString(),
				projectId: '', // Will be filled from shared workflow info
				projectName: '', // Will be filled from shared workflow info
				relevanceScore: 1.0, // Advanced search doesn't use text-based relevance scoring
			};

			// Add optional fields based on query options
			if (query.include?.content) {
				resultItem.content = {
					nodes: workflow.nodes,
					connections: workflow.connections,
					settings: workflow.settings,
				};
			}

			if (query.include?.stats) {
				resultItem.stats = await this.getWorkflowStats(workflow.id);
			}

			if (query.include?.highlights) {
				// For advanced search, we can highlight based on the query clauses
				resultItem.highlights = this.generateAdvancedHighlights(workflow, query);
			}

			// Add metadata
			this.addWorkflowMetadata(resultItem, workflow);

			results.push(resultItem);
		}

		return results;
	}

	/**
	 * Generate highlights for advanced search results
	 */
	private generateAdvancedHighlights(
		workflow: WorkflowEntity,
		query: AdvancedWorkflowSearchDto,
	): any {
		const highlights: any = {};

		// Extract search terms from boolean query clauses
		const searchTerms = this.extractSearchTermsFromAdvancedQuery(query);

		if (searchTerms.length === 0) {
			return undefined;
		}

		// Generate highlights for each search term
		searchTerms.forEach((term) => {
			// Name highlights
			if (workflow.name.toLowerCase().includes(term.toLowerCase())) {
				if (!highlights.name) highlights.name = [];
				highlights.name.push(this.highlightText(workflow.name, term));
			}

			// Description highlights
			if (workflow.description && workflow.description.toLowerCase().includes(term.toLowerCase())) {
				if (!highlights.description) highlights.description = [];
				highlights.description.push(this.highlightText(workflow.description, term));
			}

			// Tag highlights
			if (workflow.tags) {
				const matchingTags = workflow.tags.filter((t) =>
					t.name.toLowerCase().includes(term.toLowerCase()),
				);
				if (matchingTags.length > 0) {
					if (!highlights.tags) highlights.tags = [];
					highlights.tags.push(...matchingTags.map((t) => this.highlightText(t.name, term)));
				}
			}
		});

		return Object.keys(highlights).length > 0 ? highlights : undefined;
	}

	/**
	 * Extract search terms from advanced query for highlighting
	 */
	private extractSearchTermsFromAdvancedQuery(query: AdvancedWorkflowSearchDto): string[] {
		const terms: string[] = [];

		if (query.query) {
			// Extract terms from must clauses
			if (query.query.must) {
				query.query.must.forEach((clause) => {
					if (clause.match) {
						Object.values(clause.match).forEach((value) => {
							if (typeof value === 'string') {
								terms.push(value);
							}
						});
					}
				});
			}

			// Extract terms from should clauses
			if (query.query.should) {
				query.query.should.forEach((clause) => {
					if (clause.match) {
						Object.values(clause.match).forEach((value) => {
							if (typeof value === 'string') {
								terms.push(value);
							}
						});
					}
				});
			}
		}

		return [...new Set(terms)]; // Remove duplicates
	}

	/**
	 * Convert advanced query to basic query for compatibility
	 */
	private convertAdvancedToBasicQuery(query: AdvancedWorkflowSearchDto): WorkflowSearchQueryDto {
		return {
			page: query.page,
			limit: query.limit,
			includeStats: query.include?.stats,
			includeContent: query.include?.content,
			includeHighlights: query.include?.highlights,
		};
	}

	/**
	 * Count applied filters in advanced query
	 */
	private countAdvancedFilters(query: AdvancedWorkflowSearchDto): number {
		let count = 0;

		if (query.query?.must?.length) count += query.query.must.length;
		if (query.query?.should?.length) count += query.query.should.length;
		if (query.query?.mustNot?.length) count += query.query.mustNot.length;
		if (query.filters) count += Object.keys(query.filters).length;
		if (query.ranges) count += Object.keys(query.ranges).length;

		return count;
	}

	/**
	 * Create empty response
	 */
	private createEmptyResponse(
		query: WorkflowSearchQueryDto,
		startTime: number,
		totalWorkflows: number,
	): WorkflowSearchResponseDto {
		return {
			results: [],
			pagination: {
				page: query.page || 1,
				limit: query.limit || 20,
				total: 0,
				totalPages: 0,
				hasNext: false,
				hasPrev: false,
			},
			query: {
				searchQuery: query.query,
				appliedFilters: this.getAppliedFilters(query),
				searchIn: query.searchIn || ['all'],
				sortBy: query.sortBy || 'relevance',
				sortOrder: query.sortOrder || 'desc',
			},
			metadata: {
				searchTimeMs: Date.now() - startTime,
				searchedAt: new Date().toISOString(),
				totalWorkflowsInScope: totalWorkflows,
				filtersApplied: Object.keys(this.getAppliedFilters(query)).length,
			},
		};
	}
}
