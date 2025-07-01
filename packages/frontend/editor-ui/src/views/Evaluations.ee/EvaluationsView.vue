<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

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

const runs = computed(() => {
	const testRuns = Object.values(evaluationStore.testRunsById ?? {}).filter(
		({ workflowId }) => workflowId === props.name,
	);

	return orderBy(testRuns, (record) => new Date(record.runAt), ['asc']).map((record, index) => ({
		...record,
		index: index + 1,
	}));
});

const isRunning = computed(() => runs.value.some((run) => run.status === 'running'));
const isRunTestEnabled = computed(() => !isRunning.value);
</script>

<template>
	<div :class="$style.evaluationsView">
		<div :class="$style.header">
			<N8nTooltip :disabled="isRunTestEnabled" :placement="'left'">
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

.runTestButton {
	white-space: nowrap;
}

.runs {
	width: 100%;
	max-width: 1024px;
}
</style>
