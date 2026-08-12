<script setup lang="ts">
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nTooltip,
	N8nText,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useTemplateRef } from 'vue';
import { useStorage } from '@vueuse/core';

import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useKeybindings } from '@/app/composables/useKeybindings';

import { useAgentSessionLangSmithExport } from '../composables/useAgentSessionLangSmithExport';
import type {
	AgentContinueLoadedEvent,
	AgentFixWithAssistantEvent,
	AgentJsonConfig,
	AgentResource,
} from '../types';
import AgentPreviewChatPage from './AgentPreviewChatPage.vue';

interface SessionOption {
	id: string;
	title: string;
	disabled?: boolean;
	label?: string;
	when?: string;
}

interface SessionOptionData {
	when?: string;
}

const props = defineProps<{
	sessionTitle: string;
	sessionOptions: SessionOption[];
	hasSession: boolean;
	initialized: boolean;
	projectId: string;
	agentId: string;
	agent: AgentResource | null;
	localConfig: AgentJsonConfig | null;
	connectedTriggers: string[];
	effectiveSessionId?: string;
	initialPrompt?: string;
	canSendToAssistant?: boolean;
	beforeSend?: () => Promise<void> | void;
}>();

const emit = defineEmits<{
	'view-trace': [];
	'new-session': [];
	'session-select': [sessionId: string];
	close: [];
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'open-build': [];
	'send-to-assistant': [event?: AgentFixWithAssistantEvent];
}>();

const i18n = useI18n();
const dock = useTemplateRef<HTMLElement>('dock');
const {
	isEnabled: isLangSmithExportEnabled,
	isExporting,
	sendSession,
} = useAgentSessionLangSmithExport();
const floating = useStorage('N8N_AGENT_PREVIEW_FLOATING', false);

const sessionDropdownOptions = computed<Array<DropdownMenuItemProps<string, SessionOptionData>>>(
	() =>
		props.sessionOptions.map((option) => ({
			id: option.id,
			label: option.label ?? option.title,
			disabled: option.disabled,
			data: { when: option.when },
		})),
);

const layoutOptions = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{
		id: 'floating',
		label: 'Floating',
		checked: floating.value,
		icon: { type: 'icon', value: 'picture-in-picture-2' },
	},
	{
		id: 'docked',
		label: 'Docked',
		checked: !floating.value,
		icon: { type: 'icon', value: 'panel-right' },
	},
]);

function viewTrace() {
	if (!props.hasSession || !props.effectiveSessionId) return;
	emit('view-trace');
}

function exportSession() {
	if (!props.hasSession || !props.effectiveSessionId) return;
	void sendSession({
		projectId: props.projectId,
		agentId: props.agentId,
		threadId: props.effectiveSessionId,
	});
}

function createNewSession() {
	emit('new-session');
}

function close() {
	emit('close');
}

function setLayout(layout: string) {
	if (layout !== 'floating' && layout !== 'docked') return;
	floating.value = layout === 'floating';
}

function isFocusWithinDock() {
	return dock.value?.contains(document.activeElement) === true;
}

useKeybindings({
	'ctrl+shift+;': createNewSession,
	Escape: {
		disabled: () => !isFocusWithinDock(),
		run: close,
	},
});
</script>

<template>
	<aside
		ref="dock"
		:class="$style.dock"
		:aria-label="i18n.baseText('agents.builder.preview.button')"
		data-testid="agent-preview-dock"
	>
		<div :class="[$style.dockInner, { [$style.floating]: floating }]">
			<header :class="$style.header" data-testid="agent-preview-dock-header">
				<N8nDropdownMenu
					:items="sessionDropdownOptions"
					placement="bottom-start"
					:extra-popper-class="$style.sessionDropdownMenu"
					data-testid="agent-preview-session-switcher"
					@select="emit('session-select', $event)"
				>
					<template #trigger>
						<N8nButton
							variant="ghost"
							size="small"
							:class="$style.sessionTitle"
							:aria-label="i18n.baseText('agentSessions.sessionName')"
							data-testid="agent-preview-session-title"
						>
							<span :class="$style.sessionTitleLabel">{{ props.sessionTitle }}</span>
							<N8nIcon icon="chevron-down" :size="12" />
						</N8nButton>
					</template>
					<template #item-label="{ item }">
						<N8nText bold :class="$style.sessionDropdownName">{{ item.label }}</N8nText>
					</template>
					<template #item-trailing="{ item }">
						<N8nText v-if="item.data?.when" :class="$style.sessionDropdownDate">
							{{ item.data.when }}
						</N8nText>
					</template>
				</N8nDropdownMenu>

				<div :class="$style.actions">
					<N8nTooltip
						v-if="props.hasSession && props.effectiveSessionId"
						:content="i18n.baseText('agents.builder.preview.viewSession')"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
						data-testid="agent-preview-view-session-tooltip"
					>
						<N8nIconButton
							icon="list-tree"
							variant="ghost"
							size="small"
							icon-size="large"
							:aria-label="i18n.baseText('agents.builder.preview.viewSession')"
							data-testid="agent-preview-view-session-btn"
							@click="viewTrace"
						/>
					</N8nTooltip>

					<N8nTooltip
						v-if="isLangSmithExportEnabled && props.hasSession && props.effectiveSessionId"
						:content="i18n.baseText('agentSessions.langsmithExport.button')"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
						data-testid="agent-preview-langsmith-export-tooltip"
					>
						<N8nIconButton
							icon="bug"
							variant="ghost"
							size="small"
							icon-size="large"
							:loading="isExporting"
							:aria-label="i18n.baseText('agentSessions.langsmithExport.button')"
							data-testid="agent-preview-langsmith-export-btn"
							@click="exportSession"
						/>
					</N8nTooltip>

					<KeyboardShortcutTooltip
						placement="bottom"
						:label="i18n.baseText('agents.builder.chat.newChat.label')"
						:shortcut="{ metaKey: true, shiftKey: true, keys: [';'] }"
					>
						<N8nIconButton
							icon="message-circle-plus"
							variant="ghost"
							size="small"
							icon-size="large"
							:aria-label="i18n.baseText('agents.builder.chat.newChat.label')"
							data-testid="agent-preview-new-chat-btn"
							@click="createNewSession"
						/>
					</KeyboardShortcutTooltip>

					<N8nTooltip placement="bottom" content="Change layout">
						<N8nDropdownMenu :items="layoutOptions" placement="bottom-end" @select="setLayout">
							<template #trigger>
								<N8nIconButton
									:icon="floating ? 'picture-in-picture-2' : 'panel-right'"
									variant="ghost"
									size="small"
									icon-size="large"
									:aria-label="floating ? 'Floating preview' : 'Dock preview'"
									data-testid="agent-preview-layout-btn"
								/>
							</template>
						</N8nDropdownMenu>
					</N8nTooltip>

					<KeyboardShortcutTooltip
						placement="bottom"
						:label="i18n.baseText('generic.close')"
						:shortcut="{ keys: ['Esc'] }"
					>
						<N8nIconButton
							variant="ghost"
							icon="x"
							size="small"
							icon-size="large"
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
				:before-send="props.beforeSend"
				layout="dock"
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
.dock {
	width: var(--agent-preview-chat-column-width, 25rem);
	max-width: 100%;
	min-width: 0;
	min-height: 0;
	flex: 0 0 var(--agent-preview-chat-column-width, 25rem);
	pointer-events: none;

	&:has(.floating) {
		position: fixed;
		right: var(--spacing--md);
		bottom: var(--spacing--md);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}
}
.dockInner {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	background-color: var(--background--surface);
	border-left: var(--border);
	pointer-events: auto;
}
.floating {
	width: 100%;
	max-height: 45rem;
	aspect-ratio: 1/2;
	border-radius: var(--radius--xl);
	border: var(--border);
	align-self: flex-end;
	box-shadow: var(--shadow--md);
}

.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sessionTitle {
	min-width: 0;
	flex: 1 1 auto;
}

.sessionTitleLabel,
.sessionDropdownName {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--xs);
}

.sessionDropdownMenu {
	width: max(var(--reka-dropdown-menu-trigger-width), 12rem);
}

.sessionDropdownName {
	max-width: 80%;
}

.sessionDropdownDate {
	margin-left: auto;
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	text-align: right;
	white-space: nowrap;
}

.actions {
	margin-left: auto;
	min-width: max-content;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
