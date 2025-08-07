'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const saved_search_service_1 = require('@/services/saved-search.service');
describe('SavedSearchService', () => {
	const logger = (0, jest_mock_extended_1.mock)();
	const savedSearchRepository = (0, jest_mock_extended_1.mock)();
	let savedSearchService;
	let mockUser;
	let mockSavedSearch;
	beforeEach(() => {
		jest.clearAllMocks();
		savedSearchService = new saved_search_service_1.SavedSearchService(
			logger,
			savedSearchRepository,
		);
		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		};
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
		};
	});
	describe('createSavedSearch', () => {
		it('should create a new saved search successfully', async () => {
			const createDto = {
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
			const result = await savedSearchService.createSavedSearch(createDto, mockUser);
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
			const createDto = {
				name: 'Existing Search',
				query: { query: 'test' },
			};
			savedSearchRepository.findByUserIdAndName.mockResolvedValue(mockSavedSearch);
			await expect(savedSearchService.createSavedSearch(createDto, mockUser)).rejects.toThrow(
				n8n_workflow_1.ApplicationError,
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
			const updateDto = {
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
			const result = await savedSearchService.updateSavedSearch(
				mockSavedSearch.id,
				updateDto,
				mockUser,
			);
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
			const updateDto = { name: 'Updated Name' };
			savedSearchRepository.findOne.mockResolvedValue(null);
			await expect(
				savedSearchService.updateSavedSearch('non-existent-id', updateDto, mockUser),
			).rejects.toThrow(n8n_workflow_1.ApplicationError);
			await expect(
				savedSearchService.updateSavedSearch('non-existent-id', updateDto, mockUser),
			).rejects.toThrow('Saved search not found or access denied');
		});
	});
	describe('deleteSavedSearch', () => {
		it('should delete saved search successfully', async () => {
			savedSearchRepository.findOne.mockResolvedValue(mockSavedSearch);
			savedSearchRepository.remove.mockResolvedValue(mockSavedSearch);
			await savedSearchService.deleteSavedSearch(mockSavedSearch.id, mockUser);
			expect(savedSearchRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockSavedSearch.id, userId: mockUser.id },
			});
			expect(savedSearchRepository.remove).toHaveBeenCalledWith(mockSavedSearch);
		});
		it('should throw error if saved search not found', async () => {
			savedSearchRepository.findOne.mockResolvedValue(null);
			await expect(
				savedSearchService.deleteSavedSearch('non-existent-id', mockUser),
			).rejects.toThrow(n8n_workflow_1.ApplicationError);
			await expect(
				savedSearchService.deleteSavedSearch('non-existent-id', mockUser),
			).rejects.toThrow('Saved search not found or access denied');
		});
	});
	describe('getSavedSearch', () => {
		it('should get saved search by ID successfully', async () => {
			savedSearchRepository.findOne.mockResolvedValue(mockSavedSearch);
			const result = await savedSearchService.getSavedSearch(mockSavedSearch.id, mockUser);
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
			savedSearchRepository.findOne.mockResolvedValue(null);
			await expect(savedSearchService.getSavedSearch('non-existent-id', mockUser)).rejects.toThrow(
				n8n_workflow_1.ApplicationError,
			);
			await expect(savedSearchService.getSavedSearch('non-existent-id', mockUser)).rejects.toThrow(
				'Saved search not found or access denied',
			);
		});
	});
	describe('listSavedSearches', () => {
		it('should list user saved searches successfully', async () => {
			const query = {
				includePublic: false,
				pinnedOnly: false,
				limit: 10,
				offset: 0,
			};
			const mockSavedSearches = [mockSavedSearch];
			savedSearchRepository.findAndCount.mockResolvedValue([mockSavedSearches, 1]);
			const result = await savedSearchService.listSavedSearches(query, mockUser);
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
			const query = {
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
			const result = await savedSearchService.listSavedSearches(query, mockUser);
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
			const result = await savedSearchService.getSavedSearchStats(mockUser);
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
			savedSearchRepository.findByUserId.mockResolvedValue([]);
			const result = await savedSearchService.getSavedSearchStats(mockUser);
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
			savedSearchRepository.findOne.mockResolvedValue(mockSavedSearch);
			savedSearchRepository.updateExecutionStats.mockResolvedValue();
			await savedSearchService.updateExecutionStats(mockSavedSearch.id, mockUser, {
				resultsCount: 15,
			});
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
			savedSearchRepository.findOne.mockResolvedValue(null);
			await expect(
				savedSearchService.updateExecutionStats('non-existent-id', mockUser, {
					resultsCount: 15,
				}),
			).rejects.toThrow(n8n_workflow_1.ApplicationError);
			await expect(
				savedSearchService.updateExecutionStats('non-existent-id', mockUser, {
					resultsCount: 15,
				}),
			).rejects.toThrow('Saved search not found or access denied');
		});
	});
});
//# sourceMappingURL=saved-search.service.test.js.map
