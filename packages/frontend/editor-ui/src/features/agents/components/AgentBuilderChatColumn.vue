<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type {
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonToolRef,
	AgentResource,
} from '../types';
import AgentBuilderUnconfiguredEmptyState from './AgentBuilderUnconfiguredEmptyState.vue';
import AgentChatPanel from './AgentChatPanel.vue';
import AgentChatQuickActions from './AgentChatQuickActions.vue';

const props = defineProps<{
	initialized: boolean;
	projectId: string;
	agentId: string;
	agentName: string;
	agent: AgentResource | null;
	localConfig: AgentJsonConfig | null;
	connectedTriggers: string[];
	initialPrompt?: string;
	isBuilderConfigured: boolean;
	isFullWidth: boolean;
	canEditAgent: boolean;
	isBuildChatStreaming: boolean;
	beforeBuildSend?: () => Promise<void> | void;
}>();

const emit = defineEmits<{
	'config-updated': [];
	'build-done': [];
	'update:streaming': [streaming: boolean];
	'update:tools': [tools: AgentJsonToolRef[]];
	'update:mcp-servers': [mcpServers: AgentJsonMcpServerConfig[]];
	'update:connected-triggers': [triggers: string[]];
	'update:full-width': [fullWidth: boolean];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
	'agent-published': [agent: AgentResource];
	'agent-changed': [];
}>();

const i18n = useI18n();

const fullWidthToggleLabel = computed(() =>
	i18n.baseText(
		props.isFullWidth
			? 'agents.builder.chat.fullWidth.collapse.ariaLabel'
			: 'agents.builder.chat.fullWidth.expand.ariaLabel',
	),
);

const sharedInputDraft = ref('');
</script>

<template>
	<aside
		:class="$style.chatColumn"
		:aria-label="i18n.baseText('agents.builder.chatColumn.ariaLabel')"
		data-testid="agent-builder-chat-column"
	>
		<span v-if="initialized" :class="$style.floatingFullWidthToggle">
			<N8nTooltip placement="left" :content="fullWidthToggleLabel">
				<N8nButton
					variant="ghost"
					icon-only
					size="small"
					:class="$style.headerIconBtn"
					:aria-label="fullWidthToggleLabel"
					data-testid="agent-build-chat-full-width-toggle"
					@click="emit('update:full-width', !isFullWidth)"
				>
					<N8nIcon :icon="isFullWidth ? 'minimize-2' : 'maximize-2'" :size="14" />
				</N8nButton>
			</N8nTooltip>
		</span>
		<div :class="$style.chatBody">
			<AgentChatPanel
				v-if="initialized && isBuilderConfigured"
				v-model:input-draft="sharedInputDraft"
				:project-id="projectId"
				:agent-id="agentId"
				mode="inline"
				endpoint="build"
				:initial-message="initialPrompt"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				:can-edit-agent="canEditAgent"
				:before-send="beforeBuildSend"
				@config-updated="emit('config-updated')"
				@build-done="emit('build-done')"
				@update:streaming="emit('update:streaming', $event)"
			>
				<template v-if="canEditAgent" #above-input="{ disabled: chatActionsDisabled }">
					<div :class="$style.quickActionsRow">
						<AgentChatQuickActions
							:tools="localConfig?.tools ?? []"
							:mcp-servers="localConfig?.mcpServers ?? []"
							:project-id="projectId"
							:agent-id="agentId"
							:connected-triggers="connectedTriggers"
							:is-published="
								agent?.activeVersionId !== null && agent?.activeVersionId !== undefined
							"
							:disabled="isBuildChatStreaming || chatActionsDisabled"
							@update:tools="emit('update:tools', $event)"
							@update:mcp-servers="emit('update:mcp-servers', $event)"
							@update:connected-triggers="emit('update:connected-triggers', $event)"
							@trigger-added="emit('trigger-added', $event)"
							@agent-changed="emit('agent-changed')"
						/>
					</div>
				</template>
			</AgentChatPanel>
			<AgentBuilderUnconfiguredEmptyState v-if="initialized && !isBuilderConfigured" />
		</div>
	</aside>
</template>

<style lang="scss" module>
.chatColumn {
	position: relative;
	display: flex;
	flex-direction: column;
	background-color: var(--background--surface);
	border-right: var(--border);
	height: 100%;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}

.quickActionsRow {
	display: flex;
	align-items: flex-start;
	justify-content: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.headerIconBtn {
	color: var(--text-color--subtle);

	&:hover,
	&:focus-visible {
		color: var(--text-color);
	}
}

.floatingFullWidthToggle {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--sm);
	z-index: 2;
	display: flex;
}

.chatBody {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	display: flex;
}

.chatBody > * {
	flex: 1;
	min-height: 0;
	max-width: 45rem;
	margin: 0 auto;
}
</style>
