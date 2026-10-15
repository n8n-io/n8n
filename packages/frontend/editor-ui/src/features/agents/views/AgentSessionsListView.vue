<script lang="ts" setup>
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useRelativeTimestamp } from '@/features/agents/utils/relative-time';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import { resolveToolNameForDisplay } from '@/features/agents/utils/toolDisplayName';
import type {
	AgentExecutionThread,
	AgentSessionFilters,
	AgentSessionStatus,
} from '@/features/agents/composables/useAgentThreadsApi';
import AgentSessionsFilter from '@/features/agents/components/AgentSessionsFilter.vue';
import { generateWhimsicalLabel } from '@/features/ai/shared/utils/whimsicalLabel';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import {
	N8nActionDropdown,
	N8nButton,
	N8nCheckbox,
	N8nBadge,
	N8nText,
	N8nSpinner,
	N8nIcon,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem, IconColor, IconName } from '@n8n/design-system';

type OriginPresentation = { icon: IconName; label: string };

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

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const message = useMessage();
const sessionsStore = useAgentSessionsStore();
const { onDocumentVisible } = useDocumentVisibility();
let disposed = false;
let managesStoreLifecycle = false;

const projectId = computed(() => props.projectId ?? (route.params.projectId as string));
const agentId = computed(() => props.agentId ?? (route.params.agentId as string));
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

const formatRelativeDate = useRelativeTimestamp();

function formatDateTooltip(thread: AgentExecutionThread): string {
	const { date, time } = convertToDisplayDate(thread.updatedAt);
	const dateLabel = `${date} ${time.slice(0, 5)}`;
	if (!thread.status || thread.status === 'running') return dateLabel;
	return `${dateLabel} • ${formatDuration(thread.totalDuration)}`;
}

function getStatusIcon(status: AgentSessionStatus): IconName {
	switch (status) {
		case 'succeeded':
			return 'circle-check';
		case 'error':
			return 'circle-alert';
		case 'cancelled':
			return 'circle-x';
		case 'interrupted':
			return 'circle-pause';
		default:
			return 'circle';
	}
}

function getStatusIconColor(status: AgentSessionStatus): IconColor {
	switch (status) {
		case 'succeeded':
			return 'success';
		case 'error':
			return 'danger';
		case 'cancelled':
		case 'interrupted':
			return 'text-xlight';
		default:
			return 'text-base';
	}
}

function statusLabel(status: AgentSessionStatus): string {
	switch (status) {
		case 'running':
			return i18n.baseText('agentSessions.status.running');
		case 'succeeded':
			return i18n.baseText('agentSessions.status.succeeded');
		case 'error':
			return i18n.baseText('agentSessions.status.error');
		case 'cancelled':
			return i18n.baseText('agentSessions.status.cancelled');
		case 'interrupted':
			return i18n.baseText('agentSessions.status.interrupted');
	}
}

function rowTitle(thread: AgentExecutionThread): string {
	const activity = thread.status === 'running' ? thread.latestActivity : null;
	if (!activity) return threadTitleOf(thread);

	if (activity.type === 'tool-call') {
		return (
			activity.displayName ||
			resolveToolNameForDisplay(activity.toolName, i18n) ||
			threadTitleOf(thread)
		);
	}

	return activity.type === 'reasoning'
		? i18n.baseText(reasoningLabels.value.get(thread.id) ?? 'ai.thinking.active')
		: i18n.baseText('agentSessions.activity.responding');
}

function originPresentation(thread: AgentExecutionThread): OriginPresentation {
	const rawSource = thread.source?.trim();
	const source = rawSource?.toLowerCase() || undefined;

	if (thread.parentThreadId || source === 'subagent' || source === 'sub-agent') {
		return { icon: 'bot', label: i18n.baseText('agentSessions.origin.subAgent') };
	}
	if (thread.taskId || source === 'task') {
		return { icon: 'clock', label: i18n.baseText('agentSessions.origin.schedule') };
	}

	switch (source) {
		case 'instance-ai':
			return {
				icon: 'n8n-assistant',
				label: i18n.baseText('agentSessions.origin.instanceAi'),
			};
		case 'mcp':
			return { icon: 'flask-conical', label: i18n.baseText('agentSessions.origin.mcp') };
		case 'workflow':
			return { icon: 'workflow', label: i18n.baseText('agentSessions.origin.workflow') };
		case 'n8n_chat_production':
			return { icon: 'message-square', label: i18n.baseText('agentSessions.origin.n8nChat') };
		case 'slack':
		case 'telegram':
		case 'linear':
		case 'discord':
		case 'teams':
			return { icon: source, label: source.charAt(0).toUpperCase() + source.slice(1) };
		case 'whatsapp':
			return { icon: source, label: 'WhatsApp' };
		case 'chat':
		case 'n8n_chat':
		case undefined:
			return { icon: 'flask-conical', label: i18n.baseText('agentSessions.origin.preview') };
		default:
			return {
				icon: 'plug',
				label: rawSource ? rawSource.charAt(0).toUpperCase() + rawSource.slice(1) : '',
			};
	}
}

function rowActions(thread: AgentExecutionThread): Array<ActionDropdownItem<string>> {
	const actions: Array<ActionDropdownItem<string>> = [];

	if (thread.parentThreadId && thread.parentAgentId) {
		actions.push({
			id: 'goToParentRun',
			label: i18n.baseText('agentSessions.goToParentRun'),
			icon: 'arrow-up-right',
		});
	}

	actions.push({
		id: 'delete',
		label: i18n.baseText('generic.delete'),
		icon: 'trash-2',
		divided: actions.length > 0,
	});

	return actions;
}

async function onAction(actionId: string, thread: AgentExecutionThread) {
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

	const confirmed = await message.confirm(
		i18n.baseText('agentSessions.deleteConfirm.message'),
		i18n.baseText('agentSessions.deleteConfirm.headline'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('agentSessions.deleteConfirm.confirmButtonText'),
			cancelButtonText: '',
		},
	);

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
	try {
		await sessionsStore.setFilters(projectId.value, agentId.value, value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	}
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const seconds = ms / 1000;
	return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}

/** Fixed token widths keep the skeleton stable between renders. */
const skeletonTitleWidth = {
	'--n8n--agent-session-list--skeleton-text-width': 'var(--spacing--5xl)',
};
const skeletonMetaWidths = ['var(--spacing--2xl)', 'var(--spacing--xl)', 'var(--spacing--2xl)'].map(
	(width) => ({ '--n8n--agent-session-list--skeleton-text-width': width }),
);
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
			<li
				v-if="sessionsStore.loading && !sessionsStore.threads.length"
				:class="$style.listSkeleton"
			>
				<div :class="$style.listStart">
					<div :class="$style.listIconContainer">
						<span :class="$style.listIconSkeleton"></span>
					</div>
					<span :class="$style.listTextSkeleton" :style="skeletonTitleWidth"></span>
				</div>
				<div :class="$style.listEnd">
					<span
						v-for="(width, index) in skeletonMetaWidths"
						:key="index"
						:class="$style.listTextSkeleton"
						:style="width"
					></span>
					<span :class="$style.listIconSkeleton"></span>
				</div>
			</li>
			<li v-if="!sessionsStore.threads.length && !sessionsStore.loading">
				<div :class="$style.emptyState">
					<span data-test-id="agent-sessions-empty">
						{{
							i18n.baseText(
								hasActiveFilters ? 'agentSessions.emptyWithFilters' : 'agentSessions.empty',
							)
						}}
					</span>
					<span
						v-if="!hasActiveFilters"
						:class="$style.emptyStateDescription"
						data-test-id="agent-sessions-empty-description"
					>
						{{ i18n.baseText('agentSessions.emptyDescription') }}
					</span>
				</div>
			</li>
			<li
				v-for="row in sessionRows"
				v-else
				:key="row.thread.id"
				:class="$style.listRow"
				:data-status="row.thread.status"
				:data-depth="row.depth"
				data-test-id="agent-session-list-item"
			>
				<RouterLink
					:class="$style.sessionLink"
					:to="{
						name: AGENT_SESSION_DETAIL_VIEW,
						params: { projectId, agentId, threadId: row.thread.id },
					}"
				>
					<div :class="$style.listStart">
						<div
							v-if="row.depth > 0"
							:class="$style.rail"
							aria-hidden="true"
							data-test-id="agent-session-rail"
						>
							<svg
								v-for="(continues, level) in row.guides"
								:key="level"
								:class="$style.railCell"
								:data-continues="continues"
								data-test-id="agent-session-rail-guide"
								viewBox="0 0 24 40"
								preserveAspectRatio="none"
							>
								<path v-if="continues" d="M12 0 V40" />
							</svg>
							<svg
								:class="$style.railCell"
								:data-branch="row.isLast ? 'last' : 'middle'"
								data-test-id="agent-session-rail-branch"
								viewBox="0 0 24 40"
								preserveAspectRatio="none"
							>
								<path
									:d="
										row.isLast ? 'M12 0 V14 Q12 20 18 20 H24' : 'M12 0 V40 M12 14 Q12 20 18 20 H24'
									"
								/>
							</svg>
						</div>
						<div :class="$style.listIconContainer">
							<svg
								v-if="row.hasChildren"
								:class="$style.railStub"
								data-test-id="agent-session-rail-stub"
								viewBox="0 0 24 10"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<path d="M12 0 V10" />
							</svg>
							<N8nSpinner
								v-if="row.thread.status === 'running'"
								:aria-label="statusLabel(row.thread.status)"
								size="medium"
								data-testid="agent-session-status-indicator"
							/>
							<N8nIcon
								v-else-if="row.thread.status"
								:icon="getStatusIcon(row.thread.status)"
								:color="getStatusIconColor(row.thread.status)"
								:aria-label="statusLabel(row.thread.status)"
								size="medium"
								data-testid="agent-session-status-indicator"
							/>
						</div>
						<div v-if="row.thread.status === 'running'" :class="$style.activityLabel">
							<Transition
								type="transition"
								:enter-active-class="$style.labelEnterActive"
								:leave-active-class="$style.labelLeaveActive"
								:enter-from-class="$style.labelEnterFrom"
								:leave-to-class="$style.labelLeaveTo"
							>
								<N8nText
									:key="rowTitle(row.thread)"
									step="sm"
									color="text-dark"
									:class="[$style.activityWord, $style.shimmer]"
									bold
								>
									{{ rowTitle(row.thread) }}
								</N8nText>
							</Transition>
						</div>
						<N8nText v-else step="sm" color="text-dark" bold data-test-id="agent-session-title">
							{{ threadTitleOf(row.thread) }}
						</N8nText>
					</div>
					<div v-if="row.thread.status !== 'running'" :class="$style.listEnd">
						<N8nBadge
							:leading-icon="originPresentation(row.thread).icon"
							data-test-id="agent-session-origin-pill"
						>
							{{ originPresentation(row.thread).label }}
						</N8nBadge>
						<N8nTooltip :content="formatDateTooltip(row.thread)" placement="top">
							<N8nText step="sm" bold color="text-light" data-test-id="agent-session-updated-at">
								{{ formatRelativeDate(row.thread.updatedAt) }}
							</N8nText>
						</N8nTooltip>
						<N8nText step="sm" bold color="text-light" data-test-id="agent-session-token-usage">
							{{
								(row.thread.totalPromptTokens + row.thread.totalCompletionTokens).toLocaleString()
							}}t
						</N8nText>
					</div>
				</RouterLink>
				<div v-if="row.thread.status !== 'running'" :class="$style.actionGroup">
					<N8nActionDropdown
						placement="bottom-end"
						:items="rowActions(row.thread)"
						activator-icon="ellipsis"
						data-test-id="agent-session-actions"
						@select="onAction($event, row.thread)"
					/>
				</div>
			</li>
			<li v-if="sessionsStore.nextCursor">
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
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
@use '@n8n/design-system/css/mixins/motion' as motion;

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
	border-radius: var(--radius);
	padding: var(--spacing--5xs);
	outline: var(--border);
	box-shadow: var(--shadow--xs);
}

.listRow {
	/** Gap between the rail, status icon and title. The rail geometry depends on it. */
	--list-start-gap: var(--spacing--2xs);
	/** Rails extend over this border so lines join across rows. */
	--list-row-border-width: 1px;

	display: flex;
	align-items: stretch;
	border: var(--list-row-border-width) solid transparent;
	border-radius: var(--radius);

	&:hover:not(:has(.actionGroup:hover)) {
		background-color: var(--background--hover);
	}

	&:has(.sessionLink:focus) {
		@include focus.focus-ring-with-border;
	}
}

.sessionLink,
.listSkeleton {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-width: 0;
	padding-inline-start: var(--spacing--xs);
	height: var(--height--2xl);
	color: inherit;
	text-decoration: none;
	outline: 0;
}

.listStart,
.listEnd {
	display: flex;
	align-items: center;
	gap: var(--list-start-gap, var(--spacing--2xs));
}

.listStart {
	min-width: 0;
	align-self: stretch;
}

.listEnd {
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--sm);
}

/**
 * Each rail cell is one indent step wide: icon width plus the row gap.
 * Half-gap negative margins put the cell centre line under the parent's status icon.
 */
.rail {
	--rail-cell-width: calc(var(--height--2xs) + var(--list-start-gap));

	display: flex;
	align-self: stretch;
	flex-shrink: 0;
	margin-inline: calc(var(--list-start-gap) / -2);
	margin-block: calc(-1 * var(--list-row-border-width));
}

.railCell,
.railStub {
	fill: none;
	stroke: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	stroke-width: 1px;
	overflow: visible;

	path {
		vector-effect: non-scaling-stroke;
	}
}

.railCell {
	width: var(--rail-cell-width);
	height: 100%;
}

.railStub {
	position: absolute;
	top: 100%;
	left: 0;
	width: 100%;
	height: calc((var(--height--2xl) - var(--height--2xs)) / 2 + var(--list-row-border-width));
}

.listIconContainer {
	position: relative;
	flex-shrink: 0;
	display: grid;
	place-items: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
}

.listTextSkeleton,
.listIconSkeleton {
	border-radius: var(--radius--xs);
	background-color: var(--background--active);
	@include motion.skeleton-pulse;
}

.listIconSkeleton {
	width: var(--height--3xs);
	height: var(--height--3xs);
}

.listTextSkeleton {
	width: var(--n8n--agent-session-list--skeleton-text-width, var(--spacing--md));
	height: var(--height--2xs);
}

.filters {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.actionGroup {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
	padding-inline: var(--spacing--4xs);
	width: var(--height--2xl);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	text-align: center;
}

.emptyStateDescription {
	max-width: 100%;
	color: var(--text-color--subtler);
	white-space: normal;
}

.activityLabel {
	display: grid;
	overflow-y: hidden;
}

.activityWord {
	grid-area: 1 / 1;
}

.labelEnterActive,
.labelLeaveActive {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out),
		filter var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.labelEnterFrom,
.labelLeaveTo {
	opacity: 0;
	filter: blur(var(--spacing--3xs));
}

.labelEnterFrom {
	transform: translateY(var(--spacing--2xs));
}

.labelLeaveTo {
	transform: translateY(calc(-1 * var(--spacing--2xs)));
}

.shimmer {
	--animation--shimmer--background: var(--text-color);
	--animation--shimmer--foreground: var(--text-color--subtler);
	--animation--shimmer--duration: calc(var(--duration--slowest) * 2);
	@include motion.shimmer;
}
</style>
