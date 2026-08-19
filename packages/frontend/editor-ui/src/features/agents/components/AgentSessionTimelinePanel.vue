<script lang="ts" setup>
import type { PushMessage } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import type {
	AgentExecution,
	ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import SessionTimelineChart from '@/features/agents/components/SessionTimelineChart.vue';
import SessionEventFilter from '@/features/agents/components/SessionEventFilter.vue';
import SessionTimelineTable from '@/features/agents/components/SessionTimelineTable.vue';
import SessionDetailPanel from '@/features/agents/components/SessionDetailPanel.vue';
import {
	flattenExecutionsToTimelineItems,
	computeIdleRanges,
	sessionBounds,
	chartBlockColor,
	filteredTimelineItemIndexes,
	isSubAgentTimelineItem,
	itemStatusFilterKey,
} from '@/features/agents/session-timeline.utils';
import { useSubAgentNames } from '@/features/agents/composables/useSubAgentNames';
import { resolveSubAgentName } from '@/features/agents/utils/delegate-tool';
import { shouldIgnoreCanvasShortcut } from '@/features/workflows/canvas/canvas.utils';
import type {
	EventKind,
	FilterOption,
	TimelineItem,
	TimelineStatusFilterKey,
} from '@/features/agents/session-timeline.types';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nInput } from '@n8n/design-system';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useActiveElement, useDocumentVisibility, useEventListener } from '@vueuse/core';

const props = defineProps<{
	projectId: string;
	agentId: string;
	threadId: string;
}>();

// Hands the loaded thread detail up so an enclosing view (the standalone
// session-detail route) can render its own header/metrics without a second
// fetch. Emitted `null` at the start of every load to reset that header.
const emit = defineEmits<{
	loaded: [detail: ThreadDetail | null];
}>();

const i18n = useI18n();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();
const pushStore = usePushConnectionStore();
const activeElement = useActiveElement();
const panel = useTemplateRef<HTMLElement>('panel');
const documentVisibility = useDocumentVisibility();

const projectId = computed(() => props.projectId);

const executions = ref<AgentExecution[]>([]);
const loading = ref(true);
const selectedIndex = ref<number | null>(null);
const highlightedIndex = ref<number | null>(null);
const selectedFilters = ref<Set<string>>(new Set());
const searchQuery = ref('');
let threadDetailRequestId = 0;
let refreshPending = false;
let removePushListener: (() => void) | undefined;
let activeRequest: { identity: string; promise: Promise<void> } | undefined;

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
		case 'execution-error':
			return i18n.baseText('agentSessions.timeline.executionFailed');
		case 'execution-interrupted':
			return i18n.baseText('agentSessions.timeline.executionInterrupted');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.hitlRequest');
		case 'hitl-response':
			return i18n.baseText('agentSessions.timeline.hitlResponse');
		case 'approval-requested':
			return i18n.baseText('agentSessions.timeline.approvalRequested');
		case 'hitl-requested':
			return i18n.baseText('agentSessions.timeline.hitlRequested');
		case 'approved':
			return i18n.baseText('agentSessions.timeline.approved');
		case 'responded':
			return i18n.baseText('agentSessions.timeline.responseReceived');
		case 'declined':
			return i18n.baseText('agentSessions.timeline.declined');
		case 'error':
			return i18n.baseText('agentSessions.timeline.error');
		default:
			return key;
	}
}

const STATUS_FILTER_OPTIONS = [
	{ key: 'approved', badgeTheme: 'success' },
	{ key: 'declined', badgeTheme: 'default' },
	{ key: 'error', badgeTheme: 'danger' },
] satisfies Array<{
	key: TimelineStatusFilterKey;
	badgeTheme: 'default' | 'success' | 'danger';
}>;

const filterOptions = computed<FilterOption[]>(() => {
	const kindCounts = new Map<EventKind, number>();
	const statusCounts = new Map<TimelineStatusFilterKey, number>();
	for (const item of items.value) {
		if (item.kind !== 'execution-error') {
			kindCounts.set(item.kind, (kindCounts.get(item.kind) ?? 0) + 1);
		}
		const statusKey = itemStatusFilterKey(item);
		if (statusKey) {
			statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1);
		}
	}
	return [
		...Array.from(kindCounts.entries()).map(
			([key, count]): FilterOption => ({
				key,
				label: labelForKey(key),
				presentation: 'swatch',
				color: chartBlockColor(key),
				count,
			}),
		),
		...STATUS_FILTER_OPTIONS.flatMap(({ key, badgeTheme }): FilterOption[] => {
			const count = statusCounts.get(key);
			if (!count) return [];
			return [
				{
					key,
					label: labelForKey(key),
					presentation: 'badge',
					badgeTheme,
					count,
				},
			];
		}),
	];
});

const selectedItem = computed<TimelineItem | null>(() =>
	selectedIndex.value !== null ? (items.value[selectedIndex.value] ?? null) : null,
);

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

function shouldHandleShortcut() {
	const element = activeElement.value;
	if (!(element instanceof Element)) return false;

	return panel.value?.contains(element) === true && !shouldIgnoreCanvasShortcut(element);
}

function timelineItemKey(item: TimelineItem): string {
	return `${item.executionId}:${item.kind}:${item.toolCallId ?? item.timestamp}`;
}

function onKeyDown(event: KeyboardEvent) {
	if (!shouldHandleShortcut()) return;

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
	if (!shouldHandleShortcut()) return;
	if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
	if (highlightedIndex.value === selectedIndex.value) return;
	event.preventDefault();
	selectTimelineItem(highlightedIndex.value);
}

useEventListener(document, 'keyup', onKeyUp);

function loadThreadDetail() {
	executions.value = [];
	selectedFilters.value = new Set();
	searchQuery.value = '';
	selectTimelineItem(null);
	loading.value = true;
	emit('loaded', null);
	refreshPending = false;
	startThreadDetailRequest(true);
}

function threadIdentity(): string {
	return `${props.projectId}:${props.agentId}:${props.threadId}`;
}

async function fetchThreadDetail(initial: boolean) {
	const currentProjectId = props.projectId;
	const currentAgentId = props.agentId;
	const currentThreadId = props.threadId;
	const identity = threadIdentity();
	const requestId = ++threadDetailRequestId;

	try {
		const result = await sessionsStore.getThreadDetail(
			currentProjectId,
			currentAgentId,
			currentThreadId,
		);
		if (requestId !== threadDetailRequestId || identity !== threadIdentity()) {
			return;
		}
		const selectedKey = !initial && selectedItem.value ? timelineItemKey(selectedItem.value) : null;
		executions.value = result.executions;
		if (selectedKey) {
			const nextIndex = items.value.findIndex((item) => timelineItemKey(item) === selectedKey);
			selectTimelineItem(nextIndex >= 0 ? nextIndex : null);
		}
		emit('loaded', result);
	} catch (error) {
		if (requestId !== threadDetailRequestId) return;
		if (initial) toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	} finally {
		if (initial && requestId === threadDetailRequestId) loading.value = false;
	}
}

function startThreadDetailRequest(initial: boolean) {
	const identity = threadIdentity();
	const request = { identity, promise: fetchThreadDetail(initial) };
	activeRequest = request;
	void request.promise.finally(() => {
		if (activeRequest !== request) return;
		activeRequest = undefined;
		if (refreshPending && identity === threadIdentity()) {
			refreshPending = false;
			refreshThreadDetail();
		}
	});
}

function refreshThreadDetail() {
	if (activeRequest?.identity === threadIdentity()) {
		refreshPending = true;
		return;
	}
	startThreadDetailRequest(false);
}

function onPushMessage(event: PushMessage) {
	if (
		event.type === 'agentExecutionUpdated' &&
		event.data.projectId === props.projectId &&
		event.data.agentId === props.agentId &&
		event.data.threadId === props.threadId
	) {
		refreshThreadDetail();
	}
}

watch(documentVisibility, (visibility) => {
	if (visibility === 'visible') refreshThreadDetail();
});

watch(
	() => pushStore.isConnected,
	(isConnected, wasConnected) => {
		if (isConnected && !wasConnected) refreshThreadDetail();
	},
);

onMounted(() => {
	pushStore.pushConnect();
	removePushListener = pushStore.addEventListener(onPushMessage);
});

onBeforeUnmount(() => {
	threadDetailRequestId++;
	refreshPending = false;
	removePushListener?.();
	pushStore.pushDisconnect();
});

watch([() => props.projectId, () => props.agentId, () => props.threadId], loadThreadDetail, {
	immediate: true,
});
</script>

<template>
	<div ref="panel" :class="$style.panel">
		<div v-if="!loading" :class="$style.subHeader">
			<div :class="$style.search">
				<N8nInput
					v-model="searchQuery"
					size="medium"
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
				<div v-if="loading" :class="$style.loading">
					{{ i18n.baseText('generic.loadingEllipsis') }}
				</div>
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
					<SessionDetailPanel
						:item="selectedItem"
						:project-id="props.projectId"
						:agent-id="props.agentId"
						@close="selectTimelineItem(null)"
					/>
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

.panel {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
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
