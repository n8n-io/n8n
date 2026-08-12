<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useFilesStore } from '@/features/core/files/files.store';
import type { FileUploadQueueItem } from '@/features/core/files/files.types';
import { getMimeFamilyIcon } from '@/features/core/files/utils/mimeUtils';
import { formatBytes } from '@/app/utils/typesUtils';

const i18n = useI18n();
const filesStore = useFilesStore();

const items = computed(() => filesStore.uploadQueue);

const activeCount = computed(
	() => items.value.filter((item) => ['pending', 'uploading'].includes(item.status)).length,
);

const errorMessageFor = (item: FileUploadQueueItem) => {
	if (item.errorMessage === 'tooLarge') {
		return i18n.baseText('files.upload.error.tooLarge', {
			interpolate: { size: formatBytes(filesStore.maxFileSizeBytes) },
		});
	}
	return item.errorMessage ?? i18n.baseText('generic.unknownError');
};

const canCancel = (item: FileUploadQueueItem) =>
	['pending', 'uploading', 'conflict'].includes(item.status);
const canRetry = (item: FileUploadQueueItem) => item.status === 'error';
</script>

<template>
	<div :class="$style.queue" data-test-id="upload-queue">
		<N8nText v-if="activeCount > 0" size="small" color="text-light" tag="div">
			{{
				i18n.baseText('files.upload.uploadingCount', {
					adjustToNumber: activeCount,
					interpolate: { count: String(activeCount) },
				})
			}}
		</N8nText>
		<div
			v-for="item in items"
			:key="item.id"
			:class="[$style.item, item.status === 'error' && $style.itemError]"
			data-test-id="upload-queue-item"
		>
			<N8nIcon
				v-if="item.status === 'done'"
				icon="circle-check"
				color="success"
				:class="$style.statusIcon"
			/>
			<N8nIcon
				v-else-if="item.status === 'error'"
				icon="circle-alert"
				color="danger"
				:class="$style.statusIcon"
			/>
			<N8nIcon v-else :icon="getMimeFamilyIcon(item.mimeType)" :class="$style.statusIcon" />
			<N8nText :class="$style.name" size="small" bold>{{ item.name }}</N8nText>
			<div :class="$style.detail">
				<div
					v-if="['pending', 'uploading'].includes(item.status)"
					:class="$style.progressTrack"
					role="progressbar"
					:aria-valuenow="item.progress"
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<div :class="$style.progressFill" :style="{ width: `${item.progress}%` }"></div>
				</div>
				<N8nText v-else-if="item.status === 'error'" size="small" color="danger">
					{{ errorMessageFor(item) }}
				</N8nText>
				<N8nText v-else-if="item.status === 'canceled'" size="small" color="text-light">
					{{ i18n.baseText('files.upload.canceled') }}
				</N8nText>
				<N8nText v-else-if="item.status === 'conflict'" size="small" color="warning">
					{{ i18n.baseText('files.upload.conflictPending') }}
				</N8nText>
				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('files.upload.done') }}
				</N8nText>
			</div>
			<N8nButton
				v-if="canCancel(item)"
				variant="ghost"
				size="mini"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="upload-queue-item-cancel"
				@click="filesStore.cancelUpload(item.id)"
			/>
			<N8nButton
				v-if="canRetry(item)"
				variant="subtle"
				size="mini"
				:label="i18n.baseText('files.upload.retry')"
				data-test-id="upload-queue-item-retry"
				@click="filesStore.retryUpload(item.id)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.queue {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
	border: var(--border);
	border-style: dashed;
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.itemError {
	color: var(--color--danger);
}

.statusIcon {
	flex-shrink: 0;
}

.name {
	flex-shrink: 0;
	max-width: 30%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.detail {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
}

.progressTrack {
	width: 100%;
	height: var(--spacing--3xs);
	border-radius: var(--radius);
	background-color: var(--color--foreground);
	overflow: hidden;
}

.progressFill {
	height: 100%;
	border-radius: var(--radius);
	background-color: var(--color--primary);
	transition: width 0.2s ease;
}
</style>
