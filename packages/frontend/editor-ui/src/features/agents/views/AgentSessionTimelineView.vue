<script lang="ts" setup>
import { truncate } from '@n8n/utils/string/truncate';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentSessionStop } from '../composables/useAgentSessionStop';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentProjectBreadcrumb } from '@/features/agents/composables/useAgentProjectBreadcrumb';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import {
	AGENT_BUILDER_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
} from '@/features/agents/constants';
import { useAgentSessionLangSmithExport } from '@/features/agents/composables/useAgentSessionLangSmithExport';
import { useAgentSessionUsage } from '@/features/agents/composables/useAgentSessionUsage';
import { useAgentExecutionUpdates } from '@/features/agents/composables/useAgentExecutionUpdates';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import {
	defaultAgentSessionFilters,
	type AgentExecution,
	type AgentExecutionThread,
	type ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import AgentSessionTimelineHeader from '@/features/agents/components/AgentSessionTimelineHeader.vue';
import { useBackOrFallback } from '@/features/agents/composables/useBackOrFallback';
import AgentSessionTimelinePanel from '@/features/agents/components/AgentSessionTimelinePanel.vue';
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import {
	increasedBudgetConfig,
	type BudgetAmountField,
} from '@/features/agents/utils/budget-config';
import { useToast } from '@n8n/composables/useToast';
import type { SessionTimelineMetadata } from '@/features/agents/types';
import { useI18n } from '@n8n/i18n';
import type { DropdownMenuItemProps, IconName, PathItem } from '@n8n/design-system';
import { computed, onScopeDispose, ref, watch } from 'vue';
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
const { config: localConfig, fetchConfig, updateConfig } = useAgentConfig();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

const clipboard = useClipboard();
const toast = useToast();
const { canUpdate, canUpdate: canDeleteSession } = useAgentPermissions(projectId);
const { openAgentConfirmationModal } = useAgentConfirmationModal();
const isDeletingSession = ref(false);
let isDisposed = false;
onScopeDispose(() => {
	isDisposed = true;
});

async function copySessionLink() {
	if (!hasLoadedThread.value) return;
	try {
		const { href } = router.resolve({
			name: AGENT_SESSION_DETAIL_VIEW,
			params: { projectId: projectId.value, agentId: agentId.value, threadId: threadId.value },
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

async function deleteSession() {
	if (!hasLoadedThread.value || !canDeleteSession.value || isDeletingSession.value) return;
	const target = { projectId: projectId.value, agentId: agentId.value, threadId: threadId.value };
	const isCurrentSession = () =>
		!isDisposed &&
		projectId.value === target.projectId &&
		agentId.value === target.agentId &&
		threadId.value === target.threadId;
	isDeletingSession.value = true;
	try {
		const confirmed = await openAgentConfirmationModal({
			title: i18n.baseText('agentSessions.deleteConfirm.headline'),
			description: i18n.baseText('agentSessions.deleteConfirm.message'),
			confirmButtonText: i18n.baseText('agentSessions.deleteConfirm.confirmButtonText'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM || !isCurrentSession() || !canDeleteSession.value) return;
		await sessionsStore.deleteThread(target.projectId, target.agentId, target.threadId);
		toast.showMessage({
			title: i18n.baseText('agentSessions.showMessage.deleted'),
			type: 'success',
		});
		if (isCurrentSession()) {
			await router.push({
				name: AGENT_SESSIONS_LIST_VIEW,
				params: { projectId: target.projectId, agentId: target.agentId },
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.delete'));
	} finally {
		isDeletingSession.value = false;
	}
}

// Populated by the timeline panel's `loaded` event so the header can render its
// title/metrics/trigger without a second fetch of the same thread.
const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);

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

const {
	usage: sessionUsage,
	duration,
	onExecutionUpdated,
} = useAgentSessionUsage(
	() => (thread.value ? { thread: thread.value, executions: executions.value } : null),
	() => ({}),
);
useAgentExecutionUpdates({ projectId, agentId, threadId }, () => {}, onExecutionUpdated);
const totalTokens = computed(() => sessionUsage.value.totalTokens);

const hasLoadedThread = computed(() => thread.value?.id === threadId.value);
const { canStop, stoppingSessionIds, stop: stopSession } = useAgentSessionStop(projectId, agentId);
const canStopSession = computed(
	() =>
		hasLoadedThread.value &&
		canStop.value &&
		executions.value.some(({ status }) => status === 'running'),
);

function onStopSession() {
	if (canStopSession.value) void stopSession(threadId.value);
}

const totalCost = computed(() => sessionUsage.value.cost);
const durationLabel = computed(() => formatDuration(duration.value));
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
	if (!Number.isFinite(ms) || ms <= 0) return '';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(fullDate: string): string {
	if (!fullDate) return '';
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

const closeTimeline = useBackOrFallback(() => ({
	name: AGENT_SESSIONS_LIST_VIEW,
	params: { projectId: projectId.value, agentId: agentId.value },
}));

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

/**
 * Raises a budget cap from the timeline's budget notice. Only a persisted cap
 * counts: a stale or failed save would stop the next run against the old cap.
 */
async function onIncreaseBudget(payload: {
	field: BudgetAmountField;
	amount: number;
}): Promise<boolean> {
	const current = localConfig.value;
	if (!canUpdate.value || !current) return false;
	const update = increasedBudgetConfig(current, payload.field, payload.amount);
	if (!update) return false;
	try {
		const result = await updateConfig(projectId.value, agentId.value, { ...current, ...update });
		if (result.stale) return false;
		localConfig.value = result.config;
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.budget'));
		return false;
	}
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
			:metadata="hasLoadedThread ? sessionMetadata : undefined"
			:has-session="hasLoadedThread"
			:can-delete-session="canDeleteSession"
			:is-deleting-session="isDeletingSession"
			:show-stop="canStopSession"
			:stop-loading="stoppingSessionIds.has(threadId)"
			@copy-link="copySessionLink"
			@delete-session="deleteSession"
			@breadcrumb-select="onBreadcrumbSelect"
			@session-select="onSessionSelect"
			@langsmith-export="sendSession({ projectId, agentId, threadId })"
			@stop="onStopSession"
			@close="closeTimeline"
		/>

		<div :class="$style.content">
			<AgentSessionTimelinePanel
				:project-id="projectId"
				:agent-id="agentId"
				:thread-id="threadId"
				:increase-budget="canUpdate ? onIncreaseBudget : undefined"
				:agent-name="thread?.agentName"
				:personalisation="localConfig?.personalisation"
				:tools="localConfig?.tools"
				@loaded="onPanelLoaded"
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
