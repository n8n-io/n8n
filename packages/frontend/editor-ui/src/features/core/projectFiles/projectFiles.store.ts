import type { ProjectFileResponse, ProjectFileUsageResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	PROJECT_FILES_QUOTA_WARNING_THRESHOLD,
	PROJECT_FILES_STORE,
} from '@/features/core/projectFiles/constants';
import {
	deleteProjectFileApi,
	fetchProjectFilesApi,
	projectFileContentUrl,
	renameProjectFileApi,
	uploadProjectFileApi,
} from '@/features/core/projectFiles/projectFiles.api';

export const useProjectFilesStore = defineStore(PROJECT_FILES_STORE, () => {
	const rootStore = useRootStore();

	const files = ref<ProjectFileResponse[]>([]);
	const totalCount = ref(0);
	const usage = ref<ProjectFileUsageResponse | null>(null);

	const quotaFraction = computed(() => {
		if (!usage.value || usage.value.quotaBytes === 0) return 0;

		return usage.value.usedBytes / usage.value.quotaBytes;
	});

	const isNearQuota = computed(
		() => quotaFraction.value >= PROJECT_FILES_QUOTA_WARNING_THRESHOLD && quotaFraction.value < 1,
	);

	const isAtQuota = computed(() => quotaFraction.value >= 1);

	const fetchFiles = async (
		projectId: string,
		options?: { take?: number; skip?: number; search?: string },
	) => {
		const response = await fetchProjectFilesApi(rootStore.restApiContext, projectId, options);

		files.value = response.data;
		totalCount.value = response.count;
		usage.value = response.usage;

		return response;
	};

	const uploadFile = async (projectId: string, file: File, options?: { overwrite?: boolean }) =>
		await uploadProjectFileApi(rootStore.restApiContext, projectId, file, options);

	const renameFile = async (projectId: string, fileId: string, name: string) =>
		await renameProjectFileApi(rootStore.restApiContext, projectId, fileId, name);

	const deleteFile = async (projectId: string, fileId: string) =>
		await deleteProjectFileApi(rootStore.restApiContext, projectId, fileId);

	/**
	 * Navigates to the content endpoint instead of fetching bytes into a blob, so
	 * the browser handles the download and large files stay out of memory.
	 */
	const downloadFile = (projectId: string, fileId: string) => {
		const link = document.createElement('a');
		link.href = projectFileContentUrl(rootStore.restApiContext, projectId, fileId);
		link.style.display = 'none';

		document.body.appendChild(link);
		try {
			link.click();
		} finally {
			link.remove();
		}
	};

	return {
		files,
		totalCount,
		usage,
		quotaFraction,
		isNearQuota,
		isAtQuota,
		fetchFiles,
		uploadFile,
		renameFile,
		deleteFile,
		downloadFile,
	};
});
