<script setup lang="ts">
import AssistantsHub from '@/features/ai/assistant/components/AssistantsHub.vue';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useUIStore } from '@/app/stores/ui.store';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

const props = defineProps<{
	layoutRef: Element | null;
}>();

// The assistant/builder chat is mounted globally (App.vue #aside) and renders
// NDV-store consumers (setup cards, node issues, node execution) that may
// outlive the workflow editor (e.g. after navigating to a settings route).
// Re-provide the resolved workflow document store so those components resolve a
// scoped NDV store via injectNDVStore() even when no workflow is loaded.
provideWorkflowDocumentStore();

const chatPanelStore = useChatPanelStore();
const chatHubPanelStore = useChatHubPanelStore();
const uiStore = useUIStore();

const chatPanelWidth = computed(() => chatPanelStore.width);

const updateGridWidth = async () => {
	await nextTick();
	if (props.layoutRef) {
		const { width, height } = props.layoutRef.getBoundingClientRect();
		uiStore.appGridDimensions = { width, height };
	}
};

onMounted(async () => {
	window.addEventListener('resize', updateGridWidth);
	await updateGridWidth();
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', updateGridWidth);
});

// As chat panel width changes, recalculate the total width regularly
// Skip when chatHub is open since it floats over the canvas
watch(chatPanelWidth, async () => {
	if (chatHubPanelStore.isOpen) return;
	await updateGridWidth();
});
</script>

<template>
	<AssistantsHub />
</template>
