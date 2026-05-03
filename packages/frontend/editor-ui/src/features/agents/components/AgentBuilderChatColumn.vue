<script setup lang="ts">
import { N8nButton, N8nDropdown, N8nIcon, N8nResizeWrapper, N8nTooltip } from '@n8n/design-system';
import type { N8nDropdownOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { ChatMode } from '../composables/useAgentChatMode';
import type { AgentJsonConfig, AgentJsonToolRef, AgentResource } from '../types';
import AgentBuilderUnconfiguredEmptyState from './AgentBuilderUnconfiguredEmptyState.vue';
import AgentBuilderChatModeToggle from './AgentBuilderChatModeToggle.vue';
import AgentChatPanel from './AgentChatPanel.vue';
import AgentChatQuickActions from './AgentChatQuickActions.vue';

interface ResizePayload {
	width: number;
}

defineProps<{
	initialized: boolean;
	projectId: string;
	agentId: string;
	agentName: string;
	agent: AgentResource | null;
	localConfig: AgentJsonConfig | null;
	connectedTriggers: string[];
	chatColumnCollapsed: boolean;
	chatColumnWidth: number;
	resizeGridSize: number;
	chatMode: ChatMode;
	chatModeOpened: Record<ChatMode, boolean>;
	chatModeOptions: Array<{ label: string; value: ChatMode; disabled?: boolean }>;
	effectiveSessionId?: string;
	currentSessionTitle: string;
	currentSessionHasMessages: boolean;
	sessionOptions: Array<N8nDropdownOption<string>>;
	initialPrompt?: string;
	isBuilt: boolean;
	isBuilderConfigured: boolean;
	isBuildChatStreaming: boolean;
	isPublished: boolean;
}>();

const emit = defineEmits<{
	resize: [payload: ResizePayload];
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
</script>

<template>
	<N8nResizeWrapper
		:class="$style.chatColumnResizeWrapper"
		:width="chatColumnWidth"
		:min-width="320"
		:grid-size="resizeGridSize"
		:supported-directions="chatColumnCollapsed ? [] : ['right']"
		:is-resizing-enabled="!chatColumnCollapsed"
		@resize="emit('resize', $event)"
	>
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
				<N8nDropdown
					:options="sessionOptions"
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
				</N8nDropdown>
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
	</N8nResizeWrapper>
</template>

<style lang="scss" module>
.chatColumnResizeWrapper {
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}

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

:global(.agent-chat-session-menu) :global(.el-menu) {
	max-height: 220px;
	max-width: 360px;
	min-width: 280px;
	overflow-y: auto;
}

:global(.agent-chat-session-menu) :global(.el-menu-item) {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	overflow: hidden;
}

:global(.agent-chat-session-menu) :global(.el-menu-item) > span {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
	margin-left: 0;
	padding-left: 0;
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
