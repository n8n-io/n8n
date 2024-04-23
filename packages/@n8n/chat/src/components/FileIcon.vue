<script setup>
// eslint-disable-next-line import/no-unresolved
import IconImage from 'virtual:icons/mdi/fileImage';
// eslint-disable-next-line import/no-unresolved
import IconDocument from 'virtual:icons/mdi/fileDocumentOutline';
import { computed } from 'vue';

const props = defineProps({
	fileMime: {
		type: String,
		required: true,
	},
	fileSize: {
		type: Number,
		required: true,
	},
	fileName: {
		type: String,
		required: true,
	},
	size: {
		type: Number,
		default: 32,
	},
});

const fileIconComponent = computed(() => {
	if (props.fileMime.startsWith('image/')) {
		return IconImage;
	}
	if (props.fileMime.startsWith('application/pdf')) {
		return IconDocument;
	}
	return IconDocument;
});
</script>

<template>
	<div class="file-icon">
		<Component :is="getIcon" :width="`${size}px`" :height="`${size}px`" />
		<!-- <getIcon /> -->
	</div>
</template>

<style lang="scss">
.file-icon {
	width: 32px;
	height: 32px;
}
</style>
