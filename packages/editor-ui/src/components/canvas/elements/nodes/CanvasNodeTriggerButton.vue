<script lang="ts" setup>
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useI18n } from '@/composables/useI18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type CanvasNodeData } from '@/types';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const { data, variant } = defineProps<{ data: CanvasNodeData; variant: 1 | 2 }>();

const router = useRouter();
const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const { runEntireWorkflow } = useRunWorkflow({ router });
const { toggleChatOpen } = useCanvasOperations({ router });

const isChatOpen = computed(() => workflowsStore.isChatPanelOpen);
const isExecuting = computed(() => uiStore.isActionActive['workflowRunning']);
</script>

<template>
	<N8nButton
		v-if="variant === 1 && data.type === CHAT_TRIGGER_NODE_TYPE"
		type="secondary"
		size="large"
		:disabled="isExecuting"
		@click="toggleChatOpen('node')"
		>{{ isChatOpen ? i18n.baseText('chat.hide') : i18n.baseText('chat.window.title') }}</N8nButton
	>
	<N8nButton
		v-else-if="variant === 1"
		type="secondary"
		size="large"
		:disabled="isExecuting"
		@click="runEntireWorkflow('node', data.name)"
		>{{ i18n.baseText('nodeView.runButtonText.executeWorkflow') }}</N8nButton
	>
	<N8nButton
		v-else-if="variant === 2 && data.type === CHAT_TRIGGER_NODE_TYPE"
		type="primary"
		size="large"
		:disabled="isExecuting"
		:label="isChatOpen ? i18n.baseText('chat.hide') : i18n.baseText('chat.window.title')"
		icon="comment"
		@click="toggleChatOpen('node')"
	/>
	<N8nButton
		v-else
		type="primary"
		size="large"
		:disabled="isExecuting"
		:label="i18n.baseText('nodeView.runButtonText.executeWorkflow')"
		icon="bolt"
		@click="runEntireWorkflow('node', data.name)"
	/>
</template>
