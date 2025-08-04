import { z } from 'zod';

// Search Query Parameters DTO
export const WorkflowSearchQueryDto = z.object({
	// Full-text search across workflow content
	query: z
		.string()
		.optional()
		.describe('Full-text search query across workflow name, description, and node content'),

	// Advanced search options
	searchIn: z
		.array(z.enum(['name', 'description', 'nodes', 'tags', 'all']))
		.optional()
		.default(['all'])
		.describe('Fields to search in'),

	// Filters
	active: z.boolean().optional().describe('Filter by workflow active status'),
	tags: z.array(z.string()).optional().describe('Filter by tag names (AND operation)'),
	nodeTypes: z
		.array(z.string())
		.optional()
		.describe('Filter workflows containing specific node types'),
	createdBy: z.string().optional().describe('Filter by creator user ID'),
	projectId: z.string().optional().describe('Filter by project ID'),
	folderId: z.string().optional().describe('Filter by folder ID'),
	isArchived: z.boolean().optional().describe('Filter by archived status'),

	// Date range filters
	createdAfter: z
		.string()
		.datetime()
		.optional()
		.describe('Filter workflows created after this date'),
	createdBefore: z
		.string()
		.datetime()
		.optional()
		.describe('Filter workflows created before this date'),
	updatedAfter: z
		.string()
		.datetime()
		.optional()
		.describe('Filter workflows updated after this date'),
	updatedBefore: z
		.string()
		.datetime()
		.optional()
		.describe('Filter workflows updated before this date'),

	// Advanced filters
	hasWebhooks: z.boolean().optional().describe('Filter workflows that have webhook triggers'),
	hasCronTriggers: z.boolean().optional().describe('Filter workflows that have cron triggers'),
	executionCount: z
		.object({
			min: z.number().optional(),
			max: z.number().optional(),
		})
		.optional()
		.describe('Filter by execution count range'),

	// Search behavior options
	fuzzySearch: z.boolean().optional().default(false).describe('Enable fuzzy/partial matching'),
	caseSensitive: z.boolean().optional().default(false).describe('Enable case-sensitive search'),
	exactMatch: z.boolean().optional().default(false).describe('Require exact phrase matching'),

	// Sorting options
	sortBy: z
		.enum(['name', 'createdAt', 'updatedAt', 'relevance', 'executionCount'])
		.optional()
		.default('relevance')
		.describe('Sort field'),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),

	// Pagination
	page: z.number().int().min(1).optional().default(1).describe('Page number (1-based)'),
	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(20)
		.describe('Number of results per page'),

	// Response options
	includeContent: z
		.boolean()
		.optional()
		.default(false)
		.describe('Include workflow node content in results'),
	includeStats: z.boolean().optional().default(false).describe('Include execution statistics'),
	includeHighlights: z
		.boolean()
		.optional()
		.default(true)
		.describe('Include search term highlights'),
});

export type WorkflowSearchQueryDto = z.infer<typeof WorkflowSearchQueryDto>;

// Search Result Item DTO
export const WorkflowSearchResultItemDto = z.object({
	id: z.string().describe('Workflow ID'),
	name: z.string().describe('Workflow name'),
	description: z.string().optional().describe('Workflow description'),
	active: z.boolean().describe('Whether workflow is active'),
	isArchived: z.boolean().describe('Whether workflow is archived'),

	// Metadata
	createdAt: z.string().datetime().describe('Creation timestamp'),
	updatedAt: z.string().datetime().describe('Last update timestamp'),
	createdBy: z
		.object({
			id: z.string(),
			firstName: z.string().optional(),
			lastName: z.string().optional(),
			email: z.string(),
		})
		.optional()
		.describe('Creator information'),

	// Project and folder info
	projectId: z.string().describe('Project ID'),
	projectName: z.string().describe('Project name'),
	folderId: z.string().optional().describe('Parent folder ID'),
	folderName: z.string().optional().describe('Parent folder name'),

	// Tags
	tags: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
			}),
		)
		.optional()
		.describe('Workflow tags'),

	// Node information
	nodeTypes: z.array(z.string()).optional().describe('Unique node types used in workflow'),
	nodeCount: z.number().optional().describe('Total number of nodes'),

	// Search relevance and highlights
	relevanceScore: z.number().optional().describe('Search relevance score (0-1)'),
	highlights: z
		.object({
			name: z.array(z.string()).optional(),
			description: z.array(z.string()).optional(),
			nodeContent: z.array(z.string()).optional(),
			tags: z.array(z.string()).optional(),
		})
		.optional()
		.describe('Highlighted search matches'),

	// Execution statistics (optional)
	stats: z
		.object({
			totalExecutions: z.number(),
			successfulExecutions: z.number(),
			failedExecutions: z.number(),
			lastExecutedAt: z.string().datetime().optional(),
			avgExecutionTime: z.number().optional(),
		})
		.optional()
		.describe('Execution statistics'),

	// Workflow content (optional, for detailed results)
	content: z
		.object({
			nodes: z.array(z.any()).optional(),
			connections: z.any().optional(),
			settings: z.any().optional(),
		})
		.optional()
		.describe('Workflow definition content'),
});

export type WorkflowSearchResultItemDto = z.infer<typeof WorkflowSearchResultItemDto>;

// Search Response DTO
export const WorkflowSearchResponseDto = z.object({
	results: z.array(WorkflowSearchResultItemDto).describe('Search results'),

	// Pagination info
	pagination: z
		.object({
			page: z.number().describe('Current page number'),
			limit: z.number().describe('Results per page'),
			total: z.number().describe('Total number of matching workflows'),
			totalPages: z.number().describe('Total number of pages'),
			hasNext: z.boolean().describe('Whether there are more pages'),
			hasPrev: z.boolean().describe('Whether there are previous pages'),
		})
		.describe('Pagination information'),

	// Query info
	query: z
		.object({
			searchQuery: z.string().optional(),
			appliedFilters: z.record(z.any()),
			searchIn: z.array(z.string()),
			sortBy: z.string(),
			sortOrder: z.string(),
		})
		.describe('Applied query parameters'),

	// Search metadata
	metadata: z
		.object({
			searchTimeMs: z.number().describe('Search execution time in milliseconds'),
			searchedAt: z.string().datetime().describe('Search timestamp'),
			totalWorkflowsInScope: z.number().describe('Total workflows user has access to'),
			filtersApplied: z.number().describe('Number of filters applied'),
		})
		.describe('Search execution metadata'),

	// Facets/aggregations for filtering UI
	facets: z
		.object({
			tags: z
				.array(
					z.object({
						name: z.string(),
						count: z.number(),
					}),
				)
				.optional(),
			nodeTypes: z
				.array(
					z.object({
						type: z.string(),
						count: z.number(),
					}),
				)
				.optional(),
			projects: z
				.array(
					z.object({
						id: z.string(),
						name: z.string(),
						count: z.number(),
					}),
				)
				.optional(),
			folders: z
				.array(
					z.object({
						id: z.string(),
						name: z.string(),
						count: z.number(),
					}),
				)
				.optional(),
			activeStatus: z
				.object({
					active: z.number(),
					inactive: z.number(),
				})
				.optional(),
		})
		.optional()
		.describe('Faceted search results for filter suggestions'),
});

export type WorkflowSearchResponseDto = z.infer<typeof WorkflowSearchResponseDto>;

// Advanced Search Request DTO
export const AdvancedWorkflowSearchDto = z.object({
	// Complex query structure
	query: z
		.object({
			// Boolean query structure
			must: z
				.array(
					z.object({
						field: z.enum(['name', 'description', 'nodeContent', 'tags']),
						value: z.string(),
						operator: z
							.enum(['contains', 'equals', 'startsWith', 'endsWith', 'regex'])
							.optional()
							.default('contains'),
					}),
				)
				.optional()
				.describe('Conditions that must match (AND)'),

			should: z
				.array(
					z.object({
						field: z.enum(['name', 'description', 'nodeContent', 'tags']),
						value: z.string(),
						operator: z
							.enum(['contains', 'equals', 'startsWith', 'endsWith', 'regex'])
							.optional()
							.default('contains'),
						boost: z.number().optional().default(1).describe('Relevance boost factor'),
					}),
				)
				.optional()
				.describe('Conditions that should match (OR, affects scoring)'),

			mustNot: z
				.array(
					z.object({
						field: z.enum(['name', 'description', 'nodeContent', 'tags']),
						value: z.string(),
						operator: z
							.enum(['contains', 'equals', 'startsWith', 'endsWith', 'regex'])
							.optional()
							.default('contains'),
					}),
				)
				.optional()
				.describe('Conditions that must not match (NOT)'),
		})
		.optional(),

	// Range filters
	ranges: z
		.object({
			createdAt: z
				.object({
					from: z.string().datetime().optional(),
					to: z.string().datetime().optional(),
				})
				.optional(),
			updatedAt: z
				.object({
					from: z.string().datetime().optional(),
					to: z.string().datetime().optional(),
				})
				.optional(),
			executionCount: z
				.object({
					from: z.number().optional(),
					to: z.number().optional(),
				})
				.optional(),
			nodeCount: z
				.object({
					from: z.number().optional(),
					to: z.number().optional(),
				})
				.optional(),
		})
		.optional(),

	// Term filters (exact matches)
	filters: z
		.object({
			active: z.boolean().optional(),
			isArchived: z.boolean().optional(),
			tags: z.array(z.string()).optional(),
			nodeTypes: z.array(z.string()).optional(),
			projectIds: z.array(z.string()).optional(),
			folderIds: z.array(z.string()).optional(),
			createdBy: z.array(z.string()).optional(),
		})
		.optional(),

	// Sorting and pagination
	sort: z
		.array(
			z.object({
				field: z.enum(['name', 'createdAt', 'updatedAt', 'relevance', 'executionCount']),
				order: z.enum(['asc', 'desc']).optional().default('desc'),
			}),
		)
		.optional()
		.default([{ field: 'relevance' }]),

	page: z.number().int().min(1).optional().default(1),
	limit: z.number().int().min(1).max(100).optional().default(20),

	// Response options
	include: z
		.object({
			content: z.boolean().optional().default(false),
			stats: z.boolean().optional().default(false),
			highlights: z.boolean().optional().default(true),
			facets: z.boolean().optional().default(false),
		})
		.optional()
		.default({}),
});

export type AdvancedWorkflowSearchDto = z.infer<typeof AdvancedWorkflowSearchDto>;

// Search Suggestions DTO
export const WorkflowSearchSuggestionsDto = z.object({
	query: z.string().min(1).describe('Partial query for suggestions'),
	type: z
		.enum(['workflows', 'tags', 'nodeTypes', 'users'])
		.optional()
		.default('workflows')
		.describe('Type of suggestions to return'),
	limit: z
		.number()
		.int()
		.min(1)
		.max(20)
		.optional()
		.default(10)
		.describe('Maximum number of suggestions'),
});

export type WorkflowSearchSuggestionsDto = z.infer<typeof WorkflowSearchSuggestionsDto>;

export const WorkflowSearchSuggestionsResponseDto = z.object({
	suggestions: z
		.array(
			z.object({
				text: z.string().describe('Suggestion text'),
				type: z.enum(['workflow', 'tag', 'nodeType', 'user']).describe('Suggestion type'),
				count: z.number().optional().describe('Number of items matching this suggestion'),
				metadata: z.record(z.any()).optional().describe('Additional metadata'),
			}),
		)
		.describe('Search suggestions'),

	query: z.string().describe('Original query'),
	type: z.string().describe('Suggestion type requested'),
});

export type WorkflowSearchSuggestionsResponseDto = z.infer<
	typeof WorkflowSearchSuggestionsResponseDto
>;

// Export validation functions
export const isValidWorkflowSearchQuery = (data: unknown): data is WorkflowSearchQueryDto => {
	return WorkflowSearchQueryDto.safeParse(data).success;
};

export const isValidAdvancedWorkflowSearch = (data: unknown): data is AdvancedWorkflowSearchDto => {
	return AdvancedWorkflowSearchDto.safeParse(data).success;
};
