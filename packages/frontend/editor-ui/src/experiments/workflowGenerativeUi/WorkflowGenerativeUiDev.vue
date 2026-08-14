<script setup lang="ts">
import { watch } from 'vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import FollowUpBar from './FollowUpBar.vue';
import GenerativeUiOverlay from './GenerativeUiOverlay.vue';
import ViewPicker from './ViewPicker.vue';
import { historyKey } from './history';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

const emit = defineEmits<{
	'update:canvasVisible': [visible: boolean];
}>();

const workflowDocumentStore = injectWorkflowDocumentStore();
const store = useWorkflowGenerativeUiStore();

const getWorkflow = () => ({
	id: workflowDocumentStore.value.documentId,
	name: workflowDocumentStore.value.name,
	nodes: workflowDocumentStore.value.allNodes.map((node) => ({ ...node })),
	connections: workflowDocumentStore.value.connectionsBySourceNode,
});
store.setWorkflowGetter(getWorkflow);

const activeView = store.view;
if (
	activeView !== 'canvas' &&
	store.activeHistoryKey !== historyKey(workflowDocumentStore.value.documentId, activeView)
) {
	store.invalidateHistories();
	void store.setView('canvas');
}

watch(
	() => store.view,
	(view) => emit('update:canvasVisible', view === 'canvas'),
	{ immediate: true },
);

watch(
	() => workflowDocumentStore.value.documentId,
	(documentId, previousDocumentId) => {
		if (previousDocumentId === undefined || documentId === previousDocumentId) return;
		store.invalidateHistories();
		void store.setView('canvas');
	},
);
</script>

<template>
	<div :class="$style.root">
		<ViewPicker />
		<GenerativeUiOverlay v-if="store.view !== 'canvas'" />
		<FollowUpBar />
	</div>
</template>

<style lang="scss" module>
.root {
	display: contents;
}
</style>
