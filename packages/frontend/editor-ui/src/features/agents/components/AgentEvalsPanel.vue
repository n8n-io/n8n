<script setup lang="ts">
import type {
	AgentEvaluationDatasetResponse,
	AgentEvaluationRunCaseResult,
	AgentEvaluationMetricSuggestion,
	AgentEvaluationSuiteDraft,
	AgentEvaluationSuiteRun,
} from '@n8n/api-types';
import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nCard, N8nCheckbox, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';

import {
	getAgentEvaluationDataset,
	runAgentEvaluationSuite,
	setupAgentEvaluationSuite,
} from '../composables/useAgentEvaluationsApi';
import type { AgentSchema } from '../types';

const props = withDefaults(
	defineProps<{
		projectId: string;
		agentId: string;
		schema?: AgentSchema | null;
	}>(),
	{
		schema: null,
	},
);

const emit = defineEmits<{
	'open-review': [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();

const dataset = ref<AgentEvaluationDatasetResponse | null>(null);
const suite = ref<AgentEvaluationSuiteDraft | null>(null);
const run = ref<AgentEvaluationSuiteRun | null>(null);
const loading = ref(false);
const settingUpSuite = ref(false);
const runningSuite = ref(false);
const enabledMetricIds = ref<string[]>([]);

const RUN_PROGRESS_STEPS = ['preparing', 'running', 'scoring', 'finalizing'] as const;
type RunProgressStep = (typeof RUN_PROGRESS_STEPS)[number];

const runProgressStep = ref<RunProgressStep | null>(null);
const runProgressTimers: number[] = [];

const evals = computed(() => props.schema?.evaluations ?? []);
const readiness = computed(() => dataset.value?.readiness ?? null);
const isReady = computed(() => readiness.value?.isReady === true);
const reviewedCases = computed(() => readiness.value?.reviewedCases ?? 0);
const minimumReviewedCases = computed(
	() => readiness.value?.minimumReviewedCases ?? AGENT_EVALUATION_MIN_REVIEWED_CASES,
);
const remainingCases = computed(
	() => readiness.value?.remainingCases ?? minimumReviewedCases.value,
);
const enabledMetricCount = computed(() => enabledMetricIds.value.length);
const canRunSuite = computed(() => enabledMetricCount.value > 0 && !runningSuite.value);
const runProgressStepIndex = computed(() =>
	runProgressStep.value ? RUN_PROGRESS_STEPS.indexOf(runProgressStep.value) : -1,
);
const currentRunProgressStep = computed(() => {
	if (!runProgressStep.value) return '';

	return i18n.baseText(`agents.builder.evaluations.run.progress.${runProgressStep.value}`);
});
const currentRunProgressTitle = computed(() => {
	if (!runProgressStep.value) return '';

	return i18n.baseText('agents.builder.evaluations.run.progress.step', {
		interpolate: {
			current: String(runProgressStepIndex.value + 1),
			total: String(RUN_PROGRESS_STEPS.length),
			step: currentRunProgressStep.value,
		},
	});
});
const currentRunProgressDescription = computed(() => {
	if (!runProgressStep.value) return '';

	return i18n.baseText(
		`agents.builder.evaluations.run.progress.${runProgressStep.value}.description`,
	);
});

const readinessTitle = computed(() => {
	if (loading.value && !dataset.value) {
		return i18n.baseText('agents.builder.evaluations.readiness.loading');
	}

	return isReady.value
		? i18n.baseText('agents.builder.evaluations.readiness.ready.title')
		: i18n.baseText('agents.builder.evaluations.readiness.reviewFirst.title');
});

const readinessDescription = computed(() => {
	if (loading.value && !dataset.value) {
		return i18n.baseText('agents.builder.evaluations.readiness.loadingDescription');
	}

	if (isReady.value) {
		return i18n.baseText('agents.builder.evaluations.readiness.ready.description', {
			interpolate: { count: String(reviewedCases.value) },
		});
	}

	return i18n.baseText('agents.builder.evaluations.readiness.reviewFirst.description', {
		interpolate: {
			minimum: String(minimumReviewedCases.value),
			count: String(reviewedCases.value),
			remaining: String(remainingCases.value),
		},
	});
});

async function loadDataset() {
	if (!props.projectId || !props.agentId) return;

	suite.value = null;
	run.value = null;
	loading.value = true;
	try {
		dataset.value = await getAgentEvaluationDataset(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.evaluations.dataset.loadError'));
	} finally {
		loading.value = false;
	}
}

async function setupSuite() {
	if (!props.projectId || !props.agentId) return;

	settingUpSuite.value = true;
	run.value = null;
	try {
		const response = await setupAgentEvaluationSuite(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		if (dataset.value) {
			dataset.value = { ...dataset.value, readiness: response.readiness };
		}
		suite.value = response.suite;
		resetMetricSelection(response.suite);
		if (!response.suite) {
			toast.showMessage({
				title: i18n.baseText('agents.builder.evaluations.setup.notReady'),
				type: 'warning',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.evaluations.setup.loadError'));
	} finally {
		settingUpSuite.value = false;
	}
}

async function runFirstEvaluation() {
	if (!props.projectId || !props.agentId) return;
	if (enabledMetricCount.value === 0) {
		toast.showMessage({
			title: i18n.baseText('agents.builder.evaluations.run.noMetrics'),
			type: 'warning',
		});
		return;
	}

	runningSuite.value = true;
	run.value = null;
	startRunProgress();
	try {
		const response = await runAgentEvaluationSuite(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			{ enabledMetricIds: enabledMetricIds.value },
		);
		runProgressStep.value = 'finalizing';
		if (dataset.value) {
			dataset.value = { ...dataset.value, readiness: response.readiness };
		}
		run.value = response.run;
		if (!response.run) {
			toast.showMessage({
				title: i18n.baseText('agents.builder.evaluations.run.notReady'),
				type: 'warning',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.evaluations.run.loadError'));
	} finally {
		clearRunProgress();
		runningSuite.value = false;
	}
}

function formatScore(score: number) {
	return `${Math.round(score * 100)}%`;
}

function getCaseStatusLabel(result: AgentEvaluationRunCaseResult): string {
	if (result.status === 'passed') {
		return i18n.baseText('agents.builder.evaluations.run.status.passed');
	}
	if (result.status === 'error') {
		return i18n.baseText('agents.builder.evaluations.run.status.error');
	}
	return i18n.baseText('agents.builder.evaluations.run.status.failed');
}

function resetMetricSelection(nextSuite: AgentEvaluationSuiteDraft | null) {
	enabledMetricIds.value =
		nextSuite?.metrics.filter((metric) => metric.enabled).map((metric) => metric.id) ?? [];
}

function isMetricEnabled(metricId: string) {
	return enabledMetricIds.value.includes(metricId);
}

function setMetricEnabled(metricId: string, enabled: boolean) {
	if (enabled) {
		enabledMetricIds.value = [...new Set([...enabledMetricIds.value, metricId])];
		return;
	}

	enabledMetricIds.value = enabledMetricIds.value.filter((id) => id !== metricId);
}

function getMetricToggleLabel(metric: AgentEvaluationMetricSuggestion) {
	return i18n.baseText('agents.builder.evaluations.suite.metric.toggle', {
		interpolate: { metric: metric.name },
	});
}

function getProgressStepLabel(step: RunProgressStep) {
	return i18n.baseText(`agents.builder.evaluations.run.progress.${step}`);
}

function startRunProgress() {
	clearRunProgress();
	runProgressStep.value = 'preparing';
	runProgressTimers.push(
		window.setTimeout(() => {
			runProgressStep.value = 'running';
		}, 600),
		window.setTimeout(() => {
			runProgressStep.value = 'scoring';
		}, 2200),
		window.setTimeout(() => {
			runProgressStep.value = 'finalizing';
		}, 4200),
	);
}

function clearRunProgress() {
	for (const timer of runProgressTimers) {
		window.clearTimeout(timer);
	}
	runProgressTimers.length = 0;
	runProgressStep.value = null;
}

watch(
	() => [props.projectId, props.agentId],
	() => void loadDataset(),
	{ immediate: true },
);

onBeforeUnmount(clearRunProgress);
</script>

<template>
	<div :class="$style.panel" data-testid="agent-evals-panel">
		<N8nCard :class="$style.readinessCard" data-testid="agent-evaluations-readiness">
			<div :class="$style.readinessHeader">
				<N8nIcon
					:icon="isReady ? 'circle-check' : 'list-checks'"
					:size="18"
					:class="[$style.readinessIcon, isReady && $style.readyIcon]"
				/>
				<div :class="$style.readinessCopy">
					<N8nText :bold="true">{{ readinessTitle }}</N8nText>
					<N8nText size="small" color="text-light">{{ readinessDescription }}</N8nText>
				</div>
			</div>

			<div :class="$style.datasetStats">
				<div :class="$style.datasetStat">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.evaluations.dataset.reviewed') }}
					</N8nText>
					<N8nText :bold="true">{{ reviewedCases }} / {{ minimumReviewedCases }}</N8nText>
				</div>
				<div :class="$style.datasetStat">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.evaluations.dataset.approved') }}
					</N8nText>
					<N8nText :bold="true" :class="$style.statOk">{{
						dataset?.summary.approved ?? 0
					}}</N8nText>
				</div>
				<div :class="$style.datasetStat">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.evaluations.dataset.rejected') }}
					</N8nText>
					<N8nText :bold="true" :class="$style.statBad">{{
						dataset?.summary.rejected ?? 0
					}}</N8nText>
				</div>
			</div>

			<div v-if="!isReady" :class="$style.readinessActions">
				<N8nButton
					icon="clipboard-check"
					:label="i18n.baseText('agents.builder.evaluations.readiness.reviewFirst.button')"
					data-testid="agent-evaluations-open-review"
					@click="emit('open-review')"
				/>
			</div>
		</N8nCard>

		<template v-if="isReady">
			<template v-if="evals.length > 0">
				<N8nCard v-for="evalItem in evals" :key="evalItem.name" :class="$style.evalCard">
					<div :class="$style.evalHeader">
						<N8nText :bold="true" size="small">{{ evalItem.name }}</N8nText>
						<span
							:class="[
								$style.typeBadge,
								evalItem.type === 'check' ? $style.badgeCheck : $style.badgeJudge,
							]"
						>
							<N8nText size="xsmall" :bold="true">{{
								evalItem.type === 'check'
									? i18n.baseText('agents.builder.evaluations.type.check')
									: i18n.baseText('agents.builder.evaluations.type.judge')
							}}</N8nText>
						</span>
					</div>

					<div v-if="evalItem.hasCredential" :class="$style.credentialRow">
						<N8nIcon icon="lock" size="xsmall" :class="$style.keyIcon" />
						<N8nText size="xsmall" color="text-light">
							{{
								evalItem.credentialName ??
								i18n.baseText('agents.builder.evaluations.credentialConfigured')
							}}
						</N8nText>
					</div>

					<N8nText v-if="evalItem.description" size="small" color="text-light">
						{{ evalItem.description }}
					</N8nText>
				</N8nCard>
			</template>

			<N8nCard v-if="suite" :class="$style.suiteCard" data-testid="agent-evaluations-suite">
				<div :class="$style.suiteHeader">
					<div :class="$style.readinessCopy">
						<div :class="$style.suiteTitleRow">
							<N8nText :bold="true">{{ suite.name }}</N8nText>
							<N8nBadge theme="secondary" size="small">
								{{ i18n.baseText('agents.builder.evaluations.suite.status.draft') }}
							</N8nBadge>
						</div>
						<N8nText size="small" color="text-light">{{ suite.description }}</N8nText>
					</div>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('agents.builder.evaluations.suite.caseCount', {
								interpolate: { count: String(suite.caseCount) },
							})
						}}
					</N8nText>
				</div>

				<div :class="$style.runSetup">
					<div>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.suite.toolMocking') }}
						</N8nText>
						<N8nText size="small">{{ suite.toolMocking }}</N8nText>
					</div>
					<div>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.suite.memoryMocking') }}
						</N8nText>
						<N8nText size="small">{{ suite.memoryMocking }}</N8nText>
					</div>
				</div>

				<div :class="$style.metricsList">
					<N8nText :bold="true" size="small">
						{{ i18n.baseText('agents.builder.evaluations.suite.metrics') }}
					</N8nText>
					<label
						v-for="metric in suite.metrics"
						:key="metric.id"
						:class="[$style.metricRow, !isMetricEnabled(metric.id) && $style.metricRowDisabled]"
						data-testid="agent-evaluations-suite-metric"
					>
						<div :class="$style.metricToggle">
							<N8nCheckbox
								:model-value="isMetricEnabled(metric.id)"
								:aria-label="getMetricToggleLabel(metric)"
								:disabled="runningSuite"
								data-testid="agent-evaluations-suite-metric-toggle"
								@update:model-value="(checked: boolean) => setMetricEnabled(metric.id, checked)"
							/>
							<div :class="$style.metricCopy">
								<N8nText :bold="true" size="small">{{ metric.name }}</N8nText>
								<N8nText size="small" color="text-light">{{ metric.description }}</N8nText>
							</div>
						</div>
						<div :class="$style.metricBadges">
							<N8nBadge theme="secondary" size="small">
								{{
									metric.type === 'check'
										? i18n.baseText('agents.builder.evaluations.type.check')
										: i18n.baseText('agents.builder.evaluations.type.judge')
								}}
							</N8nBadge>
							<span
								:class="[
									$style.statusBadge,
									isMetricEnabled(metric.id) ? $style.statusBadgeOk : $style.statusBadgeMuted,
								]"
							>
								{{
									isMetricEnabled(metric.id)
										? i18n.baseText('agents.builder.evaluations.suite.metric.enabled')
										: i18n.baseText('agents.builder.evaluations.suite.metric.disabled')
								}}
							</span>
						</div>
					</label>
				</div>

				<div
					v-if="runningSuite && runProgressStep"
					:class="$style.runProgress"
					data-testid="agent-evaluations-run-progress"
				>
					<div :class="$style.readinessCopy">
						<N8nText :bold="true" size="small">{{ currentRunProgressTitle }}</N8nText>
						<N8nText size="small" color="text-light">{{ currentRunProgressDescription }}</N8nText>
					</div>
					<div :class="$style.progressSteps" aria-hidden="true">
						<span
							v-for="(step, index) in RUN_PROGRESS_STEPS"
							:key="step"
							:class="[
								$style.progressStep,
								index < runProgressStepIndex && $style.progressStepDone,
								index === runProgressStepIndex && $style.progressStepCurrent,
							]"
						>
							<span :class="$style.progressDot" />
							<span>{{ getProgressStepLabel(step) }}</span>
						</span>
					</div>
				</div>

				<div :class="$style.suiteActions">
					<N8nText v-if="enabledMetricCount === 0" size="small" :class="$style.noMetrics">
						{{ i18n.baseText('agents.builder.evaluations.run.noMetrics') }}
					</N8nText>
					<N8nButton
						icon="play"
						:label="i18n.baseText('agents.builder.evaluations.run.button')"
						:disabled="!canRunSuite"
						:loading="runningSuite"
						data-testid="agent-evaluations-run-suite"
						@click="runFirstEvaluation"
					/>
				</div>
			</N8nCard>

			<N8nCard v-if="run" :class="$style.runCard" data-testid="agent-evaluations-run-results">
				<div :class="$style.suiteHeader">
					<div :class="$style.readinessCopy">
						<N8nText :bold="true">
							{{ i18n.baseText('agents.builder.evaluations.run.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.description') }}
						</N8nText>
					</div>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('agents.builder.evaluations.run.averageScore', {
								interpolate: { score: formatScore(run.summary.averageScore) },
							})
						}}
					</N8nText>
				</div>

				<div :class="$style.datasetStats">
					<div :class="$style.datasetStat">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.summary.total') }}
						</N8nText>
						<N8nText :bold="true">{{ run.summary.totalCases }}</N8nText>
					</div>
					<div :class="$style.datasetStat">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.summary.passed') }}
						</N8nText>
						<N8nText :bold="true" :class="$style.statOk">{{ run.summary.passedCases }}</N8nText>
					</div>
					<div :class="$style.datasetStat">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.summary.failed') }}
						</N8nText>
						<N8nText :bold="true" :class="$style.statBad">{{
							run.summary.failedCases + run.summary.errorCases
						}}</N8nText>
					</div>
				</div>

				<div v-if="run.warnings.length > 0" :class="$style.warningList">
					<N8nText v-for="warning in run.warnings" :key="warning" size="small" color="text-light">
						{{ warning }}
					</N8nText>
				</div>

				<div :class="$style.runCases">
					<div
						v-for="result in run.cases"
						:key="result.caseId"
						:class="$style.runCase"
						data-testid="agent-evaluations-run-case"
					>
						<div :class="$style.suiteHeader">
							<div :class="$style.metricCopy">
								<N8nText :bold="true" size="small">{{ result.input }}</N8nText>
								<N8nText size="small" color="text-light">{{
									result.output || result.error
								}}</N8nText>
							</div>
							<span
								:class="[
									$style.statusBadge,
									result.status === 'passed' ? $style.statusBadgeOk : $style.statusBadgeBad,
								]"
							>
								{{ getCaseStatusLabel(result) }}
							</span>
						</div>
						<div :class="$style.metricBadges">
							<span
								v-for="metric in result.metrics"
								:key="metric.id"
								:class="[
									$style.statusBadge,
									metric.pass ? $style.statusBadgeOk : $style.statusBadgeBad,
								]"
							>
								{{ metric.name }} {{ formatScore(metric.score) }}
							</span>
							<span
								v-if="result.missingToolMocks.length > 0"
								:class="[$style.statusBadge, $style.statusBadgeBad]"
							>
								{{ i18n.baseText('agents.builder.evaluations.run.missingMocks') }}
							</span>
						</div>
					</div>
				</div>
			</N8nCard>

			<div v-if="!suite" :class="$style.dashedCard">
				<N8nText :bold="true">
					{{ i18n.baseText('agents.builder.evaluations.setup.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.evaluations.setup.description') }}
				</N8nText>
				<div :class="$style.readinessActions">
					<N8nButton
						icon="wand-sparkles"
						:label="i18n.baseText('agents.builder.evaluations.setup.button')"
						:loading="settingUpSuite"
						data-testid="agent-evaluations-setup-suite"
						@click="setupSuite"
					/>
				</div>
			</div>
		</template>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-height: 0;
}

.readinessCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.suiteCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.runCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.readinessHeader {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.readinessIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
	margin-top: var(--spacing--5xs);
}

.readyIcon {
	color: var(--text-color--info);
}

.readinessCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.datasetStats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.datasetStat {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
}

.readinessActions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
}

.suiteActions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.suiteHeader {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.suiteTitleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.runSetup {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);

	> div {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--4xs);
		padding: var(--spacing--xs);
		border: var(--border);
		border-radius: var(--border-radius-base);
	}
}

.metricsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.metricRow {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
	cursor: pointer;
	transition:
		background-color var(--duration--snappy),
		border-color var(--duration--snappy);

	&:hover {
		background-color: var(--background--hover);
	}
}

.metricRowDisabled {
	background-color: var(--background--hover);
}

.metricToggle {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	min-width: 0;
}

.metricCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.metricBadges {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
	justify-content: flex-end;
}

.warningList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: var(--callout--color--background--warning);
}

.runProgress {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color--info);
	border-radius: var(--border-radius-base);
	background-color: var(--background--info);
}

.progressSteps {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: var(--spacing--2xs);
}

.progressStep {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.progressStepDone,
.progressStepCurrent {
	color: var(--text-color--info);
}

.progressDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--xl);
	background-color: var(--border-color);
	flex-shrink: 0;
}

.progressStepDone .progressDot,
.progressStepCurrent .progressDot {
	background-color: var(--text-color--info);
}

.statusBadge {
	display: inline-flex;
	align-items: center;
	width: fit-content;
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border: var(--border-width) var(--border-style) currentColor;
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--sm);
	white-space: nowrap;
}

.statusBadgeOk {
	color: var(--text-color--info);
	background-color: var(--background--info);
}

.statusBadgeBad {
	color: var(--text-color--danger);
	background-color: var(--background--danger);
}

.statusBadgeMuted {
	color: var(--text-color--subtle);
	background-color: var(--background--hover);
}

.statOk {
	color: var(--text-color--info);
}

.statBad,
.noMetrics {
	color: var(--text-color--danger);
}

.runCases {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.runCase {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
}

.evalCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.evalHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.typeBadge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}

.badgeCheck {
	background-color: var(--background--hover);
	color: var(--text-color--subtle);
}

.badgeJudge {
	background-color: var(--background--hover);
	color: var(--text-color--subtle);
}

.credentialRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtler);
}

.keyIcon {
	flex-shrink: 0;
}

.dashedCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius);
}

@media (max-width: 900px) {
	.datasetStats,
	.runSetup {
		grid-template-columns: 1fr;
	}

	.suiteHeader,
	.metricRow {
		flex-direction: column;
	}

	.metricBadges {
		justify-content: flex-start;
	}

	.progressSteps {
		grid-template-columns: 1fr;
	}
}
</style>
