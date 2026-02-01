<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import Modal from '@/app/components/Modal.vue';
import VueJsonPretty from 'vue-json-pretty';
import RunDataHtml from './RunDataHtml.vue';
import RunDataMarkdown from './RunDataMarkdown.vue';
import { BINARY_DATA_VIEW_MODAL_KEY } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { BinaryMetadata } from '@n8n/design-system';

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

const props = defineProps<{
	data: {
		binaryData: BinaryMetadata;
	};
}>();

const isLoading = ref(true);
const embedSource = ref('');
const error = ref(false);
const displayData = ref('');

let currentBlobUrl: string | null = null;

const binaryData = computed(() => {
	const { id, mimeType, fileName } = props.data.binaryData;
	let fileType = props.data.binaryData.fileType;

	if (mimeType) {
		if (mimeType.startsWith('image/')) fileType = 'image';
		else if (mimeType.startsWith('audio/')) fileType = 'audio';
		else if (mimeType.startsWith('video/')) fileType = 'video';
		else if (mimeType === 'application/pdf') fileType = 'pdf';
		else if (mimeType === 'application/json' || mimeType === 'text/json') fileType = 'json';
		else if (mimeType === 'text/html') fileType = 'html';
		else if (mimeType === 'text/markdown' || mimeType.includes('markdown')) fileType = 'markdown';
		else if (mimeType === 'text/plain') fileType = 'text';
		else if (fileType === undefined) fileType = 'other';
	}

	return {
		id,
		mimeType,
		fileName,
		fileType: fileType || 'other',
	};
});

function revokeBlobUrl() {
	if (currentBlobUrl) {
		URL.revokeObjectURL(currentBlobUrl);
		currentBlobUrl = null;
	}
}

async function loadBinaryData() {
	isLoading.value = true;
	error.value = false;

	revokeBlobUrl();
	embedSource.value = '';
	displayData.value = '';

	const { id, fileName, fileType, mimeType } = binaryData.value;

	try {
		const action = ['html', 'pdf', 'text'].includes(fileType) ? 'download' : 'view';
		const binaryUrl = workflowsStore.getBinaryUrl(id, action, fileName || '', mimeType || '');

		switch (fileType) {
			case 'json': {
				const fetchedData = await fetch(binaryUrl, { credentials: 'include' });
				displayData.value = await fetchedData.json();
				break;
			}

			case 'html':
			case 'markdown':
			case 'text': {
				const fetchedData = await fetch(binaryUrl, { credentials: 'include' });
				displayData.value = await fetchedData.text();
				break;
			}

			case 'pdf': {
				const fetched = await fetch(binaryUrl, { credentials: 'include' });
				const blob = await fetched.blob();

				currentBlobUrl = URL.createObjectURL(blob);
				embedSource.value = currentBlobUrl;
				break;
			}

			default:
				embedSource.value = binaryUrl;
		}
	} catch (e) {
		console.error(e.message);
		error.value = true;
	}

	isLoading.value = false;
}

watch(
	() => props.data.binaryData,
	() => {
		loadBinaryData().catch(() => {}); //error handled in loadBinaryData
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	revokeBlobUrl();
});
</script>

<template>
	<Modal
		width="60%"
		height="90%"
		title="File Preview"
		:name="BINARY_DATA_VIEW_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="['binary-data-modal-content', binaryData.fileType]">
				<div v-if="isLoading" class="loading-message">Loading binary data...</div>
				<div v-else-if="error" class="error-message">Error loading binary data</div>

				<div v-else class="content-wrapper">
					<!-- VIDEO -->
					<video v-if="binaryData.fileType === 'video'" controls autoplay>
						<source :src="embedSource" :type="binaryData.mimeType" />
						{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
					</video>

					<!-- AUDIO -->
					<audio v-else-if="binaryData.fileType === 'audio'" controls autoplay>
						<source :src="embedSource" :type="binaryData.mimeType" />
						{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
					</audio>

					<!-- IMAGE -->
					<img
						v-else-if="binaryData.fileType === 'image'"
						:src="embedSource"
						:alt="binaryData.fileName || 'Image preview'"
					/>

					<!-- JSON -->
					<VueJsonPretty
						v-else-if="binaryData.fileType === 'json'"
						:data="displayData"
						:deep="3"
						:show-length="true"
					/>

					<!-- HTML -->
					<RunDataHtml v-else-if="binaryData.fileType === 'html'" :input-html="displayData" />

					<!-- Markdown -->
					<RunDataMarkdown
						v-else-if="binaryData.fileType === 'markdown'"
						:input-markdown="displayData"
					/>

					<!-- TEXT -->
					<pre v-else-if="binaryData.fileType === 'text'" class="text-content">
						{{ displayData }}
					</pre
					>

					<!-- PDF -->
					<embed
						v-else-if="binaryData.fileType === 'pdf'"
						:src="embedSource"
						class="binary-data"
						type="application/pdf"
					/>

					<!-- UNKNOWN -->
					<div v-else class="error-message">Preview not available for this file type</div>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss">
.el-overlay:has([data-test-id='binaryDataView-modal']),
.el-dialog__wrapper:has([data-test-id='binaryDataView-modal']) {
	z-index: 10000000 !important;
}
</style>

<style lang="scss" scoped>
.binary-data-modal-content {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	&.json,
	&.markdown &.html,
	&.text {
		overflow: auto;
		.content-wrapper {
			align-items: flex-start;
			justify-content: flex-start;
		}
	}

	.content-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: auto;
	}

	img,
	video {
		max-height: 100%;
		max-width: 100%;
		display: block;
	}

	.binary-data {
		height: 100%;
		width: 100%;
	}

	.text-content {
		width: 100%;
		margin: 0;
		white-space: pre-wrap;
		word-wrap: break-word;
		color: var(--color--text);
		font-family: var(--font-family);
		font-size: var(--font-size--md);
	}

	&:not(.markdown):not(.html):not(.pdf) {
		padding: var(--spacing--sm) var(--spacing--md);
		border: var(--border);
		border-radius: var(--radius);
		background-color: var(--color--background--light-3);
	}

	.loading-message,
	.error-message {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color--text--shade-1);
	}
}
</style>
