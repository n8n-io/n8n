<script lang="ts" setup>
import type {
	AgentDebugRun,
	AgentDebugRunDetail,
	AgentDebugSignal,
	AgentReviewCase,
	AgentReviewStatus,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nRadioButtons,
	N8nTableBase,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils';
import { ElSkeletonItem } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useToast } from '@/app/composables/useToast';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

import { useAgentDebugStore } from '../agentDebug.store';
import SessionDetailPanel from '../components/SessionDetailPanel.vue';
import SessionTimelineTable from '../components/SessionTimelineTable.vue';
import type { AgentExecution } from '../composables/useAgentThreadsApi';
import type { TimelineItem } from '../session-timeline.types';
import { flattenExecutionsToTimelineItems } from '../session-timeline.utils';

const i18n = useI18n();
const route = useRoute();
const toast = useToast();
const debugStore = useAgentDebugStore();

const projectId = computed(() => String(route.params.projectId ?? ''));
const agentId = computed(() => String(route.params.agentId ?? ''));
const selectedRunId = ref<string | null>(null);
const selectedTimelineIndex = ref<number | null>(null);
const visibleTimelineKinds = ref(new Set<string>());
const expectedOutput = ref('');
const reviewNotes = ref('');
const savingReviewAction = ref<AgentReviewStatus | 'clear' | null>(null);

const summary = computed(() => debugStore.insights);
const reviewSummary = computed(() => debugStore.reviewSummary);

type DebugRunFilter = 'all' | 'reviewed' | 'failed' | 'signals' | 'tool_failure' | 'slow_run';

const selectedFilter = ref<DebugRunFilter>('all');

function runHasSignal(run: AgentDebugRun, type: AgentDebugSignal['type']): boolean {
	return run.signals.some((signal) => signal.type === type);
}

function runMatchesFilter(run: AgentDebugRun, filter: DebugRunFilter): boolean {
	if (filter === 'all') return true;
	if (filter === 'reviewed') return run.review !== null;
	if (filter === 'failed') return run.status === 'error';
	if (filter === 'signals') return run.signals.length > 0;
	if (filter === 'tool_failure') return runHasSignal(run, 'tool_failure');
	return runHasSignal(run, 'slow_run');
}

function countForFilter(filter: DebugRunFilter): number {
	return debugStore.runs.filter((run) => runMatchesFilter(run, filter)).length;
}

function filterLabel(filter: DebugRunFilter): string {
	return `${i18n.baseText(`agentDebug.filter.${filter}`)} (${countForFilter(filter)})`;
}

const filterOptions = computed<Array<{ label: string; value: DebugRunFilter }>>(() => [
	{ label: filterLabel('all'), value: 'all' },
	{ label: filterLabel('reviewed'), value: 'reviewed' },
	{ label: filterLabel('failed'), value: 'failed' },
	{ label: filterLabel('signals'), value: 'signals' },
	{ label: filterLabel('tool_failure'), value: 'tool_failure' },
	{ label: filterLabel('slow_run'), value: 'slow_run' },
]);

const filteredRuns = computed(() =>
	debugStore.runs.filter((run) => runMatchesFilter(run, selectedFilter.value)),
);

const timelineItems = computed<TimelineItem[]>(() => {
	const detail = debugStore.selectedRun;
	if (!detail) return [];
	return flattenExecutionsToTimelineItems([toTimelineExecution(detail)]);
});

const selectedTimelineItem = computed(() => {
	if (selectedTimelineIndex.value === null) return null;
	return timelineItems.value[selectedTimelineIndex.value] ?? null;
});

function toTimelineExecution(run: AgentDebugRunDetail): AgentExecution {
	return {
		id: run.id,
		threadId: run.threadId,
		agentId: agentId.value,
		status: run.status,
		createdAt: run.createdAt,
		startedAt: run.startedAt,
		stoppedAt: run.stoppedAt,
		duration: run.duration,
		userMessage: run.userMessage,
		assistantResponse: run.assistantResponse,
		model: run.model,
		promptTokens: run.promptTokens,
		completionTokens: run.completionTokens,
		totalTokens: run.totalTokens,
		cost: run.cost,
		toolCalls:
			run.toolCalls?.map((toolCall) => ({
				toolName: toolCall.name,
				input: toolCall.input,
				output: toolCall.output,
			})) ?? null,
		timeline: run.timeline,
		error: run.error,
		hitlStatus: run.hitlStatus,
		source: run.source,
	};
}

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

function formatTokens(run: AgentDebugRunDetail): string {
	if (run.totalTokens !== null) return formatNumber(run.totalTokens);
	const promptTokens = run.promptTokens ?? 0;
	const completionTokens = run.completionTokens ?? 0;
	if (promptTokens + completionTokens === 0) return '-';
	return formatNumber(promptTokens + completionTokens);
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

function messageText(value: string): string {
	return value.trim() || i18n.baseText('agentDebug.noMessageRecorded');
}

function reviewCaseInput(reviewCase: AgentReviewCase): string {
	return truncate(messageText(reviewCase.input), 80);
}

function reviewCaseExpectedOutput(reviewCase: AgentReviewCase): string {
	return truncate(messageText(reviewCase.expectedOutput), 80);
}

async function refreshReviewCases() {
	try {
		await debugStore.fetchReviewCases(projectId.value, agentId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.showError.loadReviews'));
	}
}

async function saveReview(status: AgentReviewStatus) {
	const run = debugStore.selectedRun;
	if (!run) return;

	savingReviewAction.value = status;
	try {
		await debugStore.saveRunReview(projectId.value, agentId.value, run.id, {
			status,
			expectedOutput: expectedOutput.value,
			notes: reviewNotes.value || undefined,
		});
		await refreshReviewCases();
		toast.showMessage({
			title: i18n.baseText('agentDebug.review.showMessage.saved'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.review.showError.save'));
	} finally {
		if (savingReviewAction.value === status) savingReviewAction.value = null;
	}
}

async function clearReview() {
	const run = debugStore.selectedRun;
	if (!run?.review) return;

	savingReviewAction.value = 'clear';
	try {
		await debugStore.clearRunReview(projectId.value, agentId.value, run.id);
		await refreshReviewCases();
		expectedOutput.value = run.assistantResponse;
		reviewNotes.value = '';
		toast.showMessage({
			title: i18n.baseText('agentDebug.review.showMessage.cleared'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.review.showError.clear'));
	} finally {
		if (savingReviewAction.value === 'clear') savingReviewAction.value = null;
	}
}

async function selectRun(runId: string) {
	selectedRunId.value = runId;
	selectedTimelineIndex.value = null;
	try {
		await debugStore.fetchRunDetail(projectId.value, agentId.value, runId);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.showError.loadRun'));
	}
}

async function selectReviewCase(reviewCase: AgentReviewCase) {
	await selectRun(reviewCase.executionId);
}

async function loadData() {
	if (!projectId.value || !agentId.value) return;
	try {
		await Promise.all([
			debugStore.fetchRuns(projectId.value, agentId.value),
			debugStore.fetchInsights(projectId.value, agentId.value),
			debugStore.fetchReviewCases(projectId.value, agentId.value),
		]);
		if (debugStore.runs[0]) {
			await selectRun(debugStore.runs[0].id);
		} else {
			selectedRunId.value = null;
			selectedTimelineIndex.value = null;
		}
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

async function loadMoreReviewCases() {
	try {
		await debugStore.loadMoreReviewCases(projectId.value, agentId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.showError.loadReviews'));
	}
}

watch(selectedFilter, () => {
	const selectedRunIsVisible = filteredRuns.value.some((run) => run.id === selectedRunId.value);
	if (selectedRunIsVisible) return;

	const nextRun = filteredRuns.value[0];
	if (nextRun) {
		void selectRun(nextRun.id);
		return;
	}

	selectedRunId.value = null;
	selectedTimelineIndex.value = null;
});

watch(
	() => debugStore.selectedRun,
	(run) => {
		expectedOutput.value = run?.review?.expectedOutput ?? run?.assistantResponse ?? '';
		reviewNotes.value = run?.review?.notes ?? '';
	},
);

watch([projectId, agentId], () => {
	debugStore.reset();
	selectedRunId.value = null;
	selectedTimelineIndex.value = null;
	void loadData();
});

onMounted(() => {
	void loadData();
});

onBeforeUnmount(() => {
	debugStore.reset();
	selectedRunId.value = null;
	selectedTimelineIndex.value = null;
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

		<section :class="$style.reviewDataset" data-testid="agent-debug-reviewed-cases">
			<div :class="$style.reviewDatasetHeader">
				<div>
					<N8nText bold>{{ i18n.baseText('agentDebug.reviewDataset.title') }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agentDebug.reviewDataset.description') }}
					</N8nText>
				</div>
				<div :class="$style.reviewDatasetMetrics">
					<div :class="$style.reviewDatasetMetric">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agentDebug.reviewDataset.total') }}
						</N8nText>
						<N8nText bold>{{ formatNumber(reviewSummary?.total ?? 0) }}</N8nText>
					</div>
					<div :class="$style.reviewDatasetMetric">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agentDebug.reviewDataset.approved') }}
						</N8nText>
						<N8nText bold>{{ formatNumber(reviewSummary?.approved ?? 0) }}</N8nText>
					</div>
					<div :class="$style.reviewDatasetMetric">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agentDebug.reviewDataset.rejected') }}
						</N8nText>
						<N8nText bold>{{ formatNumber(reviewSummary?.rejected ?? 0) }}</N8nText>
					</div>
				</div>
			</div>

			<div
				v-if="debugStore.reviewCases.length || debugStore.loadingReviewCases"
				:class="$style.reviewDatasetTable"
			>
				<N8nTableBase>
					<thead>
						<tr>
							<th>{{ i18n.baseText('agentDebug.reviewDataset.table.status') }}</th>
							<th>{{ i18n.baseText('agentDebug.reviewDataset.table.input') }}</th>
							<th>{{ i18n.baseText('agentDebug.reviewDataset.table.expectedOutput') }}</th>
							<th>{{ i18n.baseText('agentDebug.reviewDataset.table.updated') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="reviewCase in debugStore.reviewCases"
							:key="reviewCase.id"
							:class="[
								$style.reviewCaseRow,
								selectedRunId === reviewCase.executionId && $style.selectedRun,
							]"
							data-testid="agent-debug-reviewed-case-row"
							@click="selectReviewCase(reviewCase)"
						>
							<td>
								<N8nBadge
									:theme="reviewBadgeTheme(reviewCase.status)"
									:style="reviewBadgeStyle(reviewCase.status)"
									size="small"
								>
									{{ reviewLabel(reviewCase.status) }}
								</N8nBadge>
							</td>
							<td :class="$style.reviewCaseText">{{ reviewCaseInput(reviewCase) }}</td>
							<td :class="$style.reviewCaseText">{{ reviewCaseExpectedOutput(reviewCase) }}</td>
							<td>{{ formatDate(reviewCase.updatedAt) }}</td>
						</tr>
						<template v-if="debugStore.loadingReviewCases && !debugStore.reviewCases.length">
							<tr v-for="item in 3" :key="item">
								<td v-for="col in 4" :key="col">
									<ElSkeletonItem />
								</td>
							</tr>
						</template>
					</tbody>
				</N8nTableBase>
			</div>
			<div v-else :class="$style.emptyCompact">
				{{ i18n.baseText('agentDebug.reviewDataset.empty') }}
			</div>

			<div v-if="debugStore.reviewCasesNextCursor" :class="$style.reviewCasesLoadMore">
				<N8nButton
					icon="refresh-cw"
					:label="i18n.baseText('agentDebug.reviewDataset.loadMore')"
					:loading="debugStore.loadingReviewCases"
					data-testid="agent-debug-reviewed-cases-load-more"
					@click="loadMoreReviewCases"
				/>
			</div>
		</section>

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
							:class="[$style.runRow, selectedRunId === run.id && $style.selectedRun]"
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
									{{ reviewLabel(run.review.status) }}
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

			<div :class="$style.detailPanel">
				<div v-if="debugStore.loadingDetail" :class="$style.detailLoading">
					<ElSkeletonItem v-for="item in 6" :key="item" />
				</div>
				<template v-else-if="debugStore.selectedRun">
					<div :class="$style.detailHeader">
						<div>
							<N8nText bold>{{ i18n.baseText('agentDebug.runDetails') }}</N8nText>
							<N8nText size="small" color="text-light">
								{{ truncate(debugStore.selectedRun.userMessage, 80) }}
							</N8nText>
						</div>
						<div :class="$style.signalList">
							<N8nBadge
								v-for="signal in debugStore.selectedRun.signals"
								:key="signal.type"
								:theme="badgeTheme(signal)"
								size="small"
							>
								{{ signalLabel(signal) }}
							</N8nBadge>
							<N8nBadge
								v-if="debugStore.selectedRun.review"
								:theme="reviewBadgeTheme(debugStore.selectedRun.review.status)"
								:style="reviewBadgeStyle(debugStore.selectedRun.review.status)"
								size="small"
							>
								{{ reviewLabel(debugStore.selectedRun.review.status) }}
							</N8nBadge>
						</div>
					</div>

					<div :class="$style.messageSummary">
						<section :class="$style.messageBlock">
							<div :class="$style.messageLabel">
								<N8nIcon icon="user" :size="16" />
								<N8nText bold>{{ i18n.baseText('agentDebug.userMessage') }}</N8nText>
							</div>
							<N8nText tag="p" :class="$style.messageText">
								{{ messageText(debugStore.selectedRun.userMessage) }}
							</N8nText>
						</section>
						<section :class="$style.messageBlock">
							<div :class="$style.messageLabel">
								<N8nIcon icon="bot" :size="16" />
								<N8nText bold>{{ i18n.baseText('agentDebug.agentResponse') }}</N8nText>
							</div>
							<N8nText tag="p" :class="$style.messageText">
								{{ messageText(debugStore.selectedRun.assistantResponse) }}
							</N8nText>
						</section>
						<dl :class="$style.runMetadata">
							<div>
								<dt>{{ i18n.baseText('agentDebug.status') }}</dt>
								<dd>{{ debugStore.selectedRun.status }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.duration') }}</dt>
								<dd>{{ formatDuration(debugStore.selectedRun.duration) }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.tokens') }}</dt>
								<dd>{{ formatTokens(debugStore.selectedRun) }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.cost') }}</dt>
								<dd>{{ formatCost(debugStore.selectedRun.cost) }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.model') }}</dt>
								<dd>{{ debugStore.selectedRun.model ?? '-' }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.source') }}</dt>
								<dd>{{ debugStore.selectedRun.source ?? '-' }}</dd>
							</div>
						</dl>
					</div>

					<section :class="$style.reviewPanel" data-testid="agent-debug-review-form">
						<div :class="$style.reviewHeader">
							<div>
								<N8nText bold>{{ i18n.baseText('agentDebug.review.title') }}</N8nText>
								<N8nText size="small" color="text-light">
									{{ i18n.baseText('agentDebug.review.description') }}
								</N8nText>
							</div>
						</div>
						<div :class="$style.reviewFields">
							<label :class="$style.reviewField">
								<N8nText size="small" bold>
									{{ i18n.baseText('agentDebug.review.expectedOutput') }}
								</N8nText>
								<N8nInput
									v-model="expectedOutput"
									type="textarea"
									:rows="5"
									resize="vertical"
									:placeholder="i18n.baseText('agentDebug.review.expectedOutputPlaceholder')"
									data-testid="agent-debug-expected-output"
								/>
							</label>
							<label :class="$style.reviewField">
								<N8nText size="small" bold>
									{{ i18n.baseText('agentDebug.review.notes') }}
								</N8nText>
								<N8nInput
									v-model="reviewNotes"
									type="textarea"
									:rows="2"
									resize="vertical"
									:placeholder="i18n.baseText('agentDebug.review.notesPlaceholder')"
									data-testid="agent-debug-review-notes"
								/>
							</label>
						</div>
						<div :class="$style.reviewActions">
							<N8nButton
								icon="thumbs-up"
								:label="i18n.baseText('agentDebug.review.approve')"
								:loading="savingReviewAction === 'approved'"
								:disabled="savingReviewAction !== null"
								data-testid="agent-debug-approve-review"
								@click="saveReview('approved')"
							/>
							<N8nButton
								icon="thumbs-down"
								variant="outline"
								:label="i18n.baseText('agentDebug.review.reject')"
								:loading="savingReviewAction === 'rejected'"
								:disabled="savingReviewAction !== null"
								data-testid="agent-debug-reject-review"
								@click="saveReview('rejected')"
							/>
							<N8nButton
								v-if="debugStore.selectedRun.review"
								icon="trash-2"
								variant="outline"
								:label="i18n.baseText('agentDebug.review.clear')"
								:loading="savingReviewAction === 'clear'"
								:disabled="savingReviewAction !== null"
								data-testid="agent-debug-clear-review"
								@click="clearReview"
							/>
						</div>
					</section>

					<div :class="$style.timeline">
						<div :class="$style.timelineHeader">
							<N8nText bold>{{ i18n.baseText('agentDebug.trace') }}</N8nText>
						</div>
						<SessionTimelineTable
							:items="timelineItems"
							:selected-index="selectedTimelineIndex"
							:visible-kinds="visibleTimelineKinds"
							@select="selectedTimelineIndex = $event"
						/>
						<SessionDetailPanel
							:item="selectedTimelineItem"
							@close="selectedTimelineIndex = null"
						/>
					</div>
				</template>
				<div v-else :class="$style.empty">
					{{ i18n.baseText('agentDebug.selectRun') }}
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

.reviewDataset {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: var(--background--surface);
}

.reviewDatasetHeader {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--md);
	flex-shrink: 0;
}

.reviewDatasetMetrics {
	display: grid;
	grid-template-columns: repeat(3, minmax(5rem, 1fr));
	gap: var(--spacing--md);
}

.reviewDatasetMetric {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.reviewDatasetTable {
	max-height: 14rem;
	overflow: hidden;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;

	> div {
		height: auto;
		max-height: 14rem;
	}

	> div > div {
		max-height: 14rem;
	}
}

.reviewCaseRow {
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}
}

.reviewCaseText {
	max-width: 22rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.reviewCasesLoadMore {
	display: flex;
	justify-content: center;
}

.content {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(24rem, 0.9fr);
	gap: var(--spacing--md);
}

.runsPanel,
.detailPanel {
	min-width: 0;
}

.runRow {
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}
}

.selectedRun {
	background-color: var(--background--hover);
}

.runTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.filters {
	padding: 0 0 var(--spacing--sm);
	overflow-x: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.loadMore {
	display: flex;
	justify-content: center;
	padding: var(--spacing--sm);
}

.detailPanel {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: var(--background--surface);
}

.detailHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}

.messageSummary {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}

.reviewPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}

.reviewHeader {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.reviewFields {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing--sm);
}

.reviewField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.reviewActions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
}

.messageBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
	min-width: 0;
}

.messageLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.messageText {
	margin: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.runMetadata {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--xs);
	margin: 0;

	> div {
		min-width: 0;
	}

	dt {
		color: var(--color--text--tint-1);
		font-size: var(--font-size--xs);
	}

	dd {
		margin: var(--spacing--4xs) 0 0;
		overflow-wrap: anywhere;
	}
}

.timeline {
	display: grid;
	grid-template-rows: auto minmax(12rem, 1fr) minmax(14rem, 1fr);
	min-height: 0;
	flex: 1;
}

.timelineHeader {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.detailLoading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
}

.emptyCompact {
	padding: var(--spacing--sm);
	text-align: center;
	color: var(--color--text--tint-1);
}

@media (max-width: 1200px) {
	.summaryGrid,
	.content {
		grid-template-columns: 1fr;
	}

	.reviewDatasetHeader {
		flex-direction: column;
	}

	.runMetadata {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>
