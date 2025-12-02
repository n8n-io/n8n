<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useRootStore } from '@/stores/root.store';
import type { FileMetadata } from '@/features/core/dataTable/dataTable.types';
import {
	uploadFileToColumnApi,
	downloadFileFromColumnApi,
	deleteFileFromColumnApi,
} from '@/features/core/dataTable/dataTable.api';

const props = defineProps<{
	value: FileMetadata | null;
	projectId: string;
	dataTableId: string;
	columnId: string;
	rowId: number;
}>();

const emit = defineEmits<{
	(e: 'update:value', value: FileMetadata | null): void;
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const uploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const fileMetadata = computed(() => props.value);

const isImage = computed(() => {
	if (!fileMetadata.value) return false;
	return fileMetadata.value.mimeType.startsWith('image/');
});

const fileSizeFormatted = computed(() => {
	if (!fileMetadata.value) return '';
	const bytes = fileMetadata.value.size;
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});

const handleFileSelect = () => {
	fileInputRef.value?.click();
};

const handleUpload = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (!file) return;

	// Check file size (50MB limit)
	if (file.size > 50 * 1024 * 1024) {
		toast.showError(
			new Error(i18n.baseText('dataTable.fileColumn.error.fileTooLarge')),
			i18n.baseText('dataTable.fileColumn.error.title'),
		);
		return;
	}

	uploading.value = true;

	try {
		const response = await uploadFileToColumnApi(
			rootStore.restApiContext,
			props.projectId,
			props.dataTableId,
			props.columnId,
			file,
		);

		emit('update:value', response);
		toast.showMessage({
			title: i18n.baseText('dataTable.fileColumn.uploadSuccess'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('dataTable.fileColumn.error.uploadFailed'));
	} finally {
		uploading.value = false;
		if (fileInputRef.value) {
			fileInputRef.value.value = '';
		}
	}
};

const downloadFile = async () => {
	if (!fileMetadata.value) return;

	try {
		const blob = await downloadFileFromColumnApi(
			rootStore.restApiContext,
			props.projectId,
			props.dataTableId,
			props.columnId,
			fileMetadata.value.fileId,
			fileMetadata.value.fileName,
			fileMetadata.value.mimeType,
		);

		// Create download link
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileMetadata.value.fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('dataTable.fileColumn.error.downloadFailed'));
	}
};

const deleteFile = async () => {
	if (!fileMetadata.value) return;

	try {
		await deleteFileFromColumnApi(
			rootStore.restApiContext,
			props.projectId,
			props.dataTableId,
			props.columnId,
			fileMetadata.value.fileId,
		);

		emit('update:value', null);
		toast.showMessage({
			title: i18n.baseText('dataTable.fileColumn.deleteSuccess'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('dataTable.fileColumn.error.deleteFailed'));
	}
};
</script>

<template>
	<div class="file-cell">
		<div v-if="fileMetadata" class="file-display">
			<div class="file-preview">
				<img
					v-if="isImage"
					:src="fileMetadata.url"
					:alt="fileMetadata.fileName"
					class="file-thumbnail"
				/>
				<i v-else class="file-icon" :class="`fa fa-file`"></i>
			</div>
			<div class="file-info">
				<span class="file-name" :title="fileMetadata.fileName">{{ fileMetadata.fileName }}</span>
				<span class="file-size">{{ fileSizeFormatted }}</span>
			</div>
			<div class="file-actions">
				<button
					class="file-action-btn"
					:title="i18n.baseText('dataTable.fileColumn.download')"
					@click.stop="downloadFile"
				>
					<i class="fa fa-download"></i>
				</button>
				<button
					class="file-action-btn file-action-delete"
					:title="i18n.baseText('dataTable.fileColumn.delete')"
					@click.stop="deleteFile"
				>
					<i class="fa fa-trash"></i>
				</button>
			</div>
		</div>
		<div v-else class="file-upload">
			<input ref="fileInputRef" type="file" style="display: none" @change="handleUpload" />
			<button class="file-upload-btn" :disabled="uploading" @click.stop="handleFileSelect">
				<i v-if="uploading" class="fa fa-spinner fa-spin"></i>
				<i v-else class="fa fa-upload"></i>
				<span>{{ i18n.baseText('dataTable.fileColumn.upload') }}</span>
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.file-cell {
	padding: var(--spacing--2xs);
	height: 100%;
	display: flex;
	align-items: center;
}

.file-display {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.file-preview {
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius--sm);
	overflow: hidden;
	background: var(--color--background--light-2);
}

.file-thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.file-icon {
	font-size: 18px;
	color: var(--color--text--tint-2);
}

.file-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.file-name {
	font-size: var(--font-size--xs);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.file-size {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}

.file-actions {
	display: flex;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.file-action-btn {
	padding: var(--spacing--4xs);
	background: transparent;
	border: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	border-radius: var(--radius--sm);
	transition: all 0.2s;

	&:hover {
		background: var(--color--background--light-2);
		color: var(--color--text);
	}

	&.file-action-delete:hover {
		color: var(--color--danger);
	}
}

.file-upload {
	width: 100%;
}

.file-upload-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: var(--color--background--light-2);
	border: var(--border-width) dashed var(--color--foreground);
	border-radius: var(--radius--sm);
	cursor: pointer;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	transition: all 0.2s;

	&:hover:not(:disabled) {
		background: var(--color--background--light-3);
		border-color: var(--color--primary);
		color: var(--color--primary);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	i {
		font-size: var(--font-size--sm);
	}
}
</style>
