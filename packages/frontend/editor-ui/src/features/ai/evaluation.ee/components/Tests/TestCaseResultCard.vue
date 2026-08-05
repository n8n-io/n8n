<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { CANNED_METRICS, cannedMetricLabelKey, getErrorBaseKey } from '../../evaluation.constants';
import {
	casePassed,
	extractCaseAnswer,
	formatDuration,
	formatMetricPercent,
	formatMetricRawScore,
	formatShortDateTime,
	formatTokens,
	getMetricCategory,
	getOperationalMetricEntries,
	getUserDefinedMetricNames,
} from '../../evaluation.utils';
import type { TestCaseExecutionRecord, TestRunRecord } from '../../evaluation.api';

const TERMINAL_CASE_STATUSES = ['success', 'error', 'warning', 'cancelled'];

// Labels for the operational metrics shown as gray text under the results.
const OPERATIONAL_LABEL: Record<string, BaseTextKey> = {
	promptTokens: 'evaluations.tests.results.metric.promptTokens',
	completionTokens: 'evaluations.tests.results.metric.completionTokens',
	totalTokens: 'evaluations.tests.results.metric.totalTokens',
	executionTime: 'evaluations.tests.results.metric.executionTime',
};

const props = defineProps<{
	index: number;
}>();

const locale = useI18n();
const wizardStore = useEvaluationsWizardSidepanelStore();
const evaluationStore = useEvaluationStore();
const executionsStore = useExecutionsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const expanded = ref(false);

const title = computed(
	() =>
		wizardStore.datasetNamesByRow[props.index] ||
		locale.baseText('evaluations.tests.list.caseLabel', {
			interpolate: { index: props.index + 1 },
		}),
);

const inputEntries = computed<Array<{ name: string; value: string }>>(() => {
	const row = wizardStore.datasetInputsByRow[props.index] ?? {};
	return Object.entries(row).map(([name, value]) => ({ name, value: String(value) }));
});

// Runs for this workflow, oldest first — used to derive a stable run number.
const workflowRuns = computed<TestRunRecord[]>(() => {
	const workflowId = workflowDocumentStore.value?.workflowId;
	if (!workflowId) return [];
	return [...(evaluationStore.testRunsByWorkflowId[workflowId] ?? [])].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);
});

const latestRun = computed<TestRunRecord | undefined>(
	() => workflowRuns.value[workflowRuns.value.length - 1],
);

const runNumber = computed(() => workflowRuns.value.length);

const runDateLabel = computed(() => {
	const run = latestRun.value;
	if (!run) return '';
	return formatShortDateTime(run.runAt ?? run.createdAt);
});

// This row's case execution within the latest run.
const caseExecution = computed<TestCaseExecutionRecord | undefined>(() => {
	const runId = latestRun.value?.id;
	if (!runId) return undefined;
	return Object.values(evaluationStore.testCaseExecutionsById ?? {}).find(
		(c) => c.testRunId === runId && (c.runIndex ?? 0) === props.index,
	);
});

// A run is in progress for this case until its execution reaches a terminal
// status (or, before it's seeded, while the run itself is new/running).
const isRunning = computed(() => {
	const run = latestRun.value;
	if (!run) return false;
	if (!['new', 'running'].includes(run.status)) return false;
	const status = caseExecution.value?.status;
	return !status || !TERMINAL_CASE_STATUSES.includes(status);
});

const hasResult = computed(
	() =>
		Boolean(caseExecution.value && TERMINAL_CASE_STATUSES.includes(caseExecution.value.status)) &&
		!isRunning.value,
);

const runPassed = computed(() => caseExecution.value?.status === 'success');

// A terminal case that didn't pass — we surface why beneath the run label.
const runFailed = computed(() => hasResult.value && !runPassed.value);

type MetricBadge = { key: string; label: string; text: string; passed: boolean };

// Per-check score badges for this case (excludes token/time metrics).
const metricBadges = computed<MetricBadge[]>(() => {
	const metrics = caseExecution.value?.metrics;
	if (!metrics) return [];
	return getUserDefinedMetricNames(metrics).map((key) => {
		const value = metrics[key];
		const canned = CANNED_METRICS.find((m) => m.key === key);
		const label = canned ? locale.baseText(cannedMetricLabelKey(canned)) : key;
		const category = getMetricCategory(key);
		if (category === 'aiBased') {
			// AI judges grade 1–5; ≥3/5 reads as "acceptable" for the at-a-glance
			// badge colour. No other surface renders AI pass/fail, so this
			// card-local threshold can't disagree with one.
			return { key, label, text: formatMetricRawScore(value, { category }), passed: value >= 3 };
		}
		// Deterministic checks pass only on a perfect score, via the shared
		// `casePassed` — so a case can't read "pass" here yet "fail" on the run
		// detail / wizard, which use the same helper.
		return {
			key,
			label,
			text: formatMetricPercent(value, { category }),
			passed: casePassed(value),
		};
	});
});

// Operational metrics (tokens, time) — plain gray text, no percentages.
const operationalMetrics = computed<Array<{ key: string; label: string; text: string }>>(() => {
	return getOperationalMetricEntries(caseExecution.value?.metrics).map(({ key, value }) => {
		const label = OPERATIONAL_LABEL[key] ? locale.baseText(OPERATIONAL_LABEL[key]) : key;
		const text =
			key === 'executionTime' ? formatDuration(value) : formatTokens(value, { withUnit: false });
		return { key, label, text };
	});
});

// The node under test whose output is the case's answer.
const endNodeName = computed(() => wizardStore.answerNodeName);

// The compiled config run has no setOutputs node, so `caseExecution.outputs` is
// empty; the real answer is the end node's output in the run. Fetch the full
// execution lazily (the output only renders when expanded) and extract from it.
const caseExecutionData = ref<IExecutionResponse | null>(null);

async function loadCaseExecution(executionId: string) {
	try {
		caseExecutionData.value = (await executionsStore.fetchExecution(executionId)) ?? null;
	} catch (error) {
		console.warn('[TestCaseResultCard] failed to load case execution', error);
	}
}

// Load the full execution when the card is expanded (for the output) or when
// the case failed (so its error message is shown without needing to expand).
watch(
	[expanded, runFailed, () => caseExecution.value?.executionId],
	([isExpanded, failed, executionId]) => {
		if (!executionId || (!isExpanded && !failed)) return;
		if (caseExecutionData.value?.id === executionId) return;
		void loadCaseExecution(executionId);
	},
	{ immediate: true },
);

const outputText = computed(() =>
	extractCaseAnswer(caseExecutionData.value, endNodeName.value, caseExecution.value?.outputs),
);

// Why the run failed: the workflow's own error message when available, else the
// mapped error-code message, else a generic fallback.
const failureReason = computed(() => {
	if (!runFailed.value) return '';
	const executionError = caseExecutionData.value?.data?.resultData?.error?.message;
	if (executionError) return executionError;
	const errorKey = getErrorBaseKey(caseExecution.value?.errorCode);
	if (errorKey && locale.exists(errorKey)) {
		return locale.baseText(errorKey, { interpolate: { link: '' } }).trim();
	}
	return locale.baseText('evaluations.tests.results.runFailed');
});

function toggle() {
	expanded.value = !expanded.value;
}

function openEdit() {
	wizardStore.openDetail(props.index);
}
</script>

<template>
	<div :class="$style.card" :data-test-id="`tests-result-card-${index}`">
		<div :class="$style.header">
			<button
				type="button"
				:class="$style.title"
				:data-test-id="`tests-result-edit-${index}`"
				@click="openEdit"
			>
				<N8nText size="medium" color="text-dark" bold>{{ title }}</N8nText>
			</button>
			<button
				type="button"
				:class="$style.chevron"
				:aria-expanded="expanded"
				:data-test-id="`tests-result-toggle-${index}`"
				@click="toggle"
			>
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="small" color="text-base" />
			</button>
		</div>

		<!-- Case definition (expanded only) -->
		<div v-if="expanded" :class="$style.definition">
			<div :class="$style.sentence">
				<N8nText size="small" color="text-light">
					{{ locale.baseText('evaluations.tests.detail.when') }}
				</N8nText>
				<N8nText size="small" color="text-dark" bold>{{ wizardStore.aiNodeName }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ locale.baseText('evaluations.tests.detail.receivesInput') }}
				</N8nText>
			</div>
			<div :class="$style.entries">
				<p v-for="entry in inputEntries" :key="entry.name" :class="$style.entry">
					<N8nText size="small" color="text-light">{{ entry.name }}</N8nText>
					<N8nText size="small" color="text-dark">{{ entry.value }}</N8nText>
				</p>
			</div>
		</div>

		<!-- Running -->
		<div
			v-if="isRunning"
			:class="$style.runSection"
			:data-test-id="`tests-result-running-${index}`"
		>
			<div :class="$style.runLine">
				<N8nIcon icon="spinner" size="small" :spin="true" color="text-light" />
				<N8nText size="small" color="text-light">
					{{ locale.baseText('evaluations.tests.results.running') }}
				</N8nText>
			</div>
		</div>

		<!-- Latest run result -->
		<div
			v-else-if="hasResult"
			:class="$style.runSection"
			:data-test-id="`tests-result-result-${index}`"
		>
			<div :class="$style.runLine">
				<N8nIcon
					:icon="runPassed ? 'check' : 'x'"
					size="small"
					:color="runPassed ? 'success' : 'danger'"
				/>
				<N8nText size="small" :color="runPassed ? 'success' : 'danger'">
					{{
						locale.baseText('evaluations.tests.results.runLabel', {
							interpolate: { number: String(runNumber), date: runDateLabel },
						})
					}}
				</N8nText>
			</div>

			<!-- Failure reason (shown for a failed run, collapsed or expanded) -->
			<N8nText
				v-if="runFailed && failureReason"
				size="small"
				color="danger"
				:class="$style.failureReason"
				:data-test-id="`tests-result-error-${index}`"
			>
				{{ failureReason }}
			</N8nText>

			<template v-if="expanded">
				<N8nText size="small" color="text-light">
					{{ locale.baseText('evaluations.tests.detail.output') }}
				</N8nText>
			</template>

			<div :class="$style.badges">
				<span
					v-for="badge in metricBadges"
					:key="badge.key"
					:class="[$style.badge, badge.passed ? $style.badgePass : $style.badgeFail]"
					:data-test-id="`tests-result-badge-${index}-${badge.key}`"
				>
					{{ badge.label }} <strong>{{ badge.text }}</strong>
				</span>
			</div>

			<N8nText v-if="expanded && outputText" size="small" color="text-dark" :class="$style.output">
				{{ outputText }}
			</N8nText>

			<!-- Operational metrics: gray text, only when expanded, no percentages -->
			<div
				v-if="expanded && operationalMetrics.length > 0"
				:class="$style.operational"
				:data-test-id="`tests-result-operational-${index}`"
			>
				<N8nText v-for="m in operationalMetrics" :key="m.key" size="xsmall" color="text-light">
					{{ m.label }} {{ m.text }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	padding: var(--spacing--sm) var(--spacing--md);
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.title {
	flex: 1 1 auto;
	min-width: 0;
	background: none;
	border: none;
	padding: 0;
	text-align: left;
	cursor: pointer;

	&:hover :global(.n8n-text) {
		text-decoration: underline;
	}
}

.chevron {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	padding: 0;
	background: none;
	border: none;
	border-radius: var(--radius--sm);
	cursor: pointer;

	&:hover {
		background-color: var(--background--subtle);
	}
}

.definition {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sentence {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.entries {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-left: var(--spacing--md);
}

.entry {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
}

// Full-bleed top border separates the title/input from the run result.
.runSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	border-top: var(--border);
	margin: 0 calc(-1 * var(--spacing--md));
	padding: var(--spacing--sm) var(--spacing--md) 0;
}

.runLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.badges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--2xs);
}

.badgePass {
	background-color: var(--color--success--tint-2, #e9f7ef);
	color: var(--color--success--shade-1, #1a8d4a);
}

.badgeFail {
	background-color: var(--color--danger--tint-2, #fdecea);
	color: var(--color--danger--shade-1, #b3261e);
}

.output {
	white-space: pre-wrap;
	word-break: break-word;
}

.failureReason {
	white-space: pre-wrap;
	word-break: break-word;
}

.operational {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs) var(--spacing--sm);
	margin-top: var(--spacing--3xs);
}
</style>
