<script setup lang="ts">
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nSwitch,
	N8nTooltip,
	type DropdownMenuItemProps,
	type IconName,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

import { useAgentSessionsStore } from '../agentSessions.store';
import { formatAgentUsage } from '../utils/agent-usage';
import { useAgentSessionUsage } from '../composables/useAgentSessionUsage';
import { useAgentExecutionUpdates } from '../composables/useAgentExecutionUpdates';
import type { ThreadDetail } from '../composables/useAgentThreadsApi';
import type { AgentUsageUpdate } from '../types';
import { useAgentTelemetry, type AgentPreviewMoreOption } from '../composables/useAgentTelemetry';
import {
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	CONTINUE_SESSION_ID_PARAM,
	OPEN_PREVIEW_PARAM,
} from '../constants';

const COPY_LINK = 'copy-link';
const COPY_CONVERSATION = 'copy-conversation';
const OPEN_IN_NEW_TAB = 'open-in-new-tab';
const TOGGLE_FULL_WIDTH = 'toggle-full-width';
const EXPORT_SESSION = 'export-session';
const DELETE_SESSION = 'delete-session';

const props = withDefaults(
	defineProps<{
		projectId: string;
		agentId: string;
		effectiveSessionId?: string;
		hasSession: boolean;
		canDeleteSession?: boolean;
		isDeletingSession?: boolean;
		isFullWidth: boolean;
		isLangSmithExportEnabled: boolean;
		isExporting: boolean;
		getConversationMarkdown: () => string;
		usageUpdates?: Record<string, AgentUsageUpdate>;
	}>(),
	{ canDeleteSession: false, isDeletingSession: false, usageUpdates: () => ({}) },
);

const emit = defineEmits<{
	'toggle-full-width': [];
	'export-session': [];
	'delete-session': [];
}>();

const i18n = useI18n();
const router = useRouter();
const clipboard = useClipboard();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();
const agentTelemetry = useAgentTelemetry();
const sessionDetail = ref<ThreadDetail | null>(null);
const sessionMetadata = computed(() => sessionDetail.value?.thread ?? null);
const canLinkSession = computed(function canLinkSession() {
	return props.hasSession && Boolean(props.effectiveSessionId);
});

const menuItems = computed<Array<DropdownMenuItemProps<AgentPreviewMoreOption>>>(() => [
	{
		id: COPY_LINK,
		label: i18n.baseText('agents.builder.preview.more.copyLink' as BaseTextKey),
		icon: { type: 'icon', value: 'link' },
		disabled: !canLinkSession.value,
	},
	{
		id: COPY_CONVERSATION,
		label: i18n.baseText('agents.builder.preview.more.copyConversation' as BaseTextKey),
		icon: { type: 'icon', value: 'copy' },
		disabled: !props.hasSession,
	},
	{
		id: OPEN_IN_NEW_TAB,
		label: i18n.baseText('agents.builder.preview.layout.openInNewTab' as BaseTextKey),
		icon: { type: 'icon', value: 'external-link' },
		disabled: !canLinkSession.value,
	},
	{
		id: TOGGLE_FULL_WIDTH,
		label: i18n.baseText('agents.builder.preview.more.fullWidth' as BaseTextKey),
		icon: props.isFullWidth
			? { type: 'icon', value: 'minimize-2' }
			: { type: 'icon', value: 'maximize-2' },
		keepOpen: true,
		checkbox: true,
		checked: props.isFullWidth,
	},
	...(props.isLangSmithExportEnabled && props.hasSession && props.effectiveSessionId
		? ([
				{
					id: EXPORT_SESSION,
					label: i18n.baseText('agentSessions.langsmithExport.button' as BaseTextKey),
					icon: { type: 'icon', value: 'bug' },
					disabled: props.isExporting,
				},
			] satisfies Array<DropdownMenuItemProps<AgentPreviewMoreOption>>)
		: []),
	...(props.canDeleteSession
		? ([
				{
					id: DELETE_SESSION,
					label: i18n.baseText('agentSessions.delete' as BaseTextKey),
					icon: { type: 'icon', value: 'trash' },
					divided: true,
					destructive: true,
					disabled: !props.hasSession || !props.effectiveSessionId || props.isDeletingSession,
				},
			] satisfies Array<DropdownMenuItemProps<AgentPreviewMoreOption>>)
		: []),
]);

const triggerLabel = computed(() => {
	const source = sessionMetadata.value?.source;
	if (!source || source === 'chat' || source === 'n8n_chat') {
		return i18n.baseText('agentSessions.origin.preview');
	}
	if (source === 'instance-ai') return i18n.baseText('agentSessions.origin.instanceAi');
	if (source === 'n8n_chat_production') return i18n.baseText('agentSessions.origin.n8nChat');
	return source.charAt(0).toUpperCase() + source.slice(1);
});

const triggerIcon = computed<IconName>(() => {
	switch (sessionMetadata.value?.source) {
		case 'slack':
		case 'telegram':
		case 'linear':
		case 'discord':
		case 'whatsapp':
		case 'teams':
		case 'mcp':
		case 'workflow':
		case 'webhook':
			return sessionMetadata.value.source;
		case 'instance-ai':
			return 'sparkles';
		case 'n8n_chat_production':
			return 'message-square';
		default:
			return 'bolt-filled';
	}
});

const { usage, duration, onExecutionUpdated } = useAgentSessionUsage(
	() => sessionDetail.value,
	() => props.usageUpdates,
);
const tokenSpendLabel = computed(() => formatAgentUsage(usage.value.totalTokens, usage.value.cost));
const durationLabel = computed(() => {
	if (!Number.isFinite(duration.value) || duration.value <= 0) return '';
	if (duration.value < 1000) return `${duration.value}ms`;
	return `${(duration.value / 1000).toFixed(1)}s`;
});
useAgentExecutionUpdates(
	{
		projectId: computed(() => props.projectId),
		agentId: computed(() => props.agentId),
		threadId: computed(() => props.effectiveSessionId),
	},
	() => loadSessionMetadata(),
	(update) => {
		if (update.threadId === props.effectiveSessionId) onExecutionUpdated(update);
	},
);

const lastMessageLabel = computed(() => {
	const updatedAt = sessionMetadata.value?.updatedAt;
	if (!updatedAt) return '—';
	const { date, time } = convertToDisplayDate(updatedAt);
	return `${date} ${time}`;
});

function getSessionRoute() {
	return router.resolve({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: props.projectId, agentId: props.agentId },
		query: {
			[CONTINUE_SESSION_ID_PARAM]: props.effectiveSessionId,
			[OPEN_PREVIEW_PARAM]: 'true',
		},
	});
}

async function copyLink() {
	try {
		const url = new URL(getSessionRoute().href, window.location.origin).href;
		await clipboard.copy(url);
		toast.showMessage({
			title: i18n.baseText('agents.builder.preview.more.linkCopied' as BaseTextKey),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.preview.more.copyLinkError'));
	}
}

async function copyConversation() {
	try {
		const conversation = props.getConversationMarkdown();
		if (!conversation) return;
		await clipboard.copy(conversation);
		toast.showMessage({
			title: i18n.baseText('agents.builder.preview.more.conversationCopied' as BaseTextKey),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.preview.more.copyConversationError'));
	}
}

function selectMenuItem(itemId: AgentPreviewMoreOption) {
	const item = menuItems.value.find((menuItem) => menuItem.id === itemId);
	if (!item || item.disabled) return;
	agentTelemetry.trackClickedPreviewMoreOption({ agentId: props.agentId, option: item.id });
	dispatchMenuAction(item.id);
}

function dispatchMenuAction(itemId: AgentPreviewMoreOption) {
	switch (itemId) {
		case COPY_LINK:
			void copyLink();
			break;
		case COPY_CONVERSATION:
			void copyConversation();
			break;
		case OPEN_IN_NEW_TAB: {
			const route = router.resolve({
				name: AGENT_PREVIEW_VIEW,
				params: { projectId: props.projectId, agentId: props.agentId },
				query: { [CONTINUE_SESSION_ID_PARAM]: props.effectiveSessionId },
			});
			window.open(route.href, '_blank', 'noopener');
			break;
		}
		case TOGGLE_FULL_WIDTH:
			emit('toggle-full-width');
			break;
		case EXPORT_SESSION:
			emit('export-session');
			break;
		case DELETE_SESSION:
			emit('delete-session');
			break;
	}
}

let metadataRequestId = 0;
async function loadSessionMetadata() {
	const requestId = ++metadataRequestId;
	const sessionId = props.effectiveSessionId;
	if (!sessionId) {
		sessionDetail.value = null;
		return;
	}
	try {
		const detail = await sessionsStore.getThreadDetail(props.projectId, props.agentId, sessionId);
		if (requestId === metadataRequestId) {
			sessionDetail.value = {
				...detail,
				thread: {
					...detail.thread,
					source: detail.executions.find(function hasSource(execution) {
						return execution.source !== null;
					})?.source,
				},
			};
		}
	} catch {
		if (requestId === metadataRequestId) sessionDetail.value = null;
	}
}

function onMenuOpenChange(isOpen: boolean) {
	if (!isOpen) return;
	agentTelemetry.trackClickedPreviewMoreOptions({ agentId: props.agentId });
	void loadSessionMetadata();
}

watch(
	[() => props.projectId, () => props.agentId, () => props.effectiveSessionId],
	function refreshSessionMetadata() {
		sessionDetail.value = null;
		void loadSessionMetadata();
	},
	{ immediate: true },
);

watch(
	() => Object.values(props.usageUpdates),
	(updates, previous) => {
		if (updates.length === 0) return;
		const completed = updates.filter((update) => update.complete).length;
		const previouslyCompleted = previous.filter((update) => update.complete).length;
		if (!sessionDetail.value || completed !== previouslyCompleted) void loadSessionMetadata();
	},
);
</script>

<template>
	<N8nTooltip
		placement="bottom"
		:content="i18n.baseText('agents.builder.preview.more.label' as BaseTextKey)"
	>
		<N8nDropdownMenu
			:items="menuItems"
			placement="bottom-end"
			:extra-popper-class="$style.moreMenu"
			@select="selectMenuItem"
			@update:model-value="onMenuOpenChange"
		>
			<template #trigger>
				<N8nIconButton
					icon="ellipsis"
					variant="ghost"
					size="small"
					icon-size="large"
					:aria-label="i18n.baseText('agents.builder.preview.more.label' as BaseTextKey)"
					data-testid="agent-preview-more-btn"
				/>
			</template>
			<template #item-trailing="{ item }">
				<N8nSwitch
					v-if="item.id === TOGGLE_FULL_WIDTH"
					:model-value="props.isFullWidth"
					size="small"
					tabindex="-1"
					aria-hidden="true"
					:class="$style.layoutSwitch"
				/>
			</template>
			<template #footer>
				<ul :class="$style.sessionMetadata">
					<li v-if="triggerLabel"><N8nIcon :icon="triggerIcon" :size="12" />{{ triggerLabel }}</li>
					<li v-if="tokenSpendLabel || durationLabel" :class="$style.metrics">
						<span v-if="tokenSpendLabel">{{ tokenSpendLabel }}</span>
						<span v-if="tokenSpendLabel && durationLabel"> • </span>{{ durationLabel }}
					</li>
					<li v-if="sessionMetadata?.updatedAt">
						{{
							i18n.baseText('agents.builder.preview.more.lastMessageSent' as BaseTextKey, {
								interpolate: { date: lastMessageLabel },
							})
						}}
					</li>
				</ul>
			</template>
		</N8nDropdownMenu>
	</N8nTooltip>
</template>

<style lang="scss" module>
.moreMenu {
	min-width: 12rem;
}

.layoutSwitch {
	pointer-events: none;
}

.metrics {
	font-variant-numeric: tabular-nums;
}

.sessionMetadata {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--xs);
	border-top: var(--border);
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	list-style: none;

	li {
		display: flex;
		align-items: center;
		gap: var(--spacing--3xs);
		margin: 0;
		user-select: none;
	}
}
</style>
