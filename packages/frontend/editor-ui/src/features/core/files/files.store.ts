import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { getResourcePermissions } from '@n8n/permissions';
import type { ListProjectFilesQuerySortOptions, ProjectFileConflictMode } from '@n8n/api-types';
import type { ProjectFilesSnapshotEntry } from 'n8n-workflow';

import { FILES_STORE } from '@/features/core/files/constants';
import {
	batchDeleteFilesApi,
	deleteFileApi,
	fetchFileApi,
	fetchFileStorageLimitsApi,
	fetchFilesApi,
	getFileContentUrl,
	renameFileApi,
	replaceFileContentApi,
	uploadFileApi,
} from '@/features/core/files/files.api';
import type {
	FileConflictResolution,
	FileStorageQuotaStatus,
	FileUploadQueueItem,
	FileUploadSource,
	ProjectFile,
} from '@/features/core/files/files.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { getMimeFamily, getSizeBucket } from '@/features/core/files/utils/mimeUtils';

export const useFilesStore = defineStore(FILES_STORE, () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();

	const files = ref<ProjectFile[]>([]);
	const totalCount = ref(0);

	/**
	 * Editor-side `$files` snapshot for expression previews and autocomplete,
	 * fetched on workflow open for the workflow's home project — deliberately
	 * not populated by the Files view, which fills `files` on view entry.
	 */
	const expressionSnapshot = ref<ProjectFilesSnapshotEntry[]>([]);

	const usedBytes = ref(0);
	const maxBytes = ref(0);
	const quotaStatus = ref<FileStorageQuotaStatus>('ok');

	const uploadQueue = ref<FileUploadQueueItem[]>([]);
	// Incremented whenever an upload lands, so views can refresh their list
	const uploadsCompletedCount = ref(0);

	// Deliberately non-reactive: AbortControllers are transient plumbing
	const abortControllers = new Map<string, AbortController>();

	let uploadItemIdCounter = 0;

	const projectPermissions = computed(() =>
		getResourcePermissions(
			projectStore.currentProject?.scopes ?? projectStore.personalProject?.scopes,
		),
	);

	const canViewFiles = computed(() => hasPermission(['rbac'], { rbac: { scope: 'file:list' } }));

	const maxFileSizeBytes = computed(() => settingsStore.settings?.fileStorage?.maxFileSize ?? 0);

	const fetchFiles = async (
		projectId: string,
		page: number,
		pageSize: number,
		filter?: {
			id?: string | string[];
			name?: string | string[];
			projectId?: string | string[];
		},
		sortBy?: ListProjectFilesQuerySortOptions,
	) => {
		const response = await fetchFilesApi(
			rootStore.restApiContext,
			projectId,
			{
				skip: (page - 1) * pageSize,
				take: pageSize,
			},
			filter,
			sortBy,
		);
		files.value = response.data;
		totalCount.value = response.count;
	};

	/**
	 * Loads the `$files` expression snapshot for a project. Best-effort — an
	 * error (e.g. missing file permissions) leaves the snapshot empty rather
	 * than breaking workflow initialization. Capped at one page of the list
	 * API (250 files), plenty for autocomplete and inline previews.
	 */
	const fetchExpressionSnapshot = async (projectId: string) => {
		try {
			const response = await fetchFilesApi(
				rootStore.restApiContext,
				projectId,
				{ skip: 0, take: 250 },
				undefined,
				'name:asc',
			);
			expressionSnapshot.value = response.data.map((file) => ({
				id: file.id,
				name: file.name,
				mimeType: file.mimeType,
				size: file.sizeBytes,
				updatedAt: file.updatedAt,
			}));
		} catch {
			expressionSnapshot.value = [];
		}
	};

	const fetchFileById = async (projectId: string, fileId: string): Promise<ProjectFile | null> => {
		const existing = files.value.find((file) => file.id === fileId);
		if (existing) return existing;
		try {
			return await fetchFileApi(rootStore.restApiContext, projectId, fileId);
		} catch {
			return null;
		}
	};

	const syncQuotaBanners = (status: FileStorageQuotaStatus) => {
		const bannersStore = useBannersStore();
		if (status === 'error') {
			bannersStore.removeBannerFromStack('FILE_STORAGE_LIMIT_WARNING');
			bannersStore.pushBannerToStack('FILE_STORAGE_LIMIT_ERROR');
		} else if (status === 'warn') {
			bannersStore.removeBannerFromStack('FILE_STORAGE_LIMIT_ERROR');
			bannersStore.pushBannerToStack('FILE_STORAGE_LIMIT_WARNING');
		} else {
			bannersStore.removeBannerFromStack('FILE_STORAGE_LIMIT_WARNING');
			bannersStore.removeBannerFromStack('FILE_STORAGE_LIMIT_ERROR');
		}
	};

	const fetchLimits = async () => {
		const result = await fetchFileStorageLimitsApi(rootStore.restApiContext);
		usedBytes.value = result.totalBytes;
		maxBytes.value = result.maxBytes;
		quotaStatus.value = result.quotaStatus;
		syncQuotaBanners(result.quotaStatus);
		return result;
	};

	const renameFile = async (fileId: string, projectId: string, name: string) => {
		const updated = await renameFileApi(rootStore.restApiContext, projectId, fileId, name);
		const index = files.value.findIndex((file) => file.id === fileId);
		if (index !== -1) {
			files.value[index] = { ...files.value[index], name: updated.name };
		}
		useFavoritesStore().renameFavorite(fileId, 'file', updated.name);
		return updated;
	};

	const deleteFile = async (fileId: string, projectId: string) => {
		const result = await deleteFileApi(rootStore.restApiContext, projectId, fileId);
		if (result.deleted) {
			files.value = files.value.filter((file) => file.id !== fileId);
			totalCount.value -= 1;
			telemetry.track('User deleted project file', { mode: 'single', count: 1 });
			void fetchLimits().catch(() => {});
		}
		return result;
	};

	const batchDeleteFiles = async (fileIds: string[], projectId: string) => {
		const result = await batchDeleteFilesApi(rootStore.restApiContext, projectId, fileIds);
		files.value = files.value.filter((file) => !fileIds.includes(file.id));
		totalCount.value -= fileIds.length;
		telemetry.track('User deleted project file', { mode: 'bulk', count: fileIds.length });
		void fetchLimits().catch(() => {});
		return result;
	};

	/**
	 * Checks whether a file with this exact name already exists in the project.
	 * Uses the filtered list endpoint (name filter is a contains-match, so the
	 * result is compared for exact equality).
	 */
	const fileNameExists = async (projectId: string, name: string): Promise<boolean> => {
		const response = await fetchFilesApi(
			rootStore.restApiContext,
			projectId,
			{ skip: 0, take: 50 },
			{ name },
		);
		return response.data.some((file) => file.name === name);
	};

	const trackUpload = (item: FileUploadQueueItem, conflictResolution?: FileConflictResolution) => {
		telemetry.track('User uploaded project file', {
			mime_family: getMimeFamily(item.mimeType),
			size_bucket: getSizeBucket(item.sizeBytes),
			source: item.source,
			...(conflictResolution ? { conflict_resolution: conflictResolution } : {}),
		});
	};

	const isAbortError = (error: unknown): boolean =>
		error instanceof Error && (error.name === 'CanceledError' || error.message === 'canceled');

	const startUpload = async (
		item: FileUploadQueueItem,
		conflictMode: ProjectFileConflictMode,
		conflictResolution?: FileConflictResolution,
	) => {
		item.status = 'uploading';
		item.progress = 0;
		item.errorMessage = undefined;

		const controller = new AbortController();
		abortControllers.set(item.id, controller);

		try {
			await uploadFileApi(rootStore.restApiContext, item.projectId, item.file, conflictMode, {
				onUploadProgress: (event) => {
					if (event.total) {
						item.progress = Math.round((event.loaded / event.total) * 100);
					}
				},
				signal: controller.signal,
			});
			item.progress = 100;
			item.status = 'done';
			trackUpload(item, conflictResolution);
			uploadsCompletedCount.value += 1;
			void fetchLimits().catch(() => {});
		} catch (error) {
			if (isAbortError(error)) {
				item.status = 'canceled';
			} else if (
				error instanceof Error &&
				'httpStatusCode' in error &&
				error.httpStatusCode === 409
			) {
				// Raced another upload of the same name between pre-flight and POST
				item.status = 'conflict';
			} else {
				item.status = 'error';
				item.errorMessage = error instanceof Error ? error.message : String(error);
			}
		} finally {
			abortControllers.delete(item.id);
		}
	};

	/** Runs the client-side size gate and pre-flight conflict check, then uploads. */
	const processUploadItem = async (item: FileUploadQueueItem) => {
		try {
			const exists = await fileNameExists(item.projectId, item.name);
			if (exists) {
				item.status = 'conflict';
				return;
			}
		} catch {
			// Pre-flight is best-effort; the server enforces conflicts regardless
		}
		await startUpload(item, 'error');
	};

	const enqueueUploads = (uploads: File[], projectId: string, source: FileUploadSource) => {
		// Drop finished entries from a previous batch so the queue stays readable
		uploadQueue.value = uploadQueue.value.filter(
			(item) => !['done', 'canceled'].includes(item.status),
		);

		const items: FileUploadQueueItem[] = uploads.map((file) => ({
			id: `upload-${++uploadItemIdCounter}`,
			file,
			name: file.name,
			sizeBytes: file.size,
			mimeType: file.type || 'application/octet-stream',
			projectId,
			source,
			status: 'pending',
			progress: 0,
		}));

		uploadQueue.value.push(...items);

		for (const item of uploadQueue.value.filter((queued) =>
			items.some((added) => added.id === queued.id),
		)) {
			if (maxFileSizeBytes.value > 0 && item.sizeBytes > maxFileSizeBytes.value) {
				item.status = 'error';
				item.errorMessage = 'tooLarge';
				continue;
			}
			void processUploadItem(item);
		}
	};

	const cancelUpload = (itemId: string) => {
		const item = uploadQueue.value.find((queued) => queued.id === itemId);
		if (!item) return;
		const controller = abortControllers.get(itemId);
		if (controller) {
			controller.abort();
		} else if (['pending', 'conflict', 'error'].includes(item.status)) {
			item.status = 'canceled';
		}
	};

	const retryUpload = (itemId: string) => {
		const item = uploadQueue.value.find((queued) => queued.id === itemId);
		if (!item || !['error', 'canceled'].includes(item.status)) return;
		if (maxFileSizeBytes.value > 0 && item.sizeBytes > maxFileSizeBytes.value) {
			item.status = 'error';
			item.errorMessage = 'tooLarge';
			return;
		}
		item.status = 'pending';
		item.errorMessage = undefined;
		void processUploadItem(item);
	};

	const conflictedUploads = computed(() =>
		uploadQueue.value.filter((item) => item.status === 'conflict'),
	);

	const resolveConflict = (
		itemId: string,
		resolution: FileConflictResolution,
		applyToAll = false,
	) => {
		const targets = applyToAll
			? conflictedUploads.value
			: conflictedUploads.value.filter((item) => item.id === itemId);

		for (const item of targets) {
			if (resolution === 'cancel') {
				item.status = 'canceled';
				trackUpload(item, 'cancel');
			} else {
				void startUpload(item, resolution, resolution);
			}
		}
	};

	const clearUploadQueue = () => {
		for (const controller of abortControllers.values()) {
			controller.abort();
		}
		abortControllers.clear();
		uploadQueue.value = [];
	};

	const replaceFile = async (
		fileId: string,
		projectId: string,
		file: File,
	): Promise<ProjectFile> => {
		const updated = await replaceFileContentApi(rootStore.restApiContext, projectId, fileId, file);
		const index = files.value.findIndex((existing) => existing.id === fileId);
		if (index !== -1) {
			files.value[index] = { ...files.value[index], ...updated };
		}
		telemetry.track('User uploaded project file', {
			mime_family: getMimeFamily(file.type || 'application/octet-stream'),
			size_bucket: getSizeBucket(file.size),
			source: 'replace',
		});
		void fetchLimits().catch(() => {});
		return updated;
	};

	const triggerBrowserDownload = (url: string, filename: string): void => {
		const link = document.createElement('a');

		link.href = url;
		link.download = filename;
		link.style.display = 'none';

		document.body.appendChild(link);

		try {
			link.click();
		} finally {
			if (document.body.contains(link)) {
				document.body.removeChild(link);
			}
		}
	};

	const downloadFile = (file: ProjectFile) => {
		const url = getFileContentUrl(rootStore.restApiContext, file.projectId, file.id, 'download');
		triggerBrowserDownload(url, file.name);
	};

	const getViewUrl = (file: ProjectFile) =>
		getFileContentUrl(rootStore.restApiContext, file.projectId, file.id, 'view');

	const getDownloadUrl = (file: ProjectFile) =>
		getFileContentUrl(rootStore.restApiContext, file.projectId, file.id, 'download');

	return {
		files,
		totalCount,
		expressionSnapshot,
		fetchExpressionSnapshot,
		usedBytes: computed(() => usedBytes.value),
		maxBytes: computed(() => maxBytes.value),
		quotaStatus: computed(() => quotaStatus.value),
		uploadQueue,
		uploadsCompletedCount: computed(() => uploadsCompletedCount.value),
		conflictedUploads,
		projectPermissions,
		canViewFiles,
		maxFileSizeBytes,
		fetchFiles,
		fetchFileById,
		fetchLimits,
		fileNameExists,
		renameFile,
		deleteFile,
		batchDeleteFiles,
		enqueueUploads,
		cancelUpload,
		retryUpload,
		resolveConflict,
		clearUploadQueue,
		replaceFile,
		downloadFile,
		getViewUrl,
		getDownloadUrl,
	};
});
