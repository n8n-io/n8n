<script setup lang="ts">
/**
 * Three quick-action chips pinned above the chat input.
 *   - Run now, Edit config: rendered only, disabled (PR1 scope).
 *   - Add tool: opens `AgentToolsModal` via the shared modal system and
 *     re-emits the confirmed tools upward as `update:tools`.
 */
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_TOOLS_MODAL_KEY } from '../constants';
import type { AgentJsonToolRef } from '../types';

const props = defineProps<{
	tools: AgentJsonToolRef[];
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{ 'update:tools': [tools: AgentJsonToolRef[]] }>();

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
</script>

<template>
	<div :class="$style.row" data-testid="agent-chat-quick-actions">
		<N8nButton type="tertiary" size="mini" disabled data-testid="agent-quick-action-run">
			<template #prefix><N8nIcon icon="play" size="xsmall" /></template>
			{{ i18n.baseText('agents.builder.quickActions.run') }}
		</N8nButton>
		<N8nButton type="tertiary" size="mini" disabled data-testid="agent-quick-action-edit">
			<template #prefix><N8nIcon icon="pencil" size="xsmall" /></template>
			{{ i18n.baseText('agents.builder.quickActions.edit') }}
		</N8nButton>
		<N8nButton
			type="tertiary"
			size="mini"
			data-testid="agent-quick-action-add-tool"
			@click="onAddTool"
		>
			<template #prefix><N8nIcon icon="sparkles" size="xsmall" /></template>
			{{ i18n.baseText('agents.builder.quickActions.addTool') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs);
	flex-wrap: wrap;
}
</style>
