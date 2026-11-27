<script lang="ts" setup>
import { UNLIMITED_CREDITS, type SystemAgentThreadSummary } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import type { DropdownMenuItemProps, IconOrEmoji, PathItem } from '@n8n/design-system';
import { N8nButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { truncate } from '@n8n/utils/string/truncate';
import { formatThreadTitle } from '@/features/agents/utils/thread-title';
import { computed, provide, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import AgentSessionTimelineHeader from '@/features/agents/components/AgentSessionTimelineHeader.vue';
import AgentSessionTimelinePanel from '@/features/agents/components/AgentSessionTimelinePanel.vue';
import { SESSION_TIMELINE_SHOW_COST_KEY } from '@/features/agents/components/agentChatInjectionKeys';
import { getSystemAgentThread } from '@/features/agents/composables/useAgentApi';
import { useAgentExecutionUpdates } from '@/features/agents/composables/useAgentExecutionUpdates';
import { useAgentSessionUsage } from '@/features/agents/composables/useAgentSessionUsage';
import type {
	AgentExecution,
	AgentExecutionThread,
	ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import { useBackOrFallback } from '@/features/agents/composables/useBackOrFallback';
import { formatDuration, threadTokenBreakdownOf } from '@/features/agents/session-timeline.utils';
import type { SessionTimelineMetadata } from '@/features/agents/types';
import { formatSessionDateTime } from '@/features/agents/utils/timeline-time';

import { useAssistantCreditsStore } from '../assistantCredits.store';
import { INSTANCE_AI_THREAD_SESSION_VIEW, INSTANCE_AI_THREAD_VIEW } from '../constants';
import { ASSISTANT_AGENT_ID } from './assistantAgentThreads';
import { useAssistantAgentThreadsStore } from './assistantAgentThreads.store';

/**
 * The session timeline of an Assistant agent thread: what happened in each turn.
 * It shows the timeline of the Agents session view. The thread routes of the
 * project agents load a project agent, so the Assistant has its own route.
 */
const props = defineProps<{ threadId: string }>();

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const toast = useToast();
const clipboard = useClipboard();
const threadsStore = useAssistantAgentThreadsStore();
const creditsStore = useAssistantCreditsStore();

const ASSISTANT_ICON: IconOrEmoji = { type: 'icon', value: 'sparkles' };

// The working project of the thread. The timeline routes are project routes.
const summary = ref<SystemAgentThreadSummary>();
const lookupFailed = ref(false);

async function lookUpThread(threadId: string): Promise<void> {
	lookupFailed.value = false;
	const known = threadsStore.threadsById.get(threadId);
	if (known) {
		summary.value = known;
		return;
	}
	summary.value = undefined;
	try {
		const thread = await getSystemAgentThread(
			rootStore.restApiContext,
			ASSISTANT_AGENT_ID,
			threadId,
		);
		threadsStore.addOpenedThread(thread);
		if (threadId === props.threadId) summary.value = thread;
	} catch {
		if (threadId === props.threadId) lookupFailed.value = true;
	}
}

watch(() => props.threadId, lookUpThread, { immediate: true });

const projectId = computed(() => summary.value?.projectId ?? '');
const agentId = computed(() => ASSISTANT_AGENT_ID);
const threadId = computed(() => props.threadId);

// Populated by the panel's `loaded` event, so the header does not fetch the thread again.
const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);
const hasLoadedThread = computed(() => thread.value?.id === props.threadId);

function onPanelLoaded(detail: ThreadDetail | null) {
	thread.value = detail?.thread ?? null;
	executions.value = detail?.executions ?? [];
}

const {
	usage: sessionUsage,
	duration,
	onExecutionUpdated,
} = useAgentSessionUsage(
	() => (thread.value ? { thread: thread.value, executions: executions.value } : null),
	() => ({}),
);
useAgentExecutionUpdates({ projectId, agentId, threadId }, () => {}, onExecutionUpdated);
// The thread whose credit total loaded. The credit push of the module keeps the
// total current after this load.
const creditsLoadedFor = ref<string | null>(null);
watch(
	() => props.threadId,
	async (threadId) => {
		if (await threadsStore.loadThreadCredits(threadId)) creditsLoadedFor.value = threadId;
	},
	{ immediate: true },
);

/**
 * Assistant credits pay for the turns when the instance uses them: the thread has a
 * credit total, or the quota is limited. With its own model key, the instance has an
 * unlimited quota and no thread total, so the header shows the cost in dollars.
 * Until the quota loads, the unit is unknown and the header shows neither.
 */
const costUnit = computed((): 'credits' | 'dollars' | undefined => {
	if (threadsStore.threadCreditsUsed(props.threadId) !== undefined) return 'credits';
	const quota = creditsStore.creditsQuota;
	if (quota === undefined) return undefined;
	return quota === UNLIMITED_CREDITS ? 'dollars' : 'credits';
});
/**
 * A thread without a credit total spent no credits, but only once the load has
 * succeeded. Until then, and after a failed load, the header shows no total.
 */
const totalCredits = computed(() => {
	const used = threadsStore.threadCreditsUsed(props.threadId);
	if (used !== undefined) return used;
	return costUnit.value === 'credits' && creditsLoadedFor.value === props.threadId ? 0 : undefined;
});
// The turns show credits nowhere yet, so they hide the dollar cost too.
provide(SESSION_TIMELINE_SHOW_COST_KEY, () => costUnit.value === 'dollars');

const sessionMetadata = computed<SessionTimelineMetadata>(() => ({
	trigger: {
		source: executions.value[0]?.source ?? null,
		icon: 'sparkles',
		label: i18n.baseText('agentSessions.origin.instanceAi'),
	},
	totalTokens: sessionUsage.value.totalTokens,
	usage: threadTokenBreakdownOf(executions.value),
	totalCost: costUnit.value === 'dollars' ? sessionUsage.value.cost : null,
	totalCredits: totalCredits.value,
	durationLabel: formatDuration(duration.value),
}));

const threadRoute = computed(() => ({
	name: INSTANCE_AI_THREAD_VIEW,
	params: { threadId: props.threadId },
}));

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: ASSISTANT_AGENT_ID,
		label: i18n.baseText('instanceAi.view.title'),
		href: router.resolve(threadRoute.value).href,
	},
]);

const sessionTitle = computed(() => {
	const known = threadsStore.threadsById.get(props.threadId);
	const title = formatThreadTitle(
		{
			title: summary.value?.title ?? known?.title ?? null,
			firstMessage: summary.value?.firstMessage ?? known?.firstMessage,
		},
		i18n.baseText('agents.builder.chat.newChat.label'),
	);
	return truncate(title, 64);
});

const sessionOptions = computed<
	Array<DropdownMenuItemProps<string, { date: string; active: boolean }>>
>(() =>
	threadsStore.knownThreads.map((known) => ({
		id: known.id,
		label: truncate(
			formatThreadTitle(known, i18n.baseText('agents.builder.chat.newChat.label')),
			64,
		),
		class: known.id === props.threadId ? 'session-dropdown-item-active' : undefined,
		data: { date: formatSessionDateTime(known.updatedAt), active: known.id === props.threadId },
	})),
);

function onSessionSelect(nextThreadId: string) {
	if (nextThreadId === props.threadId) return;
	void router.push({
		name: INSTANCE_AI_THREAD_SESSION_VIEW,
		params: { threadId: nextThreadId },
	});
}

async function copySessionLink() {
	try {
		const { href } = router.resolve({
			name: INSTANCE_AI_THREAD_SESSION_VIEW,
			params: { threadId: props.threadId },
		});
		await clipboard.copy(new URL(href, window.location.origin).href);
		toast.showMessage({
			title: i18n.baseText('agents.builder.preview.more.linkCopied'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.preview.more.copyLinkError'));
	}
}

const closeTimeline = useBackOrFallback(threadRoute);
</script>

<template>
	<div :class="$style.view" data-test-id="assistant-agent-session-view">
		<AgentSessionTimelineHeader
			:breadcrumb-items="breadcrumbItems"
			:project-icon="ASSISTANT_ICON"
			:session-title="sessionTitle"
			:session-options="sessionOptions"
			:show-langsmith-export="false"
			:langsmith-export-loading="false"
			:metadata="hasLoadedThread ? sessionMetadata : undefined"
			:has-session="hasLoadedThread"
			@copy-link="copySessionLink"
			@breadcrumb-select="router.push(threadRoute)"
			@session-select="onSessionSelect"
			@close="closeTimeline"
		/>

		<div :class="$style.content">
			<AgentSessionTimelinePanel
				v-if="summary"
				:project-id="summary.projectId"
				:agent-id="ASSISTANT_AGENT_ID"
				:thread-id="props.threadId"
				:agent-name="thread?.agentName"
				channel="system"
				@loaded="onPanelLoaded"
			/>
			<div v-else-if="lookupFailed" :class="$style.status" role="alert">
				<N8nText>{{ i18n.baseText('instanceAi.thread.loadError') }}</N8nText>
				<N8nButton variant="outline" size="small" @click="lookUpThread(props.threadId)">
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
			</div>
			<div v-else :class="$style.status">
				<N8nSpinner />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	height: 100%;
	overflow: hidden;
}

.content {
	position: relative;
	display: flex;
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
}

.status {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
}
</style>
