<script lang="ts" setup>
import type { InstanceAiAttachment } from '@n8n/api-types';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { N8nIcon } from '@n8n/design-system';
import { computed, onBeforeUnmount, ref } from 'vue';

const props = defineProps<{
	file?: File;
	attachment?: InstanceAiAttachment;
	isRemovable?: boolean;
}>();

const emit = defineEmits<{
	remove: [file: File];
}>();

const loading = ref(true);

const mimeType = computed(() => props.file?.type ?? props.attachment?.mimeType ?? '');
const fileName = computed(() => props.file?.name ?? props.attachment?.fileName ?? '');
const isImage = computed(() => mimeType.value.startsWith('image/'));

const objectUrl = computed(() => {
	if (props.file && isImage.value) {
		return URL.createObjectURL(props.file);
	}
	return null;
});

const thumbnailSrc = computed(() => {
	if (objectUrl.value) return objectUrl.value;
	if (props.attachment && isImage.value) {
		return `data:${props.attachment.mimeType};base64,${props.attachment.data}`;
	}
	return null;
});

const fallbackFile = computed(() => {
	if (props.file) return props.file;
	if (props.attachment) {
		return new File([], props.attachment.fileName, { type: props.attachment.mimeType });
	}
	return new File([], 'unknown');
});

function handleLoad() {
	loading.value = false;
}

function handleRemove() {
	if (props.file) {
		emit('remove', props.file);
	}
}

onBeforeUnmount(() => {
	if (objectUrl.value) {
		URL.revokeObjectURL(objectUrl.value);
	}
});
</script>

<template>
	<div v-if="isImage && thumbnailSrc" :class="$style.thumbnailWrapper">
		<div v-if="loading" :class="$style.loadingSkeleton">
			<N8nIcon icon="spinner" color="primary" spin size="small" />
		</div>
		<img :src="thumbnailSrc" :alt="fileName" :class="$style.thumbnail" @load="handleLoad" />
		<button
			v-if="isRemovable"
			:class="$style.removeBtn"
			data-test-id="attachment-preview-remove"
			@click.stop="handleRemove"
		>
			<N8nIcon icon="x" size="small" />
		</button>
	</div>
	<ChatFile
		v-else
		:file="fallbackFile"
		:is-removable="isRemovable ?? false"
		@remove="emit('remove', $event)"
	/>
</template>

<style lang="scss" module>
.thumbnailWrapper {
	position: relative;
	width: 80px;
	height: 80px;
	border-radius: var(--radius--lg);
	overflow: hidden;
	border: var(--border);
	flex-shrink: 0;
}

.thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.loadingSkeleton {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--foreground--tint-2);
	z-index: 1;
}

.removeBtn {
	position: absolute;
	top: var(--spacing--4xs);
	right: var(--spacing--4xs);
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--color--foreground--shade-2) 70%, transparent);
	color: white;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--3xs);
	opacity: 0;
	transition: opacity 0.15s;

	.thumbnailWrapper:hover & {
		opacity: 1;
	}

	@media (hover: none) {
		opacity: 1;
	}
}
</style>
