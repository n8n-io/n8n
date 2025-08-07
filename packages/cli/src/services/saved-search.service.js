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
exports.SavedSearchService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const saved_search_1 = require('@n8n/db/src/entities/saved-search');
let SavedSearchService = class SavedSearchService {
	constructor(logger, savedSearchRepository) {
		this.logger = logger;
		this.savedSearchRepository = savedSearchRepository;
	}
	async createSavedSearch(createDto, user) {
		this.logger.debug('Creating saved search', {
			userId: user.id,
			name: createDto.name,
		});
		const existing = await this.savedSearchRepository.findByUserIdAndName(user.id, createDto.name);
		if (existing) {
			throw new n8n_workflow_1.ApplicationError('A saved search with this name already exists', {
				extra: { name: createDto.name },
			});
		}
		try {
			const savedSearch = new saved_search_1.SavedSearch();
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
			throw new n8n_workflow_1.ApplicationError('Failed to create saved search', {
				cause: error,
				extra: { userId: user.id, name: createDto.name },
			});
		}
	}
	async getSavedSearches(user, options = {}) {
		const { page = 1, limit = 20, includePublic = true } = options;
		this.logger.debug('Getting saved searches', {
			userId: user.id,
			page,
			limit,
			includePublic,
		});
		try {
			const userSearches = await this.savedSearchRepository.findByUserId(user.id, {
				take: limit,
				skip: (page - 1) * limit,
			});
			let allSearches = userSearches;
			if (includePublic) {
				const publicSearches = await this.savedSearchRepository.findPublicSearches({
					where: { userId: { $ne: user.id } },
					take: Math.max(0, limit - userSearches.length),
				});
				allSearches = [...userSearches, ...publicSearches];
			}
			const totalCount = await this.savedSearchRepository.count({
				where: includePublic ? [{ userId: user.id }, { isPublic: true }] : { userId: user.id },
			});
			const totalPages = Math.ceil(totalCount / limit);
			const response = {
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
			throw new n8n_workflow_1.ApplicationError('Failed to retrieve saved searches', {
				cause: error,
				extra: { userId: user.id },
			});
		}
	}
	async getSavedSearchById(id, user) {
		this.logger.debug('Getting saved search by ID', {
			userId: user.id,
			savedSearchId: id,
		});
		try {
			const savedSearch = await this.savedSearchRepository.findOne({
				where: { id },
			});
			if (!savedSearch) {
				throw new n8n_workflow_1.ApplicationError('Saved search not found', {
					extra: { savedSearchId: id },
				});
			}
			if (savedSearch.userId !== user.id && !savedSearch.isPublic) {
				throw new n8n_workflow_1.ApplicationError('Access denied to saved search', {
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError('Failed to retrieve saved search', {
				cause: error,
				extra: { userId: user.id, savedSearchId: id },
			});
		}
	}
	async updateSavedSearch(id, updateDto, user) {
		this.logger.debug('Updating saved search', {
			userId: user.id,
			savedSearchId: id,
		});
		try {
			const savedSearch = await this.savedSearchRepository.findOne({
				where: { id },
			});
			if (!savedSearch) {
				throw new n8n_workflow_1.ApplicationError('Saved search not found', {
					extra: { savedSearchId: id },
				});
			}
			if (savedSearch.userId !== user.id) {
				throw new n8n_workflow_1.ApplicationError(
					'Access denied: only owner can update saved search',
					{
						extra: { savedSearchId: id, userId: user.id },
					},
				);
			}
			if (updateDto.name && updateDto.name !== savedSearch.name) {
				const existing = await this.savedSearchRepository.findByUserIdAndName(
					user.id,
					updateDto.name,
				);
				if (existing && existing.id !== id) {
					throw new n8n_workflow_1.ApplicationError(
						'A saved search with this name already exists',
						{
							extra: { name: updateDto.name },
						},
					);
				}
			}
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError('Failed to update saved search', {
				cause: error,
				extra: { userId: user.id, savedSearchId: id },
			});
		}
	}
	async deleteSavedSearch(id, user) {
		this.logger.debug('Deleting saved search', {
			userId: user.id,
			savedSearchId: id,
		});
		try {
			const savedSearch = await this.savedSearchRepository.findOne({
				where: { id },
			});
			if (!savedSearch) {
				throw new n8n_workflow_1.ApplicationError('Saved search not found', {
					extra: { savedSearchId: id },
				});
			}
			if (savedSearch.userId !== user.id) {
				throw new n8n_workflow_1.ApplicationError(
					'Access denied: only owner can delete saved search',
					{
						extra: { savedSearchId: id, userId: user.id },
					},
				);
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError('Failed to delete saved search', {
				cause: error,
				extra: { userId: user.id, savedSearchId: id },
			});
		}
	}
	async executeSavedSearch(id, user, resultsCount) {
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
			this.logger.warn('Failed to update saved search execution statistics', {
				userId: user.id,
				savedSearchId: id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async getSavedSearch(id, user) {
		return this.getSavedSearchById(id, user);
	}
	async updateExecutionStats(id, user, stats) {
		this.logger.debug('Updating saved search execution stats', {
			userId: user.id,
			savedSearchId: id,
			resultsCount: stats.resultsCount,
		});
		try {
			await this.savedSearchRepository.updateExecutionStats(id, {
				resultsCount: stats.resultsCount,
				lastExecutedAt: new Date().toISOString(),
			});
		} catch (error) {
			this.logger.warn('Failed to update saved search execution statistics', {
				userId: user.id,
				savedSearchId: id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async getSavedSearchStats(user) {
		this.logger.debug('Getting saved search stats', {
			userId: user.id,
		});
		try {
			const userSearches = await this.savedSearchRepository.findByUserId(user.id);
			const publicSearchesCount = await this.savedSearchRepository.count({
				where: { isPublic: true },
			});
			const totalSearches = userSearches.length;
			const pinnedSearches = userSearches.filter((search) => search.isPinned).length;
			const publicUserSearches = userSearches.filter((search) => search.isPublic).length;
			const stats = {
				totalUserSearches: totalSearches,
				totalPinnedSearches: pinnedSearches,
				totalPublicUserSearches: publicUserSearches,
				totalPublicSearches: publicSearchesCount,
				mostRecentSearch: userSearches.length > 0 ? userSearches[0].createdAt.toISOString() : null,
			};
			this.logger.debug('Saved search stats retrieved successfully', {
				userId: user.id,
				stats,
			});
			return stats;
		} catch (error) {
			this.logger.error('Failed to get saved search stats', {
				userId: user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError('Failed to retrieve saved search statistics', {
				cause: error,
				extra: { userId: user.id },
			});
		}
	}
	mapToDto(savedSearch) {
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
};
exports.SavedSearchService = SavedSearchService;
exports.SavedSearchService = SavedSearchService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [backend_common_1.Logger, db_1.SavedSearchRepository]),
	],
	SavedSearchService,
);
//# sourceMappingURL=saved-search.service.js.map
