<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import ConcurrencySlider from '../components/ConcurrencySlider';
import RunsSection from '../components/ListRuns/RunsSection.vue';
import { useEvaluationStore } from '../evaluation.store';
import { useParallelEvalStore } from '../parallelEval.store';
import orderBy from 'lodash/orderBy';
import { useToast } from '@/app/composables/useToast';

import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';

const props = defineProps<{
	workflowId: string;
}>();

const locale = useI18n();
const toast = useToast();

const evaluationStore = useEvaluationStore();
const parallelEvalStore = useParallelEvalStore();

const selectedMetric = ref<string>('');
const cancellingTestRun = ref<boolean>(false);

const runningTestRun = computed(() => runs.value.find((run) => run.status === 'running'));

const concurrencyModel = computed({
	get: () => parallelEvalStore.concurrencyValue(props.workflowId),
	set: (value: number) => parallelEvalStore.setConcurrencyValue(props.workflowId, value),
});

// Slider value 1 = sequential, > 1 = concurrent. The slider is the single
// source of truth — no separate toggle. The current count is folded into
// the label ("Concurrent · 3") so the standalone numeric readout can be
// dropped from the layout.
const concurrencyLabel = computed(() =>
	concurrencyModel.value > 1
		? locale.baseText('evaluation.runInParallel.label.concurrent', {
				interpolate: { count: String(concurrencyModel.value) },
			})
		: locale.baseText('evaluation.runInParallel.label.sequential'),
);

async function runTest() {
	try {
		// When the rollout flag is off, omit `concurrency` entirely so the BE
		// safety net is a no-op and behaviour matches the legacy sequential
		// path. Flag-on cohort sends the slider value (1 = sequential, >1 =
		// concurrent fan-out).
		const options = parallelEvalStore.isFeatureEnabled
			? { concurrency: concurrencyModel.value }
			: undefined;
		await evaluationStore.startTestRun(props.workflowId, options);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantStartTestRun'));
	}

	try {
		await evaluationStore.fetchTestRuns(props.workflowId);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantFetchTestRuns'));
	}
}

async function stopTest() {
	if (!runningTestRun.value) {
		return;
	}

	try {
		cancellingTestRun.value = true;
		await evaluationStore.cancelTestRun(runningTestRun.value.workflowId, runningTestRun.value.id);
		// we don't reset cancellingTestRun flag here, because we want the button to stay disabled
		// until the "running" testRun is updated and cancelled in the list of test runs
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantStopTestRun'));
		cancellingTestRun.value = false;
	}
}

const runs = computed(() => {
	const testRuns = Object.values(evaluationStore.testRunsById ?? {}).filter(
		({ workflowId }) => workflowId === props.workflowId,
	);

	return orderBy(testRuns, (record) => new Date(record.runAt), ['asc']).map((record, index) => ({
		...record,
		index: index + 1,
	}));
});

watch(runningTestRun, (run) => {
	if (!run) {
		// reset to ensure next run can be stopped
		cancellingTestRun.value = false;
	}
});
</script>

<template>
	<div :class="$style.evaluationsView">
		<div :class="$style.header">
			<div :class="$style.headerInner">
				<div
					v-if="parallelEvalStore.isFeatureEnabled && !runningTestRun"
					:class="$style.parallelControls"
					data-test-id="parallel-eval-controls"
				>
					<span :class="$style.concurrencyLabel" data-test-id="run-in-parallel-mode-label">
						{{ concurrencyLabel }}
					</span>
					<N8nTooltip
						placement="top"
						:content="locale.baseText('evaluation.runInParallel.tooltip')"
					>
						<N8nIcon
							icon="circle-help"
							size="small"
							:class="$style.tooltipIcon"
							data-test-id="run-in-parallel-tooltip-icon"
						/>
					</N8nTooltip>
					<ConcurrencySlider
						v-model="concurrencyModel"
						:min="1"
						:max="10"
						:step="1"
						show-stops
						:class="$style.concurrencySlider"
						data-test-id="run-in-parallel-concurrency"
					/>
				</div>
				<N8nButton
					variant="subtle"
					v-if="runningTestRun"
					:disabled="cancellingTestRun"
					:class="$style.runOrStopTestButton"
					size="small"
					data-test-id="stop-test-button"
					:label="locale.baseText('evaluation.stopTest')"
					@click="stopTest"
				/>
				<N8nButton
					variant="solid"
					v-else
					:class="$style.runOrStopTestButton"
					size="small"
					data-test-id="run-test-button"
					:label="locale.baseText('evaluation.runTest')"
					@click="runTest"
				/>
			</div>
		</div>
		<div :class="$style.wrapper">
			<div :class="$style.content">
				<RunsSection
					v-model:selected-metric="selectedMetric"
					:class="$style.runs"
					:runs="runs"
					:workflow-id="props.workflowId"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.evaluationsView {
	width: 100%;
}

.content {
	display: flex;
	justify-content: center;
	gap: var(--spacing--md);
	padding-bottom: var(--spacing--md);
}

.header {
	display: flex;
	justify-content: center;
	padding: var(--spacing--md) var(--spacing--lg);
	// Match `.wrapper` so the inner 1024px box anchors at the same left
	// origin as the runs section below (the 58px reserves space for the
	// editor's collapsed sidebar in the wrapper layout).
	padding-left: 58px;
	padding-bottom: 8px;
	position: sticky;
	top: 0;
	left: 0;
	background-color: var(--color--background--light-2);
	z-index: 2;
}

// Inner container: width-capped at the same 1024px as `.runs` and
// horizontally centred via the parent's `justify-content: center`. This
// makes the controls + Run button hug the same horizontal bounds as the
// chart and table below, instead of floating against the viewport edges.
.headerInner {
	display: flex;
	align-items: center;
	width: 100%;
	max-width: 1024px;
}

.wrapper {
	padding: 0 var(--spacing--lg);
	padding-left: 58px;
}

.runOrStopTestButton {
	white-space: nowrap;
	// Anchor to the right edge of `.headerInner` regardless of which
	// siblings render. Works for the flag-off case (only the button is
	// rendered) and the flag-on case (parallel controls take the left).
	margin-left: auto;
}

.parallelControls {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.tooltipIcon {
	color: var(--color--text--tint-1);
	cursor: help;
}

.concurrencyLabel {
	color: var(--color--text);
	font-size: var(--font-size--sm);
	// Tabular numerals so the width doesn't jitter as the user drags the
	// slider through different digits.
	font-variant-numeric: tabular-nums;
	// Reserve enough room for the longest variant ("Concurrent · 10") so
	// the slider doesn't shift left/right as the label content changes.
	min-width: 100px;
}

.concurrencySlider {
	// `flex: 0 0 160px` (basis 160px, no grow/shrink) wins over element-plus's
	// default `.el-slider { width: 100% }` because flex-basis is what the flex
	// algorithm uses for sizing. Plain `width: 160px` would lose the cascade.
	flex: 0 0 160px;
	margin: 0 var(--spacing--2xs);
}

.runs {
	width: 100%;
	max-width: 1024px;
}
</style>
