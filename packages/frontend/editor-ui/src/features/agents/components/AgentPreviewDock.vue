<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
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
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, nextTick, useTemplateRef, watch, ref } from 'vue';
import { useStorage } from '@vueuse/core';

import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';

import { useAgentSessionsStore } from '../agentSessions.store';
import { useAgentSessionLangSmithExport } from '../composables/useAgentSessionLangSmithExport';

import type {
	AgentContinueLoadedEvent,
	AgentSendToAssistantEvent,
	AgentJsonConfig,
	AgentResource,
} from '../types';
import AgentPersonalisationIcon from './AgentPersonalisationIcon.vue';
import AgentPreviewChatPage from './AgentPreviewChatPage.vue';
import AgentPreviewMoreMenu from './AgentPreviewMoreMenu.vue';

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

enum PreviewLayout {
	Docked = 'docked',
	Fullpage = 'fullpage',
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
	isOpen: boolean;
	effectiveSessionId?: string;
	initialPrompt?: string;
	canSendToAssistant?: boolean;
	beforeSend?: () => Promise<void> | void;
}>();

const emit = defineEmits<{
	'view-trace': [];
	'new-session': [];
	'session-deleted': [sessionId: string];
	'session-select': [sessionId: string];
	close: [];
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
}>();

const i18n = useI18n();
const message = useMessage();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();
const isDeletingSession = ref(false);
const dock = useTemplateRef<HTMLElement>('dock');
const {
	isEnabled: isLangSmithExportEnabled,
	isExporting,
	sendSession,
} = useAgentSessionLangSmithExport();
const previewChatPage =
	useTemplateRef<InstanceType<typeof AgentPreviewChatPage>>('previewChatPage');
const storedLayout = useStorage<string>('N8N_AGENT_PREVIEW_LAYOUT', PreviewLayout.Docked);
const layout = computed<PreviewLayout>(() =>
	storedLayout.value === PreviewLayout.Fullpage ? PreviewLayout.Fullpage : PreviewLayout.Docked,
);

const sessionDropdownOptions = computed<Array<DropdownMenuItemProps<string, SessionOptionData>>>(
	() =>
		props.sessionOptions.map((option) => ({
			id: option.id,
			label: option.label ?? option.title,
			disabled: option.disabled,
			data: { when: option.when },
		})),
);

function viewTrace() {
	if (!props.hasSession || !props.effectiveSessionId) return;
	/** Dock the chat so it does not cover the session view after navigation. */
	storedLayout.value = PreviewLayout.Docked;
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

async function deleteSession() {
	const { projectId, agentId, effectiveSessionId: sessionId } = props;
	if (!props.hasSession || !sessionId || isDeletingSession.value) return;

	isDeletingSession.value = true;
	try {
		const confirmed = await message.confirm(
			i18n.baseText('agentSessions.deleteConfirm.message'),
			i18n.baseText('agentSessions.deleteConfirm.headline'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('agentSessions.deleteConfirm.confirmButtonText'),
				cancelButtonText: '',
			},
		);
		if (confirmed !== MODAL_CONFIRM) return;

		await sessionsStore.deleteThread(projectId, agentId, sessionId);
		toast.showMessage({
			title: i18n.baseText('agentSessions.showMessage.deleted'),
			type: 'success',
		});

		if (props.projectId !== projectId || props.agentId !== agentId) return;
		if (props.effectiveSessionId === sessionId) createNewSession();
		emit('session-deleted', sessionId);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.delete'));
	} finally {
		isDeletingSession.value = false;
	}
}

function close() {
	emit('close');
}

function getConversationMarkdown() {
	return previewChatPage.value?.getConversationMarkdown() ?? '';
}

function toggleFullWidth() {
	storedLayout.value =
		layout.value === PreviewLayout.Fullpage ? PreviewLayout.Docked : PreviewLayout.Fullpage;
}

watch(
	[() => props.isOpen, () => props.initialized, () => props.effectiveSessionId],
	async function focusPreviewInput([isOpen, initialized, sessionId]) {
		if (!isOpen || !initialized || !sessionId) return;

		await nextTick();
		/** preventScroll makes sure that the content doesn't jump when transitioning */
		previewChatPage.value?.focusInput({ preventScroll: true });
	},
	{ flush: 'post' },
);

function isEscapeDisabled() {
	return !props.isOpen || dock.value?.contains(document.activeElement) !== true;
}

useKeybindings({
	'ctrl+shift+;': createNewSession,
	Escape: {
		disabled: isEscapeDisabled,
		run: close,
	},
});
</script>

<template>
	<aside
		ref="dock"
		:class="[$style.dock, { [$style.open]: props.isOpen }]"
		:aria-label="i18n.baseText('agents.builder.preview.button')"
		:aria-hidden="!props.isOpen"
		:inert="!props.isOpen"
		:data-preview-layout="layout"
		data-testid="agent-preview-dock"
	>
		<div :class="[$style.dockInner, { [$style.fullpage]: layout === PreviewLayout.Fullpage }]">
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
							<AgentPersonalisationIcon
								:personalisation="
									props.localConfig?.personalisation ?? props.agent?.schema?.personalisation
								"
								:size="20"
							/>
							<span :class="$style.sessionTitleLabel">{{ props.sessionTitle }}</span>
							<N8nIcon icon="chevron-down" color="text-light" :size="12" />
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

					<AgentPreviewMoreMenu
						:project-id="props.projectId"
						:agent-id="props.agentId"
						:effective-session-id="props.effectiveSessionId"
						:has-session="props.hasSession"
						:is-deleting-session="isDeletingSession"
						:is-full-width="layout === PreviewLayout.Fullpage"
						:is-lang-smith-export-enabled="isLangSmithExportEnabled"
						:is-exporting="isExporting"
						:get-conversation-markdown="getConversationMarkdown"
						@toggle-full-width="toggleFullWidth"
						@export-session="exportSession"
						@delete-session="deleteSession"
					/>
					<KeyboardShortcutTooltip
						placement="bottom"
						:label="i18n.baseText('agents.builder.preview.hide' as BaseTextKey)"
						:shortcut="{ metaKey: false, shiftKey: false, keys: ['esc'] }"
					>
						<N8nIconButton
							icon="chevrons-right"
							variant="ghost"
							size="small"
							icon-size="large"
							:aria-label="i18n.baseText('agents.builder.preview.hide' as BaseTextKey)"
							data-testid="agent-preview-close-btn"
							@click="close"
						/>
					</KeyboardShortcutTooltip>
				</div>
			</header>

			<AgentPreviewChatPage
				ref="previewChatPage"
				:visible="props.isOpen"
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
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
.dock {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: var(--agent-preview-chat-column-width, 30rem);
	max-width: 100%;
	min-width: 0;
	min-height: 0;
	z-index: 1;
	pointer-events: none;

	&:has(.fullpage) {
		width: 100%;
	}
}

.dockInner {
	display: flex;
	flex-direction: column;
	width: var(--agent-preview-chat-column-width, 30rem);
	height: 100%;
	overflow: hidden;
	background-color: var(--background--surface);
	border-left: var(--border);
	pointer-events: none;
	transform: translateX(100%);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	will-change: transform;

	.open & {
		pointer-events: auto;
		transform: translateX(0);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
		will-change: auto;
	}
}
.fullpage {
	width: 100%;
	border-left: 0;
}

.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sessionTitle {
	width: 100%;
	min-width: 0;
	max-width: 100%;
	flex: 1 1 auto;
	margin-left: calc(var(--spacing--3xs) * -1);
	padding-inline: var(--spacing--2xs);
}

.sessionTitleLabel,
.sessionDropdownName {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--xs);
}

/** Let the button's inner container shrink so the session title can truncate. */
.sessionTitle > div {
	min-width: 0;
}

.sessionTitleLabel {
	min-width: 0;
	flex: 1 1 auto;
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
	margin-inline-start: auto;
	min-width: max-content;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
