<script setup lang="ts">
import type { TestRunRecord } from '@/api/testDefinition.ee';
import MetricsChart from '@/components/TestDefinition/ListRuns/MetricsChart.vue';
import TestRunsTable from '@/components/TestDefinition/ListRuns/TestRunsTable.vue';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import type { AppliedThemeOption } from '@/Interface';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
	runs: TestRunRecord[];
	testId: string;
	appliedTheme: AppliedThemeOption;
}>();

const emit = defineEmits<{
	deleteRuns: [runs: TestRunRecord[]];
}>();
const locale = useI18n();
const router = useRouter();

const selectedMetric = defineModel<string>('selectedMetric', { required: true });

function onDeleteRuns(toDelete: TestRunRecord[]) {
	emit('deleteRuns', toDelete);
}

const metrics = computed(() => {
	const metricKeys = props.runs.reduce((acc, run) => {
		Object.keys(run.metrics ?? {}).forEach((metric) => acc.add(metric));
		return acc;
	}, new Set<string>());
	return [...metricKeys];
});

const metricColumns = computed(() =>
	metrics.value.map((metric) => ({
		prop: `metrics.${metric}`,
		label: metric,
		sortable: true,
		showHeaderTooltip: true,
		sortMethod: (a: TestRunRecord, b: TestRunRecord) =>
			(a.metrics?.[metric] ?? 0) - (b.metrics?.[metric] ?? 0),
		formatter: (row: TestRunRecord) => (row.metrics?.[metric] ?? 0).toFixed(2),
	})),
);

const columns = computed(() => [
	{
		prop: 'runNumber',
		label: locale.baseText('testDefinition.listRuns.runNumber'),
		formatter: (row: TestRunRecord) => `${row.id}`,
		showOverflowTooltip: true,
	},
	{
		prop: 'runAt',
		label: 'Run at',
		sortable: true,
		showOverflowTooltip: true,
		sortMethod: (a: TestRunRecord, b: TestRunRecord) =>
			new Date(a.runAt ?? a.createdAt).getTime() - new Date(b.runAt ?? b.createdAt).getTime(),
	},
	{
		prop: 'status',
		label: locale.baseText('testDefinition.listRuns.status'),
		sortable: true,
	},
	...metricColumns.value,
]);

const handleRowClick = (row: TestRunRecord) => {
	void router.push({
		name: VIEWS.TEST_DEFINITION_RUNS_DETAIL,
		params: { testId: row.testDefinitionId, runId: row.id },
	});
};
</script>

<template>
	<div :class="$style.runs">
		<MetricsChart v-model:selectedMetric="selectedMetric" :runs="runs" :theme="appliedTheme" />

		<TestRunsTable
			:class="$style.runsTable"
			:runs
			:columns
			:selectable="true"
			data-test-id="past-runs-table"
			@delete-runs="onDeleteRuns"
			@row-click="handleRowClick"
		/>
	</div>
</template>

<style module lang="scss">
.runs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
	flex: 1;
	overflow: auto;
	margin-bottom: 20px;
}
</style>
