<script setup lang="ts">
import AssistantsHub from '@/features/ai/assistant/components/AssistantsHub.vue';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useUIStore } from '@/app/stores/ui.store';
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

const props = defineProps<{
	layoutRef: Element | null;
}>();

const chatPanelStore = useChatPanelStore();
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
watch(chatPanelWidth, async () => {
	await updateGridWidth();
});
</script>

<template>
	<AssistantsHub />
</template>
