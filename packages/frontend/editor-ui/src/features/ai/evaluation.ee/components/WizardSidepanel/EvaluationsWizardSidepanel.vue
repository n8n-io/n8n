<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import { useTelemetry } from '@/app/composables/useTelemetry';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';
import {
	extractAnswerText,
	formatMetricAverage,
	formatMetricLabel,
	formatMetricPercent,
	getMetricCategory,
	getUserDefinedMetricNames,
	type ResultCheck,
} from '../../evaluation.utils';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import {
	CANNED_METRICS,
	LLM_JUDGE_METRIC_KEYS,
	BUILTIN_PRIMARY_CHECK_KEY,
	BUILTIN_MORE_CHECK_KEYS,
	getExpectedFieldsForMetrics,
	type CannedMetricKey,
} from '../../evaluation.constants';
import { useSliceInputs } from '../../composables/useSliceInputs';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import { useRunEvalWorkflow } from '../../composables/useRunEvalWorkflow';
import { useDefaultJudgeSelection } from '../../composables/useDefaultJudgeSelection';
import { useWizardPersistence } from './useWizardPersistence';
import { useWizardHydration } from './useWizardHydration';
import CheckCard from './CheckCard.vue';
import CheckResultCard from './CheckResultCard.vue';
import ResultsCaseRow from './ResultsCaseRow.vue';
import TestCaseForm from './TestCaseForm.vue';
import SystemSelector from './SystemSelector.vue';
import CustomCheckModal from './CustomCheckModal.vue';
import { VIEWS } from '@/app/constants/navigation';

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const workflowDocumentStore = injectWorkflowDocumentStore();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();
const evaluationStore = useEvaluationStore();

const {
	activeStep,
	selectedMetricKeys,
	judgeSelectionByMetric,
	aiNodeName,
	isSliceMode,
	startNodeName,
	endNodeName,
	inputs,
	expectedValues,
	datasetExpectedByRow,
	customChecks,
} = storeToRefs(wizardStore);

const cannedMetrics = computed(() => CANNED_METRICS);
const aiRootNodes = useAiRootNodes();
const defaultJudgeSelection = useDefaultJudgeSelection();
const { runWorkflow } = useRunEvalWorkflow();

// Checks step: Correctness is always shown; the remaining built-ins are revealed
// behind "Explore more checks". Auto-open if a hidden built-in is already selected
// (e.g. a hydrated config), so a selected check is never invisible.
const showMoreChecks = ref(false);
const primaryCheckMetric = computed(() =>
	CANNED_METRICS.find((m) => m.key === BUILTIN_PRIMARY_CHECK_KEY),
);
const moreCheckMetrics = computed(() =>
	CANNED_METRICS.filter((m) => BUILTIN_MORE_CHECK_KEYS.includes(m.key)),
);
const visibleCheckMetrics = computed(() => {
	const primary = primaryCheckMetric.value ? [primaryCheckMetric.value] : [];
	return showMoreChecks.value ? [...primary, ...moreCheckMetrics.value] : primary;
});
watch(
	[selectedMetricKeys, customChecks],
	([keys, checks]) => {
		if (showMoreChecks.value) return;
		const hasHiddenBuiltin = keys.some((k) => BUILTIN_MORE_CHECK_KEYS.includes(k));
		if (hasHiddenBuiltin || checks.length > 0) {
			showMoreChecks.value = true;
		}
	},
	{ immediate: true },
);

// Watching judgeSelectionByMetric so a hydrate that drops some keys still
// triggers a re-seed of the rest.
watch(
	[() => wizardStore.isOpen, defaultJudgeSelection, judgeSelectionByMetric],
	([isOpen, defaultSelection, currentSelections]) => {
		if (!isOpen || !defaultSelection) return;
		for (const key of LLM_JUDGE_METRIC_KEYS) {
			if (currentSelections[key]) continue;
			wizardStore.setJudgeSelection(key, defaultSelection);
		}
	},
	{ immediate: true },
);

// Gate (ticket "Step 0"): the wizard is blocked until the workflow has had at
// least one successful, non-evaluation execution. `probeComplete` guards against
// flashing the gate before the execution lookup resolves.
const probeComplete = ref(false);

async function runExecutionProbe() {
	try {
		await Promise.all([
			Promise.resolve(workflowsStore.fetchLastSuccessfulExecution()),
			loadFallbackUserExecution(),
		]);
	} finally {
		probeComplete.value = true;
	}
}

watch(
	[activeStep, aiRootNodes],
	([step, nodes]) => {
		if (step !== 0 && step !== 2) return;
		void runExecutionProbe();
		if (wizardStore.aiNodeName) return;
		const first = nodes[0];
		if (first) wizardStore.setAiNodeName(first.name);
	},
	{ immediate: true },
);

// True once the workflow has a usable successful execution to seed inputs from.
const hasRun = computed(() => sliceInputs.value.hasExecution);
// An eval that already has a run (pinned this session, restored on reload, or
// reached via "Edit evals") is past the first-run gate — editing it must never
// be re-blocked, regardless of what executions are currently detectable.
const isExistingEval = computed(() => wizardStore.activeRunId !== null);
// The gate only guards first-time authoring. The results step (3) and any
// existing eval bypass it (each has its own loading/empty handling).
const showGate = computed(
	() => probeComplete.value && !hasRun.value && activeStep.value !== 3 && !isExistingEval.value,
);
const showProbeLoading = computed(
	() => !hasRun.value && !probeComplete.value && activeStep.value !== 3 && !isExistingEval.value,
);

// Skip evaluation runs — after a few wizard sessions, lastSuccessfulExecution
// would always be the compiled eval workflow, not the user's graph.
async function loadFallbackUserExecution() {
	const workflowId = workflowDocumentStore.value?.workflowId;
	if (!workflowId) return;
	try {
		const list = await executionsStore.fetchExecutions({
			status: ['success'],
			workflowId,
		});
		const candidate = list.results.find((e) => e.mode !== 'evaluation' && typeof e.id === 'string');
		if (!candidate?.id) {
			fallbackUserExecution.value = null;
			return;
		}
		const full = await executionsStore.fetchExecution(candidate.id);
		fallbackUserExecution.value = full ?? null;
	} catch {
		fallbackUserExecution.value = null;
	}
}

const fallbackUserExecution = ref<IExecutionResponse | null>(null);
const sliceInputs = useSliceInputs({ fallbackExecution: fallbackUserExecution });
const expectedFields = computed(() => getExpectedFieldsForMetrics(selectedMetricKeys.value));

watch(
	sliceInputs,
	({ values, fieldNames }) => {
		if (fieldNames.length === 0) return;
		wizardStore.seedInputs(values);
	},
	{ immediate: true },
);

const { persistAndDispatch, isPersisting } = useWizardPersistence();
const { hydrate } = useWizardHydration();

// Hydrate from the latest persisted EvaluationConfig whenever the wizard is
// opened — the store's `open()` resets state first, so this safely overrides
// the empty defaults without clobbering anything the user has already typed.
// Also reset + re-hydrate on a genuine workflow switch so prior-workflow
// selections do not leak into the new workflow's pane.
// Errors inside `hydrate` are swallowed by the composable (it toasts) so we
// don't need to handle them here.

// Local mirror of n8n-core PLACEHOLDER_EMPTY_WORKFLOW_ID (frontend can't import n8n-core).
const NEW_WORKFLOW_ID = '__EMPTY__';
watch(
	() => [wizardStore.isOpen, workflowDocumentStore.value?.workflowId] as const,
	([isOpen]) => {
		const id = workflowDocumentStore.value?.workflowId;
		// Compare against the store-persisted last workflow id rather than the
		// watcher's previous value: the pane unmounts when the focus panel closes
		// between workflows, so on remount the watcher has no previous value and
		// would otherwise miss the switch (leaving a prior run's results visible).
		const prevId = wizardStore.lastWorkflowId;
		// Reset only on a genuine switch between saved workflows. Skip the
		// new→saved id transition (prevId placeholder/empty) so a user's
		// in-progress selections on a brand-new workflow aren't wiped on save.
		if (prevId && prevId !== NEW_WORKFLOW_ID && id && id !== prevId) {
			wizardStore.reset();
		}
		if (id) wizardStore.setLastWorkflowId(id);
		if (isOpen) void hydrate();
	},
	{ immediate: true },
);

const runs = computed(() => {
	const id = workflowDocumentStore.value.workflowId;
	return Object.values(evaluationStore.testRunsById ?? {}).filter(
		({ workflowId }) => workflowId === id,
	);
});

// Pin to the run dispatched by THIS session via activeRunId; "newest in map"
// would flash an older run between step transition and the new run arriving.
const latestRun = computed(() => {
	const pinnedId = wizardStore.activeRunId;
	if (pinnedId) return evaluationStore.testRunsById?.[pinnedId];
	return runs.value[runs.value.length - 1];
});

// All cases for the active run, ordered by their position in the dataset.
const latestRunCases = computed<TestCaseExecutionRecord[]>(() => {
	const runId = latestRun.value?.id;
	if (!runId) return [];
	return Object.values(evaluationStore.testCaseExecutionsById ?? {})
		.filter((c) => c.testRunId === runId)
		.sort((a, b) => (a.runIndex ?? 0) - (b.runIndex ?? 0));
});

// The checks rendered on the results page, derived from the run's metric keys so
// canned and custom checks are handled uniformly. AI-judged checks show an
// average %; the rest are pass/fail.
const resultChecks = computed<ResultCheck[]>(() => {
	const metrics = latestRun.value?.metrics;
	if (!metrics) return [];
	return getUserDefinedMetricNames(metrics).map((key) => {
		const canned = CANNED_METRICS.find((m) => m.key === key);
		return {
			key,
			label: canned ? locale.baseText(canned.labelKey) : formatMetricLabel(key),
			description: canned ? locale.baseText(canned.descriptionKey) : undefined,
			isAiJudged: getMetricCategory(key) === 'aiBased',
			// Mirror the Step-2 check tile; custom checks fall back to the code icon.
			icon: canned?.icon ?? 'code',
			iconBg: canned?.tileBg,
			iconFg: canned?.tileFg,
		};
	});
});

const sliceEndNodeName = computed(
	() => (wizardStore.isSliceMode ? wizardStore.endNodeName : wizardStore.aiNodeName) || '',
);

// The expected-output values for a case, taken from the dataset row at the
// case's `runIndex` (rows are seeded one-per-row in order). Falls back to the
// Step-2 first-row values when the per-row data isn't hydrated.
function caseExpectedValues(testCase: TestCaseExecutionRecord): Record<string, string> {
	const index = testCase.runIndex ?? 0;
	return datasetExpectedByRow.value[index] ?? expectedValues.value;
}

const executionsByCaseId = ref<Record<string, IExecutionResponse | null>>({});

// The AI's answer for a case: the end node's output during the test run,
// stripped of its JSON envelope (output > text > response > …). Falls back to
// the case's persisted `outputs` only when the execution isn't loaded.
function caseAnswer(testCase: TestCaseExecutionRecord): string {
	const execution = executionsByCaseId.value[testCase.id];
	const endName = sliceEndNodeName.value;
	if (execution && endName) {
		const firstItem =
			execution.data?.resultData?.runData?.[endName]?.[0]?.data?.main?.[0]?.[0]?.json;
		if (firstItem !== undefined) return extractAnswerText(firstItem);
	}
	return extractAnswerText(testCase.outputs);
}

async function loadExecutionForCase(caseId: string, executionId: string) {
	if (caseId in executionsByCaseId.value) return;
	executionsByCaseId.value = { ...executionsByCaseId.value, [caseId]: null };
	try {
		const execution = await executionsStore.fetchExecution(executionId);
		executionsByCaseId.value = {
			...executionsByCaseId.value,
			[caseId]: execution ?? null,
		};
	} catch (error) {
		console.warn('[evaluations wizard] failed to load case execution', error);
	}
}

// Prefetch each case's full execution so caseAnswer can fall back to the
// end-node output when a case has no persisted `outputs`.
watch(
	latestRunCases,
	(cases) => {
		for (const c of cases) {
			if (c.executionId) void loadExecutionForCase(c.id, c.executionId);
		}
	},
	{ immediate: true },
);

// On reload/hot-nav into step 4 (results), the store's run poller never ran — fetch
// case executions here so the output block isn't stuck empty.
watch(
	[activeStep, latestRun],
	([step, run]) => {
		if (step !== 3 || !run) return;
		if (['new', 'running'].includes(run.status)) return;
		const workflowId = workflowDocumentStore.value?.workflowId;
		if (!workflowId) return;
		void evaluationStore.fetchTestCaseExecutions({ workflowId, runId: run.id });
	},
	{ immediate: true },
);
const isRunning = computed(() =>
	latestRun.value ? ['new', 'running'].includes(latestRun.value.status) : false,
);
const showLoadingState = computed(
	() => isRunning.value || (activeStep.value === 3 && !latestRun.value),
);

// Fire once per run when the results step settles on a finished run, so the
// "view detailed results" navigation isn't the only signal that a user saw
// their scores inline. Deduped by run id so the watcher re-firing (poll
// updates, case prefetch) doesn't emit repeats.
const trackedResultsRunId = ref<string | null>(null);
watch(
	[activeStep, latestRun, showLoadingState],
	([step, run, loading]) => {
		if (step !== 3 || loading || !run || trackedResultsRunId.value === run.id) return;
		trackedResultsRunId.value = run.id;
		telemetry.track('User viewed evaluation results', {
			workflow_id: workflowDocumentStore.value?.workflowId,
			run_id: run.id,
			test_case_count: latestRunCases.value.length,
			metric_count: getUserDefinedMetricNames(run.metrics).length,
		});
	},
	{ immediate: true },
);

// Per-step metadata, indexed by activeStep (0-3); WizardStep is constrained to those values.
const STEP_META = [
	{
		telemetryName: 'choose_system',
		title: 'evaluations.wizardSidepanel.step.chooseSystem.title',
		description: 'evaluations.wizardSidepanel.step.chooseSystem.description',
	},
	{
		telemetryName: 'setup_scorers',
		title: 'evaluations.wizardSidepanel.step.setupChecks.title',
		description: 'evaluations.wizardSidepanel.step.setupChecks.description',
	},
	{
		telemetryName: 'add_test_cases',
		title: 'evaluations.wizardSidepanel.step.addTestCases.title',
		description: 'evaluations.wizardSidepanel.step.addTestCases.description',
	},
	{
		telemetryName: 'results',
		title: 'evaluations.wizardSidepanel.step.results.title',
		description: 'evaluations.wizardSidepanel.step.results.description',
	},
] as const;

// Emit a view event when a step's content is shown (not while gated/loading).
// Deduped per step, reset on close, so revisiting a step doesn't re-fire.
const trackedSteps = new Set<number>();
watch(
	[() => wizardStore.isOpen, activeStep, showGate, showProbeLoading],
	([isOpen, step, gated, loading]) => {
		if (!isOpen) {
			trackedSteps.clear();
			return;
		}
		if (gated || loading || trackedSteps.has(step)) return;
		trackedSteps.add(step);
		telemetry.track('User viewed evaluation config wizard step', {
			workflow_id: workflowDocumentStore.value?.workflowId,
			step_name: STEP_META[step].telemetryName,
			step_index: step + 1,
		});
	},
	{ immediate: true },
);

// step0Complete: system chosen (node or slice)
const step0Complete = computed(() => {
	if (isSliceMode.value) {
		return Boolean(startNodeName.value && endNodeName.value);
	}
	return Boolean(aiNodeName.value);
});

// step1Complete: at least one check selected, with judge selection for any LLM-judge metric
const step1Complete = computed(() => {
	if (selectedMetricKeys.value.length === 0 && customChecks.value.length === 0) return false;
	for (const key of selectedMetricKeys.value) {
		if (LLM_JUDGE_METRIC_KEYS.has(key) && !judgeSelectionByMetric.value[key]) return false;
	}
	return true;
});

// step2Complete: has execution + all inputs + all expected values filled
const step2Complete = computed(() => {
	if (!sliceInputs.value.hasExecution) return false;
	const inputsFilled = sliceInputs.value.fieldNames.every(
		(name) => (inputs.value[name] ?? '').length > 0,
	);
	const expectedFilled = expectedFields.value.every(
		(f) => (expectedValues.value[f.name] ?? '').length > 0,
	);
	return inputsFilled && expectedFilled;
});

// LLM-judge metrics carry an "AI-judged" badge. The judge model itself is
// auto-selected from the workflow's own chat-model sub-node (see
// useDefaultJudgeSelection) — there is no manual picker in the wizard.
function isLlmJudgeMetric(key: CannedMetricKey): boolean {
	return LLM_JUDGE_METRIC_KEYS.has(key);
}

const titleKey = computed(() => STEP_META[activeStep.value].title);
const descriptionKey = computed(() => STEP_META[activeStep.value].description);

async function handleNext() {
	const current = activeStep.value;
	if (current === 0) {
		wizardStore.goNext();
		return;
	}
	if (current === 1) {
		wizardStore.goNext();
		return;
	}
	if (current === 2) {
		const ok = await persistAndDispatch('initial');
		if (!ok) return;
		wizardStore.goNext();
	}
}

function handleCancel() {
	wizardStore.close();
}

function handleBack() {
	wizardStore.goBack();
}

async function handleRunAgain() {
	await persistAndDispatch('run_again');
}

function handleViewResults() {
	const runId = wizardStore.activeRunId ?? latestRun.value?.id;
	const workflowId = workflowDocumentStore.value?.workflowId;
	if (runId && workflowId) {
		void router.push({
			name: VIEWS.EVALUATION_RUNS_DETAIL,
			params: { workflowId, runId },
		});
	}
	wizardStore.close();
}
</script>

<template>
	<div :class="$style.sidepanel" data-test-id="evaluations-wizard-sidepanel">
		<div
			v-if="showProbeLoading"
			:class="$style.gate"
			data-test-id="evaluations-wizard-sidepanel-probe-loading"
		>
			<N8nIcon icon="spinner" size="medium" :spin="true" />
		</div>

		<div v-else-if="showGate" :class="$style.gate" data-test-id="evaluations-wizard-sidepanel-gate">
			<N8nIcon icon="info" size="large" :class="$style.gateIcon" />
			<N8nText size="small" color="text-base" :class="$style.gateMessage">
				{{ locale.baseText('evaluations.wizardSidepanel.gate.message') }}
			</N8nText>
			<N8nButton
				size="small"
				type="button"
				data-test-id="evaluations-wizard-sidepanel-gate-run"
				@click="runWorkflow"
			>
				{{ locale.baseText('evaluations.wizardSidepanel.step.addTestCases.runButton') }}
			</N8nButton>
		</div>

		<template v-else>
			<div :class="$style.progressBar" data-test-id="evaluations-wizard-sidepanel-progress">
				<div
					v-for="step in 4"
					:key="step"
					:class="[
						$style.progressSegment,
						activeStep >= step - 1 ? $style.progressSegmentActive : null,
					]"
				></div>
			</div>

			<header :class="$style.header">
				<N8nText tag="h2" size="large" color="text-dark" bold :class="$style.title">
					{{ locale.baseText(titleKey) }}
				</N8nText>
				<N8nText size="small" color="text-base" :class="$style.description">
					{{ locale.baseText(descriptionKey) }}
				</N8nText>
			</header>

			<div :class="$style.body">
				<section v-if="activeStep === 0" :class="$style.section">
					<SystemSelector />
				</section>

				<section v-if="activeStep === 1" :class="$style.section">
					<ul :class="$style.checkList">
						<li v-for="metric in visibleCheckMetrics" :key="metric.key">
							<CheckCard
								:icon="metric.icon"
								:icon-bg="metric.tileBg"
								:icon-fg="metric.tileFg"
								:title="locale.baseText(metric.labelKey)"
								:description="locale.baseText(metric.descriptionKey)"
								:badge="
									isLlmJudgeMetric(metric.key)
										? locale.baseText('evaluations.wizardSidepanel.metric.judgeTag')
										: undefined
								"
								:badge-icon="isLlmJudgeMetric(metric.key) ? 'wand-sparkles' : undefined"
								:selected="selectedMetricKeys.includes(metric.key)"
								:data-test-id="`evaluations-wizard-sidepanel-metric-${metric.key}`"
								@toggle="wizardStore.toggleMetric(metric.key)"
							/>
						</li>

						<li
							v-if="!showMoreChecks"
							:class="[$style.addCard]"
							role="button"
							tabindex="0"
							data-test-id="evaluations-wizard-sidepanel-explore-more-checks"
							@click="showMoreChecks = true"
							@keydown.enter.prevent="showMoreChecks = true"
							@keydown.space.prevent="showMoreChecks = true"
						>
							<span :class="$style.addCardIcon">
								<N8nIcon icon="plus" size="small" />
							</span>
							<N8nText size="small" color="text-base">
								{{ locale.baseText('evaluations.wizardSidepanel.step1.exploreMoreChecks') }}
							</N8nText>
						</li>

						<!-- Custom checks (and the affordance to add one) appear only after
							the user expands "Explore more checks". -->
						<template v-if="showMoreChecks">
							<li v-for="check in customChecks" :key="check.id">
								<CheckCard
									icon="code"
									:title="check.name"
									:badge="locale.baseText('evaluations.wizardSidepanel.customCheck.expressionTag')"
									:selected="true"
									:removable="true"
									:remove-aria-label="
										locale.baseText('evaluations.wizardSidepanel.customCheck.remove')
									"
									:data-test-id="`evaluations-wizard-sidepanel-custom-check-${check.id}`"
									:remove-test-id="`evaluations-wizard-sidepanel-custom-check-remove-${check.id}`"
									@remove="wizardStore.removeCustomCheck(check.id)"
								/>
							</li>

							<li
								:class="[$style.addCard]"
								role="button"
								tabindex="0"
								data-test-id="evaluations-wizard-sidepanel-new-custom-check"
								@click="wizardStore.openCustomCheckModal()"
								@keydown.enter.prevent="wizardStore.openCustomCheckModal()"
								@keydown.space.prevent="wizardStore.openCustomCheckModal()"
							>
								<span :class="$style.addCardIcon">
									<N8nIcon icon="plus" size="small" />
								</span>
								<N8nText size="small" color="text-base">
									{{ locale.baseText('evaluations.wizardSidepanel.step1.newCustomCheck') }}
								</N8nText>
							</li>
						</template>
					</ul>
				</section>

				<section v-if="activeStep === 2" :class="$style.section">
					<TestCaseForm :slice-inputs="sliceInputs" />
				</section>

				<section v-if="activeStep === 3" :class="$style.section">
					<div
						v-if="showLoadingState"
						:class="$style.runningState"
						data-test-id="evaluations-wizard-sidepanel-running"
					>
						<N8nIcon icon="spinner" size="medium" :spin="true" />
						<N8nText size="small" color="text-base">
							{{ locale.baseText('evaluations.wizardSidepanel.step3.running') }}
						</N8nText>
					</div>
					<ul
						v-if="showLoadingState"
						:class="$style.checkList"
						data-test-id="evaluations-wizard-sidepanel-loading-skeletons"
					>
						<li
							v-for="metric in cannedMetrics.filter((m) => selectedMetricKeys.includes(m.key))"
							:key="`skeleton-${metric.key}`"
						>
							<CheckResultCard
								:icon="metric.icon"
								:icon-bg="metric.tileBg"
								:icon-fg="metric.tileFg"
								:title="locale.baseText(metric.labelKey)"
								:badge="
									isLlmJudgeMetric(metric.key)
										? locale.baseText('evaluations.wizardSidepanel.metric.judgeTag')
										: undefined
								"
								:badge-icon="isLlmJudgeMetric(metric.key) ? 'wand-sparkles' : undefined"
								:category="metric.category"
								:loading="true"
								:loading-label="locale.baseText('evaluations.wizardSidepanel.step3.scoring')"
							/>
						</li>
					</ul>

					<div
						v-if="latestRun && !showLoadingState"
						:class="$style.results"
						data-test-id="evaluations-wizard-sidepanel-results"
					>
						<ul :class="$style.checkList">
							<li v-for="check in resultChecks" :key="check.key">
								<CheckResultCard
									:icon="check.icon"
									:icon-bg="check.iconBg"
									:icon-fg="check.iconFg"
									:title="check.label"
									:description="check.description"
									:badge="
										check.isAiJudged
											? locale.baseText('evaluations.wizardSidepanel.metric.judgeTag')
											: undefined
									"
									:badge-icon="check.isAiJudged ? 'wand-sparkles' : undefined"
									:score-label="
										check.isAiJudged
											? locale.baseText('evaluations.wizardSidepanel.step3.averageLabel')
											: locale.baseText('evaluations.wizardSidepanel.step3.passedLabel')
									"
									:score-text="
										check.isAiJudged
											? formatMetricAverage(latestRun.metrics?.[check.key], { category: 'aiBased' })
											: formatMetricPercent(latestRun.metrics?.[check.key])
									"
									:data-test-id="`evaluations-wizard-sidepanel-result-card-${check.key}`"
								/>
							</li>
						</ul>
						<ResultsCaseRow
							v-for="(testCase, index) in latestRunCases"
							:key="testCase.id"
							:case-index="index + 1"
							:test-case="testCase"
							:checks="resultChecks"
							:expected-fields="expectedFields"
							:expected-values="caseExpectedValues(testCase)"
							:ai-answer="caseAnswer(testCase)"
							:run-metrics="latestRun.metrics"
						/>
					</div>

					<div
						v-if="!latestRun && !showLoadingState"
						:class="$style.emptyResult"
						data-test-id="evaluations-wizard-sidepanel-no-run"
					>
						<N8nText size="small" color="text-light">
							{{ locale.baseText('evaluations.wizardSidepanel.step3.noRun') }}
						</N8nText>
					</div>
				</section>
			</div>

			<footer :class="$style.footer">
				<N8nButton
					v-if="activeStep === 0"
					variant="ghost"
					size="small"
					type="button"
					data-test-id="evaluations-wizard-sidepanel-cancel"
					@click.stop="handleCancel"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.cancel') }}
				</N8nButton>
				<N8nButton
					v-else-if="activeStep === 1 || activeStep === 2"
					variant="ghost"
					size="small"
					type="button"
					data-test-id="evaluations-wizard-sidepanel-back"
					@click.stop="handleBack"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.nav.back') }}
				</N8nButton>
				<N8nButton
					v-else-if="activeStep === 3"
					variant="ghost"
					size="small"
					type="button"
					data-test-id="evaluations-wizard-sidepanel-edit-evals"
					@click.stop="wizardStore.setStep(0)"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.nav.editEvals') }}
				</N8nButton>
				<span :class="$style.footerSpacer" />
				<N8nButton
					v-if="activeStep < 3"
					variant="outline"
					size="small"
					type="button"
					:loading="isPersisting"
					:disabled="
						(activeStep === 0 && !step0Complete) ||
						(activeStep === 1 && !step1Complete) ||
						(activeStep === 2 && !step2Complete)
					"
					data-test-id="evaluations-wizard-sidepanel-next"
					@click.stop="handleNext"
				>
					<span v-if="activeStep === 0">
						{{ locale.baseText('evaluations.wizardSidepanel.nav.next.checks') }}
					</span>
					<span v-else-if="activeStep === 1">
						{{ locale.baseText('evaluations.wizardSidepanel.nav.next.cases') }}
					</span>
					<span v-else>
						{{ locale.baseText('evaluations.wizardSidepanel.nav.next.run') }}
					</span>
				</N8nButton>
				<template v-else>
					<N8nButton
						variant="ghost"
						size="small"
						type="button"
						:loading="isPersisting"
						data-test-id="evaluations-wizard-sidepanel-run-again"
						@click.stop="handleRunAgain"
					>
						{{ locale.baseText('evaluations.wizardSidepanel.nav.runAgain') }}
					</N8nButton>
					<N8nButton
						variant="outline"
						size="small"
						type="button"
						data-test-id="evaluations-wizard-sidepanel-view-results"
						@click.stop="handleViewResults"
					>
						{{ locale.baseText('evaluations.wizardSidepanel.nav.viewDetailedResults') }}
					</N8nButton>
				</template>
			</footer>
		</template>

		<CustomCheckModal />
	</div>
</template>

<style module lang="scss">
.sidepanel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	background-color: var(--background--surface);
	overflow: hidden;
}

.gate {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl) var(--spacing--md);
	text-align: center;
}

.gateIcon {
	color: var(--color--secondary);
}

.gateMessage {
	max-width: 300px;
	line-height: 1.4;
}

.progressBar {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 4px;
	padding: var(--spacing--xs) var(--spacing--md) 0;
}

.progressSegment {
	height: 3px;
	border-radius: 2px;
	background-color: var(--background--subtle);
	transition: background-color var(--duration--snappy) ease;
}

.progressSegmentActive {
	background-color: var(--background--brand);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--md);
	padding-bottom: var(--spacing--xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--md, 18px);
}

.description {
	display: block;
	max-width: 340px;
}

.body {
	flex: 1 1 auto;
	overflow-y: auto;
	padding: var(--spacing--xs) var(--spacing--md) var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.checkList {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.results {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.addCard {
	display: grid;
	grid-template-columns: auto 1fr;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	color: var(--color--text--tint-1);
	cursor: pointer;
	outline: none;
	transition: border-color var(--duration--snappy) ease;

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
	}
}

.addCardIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 6px;
	background-color: var(--background--subtle);
	color: var(--color--text--tint-1);
}

.runningState {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--border-radius--base);
	background-color: var(--background--surface);
}

.emptyResult {
	padding: var(--spacing--md);
	border: 1px dashed var(--border-color--strong);
	border-radius: var(--border-radius--base);
	text-align: center;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: var(--border);
	background-color: var(--background--surface);
}

.footerSpacer {
	flex: 1 1 auto;
}
</style>
