<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import RunsSection from '@/components/Evaluations.ee/ListRuns/RunsSection.vue';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { N8nButton } from '@n8n/design-system';
import orderBy from 'lodash/orderBy';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
	name: string;
}>();

const locale = useI18n();
const toast = useToast();

const evaluationStore = useEvaluationStore();

const selectedMetric = ref<string>('');
const cancellingTestRun = ref<boolean>(false);

const runningTestRun = computed(() => runs.value.find((run) => run.status === 'running'));

async function runTest() {
	try {
		await evaluationStore.startTestRun(props.name);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantStartTestRun'));
	}

	try {
		await evaluationStore.fetchTestRuns(props.name);
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
		({ workflowId }) => workflowId === props.name,
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
			<N8nButton
				v-if="runningTestRun"
				:disabled="cancellingTestRun"
				:class="$style.runOrStopTestButton"
				size="small"
				data-test-id="stop-test-button"
				:label="locale.baseText('evaluation.stopTest')"
				type="secondary"
				@click="stopTest"
			/>
			<N8nButton
				v-else
				:class="$style.runOrStopTestButton"
				size="small"
				data-test-id="run-test-button"
				:label="locale.baseText('evaluation.runTest')"
				type="primary"
				@click="runTest"
			/>
		</div>
		<div :class="$style.wrapper">
			<div :class="$style.content">
				<RunsSection
					v-model:selected-metric="selectedMetric"
					:class="$style.runs"
					:runs="runs"
					:workflow-id="props.name"
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
	gap: var(--spacing-m);
	padding-bottom: var(--spacing-m);
}

.header {
	display: flex;
	justify-content: end;
	align-items: center;
	padding: var(--spacing-m) var(--spacing-l);
	padding-left: 27px;
	padding-bottom: 8px;
	position: sticky;
	top: 0;
	left: 0;
	background-color: var(--color-background-light);
	z-index: 2;
}

.wrapper {
	padding: 0 var(--spacing-l);
	padding-left: 58px;
}

.runOrStopTestButton {
	white-space: nowrap;
}

.runs {
	width: 100%;
	max-width: 1024px;
}
</style>
