<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import {
	N8nActionBox,
	N8nCard,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentFileDto } from '@n8n/api-types';

const props = withDefaults(
	defineProps<{
		files: AgentFileDto[];
		disabled?: boolean;
		loading?: boolean;
		uploading?: boolean;
		deletingFileId?: string | null;
	}>(),
	{
		disabled: false,
		loading: false,
		uploading: false,
		deletingFileId: null,
	},
);

const emit = defineEmits<{
	'upload-files': [files: File[]];
	'delete-file': [file: AgentFileDto];
}>();

const i18n = useI18n();
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const totalCount = computed(() => props.files.length);
const isMutating = computed(() => props.uploading || props.deletingFileId !== null);
const isUploadDisabled = computed(() => props.disabled || props.loading || isMutating.value);

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
				<N8nTooltip :content="i18n.baseText('agents.builder.files.upload')" placement="top">
					<N8nIconButton
						icon="plus"
						variant="ghost"
						size="small"
						icon-size="medium"
						:disabled="isUploadDisabled"
						:aria-label="i18n.baseText('agents.builder.files.upload')"
						data-testid="agent-files-upload"
						@click="openFilePicker"
					/>
				</N8nTooltip>
			</div>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.files.description') }}
			</N8nText>
		</div>

		<input
			ref="fileInput"
			type="file"
			accept=".csv,.pdf,.md,.markdown,.txt"
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
