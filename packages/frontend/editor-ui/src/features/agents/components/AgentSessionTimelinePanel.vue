<script lang="ts" setup>
import type { PushMessage } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import type {
	AgentExecution,
	ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import SessionEventFilter from '@/features/agents/components/SessionEventFilter.vue';
import SessionTimelineTable from '@/features/agents/components/SessionTimelineTable.vue';
import {
	flattenExecutionsToTimelineItems,
	computeIdleRanges,
	chartBlockColor,
	isSubAgentTimelineItem,
	itemStatusFilterKey,
} from '@/features/agents/session-timeline.utils';
import { useSubAgentNames } from '@/features/agents/composables/useSubAgentNames';
import { resolveSubAgentName } from '@/features/agents/utils/delegate-tool';
import { backgroundJobTimelineLabelKey } from '@/features/agents/utils/background-job-labels';
import type {
	EventKind,
	FilterOption,
	TimelineItem,
	TimelineStatusFilterKey,
} from '@/features/agents/session-timeline.types';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nInput, type BadgeVariant } from '@n8n/design-system';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';
import { useKeybindings } from '@/app/composables/useKeybindings';

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

function labelForKey(key: string): string {
	const backgroundJobKey = backgroundJobTimelineLabelKey(key);
	if (backgroundJobKey) return i18n.baseText(backgroundJobKey);

	switch (key) {
		case 'user':
			return i18n.baseText('agentSessions.timeline.user');
		case 'agent':
			return i18n.baseText('agentSessions.timeline.agent');
		case 'skill':
			return i18n.baseText('agentSessions.timeline.skill');
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
		case 'wait-requested':
			return i18n.baseText('agentSessions.timeline.waitRequested');
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
	{ key: 'declined', badgeTheme: 'outline' },
	{ key: 'error', badgeTheme: 'danger' },
] satisfies Array<{
	key: TimelineStatusFilterKey;
	badgeTheme: Extract<BadgeVariant, 'outline' | 'success' | 'danger'>;
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

function selectTimelineItem(index: number | null) {
	selectedIndex.value = index;
	highlightedIndex.value = index;
}

function timelineItemKey(item: TimelineItem): string {
	return `${item.executionId}:${item.kind}:${item.toolCallId ?? item.timestamp}`;
}

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

const searchInput = useTemplateRef<HTMLInputElement | null>('searchInput');

useKeybindings({
	'/': {
		disabled: () => searchInput.value?.disabled ?? false,
		run: () => {
			if (searchInput.value) searchInput.value.focus();
		},
	},
});
</script>

<template>
	<div :class="$style.panel">
		<div v-if="!loading" :class="$style.subHeader">
			<N8nInput
				ref="searchInput"
				v-model="searchQuery"
				size="large"
				:class="$style.searchInput"
				:placeholder="i18n.baseText('agentSessions.timeline.searchPlaceholder')"
				clearable
			>
				<template #prefix>
					<N8nIcon icon="search" :size="12" />
				</template>
			</N8nInput>

			<SessionEventFilter
				:available="filterOptions"
				:selected="selectedFilters"
				@update="(next) => (selectedFilters = next)"
			/>
		</div>

		<div :class="$style.section">
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
	--n8n-session-panel--container-width: 75ch;
}
.subHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--md);
	width: 100%;
	flex-shrink: 0;
	max-width: var(--n8n-session-panel--container-width, none);
	margin: 0 auto;
}
.search {
	flex: 1;
	min-width: 0;
}
.searchInput {
	box-shadow: var(--shadow--xs);
}

.section {
	display: flex;
	flex: 1;
	min-height: 0;
	background-color: var(--background--subtle);
}
.loading {
	padding: var(--spacing--sm);
	color: var(--text-color--subtler);
}
</style>
