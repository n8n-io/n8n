<script setup lang="ts">
import IconDelete from 'virtual:icons/mdi/closeThick';
import IconFileImage from 'virtual:icons/mdi/fileImage';
import IconFileMusic from 'virtual:icons/mdi/fileMusic';
import IconFileText from 'virtual:icons/mdi/fileText';
import IconFileVideo from 'virtual:icons/mdi/fileVideo';
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
	if (props.isPreviewable) {
		window.open(URL.createObjectURL(props.file));
	}
}
function onDelete() {
	emit('remove', props.file);
}
</script>

<template>
	<div class="chat-file" @click="onClick">
		<TypeIcon />
		<p class="chat-file-name">{{ file.name }}</p>
		<span v-if="isRemovable" class="chat-file-delete" @click.stop="onDelete">
			<IconDelete />
		</span>
		<IconPreview v-else-if="isPreviewable" class="chat-file-preview" />
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
	display: block;
	cursor: pointer;
	flex-shrink: 0;
}

.chat-file-delete {
	position: relative;
	&:hover {
		color: red;
	}

	/* Increase hit area for better clickability */
	&:before {
		content: '';
		position: absolute;
		top: -10px;
		right: -10px;
		bottom: -10px;
		left: -10px;
	}
}
</style>
