<script lang="ts" setup>
import { truncate } from '@n8n/utils';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import {
	AGENT_BUILDER_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	EXECUTIONS_SECTION_KEY,
} from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import type {
	AgentExecution,
	AgentExecutionThread,
} from '@/features/agents/composables/useAgentThreadsApi';
import SessionTimelineChart from '@/features/agents/components/SessionTimelineChart.vue';
import SessionEventFilter from '@/features/agents/components/SessionEventFilter.vue';
import SessionTimelineTable from '@/features/agents/components/SessionTimelineTable.vue';
import SessionDetailPanel from '@/features/agents/components/SessionDetailPanel.vue';
import AgentSessionTimelineHeader from '@/features/agents/components/AgentSessionTimelineHeader.vue';
import {
	flattenExecutionsToTimelineItems,
	computeIdleRanges,
	sessionBounds,
	itemFilterKey,
	chartBlockColor,
	filteredTimelineItemIndexes,
	isSubAgentTimelineItem,
} from '@/features/agents/session-timeline.utils';
import { useSubAgentNames } from '@/features/agents/composables/useSubAgentNames';
import { resolveSubAgentName } from '@/features/agents/utils/delegate-tool';
import { shouldIgnoreCanvasShortcut } from '@/features/workflows/canvas/canvas.utils';
import type { FilterOption, TimelineItem } from '@/features/agents/session-timeline.types';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nInput } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useActiveElement, useEventListener } from '@vueuse/core';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();
const projectsStore = useProjectsStore();
const activeElement = useActiveElement();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);
const loading = ref(true);
const selectedIndex = ref<number | null>(null);
const highlightedIndex = ref<number | null>(null);
const selectedFilters = ref<Set<string>>(new Set());
const searchQuery = ref('');
let loadThreadDetailRequestId = 0;

const baseItems = computed<TimelineItem[]>(() =>
	flattenExecutionsToTimelineItems(executions.value),
);

// Resolve sub-agent ids to friendly names, loaded lazily and only when the
// session actually contains delegations (mirrors how the chat resolves the
// delegate step label).
const { subAgentNameById } = useSubAgentNames(projectId, () =>
	baseItems.value.some(isSubAgentTimelineItem),
);

const items = computed<TimelineItem[]>(() =>
	baseItems.value.map((item) => {
		if (!isSubAgentTimelineItem(item)) return item;
		const name = resolveSubAgentName(item.toolInput, subAgentNameById.value);
		return name ? { ...item, subAgentName: name } : item;
	}),
);
const idleRanges = computed(() => computeIdleRanges(items.value));
const bounds = computed(() => sessionBounds(items.value));

function labelForKey(key: string): string {
	switch (key) {
		case 'user':
			return i18n.baseText('agentSessions.timeline.user');
		case 'agent':
			return i18n.baseText('agentSessions.timeline.agent');
		case 'tool':
			return i18n.baseText('agentSessions.timeline.tool');
		case 'workflow':
			return i18n.baseText('agentSessions.timeline.workflow');
		case 'node':
			return i18n.baseText('agentSessions.timeline.node');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.suspension');
		case 'suspension-waiting':
			return i18n.baseText('agentSessions.timeline.waitingForUser');
		case 'user-feedback':
			return i18n.baseText('agentSessions.timeline.userFeedback');
		default:
			return key;
	}
}

const filterOptions = computed<FilterOption[]>(() => {
	const counts = new Map<string, number>();
	const colorByKey = new Map<string, string>();
	for (const item of items.value) {
		const key = itemFilterKey(item);
		counts.set(key, (counts.get(key) ?? 0) + 1);
		if (!colorByKey.has(key)) colorByKey.set(key, chartBlockColor(item.kind));
	}
	return Array.from(counts.entries()).map(([key, count]) => ({
		key,
		label: labelForKey(key),
		color: colorByKey.get(key) ?? 'var(--border-color)',
		count,
	}));
});

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

const selectedItem = computed<TimelineItem | null>(() =>
	selectedIndex.value !== null ? (items.value[selectedIndex.value] ?? null) : null,
);

const totalTokens = computed(() => {
	if (!thread.value) return 0;
	return thread.value.totalPromptTokens + thread.value.totalCompletionTokens;
});

const totalCost = computed(() => thread.value?.totalCost ?? 0);
const durationLabel = computed(() => formatDuration(thread.value?.totalDuration ?? 0));

const visibleItemIndexes = computed(() =>
	filteredTimelineItemIndexes(items.value, selectedFilters.value, searchQuery.value, labelForKey),
);

function moveSelectedIndex(direction: 1 | -1) {
	const indexes = visibleItemIndexes.value;
	if (indexes.length === 0) return;

	if (highlightedIndex.value === null || !indexes.includes(highlightedIndex.value)) {
		highlightedIndex.value = direction === 1 ? indexes[0] : indexes[indexes.length - 1];
		return;
	}

	const currentVisibleIndex = indexes.indexOf(highlightedIndex.value);
	const nextVisibleIndex = currentVisibleIndex + direction;
	if (nextVisibleIndex < 0 || nextVisibleIndex >= indexes.length) return;
	highlightedIndex.value = indexes[nextVisibleIndex];
}

function moveSelectedIndexToBoundary(direction: 1 | -1) {
	const indexes = visibleItemIndexes.value;
	if (indexes.length === 0) return;
	highlightedIndex.value = direction === 1 ? indexes[indexes.length - 1] : indexes[0];
}

function selectTimelineItem(index: number | null) {
	selectedIndex.value = index;
	highlightedIndex.value = index;
}

function onKeyDown(event: KeyboardEvent) {
	if (activeElement.value && shouldIgnoreCanvasShortcut(activeElement.value)) return;

	if (event.key === 'Escape') {
		if (selectedIndex.value !== null || highlightedIndex.value !== null) {
			event.preventDefault();
			selectTimelineItem(null);
		}
		return;
	}

	if (event.key === 'ArrowDown') {
		event.preventDefault();
		if (event.metaKey) {
			moveSelectedIndexToBoundary(1);
		} else {
			moveSelectedIndex(1);
		}
	} else if (event.key === 'ArrowUp') {
		event.preventDefault();
		if (event.metaKey) {
			moveSelectedIndexToBoundary(-1);
		} else {
			moveSelectedIndex(-1);
		}
	}
}

useEventListener(document, 'keydown', onKeyDown);

function onKeyUp(event: KeyboardEvent) {
	if (activeElement.value && shouldIgnoreCanvasShortcut(activeElement.value)) return;
	if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
	if (highlightedIndex.value === selectedIndex.value) return;
	event.preventDefault();
	selectTimelineItem(highlightedIndex.value);
}

useEventListener(document, 'keyup', onKeyUp);

async function loadThreadDetail() {
	const currentProjectId = projectId.value;
	const currentAgentId = agentId.value;
	const currentThreadId = threadId.value;
	const requestId = ++loadThreadDetailRequestId;

	thread.value = null;
	executions.value = [];
	selectedFilters.value = new Set();
	searchQuery.value = '';
	selectTimelineItem(null);
	loading.value = true;

	void sessionsStore.fetchThreads(currentProjectId, currentAgentId);

	try {
		const result = await sessionsStore.getThreadDetail(
			currentProjectId,
			currentThreadId,
			currentAgentId,
		);
		if (requestId !== loadThreadDetailRequestId) return;
		thread.value = result.thread;
		executions.value = result.executions;
	} catch (error) {
		if (requestId !== loadThreadDetailRequestId) return;
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	} finally {
		if (requestId === loadThreadDetailRequestId) {
			loading.value = false;
		}
	}
}

watch([projectId, agentId, threadId], loadThreadDetail, { immediate: true });

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
			@breadcrumb-select="onBreadcrumbSelect"
			@session-select="onSessionSelect"
			@close="closeTimeline"
		/>

		<div v-if="!loading" :class="$style.subHeader">
			<div :class="$style.search">
				<N8nInput
					size="medium"
					v-model="searchQuery"
					:placeholder="i18n.baseText('agentSessions.timeline.searchPlaceholder')"
					clearable
				>
					<template #prefix>
						<N8nIcon icon="search" :size="12" />
					</template>
				</N8nInput>
			</div>
			<SessionEventFilter
				:available="filterOptions"
				:selected="selectedFilters"
				@update="(next) => (selectedFilters = next)"
			/>
		</div>

		<div v-if="!loading && items.length > 0" :class="$style.chartRow">
			<SessionTimelineChart
				:items="items"
				:idle-ranges="idleRanges"
				:session-start="bounds.start"
				:session-end="bounds.end"
				:visible-kinds="selectedFilters"
				:selected-index="highlightedIndex"
				@select="selectTimelineItem"
			/>
		</div>

		<div :class="$style.panels">
			<div :class="$style.tablePanel">
				<div v-if="loading" :class="$style.loading">Loading...</div>
				<SessionTimelineTable
					v-else
					:items="items"
					:idle-ranges="idleRanges"
					:selected-index="highlightedIndex"
					:visible-kinds="selectedFilters"
					:search-query="searchQuery"
					@select="selectTimelineItem"
				/>
			</div>
			<Transition name="session-detail-panel">
				<div v-if="selectedItem" :class="$style.detailPanel">
					<SessionDetailPanel :item="selectedItem" @close="selectTimelineItem(null)" />
				</div>
			</Transition>
		</div>
	</div>
</template>

<style module lang="scss">
:global(body) {
	--color--session-timeline-block-bg-alpha: 75%;
}
:global(body[data-theme='dark']) {
	--color--session-timeline-block-bg-alpha: 45%;
}
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) {
		--color--session-timeline-block-bg-alpha: 45%;
	}
}

.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}
.subHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
}
.search {
	flex: 1;
	min-width: 0;
}
.chartRow {
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--border);
	flex-shrink: 0;
	background-color: var(--background--surface);
}
.panels {
	display: flex;
	flex: 1;
	min-height: 0;
}
.tablePanel {
	flex: 6;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	height: 100%;
}
.detailPanel {
	flex: 0 0 40%;
	min-width: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	border-left: var(--border);
	background-color: var(--background--surface);
}

:global(.session-detail-panel-enter-active),
:global(.session-detail-panel-leave-active) {
	transition:
		flex-basis var(--duration--snappy) var(--easing--ease-out),
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);
	overflow: hidden;
}
:global(.session-detail-panel-enter-from),
:global(.session-detail-panel-leave-to) {
	flex-basis: 0;
	opacity: 0;
	transform: translateX(var(--spacing--sm));
	border-left-color: transparent;
}
:global(.session-detail-panel-enter-to),
:global(.session-detail-panel-leave-from) {
	flex-basis: 40%;
	opacity: 1;
	transform: translateX(0);
}
@media (prefers-reduced-motion: reduce) {
	:global(.session-detail-panel-enter-active),
	:global(.session-detail-panel-leave-active) {
		transition: none;
	}
}
.loading {
	padding: var(--spacing--sm);
	color: var(--text-color--subtler);
}
</style>
