<script setup lang="ts">
/**
 * Quick-action chips pinned above the chat input.
 *   - Add tool: opens `AgentToolsModal` via the shared modal system and
 *     re-emits the confirmed tools upward as `update:tools`.
 *   - Add trigger: opens `AgentChannelModal` and re-emits connected-channel
 *     updates + trigger-added events upward.
 */
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_TOOLS_MODAL_KEY } from '../constants';
import type { AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';
import AgentChipButton from './AgentChipButton.vue';
import AgentChannelModal, { type ChannelView } from './AgentChannelModal.vue';

const props = defineProps<{
	tools: AgentJsonToolRef[];
	mcpServers?: AgentJsonMcpServerConfig[];
	projectId: string;
	agentId: string;
	connectedTriggers: string[];
	isPublished: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:tools': [tools: AgentJsonToolRef[]];
	'update:mcp-servers': [mcpServers: AgentJsonMcpServerConfig[]];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
	'agent-changed': [];
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const channelModalOpen = ref(false);
const channelModalView = ref<ChannelView>('list');

function onAddTool() {
	if (props.disabled) return;

	uiStore.openModalWithData({
		name: AGENT_TOOLS_MODAL_KEY,
		data: {
			tools: props.tools,
			mcpServers: props.mcpServers ?? [],
			projectId: props.projectId,
			agentId: props.agentId,
			onConfirm: (props: {
				tools?: AgentJsonToolRef[];
				mcpServers?: AgentJsonMcpServerConfig[];
			}) => {
				if (props.tools) {
					emit('update:tools', props.tools);
				}
				if (props.mcpServers) {
					emit('update:mcp-servers', props.mcpServers);
				}
			},
		},
	});
}

function onAddTrigger() {
	if (props.disabled) return;

	channelModalView.value = 'list';
	channelModalOpen.value = true;
}

function handleChannelConnected(channelType: string) {
	const triggers = Array.from(new Set([...props.connectedTriggers, channelType]));
	emit('update:connected-triggers', triggers);
	emit('trigger-added', { triggerType: channelType, triggers });
}

function handleChannelDisconnected(channelType: string) {
	emit(
		'update:connected-triggers',
		props.connectedTriggers.filter((trigger) => trigger !== channelType),
	);
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.row" data-testid="agent-chat-quick-actions">
			<AgentChipButton
				variant="suggestion"
				icon="wrench"
				:disabled="props.disabled"
				data-testid="agent-quick-action-add-tool"
				@click="onAddTool"
			>
				{{ i18n.baseText('agents.builder.quickActions.addTool') }}
			</AgentChipButton>
			<AgentChipButton
				variant="suggestion"
				icon="zap"
				:disabled="props.disabled"
				data-testid="agent-quick-action-add-trigger"
				@click="onAddTrigger"
			>
				{{ i18n.baseText('agents.builder.quickActions.addTrigger') }}
			</AgentChipButton>
		</div>

		<AgentChannelModal
			v-if="channelModalOpen"
			v-model:open="channelModalOpen"
			v-model:view="channelModalView"
			:agent-id="agentId"
			:project-id="projectId"
			:connected-channels="connectedTriggers"
			:is-published="isPublished"
			@channel-connected="handleChannelConnected"
			@channel-disconnected="handleChannelDisconnected"
			@agent-changed="emit('agent-changed')"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: contents;
}

.row {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
