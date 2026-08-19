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
import AgentPreviewDock from '@/features/agents/components/AgentPreviewDock.vue';
import { useAgentBuilderSession } from '@/features/agents/composables/useAgentBuilderSession';
import { getAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import type { AgentResource } from '@/features/agents/types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import type { DropdownMenuItemProps, IconName, PathItem } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useStorage } from '@vueuse/core';
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
const rootStore = useRootStore();
const { config: localConfig, fetchConfig } = useAgentConfig();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);
const previewOpenStorageKey = computed(function getPreviewOpenStorageKey() {
	return `N8N_AGENT_PREVIEW_OPEN:${projectId.value}:${agentId.value}`;
});

// Populated by the timeline panel's `loaded` event so the header can render its
// title/metrics/trigger without a second fetch of the same thread.
const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);
const agent = ref<AgentResource | null>(null);
const isPreviewOpen = useStorage(previewOpenStorageKey, false);
const previewInitialized = ref(false);
const {
	activeChatSessionId,
	effectiveSessionId,
	currentSessionHasMessages,
	currentSessionTitle,
	sessionMenu,
	onSessionPick,
	onNewChat,
} = useAgentBuilderSession({ routeBacked: computed(() => false) });

const triggerSource = computed((): string | null => {
	if (executions.value.length === 0) return null;
	const first = executions.value[0];

	/** Relabel InstanceAI to AI Assistant for the UI */
	if (first.source === 'instance-ai') return 'AI Assistant';

	return first.source ?? 'chat';
});

const triggerIcon = computed((): IconName => {
	const source = triggerSource.value;
	if (!source) return 'bolt-filled';

	switch (source) {
		case 'slack':
			return 'slack';
		case 'AI Assistant':
			return 'sparkles';
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

let previewLoadRequestId = 0;

/** Load the agent data required by the shared preview dock. */
watch(
	[projectId, agentId],
	async ([nextProjectId, nextAgentId]) => {
		const requestId = ++previewLoadRequestId;
		previewInitialized.value = false;
		agent.value = null;
		try {
			const [loadedAgent] = await Promise.all([
				getAgent(rootStore.restApiContext, nextProjectId, nextAgentId),
				fetchConfig(nextProjectId, nextAgentId),
				sessionsStore.fetchThreads(nextProjectId, nextAgentId),
			]);
			if (requestId === previewLoadRequestId) agent.value = loadedAgent;
		} finally {
			if (requestId === previewLoadRequestId) previewInitialized.value = true;
		}
	},
	{ immediate: true },
);

watch(
	threadId,
	(nextThreadId) => {
		activeChatSessionId.value = nextThreadId;
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

function togglePreview() {
	isPreviewOpen.value = !isPreviewOpen.value;
}

function viewPreviewTrace() {
	if (!effectiveSessionId.value) return;
	onSessionSelect(effectiveSessionId.value);
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
			:is-preview-open="isPreviewOpen"
			@breadcrumb-select="onBreadcrumbSelect"
			@session-select="onSessionSelect"
			@langsmith-export="sendSession({ projectId, agentId, threadId })"
			@toggle-preview="togglePreview"
			@close="closeTimeline"
		/>

		<div :class="[$style.content, { [$style.previewOpen]: isPreviewOpen }]">
			<AgentSessionTimelinePanel
				:project-id="projectId"
				:agent-id="agentId"
				:thread-id="threadId"
				@loaded="onPanelLoaded"
			/>

			<AgentPreviewDock
				:is-open="isPreviewOpen"
				:session-title="currentSessionTitle"
				:session-options="sessionMenu"
				:has-session="currentSessionHasMessages"
				:initialized="previewInitialized"
				:project-id="projectId"
				:agent-id="agentId"
				:agent="agent"
				:local-config="localConfig"
				:connected-triggers="[]"
				:effective-session-id="effectiveSessionId"
				@view-trace="viewPreviewTrace"
				@new-session="onNewChat"
				@session-select="onSessionPick"
				@close="togglePreview"
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
	padding-right: 0;
	transition: padding-right var(--duration--snappy) var(--easing--ease-out);

	&.previewOpen {
		padding-right: var(--agent-preview-chat-column-width, 30rem);
	}

	&.previewOpen:has([data-preview-layout='floating']),
	&.previewOpen:has([data-preview-layout='fullpage']) {
		padding-right: 0;
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}
</style>
