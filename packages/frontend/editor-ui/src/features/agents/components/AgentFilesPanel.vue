<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import {
	N8nActionBox,
	N8nButton,
	N8nCard,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	ALLOWED_AGENT_FILE_EXTENSIONS,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
} from '@n8n/api-types';
import type {
	AiqCollection,
	AiqDocument,
	AiqHealthStatus,
} from '../composables/useAiqKnowledgeApi';
import AgentAiqKnowledgePanel from './AgentAiqKnowledgePanel.vue';

const props = withDefaults(
	defineProps<{
		files: AgentFileDto[];
		disabled?: boolean;
		loading?: boolean;
		uploading?: boolean;
		deletingFileId?: string | null;
		aiqBaseUrl?: string | null;
		aiqCollections?: AiqCollection[];
		selectedAiqCollectionName?: string | null;
		aiqDocuments?: AiqDocument[];
		aiqHealthStatus?: AiqHealthStatus;
		aiqCollectionsLoading?: boolean;
		aiqDocumentsLoading?: boolean;
		aiqUploading?: boolean;
		aiqDeletingCollectionName?: string | null;
		aiqDeletingDocumentIds?: string[];
		aiqError?: string;
	}>(),
	{
		disabled: false,
		loading: false,
		uploading: false,
		deletingFileId: null,
		aiqBaseUrl: null,
		aiqCollections: () => [],
		selectedAiqCollectionName: null,
		aiqDocuments: () => [],
		aiqHealthStatus: 'idle',
		aiqCollectionsLoading: false,
		aiqDocumentsLoading: false,
		aiqUploading: false,
		aiqDeletingCollectionName: null,
		aiqDeletingDocumentIds: () => [],
		aiqError: '',
	},
);

const emit = defineEmits<{
	'add-connection': [];
	'upload-files': [files: File[]];
	'delete-file': [file: AgentFileDto];
	'create-aiq-collection': [name: string];
	'select-aiq-collection': [name: string];
	'delete-aiq-collection': [name: string];
	'upload-aiq-documents': [files: File[]];
	'delete-aiq-documents': [fileIds: string[]];
	'refresh-aiq': [];
}>();

const i18n = useI18n();
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const totalCount = computed(() => props.files.length);
const isMutating = computed(() => props.uploading || props.deletingFileId !== null);
const isUploadDisabled = computed(() => props.disabled || props.loading || isMutating.value);

const acceptAttr = ALLOWED_AGENT_FILE_EXTENSIONS.join(',');
const description = computed(() =>
	i18n.baseText('agents.builder.files.description', {
		interpolate: {
			maxFiles: MAX_AGENT_FILES_PER_UPLOAD,
			maxSizeMb: MAX_AGENT_FILE_SIZE_MB,
			maxTotalGb: MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
		},
	}),
);

function getFileIcon(file: AgentFileDto) {
	const extension = file.fileName.split('.').pop()?.toLowerCase();
	if (extension === 'csv' || file.mimeType === 'text/csv') return 'file-code';
	if (extension === 'pdf') return 'file';
	if (extension === 'md' || extension === 'markdown' || file.mimeType === 'text/markdown') {
		return 'scroll-text';
	}
	if (extension === 'txt' || file.mimeType === 'text/plain') return 'file-text';
	return 'file';
}

function getFileType(fileName: string) {
	const extension = fileName.split('.').pop()?.toLowerCase();
	if (extension === 'csv') return i18n.baseText('agents.builder.files.type.csv');
	if (extension === 'pdf') return i18n.baseText('agents.builder.files.type.pdf');
	if (extension === 'md' || extension === 'markdown') {
		return i18n.baseText('agents.builder.files.type.markdown');
	}
	if (extension === 'txt') return i18n.baseText('agents.builder.files.type.txt');
	return i18n.baseText('agents.builder.files.type.file');
}

function formatFileSize(bytes: number) {
	if (bytes < 1024)
		return i18n.baseText('agents.builder.files.size.bytes', { interpolate: { bytes } });
	const kilobytes = bytes / 1024;
	if (kilobytes < 1024) {
		return i18n.baseText('agents.builder.files.size.kilobytes', {
			interpolate: { kilobytes: kilobytes.toFixed(1) },
		});
	}
	const megabytes = kilobytes / 1024;
	return i18n.baseText('agents.builder.files.size.megabytes', {
		interpolate: { megabytes: megabytes.toFixed(1) },
	});
}

function openFilePicker() {
	if (isUploadDisabled.value) return;
	fileInput.value?.click();
}

function onFilesSelected(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	const selectedFiles = Array.from(input.files ?? []);
	input.value = '';
	if (selectedFiles.length === 0) return;

	emit('upload-files', selectedFiles);
}
</script>

<template>
	<div :class="[$style.panel, props.disabled && $style.disabled]" data-testid="agent-files-panel">
		<div :class="$style.titleGroup">
			<div :class="$style.header">
				<N8nText tag="h3" :bold="true">
					{{ i18n.baseText('agents.builder.files.title') }}
				</N8nText>
				<div :class="$style.headerActions">
					<N8nButton
						variant="subtle"
						size="small"
						:disabled="props.disabled"
						data-testid="agent-files-add-connection"
						@click="emit('add-connection')"
					>
						{{ i18n.baseText('agents.builder.files.addConnection') }}
					</N8nButton>
					<N8nTooltip :content="i18n.baseText('agents.builder.files.upload')" placement="top">
						<N8nIconButton
							icon="plus"
							variant="subtle"
							size="small"
							icon-size="medium"
							:disabled="isUploadDisabled"
							:aria-label="i18n.baseText('agents.builder.files.upload')"
							data-testid="agent-files-upload"
							@click="openFilePicker"
						/>
					</N8nTooltip>
				</div>
			</div>
			<N8nText size="small" color="text-light">
				{{ description }}
			</N8nText>
		</div>

		<input
			ref="fileInput"
			type="file"
			:accept="acceptAttr"
			multiple
			:class="$style.fileInput"
			data-testid="agent-files-upload-input"
			@change="onFilesSelected"
		/>

		<N8nLoading v-if="props.loading" :rows="2" variant="p" />

		<N8nActionBox
			v-else-if="totalCount === 0"
			:class="$style.empty"
			:icon="{ type: 'icon', value: 'file-text' }"
			:description="i18n.baseText('agents.builder.files.empty')"
		/>

		<N8nScrollArea
			v-else
			max-height="calc((var(--spacing--2xl) + var(--spacing--sm)) * 5)"
			type="auto"
			:class="$style.rows"
		>
			<div :class="$style.rowList">
				<N8nCard
					v-for="file in props.files"
					:key="file.id"
					:class="$style.row"
					data-testid="agent-files-list-row"
				>
					<template #prepend>
						<N8nIcon :icon="getFileIcon(file)" size="medium" :class="$style.fileIcon" />
					</template>

					<N8nText size="xsmall" color="text-dark" :bold="true" :class="$style.name">
						{{ file.fileName }}
					</N8nText>
					<N8nText size="xsmall" color="text-light" :class="$style.metadata">
						{{ getFileType(file.fileName) }} | {{ formatFileSize(file.fileSizeBytes) }}
					</N8nText>

					<template #append>
						<N8nTooltip :content="i18n.baseText('agents.builder.files.delete')" placement="top">
							<N8nIconButton
								icon="trash-2"
								variant="ghost"
								size="mini"
								icon-size="small"
								:disabled="props.disabled || props.loading || isMutating"
								:loading="props.deletingFileId === file.id"
								:aria-label="i18n.baseText('agents.builder.files.delete')"
								data-testid="agent-files-delete"
								@click="emit('delete-file', file)"
							/>
						</N8nTooltip>
					</template>
				</N8nCard>
			</div>
		</N8nScrollArea>

		<N8nText v-if="!props.loading" size="xsmall" color="text-light">
			{{
				i18n.baseText('agents.builder.files.count', {
					adjustToNumber: totalCount,
					interpolate: { count: String(totalCount) },
				})
			}}
		</N8nText>

		<template v-if="props.aiqBaseUrl">
			<div :class="$style.divider" />
			<AgentAiqKnowledgePanel
				:collections="props.aiqCollections"
				:selected-collection-name="props.selectedAiqCollectionName"
				:documents="props.aiqDocuments"
				:health-status="props.aiqHealthStatus"
				:collections-loading="props.aiqCollectionsLoading"
				:documents-loading="props.aiqDocumentsLoading"
				:uploading="props.aiqUploading"
				:deleting-collection-name="props.aiqDeletingCollectionName"
				:deleting-document-ids="props.aiqDeletingDocumentIds"
				:error="props.aiqError"
				:disabled="props.disabled"
				@create-collection="emit('create-aiq-collection', $event)"
				@select-collection="emit('select-aiq-collection', $event)"
				@delete-collection="emit('delete-aiq-collection', $event)"
				@upload-documents="emit('upload-aiq-documents', $event)"
				@delete-documents="emit('delete-aiq-documents', $event)"
				@refresh="emit('refresh-aiq')"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.panel.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
}

.titleGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.fileInput {
	display: none;
}

.empty {
	padding: var(--spacing--lg);
}

.rowList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-right: var(--spacing--xs);
}

.rows {
	scrollbar-gutter: stable;
}

.divider {
	height: 1px;
	background-color: var(--border-color-base);
}

.row {
	--card--append--width: auto;
	flex-shrink: 0;
}

.fileIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.name,
.metadata {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}
</style>
