<script lang="ts" setup>
import { useCanvas } from '@/composables/useCanvas';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useI18n } from '@/composables/useI18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type CanvasNodeData } from '@/types';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const { data } = defineProps<{ data: CanvasNodeData }>();

const router = useRouter();
const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const { isExecuting } = useCanvas();
const { runEntireWorkflow } = useRunWorkflow({ router });
const { toggleChatOpen } = useCanvasOperations({ router });

const isChatOpen = computed(() => workflowsStore.isChatPanelOpen);
</script>

<template>
	<N8nButton
		v-if="data.type === CHAT_TRIGGER_NODE_TYPE"
		type="secondary"
		size="large"
		:disabled="isExecuting"
		@click="toggleChatOpen('node')"
		>{{ isChatOpen ? i18n.baseText('chat.hide') : i18n.baseText('chat.window.title') }}</N8nButton
	>
	<N8nButton
		v-else
		type="secondary"
		size="large"
		:disabled="isExecuting"
		@click="runEntireWorkflow('node', data.name)"
		>{{ i18n.baseText('nodeView.runButtonText.executeWorkflow') }}</N8nButton
	>
</template>
