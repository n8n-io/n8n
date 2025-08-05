import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { SavedSearchRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	CreateSavedSearchDto,
	UpdateSavedSearchDto,
	SavedSearchDto,
	SavedSearchListResponseDto,
} from '@n8n/api-types';
import { ApplicationError } from 'n8n-workflow';

import { SavedSearch } from '@n8n/db/src/entities/saved-search';

@Service()
export class SavedSearchService {
	constructor(
		private readonly logger: Logger,
		private readonly savedSearchRepository: SavedSearchRepository,
	) {}

	/**
	 * Create a new saved search
	 */
	async createSavedSearch(createDto: CreateSavedSearchDto, user: User): Promise<SavedSearchDto> {
		this.logger.debug('Creating saved search', {
			userId: user.id,
			name: createDto.name,
		});

		// Check if user already has a saved search with this name
		const existing = await this.savedSearchRepository.findByUserIdAndName(user.id, createDto.name);
		if (existing) {
			throw new ApplicationError('A saved search with this name already exists', {
				extra: { name: createDto.name },
			});
		}

		try {
			const savedSearch = new SavedSearch();
			savedSearch.name = createDto.name;
			savedSearch.description = createDto.description;
			savedSearch.query = createDto.query;
			savedSearch.isPublic = createDto.isPublic ?? false;
			savedSearch.isPinned = createDto.isPinned ?? false;
			savedSearch.userId = user.id;
			savedSearch.user = user;

			if (createDto.tags) {
				savedSearch.metadata = {
					tags: createDto.tags,
				};
			}

			const created = await this.savedSearchRepository.save(savedSearch);

			this.logger.debug('Saved search created successfully', {
				userId: user.id,
				savedSearchId: created.id,
				name: created.name,
			});

			return this.mapToDto(created);
		} catch (error) {
			this.logger.error('Failed to create saved search', {
				userId: user.id,
				name: createDto.name,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new ApplicationError('Failed to create saved search', {
				cause: error,
				extra: { userId: user.id, name: createDto.name },
			});
		}
	}

	/**
	 * Get saved searches for a user
	 */
	async getSavedSearches(
		user: User,
		options: { page?: number; limit?: number; includePublic?: boolean } = {},
	): Promise<SavedSearchListResponseDto> {
		const { page = 1, limit = 20, includePublic = true } = options;

		this.logger.debug('Getting saved searches', {
			userId: user.id,
			page,
			limit,
			includePublic,
		});

		try {
			// Get user's own searches
			const userSearches = await this.savedSearchRepository.findByUserId(user.id, {
				take: limit,
				skip: (page - 1) * limit,
			});

			let allSearches = userSearches;

			// Optionally include public searches from other users
			if (includePublic) {
				const publicSearches = await this.savedSearchRepository.findPublicSearches({
					where: { userId: { $ne: user.id } } as any,
					take: Math.max(0, limit - userSearches.length),
				});
				allSearches = [...userSearches, ...publicSearches];
			}

			// Get total count for pagination
			const totalCount = await this.savedSearchRepository.count({
				where: includePublic ? [{ userId: user.id }, { isPublic: true }] : { userId: user.id },
			});

			const totalPages = Math.ceil(totalCount / limit);

			const response: SavedSearchListResponseDto = {
				searches: allSearches.map((search) => this.mapToDto(search)),
				pagination: {
					page,
					limit,
					total: totalCount,
					totalPages,
					hasNext: page < totalPages,
					hasPrev: page > 1,
				},
			};

			this.logger.debug('Saved searches retrieved successfully', {
				userId: user.id,
				count: allSearches.length,
				totalCount,
			});

			return response;
		} catch (error) {
			this.logger.error('Failed to get saved searches', {
				userId: user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new ApplicationError('Failed to retrieve saved searches', {
				cause: error,
				extra: { userId: user.id },
			});
		}
	}

	/**
	 * Get a specific saved search by ID
	 */
	async getSavedSearchById(id: string, user: User): Promise<SavedSearchDto> {
		this.logger.debug('Getting saved search by ID', {
			userId: user.id,
			savedSearchId: id,
		});

		try {
			const savedSearch = await this.savedSearchRepository.findOne({
				where: { id },
			});

			if (!savedSearch) {
				throw new ApplicationError('Saved search not found', {
					extra: { savedSearchId: id },
				});
			}

			// Check if user has access to this saved search
			if (savedSearch.userId !== user.id && !savedSearch.isPublic) {
				throw new ApplicationError('Access denied to saved search', {
					extra: { savedSearchId: id, userId: user.id },
				});
			}

			return this.mapToDto(savedSearch);
		} catch (error) {
			this.logger.error('Failed to get saved search', {
				userId: user.id,
				savedSearchId: id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError('Failed to retrieve saved search', {
				cause: error,
				extra: { userId: user.id, savedSearchId: id },
			});
		}
	}

	/**
	 * Update a saved search
	 */
	async updateSavedSearch(
		id: string,
		updateDto: UpdateSavedSearchDto,
		user: User,
	): Promise<SavedSearchDto> {
		this.logger.debug('Updating saved search', {
			userId: user.id,
			savedSearchId: id,
		});

		try {
			const savedSearch = await this.savedSearchRepository.findOne({
				where: { id },
			});

			if (!savedSearch) {
				throw new ApplicationError('Saved search not found', {
					extra: { savedSearchId: id },
				});
			}

			// Only owner can update
			if (savedSearch.userId !== user.id) {
				throw new ApplicationError('Access denied: only owner can update saved search', {
					extra: { savedSearchId: id, userId: user.id },
				});
			}

			// Check for name conflicts if name is being updated
			if (updateDto.name && updateDto.name !== savedSearch.name) {
				const existing = await this.savedSearchRepository.findByUserIdAndName(
					user.id,
					updateDto.name,
				);
				if (existing && existing.id !== id) {
					throw new ApplicationError('A saved search with this name already exists', {
						extra: { name: updateDto.name },
					});
				}
			}

			// Update fields
			if (updateDto.name !== undefined) savedSearch.name = updateDto.name;
			if (updateDto.description !== undefined) savedSearch.description = updateDto.description;
			if (updateDto.query !== undefined) savedSearch.query = updateDto.query;
			if (updateDto.isPublic !== undefined) savedSearch.isPublic = updateDto.isPublic;
			if (updateDto.isPinned !== undefined) savedSearch.isPinned = updateDto.isPinned;

			if (updateDto.tags !== undefined) {
				savedSearch.metadata = {
					...savedSearch.metadata,
					tags: updateDto.tags,
				};
			}

			const updated = await this.savedSearchRepository.save(savedSearch);

			this.logger.debug('Saved search updated successfully', {
				userId: user.id,
				savedSearchId: id,
			});

			return this.mapToDto(updated);
		} catch (error) {
			this.logger.error('Failed to update saved search', {
				userId: user.id,
				savedSearchId: id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError('Failed to update saved search', {
				cause: error,
				extra: { userId: user.id, savedSearchId: id },
			});
		}
	}

	/**
	 * Delete a saved search
	 */
	async deleteSavedSearch(id: string, user: User): Promise<void> {
		this.logger.debug('Deleting saved search', {
			userId: user.id,
			savedSearchId: id,
		});

		try {
			const savedSearch = await this.savedSearchRepository.findOne({
				where: { id },
			});

			if (!savedSearch) {
				throw new ApplicationError('Saved search not found', {
					extra: { savedSearchId: id },
				});
			}

			// Only owner can delete
			if (savedSearch.userId !== user.id) {
				throw new ApplicationError('Access denied: only owner can delete saved search', {
					extra: { savedSearchId: id, userId: user.id },
				});
			}

			await this.savedSearchRepository.remove(savedSearch);

			this.logger.debug('Saved search deleted successfully', {
				userId: user.id,
				savedSearchId: id,
			});
		} catch (error) {
			this.logger.error('Failed to delete saved search', {
				userId: user.id,
				savedSearchId: id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError('Failed to delete saved search', {
				cause: error,
				extra: { userId: user.id, savedSearchId: id },
			});
		}
	}

	/**
	 * Execute a saved search and update its statistics
	 */
	async executeSavedSearch(id: string, user: User, resultsCount: number): Promise<void> {
		this.logger.debug('Recording saved search execution', {
			userId: user.id,
			savedSearchId: id,
			resultsCount,
		});

		try {
			await this.savedSearchRepository.updateExecutionStats(id, {
				resultsCount,
				lastExecutedAt: new Date().toISOString(),
			});
		} catch (error) {
			// Don't fail the search if statistics update fails
			this.logger.warn('Failed to update saved search execution statistics', {
				userId: user.id,
				savedSearchId: id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Map entity to DTO
	 */
	private mapToDto(savedSearch: SavedSearch): SavedSearchDto {
		return {
			id: savedSearch.id,
			name: savedSearch.name,
			description: savedSearch.description,
			query: savedSearch.query,
			metadata: savedSearch.metadata,
			isPublic: savedSearch.isPublic,
			isPinned: savedSearch.isPinned,
			userId: savedSearch.userId,
			createdAt: savedSearch.createdAt.toISOString(),
			updatedAt: savedSearch.updatedAt.toISOString(),
		};
	}
}
