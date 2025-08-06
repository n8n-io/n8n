import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { SavedSearchRepository } from '@n8n/db';
import type {
	CreateSavedSearchDto,
	UpdateSavedSearchDto,
	ListSavedSearchesQueryDto,
} from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import { ApplicationError } from 'n8n-workflow';

import { SavedSearchService } from '@/services/saved-search.service';
import type { SavedSearch } from '@n8n/db/src/entities/saved-search';

describe('SavedSearchService', () => {
	const logger = mock<Logger>();
	const savedSearchRepository = mock<SavedSearchRepository>();

	let savedSearchService: SavedSearchService;
	let mockUser: User;
	let mockSavedSearch: SavedSearch;

	beforeEach(() => {
		jest.clearAllMocks();

		savedSearchService = new SavedSearchService(logger, savedSearchRepository);

		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		} as User;

		mockSavedSearch = {
			id: 'saved-search-123',
			name: 'My Saved Search',
			description: 'A test saved search',
			query: { query: 'test', active: true },
			isPublic: false,
			isPinned: false,
			metadata: {
				resultsCount: 10,
				executionCount: 5,
				lastExecutedAt: '2023-12-01T10:00:00Z',
				tags: ['test'],
			},
			userId: mockUser.id,
			user: mockUser,
			createdAt: new Date('2023-12-01T09:00:00Z'),
			updatedAt: new Date('2023-12-01T10:00:00Z'),
		} as SavedSearch;
	});

	describe('createSavedSearch', () => {
		it('should create a new saved search successfully', async () => {
			// Arrange
			const createDto: CreateSavedSearchDto = {
				name: 'My Saved Search',
				description: 'A test saved search',
				query: { query: 'test', active: true },
				isPublic: false,
				isPinned: false,
				metadata: {
					tags: ['test'],
				},
			};

			savedSearchRepository.findByUserIdAndName.mockResolvedValue(null);
			savedSearchRepository.create.mockReturnValue(mockSavedSearch);
			savedSearchRepository.save.mockResolvedValue(mockSavedSearch);

			// Act
			const result = await savedSearchService.createSavedSearch(createDto, mockUser);

			// Assert
			expect(savedSearchRepository.findByUserIdAndName).toHaveBeenCalledWith(
				mockUser.id,
				createDto.name,
			);
			expect(savedSearchRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: createDto.name,
					description: createDto.description,
					query: createDto.query,
					isPublic: false,
					isPinned: false,
					userId: mockUser.id,
					user: mockUser,
				}),
			);
			expect(savedSearchRepository.save).toHaveBeenCalledWith(mockSavedSearch);

			expect(result).toEqual({
				id: mockSavedSearch.id,
				name: mockSavedSearch.name,
				description: mockSavedSearch.description,
				query: mockSavedSearch.query,
				isPublic: mockSavedSearch.isPublic,
				isPinned: mockSavedSearch.isPinned,
				metadata: mockSavedSearch.metadata,
				userId: mockSavedSearch.userId,
				createdAt: mockSavedSearch.createdAt.toISOString(),
				updatedAt: mockSavedSearch.updatedAt.toISOString(),
			});
		});

		it('should throw error if saved search with same name already exists', async () => {
			// Arrange
			const createDto: CreateSavedSearchDto = {
				name: 'Existing Search',
				query: { query: 'test' },
			};

			savedSearchRepository.findByUserIdAndName.mockResolvedValue(mockSavedSearch);

			// Act & Assert
			await expect(savedSearchService.createSavedSearch(createDto, mockUser)).rejects.toThrow(
				ApplicationError,
			);
			await expect(savedSearchService.createSavedSearch(createDto, mockUser)).rejects.toThrow(
				'A saved search with the name "Existing Search" already exists',
			);

			expect(savedSearchRepository.findByUserIdAndName).toHaveBeenCalledWith(
				mockUser.id,
				createDto.name,
			);
			expect(savedSearchRepository.create).not.toHaveBeenCalled();
		});
	});

	describe('updateSavedSearch', () => {
		it('should update an existing saved search successfully', async () => {
			// Arrange
			const updateDto: UpdateSavedSearchDto = {
				name: 'Updated Search Name',
				description: 'Updated description',
				isPinned: true,
			};

			const updatedSavedSearch = {
				...mockSavedSearch,
				name: updateDto.name,
				description: updateDto.description,
				isPinned: updateDto.isPinned,
			};

			savedSearchRepository.findOne.mockResolvedValue(mockSavedSearch);
			savedSearchRepository.findByUserIdAndName.mockResolvedValue(null);
			savedSearchRepository.save.mockResolvedValue(updatedSavedSearch);

			// Act
			const result = await savedSearchService.updateSavedSearch(
				mockSavedSearch.id,
				updateDto,
				mockUser,
			);

			// Assert
			expect(savedSearchRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockSavedSearch.id, userId: mockUser.id },
			});
			expect(savedSearchRepository.findByUserIdAndName).toHaveBeenCalledWith(
				mockUser.id,
				updateDto.name,
			);
			expect(savedSearchRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: updateDto.name,
					description: updateDto.description,
					isPinned: updateDto.isPinned,
				}),
			);

			expect(result.name).toBe(updateDto.name);
			expect(result.description).toBe(updateDto.description);
			expect(result.isPinned).toBe(updateDto.isPinned);
		});

		it('should throw error if saved search not found', async () => {
			// Arrange
			const updateDto: UpdateSavedSearchDto = { name: 'Updated Name' };

			savedSearchRepository.findOne.mockResolvedValue(null);

			// Act & Assert
			await expect(
				savedSearchService.updateSavedSearch('non-existent-id', updateDto, mockUser),
			).rejects.toThrow(ApplicationError);
			await expect(
				savedSearchService.updateSavedSearch('non-existent-id', updateDto, mockUser),
			).rejects.toThrow('Saved search not found or access denied');
		});
	});

	describe('deleteSavedSearch', () => {
		it('should delete saved search successfully', async () => {
			// Arrange
			savedSearchRepository.findOne.mockResolvedValue(mockSavedSearch);
			savedSearchRepository.remove.mockResolvedValue(mockSavedSearch);

			// Act
			await savedSearchService.deleteSavedSearch(mockSavedSearch.id, mockUser);

			// Assert
			expect(savedSearchRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockSavedSearch.id, userId: mockUser.id },
			});
			expect(savedSearchRepository.remove).toHaveBeenCalledWith(mockSavedSearch);
		});

		it('should throw error if saved search not found', async () => {
			// Arrange
			savedSearchRepository.findOne.mockResolvedValue(null);

			// Act & Assert
			await expect(
				savedSearchService.deleteSavedSearch('non-existent-id', mockUser),
			).rejects.toThrow(ApplicationError);
			await expect(
				savedSearchService.deleteSavedSearch('non-existent-id', mockUser),
			).rejects.toThrow('Saved search not found or access denied');
		});
	});

	describe('getSavedSearch', () => {
		it('should get saved search by ID successfully', async () => {
			// Arrange
			savedSearchRepository.findOne.mockResolvedValue(mockSavedSearch);

			// Act
			const result = await savedSearchService.getSavedSearch(mockSavedSearch.id, mockUser);

			// Assert
			expect(savedSearchRepository.findOne).toHaveBeenCalledWith({
				where: [
					{ id: mockSavedSearch.id, userId: mockUser.id },
					{ id: mockSavedSearch.id, isPublic: true },
				],
			});

			expect(result).toEqual({
				id: mockSavedSearch.id,
				name: mockSavedSearch.name,
				description: mockSavedSearch.description,
				query: mockSavedSearch.query,
				isPublic: mockSavedSearch.isPublic,
				isPinned: mockSavedSearch.isPinned,
				metadata: mockSavedSearch.metadata,
				userId: mockSavedSearch.userId,
				createdAt: mockSavedSearch.createdAt.toISOString(),
				updatedAt: mockSavedSearch.updatedAt.toISOString(),
			});
		});

		it('should throw error if saved search not found or not accessible', async () => {
			// Arrange
			savedSearchRepository.findOne.mockResolvedValue(null);

			// Act & Assert
			await expect(savedSearchService.getSavedSearch('non-existent-id', mockUser)).rejects.toThrow(
				ApplicationError,
			);
			await expect(savedSearchService.getSavedSearch('non-existent-id', mockUser)).rejects.toThrow(
				'Saved search not found or access denied',
			);
		});
	});

	describe('listSavedSearches', () => {
		it('should list user saved searches successfully', async () => {
			// Arrange
			const query: ListSavedSearchesQueryDto = {
				includePublic: false,
				pinnedOnly: false,
				limit: 10,
				offset: 0,
			};

			const mockSavedSearches = [mockSavedSearch];
			savedSearchRepository.findAndCount.mockResolvedValue([mockSavedSearches, 1]);

			// Act
			const result = await savedSearchService.listSavedSearches(query, mockUser);

			// Assert
			expect(savedSearchRepository.findAndCount).toHaveBeenCalledWith({
				where: [{ userId: mockUser.id }],
				order: {
					isPinned: 'DESC',
					updatedAt: 'DESC',
				},
				skip: query.offset,
				take: query.limit,
			});

			expect(result).toEqual({
				savedSearches: [
					{
						id: mockSavedSearch.id,
						name: mockSavedSearch.name,
						description: mockSavedSearch.description,
						query: mockSavedSearch.query,
						isPublic: mockSavedSearch.isPublic,
						isPinned: mockSavedSearch.isPinned,
						metadata: mockSavedSearch.metadata,
						userId: mockSavedSearch.userId,
						createdAt: mockSavedSearch.createdAt.toISOString(),
						updatedAt: mockSavedSearch.updatedAt.toISOString(),
					},
				],
				pagination: {
					total: 1,
					limit: query.limit,
					offset: query.offset,
					hasNext: false,
				},
			});
		});

		it('should include public searches when requested', async () => {
			// Arrange
			const query: ListSavedSearchesQueryDto = {
				includePublic: true,
				pinnedOnly: false,
				limit: 10,
				offset: 0,
			};

			const publicSavedSearch = {
				...mockSavedSearch,
				id: 'public-search-123',
				name: 'Public Search',
				isPublic: true,
				userId: 'other-user-id',
			};

			const mockSavedSearches = [mockSavedSearch, publicSavedSearch];
			savedSearchRepository.findAndCount.mockResolvedValue([mockSavedSearches, 2]);

			// Act
			const result = await savedSearchService.listSavedSearches(query, mockUser);

			// Assert
			expect(savedSearchRepository.findAndCount).toHaveBeenCalledWith({
				where: [{ userId: mockUser.id }, { isPublic: true, userId: { $ne: mockUser.id } }],
				order: {
					isPinned: 'DESC',
					updatedAt: 'DESC',
				},
				skip: query.offset,
				take: query.limit,
			});

			expect(result.savedSearches).toHaveLength(2);
			expect(result.pagination.total).toBe(2);
		});
	});

	describe('getSavedSearchStats', () => {
		it('should get saved search statistics successfully', async () => {
			// Arrange
			const mockUserSearches = [
				mockSavedSearch,
				{
					...mockSavedSearch,
					id: 'pinned-search',
					name: 'Pinned Search',
					isPinned: true,
					isPublic: true,
				},
			];

			savedSearchRepository.findByUserId.mockResolvedValue(mockUserSearches);

			// Act
			const result = await savedSearchService.getSavedSearchStats(mockUser);

			// Assert
			expect(savedSearchRepository.findByUserId).toHaveBeenCalledWith(mockUser.id);

			expect(result).toEqual({
				totalSavedSearches: 2,
				pinnedSearches: 1,
				publicSearches: 1,
				mostUsedSearch: {
					id: mockSavedSearch.id,
					name: mockSavedSearch.name,
					executionCount: 5,
				},
				recentSearches: [
					{
						id: mockSavedSearch.id,
						name: mockSavedSearch.name,
						lastExecutedAt: '2023-12-01T10:00:00Z',
					},
				],
			});
		});

		it('should handle empty statistics', async () => {
			// Arrange
			savedSearchRepository.findByUserId.mockResolvedValue([]);

			// Act
			const result = await savedSearchService.getSavedSearchStats(mockUser);

			// Assert
			expect(result).toEqual({
				totalSavedSearches: 0,
				pinnedSearches: 0,
				publicSearches: 0,
				mostUsedSearch: undefined,
				recentSearches: [],
			});
		});
	});

	describe('updateExecutionStats', () => {
		it('should update execution statistics successfully', async () => {
			// Arrange
			savedSearchRepository.findOne.mockResolvedValue(mockSavedSearch);
			savedSearchRepository.updateExecutionStats.mockResolvedValue();

			// Act
			await savedSearchService.updateExecutionStats(mockSavedSearch.id, mockUser, {
				resultsCount: 15,
			});

			// Assert
			expect(savedSearchRepository.findOne).toHaveBeenCalledWith({
				where: [
					{ id: mockSavedSearch.id, userId: mockUser.id },
					{ id: mockSavedSearch.id, isPublic: true },
				],
			});
			expect(savedSearchRepository.updateExecutionStats).toHaveBeenCalledWith(mockSavedSearch.id, {
				resultsCount: 15,
				lastExecutedAt: expect.any(String),
			});
		});

		it('should throw error if saved search not found or not accessible', async () => {
			// Arrange
			savedSearchRepository.findOne.mockResolvedValue(null);

			// Act & Assert
			await expect(
				savedSearchService.updateExecutionStats('non-existent-id', mockUser, {
					resultsCount: 15,
				}),
			).rejects.toThrow(ApplicationError);
			await expect(
				savedSearchService.updateExecutionStats('non-existent-id', mockUser, {
					resultsCount: 15,
				}),
			).rejects.toThrow('Saved search not found or access denied');
		});
	});
});
