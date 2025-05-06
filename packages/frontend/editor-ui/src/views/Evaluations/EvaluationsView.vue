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
import N8nLink from '@n8n/design-system/components/N8nLink';

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
	<div v-if="isReady" style="display: flex; justify-content: center">
		<div v-if="!showWizard" :class="$style.header">
			<div style="display: flex; align-items: center"></div>
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
		<div :class="{ [$style.wrapper]: true, [$style.setupWrapper]: showWizard }">
			<div :class="{ [$style.content]: true, [$style.contentWithRuns]: hasRuns }">
				<RunsSection
					v-if="hasRuns"
					v-model:selectedMetric="selectedMetric"
					:class="$style.runs"
					:runs="runs"
					:workflow-id="props.name"
				/>

				<div v-if="showWizard" :class="$style.setupContent">
					<div :class="$style.setupHeader">
						<N8nText size="large" color="text-dark" tag="h3" bold>
							{{ locale.baseText('evaluations.setupWizard.title') }}
						</N8nText>
						<N8nText tag="p" size="small" color="text-base" :class="$style.description">
							{{ locale.baseText('evaluations.setupWizard.description') }}
							<N8nLink size="small" href="https://google.com/">{{
								locale.baseText('evaluations.setupWizard.moreInfo')
							}}</N8nLink>
						</N8nText>
					</div>

					<div :class="$style.config">
						<iframe
							style="min-width: 500px"
							width="500"
							height="280"
							src="https://www.youtube.com/embed/ZCuL2e4zC_4"
							title="n8n: Flexible AI Workflow Automation for Technical Teams [2025]"
							frameborder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerpolicy="strict-origin-when-cross-origin"
							allowfullscreen
						></iframe>
						<SetupWizard @run-test="runTest" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.content {
	display: flex;
	justify-content: center;
	gap: var(--spacing-m);
	padding-bottom: var(--spacing-m);
}

.config {
	display: flex;
	flex-direction: row;
	gap: var(--spacing-l);
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

.setupHeader {
	//margin-bottom: var(--spacing-l);
}

.setupDescription {
	margin-top: var(--spacing-2xs);

	ul {
		li {
			margin-top: var(--spacing-2xs);
		}
	}
}

.wrapper {
	padding: 0 var(--spacing-l);
	padding-left: 58px;
}

.setupWrapper {
	display: flex;
	max-width: 1024px;
	margin-top: var(--spacing-2xl);
}

.setupContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);
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
