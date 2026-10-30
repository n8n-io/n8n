<script lang="ts" setup>
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { useAgentMonitoringStore } from '@/features/agents/agentMonitoring.store';
import { onlineConfidence, onlineScore } from '@/features/agents/onlineChecks.utils';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import {
	useAgentTelemetry,
	type AgentSessionFilterName,
} from '@/features/agents/composables/useAgentTelemetry';
import type {
	AgentExecutionThread,
	AgentSessionFilters,
	AgentSessionStatus,
} from '@/features/agents/composables/useAgentThreadsApi';
import AgentSessionsFilter from '@/features/agents/components/AgentSessionsFilter.vue';
import AgentOnlineCheckDetails from '@/features/agents/components/AgentOnlineCheckDetails.vue';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
	N8nActionDropdown,
	N8nButton,
	N8nCheckbox,
	N8nBadge,
	N8nTableBase,
	N8nText,
} from '@n8n/design-system';
import type { ActionDropdownItem, IconName } from '@n8n/design-system';
import { ElSkeletonItem } from 'element-plus';

type TraceTarget = { agentId: string; threadId: string };
type OriginPresentation = { icon: IconName; label: string };

const sessionFilterFields: Array<[keyof AgentSessionFilters, AgentSessionFilterName]> = [
	['status', 'status'],
	['origin', 'origin'],
	['startDate', 'start_date'],
	['endDate', 'end_date'],
];

const emit = defineEmits<{ 'details-open': [open: boolean] }>();

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
const monitoringStore = useAgentMonitoringStore();
const agentTelemetry = useAgentTelemetry();
let disposed = false;
let managesStoreLifecycle = false;

const projectId = computed(() => props.projectId ?? (route.params.projectId as string));
const agentId = computed(() => props.agentId ?? (route.params.agentId as string));
const hasActiveFilters = computed(() => {
	const { status, origin, startDate, endDate } = sessionsStore.filters;
	return status !== 'all' || origin !== 'all' || Boolean(startDate) || Boolean(endDate);
});

const monitoring = computed(() =>
	agentId.value ? monitoringStore.byAgent[agentId.value] : undefined,
);
const monitoringOn = computed(() => Boolean(monitoring.value?.rubric?.approvedAt));
const columnCount = computed(() => (monitoringOn.value ? 6 : 5));
/** The session whose checks show in the details sidebar. */
const checksFor = ref<AgentExecutionThread | null>(null);
watch(
	() => checksFor.value !== null,
	(open) => emit('details-open', open),
);
const checksCase = computed(() => {
	const thread = checksFor.value;
	const result = thread ? monitoring.value?.results[thread.id] : undefined;
	if (!thread || !result) return null;
	return {
		id: result.caseId,
		title: threadTitleOf(thread),
		threadId: thread.id,
		createdAt: result.checkedAt,
		latestResult: result,
		recentResults: [],
	};
});

type ConfidenceCell = {
	kind: 'scored' | 'checking' | 'notChecked' | 'pending';
	level?: 'high' | 'medium' | 'low';
	passed?: number;
	total?: number;
};
/** Confidence that a session met its checks. A failed run has no answer to check. */
function confidenceOf(thread: AgentExecutionThread): ConfidenceCell {
	const result = monitoring.value?.results[thread.id];
	if (result) {
		const score = onlineScore(result);
		return { kind: 'scored', level: onlineConfidence(score), ...score };
	}
	if (thread.status === 'error' || thread.status === 'cancelled') return { kind: 'notChecked' };
	if (monitoring.value?.checking.includes(thread.id)) return { kind: 'checking' };
	return { kind: 'pending' };
}

// Monitoring checks finished sessions that have no result yet, so new runs get checked over time.
watch(
	agentId,
	async (id) => {
		if (!id || !projectId.value) return;
		await monitoringStore.load(projectId.value, id);
		void monitoringStore.checkUnchecked(projectId.value, id);
	},
	{ immediate: true },
);
// A run that finishes while this tab is open gets checked too.
watch(
	() =>
		sessionsStore.threads
			.filter((thread) => thread.status === 'succeeded' && !monitoring.value?.results[thread.id])
			.map((thread) => thread.id)
			.join(),
	(unchecked) => {
		if (!unchecked || !monitoringOn.value || !projectId.value || !agentId.value) return;
		void monitoringStore.checkUnchecked(projectId.value, agentId.value);
	},
);

function onVisibilityChange() {
	// Refresh as soon as the user returns to the tab — auto-refresh is
	// throttled while the document is hidden, so a silent merge-refresh on
	// return closes the gap before the next interval tick without flashing
	// the load-more button or dropping paginated pages.
	if (document.visibilityState !== 'visible' || !sessionsStore.autoRefresh) return;
	if (!projectId.value || !agentId.value) return;
	void sessionsStore.refreshThreads(projectId.value, agentId.value);
}

onMounted(async () => {
	if (!props.manageStoreLifecycle) return;
	managesStoreLifecycle = true;
	document.addEventListener('visibilitychange', onVisibilityChange);

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
	if (checksFor.value) emit('details-open', false);
	if (!managesStoreLifecycle) return;

	document.removeEventListener('visibilitychange', onVisibilityChange);
	sessionsStore.stopAutoRefresh();
});

function formatDate(fullDate: string) {
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const seconds = ms / 1000;
	return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}

function statusColor(status: AgentSessionStatus): 'success' | 'danger' | 'warning' | 'text-base' {
	if (status === 'succeeded') return 'success';
	if (status === 'error') return 'danger';
	if (status === 'running') return 'text-base';
	return 'warning';
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

function originPresentation(thread: AgentExecutionThread): OriginPresentation {
	const rawSource = thread.source?.trim();
	const source = rawSource ? rawSource.toLowerCase() : undefined;

	if (thread.parentThreadId || source === 'subagent' || source === 'sub-agent') {
		return { icon: 'bot', label: i18n.baseText('agentSessions.origin.subAgent') };
	}
	if (thread.taskId || source === 'task') {
		return { icon: 'clock', label: i18n.baseText('agentSessions.origin.schedule') };
	}

	switch (source) {
		case 'instance-ai':
			return {
				icon: 'flask-conical',
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
			// The generic capitalize-first-letter above would produce "Whatsapp",
			// misspelling the brand name — WhatsApp has an internal capital.
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

function onViewTrace(target: TraceTarget) {
	const routeTarget = {
		name: AGENT_SESSION_DETAIL_VIEW,
		params: {
			projectId: projectId.value,
			agentId: target.agentId,
			threadId: target.threadId,
		},
	};
	void router.push(routeTarget);
}

async function onAction(actionId: string, thread: AgentExecutionThread) {
	if (actionId === 'goToParentRun') {
		if (!thread.parentAgentId || !thread.parentThreadId) return;
		onViewTrace({
			agentId: thread.parentAgentId,
			threadId: thread.parentThreadId,
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
		<N8nText
			v-if="monitoringOn"
			size="small"
			color="text-base"
			data-testid="agent-sessions-confidence-note"
			>{{ i18n.baseText('agents.monitoring.sessions.note') }}</N8nText
		>
		<div :class="$style.tableContainer">
			<N8nTableBase :class="$style.sessionsTable">
				<tbody>
					<tr
						v-for="thread in sessionsStore.threads"
						:key="thread.id"
						:class="$style.clickableRow"
						:data-status="thread.status"
						data-test-id="agent-session-list-item"
						@click="onViewTrace({ agentId, threadId: thread.id })"
					>
						<td :class="$style.titleCell">
							<button type="button" :class="$style.sessionOpen" data-test-id="agent-session-open">
								<span :class="$style.sessionTitleRow">
									<span :class="$style.sessionTitle" data-test-id="agent-session-title">
										{{ threadTitleOf(thread) }}
									</span>
									<span v-if="thread.status" :class="$style.statusRow">
										<N8nText
											:color="statusColor(thread.status)"
											size="small"
											data-testid="agent-session-status-indicator"
										>
											{{ statusLabel(thread.status) }}
										</N8nText>
										<N8nText
											v-if="thread.status !== 'running'"
											color="text-base"
											size="small"
											data-testid="agent-session-status-duration"
										>
											{{
												i18n.baseText('executionDetails.runningTimeFinished', {
													interpolate: { time: formatDuration(thread.totalDuration) },
												})
											}}
										</N8nText>
									</span>
								</span>
							</button>
						</td>
						<td :class="$style.originCell" data-test-id="agent-session-origin">
							<N8nBadge
								:leading-icon="originPresentation(thread).icon"
								data-test-id="agent-session-origin-pill"
							>
								{{ originPresentation(thread).label }}
							</N8nBadge>
						</td>
						<td
							v-if="monitoringOn"
							:class="$style.confidenceCell"
							data-testid="agent-session-confidence"
							@click.stop
						>
							<button
								v-if="confidenceOf(thread).kind === 'scored'"
								type="button"
								:class="[$style.confidence, $style[`confidence-${confidenceOf(thread).level}`]]"
								:aria-pressed="checksFor?.id === thread.id"
								:aria-label="i18n.baseText('agents.monitoring.sessionChecks.toggle')"
								data-testid="agent-session-confidence-toggle"
								@click="checksFor = thread"
							>
								<span :class="$style.confidenceDot" aria-hidden="true" /><b>{{
									i18n.baseText(`agents.monitoring.confidence.${confidenceOf(thread).level}`)
								}}</b
								><N8nText size="small" color="text-base">{{
									i18n.baseText('agents.monitoring.confidence.checks', {
										interpolate: {
											passed: String(confidenceOf(thread).passed),
											total: String(confidenceOf(thread).total),
										},
									})
								}}</N8nText>
							</button>
							<N8nText v-else size="small" color="text-light">{{
								i18n.baseText(`agents.monitoring.confidence.${confidenceOf(thread).kind}`)
							}}</N8nText>
						</td>
						<td :class="$style.dateCell" data-test-id="agent-session-updated-at">
							{{ formatDate(thread.updatedAt) }}
						</td>
						<td :class="$style.tokenCell" data-test-id="agent-session-token-usage">
							{{ (thread.totalPromptTokens + thread.totalCompletionTokens).toLocaleString() }}t
						</td>
						<td :class="$style.actionCell" @click.stop>
							<div :class="$style.actionGroup">
								<N8nActionDropdown
									:items="rowActions(thread)"
									activator-icon="ellipsis"
									data-test-id="agent-session-actions"
									@select="onAction($event, thread)"
								/>
							</div>
						</td>
					</tr>
					<template v-if="sessionsStore.loading && !sessionsStore.threads.length">
						<tr v-for="item in 5" :key="item" :class="$style.skeletonRow">
							<td v-for="col in columnCount" :key="col">
								<ElSkeletonItem />
							</td>
						</tr>
					</template>
					<tr
						v-if="!sessionsStore.loading && !sessionsStore.threads.length"
						:class="$style.lastRow"
					>
						<td :colspan="columnCount" style="text-align: center; padding: var(--spacing--lg)">
							<template v-if="!sessionsStore.threads.length && !sessionsStore.loading">
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
							</template>
						</td>
					</tr>
					<tr :class="$style.lastRow" v-if="sessionsStore.nextCursor">
						<td :colspan="columnCount">
							<N8nButton
								icon="refresh-cw"
								variant="ghost"
								:title="i18n.baseText('agentSessions.loadMore')"
								:label="i18n.baseText('agentSessions.loadMore')"
								:loading="sessionsStore.loading"
								data-test-id="agent-sessions-load-more"
								@click="loadMore()"
							/>
						</td>
					</tr>
				</tbody>
			</N8nTableBase>
		</div>
		<AgentOnlineCheckDetails
			v-if="monitoringOn && projectId && agentId"
			:open="checksCase !== null"
			:project-id="projectId"
			:agent-id="agentId"
			:test-case="checksCase"
			:initial-result-id="checksCase?.latestResult.id"
			:initial-assessment="checksCase?.latestResult"
			:rubric="monitoring?.rubric ?? null"
			compact
			@close="checksFor = null"
		/>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.confidenceCell {
	white-space: nowrap;
}
.confidence {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: 0;
	border-radius: var(--radius);
	background: transparent;
	font: inherit;
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover {
		background: var(--background--subtle);
	}
	&:focus-visible {
		outline: var(--border-width) solid var(--color--primary);
	}
}
.confidenceDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: currentColor;
}
.confidence-high {
	color: var(--color--success);
}
.confidence-medium {
	color: var(--color--warning);
}
.confidence-low {
	color: var(--color--danger);
}

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

.tableContainer {
	width: 100%;
	min-width: 0;
	container: sessions / inline-size;
	overflow-x: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.sessionsTable {
	width: 100%;
	height: auto;
	border-collapse: separate;
	border-spacing: 0;
	font-size: var(--font-size--sm);
	white-space: nowrap;

	td {
		height: var(--height--3xl);
		padding: 0 var(--spacing--xs);
		border-bottom: 0;
		vertical-align: middle;
	}

	td:first-child {
		padding-left: var(--spacing--sm);
	}

	td:last-child {
		padding-right: var(--spacing--sm);
	}
}

.filters {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.titleCell {
	width: 46%;
	min-width: var(--spacing--3xl);
	max-width: 0;
}

.sessionTitle {
	display: block;
	max-width: 100%;
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionTitleRow {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex: 0 0 auto;
}

.sessionOpen {
	@include focus.focus-visible-ring-offset;

	display: block;
	width: 100%;
	padding: 0;
	border: 0;
	color: inherit;
	background: transparent;
	font: inherit;
	text-align: left;
	appearance: none;
	cursor: pointer;
}

.originCell,
.dateCell,
.tokenCell {
	width: 1%;
	white-space: nowrap;
}

.originPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	white-space: nowrap;
}

.dateCell,
.tokenCell {
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.actionCell {
	width: 1%;
	min-width: var(--spacing--2xl);
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.actionGroup {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.sessionsTable .clickableRow {
	background-color: var(--execution-card--color--background);
	cursor: pointer;

	td {
		color: var(--text-color--subtler);
	}

	.titleCell {
		border-left: var(--spacing--4xs) var(--border-style)
			var(--execution-card--border-color--unknown);
	}

	.actionCell {
		text-align: right;
	}

	&[data-status='succeeded'] .titleCell {
		border-left-color: var(--execution-card--border-color--success);
	}

	&[data-status='error'] .titleCell {
		border-left-color: var(--execution-card--border-color--error);
	}

	&[data-status='cancelled'] .titleCell,
	&[data-status='interrupted'] .titleCell {
		border-left-color: var(--border-color--warning);
	}

	&:hover {
		background-color: var(--execution-card--color--background--hover);
	}
}

.sessionsTable .skeletonRow {
	background-color: var(--execution-card--color--background);
}

.sessionsTable .lastRow {
	background-color: transparent;

	td {
		height: var(--height--2xl);
		text-align: center;
	}

	td button {
		margin: 0 auto;
	}

	&:hover {
		background-color: transparent;
	}
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

// No token covers the width needed by this five-column table.
@container sessions (max-width: 44rem) {
	.wrapper .sessionsTable table,
	.wrapper .sessionsTable tbody {
		display: block;
		width: 100%;
	}

	.wrapper .sessionsTable .clickableRow {
		display: grid;
		grid-template-areas:
			'title action'
			'origin origin'
			'date token';
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--spacing--3xs) var(--spacing--xs);
		padding: var(--spacing--xs);
		border-left: var(--spacing--4xs) var(--border-style)
			var(--execution-card--border-color--unknown);

		&[data-status='succeeded'] {
			border-left-color: var(--execution-card--border-color--success);
		}

		&[data-status='error'] {
			border-left-color: var(--execution-card--border-color--error);
		}

		&[data-status='cancelled'],
		&[data-status='interrupted'] {
			border-left-color: var(--border-color--warning);
		}

		td {
			display: block;
			width: auto;
			min-width: 0;
			height: auto;
			padding: 0;
		}

		.titleCell {
			grid-area: title;
			max-width: none;
			border-left: 0;
		}

		.originCell {
			grid-area: origin;
			overflow: hidden;
		}

		.dateCell {
			grid-area: date;
		}

		.tokenCell {
			grid-area: token;
			text-align: right;
		}

		.actionCell {
			grid-area: action;
		}
	}

	.wrapper .sessionsTable .skeletonRow,
	.wrapper .sessionsTable .lastRow {
		display: block;

		td {
			display: block;
			width: 100%;
		}
	}

	.wrapper .sessionsTable .skeletonRow td:not(:first-child) {
		display: none;
	}
}
</style>
