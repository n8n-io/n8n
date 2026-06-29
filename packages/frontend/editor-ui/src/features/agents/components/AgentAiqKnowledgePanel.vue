<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type {
	AiqCollection,
	AiqDocument,
	AiqHealthStatus,
} from '../composables/useAiqKnowledgeApi';

const props = withDefaults(
	defineProps<{
		collections: AiqCollection[];
		selectedCollectionName?: string | null;
		documents: AiqDocument[];
		healthStatus: AiqHealthStatus;
		collectionsLoading?: boolean;
		documentsLoading?: boolean;
		uploading?: boolean;
		deletingCollectionName?: string | null;
		deletingDocumentIds?: string[];
		error?: string;
		disabled?: boolean;
	}>(),
	{
		selectedCollectionName: null,
		collectionsLoading: false,
		documentsLoading: false,
		uploading: false,
		deletingCollectionName: null,
		deletingDocumentIds: () => [],
		error: '',
		disabled: false,
	},
);

const emit = defineEmits<{
	'create-collection': [name: string];
	'select-collection': [name: string];
	'delete-collection': [name: string];
	'upload-documents': [files: File[]];
	refresh: [];
}>();

const i18n = useI18n();
const collectionName = ref('');
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

const isUnavailable = computed(() => props.healthStatus === 'unavailable');
const canMutate = computed(() => !props.disabled && !isUnavailable.value);

function createCollection() {
	const name = collectionName.value.trim();
	if (!name || !canMutate.value) return;
	emit('create-collection', name);
	collectionName.value = '';
}

async function openFilePicker(collectionName: string) {
	if (!canMutate.value || props.uploading) return;
	if (collectionName !== props.selectedCollectionName) {
		emit('select-collection', collectionName);
		await nextTick();
	}
	fileInput.value?.click();
}

function onFilesSelected(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	const files = Array.from(input.files ?? []);
	input.value = '';
	if (files.length === 0) return;
	emit('upload-documents', files);
}

function displayDocumentName(document: AiqDocument) {
	return document.filename ?? document.name ?? document.file_id;
}
</script>

<template>
	<div :class="$style.panel" data-testid="agent-aiq-panel">
		<div :class="$style.header">
			<div>
				<N8nText tag="h4" :bold="true">
					{{ i18n.baseText('agents.builder.aiq.title') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('agents.builder.aiq.description') }}
				</N8nText>
			</div>
			<N8nTooltip :content="i18n.baseText('generic.refresh')">
				<N8nIconButton
					icon="refresh-cw"
					variant="ghost"
					size="mini"
					:disabled="props.disabled || props.collectionsLoading"
					data-testid="agent-aiq-refresh"
					@click="emit('refresh')"
				/>
			</N8nTooltip>
		</div>

		<N8nText v-if="props.error" size="xsmall" color="danger" data-testid="agent-aiq-error">
			{{ props.error }}
		</N8nText>

		<div :class="$style.createRow">
			<N8nInput
				v-model="collectionName"
				size="small"
				:placeholder="i18n.baseText('agents.builder.aiq.collections.namePlaceholder')"
				:disabled="!canMutate"
				data-testid="agent-aiq-create-collection-input"
				@keyup.enter="createCollection"
			/>
			<N8nButton
				size="small"
				:disabled="!canMutate || collectionName.trim().length === 0"
				data-testid="agent-aiq-create-collection"
				@click="createCollection"
			>
				{{ i18n.baseText('generic.create') }}
			</N8nButton>
		</div>

		<N8nLoading v-if="props.collectionsLoading" :rows="2" variant="p" />
		<N8nText v-else-if="props.collections.length === 0" size="xsmall" color="text-light">
			{{ i18n.baseText('agents.builder.aiq.collections.empty') }}
		</N8nText>
		<div v-else :class="$style.collectionList" data-testid="agent-aiq-collections">
			<div v-for="collection in props.collections" :key="collection.name" :class="$style.treeItem">
				<div
					:class="[
						$style.collectionRow,
						collection.name === props.selectedCollectionName && $style.selected,
					]"
					data-testid="agent-aiq-collection-row"
					@click="emit('select-collection', collection.name)"
				>
					<N8nIcon
						:icon="collection.name === props.selectedCollectionName ? 'folder-open' : 'folder'"
						size="small"
						:class="$style.treeIcon"
					/>
					<N8nText size="xsmall" color="text-dark" :class="$style.name">
						{{ collection.name }}
					</N8nText>
					<N8nTooltip :content="i18n.baseText('agents.builder.aiq.documents.upload')">
						<N8nIconButton
							icon="plus"
							variant="ghost"
							size="mini"
							icon-size="small"
							:class="$style.rowAction"
							:disabled="!canMutate || props.uploading"
							:loading="props.uploading && props.selectedCollectionName === collection.name"
							data-testid="agent-aiq-upload-documents"
							@click.stop="openFilePicker(collection.name)"
						/>
					</N8nTooltip>
					<N8nTooltip :content="i18n.baseText('agents.builder.aiq.collections.delete')">
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							size="mini"
							icon-size="small"
							:class="$style.rowAction"
							:disabled="!canMutate"
							:loading="props.deletingCollectionName === collection.name"
							data-testid="agent-aiq-delete-collection"
							@click.stop="emit('delete-collection', collection.name)"
						/>
					</N8nTooltip>
				</div>

				<div
					v-if="collection.name === props.selectedCollectionName"
					:class="$style.documentTree"
					data-testid="agent-aiq-documents"
				>
					<N8nLoading v-if="props.documentsLoading" :rows="2" variant="p" />
					<N8nText v-else-if="props.documents.length === 0" size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.aiq.documents.empty') }}
					</N8nText>
					<div v-else :class="$style.documentList">
						<div
							v-for="document in props.documents"
							:key="document.file_id"
							:class="$style.documentRow"
							data-testid="agent-aiq-document-row"
						>
							<N8nIcon icon="file" size="small" :class="$style.treeIcon" />
							<N8nText size="xsmall" color="text-dark" :class="$style.name">
								{{ displayDocumentName(document) }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
		</div>

		<input
			ref="fileInput"
			type="file"
			multiple
			:class="$style.fileInput"
			data-testid="agent-aiq-upload-input"
			@change="onFilesSelected"
		/>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.createRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.collectionList,
.documentList {
	display: flex;
	flex-direction: column;
}

.treeItem {
	display: flex;
	flex-direction: column;
}

.collectionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-height: var(--spacing--lg);
	padding: 0 var(--spacing--4xs);
	border-radius: var(--border-radius-base);
	cursor: pointer;
}

.collectionRow:hover {
	background-color: var(--color--background--light);
}

.selected {
	background-color: var(--color--background--light);
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.documentTree {
	display: flex;
	flex-direction: column;
	margin-left: var(--spacing--md);
}

.documentRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	min-height: var(--spacing--lg);
	padding: 0 var(--spacing--4xs);
	border-radius: var(--border-radius-base);
}

.documentRow:hover {
	background-color: var(--color--background--light);
}

.treeIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.rowAction {
	opacity: 0;
}

.collectionRow:hover .rowAction,
.rowAction:focus-visible {
	opacity: 1;
}

.fileInput {
	display: none;
}
</style>
