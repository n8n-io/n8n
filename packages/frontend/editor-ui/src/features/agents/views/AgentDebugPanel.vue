<script lang="ts" setup>
import {
	type AgentDebugRun,
	type AgentDebugSignal,
	type AgentReviewCase,
	type AgentReviewRejectionReason,
	type AgentReviewStatus,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nIcon,
	N8nRadioButtons,
	N8nTableBase,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils';
import { ElSkeletonItem } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useToast } from '@/app/composables/useToast';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

import { useAgentDebugStore } from '../agentDebug.store';
import { AGENT_DEBUG_RUN_DETAIL_VIEW } from '../constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const debugStore = useAgentDebugStore();

const projectId = computed(() => String(route.params.projectId ?? ''));
const agentId = computed(() => String(route.params.agentId ?? ''));

const summary = computed(() => debugStore.insights);

type DebugRunFilter =
	| 'all'
	| 'reviewed'
	| 'not_reviewed'
	| 'failed'
	| 'signals'
	| 'tool_failure'
	| 'slow_run';

const selectedFilter = ref<DebugRunFilter>('all');

function runHasSignal(run: AgentDebugRun, type: AgentDebugSignal['type']): boolean {
	return run.signals.some((signal) => signal.type === type);
}

function runMatchesFilter(run: AgentDebugRun, filter: DebugRunFilter): boolean {
	if (filter === 'all') return true;
	if (filter === 'reviewed') return run.review !== null;
	if (filter === 'not_reviewed') return run.review === null;
	if (filter === 'failed') return run.status === 'error';
	if (filter === 'signals') return run.signals.length > 0;
	if (filter === 'tool_failure') return runHasSignal(run, 'tool_failure');
	return runHasSignal(run, 'slow_run');
}

function countForFilter(filter: DebugRunFilter): number {
	return conversationRuns.value.filter((run) => runMatchesFilter(run, filter)).length;
}

function filterLabel(filter: DebugRunFilter): string {
	return `${i18n.baseText(`agentDebug.filter.${filter}`)} (${countForFilter(filter)})`;
}

const filterOptions = computed<Array<{ label: string; value: DebugRunFilter }>>(() => [
	{ label: filterLabel('all'), value: 'all' },
	{ label: filterLabel('reviewed'), value: 'reviewed' },
	{ label: filterLabel('not_reviewed'), value: 'not_reviewed' },
	{ label: filterLabel('failed'), value: 'failed' },
	{ label: filterLabel('signals'), value: 'signals' },
	{ label: filterLabel('tool_failure'), value: 'tool_failure' },
	{ label: filterLabel('slow_run'), value: 'slow_run' },
]);

const conversationRuns = computed(() => {
	const seenThreadIds = new Set<string>();
	return debugStore.runs.filter((run) => {
		if (seenThreadIds.has(run.threadId)) return false;
		seenThreadIds.add(run.threadId);
		return true;
	});
});

const filteredRuns = computed(() =>
	conversationRuns.value.filter((run) => runMatchesFilter(run, selectedFilter.value)),
);

function formatDate(fullDate: string) {
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost: number | null): string {
	if (!cost) return '-';
	return `$${cost.toFixed(4)}`;
}

function formatNumber(value: number): string {
	return value.toLocaleString();
}

function sessionLabel(run: AgentDebugRun): string {
	return (
		run.sessionTitle?.trim() ||
		i18n.baseText('agentDebug.sessionFallback', {
			interpolate: { number: String(run.sessionNumber) },
		})
	);
}

function badgeTheme(
	signal: Pick<AgentDebugSignal, 'severity'>,
): 'danger' | 'warning' | 'secondary' {
	if (signal.severity === 'error') return 'danger';
	if (signal.severity === 'warning') return 'warning';
	return 'secondary';
}

function signalLabel(signal: AgentDebugSignal): string {
	return i18n.baseText(`agentDebug.signal.${signal.type}`);
}

function reviewLabel(status: AgentReviewStatus): string {
	return i18n.baseText(`agentDebug.review.status.${status}`);
}

function rejectionReasonLabel(reason: AgentReviewRejectionReason): string {
	return i18n.baseText(`agentDebug.review.rejectionReason.${reason}`);
}

function reviewSummaryLabel(review: AgentReviewCase): string {
	if (review.status !== 'rejected' || !review.rejectionReason) {
		return reviewLabel(review.status);
	}

	return `${reviewLabel(review.status)}: ${rejectionReasonLabel(review.rejectionReason)}`;
}

function reviewBadgeTheme(status: AgentReviewStatus): 'default' | 'danger' {
	return status === 'approved' ? 'default' : 'danger';
}

function reviewBadgeStyle(status: AgentReviewStatus): Record<string, string> {
	if (status === 'approved') {
		return {
			color: 'var(--color--blue-500)',
			borderColor: 'var(--color--blue-500)',
		};
	}
	return {};
}

function selectRun(runId: string) {
	void router.push({
		name: AGENT_DEBUG_RUN_DETAIL_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value, runId },
	});
}

async function loadData() {
	if (!projectId.value || !agentId.value) return;
	try {
		await Promise.all([
			debugStore.fetchRuns(projectId.value, agentId.value),
			debugStore.fetchInsights(projectId.value, agentId.value),
		]);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.showError.load'));
	}
}

async function loadMore() {
	try {
		await debugStore.loadMore(projectId.value, agentId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.showError.load'));
	}
}

watch([projectId, agentId], () => {
	debugStore.reset();
	void loadData();
});

onMounted(() => {
	void loadData();
});

onBeforeUnmount(() => {
	debugStore.reset();
});
</script>

<template>
	<div :class="$style.wrapper" data-testid="agent-debug-panel">
		<div :class="$style.summaryGrid">
			<div :class="$style.metric">
				<N8nText size="small" color="text-light">{{ i18n.baseText('agentDebug.runs') }}</N8nText>
				<N8nText bold>{{ formatNumber(summary?.totalRuns ?? 0) }}</N8nText>
			</div>
			<div :class="$style.metric">
				<N8nText size="small" color="text-light">{{ i18n.baseText('agentDebug.signals') }}</N8nText>
				<N8nText bold>{{ formatNumber(summary?.totalSignals ?? 0) }}</N8nText>
			</div>
			<div :class="$style.metric">
				<N8nText size="small" color="text-light">{{
					i18n.baseText('agentDebug.errorRate')
				}}</N8nText>
				<N8nText bold>{{ Math.round((summary?.errorRate ?? 0) * 100) }}%</N8nText>
			</div>
			<div :class="$style.metric">
				<N8nText size="small" color="text-light">{{
					i18n.baseText('agentDebug.avgDuration')
				}}</N8nText>
				<N8nText bold>{{ formatDuration(summary?.averageDuration ?? 0) }}</N8nText>
			</div>
		</div>

		<div v-if="summary?.insights.length" :class="$style.insights">
			<N8nBadge
				v-for="insight in summary.insights"
				:key="insight.type"
				:theme="badgeTheme(insight)"
				size="small"
			>
				{{ signalLabel(insight) }} · {{ insight.count }}
			</N8nBadge>
		</div>

		<div :class="$style.content">
			<div :class="$style.runsPanel">
				<div :class="$style.filters">
					<N8nRadioButtons
						v-model="selectedFilter"
						:options="filterOptions"
						data-testid="agent-debug-run-filter"
					/>
				</div>
				<N8nTableBase>
					<thead>
						<tr>
							<th>{{ i18n.baseText('agentDebug.table.run') }}</th>
							<th>{{ i18n.baseText('agentDebug.table.created') }}</th>
							<th>{{ i18n.baseText('agentDebug.table.duration') }}</th>
							<th>{{ i18n.baseText('agentDebug.table.cost') }}</th>
							<th>{{ i18n.baseText('agentDebug.table.signals') }}</th>
							<th>{{ i18n.baseText('agentDebug.table.review') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="run in filteredRuns"
							:key="run.id"
							:class="$style.runRow"
							data-testid="agent-debug-run-row"
							@click="selectRun(run.id)"
						>
							<td>
								<div :class="$style.runTitle">
									<N8nIcon
										:icon="run.status === 'error' ? 'circle-alert' : 'circle-check'"
										:size="16"
									/>
									<span>{{ truncate(sessionLabel(run), 32) }}</span>
								</div>
							</td>
							<td>{{ formatDate(run.createdAt) }}</td>
							<td>{{ formatDuration(run.duration) }}</td>
							<td>{{ formatCost(run.cost) }}</td>
							<td>
								<div v-if="run.signals.length" :class="$style.signalList">
									<N8nBadge
										v-for="signal in run.signals.slice(0, 2)"
										:key="signal.type"
										:theme="badgeTheme(signal)"
										size="small"
									>
										{{ signalLabel(signal) }}
									</N8nBadge>
									<N8nBadge v-if="run.signals.length > 2" theme="secondary" size="small">
										+{{ run.signals.length - 2 }}
									</N8nBadge>
								</div>
								<span v-else>-</span>
							</td>
							<td>
								<N8nBadge
									v-if="run.review"
									:theme="reviewBadgeTheme(run.review.status)"
									:style="reviewBadgeStyle(run.review.status)"
									size="small"
								>
									{{ reviewSummaryLabel(run.review) }}
								</N8nBadge>
								<span v-else>-</span>
							</td>
						</tr>
						<template v-if="debugStore.loading && !debugStore.runs.length">
							<tr v-for="item in 5" :key="item">
								<td v-for="col in 6" :key="col">
									<ElSkeletonItem />
								</td>
							</tr>
						</template>
						<tr v-if="!debugStore.runs.length && !debugStore.loading">
							<td colspan="6" :class="$style.empty">
								{{ i18n.baseText('agentDebug.empty') }}
							</td>
						</tr>
						<tr v-else-if="!filteredRuns.length && !debugStore.loading">
							<td colspan="6" :class="$style.empty">
								{{ i18n.baseText('agentDebug.emptyFilter') }}
							</td>
						</tr>
					</tbody>
				</N8nTableBase>

				<div v-if="debugStore.nextCursor" :class="$style.loadMore">
					<N8nButton
						icon="refresh-cw"
						:label="i18n.baseText('agentDebug.loadMore')"
						:loading="debugStore.loading"
						data-testid="agent-debug-load-more"
						@click="loadMore"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--lg);
	width: 100%;
}

.summaryGrid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.metric {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: var(--background--surface);
}

.insights,
.signalList {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.runsPanel {
	min-width: 0;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: var(--background--surface);
}

.runRow {
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}
}

.runTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.filters {
	padding: var(--spacing--sm);
	overflow-x: auto;
	border-bottom: var(--border);
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.loadMore {
	display: flex;
	justify-content: center;
	padding: var(--spacing--sm);
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
}

@media (max-width: 1200px) {
	.summaryGrid {
		grid-template-columns: 1fr;
	}
}
</style>
