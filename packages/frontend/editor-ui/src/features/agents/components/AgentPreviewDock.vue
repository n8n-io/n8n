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
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, nextTick, toRef, useTemplateRef, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { useRouter } from 'vue-router';

import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useKeybindings } from '@/app/composables/useKeybindings';

import { useAgentReviewStore } from '../agentReview.store';
import { useAgentChecks } from '../composables/useAgentChecks';
import { useAgentReviewQueue } from '../composables/useAgentReviewQueue';
import { useAgentSessionLangSmithExport } from '../composables/useAgentSessionLangSmithExport';
import { useWireframeDestination } from '../composables/useWireframeDestination';
import { useWireframeReviewers } from '../composables/useWireframeReviewers';
import { AGENT_PREVIEW_VIEW, CONTINUE_SESSION_ID_PARAM } from '../constants';
import type {
	AgentContinueLoadedEvent,
	AgentJsonConfig,
	AgentResource,
	AgentSendToAssistantEvent,
} from '../types';
import AgentPersonalisationIcon from './AgentPersonalisationIcon.vue';
import AgentPreviewChatPage from './AgentPreviewChatPage.vue';
import AgentPreviewDestination from './AgentPreviewDestination.vue';
import AgentPreviewReviewers from './AgentPreviewReviewers.vue';

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

const OPEN_IN_NEW_TAB = 'open-in-new-tab';

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
	'session-select': [sessionId: string];
	close: [];
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
}>();

const i18n = useI18n();
const router = useRouter();
const dock = useTemplateRef<HTMLElement>('dock');

// Wireframe: the dock owns checks, reviewers and the review queue so the header
// badge, the review card and the Sessions tab agree.
const checks = useAgentChecks({
	projectId: toRef(props, 'projectId'),
	agentId: toRef(props, 'agentId'),
	config: toRef(props, 'localConfig'),
	versionId: computed(() => props.agent?.versionId),
	isRunnable: computed(() => props.agent?.isRunnable === true),
	editingLocked: computed(() => false),
});
const reviewers = useWireframeReviewers(toRef(props, 'agentId'));
const review = useAgentReviewQueue({
	projectId: toRef(props, 'projectId'),
	agentId: toRef(props, 'agentId'),
	currentSessionId: toRef(props, 'effectiveSessionId'),
	checks,
	reviewers,
});
const { destination } = useWireframeDestination(toRef(props, 'effectiveSessionId'));

const reviewStore = useAgentReviewStore();
watch(
	[review.attentionCount, () => props.agentId],
	([count, agentId]) => {
		reviewStore.setAttention(agentId, count);
		reviewStore.setNeedsEyeThreadIds(
			agentId,
			review.queue.value.flatMap((m) => (m.kind === 'live' && m.threadId ? [m.threadId] : [])),
		);
	},
	{ immediate: true },
);
// The Sessions tab can ask the dock to open review mode.
watch(
	() => reviewStore.pendingReviewOpen,
	(pending) => {
		if (pending && reviewStore.consumeReviewRequest(props.agentId)) review.open();
	},
	{ immediate: true },
);
watch(
	() => props.isOpen,
	(isOpen) => {
		if (!isOpen) review.close();
	},
);
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

const layoutOptions = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{
		id: PreviewLayout.Docked,
		label: i18n.baseText('agents.builder.preview.layout.docked'),
		checked: layout.value === PreviewLayout.Docked,
		icon: { type: 'icon', value: 'panel-right' },
	},
	{
		id: PreviewLayout.Fullpage,
		label: i18n.baseText('agents.builder.preview.layout.fullpage' as BaseTextKey),
		checked: layout.value === PreviewLayout.Fullpage,
		icon: { type: 'icon', value: 'maximize-2' },
	},
	{
		id: OPEN_IN_NEW_TAB,
		label: i18n.baseText('agents.builder.preview.layout.openInNewTab' as BaseTextKey),
		icon: { type: 'icon', value: 'external-link' },
		divided: true,
	},
]);

function getLayoutIcon() {
	return layout.value === PreviewLayout.Fullpage ? 'maximize-2' : 'panel-right';
}

function getLayoutAriaLabel() {
	if (layout.value === PreviewLayout.Fullpage) {
		return i18n.baseText('agents.builder.preview.layout.fullpage.ariaLabel' as BaseTextKey);
	}
	return i18n.baseText('agents.builder.preview.layout.docked.ariaLabel');
}

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

function setLayout(nextLayout: string) {
	if (nextLayout === OPEN_IN_NEW_TAB) {
		const route = router.resolve({
			name: AGENT_PREVIEW_VIEW,
			params: { projectId: props.projectId, agentId: props.agentId },
			query: { [CONTINUE_SESSION_ID_PARAM]: props.effectiveSessionId },
		});
		window.open(route.href, '_blank', 'noopener');
	} else if (nextLayout === PreviewLayout.Docked || nextLayout === PreviewLayout.Fullpage) {
		storedLayout.value = nextLayout;
	}
}

function isFocusWithinDock() {
	return dock.value?.contains(document.activeElement) === true;
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
		:class="[$style.dock, { [$style.open]: props.isOpen }]"
		:aria-label="i18n.baseText('agents.builder.preview.button')"
		:aria-hidden="!props.isOpen"
		:inert="!props.isOpen"
		:data-preview-layout="layout"
		data-testid="agent-preview-dock"
	>
		<div :class="[$style.dockInner, { [$style.fullpage]: layout === PreviewLayout.Fullpage }]">
			<header :class="$style.header" data-testid="agent-preview-dock-header">
				<template v-if="review.active.value">
					<button
						type="button"
						:class="$style.backToChat"
						data-testid="agent-preview-back-to-chat"
						@click="review.close()"
					>
						<N8nIcon icon="arrow-left" :size="14" />
						{{ i18n.baseText('agents.builder.review.backToChat') }}
					</button>
					<span :class="$style.reviewingLabel" data-testid="agent-preview-reviewing-label">
						{{
							review.done.value
								? i18n.baseText('agents.builder.checks.caughtUp')
								: i18n.baseText('agents.builder.review.progress', {
										interpolate: {
											n: String(review.position.value),
											total: String(review.total.value),
										},
									})
						}}
					</span>
				</template>
				<N8nDropdownMenu
					v-else
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

				<AgentPreviewDestination
					v-if="!review.active.value"
					v-model="destination"
					:class="$style.destination"
				/>

				<div :class="$style.actions">
					<AgentPreviewReviewers
						:project-id="props.projectId"
						:agent-id="props.agentId"
						:checks="checks"
						:review="review"
						:reviewers="reviewers"
						@review="review.open()"
						@open-check="review.open(`check:${$event.rowId}`)"
					/>
					<N8nTooltip
						v-if="!review.active.value && props.hasSession && props.effectiveSessionId"
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
						v-if="
							!review.active.value &&
							isLangSmithExportEnabled &&
							props.hasSession &&
							props.effectiveSessionId
						"
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
						v-if="!review.active.value"
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

					<N8nTooltip
						placement="bottom"
						:content="i18n.baseText('agents.builder.preview.layout.change')"
					>
						<N8nDropdownMenu :items="layoutOptions" placement="bottom-end" @select="setLayout">
							<template #trigger>
								<N8nIconButton
									:icon="getLayoutIcon()"
									variant="ghost"
									size="small"
									icon-size="large"
									:aria-label="getLayoutAriaLabel()"
									data-testid="agent-preview-layout-btn"
								/>
							</template>
						</N8nDropdownMenu>
					</N8nTooltip>
				</div>
			</header>

			<AgentPreviewChatPage
				ref="previewChatPage"
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
				:review="review"
				:reviewers="reviewers"
				:destination="destination"
				layout="dock"
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
.backToChat,
.reviewingLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 1.75rem;
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--2xs);
	letter-spacing: var(--wireframe--letter-spacing);
	color: var(--wireframe--ink);
	white-space: nowrap;
}

.backToChat {
	padding: 0 var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}
}

.reviewingLabel {
	margin-left: var(--spacing--2xs);
	color: var(--text-color--subtler);
}

.destination {
	flex-shrink: 0;
	margin-left: auto;
	margin-right: var(--spacing--2xs);
}

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
	min-width: 0;
	overflow: hidden;

	// The session switcher is the only thing allowed to give way; the dropdown
	// trigger wrapper has to be shrinkable for the title inside to truncate.
	> :first-child {
		flex: 1 1 auto;
		min-width: 3rem;
	}
}

.sessionTitle {
	min-width: 0;
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
