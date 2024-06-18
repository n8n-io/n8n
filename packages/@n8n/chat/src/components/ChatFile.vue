<script setup lang="ts">
import IconFileText from 'virtual:icons/mdi/fileText';
import IconFileMusic from 'virtual:icons/mdi/fileMusic';
import IconFileImage from 'virtual:icons/mdi/fileImage';
import IconFileVideo from 'virtual:icons/mdi/fileVideo';
import IconDelete from 'virtual:icons/mdi/delete';

import { computed, type FunctionalComponent } from 'vue';
import prettyBytes from 'pretty-bytes';
import { Tooltip } from 'floating-vue';
import 'floating-vue/dist/style.css';

const props = defineProps<{
	// The file to display
	file: File;
}>();

defineEmits<{
	(event: 'remove', value: File): void;
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
</script>

<template>
	<div class="chat-file">
		<TypeIcon />
		<Tooltip class="chat-file-name-tooltip">
			<p class="chat-file-name">{{ file.name }}</p>
			<template #popper>[{{ prettyBytes(file.size) }}] {{ file.name }}</template>
		</Tooltip>
		<button class="chat-file-delete" @click="$emit('remove', file)">
			<IconDelete />
		</button>
	</div>
</template>

<style scoped lang="scss">
.chat-file {
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	max-width: 100%;
	width: 100%;
	gap: 0.25rem;
}

.chat-file-name-tooltip {
	overflow: hidden;
}
.chat-file-name {
	overflow: hidden;
	max-width: 100%;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.chat-file-delete {
	margin-left: auto;
	background: none;
	border: none;

	&:hover,
	&:focus {
		color: red;
		cursor: pointer;
	}
}
</style>
