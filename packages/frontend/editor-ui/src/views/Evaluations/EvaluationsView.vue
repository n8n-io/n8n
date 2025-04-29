<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { computed, ref } from 'vue';

import RunsSection from '@/components/Evaluations/EditDefinition/sections/RunsSection.vue';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useAsyncState } from '@vueuse/core';
import { orderBy } from 'lodash-es';

const props = defineProps<{
	name: string;
}>();

const locale = useI18n();
const toast = useToast();
const evaluationsStore = useEvaluationStore();
const workflowsStore = useWorkflowsStore();
// const telemetry = useTelemetry();

const { isReady } = useAsyncState(
	async () => {
		await evaluationsStore.fetchTestRuns(props.name);

		return [];
	},
	[],
	{
		onError: (error) => toast.showError(error, locale.baseText('evaluation.list.loadError')),
		shallow: false,
	},
);

const hasRuns = computed(() => runs.value.length > 0);
const workflowName = computed(() => workflowsStore.getWorkflowById(props.name)?.name ?? '');

const selectedMetric = ref<string>('');

async function runTest() {
	await evaluationsStore.startTestRun(props.name);
	await evaluationsStore.fetchTestRuns(props.name);
}

const runs = computed(() => {
	const testRuns = Object.values(evaluationsStore.testRunsById ?? {}).filter(
		({ workflowId }) => workflowId === props.name,
	);

	return orderBy(testRuns, (record) => new Date(record.runAt), ['asc']).map((record, index) =>
		Object.assign(record, { index: index + 1 }),
	);
});

const isRunning = computed(() => runs.value.some((run) => run.status === 'running'));
const isRunTestEnabled = computed(() => !isRunning.value);

const showWizard = computed(() => {
	return !hasRuns.value;
});
</script>

<template>
	<div v-if="isReady" :class="[$style.container]">
		<div :class="$style.header" v-if="!showWizard">
			<div style="display: flex; align-items: center">
				<N8nText bold size="xlarge" color="text-dark">{{
					locale.baseText('evaluation.listRuns.runListHeader', {
						interpolate: {
							name: workflowName,
						},
					})
				}}</N8nText>
			</div>
			<div style="display: flex; align-items: center; gap: 10px">
				<N8nTooltip v-if="!showWizard" :disabled="isRunTestEnabled" :placement="'left'">
					<N8nButton
						:disabled="!isRunTestEnabled"
						:class="$style.runTestButton"
						size="small"
						data-test-id="run-test-button"
						:label="locale.baseText('evaluation.runTest')"
						type="primary"
						@click="runTest"
					/>
					<template #content>
						<template v-if="isRunning">
							{{ locale.baseText('evaluation.testIsRunning') }}
						</template>
					</template>
				</N8nTooltip>
			</div>
		</div>
		<div :class="$style.wrapper">
			<div :class="{ [$style.content]: true, [$style.contentWithRuns]: hasRuns }">
				<RunsSection
					v-if="hasRuns"
					v-model:selectedMetric="selectedMetric"
					:class="$style.runs"
					:runs="runs"
					:workflow-id="props.name"
				/>

				<SetupWizard v-if="showWizard" :class="$style.config" @run-test="runTest" />
			</div>
		</div>
	</div>
	<div v-else>TESTTESTTEST</div>
</template>

<style module lang="scss">
.content {
	display: flex;
	justify-content: center;
	gap: var(--spacing-m);
	padding-bottom: var(--spacing-m);
}

.config {
	width: 640px;
	margin-top: var(--spacing-xl);
}

.header {
	display: flex;
	justify-content: space-between;
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

.description {
	max-width: 600px;
	margin-bottom: 20px;
}

.arrowBack {
	--button-hover-background-color: transparent;
	border: 0;
}
</style>
