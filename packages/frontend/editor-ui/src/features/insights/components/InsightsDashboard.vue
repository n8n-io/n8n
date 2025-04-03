<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/insights/insights.store';
import type { InsightsSummaryType } from '@n8n/api-types';
import { computed, defineAsyncComponent, watch } from 'vue';
import { useRoute, type LocationQuery } from 'vue-router';

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
const InsightsChartAverageRuntime = defineAsyncComponent(
	async () => await import('@/features/insights/components/charts/InsightsChartAverageRuntime.vue'),
);
const InsightsTableWorkflows = defineAsyncComponent(
	async () => await import('@/features/insights/components/tables/InsightsTableWorkflows.vue'),
);

const props = defineProps<{
	insightType: InsightsSummaryType;
}>();

const route = useRoute();
const i18n = useI18n();

const insightsStore = useInsightsStore();

const chartComponents = computed(() => ({
	total: InsightsChartTotal,
	failed: InsightsChartFailed,
	failureRate: InsightsChartFailureRate,
	timeSaved: InsightsChartTimeSaved,
	averageRunTime: InsightsChartAverageRuntime,
}));

type Filter = { time_span: string };
const getDefaultFilter = (query: LocationQuery): Filter => {
	const { time_span } = query as Filter;
	return {
		time_span: time_span ?? '7',
	};
};
const filters = computed(() => getDefaultFilter(route.query));

const transformFilter = ({ id, desc }: { id: string; desc: boolean }) => {
	// TODO: remove exclude once failureRate is added to the BE
	const key = id as Exclude<InsightsSummaryType, 'failureRate'>;
	const order = desc ? 'desc' : 'asc';
	return `${key}:${order}` as const;
};

const fetchPaginatedTableData = ({
	page,
	itemsPerPage,
	sortBy,
}: {
	page: number;
	itemsPerPage: number;
	sortBy: Array<{ id: string; desc: boolean }>;
}) => {
	const skip = page * itemsPerPage;
	const take = itemsPerPage;

	const sortKey = sortBy.length ? transformFilter(sortBy[0]) : undefined;

	void insightsStore.table.execute(0, {
		skip,
		take,
		sortBy: sortKey,
	});
};

watch(
	() => filters.value.time_span,
	() => {
		if (insightsStore.isSummaryEnabled) {
			void insightsStore.summary.execute();
		}

		void insightsStore.charts.execute();
		void insightsStore.table.execute();
	},
	{
		immediate: true,
	},
);
</script>

<template>
	<div :class="$style.insightsView">
		<N8nHeading bold tag="h2" size="xlarge">{{
			i18n.baseText('insights.dashboard.title')
		}}</N8nHeading>
		<div>
			<InsightsSummary
				v-if="insightsStore.isSummaryEnabled"
				:summary="insightsStore.summary.state"
				:loading="insightsStore.summary.isLoading"
				:class="$style.insightsBanner"
			/>
			<div v-if="insightsStore.isInsightsEnabled" :class="$style.insightsContent">
				<div :class="$style.insightsChartWrapper">
					<template v-if="insightsStore.charts.isLoading"> loading </template>
					<component
						:is="chartComponents[props.insightType]"
						v-else
						:type="props.insightType"
						:data="insightsStore.charts.state"
					/>
				</div>
				<div :class="$style.insightsTableWrapper">
					<InsightsTableWorkflows
						:data="insightsStore.table.state"
						:loading="insightsStore.table.isLoading"
						@update:options="fetchPaginatedTableData"
					/>
				</div>
			</div>
			<InsightsPaywall v-else data-test-id="insights-dashboard-unlicensed" />
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
	max-width: var(--content-container-width);
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
</style>
