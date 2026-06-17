<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { saveAs } from 'file-saver';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { BINARY_DATA_VIEW_MODAL_KEY } from '@/app/constants';
import { computed } from 'vue';
import type { BinaryMetadata } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

const BYTES_THRESHOLD = 1048576; // 1MB

interface Props {
	value: BinaryMetadata;
	depth?: number;
}

const props = defineProps<Props>();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const i18n = useI18n();

const tablePreview = computed(() => {
	if (!fileUrl.value) return false;
	const mimeType = props.value.mimeType;
	const bytes = Number(props.value.bytes);
	const isImageType = mimeType?.startsWith('image/') ?? false;
	const passThreshold = bytes === undefined ? false : bytes < BYTES_THRESHOLD;
	return isImageType && passThreshold;
});

const fileName = computed(() => {
	const { fileName, fileExtension } = props.value;
	const name = fileName ?? 'file';
	if (name?.includes('.')) return name;
	return fileExtension ? `${name}.${fileExtension}` : name;
});

const fileUrl = computed(() => {
	const { id, mimeType } = props.value;
	return workflowsStore.getBinaryUrl(id, 'download', fileName.value, mimeType ?? '');
});

const fileMeta = computed(() => {
	const { mimeType, fileSize } = props.value;
	return mimeType + (fileSize ? `, ${fileSize}` : '');
});

const downloadBinaryData = async () => {
	try {
		const response = await fetch(fileUrl.value);
		if (!response.ok) throw new Error('Error downloading file');
		const blob = await response.blob();
		saveAs(blob, fileName.value);
	} catch (error) {
		useToast().showMessage({
			title: i18n.baseText('runData.downloadBinaryData.error.title'),
			message: i18n.baseText('runData.downloadBinaryData.error.message'),
			type: 'error',
		});
	}
};

const viewBinaryData = () => {
	uiStore.openModalWithData({
		name: BINARY_DATA_VIEW_MODAL_KEY,
		data: {
			binaryData: props.value,
		},
	});
};

const containerStyle = computed(() => ({
	marginLeft: props.depth ? `${props.depth * 15}px` : '0',
}));

const fileIcon = computed(() => {
	const mimeType = props.value.mimeType;
	const isTextFile = mimeType?.startsWith('text/') ?? false;
	return isTextFile ? 'file-text' : 'file';
});
</script>

<template>
	<div :class="$style.container" :style="containerStyle">
		<div :class="$style.wrapper" @click="viewBinaryData">
			<img
				v-if="tablePreview"
				:src="fileUrl"
				:class="$style.imagePreview"
				:alt="fileName || 'Image preview'"
			/>
			<div v-else :class="$style.iconWrapper">
				<N8nIcon :icon="fileIcon" size="xlarge" />
			</div>
		</div>
		<div :class="$style.info">
			<div :class="$style.filename" @click="viewBinaryData">{{ fileName }}</div>
			<div v-if="fileMeta" :class="$style.meta">{{ fileMeta }}</div>
		</div>
		<button :class="$style.download" @click="downloadBinaryData">
			<N8nIcon icon="download" size="large" />
		</button>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: 50px;
	min-width: 150px;
	padding-bottom: var(--spacing--4xs);
	padding-left: var(--spacing--4xs);
	border-style: solid;
	border-radius: var(--radius);
	border-width: 1px;
	border-color: var(--color--foreground--shade-1);

	&:hover {
		.download {
			opacity: 1;
		}
	}
}

.wrapper {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	overflow: hidden;
	cursor: pointer;
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	overflow: hidden;
	color: var(--color--text--shade-2);
}

.imagePreview {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: var(--radius);
}

.info {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
	line-height: 1.2;
}

.filename {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
	overflow: hidden;
	max-width: 300px;
	text-overflow: ellipsis;
	white-space: nowrap;
	cursor: pointer;
}

.meta {
	font-size: var(--font-size--3xs);
	color: var(--color--text--shade-2);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: normal;
}

.download {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
	flex-shrink: 0;
	opacity: 0;
	transition: all 0.2s ease-in-out;
	color: var(--color--text--base);

	&:hover {
		color: var(--color--primary);
	}
}
</style>
