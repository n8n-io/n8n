<script setup lang="ts">
import IconFileText from 'virtual:icons/mdi/fileText';
import IconFileMusic from 'virtual:icons/mdi/fileMusic';
import IconFileImage from 'virtual:icons/mdi/fileImage';
import IconFileVideo from 'virtual:icons/mdi/fileVideo';
import IconDelete from 'virtual:icons/mdi/closeThick';
import IconPreview from 'virtual:icons/mdi/openInNew';

import { computed, type FunctionalComponent } from 'vue';

const props = defineProps<{
	file: File;
	isRemovable: boolean;
	isPreviewable?: boolean;
}>();

const emit = defineEmits<{
	remove: [value: File];
}>();

const iconMapper: Record<string, FunctionalComponent> = {
	document: IconFileText,
	audio: IconFileMusic,
	image: IconFileImage,
	video: IconFileVideo,
};

const TypeIcon = computed(() => {
	const type = props.file?.type.split('/')[0];
	return iconMapper[type] || IconFileText;
});

function onClick() {
	if (props.isRemovable) {
		emit('remove', props.file);
	}

	if (props.isPreviewable) {
		window.open(URL.createObjectURL(props.file));
	}
}
</script>

<template>
	<div class="chat-file" @click="onClick">
		<TypeIcon />
		<p class="chat-file-name">{{ file.name }}</p>
		<IconDelete v-if="isRemovable" class="chat-file-delete" />
		<IconPreview v-if="isPreviewable" class="chat-file-preview" />
	</div>
</template>

<style scoped lang="scss">
.chat-file {
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	width: fit-content;
	max-width: 15rem;
	padding: 0.5rem;
	border-radius: 0.25rem;
	gap: 0.25rem;
	font-size: 0.75rem;
	background: white;
	color: var(--chat--color-dark);
	border: 1px solid var(--chat--color-dark);
	cursor: pointer;
}

.chat-file-name-tooltip {
	overflow: hidden;
}
.chat-file-name {
	overflow: hidden;
	max-width: 100%;
	text-overflow: ellipsis;
	white-space: nowrap;
	margin: 0;
}
.chat-file-delete,
.chat-file-preview {
	background: none;
	border: none;
	display: none;
	cursor: pointer;
	flex-shrink: 0;

	.chat-file:hover & {
		display: block;
	}
}
</style>
