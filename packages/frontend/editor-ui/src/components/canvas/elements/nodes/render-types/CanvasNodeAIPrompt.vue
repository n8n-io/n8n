<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { nodeViewEventBus } from '@/event-bus';
import { useI18n } from '@/composables/useI18n';
import { useAssistantStore } from '@/stores/assistant.store';
import { useCanvasNode } from '@/composables/useCanvasNode';

const emit = defineEmits<{
	delete: [id: string];
}>();
const i18n = useI18n();

const { id } = useCanvasNode();
const nodeCreatorStore = useNodeCreatorStore();
const assistantStore = useAssistantStore();

const isTooltipVisible = ref(false);
const isPromptVisible = ref(true);

const prompt = ref(
	"Every morning at 9 am get current weather in Prague and send me an email if it's going to rain",
);
onMounted(() => {
	nodeViewEventBus.on('runWorkflowButton:mouseenter', onShowTooltip);
	nodeViewEventBus.on('runWorkflowButton:mouseleave', onHideTooltip);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('runWorkflowButton:mouseenter', onShowTooltip);
	nodeViewEventBus.off('runWorkflowButton:mouseleave', onHideTooltip);
});

function onShowTooltip() {
	isTooltipVisible.value = true;
}

function onHideTooltip() {
	isTooltipVisible.value = false;
}

async function onSubmit() {
	assistantStore.openChat();
	emit('delete', id.value);
	await assistantStore.initSupportChat(prompt.value);
	isPromptVisible.value = false;
}
</script>
<template>
	<div v-if="isPromptVisible" :class="$style.addNodes" data-test-id="canvas-ai-prompt">
		<N8nTooltip
			placement="top"
			:visible="isTooltipVisible"
			:disabled="nodeCreatorStore.showScrim"
			:popper-class="$style.tooltip"
			:show-after="700"
		>
			<form :class="$style.container" @submit.prevent="onSubmit">
				<n8n-input
					v-model="prompt"
					:class="$style.input"
					type="textarea"
					placeholder="Build me a workflow to do X"
					:read-only="false"
					:rows="15"
				/>
				<n8n-button native-type="submit">Send it</n8n-button>
			</form>
			<template #content> Type your prompt here </template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.input {
	width: 23rem;
}
.container {
	display: flex;
	flex-direction: column;
}
</style>
