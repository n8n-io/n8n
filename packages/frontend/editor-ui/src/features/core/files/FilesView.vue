<script setup lang="ts">
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import FileCard from '@/features/core/files/components/FileCard.vue';
import FilesStorageMeter from '@/features/core/files/components/FilesStorageMeter.vue';
import UploadQueue from '@/features/core/files/components/UploadQueue.vue';
import UploadDropOverlay from '@/features/core/files/components/UploadDropOverlay.vue';
import UploadConflictModal from '@/features/core/files/components/UploadConflictModal.vue';
import FilePreviewPanel from '@/features/core/files/components/FilePreviewPanel.vue';
import {
	PROJECT_FILES,
	PROJECT_FILES_PREVIEW,
	UPLOAD_CONFLICT_MODAL_KEY,
} from '@/features/core/files/constants';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import debounce from 'lodash/debounce';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useFilesStore } from '@/features/core/files/files.store';
import type { FileResource, ProjectFile } from '@/features/core/files/files.types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';
import { MODAL_CONFIRM, DEBOUNCE_TIME } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { N8nButton } from '@n8n/design-system';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import { useDependencies } from '@/app/composables/useDependencies';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const projectPages = useProjectPages();
const { callDebounced } = useDebounce();
const documentTitle = useDocumentTitle();
const message = useMessage();
const toast = useToast();

const filesStore = useFilesStore();
const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const uiStore = useUIStore();
const { fetchDependencyCounts } = useDependencies();

const loading = ref(true);

const currentPage = ref(1);
const pageSize = ref(10);

const SEARCH_DEBOUNCE_TIME = getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH);
// Sorting by size involves potentially expensive extra DB queries so we
// disallow defaulting to these values
const PERSIST_KEY_EXCLUSIONS = ['sizeAsc', 'sizeDesc'] satisfies Array<keyof typeof FILES_SORT_MAP>;

const filters = ref<BaseFilters>({
	search: '',
	homeProject: '',
});

const fileResources = computed<FileResource[]>(() =>
	filesStore.files.map((file) => {
		return {
			...file,
			resourceType: 'file' as const,
		};
	}),
);

const totalCount = computed(() => filesStore.totalCount);

const currentProject = computed(() => {
	if (projectPages.isOverviewSubPage) {
		return projectsStore.personalProject;
	}
	return projectsStore.currentProject;
});

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const canCreateFiles = computed(() => !!filesStore.projectPermissions.file.create);

const canUpload = computed(
	() => canCreateFiles.value && !readOnlyEnv.value && filesStore.quotaStatus !== 'error',
);

const addFileDisabled = computed(() => !canUpload.value);

const addFileDisabledTooltip = computed(() => {
	if (readOnlyEnv.value) return i18n.baseText('readOnlyEnv.cantAdd.any');
	if (filesStore.quotaStatus === 'error') return i18n.baseText('files.quota.disabled.tooltip');
	return i18n.baseText('files.empty.button.disabled.tooltip');
});

const FILES_SORT_MAP = {
	lastUpdated: 'updatedAt:desc',
	lastCreated: 'createdAt:desc',
	nameAsc: 'name:asc',
	nameDesc: 'name:desc',
	sizeAsc: 'size:asc',
	sizeDesc: 'size:desc',
} as const;
type SORT_TYPE = typeof FILES_SORT_MAP;

const currentSort = ref<SORT_TYPE[keyof SORT_TYPE]>('updatedAt:desc');

const delayedLoading = debounce(() => {
	loading.value = true;
}, 300);

const fetchFiles = async () => {
	const projectIdFilter = projectPages.isOverviewSubPage ? '' : projectsStore.currentProjectId;
	try {
		delayedLoading();
		await filesStore.fetchFiles(
			projectIdFilter ?? '',
			currentPage.value,
			pageSize.value,
			{
				name: filters.value.search === '' ? undefined : filters.value.search,
				projectId: filters.value.homeProject === '' ? undefined : filters.value.homeProject,
			},
			currentSort.value,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('files.fetch.error'));
	} finally {
		delayedLoading.cancel();
		loading.value = false;

		const fileIds = filesStore.files.map((file) => file.id);
		void fetchDependencyCounts(fileIds, 'file');
	}
};

const onPaginationUpdate = async (payload: SortingAndPaginationUpdates) => {
	if (payload.page) {
		currentPage.value = payload.page;
	}
	if (payload.pageSize) {
		pageSize.value = payload.pageSize;
	}
	if (payload.sort) {
		currentSort.value =
			FILES_SORT_MAP[payload.sort as keyof typeof FILES_SORT_MAP] ?? 'updatedAt:desc';
	}

	if (!loading.value) {
		await callDebounced(fetchFiles, { debounceTime: 200, trailing: true });
	}
};

const onSearchUpdated = async (search: string) => {
	currentPage.value = 1;
	filters.value.search = search;

	if (search) {
		await callDebounced(fetchFiles, { debounceTime: SEARCH_DEBOUNCE_TIME, trailing: true });
	} else {
		// No need to debounce when clearing search
		await fetchFiles();
	}
};

// --- Upload handling ---

const fileInputRef = ref<HTMLInputElement | null>(null);

const openFilePicker = () => {
	fileInputRef.value?.click();
};

const onFilesPicked = (event: Event) => {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	const pickedFiles = Array.from(target.files ?? []);
	target.value = '';
	if (pickedFiles.length === 0 || !currentProject.value) return;
	filesStore.enqueueUploads(pickedFiles, currentProject.value.id, 'button');
};

// --- Drag & drop ---

const dragCounter = ref(0);
const isDraggingOver = computed(() => dragCounter.value > 0);

const onDragEnter = (event: DragEvent) => {
	if (!canUpload.value) return;
	if (!event.dataTransfer?.types.includes('Files')) return;
	event.preventDefault();
	dragCounter.value += 1;
};

const onDragOver = (event: DragEvent) => {
	if (!canUpload.value) return;
	event.preventDefault();
};

const onDragLeave = () => {
	if (dragCounter.value > 0) {
		dragCounter.value -= 1;
	}
};

const onDrop = (event: DragEvent) => {
	event.preventDefault();
	dragCounter.value = 0;
	if (!canUpload.value || !currentProject.value) return;
	const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
	if (droppedFiles.length === 0) return;
	filesStore.enqueueUploads(droppedFiles, currentProject.value.id, 'drop');
};

// --- Selection / bulk delete ---

const selectedFileIds = ref<string[]>([]);

const onFileSelected = (fileId: string, selected: boolean) => {
	if (selected) {
		if (!selectedFileIds.value.includes(fileId)) {
			selectedFileIds.value.push(fileId);
		}
	} else {
		selectedFileIds.value = selectedFileIds.value.filter((id) => id !== fileId);
	}
};

const onBulkDelete = async () => {
	if (selectedFileIds.value.length === 0 || !currentProject.value) return;
	const count = selectedFileIds.value.length;
	const promptResponse = await message.confirm(
		i18n.baseText('files.delete.bulk.confirm.description', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		}),
		i18n.baseText('files.delete.bulk.confirm.title', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		}),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (promptResponse !== MODAL_CONFIRM) return;
	try {
		await filesStore.batchDeleteFiles(selectedFileIds.value, currentProject.value.id);
		selectedFileIds.value = [];
		await fetchFiles();
	} catch (error) {
		toast.showError(error, i18n.baseText('files.delete.error'));
	}
};

// --- Preview panel ---

const previewFile = ref<ProjectFile | null>(null);

const openPreview = (file: FileResource) => {
	if (projectPages.isOverviewSubPage) {
		previewFile.value = file;
		return;
	}
	void router.push({
		name: PROJECT_FILES_PREVIEW,
		params: { projectId: file.projectId, id: file.id },
	});
};

const closePreview = () => {
	previewFile.value = null;
	if (route.name === PROJECT_FILES_PREVIEW) {
		void router.push({
			name: PROJECT_FILES,
			params: { projectId: route.params.projectId },
		});
	}
};

watch(
	() => route.params.id,
	async (id) => {
		if (typeof id === 'string' && id !== '') {
			const projectId =
				typeof route.params.projectId === 'string' ? route.params.projectId : undefined;
			if (!projectId) return;
			previewFile.value = await filesStore.fetchFileById(projectId, id);
		} else {
			previewFile.value = null;
		}
	},
	{ immediate: true },
);

// Opens the file picker when navigated to with the `new` route param.
// Handled on mount (the input ref is only bound then) and on later navigations.
const handleNewRouteParam = () => {
	if (route.params.new !== 'new') return;
	openFilePicker();
	// Drop the param so re-clicking the button keeps working
	void router.replace({
		name: PROJECT_FILES,
		params: { projectId: route.params.projectId },
	});
};

watch(() => route.params.new, handleNewRouteParam);

// --- Conflict modal ---

watch(
	() => filesStore.conflictedUploads.length,
	(count, previous) => {
		if (count > 0 && !previous) {
			uiStore.openModal(UPLOAD_CONFLICT_MODAL_KEY);
		} else if (count === 0 && previous) {
			uiStore.closeModal(UPLOAD_CONFLICT_MODAL_KEY);
		}
	},
);

// Refresh the list whenever an upload lands
watch(
	() => filesStore.uploadsCompletedCount,
	async () => {
		if (!loading.value) {
			await callDebounced(fetchFiles, { debounceTime: 200, trailing: true });
		}
	},
);

const initialize = async () => {
	await Promise.all([fetchFiles(), filesStore.fetchLimits().catch(() => {})]);
};

onMounted(() => {
	documentTitle.set(i18n.baseText('files.tab.label'));
	handleNewRouteParam();
});
</script>
<template>
	<div
		:class="$style.container"
		@dragenter="onDragEnter"
		@dragover="onDragOver"
		@dragleave="onDragLeave"
		@drop="onDrop"
	>
		<ResourcesListLayout
			ref="layout"
			resource-key="files"
			type="list-paginated"
			:resources="fileResources"
			:initialize="initialize"
			:type-props="{ itemSize: 80 }"
			:loading="false"
			:disabled="false"
			:total-items="totalCount"
			:resources-refreshing="loading"
			:sort-options="Object.keys(FILES_SORT_MAP)"
			:dont-perform-sorting-and-filtering="true"
			:ui-config="{
				searchEnabled: true,
				showFiltersDropdown: false,
				sortEnabled: true,
			}"
			tab-key="files"
			:persist-key-exclusions="PERSIST_KEY_EXCLUSIONS"
			@update:search="onSearchUpdated"
			@update:pagination-and-sort="onPaginationUpdate"
		>
			<template #header>
				<ProjectHeader main-button="file">
					<InsightsSummary
						v-if="projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled"
						:loading="insightsStore.weeklySummary.isLoading"
						:summary="insightsStore.weeklySummary.state"
						time-range="week"
					/>
				</ProjectHeader>
			</template>
			<template #callout>
				<FilesStorageMeter />
				<UploadQueue v-if="filesStore.uploadQueue.length > 0" />
				<div v-if="selectedFileIds.length > 0" :class="$style.bulkActions">
					<N8nButton
						variant="destructive"
						size="small"
						:label="
							i18n.baseText('files.delete.bulk.button', {
								adjustToNumber: selectedFileIds.length,
								interpolate: { count: String(selectedFileIds.length) },
							})
						"
						data-test-id="files-bulk-delete"
						@click="onBulkDelete"
					/>
				</div>
			</template>
			<template #empty>
				<ResourcesListEmptyState
					resource-key="files"
					:button-disabled="addFileDisabled"
					:disabled-tooltip-text="addFileDisabled ? addFileDisabledTooltip : undefined"
					@click:button="openFilePicker"
				/>
			</template>
			<template #item="{ item: data }">
				<FileCard
					class="mb-2xs"
					:file="data as FileResource"
					:show-ownership-badge="projectPages.isOverviewSubPage"
					:read-only="readOnlyEnv"
					:selectable="!!filesStore.projectPermissions.file.delete"
					:selected="selectedFileIds.includes((data as FileResource).id)"
					@preview="openPreview"
					@update:selected="
						(selected: boolean) => onFileSelected((data as FileResource).id, selected)
					"
				/>
			</template>
		</ResourcesListLayout>
		<input
			ref="fileInputRef"
			type="file"
			multiple
			:class="$style.hiddenInput"
			data-test-id="files-upload-input"
			@change="onFilesPicked"
		/>
		<UploadDropOverlay v-if="isDraggingOver && canUpload" />
		<UploadConflictModal
			:modal-name="UPLOAD_CONFLICT_MODAL_KEY"
			@close="uiStore.closeModal(UPLOAD_CONFLICT_MODAL_KEY)"
		/>
		<Transition name="files-preview-slide">
			<FilePreviewPanel
				v-if="previewFile"
				:file="previewFile"
				:can-update="!!filesStore.projectPermissions.file.update"
				:is-read-only="readOnlyEnv"
				@close="closePreview"
			/>
		</Transition>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	height: 100%;
	// The routed view is a flex item of the app shell's centered content
	// wrapper; without an explicit width it shrink-fits instead of stretching.
	// Mirror the shell's centering so the capped page column sits centered,
	// exactly like the sibling list views that render PageViewLayout as root.
	width: 100%;
	display: flex;
	justify-content: center;
}

.hiddenInput {
	display: none;
}

.bulkActions {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--xs);
}
</style>

<style lang="scss" scoped>
.files-preview-slide-enter-active,
.files-preview-slide-leave-active {
	transition: transform 0.3s ease;
}

.files-preview-slide-enter-from,
.files-preview-slide-leave-to {
	transform: translateX(100%);
}
</style>
