<script setup lang="ts">
/**
 * Quick-action chips pinned above the chat input.
 *   - Add tool: opens `AgentToolsModal` via the shared modal system and
 *     re-emits the confirmed tools upward as `update:tools`.
 *   - Add trigger: opens `AgentAddTriggerModal` and re-emits connected-trigger
 *     updates + trigger-added events upward.
 */
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_TOOLS_MODAL_KEY, AGENT_ADD_TRIGGER_MODAL_KEY } from '../constants';
import type { AgentJsonToolRef } from '../types';

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
		},
	});
}
</script>

<template>
	<div :class="$style.row" data-testid="agent-chat-quick-actions">
		<button
			type="button"
			:class="$style.quickActionButton"
			data-testid="agent-quick-action-add-tool"
			@click="onAddTool"
		>
			<N8nIcon icon="wrench" size="medium" :class="$style.quickActionIcon" />
			{{ i18n.baseText('agents.builder.quickActions.addTool') }}
		</button>
		<button
			type="button"
			:class="$style.quickActionButton"
			data-testid="agent-quick-action-add-trigger"
			@click="onAddTrigger"
		>
			<N8nIcon icon="zap" size="medium" :class="$style.quickActionIcon" />
			{{ i18n.baseText('agents.builder.quickActions.addTrigger') }}
		</button>
	</div>
</template>

<style lang="scss" module>
@use '../../ai/shared/styles/prompt-suggestion-buttons' as promptSuggestions;

.row {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
}

.quickActionButton {
	@include promptSuggestions.prompt-suggestion-button;
}

.quickActionIcon {
	@include promptSuggestions.prompt-suggestion-icon;

	.quickActionButton:hover &,
	.quickActionButton:focus-visible & {
		opacity: 1;
	}
}
</style>
