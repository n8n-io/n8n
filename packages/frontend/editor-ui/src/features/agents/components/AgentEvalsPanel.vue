<script setup lang="ts">
import type {
	AgentEvaluationDatasetResponse,
	AgentEvaluationRunCaseResult,
	AgentEvaluationSuiteDraft,
	AgentEvaluationSuiteRun,
} from '@n8n/api-types';
import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nIcon,
	N8nOption,
	N8nRadioButtons,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, ref, useCssModule, watch } from 'vue';

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
const style = useCssModule();

const dataset = ref<AgentEvaluationDatasetResponse | null>(null);
const suite = ref<AgentEvaluationSuiteDraft | null>(null);
const run = ref<AgentEvaluationSuiteRun | null>(null);
const completedRuns = ref<AgentEvaluationSuiteRun[]>([]);
const loading = ref(false);
const settingUpSuite = ref(false);
const runningSuite = ref(false);
type EvaluationPanelMode = 'view' | 'compare' | 'run';
const selectedEvaluationMode = ref<EvaluationPanelMode>('run');
const selectedCompletedRunId = ref<string | null>(null);
const compareBaseRunId = ref<string | null>(null);
const compareCandidateRunId = ref<string | null>(null);

const RUN_PROGRESS_STEPS = ['preparing', 'running', 'scoring', 'finalizing'] as const;
type RunProgressStep = (typeof RUN_PROGRESS_STEPS)[number];

const runProgressStep = ref<RunProgressStep | null>(null);
const runProgressTimers: number[] = [];

const evals = computed(() => props.schema?.evaluations ?? []);
const readiness = computed(() => dataset.value?.readiness ?? null);
const versions = computed(() => dataset.value?.versions ?? []);
const isReady = computed(() => readiness.value?.isReady === true);
const reviewedCases = computed(() => readiness.value?.reviewedCases ?? 0);
const minimumReviewedCases = computed(
	() => readiness.value?.minimumReviewedCases ?? AGENT_EVALUATION_MIN_REVIEWED_CASES,
);
const remainingCases = computed(
	() => readiness.value?.remainingCases ?? minimumReviewedCases.value,
);
const currentAgentVersionId = computed(
	() => dataset.value?.currentAgentVersionId || readiness.value?.agentVersionId || '',
);
const currentVersionLabel = computed(() =>
	currentAgentVersionId.value
		? getVersionLabel(currentAgentVersionId.value)
		: i18n.baseText('agents.builder.evaluations.version.versionLabel', {
				interpolate: { version: '-' },
			}),
);
const canRunSuite = computed(() => !runningSuite.value);
const modeOptions = computed<Array<{ label: string; value: EvaluationPanelMode }>>(() => [
	{ label: i18n.baseText('agents.builder.evaluations.mode.view'), value: 'view' },
	{ label: i18n.baseText('agents.builder.evaluations.mode.compare'), value: 'compare' },
	{ label: i18n.baseText('agents.builder.evaluations.mode.run'), value: 'run' },
]);
const selectedCompletedRun = computed(
	() =>
		completedRuns.value.find((completedRun) => completedRun.id === selectedCompletedRunId.value) ??
		null,
);
const displayedRun = computed(() => {
	if (selectedEvaluationMode.value === 'view') return selectedCompletedRun.value;
	if (selectedEvaluationMode.value === 'run') return run.value;
	return null;
});
const compareBaseRun = computed(
	() =>
		completedRuns.value.find((completedRun) => completedRun.id === compareBaseRunId.value) ?? null,
);
const compareCandidateRun = computed(
	() =>
		completedRuns.value.find((completedRun) => completedRun.id === compareCandidateRunId.value) ??
		null,
);
const hasSelectedCompareRuns = computed(
	() => compareBaseRun.value !== null && compareCandidateRun.value !== null,
);
const comparedRunsUseSameVersion = computed(
	() =>
		hasSelectedCompareRuns.value &&
		compareBaseRun.value?.agentVersionId === compareCandidateRun.value?.agentVersionId,
);
const canCompareRuns = computed(
	() => hasSelectedCompareRuns.value && !comparedRunsUseSameVersion.value,
);
const comparisonStats = computed(() => {
	const baseRun = compareBaseRun.value;
	const candidateRun = compareCandidateRun.value;
	if (!baseRun || !candidateRun || comparedRunsUseSameVersion.value) return [];

	const baseFailedCases = baseRun.summary.failedCases + baseRun.summary.errorCases;
	const candidateFailedCases = candidateRun.summary.failedCases + candidateRun.summary.errorCases;
	const passedDelta =
		percentage(candidateRun.summary.passedCases, candidateRun.summary.totalCases) -
		percentage(baseRun.summary.passedCases, baseRun.summary.totalCases);
	const failedDelta =
		percentage(candidateFailedCases, candidateRun.summary.totalCases) -
		percentage(baseFailedCases, baseRun.summary.totalCases);

	return [
		{
			id: 'averageScore',
			label: i18n.baseText('agents.builder.evaluations.compare.averageScore'),
			base: formatMetricScoreWithAbsolute(baseRun),
			candidate: formatMetricScoreWithAbsolute(candidateRun),
			delta: candidateRun.summary.averageScore - baseRun.summary.averageScore,
			deltaLabel: formatMetricScoreDelta(baseRun, candidateRun),
			lowerIsBetter: false,
		},
		{
			id: 'passed',
			label: i18n.baseText('agents.builder.evaluations.run.summary.passed'),
			base: formatCaseCountWithRate(baseRun.summary.passedCases, baseRun.summary.totalCases),
			candidate: formatCaseCountWithRate(
				candidateRun.summary.passedCases,
				candidateRun.summary.totalCases,
			),
			delta: passedDelta,
			deltaLabel: formatPercentAndCountDelta(
				passedDelta,
				candidateRun.summary.passedCases - baseRun.summary.passedCases,
			),
			lowerIsBetter: false,
		},
		{
			id: 'failed',
			label: i18n.baseText('agents.builder.evaluations.run.summary.failed'),
			base: formatCaseCountWithRate(baseFailedCases, baseRun.summary.totalCases),
			candidate: formatCaseCountWithRate(candidateFailedCases, candidateRun.summary.totalCases),
			delta: failedDelta,
			deltaLabel: formatPercentAndCountDelta(failedDelta, candidateFailedCases - baseFailedCases),
			lowerIsBetter: true,
		},
	];
});
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
		completedRuns.value = dataset.value.recentRuns;
		ensureRunSelections();
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
			{ agentVersionId: currentAgentVersionId.value || undefined },
		);
		if (dataset.value) {
			dataset.value = {
				...dataset.value,
				currentAgentVersionId: response.currentAgentVersionId,
				versions: response.versions,
				readiness: response.readiness,
			};
		}
		suite.value = response.suite;
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
	runningSuite.value = true;
	run.value = null;
	startRunProgress();
	try {
		const response = await runAgentEvaluationSuite(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			{
				agentVersionId: currentAgentVersionId.value || undefined,
			},
		);
		runProgressStep.value = 'finalizing';
		if (dataset.value) {
			dataset.value = {
				...dataset.value,
				currentAgentVersionId: response.currentAgentVersionId,
				versions: response.versions,
				readiness: response.readiness,
			};
		}
		run.value = response.run;
		if (response.run) rememberRun(response.run);
		if (response.run) {
			ensureRunSelections();
		} else {
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

function formatScoreDelta(delta: number) {
	const percentagePoints = Math.round(delta * 100);
	return `${percentagePoints > 0 ? '+' : ''}${percentagePoints}%`;
}

function formatSignedInteger(value: number) {
	return `${value > 0 ? '+' : ''}${value}`;
}

function formatSignedDecimal(value: number) {
	const rounded = Math.round(value * 10) / 10;
	return `${rounded > 0 ? '+' : ''}${formatAbsoluteNumber(rounded)}`;
}

function formatAbsoluteNumber(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function percentage(value: number, total: number) {
	return total > 0 ? value / total : 0;
}

function formatCaseCountWithRate(value: number, total: number) {
	return `${formatScore(percentage(value, total))} (${value}/${total})`;
}

function formatMetricScoreWithAbsolute(completedRun: AgentEvaluationSuiteRun) {
	const total = metricScoreTotal(completedRun);
	const score = metricScorePoints(completedRun);
	return `${formatScore(completedRun.summary.averageScore)} (${formatAbsoluteNumber(score)}/${total})`;
}

function formatMetricScoreDelta(
	baseRun: AgentEvaluationSuiteRun,
	candidateRun: AgentEvaluationSuiteRun,
) {
	return formatPercentAndDecimalDelta(
		candidateRun.summary.averageScore - baseRun.summary.averageScore,
		metricScorePoints(candidateRun) - metricScorePoints(baseRun),
	);
}

function formatPercentAndCountDelta(percentDelta: number, countDelta: number) {
	return `${formatScoreDelta(percentDelta)} (${formatSignedInteger(countDelta)})`;
}

function formatPercentAndDecimalDelta(percentDelta: number, valueDelta: number) {
	return `${formatScoreDelta(percentDelta)} (${formatSignedDecimal(valueDelta)})`;
}

function metricScorePoints(completedRun: AgentEvaluationSuiteRun) {
	return completedRun.cases.reduce(
		(total, result) =>
			total + result.metrics.reduce((metricTotal, metric) => metricTotal + metric.score, 0),
		0,
	);
}

function metricScoreTotal(completedRun: AgentEvaluationSuiteRun) {
	return completedRun.cases.reduce((total, result) => total + result.metrics.length, 0);
}

function formatRunDate(date: string) {
	return new Date(date).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
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

function getProgressStepLabel(step: RunProgressStep) {
	return i18n.baseText(`agents.builder.evaluations.run.progress.${step}`);
}

function shortVersion(agentVersionId: string) {
	return agentVersionId.slice(0, 8);
}

function getVersionLabel(agentVersionId: string) {
	const version = versions.value.find((item) => item.agentVersionId === agentVersionId);
	const shortCode = shortVersion(agentVersionId);
	if (version?.isCurrent && version.isPublished) {
		return i18n.baseText('agents.builder.evaluations.version.currentPublished', {
			interpolate: { version: shortCode },
		});
	}
	if (version?.isCurrent) {
		return i18n.baseText('agents.builder.evaluations.version.current', {
			interpolate: { version: shortCode },
		});
	}
	if (version?.isPublished) {
		return i18n.baseText('agents.builder.evaluations.version.published', {
			interpolate: { version: shortCode },
		});
	}

	return i18n.baseText('agents.builder.evaluations.version.versionLabel', {
		interpolate: { version: shortCode },
	});
}

function getRunLabel(completedRun: AgentEvaluationSuiteRun) {
	return i18n.baseText('agents.builder.evaluations.compare.runOption', {
		interpolate: {
			version: getVersionLabel(completedRun.agentVersionId),
			date: formatRunDate(completedRun.completedAt),
		},
	});
}

function setEvaluationMode(mode: string) {
	if (mode !== 'view' && mode !== 'compare' && mode !== 'run') return;
	selectedEvaluationMode.value = mode;
	ensureRunSelections();
}

function setCompletedRun(runId: string) {
	selectedCompletedRunId.value = runId;
}

function setCompareBaseRun(runId: string) {
	compareBaseRunId.value = runId;
}

function setCompareCandidateRun(runId: string) {
	compareCandidateRunId.value = runId;
}

function rememberRun(completedRun: AgentEvaluationSuiteRun) {
	completedRuns.value = [
		completedRun,
		...completedRuns.value.filter((existingRun) => existingRun.id !== completedRun.id),
	].slice(0, 8);

	if (!selectedCompletedRunId.value) selectedCompletedRunId.value = completedRun.id;
	if (!compareBaseRunId.value) compareBaseRunId.value = completedRun.id;

	if (compareBaseRunId.value !== completedRun.id) {
		compareCandidateRunId.value = completedRun.id;
	}
}

function ensureRunSelections() {
	if (
		!selectedCompletedRunId.value ||
		!completedRuns.value.some((completedRun) => completedRun.id === selectedCompletedRunId.value)
	) {
		selectedCompletedRunId.value = completedRuns.value[0]?.id ?? null;
	}
	if (!compareBaseRunId.value) compareBaseRunId.value = completedRuns.value[0]?.id ?? null;
	if (!compareCandidateRunId.value)
		compareCandidateRunId.value = completedRuns.value[1]?.id ?? null;
}

function getComparisonDeltaClass(stat: { delta: number; lowerIsBetter: boolean }) {
	if (stat.delta === 0) return style.statusBadgeMuted;
	const isImprovement = stat.lowerIsBetter ? stat.delta < 0 : stat.delta > 0;
	return isImprovement ? style.statusBadgeOk : style.statusBadgeBad;
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
	() => {
		completedRuns.value = [];
		selectedCompletedRunId.value = null;
		compareBaseRunId.value = null;
		compareCandidateRunId.value = null;
		void loadDataset();
	},
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
			<div :class="$style.modeBar">
				<N8nRadioButtons
					:model-value="selectedEvaluationMode"
					:options="modeOptions"
					data-testid="agent-evaluations-mode"
					@update:model-value="setEvaluationMode"
				/>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('agents.builder.evaluations.version.currentRunOnly', {
							interpolate: { version: currentVersionLabel },
						})
					}}
				</N8nText>
			</div>

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

			<N8nCard
				v-if="selectedEvaluationMode === 'view'"
				:class="$style.runCard"
				data-testid="agent-evaluations-view-run"
			>
				<div :class="$style.suiteHeader">
					<div :class="$style.readinessCopy">
						<N8nText :bold="true">
							{{ i18n.baseText('agents.builder.evaluations.view.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.view.description') }}
						</N8nText>
					</div>
				</div>
				<label v-if="completedRuns.length > 0" :class="$style.versionField">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.evaluations.view.run') }}
					</N8nText>
					<N8nSelect
						:model-value="selectedCompletedRunId"
						size="small"
						data-testid="agent-evaluations-view-run-select"
						@update:model-value="setCompletedRun"
					>
						<N8nOption
							v-for="completedRun in completedRuns"
							:key="completedRun.id"
							:value="completedRun.id"
							:label="getRunLabel(completedRun)"
						/>
					</N8nSelect>
				</label>
				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('agents.builder.evaluations.view.empty') }}
				</N8nText>
			</N8nCard>

			<N8nCard
				v-if="selectedEvaluationMode === 'run' && suite"
				:class="$style.suiteCard"
				data-testid="agent-evaluations-suite"
			>
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
					<div
						v-for="metric in suite.metrics"
						:key="metric.id"
						:class="$style.metricRow"
						data-testid="agent-evaluations-suite-metric"
					>
						<div :class="$style.metricCopy">
							<N8nText :bold="true" size="small">{{ metric.name }}</N8nText>
							<N8nText size="small" color="text-light">{{ metric.description }}</N8nText>
						</div>
						<div :class="$style.metricBadges">
							<N8nBadge theme="secondary" size="small">
								{{
									metric.type === 'check'
										? i18n.baseText('agents.builder.evaluations.type.check')
										: i18n.baseText('agents.builder.evaluations.type.judge')
								}}
							</N8nBadge>
							<span :class="[$style.statusBadge, $style.statusBadgeOk]">
								{{ i18n.baseText('agents.builder.evaluations.suite.metric.required') }}
							</span>
						</div>
					</div>
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

			<N8nCard
				v-if="displayedRun"
				:class="$style.runCard"
				data-testid="agent-evaluations-run-results"
			>
				<div :class="$style.suiteHeader">
					<div :class="$style.readinessCopy">
						<N8nText :bold="true">
							{{ i18n.baseText('agents.builder.evaluations.run.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.description') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('agents.builder.evaluations.run.version', {
									interpolate: { version: getVersionLabel(displayedRun.agentVersionId) },
								})
							}}
						</N8nText>
					</div>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('agents.builder.evaluations.run.averageScore', {
								interpolate: { score: formatScore(displayedRun.summary.averageScore) },
							})
						}}
					</N8nText>
				</div>

				<div :class="$style.datasetStats">
					<div :class="$style.datasetStat">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.summary.total') }}
						</N8nText>
						<N8nText :bold="true">{{ displayedRun.summary.totalCases }}</N8nText>
					</div>
					<div :class="$style.datasetStat">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.summary.passed') }}
						</N8nText>
						<N8nText :bold="true" :class="$style.statOk">{{
							displayedRun.summary.passedCases
						}}</N8nText>
					</div>
					<div :class="$style.datasetStat">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.run.summary.failed') }}
						</N8nText>
						<N8nText :bold="true" :class="$style.statBad">{{
							displayedRun.summary.failedCases + displayedRun.summary.errorCases
						}}</N8nText>
					</div>
				</div>

				<div v-if="displayedRun.warnings.length > 0" :class="$style.warningList">
					<N8nText
						v-for="warning in displayedRun.warnings"
						:key="warning"
						size="small"
						color="text-light"
					>
						{{ warning }}
					</N8nText>
				</div>

				<div :class="$style.runCases">
					<div
						v-for="result in displayedRun.cases"
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

			<N8nCard
				v-if="selectedEvaluationMode === 'compare'"
				:class="$style.compareCard"
				data-testid="agent-evaluations-compare-runs"
			>
				<div :class="$style.suiteHeader">
					<div :class="$style.readinessCopy">
						<N8nText :bold="true">
							{{ i18n.baseText('agents.builder.evaluations.compare.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.compare.description') }}
						</N8nText>
					</div>
				</div>

				<div v-if="completedRuns.length >= 2" :class="$style.compareControls">
					<label :class="$style.versionField">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('agents.builder.evaluations.compare.baseRun') }}
						</N8nText>
						<N8nSelect
							:model-value="compareBaseRunId"
							size="small"
							data-testid="agent-evaluations-compare-base"
							@update:model-value="setCompareBaseRun"
						>
							<N8nOption
								v-for="completedRun in completedRuns"
								:key="completedRun.id"
								:value="completedRun.id"
								:label="getRunLabel(completedRun)"
							/>
						</N8nSelect>
					</label>

					<label :class="$style.versionField">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('agents.builder.evaluations.compare.candidateRun') }}
						</N8nText>
						<N8nSelect
							:model-value="compareCandidateRunId"
							size="small"
							data-testid="agent-evaluations-compare-candidate"
							@update:model-value="setCompareCandidateRun"
						>
							<N8nOption
								v-for="completedRun in completedRuns"
								:key="completedRun.id"
								:value="completedRun.id"
								:label="getRunLabel(completedRun)"
							/>
						</N8nSelect>
					</label>
				</div>

				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('agents.builder.evaluations.compare.empty') }}
				</N8nText>

				<N8nText v-if="comparedRunsUseSameVersion" size="small" :class="$style.noMetrics">
					{{ i18n.baseText('agents.builder.evaluations.compare.sameVersion') }}
				</N8nText>

				<div v-if="canCompareRuns" :class="$style.comparisonStats">
					<div v-for="stat in comparisonStats" :key="stat.id" :class="$style.comparisonStat">
						<N8nText size="small" color="text-light">{{ stat.label }}</N8nText>
						<div :class="$style.comparisonValues">
							<N8nText :bold="true">{{ stat.base }}</N8nText>
							<N8nIcon icon="arrow-right" :size="14" />
							<N8nText :bold="true">{{ stat.candidate }}</N8nText>
						</div>
						<span
							:class="[$style.statusBadge, getComparisonDeltaClass(stat)]"
							data-testid="agent-evaluations-compare-delta"
						>
							{{ stat.deltaLabel }}
						</span>
					</div>
				</div>
			</N8nCard>

			<div v-if="selectedEvaluationMode === 'run' && !suite" :class="$style.dashedCard">
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

.modeBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.suiteCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.runCard,
.compareCard {
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

.versionField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 14rem;
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

.compareControls {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.comparisonStats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.comparisonStat {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
}

.comparisonValues {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
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
	.runSetup,
	.compareControls,
	.comparisonStats {
		grid-template-columns: 1fr;
	}

	.suiteHeader,
	.modeBar,
	.metricRow {
		flex-direction: column;
	}

	.modeBar {
		align-items: flex-start;
	}

	.metricBadges {
		justify-content: flex-start;
	}

	.progressSteps {
		grid-template-columns: 1fr;
	}
}
</style>
