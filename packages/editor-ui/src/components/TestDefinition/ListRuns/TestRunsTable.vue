<script setup lang="ts">
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { computed } from 'vue';
import type { TestDefinitionTableColumn } from '../shared/TestDefinitionTable.vue';
import TestDefinitionTable from '../shared/TestDefinitionTable.vue';
import { convertToDisplayDate } from '@/utils/typesUtils';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';

const emit = defineEmits<{
	getRunDetail: [run: TestRunRecord];
}>();

const props = defineProps<{
	runs: TestRunRecord[];
}>();

const locale = useI18n();
const navigateToRunDetail = (run: TestRunRecord) => emit('getRunDetail', run);

const metrics = computed(() => {
	return props.runs.reduce((acc, run) => {
		const metricKeys = Object.keys(run.metrics ?? {});
		return [...new Set([...acc, ...metricKeys])];
	}, [] as string[]);
});

const columns = computed((): Array<TestDefinitionTableColumn<TestRunRecord>> => {
	return [
		{
			prop: 'runNumber',
			label: locale.baseText('testDefinition.listRuns.runNumber'),
			width: 200,
			route: (row: TestRunRecord) => ({
				name: VIEWS.TEST_DEFINITION_RUNS_DETAIL,
				params: { testId: row.testDefinitionId, runId: row.id },
			}),
			formatter: (row: TestRunRecord) => `${row.id}`,
		},
		{
			prop: 'date',
			label: locale.baseText('testDefinition.listRuns.runDate'),
			width: 200,
			sortable: true,
			formatter: (row: TestRunRecord) => convertToDisplayDate(new Date(row.runAt).getTime()),
		},
		{
			prop: 'status',
			label: locale.baseText('testDefinition.listRuns.status'),
			width: 120,
			filters: [
				{ text: locale.baseText('testDefinition.listRuns.status.new'), value: 'new' },
				{ text: locale.baseText('testDefinition.listRuns.status.running'), value: 'running' },
				{ text: locale.baseText('testDefinition.listRuns.status.completed'), value: 'completed' },
				{ text: locale.baseText('testDefinition.listRuns.status.error'), value: 'error' },
			],
			filterMethod: (value: string, row: TestRunRecord) => row.status === value,
		},
		...metrics.value.map((metric) => ({
			prop: `metrics.${metric}`,
			label: metric,
			sortable: true,
			formatter: (row: TestRunRecord) => `${row.metrics?.[metric]?.toFixed(2) ?? '-'}`,
		})),
	];
});
</script>

<template>
	<TestDefinitionTable :data="runs" :columns="columns" @row-click="navigateToRunDetail" />
</template>
