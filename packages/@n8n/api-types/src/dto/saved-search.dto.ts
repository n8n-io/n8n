import { z } from 'zod';

// Create SavedSearch DTO
export const CreateSavedSearchDto = z.object({
	name: z.string().min(1).max(100).describe('Name of the saved search'),

	description: z.string().optional().describe('Optional description of the saved search'),

	query: z.record(z.any()).describe('The search query parameters to save'),

	isPublic: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether the saved search is publicly accessible'),

	isPinned: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether the saved search is pinned for quick access'),

	metadata: z
		.object({
			tags: z.array(z.string()).optional().describe('Tags for categorizing the saved search'),
		})
		.optional()
		.describe('Additional metadata for the saved search'),
});

export type CreateSavedSearchDto = z.infer<typeof CreateSavedSearchDto>;

// Update SavedSearch DTO
export const UpdateSavedSearchDto = z.object({
	name: z.string().min(1).max(100).optional().describe('Updated name of the saved search'),

	description: z.string().optional().describe('Updated description of the saved search'),

	query: z.record(z.any()).optional().describe('Updated search query parameters'),

	isPublic: z.boolean().optional().describe('Updated public accessibility setting'),

	isPinned: z.boolean().optional().describe('Updated pinned status'),

	metadata: z
		.object({
			tags: z
				.array(z.string())
				.optional()
				.describe('Updated tags for categorizing the saved search'),
		})
		.optional()
		.describe('Updated additional metadata for the saved search'),
});

export type UpdateSavedSearchDto = z.infer<typeof UpdateSavedSearchDto>;

// SavedSearch Response DTO
export const SavedSearchResponseDto = z.object({
	id: z.string().describe('Unique identifier of the saved search'),

	name: z.string().describe('Name of the saved search'),

	description: z.string().optional().describe('Description of the saved search'),

	query: z.record(z.any()).describe('The saved search query parameters'),

	isPublic: z.boolean().describe('Whether the saved search is publicly accessible'),

	isPinned: z.boolean().describe('Whether the saved search is pinned for quick access'),

	metadata: z
		.object({
			resultsCount: z.number().optional().describe('Number of results from last execution'),
			lastExecutedAt: z.string().datetime().optional().describe('Timestamp of last execution'),
			executionCount: z
				.number()
				.optional()
				.describe('Total number of times this search was executed'),
			tags: z.array(z.string()).optional().describe('Tags for categorizing the saved search'),
		})
		.optional()
		.describe('Metadata about the saved search'),

	userId: z.string().describe('ID of the user who created this saved search'),

	createdAt: z.string().datetime().describe('Creation timestamp'),

	updatedAt: z.string().datetime().describe('Last update timestamp'),
});

export type SavedSearchResponseDto = z.infer<typeof SavedSearchResponseDto>;

// List SavedSearches Query DTO
export const ListSavedSearchesQueryDto = z.object({
	includePublic: z
		.boolean()
		.optional()
		.default(false)
		.describe('Include public saved searches from other users'),

	pinnedOnly: z.boolean().optional().default(false).describe('Return only pinned saved searches'),

	tags: z.array(z.string()).optional().describe('Filter by tags'),

	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(50)
		.describe('Maximum number of saved searches to return'),

	offset: z
		.number()
		.int()
		.min(0)
		.optional()
		.default(0)
		.describe('Number of saved searches to skip'),
});

export type ListSavedSearchesQueryDto = z.infer<typeof ListSavedSearchesQueryDto>;

// List SavedSearches Response DTO
export const ListSavedSearchesResponseDto = z.object({
	savedSearches: z.array(SavedSearchResponseDto).describe('Array of saved searches'),

	pagination: z
		.object({
			total: z.number().describe('Total number of saved searches'),
			limit: z.number().describe('Number of results per page'),
			offset: z.number().describe('Number of results skipped'),
			hasNext: z.boolean().describe('Whether there are more results'),
		})
		.describe('Pagination information'),
});

export type ListSavedSearchesResponseDto = z.infer<typeof ListSavedSearchesResponseDto>;

// Execute SavedSearch DTO
export const ExecuteSavedSearchDto = z.object({
	page: z.number().int().min(1).optional().default(1).describe('Page number for pagination'),

	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(20)
		.describe('Number of results per page'),

	includeStats: z
		.boolean()
		.optional()
		.default(false)
		.describe('Include execution statistics in results'),

	includeHighlights: z
		.boolean()
		.optional()
		.default(true)
		.describe('Include search term highlights in results'),
});

export type ExecuteSavedSearchDto = z.infer<typeof ExecuteSavedSearchDto>;

// SavedSearch Statistics DTO
export const SavedSearchStatsDto = z.object({
	totalSavedSearches: z.number().describe('Total number of saved searches for the user'),

	pinnedSearches: z.number().describe('Number of pinned saved searches'),

	publicSearches: z.number().describe('Number of public saved searches created by the user'),

	mostUsedSearch: z
		.object({
			id: z.string(),
			name: z.string(),
			executionCount: z.number(),
		})
		.optional()
		.describe('Most frequently executed saved search'),

	recentSearches: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				lastExecutedAt: z.string().datetime(),
			}),
		)
		.describe('Recently executed saved searches'),
});

export type SavedSearchStatsDto = z.infer<typeof SavedSearchStatsDto>;

// Validation functions
export const isValidCreateSavedSearch = (data: unknown): data is CreateSavedSearchDto => {
	return CreateSavedSearchDto.safeParse(data).success;
};

export const isValidUpdateSavedSearch = (data: unknown): data is UpdateSavedSearchDto => {
	return UpdateSavedSearchDto.safeParse(data).success;
};

export const isValidListSavedSearchesQuery = (data: unknown): data is ListSavedSearchesQueryDto => {
	return ListSavedSearchesQueryDto.safeParse(data).success;
};

export const isValidExecuteSavedSearch = (data: unknown): data is ExecuteSavedSearchDto => {
	return ExecuteSavedSearchDto.safeParse(data).success;
};
