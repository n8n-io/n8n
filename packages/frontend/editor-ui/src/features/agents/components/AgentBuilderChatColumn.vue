<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { ChatMode } from '../composables/useAgentChatMode';
import type { AgentJsonConfig, AgentJsonToolRef, AgentResource } from '../types';
import AgentBuilderUnconfiguredEmptyState from './AgentBuilderUnconfiguredEmptyState.vue';
import AgentBuilderChatModeToggle from './AgentBuilderChatModeToggle.vue';
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
	chatMode: ChatMode;
	chatModeOpened: Record<ChatMode, boolean>;
	chatModeOptions: Array<{ label: string; value: ChatMode; disabled?: boolean }>;
	effectiveSessionId?: string;
	currentSessionTitle: string;
	currentSessionHasMessages: boolean;
	sessionOptions: Array<DropdownMenuItemProps<string>>;
	initialPrompt?: string;
	isBuilt: boolean;
	isBuilderConfigured: boolean;
	isBuildChatStreaming: boolean;
	isPublished: boolean;
	beforeBuildSend?: () => Promise<void> | void;
}>();

const emit = defineEmits<{
	'session-select': [sessionId: string];
	'new-chat': [];
	'config-updated': [];
	'continue-loaded': [count: number];
	'open-build': [];
	'chat-mode-change': [mode: ChatMode];
	'update:streaming': [streaming: boolean];
	'update:tools': [tools: AgentJsonToolRef[]];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
	'agent-published': [agent: AgentResource];
}>();

const i18n = useI18n();
const sessionMenuMaxHeight = 'calc((var(--spacing--xl) * 5) + var(--spacing--xs))';

// `sessionOptions` already match `DropdownMenuItemProps`; alias for template clarity.
const sessionMenuItems = computed<Array<DropdownMenuItemProps<string>>>(() => props.sessionOptions);
</script>

<template>
	<aside
		:class="$style.chatColumn"
		:aria-label="i18n.baseText('agents.builder.chatColumn.ariaLabel')"
		data-testid="agent-builder-chat-column"
	>
		<div
			v-if="initialized && chatMode === 'test' && effectiveSessionId"
			:class="$style.sessionHeader"
			data-testid="agent-chat-session-header"
		>
			<N8nDropdownMenu
				:items="sessionMenuItems"
				:max-height="sessionMenuMaxHeight"
				:extra-popper-class="$style.sessionMenu"
				placement="bottom-start"
				data-testid="agent-chat-session-picker"
				@select="emit('session-select', $event)"
			>
				<template #trigger>
					<N8nButton
						variant="ghost"
						size="small"
						:class="$style.sessionTitleBtn"
						:aria-label="i18n.baseText('agents.builder.chat.sessionPicker.ariaLabel')"
					>
						{{ currentSessionTitle }}
						<N8nIcon icon="chevron-down" color="text-light" :size="12" />
					</N8nButton>
				</template>
			</N8nDropdownMenu>
			<N8nTooltip
				placement="left"
				:content="i18n.baseText('agents.builder.chat.newChat.ariaLabel')"
			>
				<N8nButton
					v-if="currentSessionHasMessages"
					variant="ghost"
					iconOnly
					size="small"
					:class="$style.newChatBtn"
					:aria-label="i18n.baseText('agents.builder.chat.newChat.ariaLabel')"
					data-testid="agent-chat-new-chat-btn"
					@click="emit('new-chat')"
				>
					<N8nIcon icon="plus" :size="14" />
				</N8nButton>
			</N8nTooltip>
		</div>
		<div :class="$style.chatBody">
			<AgentChatPanel
				v-if="initialized && chatModeOpened.test && effectiveSessionId"
				v-show="chatMode === 'test'"
				:key="`test-${effectiveSessionId}`"
				:project-id="projectId"
				:agent-id="agentId"
				mode="inline"
				endpoint="chat"
				:initial-message="initialPrompt"
				:continue-session-id="effectiveSessionId"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				@config-updated="emit('config-updated')"
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
			>
				<template #footer-start>
					<AgentBuilderChatModeToggle
						v-if="initialized"
						:model-value="chatMode"
						:options="chatModeOptions"
						:is-built="isBuilt"
						:is-build-chat-streaming="isBuildChatStreaming"
						@update:model-value="emit('chat-mode-change', $event)"
					/>
				</template>
			</AgentChatPanel>
			<AgentChatPanel
				v-if="initialized && chatModeOpened.build"
				v-show="chatMode === 'build' && isBuilderConfigured"
				:project-id="projectId"
				:agent-id="agentId"
				mode="inline"
				endpoint="build"
				:initial-message="chatMode === 'build' ? initialPrompt : undefined"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				:before-send="beforeBuildSend"
				@config-updated="emit('config-updated')"
				@update:streaming="emit('update:streaming', $event)"
			>
				<template #above-input>
					<div :class="$style.quickActionsRow">
						<AgentChatQuickActions
							:tools="localConfig?.tools ?? []"
							:project-id="projectId"
							:agent-id="agentId"
							:agent-name="agentName"
							:is-published="isPublished"
							:connected-triggers="connectedTriggers"
							@update:tools="emit('update:tools', $event)"
							@update:connected-triggers="emit('update:connected-triggers', $event)"
							@trigger-added="emit('trigger-added', $event)"
							@agent-published="emit('agent-published', $event)"
						/>
					</div>
				</template>
				<template #footer-start>
					<AgentBuilderChatModeToggle
						v-if="initialized"
						:model-value="chatMode"
						:options="chatModeOptions"
						:is-built="isBuilt"
						:is-build-chat-streaming="isBuildChatStreaming"
						@update:model-value="emit('chat-mode-change', $event)"
					/>
				</template>
			</AgentChatPanel>
			<AgentBuilderUnconfiguredEmptyState v-if="chatModeOpened.build && !isBuilderConfigured" />
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

.sessionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--sm);
	height: var(--height--2xl);
	border-bottom: var(--border);
	min-height: 36px;
}

.sessionTitleBtn {
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	margin-left: calc(var(--spacing--5xs) * -1);
}

.newChatBtn {
	color: var(--text-color--subtle);

	&:hover,
	&:focus-visible {
		color: var(--text-color);
	}
}

.sessionMenu {
	width: min(
		calc(var(--spacing--5xl) + var(--spacing--3xl)),
		calc(100vw - var(--spacing--xl))
	) !important;
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
}
</style>
