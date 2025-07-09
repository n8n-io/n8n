import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import type {
	ChangeLocationSearchResult,
	FolderCreateResponse,
	FolderShortInfo,
	FolderTreeResponseItem,
	IUsedCredential,
} from '@/Interface';
import * as workflowsApi from '@/api/workflows';
import * as workflowsEEApi from '@/api/workflows.ee';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { DragTarget, DropTarget } from '@/composables/useFolders';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';

const BREADCRUMBS_MIN_LOADING_TIME = 300;

export const useFoldersStore = defineStore(STORES.FOLDERS, () => {
	const rootStore = useRootStore();
	const i18n = useI18n();

	const totalWorkflowCount = ref<number>(0);

	// Resource that is currently being dragged
	const draggedElement = ref<DragTarget | null>(null);
	// Only folders and projects can be drop targets
	const activeDropTarget = ref<DropTarget | null>(null);

	/**
	 * Cache visited folders so we can build breadcrumbs paths without fetching them from the server
	 */
	const breadcrumbsCache = ref<Record<string, FolderShortInfo>>({});

	const cacheFolders = (folders: FolderShortInfo[]) => {
		folders.forEach((folder) => {
			if (!breadcrumbsCache.value[folder.id]) {
				breadcrumbsCache.value[folder.id] = {
					id: folder.id,
					name: folder.name,
					parentFolder: folder.parentFolder,
				};
			}
		});
	};

	const getCachedFolder = (folderId: string) => {
		return breadcrumbsCache.value[folderId];
	};

	async function createFolder(
		name: string,
		projectId: string,
		parentFolderId?: string,
	): Promise<FolderCreateResponse> {
		return await workflowsApi.createFolder(
			rootStore.restApiContext,
			projectId,
			name,
			parentFolderId,
		);
	}

	async function getFolderPath(
		projectId: string,
		folderId: string,
	): Promise<FolderTreeResponseItem[]> {
		const tree = await workflowsApi.getFolderPath(rootStore.restApiContext, projectId, folderId);
		const forCache = extractFoldersForCache(tree);
		cacheFolders(forCache);

		return tree;
	}

	function extractFoldersForCache(
		items: FolderTreeResponseItem[],
		parentFolderId?: string,
	): FolderShortInfo[] {
		let result: FolderShortInfo[] = [];

		items.forEach((item) => {
			// Add current item to result
			result.push({
				id: item.id,
				name: item.name,
				parentFolder: parentFolderId,
			});

			// Process children recursively
			if (item.children && item.children.length > 0) {
				const childFolders = extractFoldersForCache(item.children, item.id);
				result = [...result, ...childFolders];
			}
		});

		return result;
	}

	async function fetchTotalWorkflowsAndFoldersCount(projectId?: string): Promise<number> {
		const { count } = await workflowsApi.getWorkflowsAndFolders(
			rootStore.restApiContext,
			{ projectId, isArchived: false },
			{ skip: 0, take: 1 },
			true,
		);
		totalWorkflowCount.value = count;
		return count;
	}

	const deleteFoldersFromCache = (folderIds: string[]) => {
		folderIds.forEach((folderId) => {
			delete breadcrumbsCache.value[folderId];
		});
	};

	async function deleteFolder(projectId: string, folderId: string, newParentId?: string) {
		await workflowsApi.deleteFolder(rootStore.restApiContext, projectId, folderId, newParentId);
	}

	async function renameFolder(projectId: string, folderId: string, name: string) {
		await workflowsApi.renameFolder(rootStore.restApiContext, projectId, folderId, name);
	}

	async function fetchProjectFolders(projectId: string) {
		return await workflowsApi.getProjectFolders(rootStore.restApiContext, projectId);
	}

	async function fetchFoldersAvailableForMove(
		projectId: string,
		folderId?: string,
		filter?: {
			name?: string;
		},
	): Promise<ChangeLocationSearchResult[]> {
		const PAGE_SIZE = 100;
		let skip = 0;
		let totalAvailable = 0;
		let allFolders: ChangeLocationSearchResult[] = [];

		do {
			const { data: folders, count } = await workflowsApi.getProjectFolders(
				rootStore.restApiContext,
				projectId,
				{
					skip,
					take: PAGE_SIZE,
					sortBy: 'updatedAt:desc',
				},
				{
					excludeFolderIdAndDescendants: folderId,
					name: filter?.name,
				},
				[
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
				],
			);

			allFolders = allFolders.concat(
				folders.map((folder) => ({
					...folder,
					resource: 'folder',
				})),
			);
			totalAvailable = count;
			skip += folders.length;
		} while (allFolders.length < totalAvailable && skip < totalAvailable);

		const forCache: FolderShortInfo[] = allFolders.map((folder) => ({
			id: folder.id,
			name: folder.name,
			parentFolder: folder.parentFolder?.id,
		}));
		cacheFolders(forCache);

		allFolders.sort((a, b) => {
			// Shorter paths first
			if (a.path.length !== b.path.length) return a.path.length - b.path.length;

			for (let i = 0; i < a.path.length; i++) {
				// Each segment of the path is compared
				const cmp = a.path[i].localeCompare(b.path[i]);
				if (cmp !== 0) return cmp;
			}

			return 0;
		});

		return allFolders;
	}

	async function fetchFolderUsedCredentials(
		projectId: string,
		folderId: string,
	): Promise<IUsedCredential[]> {
		const usedCredentials = await workflowsApi.getFolderUsedCredentials(
			rootStore.restApiContext,
			projectId,
			folderId,
		);

		return usedCredentials;
	}

	async function moveFolder(
		projectId: string,
		folderId: string,
		parentFolderId?: string,
	): Promise<void> {
		await workflowsApi.moveFolder(rootStore.restApiContext, projectId, folderId, parentFolderId);
		// Update the cache after moving the folder
		delete breadcrumbsCache.value[folderId];
	}

	async function moveFolderToProject(
		projectId: string,
		folderId: string,
		destinationProjectId: string,
		destinationParentFolderId?: string,
		shareCredentials?: string[],
	): Promise<void> {
		await workflowsEEApi.moveFolderToProject(
			rootStore.restApiContext,
			projectId,
			folderId,
			destinationProjectId,
			destinationParentFolderId,
			shareCredentials,
		);

		// Update the cache after moving the folder
		delete breadcrumbsCache.value[folderId];
	}

	async function fetchFolderContent(
		projectId: string,
		folderId: string,
	): Promise<{ totalWorkflows: number; totalSubFolders: number }> {
		return await workflowsApi.getFolderContent(rootStore.restApiContext, projectId, folderId);
	}

	/**
	 * Fetches the breadcrumbs items for a given folder, excluding the specified folderId.
	 * @param projectId project in which the folder is located
	 * @param folderId folder to get the breadcrumbs for
	 * @returns
	 */
	async function getHiddenBreadcrumbsItems(
		project: { id: string; name: string },
		folderId: string,
		options?: {
			addLinks?: boolean;
		},
	) {
		const startTime = Date.now();
		const path = await getFolderPath(project.id, folderId);

		// Process a folder and all its nested children recursively
		const processFolderWithChildren = (folder: FolderTreeResponseItem): PathItem[] => {
			const result: PathItem[] = [
				{
					id: folder.id,
					label: folder.name,
					href: options?.addLinks
						? `/projects/${project.id}/folders/${folder.id}/workflows`
						: undefined,
				},
			];

			// Process all children and their descendants
			if (folder.children?.length) {
				const childItems = folder.children.flatMap((child) => {
					// Add this child
					const childResult: PathItem[] = [
						{
							id: child.id,
							label: child.name,
							href: options?.addLinks
								? `/projects/${project.id}/folders/${child.id}/workflows`
								: undefined,
						},
					];

					// Add all descendants of this child
					if (child.children?.length) {
						childResult.push(...processFolderWithChildren(child).slice(1));
					}

					return childResult;
				});

				result.push(...childItems);
			}
			return result;
		};

		// Prepare the result
		let result;
		if (path.length === 0) {
			// Even when path is empty, include the project item
			result = [
				{
					id: project.id,
					label: project.name,
				},
				{
					id: '-1',
					label: i18n.baseText('folders.breadcrumbs.noTruncated.message'),
				},
			];
		} else {
			// Start with the project item, then add all processed folders
			result = [
				{
					id: project.id,
					label: project.name,
				},
				...path.flatMap(processFolderWithChildren),
			];
		}

		// Calculate how much time has elapsed
		const elapsedTime = Date.now() - startTime;
		const remainingTime = Math.max(0, BREADCRUMBS_MIN_LOADING_TIME - elapsedTime);

		// Add a delay if needed to ensure minimum loading time
		if (remainingTime > 0) {
			await new Promise((resolve) => setTimeout(resolve, remainingTime));
		}

		return result;
	}

	return {
		fetchTotalWorkflowsAndFoldersCount,
		breadcrumbsCache,
		cacheFolders,
		getCachedFolder,
		createFolder,
		getFolderPath,
		totalWorkflowCount,
		deleteFolder,
		deleteFoldersFromCache,
		renameFolder,
		fetchProjectFolders,
		fetchFoldersAvailableForMove,
		moveFolder,
		moveFolderToProject,
		fetchFolderContent,
		getHiddenBreadcrumbsItems,
		draggedElement,
		activeDropTarget,
		fetchFolderUsedCredentials,
	};
});
