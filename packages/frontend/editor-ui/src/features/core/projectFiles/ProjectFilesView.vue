<script lang="ts" setup>
import type { ProjectFileResponse } from '@n8n/api-types';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { computed, onMounted, ref } from 'vue';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { DEBOUNCE_TIME, MODAL_CONFIRM } from '@/app/constants';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectFilePreviewDialog from '@/features/core/projectFiles/components/ProjectFilePreviewDialog.vue';
import ProjectFilesTable from '@/features/core/projectFiles/components/ProjectFilesTable.vue';
import {
	DEFAULT_PROJECT_FILES_PAGE_SIZE,
	PROJECT_FILES_PAGE_SIZES,
	PROJECT_FILE_ACTIONS,
} from '@/features/core/projectFiles/constants';
import { useProjectFilesStore } from '@/features/core/projectFiles/projectFiles.store';
import { formatBytes } from '@/features/core/projectFiles/utils';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const { callDebounced } = useDebounce();

const projectsStore = useProjectsStore();
const projectFilesStore = useProjectFilesStore();
const sourceControlStore = useSourceControlStore();

const SEARCH_DEBOUNCE_TIME = getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH);

const loading = ref(true);
const uploading = ref(false);
const isDraggingOver = ref(false);
const search = ref('');
const page = ref(0);
const itemsPerPage = ref(DEFAULT_PROJECT_FILES_PAGE_SIZE);
const fileInput = ref<HTMLInputElement>();
const previewFile = ref<ProjectFileResponse | null>(null);
const isPreviewOpen = ref(false);

const projectId = computed(() => projectsStore.currentProjectId ?? '');

const permissions = computed(() =>
	getResourcePermissions(projectsStore.currentProject?.scopes ?? []),
);

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const canUpload = computed(() => !readOnlyEnv.value && !!permissions.value.projectFile?.create);
const canUpdate = computed(() => !readOnlyEnv.value && !!permissions.value.projectFile?.update);
const canDelete = computed(() => !readOnlyEnv.value && !!permissions.value.projectFile?.delete);

const usage = computed(() => projectFilesStore.usage);

const usageLabel = computed(() => {
	if (!usage.value) return '';

	return i18n.baseText('projectFiles.usage', {
		interpolate: {
			used: formatBytes(usage.value.usedBytes),
			quota: formatBytes(usage.value.quotaBytes),
		},
	});
});

/**
 * Two axes: personal projects share one instance-wide budget so the copy must not
 * imply a personal limit, and a full budget must not read "close to its limit".
 */
const quotaCalloutMessage = computed(() => {
	if (!usage.value) return '';

	const scope = usage.value.scope === 'personal' ? 'personal' : 'project';
	const state = projectFilesStore.isAtQuota ? 'reached' : 'warning';

	return i18n.baseText(`projectFiles.quota.${scope}.${state}`, {
		interpolate: { quota: formatBytes(usage.value.quotaBytes) },
	});
});

const uploadDisabledTooltip = computed(() => {
	if (readOnlyEnv.value) return i18n.baseText('projectFiles.upload.disabled.readOnly');
	if (!permissions.value.projectFile?.create)
		return i18n.baseText('projectFiles.upload.disabled.permission');

	return '';
});

const hasFiles = computed(() => projectFilesStore.totalCount > 0);
const isFiltered = computed(() => search.value.trim().length > 0);

const fetchFiles = async () => {
	if (!projectId.value) return;

	loading.value = true;
	try {
		await projectFilesStore.fetchFiles(projectId.value, {
			take: itemsPerPage.value,
			skip: page.value * itemsPerPage.value,
			search: search.value.trim() || undefined,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projectFiles.load.error'));
	} finally {
		loading.value = false;
	}
};

const onSearchUpdated = async (value: string) => {
	search.value = value;
	page.value = 0;

	if (value) {
		await callDebounced(fetchFiles, { debounceTime: SEARCH_DEBOUNCE_TIME, trailing: true });
	} else {
		await fetchFiles();
	}
};

const onTableOptionsUpdate = async (options: TableOptions) => {
	page.value = options.page;
	itemsPerPage.value = options.itemsPerPage;

	await fetchFiles();
};

/**
 * Uploads sequentially rather than in parallel: the per-project quota is checked
 * per request, so concurrent uploads can each pass the check and collectively
 * overshoot. Sequential keeps the reported usage honest between files.
 */
const uploadFiles = async (files: File[]) => {
	if (!canUpload.value || files.length === 0) return;

	uploading.value = true;
	try {
		for (const file of files) {
			await uploadOne(file);
		}
		await fetchFiles();
	} finally {
		uploading.value = false;
	}
};

const uploadOne = async (file: File, overwrite = false) => {
	try {
		await projectFilesStore.uploadFile(projectId.value, file, { overwrite });

		if (overwrite) {
			toast.showMessage({
				title: i18n.baseText('projectFiles.upload.replaced', {
					interpolate: { name: file.name },
				}),
				type: 'success',
			});
		}
	} catch (error) {
		// 409 means a file of that name exists: offer to replace rather than
		// silently overwriting or making the user rename and retry.
		if (!overwrite && isConflictError(error)) {
			await confirmReplace(file);
			return;
		}

		toast.showError(error, i18n.baseText('projectFiles.upload.error'));
	}
};

const isConflictError = (error: unknown) =>
	typeof error === 'object' &&
	error !== null &&
	'httpStatusCode' in error &&
	(error as { httpStatusCode?: number }).httpStatusCode === 409;

const confirmReplace = async (file: File) => {
	const confirmed = await message.confirm(
		i18n.baseText('projectFiles.upload.conflict.message', { interpolate: { name: file.name } }),
		i18n.baseText('projectFiles.upload.conflict.title'),
		{
			confirmButtonText: i18n.baseText('projectFiles.upload.conflict.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmed === MODAL_CONFIRM) await uploadOne(file, true);
};

const onFilePicked = async (event: Event) => {
	const input = event.target as HTMLInputElement;
	await uploadFiles(Array.from(input.files ?? []));

	// Reset so picking the same file again re-triggers change.
	input.value = '';
};

const onDrop = async (event: DragEvent) => {
	isDraggingOver.value = false;
	await uploadFiles(Array.from(event.dataTransfer?.files ?? []));
};

const onDragOver = (event: DragEvent) => {
	if (!canUpload.value) return;

	event.dataTransfer!.dropEffect = 'copy';
	isDraggingOver.value = true;
};

const onPreview = (file: ProjectFileResponse) => {
	previewFile.value = file;
	isPreviewOpen.value = true;
};

const onAction = async ({ action, file }: { action: string; file: ProjectFileResponse }) => {
	switch (action) {
		case PROJECT_FILE_ACTIONS.DOWNLOAD:
			projectFilesStore.downloadFile(projectId.value, file.id);
			break;
		case PROJECT_FILE_ACTIONS.RENAME:
			await promptRename(file);
			break;
		case PROJECT_FILE_ACTIONS.DELETE:
			await confirmDelete(file);
			break;
	}
};

const promptRename = async (file: ProjectFileResponse) => {
	const input = await message.prompt(
		i18n.baseText('projectFiles.rename.message'),
		i18n.baseText('projectFiles.rename.title'),
		{
			inputValue: file.name,
			confirmButtonText: i18n.baseText('generic.rename'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (typeof input === 'object' && 'value' in input && input.value && input.value !== file.name) {
		try {
			await projectFilesStore.renameFile(projectId.value, file.id, input.value);
			await fetchFiles();
		} catch (error) {
			toast.showError(error, i18n.baseText('projectFiles.rename.error'));
		}
	}
};

const confirmDelete = async (file: ProjectFileResponse) => {
	const confirmed = await message.confirm(
		i18n.baseText('projectFiles.delete.message', { interpolate: { name: file.name } }),
		i18n.baseText('projectFiles.delete.title'),
		{
			confirmButtonText: i18n.baseText('projectFiles.delete.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await projectFilesStore.deleteFile(projectId.value, file.id);
		await fetchFiles();
	} catch (error) {
		toast.showError(error, i18n.baseText('projectFiles.delete.error'));
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('projectFiles.files'));
	await fetchFiles();
});
</script>

<template>
	<div :class="$style.container">
		<ProjectHeader />

		<div
			:class="[$style.dropzone, { [$style.draggingOver]: isDraggingOver }]"
			data-test-id="project-files-dropzone"
			@dragover.prevent="onDragOver"
			@dragleave.prevent="isDraggingOver = false"
			@drop.prevent="onDrop"
		>
			<div :class="$style.toolbar">
				<N8nInput
					:model-value="search"
					:placeholder="i18n.baseText('projectFiles.search.placeholder')"
					clearable
					size="small"
					:class="$style.search"
					data-test-id="project-files-search"
					@update:model-value="onSearchUpdated"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>

				<N8nTooltip :content="uploadDisabledTooltip" :disabled="canUpload" placement="top">
					<N8nButton
						:disabled="!canUpload || uploading"
						:loading="uploading"
						size="small"
						data-test-id="project-files-upload-button"
						@click="fileInput?.click()"
					>
						{{ i18n.baseText('projectFiles.upload.button') }}
					</N8nButton>
				</N8nTooltip>

				<input
					ref="fileInput"
					type="file"
					multiple
					:class="$style.hiddenInput"
					data-test-id="project-files-input"
					@change="onFilePicked"
				/>
			</div>

			<div v-if="usage" :class="$style.usage">
				<N8nText size="small" color="text-light" data-test-id="project-files-usage">
					{{ usageLabel }}
				</N8nText>
			</div>

			<N8nCallout
				v-if="projectFilesStore.isAtQuota || projectFilesStore.isNearQuota"
				:theme="projectFilesStore.isAtQuota ? 'danger' : 'warning'"
				:class="$style.callout"
				data-test-id="project-files-quota-callout"
			>
				{{ quotaCalloutMessage }}
			</N8nCallout>

			<N8nEmptyState
				v-if="!loading && !hasFiles && !isFiltered"
				:title="i18n.baseText('projectFiles.empty.title')"
				:description="i18n.baseText('projectFiles.empty.description')"
				data-test-id="project-files-empty-state"
			>
				<template #additionalContent>
					<N8nButton
						:disabled="!canUpload"
						variant="subtle"
						size="small"
						data-test-id="project-files-empty-upload-button"
						@click="fileInput?.click()"
					>
						{{ i18n.baseText('projectFiles.upload.button') }}
					</N8nButton>
				</template>
			</N8nEmptyState>

			<N8nText
				v-else-if="!loading && !hasFiles && isFiltered"
				color="text-base"
				size="medium"
				:class="$style.noResults"
			>
				{{ i18n.baseText('projectFiles.search.noResults') }}
			</N8nText>

			<ProjectFilesTable
				v-else
				:files="projectFilesStore.files"
				:total-count="projectFilesStore.totalCount"
				:loading="loading"
				:page="page"
				:items-per-page="itemsPerPage"
				:page-sizes="PROJECT_FILES_PAGE_SIZES"
				:can-update="canUpdate"
				:can-delete="canDelete"
				@update:options="onTableOptionsUpdate"
				@action="onAction"
				@preview="onPreview"
			/>
		</div>

		<ProjectFilePreviewDialog
			v-model:open="isPreviewOpen"
			:project-id="projectId"
			:file="previewFile"
			@download="projectFilesStore.downloadFile(projectId, $event.id)"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;
}

.dropzone {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	border: var(--border-width) dashed transparent;
	border-radius: var(--radius);
	transition: border-color var(--duration--fast) ease-in-out;
}

.draggingOver {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--2xs);
}

.search {
	max-width: 320px;
	margin-right: auto;
}

.hiddenInput {
	display: none;
}

.usage {
	margin-bottom: var(--spacing--xs);
}

.callout {
	margin-bottom: var(--spacing--xs);
}

.noResults {
	margin-top: var(--spacing--xl);
	text-align: center;
}
</style>
