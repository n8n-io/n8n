<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { saveAs } from 'file-saver';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { BINARY_DATA_VIEW_MODAL_KEY } from '@/app/constants';
import { computed } from 'vue';
import type { BinaryMetadata } from '@/Interface';

interface Props {
	value: BinaryMetadata;
	depth?: number;
}

const props = defineProps<Props>();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();

const tablePreview = computed(() => {
	if (!fileUrl.value) return false;
	const mimeType = props.value.mimeType;
	const bytes = Number(props.value.bytes);
	const isImageType = mimeType?.startsWith('image/') ?? false;
	const passThreshold = bytes === undefined ? false : bytes < 1048576;
	return isImageType && passThreshold;
});

const fileName = computed(() => {
	const { fileName, fileExtension } = props.value;
	if (fileName?.includes('.')) return fileName;
	return `${fileName}.${fileExtension}`;
});

const fileUrl = computed(() => {
	const { id, mimeType } = props.value;
	return workflowsStore.getBinaryUrl(id, 'download', fileName.value, mimeType ?? '');
});

const fileMeta = computed(() => {
	const { mimeType, fileSize } = props.value;
	return mimeType + (fileSize ? `, ${fileSize}` : '');
});

const downloadBinaryData = () => {
	saveAs(fileUrl.value, fileName.value);
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
</script>

<template>
	<div :class="$style.container" :style="containerStyle">
		<div :class="$style.wrapper" @click="viewBinaryData">
			<img v-if="tablePreview" :src="fileUrl" :class="$style.imagePreview" />
			<div v-else :class="$style.iconWrapper">
				<N8nIcon icon="file" size="xlarge" />
			</div>
		</div>
		<div :class="$style.info">
			<div :class="$style.filename">{{ fileName }}</div>
			<div v-if="fileMeta" :class="$style.meta">{{ fileMeta }}</div>
		</div>
		<div :class="$style.download" @click="downloadBinaryData">
			<N8nIcon icon="download" size="large" />
		</div>
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
	background-color: var(--color--background--shade-1);
	border-radius: 50%;
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
	font-size: var(--font-size--xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	font-size: var(--font-size--3xs);
	color: var(--color--text--shade-2);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: wrap;
}

.download {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	cursor: pointer;
	flex-shrink: 0;
	opacity: 0;
	transition: opacity 0.2s ease-in-out;
}
</style>
