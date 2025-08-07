'use strict';
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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowSearchService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const n8n_workflow_1 = require('n8n-workflow');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const search_engine_service_1 = require('./search-engine.service');
const workflow_indexing_service_1 = require('./workflow-indexing.service');
let WorkflowSearchService = class WorkflowSearchService {
	constructor(
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
	) {
		this.logger = logger;
		this.globalConfig = globalConfig;
		this.workflowRepository = workflowRepository;
		this.tagRepository = tagRepository;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.executionRepository = executionRepository;
		this.workflowFinderService = workflowFinderService;
		this.projectService = projectService;
		this.searchEngineService = searchEngineService;
		this.workflowIndexingService = workflowIndexingService;
	}
	async searchWorkflows(searchQuery, user) {
		const startTime = Date.now();
		this.logger.debug('Workflow search requested', {
			userId: user.id,
			query: searchQuery.query,
			searchIn: searchQuery.searchIn,
			searchMethod: this.searchEngineService.isAvailable() ? 'search_engine' : 'database',
			filters: Object.keys(searchQuery).filter((k) => searchQuery[k] !== undefined),
		});
		try {
			const userWorkflowIds = await this.getUserAccessibleWorkflowIds(user, searchQuery.projectId);
			if (userWorkflowIds.length === 0) {
				return this.createEmptyResponse(searchQuery, startTime, 0);
			}
			const context = {
				user,
				userWorkflowIds,
				startTime,
			};
			let response;
			if (this.searchEngineService.isAvailable() && this.shouldUseSearchEngine(searchQuery)) {
				response = await this.executeSearchEngineQuery(searchQuery, context);
			} else {
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError('Search failed', {
				cause: error,
				extra: { userId: user.id, query: searchQuery.query },
			});
		}
	}
	async advancedSearch(searchQuery, user) {
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
			const userWorkflowIds = await this.getUserAccessibleWorkflowIds(user);
			if (userWorkflowIds.length === 0) {
				return this.createEmptyResponse(
					this.convertAdvancedToBasicQuery(searchQuery),
					startTime,
					0,
				);
			}
			const context = {
				user,
				userWorkflowIds,
				startTime,
			};
			const filters = await this.buildAdvancedSearchFilters(searchQuery, context);
			const { workflows, totalCount } = await this.executeAdvancedSearch(
				filters,
				searchQuery,
				context,
			);
			const processedResults = await this.processAdvancedSearchResults(
				workflows,
				searchQuery,
				context,
			);
			const pagination = this.calculatePagination(
				searchQuery.page || 1,
				searchQuery.limit || 20,
				totalCount,
			);
			const response = {
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
			throw new n8n_workflow_1.ApplicationError('Advanced search failed', {
				cause: error,
				extra: { userId: user.id },
			});
		}
	}
	async getSearchSuggestions(request, user) {
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
	shouldUseSearchEngine(searchQuery) {
		if (searchQuery.query && searchQuery.query.trim().length > 0) {
			return true;
		}
		const filterCount = Object.keys(this.getAppliedFilters(searchQuery)).length;
		if (filterCount > 2) {
			return true;
		}
		if (searchQuery.nodeTypes && searchQuery.nodeTypes.length > 0) {
			return true;
		}
		return false;
	}
	async executeSearchEngineQuery(searchQuery, context) {
		try {
			const engineQuery = {
				query: searchQuery.query || '*',
				filters: this.buildSearchEngineFilters(searchQuery, context),
				sort: this.buildSearchEngineSort(searchQuery),
				from: ((searchQuery.page || 1) - 1) * (searchQuery.limit || 20),
				size: searchQuery.limit || 20,
				highlight: searchQuery.includeHighlights !== false,
			};
			const searchResult = await this.searchEngineService.search('workflows', engineQuery);
			const workflowIds = searchResult.hits.map((hit) => hit.id);
			const workflows = await this.getWorkflowsByIds(workflowIds, context);
			const processedResults = await this.processSearchEngineResults(
				searchResult,
				workflows,
				searchQuery,
				context,
			);
			const pagination = this.calculatePagination(
				searchQuery.page || 1,
				searchQuery.limit || 20,
				searchResult.total,
			);
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
						name: 'elasticsearch',
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
			return this.executeDatabaseSearch(searchQuery, context);
		}
	}
	async executeDatabaseSearch(searchQuery, context) {
		const filters = await this.buildSearchFilters(searchQuery, context);
		const { workflows, totalCount } = await this.executeSearch(filters, searchQuery, context);
		const processedResults = await this.processSearchResults(workflows, searchQuery, context);
		const pagination = this.calculatePagination(
			searchQuery.page || 1,
			searchQuery.limit || 20,
			totalCount,
		);
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
					name: 'database',
					reason: 'fallback',
				},
			},
			facets,
		};
	}
	buildSearchEngineFilters(searchQuery, context) {
		const filters = {};
		filters.id = context.userWorkflowIds;
		if (typeof searchQuery.active === 'boolean') {
			filters.active = searchQuery.active;
		}
		if (typeof searchQuery.isArchived === 'boolean') {
			filters.isArchived = searchQuery.isArchived;
		}
		if (searchQuery.tags && searchQuery.tags.length > 0) {
			filters['tags.name'] = searchQuery.tags;
		}
		if (searchQuery.nodeTypes && searchQuery.nodeTypes.length > 0) {
			filters.nodeTypes = searchQuery.nodeTypes;
		}
		if (searchQuery.projectId) {
			filters.projectId = searchQuery.projectId;
		}
		if (searchQuery.folderId) {
			filters.folderId = searchQuery.folderId;
		}
		if (searchQuery.hasWebhooks !== undefined) {
			filters.hasWebhooks = searchQuery.hasWebhooks;
		}
		if (searchQuery.hasCronTriggers !== undefined) {
			filters.hasCronTriggers = searchQuery.hasCronTriggers;
		}
		return filters;
	}
	buildSearchEngineSort(searchQuery) {
		const sortBy = searchQuery.sortBy || 'relevance';
		const sortOrder = searchQuery.sortOrder === 'asc' ? 'asc' : 'desc';
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
	async getWorkflowsByIds(workflowIds, context) {
		if (workflowIds.length === 0) {
			return [];
		}
		const workflows = await this.workflowRepository.find({
			where: { id: (0, typeorm_1.In)(workflowIds) },
			relations: ['tags', 'shared', 'shared.project', 'parentFolder'],
		});
		const workflowMap = new Map();
		workflows.forEach((workflow) => {
			workflowMap.set(workflow.id, workflow);
		});
		return workflowIds
			.map((id) => workflowMap.get(id))
			.filter((workflow) => workflow !== undefined);
	}
	async processSearchEngineResults(searchResult, workflows, searchQuery, context) {
		const results = [];
		const hitMap = new Map();
		searchResult.hits.forEach((hit) => {
			hitMap.set(hit.id, hit);
		});
		for (const workflow of workflows) {
			const hit = hitMap.get(workflow.id);
			const resultItem = {
				id: workflow.id,
				name: workflow.name,
				description: workflow.description || undefined,
				active: workflow.active,
				isArchived: workflow.isArchived,
				createdAt: workflow.createdAt.toISOString(),
				updatedAt: workflow.updatedAt.toISOString(),
				projectId: '',
				projectName: '',
				relevanceScore: hit ? hit.score : 0,
			};
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
			this.addWorkflowMetadata(resultItem, workflow);
			results.push(resultItem);
		}
		return results;
	}
	async getUserAccessibleWorkflowIds(user, projectId) {
		const workflows = await this.workflowFinderService.findAllWorkflowsForUser(
			user,
			['workflow:read'],
			undefined,
			projectId,
		);
		return workflows.map((w) => w.id);
	}
	async buildSearchFilters(query, context) {
		const where = [];
		const joins = [];
		const parameters = {};
		where.push({ id: (0, typeorm_1.In)(context.userWorkflowIds) });
		if (typeof query.active === 'boolean') {
			where.push({ active: query.active });
		}
		if (typeof query.isArchived === 'boolean') {
			where.push({ isArchived: query.isArchived });
		}
		this.addDateRangeFilters(where, query);
		if (query.query && query.query.trim()) {
			this.addFullTextSearchFilters(where, query, parameters);
		}
		if (query.nodeTypes && query.nodeTypes.length > 0) {
			this.addNodeTypesFilter(where, query.nodeTypes, parameters);
		}
		if (query.tags && query.tags.length > 0) {
			joins.push('workflow.tags');
			where.push({ tags: { name: (0, typeorm_1.In)(query.tags) } });
		}
		if (query.folderId) {
			if (query.folderId === 'root') {
				where.push({ parentFolder: (0, typeorm_1.IsNull)() });
			} else {
				where.push({ parentFolder: { id: query.folderId } });
			}
		}
		if (query.hasWebhooks || query.hasCronTriggers) {
			this.addTriggerFilters(where, query, parameters);
		}
		if (query.executionCount) {
			await this.addExecutionCountFilter(where, query.executionCount, context);
		}
		return { where, joins, parameters };
	}
	async executeSearch(filters, query, context) {
		const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');
		if (filters.where.length > 0) {
			filters.where.forEach((condition, index) => {
				if (index === 0) {
					queryBuilder.where(condition);
				} else {
					queryBuilder.andWhere(condition);
				}
			});
		}
		filters.joins.forEach((join) => {
			const [relation, alias] = join.split(' as ');
			queryBuilder.leftJoinAndSelect(relation, alias || relation.split('.')[1]);
		});
		queryBuilder.setParameters(filters.parameters);
		this.applySorting(queryBuilder, query);
		const totalCount = await queryBuilder.getCount();
		const offset = ((query.page || 1) - 1) * (query.limit || 20);
		queryBuilder.skip(offset).take(query.limit || 20);
		const workflows = await queryBuilder.getMany();
		return { workflows, totalCount };
	}
	async processSearchResults(workflows, query, context) {
		const results = [];
		for (const workflow of workflows) {
			const relevanceScore = this.calculateRelevanceScore(workflow, query);
			const resultItem = {
				id: workflow.id,
				name: workflow.name,
				description: workflow.description || undefined,
				active: workflow.active,
				isArchived: workflow.isArchived,
				createdAt: workflow.createdAt.toISOString(),
				updatedAt: workflow.updatedAt.toISOString(),
				projectId: '',
				projectName: '',
				relevanceScore,
			};
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
			this.addWorkflowMetadata(resultItem, workflow);
			results.push(resultItem);
		}
		if (query.sortBy === 'relevance') {
			results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
		}
		return results;
	}
	calculateRelevanceScore(workflow, query) {
		if (!query.query) return 1.0;
		const searchTerm = query.query.toLowerCase();
		let score = 0;
		if (workflow.name.toLowerCase() === searchTerm) {
			score += 10;
		} else if (workflow.name.toLowerCase().includes(searchTerm)) {
			score += 5;
		}
		if (workflow.description && workflow.description.toLowerCase().includes(searchTerm)) {
			score += 3;
		}
		if (workflow.nodes) {
			const nodeContent = JSON.stringify(workflow.nodes).toLowerCase();
			if (nodeContent.includes(searchTerm)) {
				score += 2;
			}
		}
		if (workflow.tags) {
			const tagNames = workflow.tags.map((t) => t.name.toLowerCase()).join(' ');
			if (tagNames.includes(searchTerm)) {
				score += 4;
			}
		}
		return Math.min(score / 10, 1.0);
	}
	generateHighlights(workflow, query) {
		if (!query.query) return undefined;
		const searchTerm = query.query.toLowerCase();
		const highlights = {};
		if (workflow.name.toLowerCase().includes(searchTerm)) {
			highlights.name = [this.highlightText(workflow.name, searchTerm)];
		}
		if (workflow.description && workflow.description.toLowerCase().includes(searchTerm)) {
			highlights.description = [this.highlightText(workflow.description, searchTerm)];
		}
		if (workflow.tags) {
			const matchingTags = workflow.tags.filter((t) => t.name.toLowerCase().includes(searchTerm));
			if (matchingTags.length > 0) {
				highlights.tags = matchingTags.map((t) => this.highlightText(t.name, searchTerm));
			}
		}
		return Object.keys(highlights).length > 0 ? highlights : undefined;
	}
	highlightText(text, searchTerm) {
		const regex = new RegExp(`(${searchTerm})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}
	addWorkflowMetadata(resultItem, workflow) {
		if (workflow.nodes) {
			resultItem.nodeTypes = [...new Set(workflow.nodes.map((n) => n.type))];
			resultItem.nodeCount = workflow.nodes.length;
		}
		if (workflow.tags) {
			resultItem.tags = workflow.tags.map((t) => ({ id: t.id, name: t.name }));
		}
		if (workflow.parentFolder) {
			resultItem.folderId = workflow.parentFolder.id;
			resultItem.folderName = workflow.parentFolder.name;
		}
	}
	async getWorkflowStats(workflowId) {
		try {
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
			return {
				totalExecutions: 0,
				successfulExecutions: 0,
				failedExecutions: 0,
				lastExecutedAt: undefined,
				avgExecutionTime: undefined,
			};
		}
	}
	addFullTextSearchFilters(where, query, parameters) {
		const searchTerm = query.query.trim();
		const searchIn = query.searchIn || ['all'];
		const caseSensitive = query.caseSensitive || false;
		const likeOperator = caseSensitive ? typeorm_1.Like : typeorm_1.ILike;
		const searchConditions = [];
		if (searchIn.includes('all') || searchIn.includes('name')) {
			searchConditions.push({ name: likeOperator(`%${searchTerm}%`) });
		}
		if (searchIn.includes('all') || searchIn.includes('description')) {
			searchConditions.push({ description: likeOperator(`%${searchTerm}%`) });
		}
		if (searchIn.includes('all') || searchIn.includes('nodes')) {
			parameters.nodeSearch = `%${searchTerm}%`;
		}
		if (searchConditions.length > 0) {
			where.push(...searchConditions);
		}
	}
	addDateRangeFilters(where, query) {
		if (query.createdAfter && query.createdBefore) {
			where.push({
				createdAt: (0, typeorm_1.Between)(
					new Date(query.createdAfter),
					new Date(query.createdBefore),
				),
			});
		} else if (query.createdAfter) {
			where.push({ createdAt: (0, typeorm_1.MoreThan)(new Date(query.createdAfter)) });
		} else if (query.createdBefore) {
			where.push({ createdAt: (0, typeorm_1.LessThan)(new Date(query.createdBefore)) });
		}
		if (query.updatedAfter && query.updatedBefore) {
			where.push({
				updatedAt: (0, typeorm_1.Between)(
					new Date(query.updatedAfter),
					new Date(query.updatedBefore),
				),
			});
		} else if (query.updatedAfter) {
			where.push({ updatedAt: (0, typeorm_1.MoreThan)(new Date(query.updatedAfter)) });
		} else if (query.updatedBefore) {
			where.push({ updatedAt: (0, typeorm_1.LessThan)(new Date(query.updatedBefore)) });
		}
	}
	addNodeTypesFilter(where, nodeTypes, parameters) {
		parameters.nodeTypes = nodeTypes;
	}
	addTriggerFilters(where, query, parameters) {
		if (query.hasWebhooks) {
			parameters.hasWebhooks = true;
		}
		if (query.hasCronTriggers) {
			parameters.hasCronTriggers = true;
		}
	}
	async addExecutionCountFilter(where, executionCount, context) {
		try {
			const executionCountSubquery = this.executionRepository
				.createQueryBuilder('execution')
				.select('execution.workflowId')
				.addSelect('COUNT(*)', 'executionCount')
				.where('execution.workflowId IN (:...workflowIds)', {
					workflowIds: context.userWorkflowIds.length > 0 ? context.userWorkflowIds : [''],
				})
				.groupBy('execution.workflowId');
			if (executionCount.min !== undefined) {
				executionCountSubquery.having('COUNT(*) >= :minCount', { minCount: executionCount.min });
			}
			if (executionCount.max !== undefined) {
				executionCountSubquery.having('COUNT(*) <= :maxCount', { maxCount: executionCount.max });
			}
			const matchingWorkflows = await executionCountSubquery.getRawMany();
			const matchingWorkflowIds = matchingWorkflows.map((row) => row.workflowId);
			if (matchingWorkflowIds.length > 0) {
				where.push({ id: (0, typeorm_1.In)(matchingWorkflowIds) });
			} else {
				where.push({ id: (0, typeorm_1.In)(['__no_match__']) });
			}
		} catch (error) {
			this.logger.warn('Failed to apply execution count filter', {
				executionCount,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	applySorting(queryBuilder, query) {
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
				queryBuilder.orderBy('workflow.updatedAt', sortOrder);
				break;
			case 'relevance':
			default:
				queryBuilder.orderBy('workflow.updatedAt', 'DESC');
				break;
		}
	}
	calculatePagination(page, limit, total) {
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
	getAppliedFilters(query) {
		const filters = {};
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
	async generateFacets(userWorkflowIds, query) {
		try {
			if (userWorkflowIds.length === 0) {
				return undefined;
			}
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
	generateActiveStatusFacet(workflows) {
		const activeCount = workflows.filter((w) => w.active).length;
		const inactiveCount = workflows.length - activeCount;
		return {
			active: { count: activeCount, label: 'Active' },
			inactive: { count: inactiveCount, label: 'Inactive' },
		};
	}
	generateArchiveStatusFacet(workflows) {
		const archivedCount = workflows.filter((w) => w.isArchived).length;
		const notArchivedCount = workflows.length - archivedCount;
		return {
			archived: { count: archivedCount, label: 'Archived' },
			notArchived: { count: notArchivedCount, label: 'Not Archived' },
		};
	}
	generateTagsFacet(workflows) {
		const tagCounts = new Map();
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
			.slice(0, 20);
	}
	generateNodeTypesFacet(workflows) {
		const nodeTypeCounts = new Map();
		workflows.forEach((workflow) => {
			if (workflow.nodes && Array.isArray(workflow.nodes)) {
				const uniqueNodeTypes = new Set();
				workflow.nodes.forEach((node) => {
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
			.slice(0, 15);
	}
	generateProjectsFacet(workflows) {
		const projectCounts = new Map();
		workflows.forEach((workflow) => {
			if (workflow.shared && workflow.shared.length > 0) {
				const sharedInfo = workflow.shared[0];
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
	generateFoldersFacet(workflows) {
		const folderCounts = new Map();
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
	generateDateRangesFacet(workflows) {
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
	async getWorkflowSuggestions(query, user, limit) {
		const workflows = await this.workflowRepository.find({
			where: { name: (0, typeorm_1.ILike)(`%${query}%`) },
			select: ['name'],
			take: limit,
		});
		return workflows.map((w) => ({
			text: w.name,
			type: 'workflow',
			count: 1,
		}));
	}
	async getTagSuggestions(query, user, limit) {
		const tags = await this.tagRepository.find({
			where: { name: (0, typeorm_1.ILike)(`%${query}%`) },
			take: limit,
		});
		return tags.map((t) => ({
			text: t.name,
			type: 'tag',
			count: 1,
		}));
	}
	async getNodeTypeSuggestions(query, user, limit) {
		try {
			const userWorkflowIds = await this.getUserAccessibleWorkflowIds(user);
			if (userWorkflowIds.length === 0) {
				return [];
			}
			const workflows = await this.workflowRepository
				.createQueryBuilder('workflow')
				.select(['workflow.id', 'workflow.nodes'])
				.where('workflow.id IN (:...workflowIds)', { workflowIds: userWorkflowIds })
				.getMany();
			const nodeTypeCount = new Map();
			workflows.forEach((workflow) => {
				if (workflow.nodes && Array.isArray(workflow.nodes)) {
					workflow.nodes.forEach((node) => {
						if (node.type && typeof node.type === 'string') {
							const nodeType = node.type;
							if (!query || nodeType.toLowerCase().includes(query.toLowerCase())) {
								nodeTypeCount.set(nodeType, (nodeTypeCount.get(nodeType) || 0) + 1);
							}
						}
					});
				}
			});
			const suggestions = Array.from(nodeTypeCount.entries())
				.map(([nodeType, count]) => ({
					text: nodeType,
					type: 'nodeType',
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
	async getUserSuggestions(query, user, limit) {
		return [];
	}
	async buildAdvancedSearchFilters(query, context) {
		const where = [];
		const joins = [];
		const parameters = {};
		where.push({ id: (0, typeorm_1.In)(context.userWorkflowIds) });
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
		if (query.filters) {
			await this.processAdvancedFilters(query.filters, where, joins, parameters);
		}
		if (query.ranges) {
			this.processAdvancedRanges(query.ranges, where, parameters);
		}
		return { where, joins, parameters };
	}
	async processBooleanClauses(clauses, clauseType, where, joins, parameters) {
		for (const clause of clauses) {
			if (clause.match) {
				const field = Object.keys(clause.match)[0];
				const value = clause.match[field];
				if (field === 'name') {
					const condition = { name: (0, typeorm_1.ILike)(`%${value}%`) };
					if (clauseType === 'mustNot') {
						where.push({ name: (0, typeorm_1.Not)((0, typeorm_1.ILike)(`%${value}%`)) });
					} else {
						where.push(condition);
					}
				} else if (field === 'description') {
					const condition = { description: (0, typeorm_1.ILike)(`%${value}%`) };
					if (clauseType === 'mustNot') {
						where.push({ description: (0, typeorm_1.Not)((0, typeorm_1.ILike)(`%${value}%`)) });
					} else {
						where.push(condition);
					}
				}
			} else if (clause.term) {
				const field = Object.keys(clause.term)[0];
				const value = clause.term[field];
				if (field === 'active') {
					const condition = { active: value };
					if (clauseType === 'mustNot') {
						where.push({ active: (0, typeorm_1.Not)(value) });
					} else {
						where.push(condition);
					}
				} else if (field === 'isArchived') {
					const condition = { isArchived: value };
					if (clauseType === 'mustNot') {
						where.push({ isArchived: (0, typeorm_1.Not)(value) });
					} else {
						where.push(condition);
					}
				}
			} else if (clause.terms) {
				const field = Object.keys(clause.terms)[0];
				const values = clause.terms[field];
				if (field === 'tags.name') {
					if (!joins.includes('workflow.tags')) {
						joins.push('workflow.tags');
					}
					const condition = { tags: { name: (0, typeorm_1.In)(values) } };
					if (clauseType === 'mustNot') {
						where.push({ tags: { name: (0, typeorm_1.Not)((0, typeorm_1.In)(values)) } });
					} else {
						where.push(condition);
					}
				}
			}
		}
	}
	async processAdvancedFilters(filters, where, joins, parameters) {
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
						where.push({ tags: { name: (0, typeorm_1.In)(value) } });
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
						where.push({ parentFolder: (0, typeorm_1.IsNull)() });
					} else if (typeof value === 'string') {
						where.push({ parentFolder: { id: value } });
					}
					break;
			}
		});
	}
	processAdvancedRanges(ranges, where, parameters) {
		Object.entries(ranges).forEach(([field, range]) => {
			if (field === 'createdAt' || field === 'updatedAt') {
				if (range.gte && range.lte) {
					where.push({
						[field]: (0, typeorm_1.Between)(new Date(range.gte), new Date(range.lte)),
					});
				} else if (range.gte) {
					where.push({ [field]: (0, typeorm_1.MoreThan)(new Date(range.gte)) });
				} else if (range.lte) {
					where.push({ [field]: (0, typeorm_1.LessThan)(new Date(range.lte)) });
				}
			}
		});
	}
	async executeAdvancedSearch(filters, query, context) {
		const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');
		if (filters.where.length > 0) {
			filters.where.forEach((condition, index) => {
				if (index === 0) {
					queryBuilder.where(condition);
				} else {
					queryBuilder.andWhere(condition);
				}
			});
		}
		filters.joins.forEach((join) => {
			const [relation, alias] = join.split(' as ');
			queryBuilder.leftJoinAndSelect(relation, alias || relation.split('.')[1]);
		});
		queryBuilder.setParameters(filters.parameters);
		if (query.sort && query.sort.length > 0) {
			query.sort.forEach((sortConfig, index) => {
				const direction = sortConfig.order.toUpperCase();
				if (index === 0) {
					queryBuilder.orderBy(`workflow.${sortConfig.field}`, direction);
				} else {
					queryBuilder.addOrderBy(`workflow.${sortConfig.field}`, direction);
				}
			});
		} else {
			queryBuilder.orderBy('workflow.updatedAt', 'DESC');
		}
		const totalCount = await queryBuilder.getCount();
		const offset = ((query.page || 1) - 1) * (query.limit || 20);
		queryBuilder.skip(offset).take(query.limit || 20);
		const workflows = await queryBuilder.getMany();
		return { workflows, totalCount };
	}
	async processAdvancedSearchResults(workflows, query, context) {
		const results = [];
		for (const workflow of workflows) {
			const resultItem = {
				id: workflow.id,
				name: workflow.name,
				description: workflow.description || undefined,
				active: workflow.active,
				isArchived: workflow.isArchived,
				createdAt: workflow.createdAt.toISOString(),
				updatedAt: workflow.updatedAt.toISOString(),
				projectId: '',
				projectName: '',
				relevanceScore: 1.0,
			};
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
				resultItem.highlights = this.generateAdvancedHighlights(workflow, query);
			}
			this.addWorkflowMetadata(resultItem, workflow);
			results.push(resultItem);
		}
		return results;
	}
	generateAdvancedHighlights(workflow, query) {
		const highlights = {};
		const searchTerms = this.extractSearchTermsFromAdvancedQuery(query);
		if (searchTerms.length === 0) {
			return undefined;
		}
		searchTerms.forEach((term) => {
			if (workflow.name.toLowerCase().includes(term.toLowerCase())) {
				if (!highlights.name) highlights.name = [];
				highlights.name.push(this.highlightText(workflow.name, term));
			}
			if (workflow.description && workflow.description.toLowerCase().includes(term.toLowerCase())) {
				if (!highlights.description) highlights.description = [];
				highlights.description.push(this.highlightText(workflow.description, term));
			}
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
	extractSearchTermsFromAdvancedQuery(query) {
		const terms = [];
		if (query.query) {
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
		return [...new Set(terms)];
	}
	convertAdvancedToBasicQuery(query) {
		return {
			page: query.page,
			limit: query.limit,
			includeStats: query.include?.stats,
			includeContent: query.include?.content,
			includeHighlights: query.include?.highlights,
		};
	}
	countAdvancedFilters(query) {
		let count = 0;
		if (query.query?.must?.length) count += query.query.must.length;
		if (query.query?.should?.length) count += query.query.should.length;
		if (query.query?.mustNot?.length) count += query.query.mustNot.length;
		if (query.filters) count += Object.keys(query.filters).length;
		if (query.ranges) count += Object.keys(query.ranges).length;
		return count;
	}
	createEmptyResponse(query, startTime, totalWorkflows) {
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
};
exports.WorkflowSearchService = WorkflowSearchService;
exports.WorkflowSearchService = WorkflowSearchService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			config_1.GlobalConfig,
			db_1.WorkflowRepository,
			db_1.TagRepository,
			db_1.SharedWorkflowRepository,
			db_1.ExecutionRepository,
			workflow_finder_service_1.WorkflowFinderService,
			project_service_ee_1.ProjectService,
			search_engine_service_1.SearchEngineService,
			workflow_indexing_service_1.WorkflowIndexingService,
		]),
	],
	WorkflowSearchService,
);
//# sourceMappingURL=workflow-search.service.js.map
