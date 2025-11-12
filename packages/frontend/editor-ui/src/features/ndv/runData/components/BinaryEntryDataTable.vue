<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { saveAs } from 'file-saver';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed } from 'vue';

interface Props {
	value: Record<string, unknown>;
}

const props = defineProps<Props>();
const workflowsStore = useWorkflowsStore();

const isImage = computed(() => {
	const mimeType = props.value.mimeType as string | undefined;
	return mimeType?.startsWith('image/') ?? false;
});

const imageUrl = computed(() => {
	if (!isImage.value) return '';
	const { id, fileName, mimeType } = props.value as {
		id: string;
		fileName?: string;
		mimeType?: string;
	};
	if (!id) return '';
	return workflowsStore.getBinaryUrl(id, 'view', fileName ?? '', mimeType ?? '');
});

const displayName = computed(() => {
	const { fileName, fileExtension } = props.value as {
		fileName?: string;
		fileExtension?: string;
	};

	if (fileName?.includes('.')) {
		return fileName;
	}
	return `${fileName}.${fileExtension}`;
});

const displayMeta = computed(() => {
	const { mimeType, fileSize } = props.value as {
		mimeType?: string;
		fileSize?: string;
	};

	return `${mimeType}, ${fileSize}`;
});

const downloadBinaryData = () => {
	const { id, fileName, mimeType, fileExtension } = props.value as {
		id: string;
		fileName?: string;
		mimeType?: string;
		fileExtension?: string;
	};

	if (!id) return;

	const url = workflowsStore.getBinaryUrl(id, 'download', fileName ?? '', mimeType ?? '');
	const name = fileName
		? fileExtension
			? `${fileName}.${fileExtension}`
			: fileName
		: `binary_${id}`;

	saveAs(url, name);
};
</script>

<template>
	<div :class="$style.binaryEntry">
		<div :class="$style.iconWrapper">
			<img v-if="isImage && imageUrl" :src="imageUrl" :class="$style.thumbnail" />
			<N8nIcon v-else :class="$style.fileIcon" icon="file" size="xlarge" />
			<div :class="$style.viewButton">
				<N8nIcon :class="$style.viewIcon" icon="eye" size="xlarge" />
			</div>
		</div>
		<div :class="$style.metadata">
			<div :class="$style.fileName">{{ displayName }}</div>
			<div v-if="displayMeta" :class="$style.fileMeta">{{ displayMeta }}</div>
		</div>
		<div :class="$style.downloadButton" @click="downloadBinaryData">
			<N8nIcon :class="$style.downloadIcon" icon="download" size="xlarge" />
		</div>
	</div>
</template>

<style lang="scss" module>
.binaryEntry {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
	width: 100%;
	min-height: 48px;

	&:hover {
		.downloadButton {
			opacity: 1;
		}
	}
}

.iconWrapper {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	overflow: hidden;
	&:hover {
		.viewButton {
			opacity: 1;
		}
	}
}

.thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.viewButton {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	opacity: 0;
	transition: opacity 0.2s ease-in-out;
}

.viewIcon {
	color: var(--color--text--tint-1);
}

.metadata {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
	line-height: 1.2;
}

.fileName {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	font-weight: var(--font-weight--bold);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.fileMeta {
	font-size: var(--font-size--3xs);
	color: var(--color--text--shade-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.downloadButton {
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
