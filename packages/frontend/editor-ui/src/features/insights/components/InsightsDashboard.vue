<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { Line, Bar } from 'vue-chartjs';
import { Filler, type ChartOptions, type ChartData } from 'chart.js';
import { useCssVar, useAsyncState } from '@vueuse/core';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import type { InsightsSummaryType } from '@n8n/api-types';
import {
	lineDatasetWithGradient,
	dashedLineDatasetWithGradient,
	barDataset,
	useLegendPlugin,
	generateLineChartOptions,
	generateBarChartOptions,
} from '@/features/insights/chartjs.utils';
import { useInsightsStore } from '@/features/insights/insights.store';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useI18n } from '@/composables/useI18n';

const InsightsPaywall = defineAsyncComponent(
	async () => await import('@/features/insights/components/InsightsPaywall.vue'),
);
const InsightsChartTotal = defineAsyncComponent(
	async () => await import('@/features/insights/components/charts/InsightsChartTotal.vue'),
);
const InsightsChartFailed = defineAsyncComponent(
	async () => await import('@/features/insights/components/charts/InsightsChartFailed.vue'),
);
const InsightsChartFailureRate = defineAsyncComponent(
	async () => await import('@/features/insights/components/charts/InsightsChartFailureRate.vue'),
);
const InsightsChartTimeSaved = defineAsyncComponent(
	async () => await import('@/features/insights/components/charts/InsightsChartTimeSaved.vue'),
);

const props = defineProps<{
	insightType: InsightsSummaryType;
}>();

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
type Filter = { time_span: string };
const getDefaultFilter = (query: LocationQuery): Filter => {
	const { time_span } = query as Filter;
	return {
		time_span: time_span ?? '7',
	};
};
const filters = computed(() => getDefaultFilter(route.query));
const updateFilter = async (filter: Filter) =>
	await router.replace({ query: getDefaultFilter(filter) });
const timeOptions = [
	{
		label: 'Last 7 days',
		value: '7',
	},
	{
		label: 'Last 30 days',
		value: '30',
	},
	{
		label: 'Last 60 days',
		value: '60',
	},
	{
		label: 'Last 90 days',
		value: '90',
	},
	{
		label: 'Last One year',
		value: '365',
	},
];
const colorPrimary = useCssVar('--color-primary', document.body);
const insightsStore = useInsightsStore();

watch(
	() => filters.value.time_span,
	() => {
		void insightsStore.summary.execute();
		void insightsStore.charts.execute();
		void insightsStore.table.execute();
	},
	{
		immediate: true,
	},
);

const {
	state: counts,
	execute: fetchCounts,
	isLoading: isLoadingCounts,
} = useAsyncState(
	async () => await insightsStore.fetchCounts({ time_span: Number(filters.value.time_span) }),
	{
		total: {
			failure: [],
			success: [],
		},
		failed: [],
		failureRate: [],
		timeSaved: {
			average: [],
			median: [],
		},
		runTime: [],
	},
	{
		immediate: true,
	},
);
watch(
	() => filters.value.time_span,
	async () => await fetchCounts(),
);
const buildChartFromDataset = (dataSource: string) => {
	if (dataSource === 'total') {
		const data = counts.value[dataSource];
		return [
			barDataset({
				label: 'Failure',
				backgroundColor: colorPrimary.value,
				data: data.failure,
			}),
			barDataset({
				label: 'Success',
				backgroundColor: '#3E999F',
				data: data.success,
			}),
		];
	}
	if (dataSource === 'failed') {
		return [
			barDataset({
				label: 'Daily average',
				backgroundColor: '#FF616E',
				data: counts.value[dataSource],
			}),
		];
	}
	if (dataSource === 'failureRate') {
		return [
			barDataset({
				label: 'Daily average',
				backgroundColor: colorPrimary.value,
				data: counts.value[dataSource],
			}),
		];
	}
	if (dataSource === 'timeSaved') {
		const data = counts.value[dataSource];
		return [
			dashedLineDatasetWithGradient({
				label: 'Daily average',
				data: data.average,
			}),
			lineDatasetWithGradient({
				label: 'Median',
				data: data.median,
			}),
		];
	}
	if (dataSource === 'runTime') {
		return [
			lineDatasetWithGradient({
				label: 'Daily average',
				data: counts.value[dataSource],
			}),
		];
	}
	return [];
};
const barChartOptions = ref<ChartOptions<'bar'>>(generateBarChartOptions());
const lineChartOptions = ref<ChartOptions<'line'>>(generateLineChartOptions());
const { LegendPlugin } = useLegendPlugin();
const lineChartData = computed(
	() =>
		({
			datasets: buildChartFromDataset(props.insightType),
		}) as unknown as ChartData<'line'>,
);
const barChartData = computed(
	() =>
		({
			datasets: buildChartFromDataset(props.insightType),
		}) as unknown as ChartData<'bar'>,
);
const currentPage = ref();
const columns = ref([
	{
		id: 'name',
		path: 'name',
		label: 'Name',
	},
	{
		id: 'executions',
		path: 'executions',
		label: 'Executions',
	},
	{
		id: 'failures',
		path: 'failures',
		label: 'Failures',
	},
	{
		id: 'failuresRate',
		path: 'failuresRate',
		label: 'Failure rate',
	},
	{
		id: 'timeSaved',
		path: 'timeSaved',
		label: 'Time saved',
	},
	{
		id: 'runTime',
		path: 'runTime',
		label: 'Avg. run time',
	},
	{
		id: 'project',
		path: 'project',
		label: 'Project name',
	},
]);
const rows = ref(
	Array.from(Array(100).keys()).map((index) => ({
		id: crypto.randomUUID(),
		name: 'My workflow',
		executions: 1458,
		failures: 2,
		failuresRate: '0.3%',
		runTime: '8s',
		timeSaved: index % 2 ? 'Set estimate' : '62h',
		updated: '24.02.2024',
	})),
);
</script>

<template>
	<div :class="$style.insightsView">
		<N8nHeading bold tag="h2" size="xlarge">{{
			i18n.baseText('insights.dashboard.title')
		}}</N8nHeading>
		<div style="display: flex; justify-content: space-between">
			<div style="display: flex; gap: 6px">
				<N8nSelect
					:model-value="filters.time_span"
					@update:model-value="(value: string) => updateFilter({ ...filters, time_span: value })"
				>
					<N8nOption
						v-for="option in timeOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					>
					</N8nOption>
				</N8nSelect>
			</div>
		</div>

		<div>
			<InsightsSummary
				:summary="insightsStore.summary.state"
				:loading="insightsStore.summary.isLoading"
				:class="$style.insightsBanner"
			/>
			<div :class="$style.insightsContent">
				<div :class="$style.insightsChartWrapper">
					<template v-if="isLoadingCounts"> loading </template>
					<template v-else>
						<template v-if="insightType === 'total'">
							<InsightsChartTotal :data="insightsStore.charts.state" />
						</template>
						<template v-if="insightType === 'failed'">
							<InsightsChartFailed :data="insightsStore.charts.state" />
						</template>
						<template v-if="insightType === 'failureRate'">
							<InsightsChartFailureRate :data="insightsStore.charts.state" />
						</template>
						<template v-if="insightType === 'timeSaved'">
							<InsightsChartTimeSaved :data="insightsStore.charts.state" />
						</template>
						<template v-if="insightType === 'averageRunTime'">
							<InsightsPaywall />
						</template>
					</template>
				</div>
				<div :class="$style.insightsTableWrapper">
					<N8nHeading bold tag="h3" size="medium" class="mb-s">Workflow insights</N8nHeading>
					<N8nDatatable
						:columns
						:rows
						:current-page="currentPage"
						@update:current-page="($event: number) => (currentPage = $event)"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.insightsView {
	padding: var(--spacing-l) var(--spacing-2xl);
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 30px;
	overflow: auto;
}

.insightsBanner {
	padding-bottom: 0;

	ul {
		border-radius: 0;
	}
}

.insightsContent {
	padding: var(--spacing-l) 0;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-top: 0;
	border-bottom-left-radius: 6px;
	border-bottom-right-radius: 6px;
	background: var(--color-background-xlight);
}

.insightsChartWrapper {
	height: 292px;
	padding: 0 var(--spacing-l);
}

.insightsTableWrapper {
	padding: var(--spacing-l) var(--spacing-l) 0;
}

.strike {
	text-decoration: line-through;
}
</style>
