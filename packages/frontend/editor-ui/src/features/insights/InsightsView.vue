<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Line, Bar } from 'vue-chartjs';
import { Filler, type ChartOptions, type ChartData } from 'chart.js';
import { useCssVar, useAsyncState } from '@vueuse/core';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import {
	lineDatasetWithGradient,
	dashedLineDatasetWithGradient,
	barDataset,
	useLegendPlugin,
	generateLineChartOptions,
	generateBarChartOptions,
} from './chartjs.utils';
import { useInsightsStore } from '@/features/insights/insights.store';
import InsightsSummary from '@/features/insights/InsightsSummary.vue';
import { useInsights } from '@/features/insights/insights.composable';
const props = defineProps<{
	insightType: string;
}>();
const route = useRoute();
const router = useRouter();
type Filter = { time_span: string };
const getDefaultFilter = (query: LocationQuery): Filter => {
	const { time_span } = query as Filter;
	return {
		time_span: time_span ?? '30',
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
const { state: summaries, execute: fetchSummary } = useAsyncState(
	async () => await insightsStore.fetchSummary(),
	[],
	{
		immediate: true,
	},
);
watch(
	() => filters.value.time_span,
	async () => await fetchSummary(),
);
const tabs = computed(() =>
	summaries.value.map((summary) => ({
		...summary,
		to: { params: { insightType: summary.id }, query: route.query },
	})),
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
const { legends, LegendPlugin } = useLegendPlugin();
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
		id: 'runTime',
		path: 'runTime',
		label: 'Avg. run time',
	},
	{
		id: 'timeSaved',
		path: 'timeSaved',
		label: 'Time saved',
	},
	{
		id: 'updated',
		path: 'updated',
		label: 'Updated',
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
	<div class="insights-view">
		<N8nHeading bold tag="h2" size="xlarge">Insights</N8nHeading>
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
			<div style="display: flex; gap: 6px">
				<N8nButton type="tertiary"> Notifications</N8nButton>
				<N8nButton type="tertiary"> Export </N8nButton>
			</div>
		</div>

		<div>
			<InsightsSummary :summaries="tabs" />
			<div class="content">
				<div style="height: 292px">
					<template v-if="isLoadingCounts"> loading </template>
					<template v-else>
						<div class="legend">
							<button
								v-for="(legend, index) in legends"
								:key="index"
								type="button"
								:class="{ strike: legend.hidden }"
								@click="legend.onClick"
							>
								{{ legend.text }}
							</button>
						</div>
						<template v-if="insightType === 'total'">
							<Bar
								:data="barChartData"
								:options="barChartOptions"
								:plugins="[LegendPlugin]"
								class="line-chart"
							/>
						</template>
						<template v-if="insightType === 'failed'">
							<Bar
								:data="barChartData"
								:options="barChartOptions"
								:plugins="[LegendPlugin]"
								class="line-chart"
							/>
						</template>
						<template v-if="insightType === 'failureRate'">
							<Bar
								:data="barChartData"
								:options="barChartOptions"
								:plugins="[LegendPlugin]"
								class="line-chart"
							/>
						</template>
						<template v-if="insightType === 'timeSaved'">
							<Line
								:data="lineChartData"
								:options="lineChartOptions"
								class="line-chart"
								:plugins="[Filler, LegendPlugin]"
							/>
						</template>
						<template v-if="insightType === 'runTime'">
							<div class="callout">
								<N8nIcon icon="lock" size="size"></N8nIcon>
								<N8nText bold tag="h3" size="large"
									>Upgrade to Pro or Enterprise to see full data</N8nText
								>
								<N8nText
									>Gain access to detailed execution data with one year data retention.
									<N8nLink to="/">Learn more</N8nLink>
								</N8nText>
								<N8nButton type="primary" size="large">Upgrade</N8nButton>
							</div>
							<!-- <N8nActionBox
								emoji="👋"
								:heading="'asdasda'"
								:description="'asdasda'"
								:button-text="'asdasda'"
								button-type="secondary"
							>
							</N8nActionBox> -->
							<!-- <Line
								:data="lineChartData"
								:options="lineChartOptions"
								class="line-chart"
								:plugins="[Filler, LegendPlugin]"
							/> -->
						</template>
					</template>
				</div>
				<div>
					<N8nHeading bold tag="h3" size="medium" class="mb-s">Workflow insights</N8nHeading>
					<N8nDatatable
						:columns
						:rows
						:current-page="currentPage"
						@update:current-page="($event) => (currentPage = $event)"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.insights-view {
	padding: var(--spacing-l) var(--spacing-2xl);
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 30px;
	overflow: auto;
}
.content {
	padding: 16px 24px;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-top: 0;
	border-bottom-left-radius: 6px;
	border-bottom-right-radius: 6px;
}
.summary {
	border-bottom-right-radius: 0;
	border-bottom-left-radius: 0;
}
.strike {
	text-decoration: line-through;
}
.callout {
	display: flex;
	flex-direction: column;
	height: 100%;
	align-items: center;
	max-width: 360px;
	margin: 0 auto;
	text-align: center;
	gap: 10px;
	justify-content: center;
}
</style>
