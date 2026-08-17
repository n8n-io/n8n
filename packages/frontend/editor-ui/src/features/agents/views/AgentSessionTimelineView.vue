<script lang="ts" setup>
import { truncate } from '@n8n/utils/string/truncate';
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import {
	AGENT_BUILDER_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	EXECUTIONS_SECTION_KEY,
} from '@/features/agents/constants';
import { useAgentSessionLangSmithExport } from '@/features/agents/composables/useAgentSessionLangSmithExport';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import type {
	AgentExecution,
	AgentExecutionThread,
	ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import AgentSessionTimelineHeader from '@/features/agents/components/AgentSessionTimelineHeader.vue';
import AgentSessionTimelinePanel from '@/features/agents/components/AgentSessionTimelinePanel.vue';
import { useI18n } from '@n8n/i18n';
import type { DropdownMenuItemProps, PathItem } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const sessionsStore = useAgentSessionsStore();
const projectsStore = useProjectsStore();
const {
	isEnabled: isLangSmithExportEnabled,
	isExporting,
	sendSession,
} = useAgentSessionLangSmithExport();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

// Populated by the timeline panel's `loaded` event so the header can render its
// title/metrics/trigger without a second fetch of the same thread.
const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);

const triggerSource = computed((): string | null => {
	if (executions.value.length === 0) return null;
	const first = executions.value[0];
	return first.source ?? 'chat';
});

const triggerIcon = computed((): 'slack' | 'bolt-filled' => {
	return triggerSource.value === 'slack' ? 'slack' : 'bolt-filled';
});

const triggerLabel = computed((): string => {
	const source = triggerSource.value;
	if (!source) return '';
	return source.charAt(0).toUpperCase() + source.slice(1);
});

const sessionTitle = computed(() => {
	if (!thread.value) return '';
	return truncate(threadTitleOf(thread.value), 64);
});

const projectName = computed<string | null>(() => {
	if (projectsStore.personalProject?.id === projectId.value) {
		return i18n.baseText('projects.menu.personal');
	}
	const current = projectsStore.currentProject;
	if (current && current.id === projectId.value) return current.name ?? null;
	const match = projectsStore.myProjects.find((p) => p.id === projectId.value);
	return match?.name ?? null;
});

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

function onPanelLoaded(detail: ThreadDetail | null) {
	thread.value = detail?.thread ?? null;
	executions.value = detail?.executions ?? [];
}

// Keep the header's session-picker dropdown populated. The panel loads the
// thread detail; the thread list is a header concern, so it's fetched here.
watch([projectId, agentId], () => void sessionsStore.fetchThreads(projectId.value, agentId.value), {
	immediate: true,
});

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

function closeTimeline() {
	/**
	 * Get the last visited route from Vue router so we return to the correct starting point (e.g Preview)
	 * If no state is available, it's most likey because the link was visited directly.
	 * Here we fallback to default Agents view.
	 */
	const previousRoute = router.options.history.state.back;
	const resolvedPreviousRoute =
		typeof previousRoute === 'string' ? router.resolve(previousRoute) : null;

	if (resolvedPreviousRoute?.matched.length) {
		router.back();
		return;
	}
	void router.push(agentExecutionsRoute.value);
}

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
			:session-title="sessionTitle"
			:session-options="sessionOptions"
			:show-metrics="Boolean(thread)"
			:trigger-source="triggerSource"
			:trigger-icon="triggerIcon"
			:trigger-label="triggerLabel"
			:total-tokens="totalTokens"
			:total-cost="totalCost"
			:duration-label="durationLabel"
			:show-langsmith-export="isLangSmithExportEnabled && hasLoadedThread"
			:langsmith-export-loading="isExporting"
			@breadcrumb-select="onBreadcrumbSelect"
			@session-select="onSessionSelect"
			@langsmith-export="sendSession({ projectId, agentId, threadId })"
			@close="closeTimeline"
		/>

		<AgentSessionTimelinePanel
			:project-id="projectId"
			:agent-id="agentId"
			:thread-id="threadId"
			@loaded="onPanelLoaded"
		/>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}
</style>
