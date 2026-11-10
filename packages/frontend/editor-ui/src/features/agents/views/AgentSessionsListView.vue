<script lang="ts" setup>
import {
	AGENT_SESSION_ASSISTANT_KEY,
	OPEN_AGENT_PREVIEW_KEY,
} from '../components/agentBuilderInjectionKeys';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import { useAgentSessionStop } from '@/features/agents/composables/useAgentSessionStop';
import {
	useAgentTelemetry,
	type AgentSessionFilterName,
} from '@/features/agents/composables/useAgentTelemetry';
import type {
	AgentExecutionThread,
	AgentSessionFilters,
} from '@/features/agents/composables/useAgentThreadsApi';
import AgentSessionsFilter from '@/features/agents/components/AgentSessionsFilter.vue';
import AgentSessionListItem from '../components/AgentSessionListItem.vue';
import AgentSessionListItemSkeleton from '../components/AgentSessionListItemSkeleton.vue';
import AgentTestButton from '@/features/agents/components/AgentTestButton.vue';
import { generateWhimsicalLabel } from '@/features/ai/shared/utils/whimsicalLabel';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { N8nButton, N8nCheckbox, N8nEmptyState } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';

const sessionFilterFields: Array<[keyof AgentSessionFilters, AgentSessionFilterName]> = [
	['status', 'status'],
	['origin', 'origin'],
	['startDate', 'start_date'],
	['endDate', 'end_date'],
];
/** One flat row of the session tree, ready to render in the list. */
interface SessionTreeRow {
	thread: AgentExecutionThread;
	/** 0 for a root session. */
	depth: number;
	/** True when this row is the last child of its parent. */
	isLast: boolean;
	/** True when this row has children below it. */
	hasChildren: boolean;
	/**
	 * One entry for each ancestor level (length is `depth - 1`).
	 * True when the ancestor at that level has more siblings below, so the rail must continue.
	 */
	guides: boolean[];
}

const props = withDefaults(
	defineProps<{
		embedded?: boolean;
		projectId?: string;
		agentId?: string;
		manageStoreLifecycle?: boolean;
	}>(),
	{
		embedded: false,
		projectId: undefined,
		agentId: undefined,
		manageStoreLifecycle: true,
	},
);

const openAgentPreview = inject(OPEN_AGENT_PREVIEW_KEY, undefined);
const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();
const sessionsStore = useAgentSessionsStore();
const agentTelemetry = useAgentTelemetry();
const sessionAssistant = inject(AGENT_SESSION_ASSISTANT_KEY, undefined);
const fixingThreadId = ref<string | null>(null);
const { onDocumentVisible } = useDocumentVisibility();
let disposed = false;
let managesStoreLifecycle = false;

const projectId = computed(() => props.projectId ?? (route.params.projectId as string));
const agentId = computed(() => props.agentId ?? (route.params.agentId as string));
const { canStop, stoppingSessionIds, stop: stopSession } = useAgentSessionStop(projectId, agentId);
const hasActiveFilters = computed(() => {
	const { status, origin, startDate, endDate } = sessionsStore.filters;
	return status !== 'all' || origin !== 'all' || Boolean(startDate) || Boolean(endDate);
});

/** Keep each label until its session leaves reasoning. Polls must not replace it. */
const reasoningLabels = ref(new Map<string, BaseTextKey>());

watch(
	() =>
		sessionsStore.threads.flatMap((thread) =>
			thread.status === 'running' && thread.latestActivity?.type === 'reasoning' ? [thread.id] : [],
		),
	(threadIds) => {
		const labels = new Map<string, BaseTextKey>();
		for (const threadId of threadIds) {
			labels.set(threadId, reasoningLabels.value.get(threadId) ?? generateWhimsicalLabel());
		}
		reasoningLabels.value = labels;
	},
	{ immediate: true },
);

function byCreatedAt(a: AgentExecutionThread, b: AgentExecutionThread) {
	return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Groups sub-agent sessions under their parent session and flattens the result in display order.
 * A session whose parent is not in the list (other agent, other page, filtered out) stays a root.
 * Roots keep the store order. Children sort by start time.
 */
function buildSessionTree(threads: AgentExecutionThread[]): SessionTreeRow[] {
	const ids = new Set(threads.map((thread) => thread.id));
	const childrenByParent = new Map<string, AgentExecutionThread[]>();
	const roots: AgentExecutionThread[] = [];

	for (const thread of threads) {
		const parentId = thread.parentThreadId;
		if (parentId && parentId !== thread.id && ids.has(parentId)) {
			const siblings = childrenByParent.get(parentId) ?? [];
			siblings.push(thread);
			childrenByParent.set(parentId, siblings);
		} else {
			roots.push(thread);
		}
	}

	const rows: SessionTreeRow[] = [];
	const visited = new Set<string>();

	function visit(thread: AgentExecutionThread, depth: number, isLast: boolean, guides: boolean[]) {
		/** Protects against a parent cycle in bad data. */
		if (visited.has(thread.id)) return;
		visited.add(thread.id);

		const children = (childrenByParent.get(thread.id) ?? []).sort(byCreatedAt);
		rows.push({ thread, depth, isLast, hasChildren: children.length > 0, guides });

		/** Roots do not draw a rail, so only levels deeper than 1 add a guide. */
		const childGuides = depth === 0 ? [] : [...guides, !isLast];
		children.forEach((child, index) => {
			visit(child, depth + 1, index === children.length - 1, childGuides);
		});
	}

	roots.forEach((root) => visit(root, 0, true, []));
	/** Sessions in a parent cycle are never reached from a root, so show them as roots. */
	for (const thread of threads) {
		if (!visited.has(thread.id)) visit(thread, 0, true, []);
	}
	return rows;
}

const sessionRows = computed(() => buildSessionTree(sessionsStore.threads));

function onVisibilityChange() {
	/** Refresh after a hidden tab becomes visible. Keep the loaded pages. */
	if (disposed || !managesStoreLifecycle || !sessionsStore.autoRefresh) return;
	if (!projectId.value || !agentId.value) return;
	void sessionsStore.refreshThreads(projectId.value, agentId.value);
}

onDocumentVisible(onVisibilityChange);

onMounted(async () => {
	if (!props.manageStoreLifecycle) return;
	managesStoreLifecycle = true;

	if (projectId.value && agentId.value) {
		try {
			await sessionsStore.fetchThreads(projectId.value, agentId.value);
			if (disposed) return;
			sessionsStore.startAutoRefresh();
		} catch (error) {
			if (disposed) return;
			toast.showError(error, i18n.baseText('agentSessions.showError.load'));
		}
	}
});

onBeforeUnmount(() => {
	disposed = true;
	if (!managesStoreLifecycle) return;

	sessionsStore.stopAutoRefresh();
});

async function fixWithAssistant(thread: AgentExecutionThread) {
	if (!sessionAssistant?.isAvailable.value || fixingThreadId.value || thread.status !== 'error')
		return;

	fixingThreadId.value = thread.id;
	try {
		const failure = thread.failureSummary?.latest;
		await sessionAssistant.handoff({
			projectId: thread.projectId,
			agentId: thread.agentId,
			threadId: thread.id,
			agentName: thread.agentName,
			sessionTitle: threadTitleOf(thread),
			executionId: failure?.executionId,
			initialDraft: {
				text: i18n.baseText('agentSessions.fixWithAssistantPrompt', {
					interpolate: {
						error: failure?.message || i18n.baseText('agentSessions.status.error'),
					},
				}),
				prefillType: 'handoff_agent_change_request',
			},
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.handoff.openFailed.title'));
	} finally {
		fixingThreadId.value = null;
	}
}

function rowActions(thread: AgentExecutionThread): Array<DropdownMenuItemProps<string>> {
	const actions: Array<DropdownMenuItemProps<string>> = [];
	if (thread.status === 'running' && canStop.value) {
		actions.push({
			id: 'stop',
			label: i18n.baseText('agentSessions.stop'),
			icon: { type: 'icon', value: 'square' },
			destructive: true,
			disabled: stoppingSessionIds.value.has(thread.id),
		});
	}

	if (thread.parentThreadId && thread.parentAgentId) {
		actions.push({
			id: 'goToParentRun',
			label: i18n.baseText('agentSessions.goToParentRun'),
			icon: { type: 'icon', value: 'arrow-up-right' },
		});
	}

	actions.push({
		id: 'delete',
		label: i18n.baseText('generic.delete'),
		icon: { type: 'icon', value: 'trash-2' },
		divided: actions.length > 0,
	});

	return actions;
}

async function onAction(actionId: string, thread: AgentExecutionThread) {
	if (actionId === 'stop') {
		if (thread.status !== 'running') return;
		const targetProjectId = projectId.value;
		const targetAgentId = agentId.value;
		if (await stopSession(thread.id)) {
			await sessionsStore.refreshThreads(targetProjectId, targetAgentId);
		}
		return;
	}

	if (actionId === 'goToParentRun') {
		if (!thread.parentAgentId || !thread.parentThreadId) return;
		void router.push({
			name: AGENT_SESSION_DETAIL_VIEW,
			params: {
				projectId: projectId.value,
				agentId: thread.parentAgentId,
				threadId: thread.parentThreadId,
			},
		});
		return;
	}

	if (actionId !== 'delete') return;

	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agentSessions.deleteConfirm.headline'),
		description: i18n.baseText('agentSessions.deleteConfirm.message'),
		isDestructive: true,
		confirmButtonText: i18n.baseText('agentSessions.deleteConfirm.confirmButtonText'),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await sessionsStore.deleteThread(projectId.value, agentId.value, thread.id);
		toast.showMessage({
			title: i18n.baseText('agentSessions.showMessage.deleted'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.delete'));
	}
}

async function loadMore() {
	try {
		await sessionsStore.loadMore(projectId.value, agentId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	}
}

function onAutoRefreshChange(enabled: boolean) {
	if (enabled) sessionsStore.startAutoRefresh();
	else sessionsStore.stopAutoRefresh();
}

async function onFiltersChange(value: AgentSessionFilters) {
	const filterNames = sessionFilterFields
		.filter(
			([field]) => JSON.stringify(sessionsStore.filters[field]) !== JSON.stringify(value[field]),
		)
		.map(([, name]) => name);
	if (filterNames.length > 0) {
		agentTelemetry.trackAppliedSessionFilter({ agentId: agentId.value, filterNames });
	}
	try {
		await sessionsStore.setFilters(projectId.value, agentId.value, value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	}
}
</script>

<template>
	<div :class="[$style.wrapper, { [$style.embedded]: props.embedded }]">
		<div :class="$style.filters">
			<N8nCheckbox
				v-model="sessionsStore.autoRefresh"
				data-test-id="agent-sessions-auto-refresh-checkbox"
				:label="i18n.baseText('executionsList.autoRefresh')"
				@update:model-value="onAutoRefreshChange"
			/>
			<AgentSessionsFilter :model-value="sessionsStore.filters" @filter-changed="onFiltersChange" />
		</div>
		<ul :class="$style.listContainer">
			<AgentSessionListItemSkeleton v-if="sessionsStore.loading && !sessionsStore.threads.length" />
			<li v-if="!sessionsStore.threads.length && !sessionsStore.loading">
				<N8nEmptyState
					:class="$style.emptyState"
					:icon="{ type: 'icon', value: 'bot' }"
					:hide-border="true"
					:description="
						hasActiveFilters ? undefined : i18n.baseText('agentSessions.emptyDescription')
					"
					button-icon="flask-conical"
				>
					<template #heading>
						<span data-test-id="agent-sessions-empty">
							{{
								i18n.baseText(
									hasActiveFilters ? 'agentSessions.emptyWithFilters' : 'agentSessions.empty',
								)
							}}
						</span>
					</template>
					<template v-if="!hasActiveFilters && openAgentPreview" #additionalContent>
						<AgentTestButton
							variant="solid"
							:is-runnable="openAgentPreview.isRunnable.value"
							:validation-issues="openAgentPreview.validationIssues.value"
							@open-preview="openAgentPreview.open()"
						/>
					</template>
					<template #description>
						<span data-test-id="agent-sessions-empty-description">
							{{ i18n.baseText('agentSessions.emptyDescription') }}
						</span>
					</template>
				</N8nEmptyState>
			</li>
			<AgentSessionListItem
				v-for="row in sessionRows"
				v-else
				:key="row.thread.id"
				:row="row"
				:project-id="projectId"
				:agent-id="row.thread.agentId"
				:actions="rowActions(row.thread)"
				:reasoning-label="reasoningLabels.get(row.thread.id)"
				:assistant-available="sessionAssistant?.isAvailable.value ?? false"
				:fixing-thread-id="fixingThreadId"
				@action="onAction($event, row.thread)"
				@fix-with-assistant="fixWithAssistant(row.thread)"
			/>
			<li v-if="sessionsStore.nextCursor" :class="$style.loadMore">
				<N8nButton
					icon="refresh-cw"
					variant="ghost"
					:title="i18n.baseText('agentSessions.loadMore')"
					:label="i18n.baseText('agentSessions.loadMore')"
					:loading="sessionsStore.loading"
					data-test-id="agent-sessions-load-more"
					@click="loadMore"
				/>
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	min-width: 0;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;

	--n8n-agent-session-list-row--radius: var(--radius);
}

.embedded {
	height: auto;
	padding: 0;
	overflow-y: visible;
}

.listContainer {
	display: flex;
	flex-direction: column;
	gap: 0;
	margin: 0;
	list-style: none;
	background-color: var(--background--surface);
	border-radius: var(--n8n-agent-session-list-row--radius);
	padding: var(--spacing--5xs);
	outline: var(--border);
	box-shadow: var(--shadow--xs);
}

.filters {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.emptyState {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--xs);
	text-align: center;
	aspect-ratio: 4/2;
}

.loadMore {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--3xs);
	border-top: 1px solid var(--border-color);
	margin-inline: calc(var(--spacing--5xs) * -1);
	margin-top: var(--spacing--5xs);

	> button {
		width: 100%;
		border-radius: var(--n8n-agent-session-list-row--radius);
	}
}
</style>
