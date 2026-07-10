<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import {
	N8nActionDropdown,
	N8nButton,
	N8nIcon,
	N8nTableBase,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { ElSkeletonItem } from 'element-plus';
import { ALLOWED_AGENT_FILE_EXTENSIONS, type AgentFileDto } from '@n8n/api-types';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

const props = withDefaults(
	defineProps<{
		files: AgentFileDto[];
		disabled?: boolean;
		loading?: boolean;
		uploading?: boolean;
		deletingFileId?: string | null;
		isPublished: boolean;
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

type FileAction = 'delete';

const i18n = useI18n();
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const isMutating = computed(() => props.uploading || props.deletingFileId !== null);
const isUploadDisabled = computed(
	() => props.disabled || props.loading || isMutating.value || !props.isPublished,
);
const uploadLabel = computed(() => i18n.baseText('agents.builder.files.addFile' as BaseTextKey));
const uploadTooltip = computed(() =>
	props.isPublished ? uploadLabel.value : i18n.baseText('agents.builder.files.publishRequired'),
);

const acceptAttr = ALLOWED_AGENT_FILE_EXTENSIONS.join(',');

function getFileIcon(file: AgentFileDto) {
	const extension = file.fileName.split('.').pop()?.toLowerCase();
	if (extension === 'csv' || file.mimeType === 'text/csv') return 'file-code';
	if (extension === 'pdf' || file.mimeType === 'application/pdf') return 'file';
	if (extension === 'md' || extension === 'markdown' || file.mimeType === 'text/markdown') {
		return 'scroll-text';
	}
	if (extension === 'txt' || file.mimeType === 'text/plain') return 'file-text';
	return 'file';
}

function getFileType(file: AgentFileDto) {
	const extension = file.fileName.split('.').pop()?.toLowerCase();
	if (extension === 'csv' || file.mimeType === 'text/csv') {
		return i18n.baseText('agents.builder.files.type.csv');
	}
	if (extension === 'pdf' || file.mimeType === 'application/pdf') {
		return i18n.baseText('agents.builder.files.type.pdf');
	}
	if (extension === 'md' || extension === 'markdown' || file.mimeType === 'text/markdown') {
		return i18n.baseText('agents.builder.files.type.markdown');
	}
	if (extension === 'txt' || file.mimeType === 'text/plain') {
		return i18n.baseText('agents.builder.files.type.txt');
	}
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

function formatDate(fullDate: string) {
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

function rowActions(): Array<ActionDropdownItem<FileAction>> {
	return [
		{
			id: 'delete',
			label: i18n.baseText('agents.builder.files.delete'),
			icon: 'trash-2',
			disabled: props.disabled || props.loading || isMutating.value,
		},
	];
}

function onAction(actionId: FileAction, file: AgentFileDto) {
	if (actionId !== 'delete') return;
	emit('delete-file', file);
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
	<div :class="$style.panel" data-testid="agent-files-panel">
		<div :class="$style.toolbar">
			<span :class="$style.title" data-testid="agent-files-title">
				{{ i18n.baseText('agents.builder.files.title') }}
				<N8nTooltip
					:content="i18n.baseText('agents.builder.files.titleTooltip' as BaseTextKey)"
					placement="top"
				>
					<N8nIcon icon="circle-help" size="small" :class="$style.titleIcon" />
				</N8nTooltip>
			</span>

			<input
				ref="fileInput"
				type="file"
				:accept="acceptAttr"
				multiple
				:class="$style.fileInput"
				data-testid="agent-files-upload-input"
				@change="onFilesSelected"
			/>

			<N8nTooltip :content="uploadTooltip" placement="top">
				<N8nButton
					variant="ghost"
					size="small"
					icon="plus"
					icon-only
					:disabled="isUploadDisabled"
					:aria-label="uploadTooltip"
					data-testid="agent-files-upload"
					@click="openFilePicker"
				/>
			</N8nTooltip>
		</div>

		<div :class="$style.tableContainer">
			<N8nTableBase :max-displayed-rows="10">
				<tbody>
					<tr
						v-for="file in props.files"
						:key="file.id"
						:class="$style.fileRow"
						data-testid="agent-files-list-row"
					>
						<td :class="$style.titleCell">
							<span :class="$style.fileTitle">
								<N8nIcon :icon="getFileIcon(file)" size="medium" :class="$style.fileIcon" />
								<span :class="$style.fileName" :title="file.fileName" data-testid="agent-file-name">
									{{ file.fileName }}
								</span>
							</span>
						</td>
						<td :class="$style.originCell" data-testid="agent-file-origin">
							<span :class="$style.originPill" data-testid="agent-file-origin-pill">
								<N8nIcon icon="user" size="large" />
								<span>{{ i18n.baseText('agents.builder.files.origin.user' as BaseTextKey) }}</span>
							</span>
						</td>
						<td :class="$style.dateCell" data-testid="agent-file-created-at">
							{{ formatDate(file.createdAt) }}
						</td>
						<td :class="$style.typeCell" data-testid="agent-file-type">
							{{ getFileType(file) }}
						</td>
						<td :class="$style.sizeCell" data-testid="agent-file-size">
							{{ formatFileSize(file.fileSizeBytes) }}
						</td>
						<td :class="$style.actionCell" @click.stop>
							<N8nActionDropdown
								:items="rowActions()"
								:disabled="props.disabled || props.loading || isMutating"
								activator-icon="ellipsis"
								data-testid="agent-files-actions"
								@select="onAction($event, file)"
							/>
						</td>
					</tr>

					<template v-if="props.loading && props.files.length === 0">
						<tr v-for="item in 5" :key="item">
							<td v-for="col in 6" :key="col">
								<ElSkeletonItem />
							</td>
						</tr>
					</template>

					<tr v-if="!props.loading && props.files.length === 0" :class="$style.lastRow">
						<td :colspan="6">
							<span :class="$style.emptyMessage" data-testid="agent-files-empty">
								{{
									props.isPublished
										? i18n.baseText('agents.builder.files.empty')
										: i18n.baseText('agents.builder.files.publishRequired')
								}}
							</span>
						</td>
					</tr>
				</tbody>
			</N8nTableBase>
		</div>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	width: 100%;
}

.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
}

.titleIcon {
	color: var(--text-color--subtler);
}

.fileInput {
	display: none;
}

.tableContainer {
	width: 100%;
	overflow-x: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.titleCell {
	width: 42%;
	max-width: 0;
}

.fileTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.fileIcon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.fileName {
	display: block;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.originCell,
.dateCell,
.typeCell,
.sizeCell {
	width: 1%;
	white-space: nowrap;
}

.originPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	white-space: nowrap;
}

.dateCell,
.typeCell,
.sizeCell {
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.actionCell {
	width: 1%;
	min-width: var(--spacing--2xl);
	color: var(--text-color--subtler);
	text-align: right;
	white-space: nowrap;
}

.fileRow {
	td {
		color: var(--text-color--subtler);
	}

	&:hover {
		background-color: var(--background--hover);
	}
}

.lastRow {
	td {
		padding: var(--spacing--lg);
		text-align: center;
	}

	&:hover {
		background-color: var(--background--surface) !important;
	}
}

.emptyMessage {
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}
</style>
