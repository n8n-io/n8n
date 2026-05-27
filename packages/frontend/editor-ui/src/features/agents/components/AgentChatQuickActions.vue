<script setup lang="ts">
/**
 * Quick-action chips pinned above the chat input.
 *   - Add tool: opens `AgentToolsModal` via the shared modal system and
 *     re-emits the confirmed tools upward as `update:tools`.
 *   - Add trigger: opens `AgentAddTriggerModal` and re-emits connected-trigger
 *     updates + trigger-added events upward.
 */
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_TOOLS_MODAL_KEY, AGENT_ADD_TRIGGER_MODAL_KEY } from '../constants';
import type { AgentJsonToolRef, AgentResource } from '../types';
import AgentChipButton from './AgentChipButton.vue';

const props = defineProps<{
	tools: AgentJsonToolRef[];
	projectId: string;
	agentId: string;
	agentName: string;
	isPublished: boolean;
	connectedTriggers: string[];
}>();

const emit = defineEmits<{
	'update:tools': [tools: AgentJsonToolRef[]];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
	'agent-published': [agent: AgentResource];
}>();

const i18n = useI18n();
const uiStore = useUIStore();

function onAddTool() {
	uiStore.openModalWithData({
		name: AGENT_TOOLS_MODAL_KEY,
		data: {
			tools: props.tools,
			projectId: props.projectId,
			agentId: props.agentId,
			onConfirm: (tools: AgentJsonToolRef[]) => emit('update:tools', tools),
		},
	});
}

function onAddTrigger() {
	uiStore.openModalWithData({
		name: AGENT_ADD_TRIGGER_MODAL_KEY,
		data: {
			projectId: props.projectId,
			agentId: props.agentId,
			agentName: props.agentName,
			isPublished: props.isPublished,
			connectedTriggers: props.connectedTriggers,
			onConnectedTriggersChange: (triggers: string[]) =>
				emit('update:connected-triggers', triggers),
			onTriggerAdded: (payload: { triggerType: string; triggers: string[] }) =>
				emit('trigger-added', payload),
			onAgentPublished: (agent: AgentResource) => emit('agent-published', agent),
		},
	});
}
</script>

<template>
	<div :class="$style.row" data-testid="agent-chat-quick-actions">
		<AgentChipButton
			variant="suggestion"
			icon="wrench"
			data-testid="agent-quick-action-add-tool"
			@click="onAddTool"
		>
			{{ i18n.baseText('agents.builder.quickActions.addTool') }}
		</AgentChipButton>
		<AgentChipButton
			variant="suggestion"
			icon="zap"
			data-testid="agent-quick-action-add-trigger"
			@click="onAddTrigger"
		>
			{{ i18n.baseText('agents.builder.quickActions.addTrigger') }}
		</AgentChipButton>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
