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
import {
	defaultAgentSessionFilters,
	type AgentExecution,
	type AgentExecutionThread,
	type ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import AgentSessionTimelineHeader from '@/features/agents/components/AgentSessionTimelineHeader.vue';
import AgentSessionTimelinePanel from '@/features/agents/components/AgentSessionTimelinePanel.vue';
import AgentPreviewDock from '@/features/agents/components/AgentPreviewDock.vue';
import { useAgentBuilderSession } from '@/features/agents/composables/useAgentBuilderSession';
import { useAgentExecutionUpdates } from '@/features/agents/composables/useAgentExecutionUpdates';
import { getAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import { useAgentPermissions } from '@/features/agents/composables/useAgentPermissions';
import type { AgentResource } from '@/features/agents/types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import { N8nEmptyState } from '@n8n/design-system';
import type { DropdownMenuItemProps, IconName, PathItem } from '@n8n/design-system';
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
const rootStore = useRootStore();
const { config: localConfig, fetchConfig } = useAgentConfig();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

// Populated by the timeline panel's `loaded` event so the header can render its
// title/metrics/trigger without a second fetch of the same thread.
const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);
const agent = ref<AgentResource | null>(null);
const isPreviewOpen = ref(false);
const previewInitialized = ref(false);
const { canUpdate } = useAgentPermissions(projectId);
const canDeleteSession = computed(() => canUpdate.value);
const {
	activeChatSessionId,
	effectiveSessionId,
	currentSessionHasMessages,
	currentSessionIsEphemeral,
	currentSessionTitle,
	sessionMenu,
	isDeletingSession,
	onSessionPick,
	onNewChat,
	deleteSession,
} = useAgentBuilderSession({ routeBacked: computed(() => false), projectId, agentId });

/**
 * True while the docked preview sits on a brand-new session that has no thread
 * yet, so this page's thread is no longer what the preview is running. Picking
 * an existing session is excluded: that one has a thread to show right away,
 * and the dock's own trace action navigates to it.
 */
const isPreviewSessionStale = computed(
	() =>
		currentSessionIsEphemeral.value &&
		effectiveSessionId.value !== undefined &&
		effectiveSessionId.value !== threadId.value,
);

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
const canPreviewSession = computed(
	() =>
		currentSessionIsEphemeral.value ||
		(hasLoadedThread.value && thread.value?.canContinueInPreview === true),
);
const previewVisible = computed(() => canPreviewSession.value && isPreviewOpen.value);
const totalCost = computed(() => thread.value?.totalCost ?? 0);
const durationLabel = computed(() => formatDuration(thread.value?.totalDuration ?? 0));

/**
 * The dock resolves the live session's title and its trace/export/delete
 * gates by looking it up in the store's thread list. That list holds only the
 * first page fetched on load, so it misses a session started since then and any
 * thread opened by link from outside that page. When the loaded thread is the
 * live session, it is the authoritative answer, so prefer it over the lookup.
 */
const dockShowsLoadedThread = computed(
	() => thread.value !== null && thread.value.id === effectiveSessionId.value,
);
const dockSessionTitle = computed(() =>
	dockShowsLoadedThread.value ? sessionTitle.value : currentSessionTitle.value,
);
const dockHasSession = computed(
	() => dockShowsLoadedThread.value || currentSessionHasMessages.value,
);

function onPanelLoaded(detail: ThreadDetail | null) {
	thread.value = detail?.thread ?? null;
	executions.value = detail?.executions ?? [];
	upsertLoadedPreviewThread(projectId.value, agentId.value);
}

function upsertLoadedPreviewThread(targetProjectId: string, targetAgentId: string) {
	const loadedThread = thread.value;
	if (
		loadedThread?.canContinueInPreview &&
		loadedThread.projectId === targetProjectId &&
		loadedThread.agentId === targetAgentId
	) {
		sessionsStore.upsertThread(loadedThread);
	}
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
				sessionsStore.fetchThreads(nextProjectId, nextAgentId, {
					filters: defaultAgentSessionFilters(),
				}),
			]);
			if (requestId === previewLoadRequestId) {
				agent.value = loadedAgent;
				upsertLoadedPreviewThread(nextProjectId, nextAgentId);
			}
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

/**
 * Clear this thread's data the instant the live preview session moves on, so
 * its error markers/title/metrics don't linger next to a new session.
 */
watch(isPreviewSessionStale, (stale) => {
	if (!stale) return;
	thread.value = null;
	executions.value = [];
});

/**
 * The new session has no thread to fetch until the backend records its first
 * turn, and that push is the signal it now has one — so re-bind the page to it.
 */
useAgentExecutionUpdates({ projectId, agentId, threadId: effectiveSessionId }, () => {
	if (!isPreviewSessionStale.value || !effectiveSessionId.value) return;
	void router.replace({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: {
			projectId: projectId.value,
			agentId: agentId.value,
			threadId: effectiveSessionId.value,
		},
	});
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

async function onDeletePreviewSession(sessionId: string) {
	if (!canDeleteSession.value) return;
	const deleted = await deleteSession(sessionId);
	if (!deleted || sessionId !== threadId.value) return;
	void router.replace(agentExecutionsRoute.value);
}

function togglePreview() {
	if (!canPreviewSession.value) return;
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
			:show-preview="canPreviewSession"
			:is-preview-open="previewVisible"
			@breadcrumb-select="onBreadcrumbSelect"
			@session-select="onSessionSelect"
			@langsmith-export="sendSession({ projectId, agentId, threadId })"
			@toggle-preview="togglePreview"
			@close="closeTimeline"
		/>

		<div :class="[$style.content, { [$style.previewOpen]: previewVisible }]">
			<AgentSessionTimelinePanel
				v-if="!isPreviewSessionStale"
				:project-id="projectId"
				:agent-id="agentId"
				:thread-id="threadId"
				@loaded="onPanelLoaded"
			/>
			<div v-else :class="$style.newSessionEmpty">
				<N8nEmptyState
					:icon="{ type: 'icon', value: 'message-square' }"
					:heading="i18n.baseText('agentSessions.timeline.emptyState.heading')"
					:description="i18n.baseText('agentSessions.timeline.emptyState.description')"
				/>
			</div>

			<AgentPreviewDock
				v-if="canPreviewSession"
				:is-open="previewVisible"
				:session-title="dockSessionTitle"
				:session-options="sessionMenu"
				:has-session="dockHasSession"
				:initialized="previewInitialized"
				:project-id="projectId"
				:agent-id="agentId"
				:agent="agent"
				:local-config="localConfig"
				:connected-triggers="[]"
				:effective-session-id="effectiveSessionId"
				:can-delete-session="canDeleteSession"
				:is-deleting-session="isDeletingSession"
				@view-trace="viewPreviewTrace"
				@new-session="onNewChat"
				@delete-session="onDeletePreviewSession"
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

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.newSessionEmpty {
	display: flex;
	flex: 1 1 auto;
	min-height: 0;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}
</style>
