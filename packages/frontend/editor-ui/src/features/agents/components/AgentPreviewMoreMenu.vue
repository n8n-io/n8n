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
import type { AgentExecutionThread } from '../composables/useAgentThreadsApi';
import { AGENT_PREVIEW_VIEW, CONTINUE_SESSION_ID_PARAM } from '../constants';

const COPY_LINK = 'copy-link';
const COPY_CONVERSATION = 'copy-conversation';
const OPEN_IN_NEW_TAB = 'open-in-new-tab';
const TOGGLE_FULL_WIDTH = 'toggle-full-width';

const props = defineProps<{
	projectId: string;
	agentId: string;
	effectiveSessionId?: string;
	hasSession: boolean;
	isFullWidth: boolean;
	getConversationMarkdown: () => string;
}>();

const emit = defineEmits<{
	'toggle-full-width': [];
}>();

const i18n = useI18n();
const router = useRouter();
const clipboard = useClipboard();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();
const sessionMetadata = ref<AgentExecutionThread | null>(null);

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{
		id: COPY_LINK,
		label: i18n.baseText('agents.builder.preview.more.copyLink' as BaseTextKey),
		icon: { type: 'icon', value: 'link' },
		disabled: !props.effectiveSessionId,
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
	},
	{
		id: TOGGLE_FULL_WIDTH,
		label: i18n.baseText('agents.builder.preview.more.fullWidth' as BaseTextKey),
		icon: { type: 'icon', value: 'maximize-2' },
		keepOpen: true,
		checkbox: true,
		checked: props.isFullWidth,
	},
]);

const triggerLabel = computed(() => {
	const source = sessionMetadata.value?.source;
	if (!source || source === 'chat' || source === 'n8n_chat') {
		return i18n.baseText('agentSessions.origin.preview');
	}
	if (source === 'instance-ai') return i18n.baseText('agentSessions.origin.instanceAi');
	return source.charAt(0).toUpperCase() + source.slice(1);
});

const triggerIcon = computed<IconName>(() => {
	switch (sessionMetadata.value?.source) {
		case 'slack':
			return 'slack';
		case 'instance-ai':
			return 'sparkles';
		default:
			return 'bolt-filled';
	}
});

const tokenSpendLabel = computed(() => {
	const metadata = sessionMetadata.value;
	if (!metadata) return '—';
	const totalTokens = metadata.totalPromptTokens + metadata.totalCompletionTokens;
	return `${totalTokens.toLocaleString()}t ($${metadata.totalCost.toFixed(4)})`;
});

const durationLabel = computed(() => {
	const duration = sessionMetadata.value?.totalDuration ?? 0;
	if (duration < 1000) return `${duration}ms`;
	return `${(duration / 1000).toFixed(1)}s`;
});

const lastMessageLabel = computed(() => {
	const updatedAt = sessionMetadata.value?.updatedAt;
	if (!updatedAt) return '—';
	const { date, time } = convertToDisplayDate(updatedAt);
	return `${date} ${time}`;
});

function getSessionRoute() {
	return router.resolve({
		name: AGENT_PREVIEW_VIEW,
		params: { projectId: props.projectId, agentId: props.agentId },
		query: { [CONTINUE_SESSION_ID_PARAM]: props.effectiveSessionId },
	});
}

async function copyLink() {
	const url = new URL(getSessionRoute().href, window.location.origin).href;
	await clipboard.copy(url);
	toast.showMessage({
		title: i18n.baseText('agents.builder.preview.more.linkCopied' as BaseTextKey),
		type: 'success',
	});
}

async function copyConversation() {
	const conversation = props.getConversationMarkdown();
	if (!conversation) return;
	await clipboard.copy(conversation);
	toast.showMessage({
		title: i18n.baseText('agents.builder.preview.more.conversationCopied' as BaseTextKey),
		type: 'success',
	});
}

function selectMenuItem(itemId: string) {
	if (itemId === COPY_LINK) void copyLink();
	if (itemId === COPY_CONVERSATION) void copyConversation();
	if (itemId === OPEN_IN_NEW_TAB) window.open(getSessionRoute().href, '_blank', 'noopener');
	if (itemId === TOGGLE_FULL_WIDTH) emit('toggle-full-width');
}

let metadataRequestId = 0;
async function loadSessionMetadata() {
	const requestId = ++metadataRequestId;
	const sessionId = props.effectiveSessionId;
	if (!sessionId) {
		sessionMetadata.value = null;
		return;
	}
	try {
		const detail = await sessionsStore.getThreadDetail(props.projectId, props.agentId, sessionId);
		if (requestId === metadataRequestId) sessionMetadata.value = detail.thread;
	} catch {
		if (requestId === metadataRequestId) sessionMetadata.value = null;
	}
}

function onMenuOpenChange(isOpen: boolean) {
	if (isOpen) void loadSessionMetadata();
}

watch(
	[() => props.projectId, () => props.agentId, () => props.effectiveSessionId],
	function refreshSessionMetadata() {
		sessionMetadata.value = null;
		void loadSessionMetadata();
	},
	{ immediate: true },
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
					:aria-label="i18n.baseText('generic.more' as BaseTextKey)"
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
					<li><N8nIcon :icon="triggerIcon" :size="12" />{{ triggerLabel }}</li>
					<li>{{ tokenSpendLabel }} • {{ durationLabel }}</li>
					<li>
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
