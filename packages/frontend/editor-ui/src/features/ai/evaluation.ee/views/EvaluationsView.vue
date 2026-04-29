<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import RunsSection from '../components/ListRuns/RunsSection.vue';
import { useEvaluationStore } from '../evaluation.store';
import { useParallelEvalStore } from '../parallelEval.store';
import orderBy from 'lodash/orderBy';
import { useToast } from '@/app/composables/useToast';

import { N8nButton, N8nCheckbox, N8nIcon, N8nInputNumber, N8nTooltip } from '@n8n/design-system';

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

const parallelEnabledModel = computed({
	get: () => parallelEvalStore.isParallel(props.workflowId),
	set: (value: boolean) => parallelEvalStore.setParallel(props.workflowId, value),
});

const concurrencyModel = computed({
	get: () => parallelEvalStore.concurrencyValue(props.workflowId),
	set: (value: number) => parallelEvalStore.setConcurrencyValue(props.workflowId, value),
});

async function runTest() {
	try {
		// When the rollout flag is off, omit `concurrency` entirely so the BE
		// safety net is a no-op and behaviour matches the legacy sequential
		// path. Flag-on cohort sends an explicit value derived from the per-
		// workflow checkbox + input state.
		const options = parallelEvalStore.isFeatureEnabled
			? { concurrency: parallelEvalStore.effectiveConcurrency(props.workflowId) }
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
			<div
				v-if="parallelEvalStore.isFeatureEnabled && !runningTestRun"
				:class="$style.parallelControls"
				data-test-id="parallel-eval-controls"
			>
				<N8nCheckbox
					v-model="parallelEnabledModel"
					:label="locale.baseText('evaluation.runInParallel.label')"
					data-test-id="run-in-parallel-checkbox"
				/>
				<N8nTooltip placement="top" :content="locale.baseText('evaluation.runInParallel.tooltip')">
					<N8nIcon
						icon="circle-help"
						size="small"
						:class="$style.tooltipIcon"
						data-test-id="run-in-parallel-tooltip-icon"
					/>
				</N8nTooltip>
				<span :class="$style.concurrencyLabel">
					{{ locale.baseText('evaluation.runInParallel.concurrency.label') }}
				</span>
				<N8nInputNumber
					v-model="concurrencyModel"
					:min="1"
					:max="10"
					:disabled="!parallelEnabledModel"
					size="small"
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
	justify-content: end;
	align-items: center;
	padding: var(--spacing--md) var(--spacing--lg);
	padding-left: 27px;
	padding-bottom: 8px;
	position: sticky;
	top: 0;
	left: 0;
	background-color: var(--color--background--light-2);
	z-index: 2;
}

.wrapper {
	padding: 0 var(--spacing--lg);
	padding-left: 58px;
}

.runOrStopTestButton {
	white-space: nowrap;
}

.parallelControls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-right: var(--spacing--md);
}

.tooltipIcon {
	color: var(--color--text--tint-1);
	cursor: help;
}

.concurrencyLabel {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.runs {
	width: 100%;
	max-width: 1024px;
}
</style>
