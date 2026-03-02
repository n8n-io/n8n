import * as apiUtils from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { getFavorites, addFavorite, removeFavorite } from './favorites';
import type { UserFavorite } from './favorites';

vi.mock('@n8n/rest-api-client');

const mockContext: IRestApiContext = {
	baseUrl: 'http://localhost:5678',
	pushRef: 'test-ref',
} as IRestApiContext;

const makeFavorite = (overrides: Partial<UserFavorite> = {}): UserFavorite => ({
	id: 1,
	userId: 'user-1',
	resourceId: 'res-1',
	resourceType: 'workflow',
	resourceName: 'My Workflow',
	...overrides,
});

describe('favorites API', () => {
	let makeRestApiRequestSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		makeRestApiRequestSpy = vi.spyOn(apiUtils, 'makeRestApiRequest');
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getFavorites()', () => {
		it('should call GET /favorites and return the list', async () => {
			const favorites = [makeFavorite()];
			makeRestApiRequestSpy.mockResolvedValue(favorites);

			const result = await getFavorites(mockContext);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(mockContext, 'GET', '/favorites');
			expect(result).toEqual(favorites);
		});

		it('should return an empty array when there are no favorites', async () => {
			makeRestApiRequestSpy.mockResolvedValue([]);

			const result = await getFavorites(mockContext);

			expect(result).toEqual([]);
		});
	});

	describe('addFavorite()', () => {
		it('should call POST /favorites with resourceId and resourceType', async () => {
			const newFavorite = makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' });
			makeRestApiRequestSpy.mockResolvedValue(newFavorite);

			const result = await addFavorite(mockContext, 'wf-1', 'workflow');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(mockContext, 'POST', '/favorites', {
				resourceId: 'wf-1',
				resourceType: 'workflow',
			});
			expect(result).toEqual(newFavorite);
		});

		it('should work with project resource type', async () => {
			const newFavorite = makeFavorite({ resourceId: 'proj-1', resourceType: 'project' });
			makeRestApiRequestSpy.mockResolvedValue(newFavorite);

			const result = await addFavorite(mockContext, 'proj-1', 'project');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(mockContext, 'POST', '/favorites', {
				resourceId: 'proj-1',
				resourceType: 'project',
			});
			expect(result).toEqual(newFavorite);
		});

		it('should work with dataTable resource type', async () => {
			const newFavorite = makeFavorite({ resourceId: 'dt-1', resourceType: 'dataTable' });
			makeRestApiRequestSpy.mockResolvedValue(newFavorite);

			const result = await addFavorite(mockContext, 'dt-1', 'dataTable');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(mockContext, 'POST', '/favorites', {
				resourceId: 'dt-1',
				resourceType: 'dataTable',
			});
			expect(result).toEqual(newFavorite);
		});

		it('should work with folder resource type', async () => {
			const newFavorite = makeFavorite({ resourceId: 'folder-1', resourceType: 'folder' });
			makeRestApiRequestSpy.mockResolvedValue(newFavorite);

			const result = await addFavorite(mockContext, 'folder-1', 'folder');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(mockContext, 'POST', '/favorites', {
				resourceId: 'folder-1',
				resourceType: 'folder',
			});
			expect(result).toEqual(newFavorite);
		});
	});

	describe('removeFavorite()', () => {
		it('should call DELETE /favorites/:resourceType/:resourceId', async () => {
			makeRestApiRequestSpy.mockResolvedValue(undefined);

			await removeFavorite(mockContext, 'wf-1', 'workflow');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'DELETE',
				'/favorites/workflow/wf-1',
			);
		});

		it('should work with project resource type', async () => {
			makeRestApiRequestSpy.mockResolvedValue(undefined);

			await removeFavorite(mockContext, 'proj-1', 'project');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'DELETE',
				'/favorites/project/proj-1',
			);
		});

		it('should work with dataTable resource type', async () => {
			makeRestApiRequestSpy.mockResolvedValue(undefined);

			await removeFavorite(mockContext, 'dt-1', 'dataTable');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'DELETE',
				'/favorites/dataTable/dt-1',
			);
		});

		it('should work with folder resource type', async () => {
			makeRestApiRequestSpy.mockResolvedValue(undefined);

			await removeFavorite(mockContext, 'folder-1', 'folder');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'DELETE',
				'/favorites/folder/folder-1',
			);
		});
	});
});
