<script setup lang="ts">
import type { TestRunRecord } from '@/api/evaluation.ee';
import MetricsChart from '@/components/Evaluations/ListRuns/MetricsChart.vue';
import TestRunsTable from '@/components/Evaluations/ListRuns/TestRunsTable.vue';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
	runs: Array<TestRunRecord & { index: number }>;
	workflowId: string;
}>();

const locale = useI18n();
const router = useRouter();

const selectedMetric = defineModel<string>('selectedMetric', { required: true });

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
		formatter: (row: TestRunRecord) =>
			row.metrics?.[metric] !== undefined ? (row.metrics?.[metric]).toFixed(2) : '',
	})),
);

const columns = computed(() => [
	{
		prop: 'id',
		label: locale.baseText('testDefinition.listRuns.runNumber'),
		showOverflowTooltip: true,
	},
	{
		prop: 'runAt',
		label: 'Run at',
		sortable: true,
		showOverflowTooltip: true,
		formatter: (row: TestRunRecord) => {
			const { date, time } = convertToDisplayDate(row.runAt);
			return [date, time].join(', ');
		},
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
		name: VIEWS.EVALUATION_RUNS_DETAIL,
		params: { testId: row.testDefinitionId, runId: row.id },
	});
};
</script>

<template>
	<div :class="$style.runs">
		<MetricsChart v-model:selectedMetric="selectedMetric" :runs="runs" />

		<TestRunsTable
			:class="$style.runsTable"
			:runs
			:columns
			:selectable="true"
			data-test-id="past-runs-table"
			@row-click="handleRowClick"
		/>
	</div>
</template>

<style module lang="scss">
.runs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	flex: 1;
	overflow: auto;
	margin-bottom: 20px;
}
</style>
