<script setup lang="ts">
import { computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IBinaryData } from 'n8n-workflow';
import BinaryContentViewer from './BinaryContentViewer.vue';

// Thin adapter around BinaryContentViewer: resolves an `IBinaryData` prop into
// a source URL (the authenticated binary-data endpoint when the data is stored
// by id, a data URI when it is inlined) and delegates rendering.
const props = defineProps<{
	binaryData: IBinaryData;
}>();

const workflowsStore = useWorkflowsStore();

const sourceUrl = computed(() => {
	const { id, data, fileName, mimeType } = props.binaryData;
	if (!id) {
		return `data:${mimeType};charset=utf-8;base64,${data}`;
	}
	return workflowsStore.getBinaryUrl(id, 'view', fileName ?? '', mimeType);
});
</script>

<template>
	<BinaryContentViewer
		:source-url="sourceUrl"
		:file-type="binaryData.fileType"
		:mime-type="binaryData.mimeType"
	/>
</template>
