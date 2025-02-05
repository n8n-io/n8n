<script setup lang="ts">
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { computed, ref } from 'vue';
import type { TestTableColumn } from '../shared/TestTableBase.vue';
import TestTableBase from '../shared/TestTableBase.vue';
import { convertToDisplayDate } from '@/utils/typesUtils';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';

const emit = defineEmits<{
	getRunDetail: [run: TestRunRecord];
	selectionChange: [runs: TestRunRecord[]];
	deleteRuns: [runs: TestRunRecord[]];
}>();

const props = defineProps<{
	runs: TestRunRecord[];
	selectable?: boolean;
}>();

const locale = useI18n();
const navigateToRunDetail = (run: TestRunRecord) => emit('getRunDetail', run);
const selectedRows = ref<TestRunRecord[]>([]);

// Combine test run statuses and finalResult to get the final status
const runSummaries = computed(() => {
	return props.runs.map(({ status, finalResult, ...run }) => {
		if (status === 'completed' && finalResult) {
			return { ...run, status: finalResult };
		}

		return { ...run, status };
	});
});

const metrics = computed(() => {
	return props.runs.reduce((acc, run) => {
		const metricKeys = Object.keys(run.metrics ?? {});
		return [...new Set([...acc, ...metricKeys])];
	}, [] as string[]);
});

const getErrorTooltipLinkRoute = (row: TestRunRecord) => {
	if (row.errorCode === 'EVALUATION_WORKFLOW_NOT_FOUND') {
		return {
			name: VIEWS.TEST_DEFINITION_EDIT,
			params: {
				testId: row.testDefinitionId,
			},
		};
	}

	return undefined;
};

const columns = computed((): Array<TestTableColumn<TestRunRecord>> => {
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
			prop: 'status',
			label: locale.baseText('testDefinition.listRuns.status'),
			filters: [
				{ text: locale.baseText('testDefinition.listRuns.status.new'), value: 'new' },
				{ text: locale.baseText('testDefinition.listRuns.status.running'), value: 'running' },
				{ text: locale.baseText('testDefinition.listRuns.status.completed'), value: 'completed' },
				{ text: locale.baseText('testDefinition.listRuns.status.error'), value: 'error' },
				{ text: locale.baseText('testDefinition.listRuns.status.cancelled'), value: 'cancelled' },
			],
			errorRoute: getErrorTooltipLinkRoute,
			filterMethod: (value: string, row: TestRunRecord) => row.status === value,
		},
		{
			prop: 'date',
			label: locale.baseText('testDefinition.listRuns.runDate'),
			sortable: true,
			formatter: (row: TestRunRecord) =>
				convertToDisplayDate(new Date(row.runAt ?? row.createdAt).getTime()),
			sortMethod: (a: TestRunRecord, b: TestRunRecord) =>
				new Date(a.runAt ?? a.createdAt).getTime() - new Date(b.runAt ?? b.createdAt).getTime(),
		},

		...metrics.value.map((metric) => ({
			prop: `metrics.${metric}`,
			label: metric,
			sortable: true,
			formatter: (row: TestRunRecord) => `${row.metrics?.[metric]?.toFixed(2) ?? '-'}`,
		})),
	];
});

function onSelectionChange(runs: TestRunRecord[]) {
	selectedRows.value = runs;
	emit('selectionChange', runs);
}

async function deleteRuns() {
	emit('deleteRuns', selectedRows.value);
}
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="large" :bold="true" :class="$style.runsTableHeading">{{
			locale.baseText('testDefinition.edit.pastRuns')
		}}</N8nHeading>
		<div :class="$style.header">
			<n8n-button
				v-show="selectedRows.length > 0"
				type="danger"
				:class="$style.activator"
				size="medium"
				icon="trash"
				data-test-id="delete-runs-button"
				@click="deleteRuns"
			>
				{{
					locale.baseText('testDefinition.listRuns.deleteRuns', {
						adjustToNumber: selectedRows.length,
					})
				}}
			</n8n-button>
		</div>
		<TestTableBase
			:data="runSummaries"
			:columns="columns"
			selectable
			@row-click="navigateToRunDetail"
			@selection-change="onSelectionChange"
		/>
		<N8nText :class="$style.runsTableTotal">{{
			locale.baseText('testDefinition.edit.pastRuns.total', { adjustToNumber: runs.length })
		}}</N8nText>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: 10px;
	flex: 1;
}
</style>
