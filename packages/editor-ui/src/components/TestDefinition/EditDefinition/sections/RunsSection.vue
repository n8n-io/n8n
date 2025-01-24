<script setup lang="ts">
import type { TestRunRecord } from '@/api/testDefinition.ee';
import type { AppliedThemeOption } from '@/Interface';
import MetricsChart from '@/components/TestDefinition/ListRuns/MetricsChart.vue';
import TestRunsTable from '@/components/TestDefinition/ListRuns/TestRunsTable.vue';

defineProps<{
	runs: TestRunRecord[];
	testId: string;
	appliedTheme: AppliedThemeOption;
}>();

const emit = defineEmits<{
	deleteRuns: [runs: TestRunRecord[]];
}>();

const selectedMetric = defineModel<string>('selectedMetric', { required: true });

function onDeleteRuns(toDelete: TestRunRecord[]) {
	emit('deleteRuns', toDelete);
}
</script>

<template>
	<div :class="$style.runs">
		<!-- Metrics Chart -->
		<MetricsChart v-model:selectedMetric="selectedMetric" :runs="runs" :theme="appliedTheme" />
		<!-- Past Runs Table -->
		<TestRunsTable
			:class="$style.runsTable"
			:runs="runs"
			:selectable="true"
			data-test-id="past-runs-table"
			@delete-runs="onDeleteRuns"
		/>
	</div>
</template>

<style module lang="scss">
.runs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
	flex: 1;
	padding-top: var(--spacing-3xs);
	overflow: auto;

	@media (min-height: 56rem) {
		margin-top: var(--spacing-2xl);
	}
}
</style>
