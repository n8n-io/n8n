<script setup lang="ts">
import { N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useKeybindings } from '@/app/composables/useKeybindings';

import type { AgentJsonConfig, AgentResource } from '../types';
import AgentPreviewChatPage from './AgentPreviewChatPage.vue';

const props = defineProps<{
	sessionTitle: string;
	initialized: boolean;
	projectId: string;
	agentId: string;
	agent: AgentResource | null;
	localConfig: AgentJsonConfig | null;
	connectedTriggers: string[];
	effectiveSessionId?: string;
	initialPrompt?: string;
	canSendToAssistant?: boolean;
}>();

const emit = defineEmits<{
	'view-trace': [];
	'new-session': [];
	close: [];
	'continue-loaded': [count: number];
	'open-build': [];
	'send-to-assistant': [executionId?: string];
}>();

const i18n = useI18n();

function viewTrace() {
	if (!props.effectiveSessionId) return;
	emit('view-trace');
}

function createNewSession() {
	emit('new-session');
}

function close() {
	emit('close');
}

useKeybindings({
	'ctrl+shift+;': createNewSession,
	Escape: close,
});
</script>

<template>
	<aside
		:class="$style.dock"
		:aria-label="i18n.baseText('agents.builder.preview.button')"
		data-testid="agent-preview-dock"
	>
		<header :class="$style.header" data-testid="agent-preview-dock-header">
			<N8nText
				size="small"
				:bold="true"
				:class="$style.sessionTitle"
				data-testid="agent-preview-session-title"
			>
				{{ props.sessionTitle }}
			</N8nText>

			<div :class="$style.actions">
				<N8nButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('agents.builder.preview.viewSession')"
					:disabled="!props.effectiveSessionId"
					data-testid="agent-preview-view-session-btn"
					@click="viewTrace"
				/>

				<KeyboardShortcutTooltip
					placement="bottom"
					:label="i18n.baseText('agents.builder.chat.newChat.label')"
					:shortcut="{ metaKey: true, shiftKey: true, keys: [';'] }"
				>
					<N8nButton
						variant="subtle"
						size="small"
						icon="message-circle-plus"
						:label="i18n.baseText('agents.builder.chat.newChat.label')"
						data-testid="agent-preview-new-chat-btn"
						@click="createNewSession"
					/>
				</KeyboardShortcutTooltip>

				<KeyboardShortcutTooltip
					placement="bottom"
					:label="i18n.baseText('generic.close')"
					:shortcut="{ keys: ['Esc'] }"
				>
					<N8nIconButton
						variant="ghost"
						icon="x"
						size="small"
						:aria-label="i18n.baseText('agents.builder.preview.close.ariaLabel')"
						data-testid="agent-preview-close-btn"
						@click="close"
					/>
				</KeyboardShortcutTooltip>
			</div>
		</header>

		<AgentPreviewChatPage
			:initialized="props.initialized"
			:project-id="props.projectId"
			:agent-id="props.agentId"
			:agent="props.agent"
			:local-config="props.localConfig"
			:connected-triggers="props.connectedTriggers"
			:effective-session-id="props.effectiveSessionId"
			:initial-prompt="props.initialPrompt"
			:can-send-to-assistant="props.canSendToAssistant"
			layout="dock"
			@continue-loaded="emit('continue-loaded', $event)"
			@open-build="emit('open-build')"
			@send-to-assistant="emit('send-to-assistant', $event)"
		/>
	</aside>
</template>

<style lang="scss" module>
.dock {
	width: var(--agent-preview-chat-column-width, 25rem);
	max-width: 100%;
	min-width: 0;
	min-height: 0;
	flex: 0 0 var(--agent-preview-chat-column-width, 25rem);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: color-mix(in srgb, var(--color--primary) 4%, var(--background--surface));
	border-left: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--primary) 16%, var(--border-color));
}

.header {
	height: var(--height--4xl);
	padding: var(--spacing--xs) var(--spacing--sm);
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background-color: color-mix(in srgb, var(--color--primary) 6%, var(--background--surface));
	border-bottom: var(--border);
}

.sessionTitle {
	min-width: 0;
	flex: 1 1 auto;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	min-width: max-content;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
}
</style>
