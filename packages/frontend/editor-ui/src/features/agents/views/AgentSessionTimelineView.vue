<script lang="ts" setup>
import { truncate } from '@n8n/utils/string/truncate';
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentProjectBreadcrumb } from '@/features/agents/composables/useAgentProjectBreadcrumb';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import {
	AGENT_BUILDER_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	EXECUTIONS_SECTION_KEY,
} from '@/features/agents/constants';
import { useAgentSessionLangSmithExport } from '@/features/agents/composables/useAgentSessionLangSmithExport';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import {
	defaultAgentSessionFilters,
	type AgentExecution,
	type AgentExecutionThread,
	type ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import AgentSessionTimelineHeader from '@/features/agents/components/AgentSessionTimelineHeader.vue';
import AgentSessionTimelinePanel from '@/features/agents/components/AgentSessionTimelinePanel.vue';
import SessionTimelineSidePanel from '@/features/agents/components/SessionTimelineSidePanel.vue';
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import { useBackOrFallback } from '@/features/agents/composables/useBackOrFallback';
import type { SessionTimelineMetadata } from '@/features/agents/types';
import { useI18n } from '@n8n/i18n';
import type { DropdownMenuItemProps, IconName, PathItem } from '@n8n/design-system';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const sessionsStore = useAgentSessionsStore();
const {
	isEnabled: isLangSmithExportEnabled,
	isExporting,
	sendSession,
} = useAgentSessionLangSmithExport();
const { config: localConfig, fetchConfig } = useAgentConfig();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

// Populated by the timeline panel's `loaded` event so the header can render its
// title/metrics/trigger without a second fetch of the same thread.
const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);
const isSidePanelVisible = ref<boolean>(true);

onMounted(() => {
	isSidePanelVisible.value = window.innerWidth >= 400;
});

const triggerSource = computed((): string | null => {
	if (executions.value.length === 0) return null;
	return executions.value[0].source ?? 'chat';
});

const triggerIcon = computed((): IconName => {
	const source = triggerSource.value;
	if (!source) return 'bolt-filled';

	switch (source) {
		case 'slack':
			return 'slack';
		case 'instance-ai':
			return 'sparkles';
		case 'n8n_chat_production':
			return 'message-square';
		default:
			return 'bolt-filled';
	}
});

const triggerLabel = computed((): string => {
	const source = triggerSource.value;
	if (!source) return '';
	if (source === 'chat' || source === 'n8n_chat') {
		return i18n.baseText('agentSessions.origin.preview');
	}
	// Instance AI runs are labelled with the product name, not the source id.
	if (source === 'instance-ai') {
		return i18n.baseText('agentSessions.origin.instanceAi');
	}
	if (source === 'n8n_chat_production') {
		return i18n.baseText('agentSessions.origin.n8nChat');
	}
	return source.charAt(0).toUpperCase() + source.slice(1);
});

const sessionTitle = computed(() => {
	if (!thread.value) return '';
	return truncate(threadTitleOf(thread.value), 64);
});

const { projectName, projectIcon } = useAgentProjectBreadcrumb(projectId);

const projectRoute = computed<RouteLocationRaw>(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: projectId.value },
}));

const agentRoute = computed<RouteLocationRaw>(() => ({
	name: AGENT_BUILDER_VIEW,
	params: { projectId: projectId.value, agentId: agentId.value },
}));

const agentExecutionsRoute = computed<RouteLocationRaw>(() => ({
	...(typeof agentRoute.value === 'object' ? agentRoute.value : {}),
	query: { section: EXECUTIONS_SECTION_KEY },
}));

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: projectId.value,
		label: projectName.value ?? i18n.baseText('agents.builder.header.projectFallback'),
		href: router.resolve(projectRoute.value).href,
	},
	{
		id: agentId.value,
		label: thread.value?.agentName ?? '…',
		href: router.resolve(agentRoute.value).href,
	},
]);

interface SessionDropdownData {
	date: string;
	active: boolean;
}

const sessionOptions = computed<Array<DropdownMenuItemProps<string, SessionDropdownData>>>(() => {
	const sessions = sessionsStore.threads;
	if (sessions.length === 0) {
		return [
			{
				id: '__empty__',
				label: i18n.baseText('agentSessions.empty'),
				disabled: true,
			},
		];
	}
	return sessions.map((session) => ({
		id: session.id,
		label: truncate(threadTitleOf(session), 64),
		class: session.id === threadId.value ? 'session-dropdown-item-active' : undefined,
		data: {
			date: formatDate(session.updatedAt),
			active: session.id === threadId.value,
		},
	}));
});

const totalTokens = computed(() => {
	if (!thread.value) return 0;
	return thread.value.totalPromptTokens + thread.value.totalCompletionTokens;
});

const hasLoadedThread = computed(() => thread.value?.id === threadId.value);
const totalCost = computed(() => thread.value?.totalCost ?? 0);
const durationLabel = computed(() => formatDuration(thread.value?.totalDuration ?? 0));
const sessionMetadata = computed<SessionTimelineMetadata>(() => ({
	trigger: {
		source: triggerSource.value,
		icon: triggerIcon.value,
		label: triggerLabel.value,
	},
	totalTokens: totalTokens.value,
	totalCost: totalCost.value,
	durationLabel: durationLabel.value,
}));

function onPanelLoaded(detail: ThreadDetail | null) {
	thread.value = detail?.thread ?? null;
	executions.value = detail?.executions ?? [];
}

watch(
	[projectId, agentId],
	async ([nextProjectId, nextAgentId]) => {
		await Promise.all([
			fetchConfig(nextProjectId, nextAgentId),
			sessionsStore.fetchThreads(nextProjectId, nextAgentId, {
				filters: defaultAgentSessionFilters(),
			}),
		]);
	},
	{ immediate: true },
);

function formatDuration(ms: number): string {
	if (!ms || ms <= 0) return '0ms';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(fullDate: string): string {
	if (!fullDate) return '';
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

// Returns to the correct starting point (e.g. Preview) when there is one;
// otherwise falls back to the agent's executions tab, e.g. for a direct visit.
const closeTimeline = useBackOrFallback(agentExecutionsRoute);

function onBreadcrumbSelect(item: PathItem) {
	if (item.id === projectId.value) {
		void router.push(projectRoute.value);
	} else if (item.id === agentId.value) {
		void router.push(agentRoute.value);
	}
}

function onSessionSelect(nextThreadId: string) {
	if (nextThreadId === '__empty__' || nextThreadId === threadId.value) return;
	void router.push({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value, threadId: nextThreadId },
	});
}
</script>

<template>
	<div :class="$style.view">
		<AgentSessionTimelineHeader
			:breadcrumb-items="breadcrumbItems"
			:project-icon="projectIcon"
			:session-title="sessionTitle"
			:session-options="sessionOptions"
			:show-langsmith-export="isLangSmithExportEnabled && hasLoadedThread"
			:langsmith-export-loading="isExporting"
			:is-side-panel-visible="isSidePanelVisible"
			@breadcrumb-select="onBreadcrumbSelect"
			@session-select="onSessionSelect"
			@langsmith-export="sendSession({ projectId, agentId, threadId })"
			@toggle-side-panel="isSidePanelVisible = !isSidePanelVisible"
			@close="closeTimeline"
		/>

		<div :class="$style.content">
			<AgentSessionTimelinePanel
				:project-id="projectId"
				:agent-id="agentId"
				:thread-id="threadId"
				:agent-name="thread?.agentName"
				:personalisation="localConfig?.personalisation"
				@loaded="onPanelLoaded"
			/>
			<SessionTimelineSidePanel
				v-if="thread"
				:thread="thread"
				:metadata="sessionMetadata"
				:is-visible="isSidePanelVisible"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex-direction: column;
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
</style>
