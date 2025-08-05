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
		// This would typically query the execution repository
		// For now, return a placeholder
		return {
			totalExecutions: 0,
			successfulExecutions: 0,
			failedExecutions: 0,
			lastExecutedAt: undefined,
			avgExecutionTime: undefined,
		};
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
		// This would require joining with execution statistics
		// Implementation would depend on how execution counts are stored/calculated
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
		// This would generate aggregated data for filtering UI
		// Implementation would depend on specific requirements
		return undefined;
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
		// This would require analyzing workflow nodes to extract unique node types
		// For now, return empty array
		return [];
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
		// Implementation for advanced boolean query building
		// This would be more complex than basic search
		return { where: [], joins: [], parameters: {} };
	}

	/**
	 * Execute advanced search
	 */
	private async executeAdvancedSearch(
		filters: SearchFilters,
		query: AdvancedWorkflowSearchDto,
		context: SearchContext,
	) {
		// Implementation for advanced search execution
		return { workflows: [], totalCount: 0 };
	}

	/**
	 * Process advanced search results
	 */
	private async processAdvancedSearchResults(
		workflows: WorkflowEntity[],
		query: AdvancedWorkflowSearchDto,
		context: SearchContext,
	): Promise<WorkflowSearchResultItemDto[]> {
		// Implementation for advanced search result processing
		return [];
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
