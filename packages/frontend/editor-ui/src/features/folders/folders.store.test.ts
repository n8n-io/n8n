import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { faker } from '@faker-js/faker';

import { useFoldersStore } from './folders.store';
import * as foldersApi from './folders.api';
import type { IUsedCredential } from '@/Interface';
import type { ChangeLocationSearchResponseItem } from './folders.types';
import { useRootStore } from '@n8n/stores/useRootStore';

vi.mock('@/utils/apiUtils', () => ({
	makeRestApiRequest: vi.fn(),
}));

const createFolder = (
	overrides: Partial<ChangeLocationSearchResponseItem> = {},
): ChangeLocationSearchResponseItem => ({
	createdAt: faker.date.recent().toISOString(),
	updatedAt: faker.date.recent().toISOString(),
	id: faker.string.alphanumeric(10),
	name: faker.lorem.words(3),
	tags: [],
	parentFolder: {
		id: faker.string.alphanumeric(10),
		name: faker.lorem.words(2),
		parentFolderId: null,
	},
	workflowCount: 2,
	subFolderCount: 2,
	path: [faker.lorem.word(), faker.lorem.word()],
	...overrides,
});

describe('folders.store', () => {
	let foldersStore: ReturnType<typeof useFoldersStore>;
	let rootStore: ReturnType<typeof useRootStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		rootStore = useRootStore();
		foldersStore = useFoldersStore();
	});

	describe('fetchFoldersAvailableForMove', () => {
		const projectId = faker.string.alphanumeric(10);
		const folderId = faker.string.alphanumeric(10);
		const selectFields = [
			'id',
			'name',
			'createdAt',
			'updatedAt',
			'project',
			'tags',
			'parentFolder',
			'workflowCount',
			'subFolderCount',
			'path',
		];

		it('should fetch folders in a single page, empty filter', async () => {
			const folder = createFolder();
			vi.spyOn(foldersApi, 'getProjectFolders').mockResolvedValue({
				count: 1,
				data: [folder],
			});

			const available = await foldersStore.fetchFoldersAvailableForMove(projectId, folderId);
			expect(available).toEqual([{ ...folder, resource: 'folder' }]);
			expect(foldersApi.getProjectFolders).toHaveBeenCalledTimes(1);
			expect(foldersApi.getProjectFolders).toHaveBeenCalledWith(
				rootStore.restApiContext,
				projectId,
				{
					skip: 0,
					take: 100,
					sortBy: 'updatedAt:desc',
				},
				{
					excludeFolderIdAndDescendants: folderId,
				},
				selectFields,
			);
		});

		it('should fetch folders in a single page with filter', async () => {
			const folder = createFolder({ name: 'Test Folder' });
			vi.spyOn(foldersApi, 'getProjectFolders').mockResolvedValue({
				count: 1,
				data: [folder],
			});

			const available = await foldersStore.fetchFoldersAvailableForMove(projectId, folderId, {
				name: 'Test',
			});
			expect(available).toEqual([{ ...folder, resource: 'folder' }]);
			expect(foldersApi.getProjectFolders).toHaveBeenCalledTimes(1);
			expect(foldersApi.getProjectFolders).toHaveBeenCalledWith(
				rootStore.restApiContext,
				projectId,
				{
					skip: 0,
					take: 100,
					sortBy: 'updatedAt:desc',
				},
				{
					excludeFolderIdAndDescendants: folderId,
					name: 'Test',
				},
				selectFields,
			);
		});

		it('should fetch folders in multiple pages', async () => {
			const folders = Array.from({ length: 150 }, (_, i) =>
				createFolder({ name: `Folder ${i + 1}` }),
			);
			vi.spyOn(foldersApi, 'getProjectFolders')
				.mockResolvedValueOnce({
					count: 150,
					data: folders.slice(0, 100),
				})
				.mockResolvedValueOnce({
					count: 150,
					data: folders.slice(100),
				});

			const available = await foldersStore.fetchFoldersAvailableForMove(projectId, folderId, {
				name: 'Test',
			});

			expect(available).toHaveLength(150);
			expect(foldersApi.getProjectFolders).toHaveBeenCalledTimes(2);
			expect(foldersApi.getProjectFolders).toHaveBeenNthCalledWith(
				1,
				rootStore.restApiContext,
				projectId,
				{
					skip: 0,
					take: 100,
					sortBy: 'updatedAt:desc',
				},
				{
					excludeFolderIdAndDescendants: folderId,
					name: 'Test',
				},
				selectFields,
			);
			expect(foldersApi.getProjectFolders).toHaveBeenNthCalledWith(
				2,
				rootStore.restApiContext,
				projectId,
				{
					skip: 100,
					take: 100,
					sortBy: 'updatedAt:desc',
				},
				{
					excludeFolderIdAndDescendants: folderId,
					name: 'Test',
				},
				selectFields,
			);
		});

		it('should cache the results on breadcrumbs cache', async () => {
			const folder = createFolder();
			vi.spyOn(foldersApi, 'getProjectFolders').mockResolvedValue({
				count: 1,
				data: [folder],
			});

			const available = await foldersStore.fetchFoldersAvailableForMove(projectId, folderId);
			expect(available).toEqual([{ ...folder, resource: 'folder' }]);
			expect(foldersStore.breadcrumbsCache).toEqual({
				[folder.id]: {
					id: folder.id,
					name: folder.name,
					parentFolder: folder.parentFolder?.id,
				},
			});
		});
	});

	describe('fetchFolderUsedCredentials', () => {
		const projectId = faker.string.alphanumeric(10);
		const folderId = faker.string.alphanumeric(10);

		it('should fetch credentials used within a folder', async () => {
			const usedCredential: IUsedCredential = {
				id: faker.string.alphanumeric(10),
				name: faker.lorem.words(2),
				credentialType: faker.lorem.word(),
				currentUserHasAccess: true,
				sharedWithProjects: [],
			};

			vi.spyOn(foldersApi, 'getFolderUsedCredentials').mockResolvedValue([usedCredential]);

			const credentials = await foldersStore.fetchFolderUsedCredentials(projectId, folderId);

			expect(credentials).toEqual([usedCredential]);
			expect(foldersApi.getFolderUsedCredentials).toHaveBeenCalledWith(
				rootStore.restApiContext,
				projectId,
				folderId,
			);
		});
	});
});
