<script setup lang="ts">
import type { TestRunRecord } from '../../evaluation.api';
import MetricsChart from './MetricsChart.vue';
import TestRunsTable from './TestRunsTable.vue';
import { N8nPagination } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
	runs: Array<TestRunRecord & { index: number }>;
	workflowId: string;
	// When set, the table paginates to this many rows per page. The chart still
	// plots every run. Omitted → the full table renders, no pagination.
	pageSize?: number;
}>();

const locale = useI18n();
const router = useRouter();

const selectedMetric = defineModel<string>('selectedMetric', { required: true });

const currentPage = ref(1);
const showPagination = computed(() => !!props.pageSize && props.runs.length > props.pageSize);

// Newest-first ordering for pagination so page 1 holds the most recent runs
// (the incoming `runs` prop is ascending, for the chart's left→right trend).
// Ties on `runAt` fall back to run number so equal-timestamp runs stay in
// sequence. The table re-applies its own descending sort within each page.
const runsNewestFirst = computed(() =>
	[...props.runs].sort((a, b) => {
		const byDate = new Date(b.runAt).getTime() - new Date(a.runAt).getTime();
		return byDate !== 0 ? byDate : b.index - a.index;
	}),
);
const pagedRuns = computed(() => {
	if (!props.pageSize) return props.runs;
	const start = (currentPage.value - 1) * props.pageSize;
	return runsNewestFirst.value.slice(start, start + props.pageSize);
});

// Clamp the page when the run set shrinks (or polling changes it) so we never
// land on an empty page past the end.
watch(
	() => props.runs.length,
	() => {
		const maxPage = props.pageSize ? Math.max(1, Math.ceil(props.runs.length / props.pageSize)) : 1;
		if (currentPage.value > maxPage) currentPage.value = maxPage;
	},
);

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
		label: locale.baseText('evaluation.listRuns.runNumber'),
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
		label: locale.baseText('evaluation.listRuns.status'),
		sortable: true,
	},
	...metricColumns.value,
]);

const handleRowClick = (row: TestRunRecord) => {
	void router.push({
		name: VIEWS.EVALUATION_RUNS_DETAIL,
		params: { runId: row.id },
	});
};
</script>

<template>
	<div :class="[$style.runs, pageSize ? $style.paged : null]">
		<MetricsChart v-model:selected-metric="selectedMetric" :runs="runs" />

		<TestRunsTable
			:class="$style.runsTable"
			:runs="pagedRuns"
			:columns
			:selectable="true"
			data-test-id="past-runs-table"
			@row-click="handleRowClick"
		/>

		<N8nPagination
			v-if="showPagination"
			:class="$style.pagination"
			layout="prev, pager, next"
			:current-page="currentPage"
			:page-size="pageSize"
			:total="runs.length"
			@update:current-page="currentPage = $event"
		/>
	</div>
</template>

<style module lang="scss">
.runs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	flex: 1;
	overflow: auto;
	margin-bottom: 20px;
}

// Stacked/paginated mode: the table is capped to `pageSize` rows so it never
// needs its own scroll region. Let the section grow with its content and defer
// scrolling to the page so there's a single page-level scrollbar.
.paged {
	flex: none;
	overflow: visible;
	margin-bottom: 0;
}

.pagination {
	display: flex;
	justify-content: center;
}
</style>
