<script setup lang="ts">
import AssistantsHub from '@/features/ai/assistant/components/AssistantsHub.vue';
import InstanceAiCanvasPanel from '@/features/ai/instanceAi/components/InstanceAiCanvasPanel.vue';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useProvideWorkflowId } from '@/app/composables/useProvideWorkflowId';
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

const props = defineProps<{
	layoutRef: Element | null;
}>();

useProvideWorkflowId();

const chatPanelStore = useChatPanelStore();
const chatHubPanelStore = useChatHubPanelStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();

const isInstanceAiActive = computed(() => settingsStore.isModuleActive('instance-ai'));

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

function handleClose() {
	chatPanelStore.close();
}
</script>

<template>
	<InstanceAiCanvasPanel v-if="isInstanceAiActive" @close="handleClose" />
	<AssistantsHub v-else />
</template>
