<script lang="ts" setup>
import { truncate } from '@n8n/utils';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import {
	AGENT_BUILDER_VIEW,
	CONTINUE_SESSION_ID_PARAM,
	AGENT_SESSION_DETAIL_VIEW,
} from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import type {
	ExecutionThread,
	ThreadExecution,
} from '@/features/agents/composables/useAgentThreadsApi';
import SessionTimelineChart from '@/features/agents/components/SessionTimelineChart.vue';
import SessionEventFilter from '@/features/agents/components/SessionEventFilter.vue';
import SessionTimelineTable from '@/features/agents/components/SessionTimelineTable.vue';
import SessionDetailPanel from '@/features/agents/components/SessionDetailPanel.vue';
import {
	flattenExecutionsToTimelineItems,
	computeIdleRanges,
	sessionBounds,
	itemFilterKey,
	kindColorToken,
} from '@/features/agents/session-timeline.utils';
import type { FilterOption, TimelineItem } from '@/features/agents/session-timeline.types';
import { useI18n } from '@n8n/i18n';
import { N8nBreadcrumbs, N8nButton, N8nDropdownMenu, N8nIcon, N8nInput } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();
const projectsStore = useProjectsStore();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

const thread = ref<ExecutionThread | null>(null);
const executions = ref<ThreadExecution[]>([]);
const loading = ref(true);
const selectedIndex = ref<number | null>(null);
const selectedFilters = ref<Set<string>>(new Set());
const searchQuery = ref('');

const items = computed<TimelineItem[]>(() => flattenExecutionsToTimelineItems(executions.value));
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
		case 'working-memory':
			return i18n.baseText('agentSessions.timeline.memory');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.suspension');
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
		if (!colorByKey.has(key)) colorByKey.set(key, kindColorToken(item.kind));
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
	const source = first.metadata.find((m) => m.key === 'source')?.value;
	return source ?? 'chat';
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

onMounted(async () => {
	try {
		void sessionsStore.fetchThreads(projectId.value, agentId.value);
		const result = await sessionsStore.getThreadDetail(
			projectId.value,
			threadId.value,
			agentId.value,
		);
		thread.value = result.thread;
		executions.value = result.executions;
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	} finally {
		loading.value = false;
	}
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

function continueChat() {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: { [CONTINUE_SESSION_ID_PARAM]: threadId.value },
	});
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
		<div :class="$style.topBar">
			<div :class="$style.topBarLeft">
				<N8nBreadcrumbs :items="breadcrumbItems" theme="medium" @item-selected="onBreadcrumbSelect">
					<template #append>
						<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
						<N8nDropdownMenu
							:items="sessionOptions"
							placement="bottom-start"
							:extra-popper-class="$style.sessionDropdownMenu"
							data-testid="session-header-switcher"
							@select="onSessionSelect"
						>
							<template #trigger>
								<N8nButton
									variant="ghost"
									size="small"
									:class="$style.switcherButton"
									:aria-label="i18n.baseText('agentSessions.sessionName')"
								>
									<span :class="$style.switcherLabel">{{ sessionTitle }}</span>
									<N8nIcon icon="chevron-down" :size="14" />
								</N8nButton>
							</template>
							<template #item-label="{ item }">
								<span :class="$style.sessionDropdownName">
									{{ item.label }}
								</span>
							</template>
							<template #item-trailing="{ item }">
								<span v-if="item.data?.date" :class="$style.sessionDropdownDate">
									{{ item.data.date }}
								</span>
							</template>
						</N8nDropdownMenu>
					</template>
				</N8nBreadcrumbs>
			</div>
			<div v-if="thread" :class="$style.topBarRight">
				<span v-if="triggerSource" :class="$style.metricItem">
					<N8nIcon :icon="triggerIcon" :size="12" />
					<span>{{ triggerLabel }}</span>
				</span>
				<span :class="$style.sep">·</span>
				<span :class="$style.metricItem">
					<N8nIcon icon="circle-dollar-sign" :size="12" />
					<span>
						{{ (thread.totalPromptTokens + thread.totalCompletionTokens).toLocaleString() }}t (${{
							thread.totalCost.toFixed(4)
						}})
					</span>
				</span>
				<span :class="$style.sep">·</span>
				<span :class="$style.metricItem">
					<N8nIcon icon="clock" :size="12" />
					<span>{{ formatDuration(thread.totalDuration) }}</span>
				</span>
				<button
					v-if="triggerSource === 'chat'"
					:class="$style.continueButton"
					@click="continueChat"
				>
					<N8nIcon icon="message-square" :size="12" />
					{{ i18n.baseText('agentSessions.timeline.continueChat') }}
				</button>
			</div>
		</div>

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
				:selected-index="selectedIndex"
				@select="(idx) => (selectedIndex = idx)"
			/>
		</div>

		<div :class="$style.panels">
			<div :class="$style.tablePanel">
				<div v-if="loading" :class="$style.loading">Loading...</div>
				<SessionTimelineTable
					v-else
					:items="items"
					:idle-ranges="idleRanges"
					:selected-index="selectedIndex"
					:visible-kinds="selectedFilters"
					:search-query="searchQuery"
					@select="(idx) => (selectedIndex = idx)"
				/>
			</div>
			<div v-if="selectedItem" :class="$style.detailPanel">
				<SessionDetailPanel :item="selectedItem" @close="selectedIndex = null" />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
/*
 * Theme-aware colour intensity variables for the session timeline. Defined on
 * `body` (rather than `.view`) so that content teleported out of the component
 * subtree — e.g. the chart's `N8nTooltip` popovers — picks them up too.
 *
 * Light mode: high alpha so kind colours read as solid pills/blocks.
 * Dark mode: lower alpha so the colours sit naturally on the dark surface.
 */
:global(body) {
	--color--session-timeline-pill-bg-alpha: 70%;
	--color--session-timeline-block-bg-alpha: 75%;
	--color--session-timeline-row-border-alpha: 70%;
	--color--session-timeline-pill-text: white;
}
:global(body[data-theme='dark']) {
	--color--session-timeline-pill-bg-alpha: 40%;
	--color--session-timeline-block-bg-alpha: 45%;
	--color--session-timeline-row-border-alpha: 45%;
	--color--session-timeline-pill-text: white;
}
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) {
		--color--session-timeline-pill-bg-alpha: 40%;
		--color--session-timeline-block-bg-alpha: 45%;
		--color--session-timeline-row-border-alpha: 45%;
		--color--session-timeline-pill-text: white;
	}
}

.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}
.topBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}
.topBarLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
	margin-left: auto;
}
.sep {
	color: var(--text-color--subtler);
}
.metricItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}
.crumbSeparator {
	color: var(--border-color);
	margin: 0 var(--spacing--4xs);
	user-select: none;
}
.switcherButton {
	font-size: var(--font-size--sm);
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--5xs);
}
.switcherLabel {
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.sessionDropdownMenu {
	min-width: 360px;
}
:global(.session-dropdown-item-active),
:global(.session-dropdown-item-active:hover),
:global(.session-dropdown-item-active:focus),
:global(.session-dropdown-item-active[data-highlighted]) {
	background-color: var(--background--active);
}
.sessionDropdownName {
	display: block;
	max-width: 60%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.sessionDropdownDate {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	text-align: right;
	white-space: nowrap;
	margin-left: auto;
}
.sessionTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--text-color);
}
.continueButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: none;
	border: var(--border);
	border-radius: var(--radius);
	color: var(--background--brand);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	&:hover {
		background-color: var(--background--hover);
	}
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
	padding: var(--spacing--sm) 0;
}
.detailPanel {
	flex: 4;
	overflow-y: auto;
	/* Border on the panel boundary when present; if the panel is hidden
	   (no selection) the table fills the full width without any divider. */
	border-left: var(--border);
}
.loading {
	padding: var(--spacing--sm);
	color: var(--text-color--subtler);
}
</style>
