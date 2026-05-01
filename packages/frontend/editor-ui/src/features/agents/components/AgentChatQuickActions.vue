<script setup lang="ts">
/**
 * Quick-action chips pinned above the chat input.
 *   - Add tool: opens `AgentToolsModal` via the shared modal system and
 *     re-emits the confirmed tools upward as `update:tools`.
 *   - Add trigger: opens `AgentAddTriggerModal` and re-emits connected-trigger
 *     updates + trigger-added events upward.
 */
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_TOOLS_MODAL_KEY, AGENT_ADD_TRIGGER_MODAL_KEY } from '../constants';
import type { AgentJsonToolRef, AgentResource } from '../types';

const props = defineProps<{
	tools: AgentJsonToolRef[];
	projectId: string;
	agentId: string;
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
		<N8nButton
			type="tertiary"
			size="mini"
			data-testid="agent-quick-action-add-tool"
			@click="onAddTool"
		>
			<template #prefix><N8nIcon icon="sparkles" size="xsmall" /></template>
			{{ i18n.baseText('agents.builder.quickActions.addTool') }}
		</N8nButton>
		<N8nButton
			type="tertiary"
			size="mini"
			data-testid="agent-quick-action-add-trigger"
			@click="onAddTrigger"
		>
			<template #prefix><N8nIcon icon="zap" size="xsmall" /></template>
			{{ i18n.baseText('agents.builder.quickActions.addTrigger') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	gap: var(--spacing--3xs);
	padding-left: var(--spacing--2xs);
	flex-wrap: wrap;
}
</style>
