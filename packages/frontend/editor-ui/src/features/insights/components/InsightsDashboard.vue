<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/insights/insights.store';
import type { InsightsSummaryType } from '@n8n/api-types';
import { computed, defineAsyncComponent, ref, watch } from 'vue';

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

const i18n = useI18n();

const insightsStore = useInsightsStore();

const chartComponents = computed(() => ({
	total: InsightsChartTotal,
	failed: InsightsChartFailed,
	failureRate: InsightsChartFailureRate,
	timeSaved: InsightsChartTimeSaved,
	averageRunTime: InsightsChartAverageRuntime,
}));

const transformFilter = ({ id, desc }: { id: string; desc: boolean }) => {
	const key = id as InsightsSummaryType;
	const order = desc ? 'desc' : 'asc';
	return `${key}:${order}` as const;
};

const fetchPaginatedTableData = ({
	page = 0,
	itemsPerPage = 20,
	sortBy,
}: {
	page?: number;
	itemsPerPage?: number;
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

const sortTableBy = ref([{ id: props.insightType, desc: true }]);
watch(
	() => props.insightType,
	() => {
		sortTableBy.value = [{ id: props.insightType, desc: true }];

		if (insightsStore.isSummaryEnabled) {
			void insightsStore.summary.execute();
		}

		if (insightsStore.isDashboardEnabled) {
			void insightsStore.charts.execute();
			fetchPaginatedTableData({ sortBy: sortTableBy.value });
		}
	},
	{
		immediate: true,
	},
);
</script>

<template>
	<div :class="$style.insightsView">
		<div :class="$style.insightsContainer">
			<N8nHeading bold tag="h2" size="xlarge">
				{{ i18n.baseText('insights.dashboard.title') }}
			</N8nHeading>
			<div>
				<InsightsSummary
					v-if="insightsStore.isSummaryEnabled"
					:summary="insightsStore.summary.state"
					:loading="insightsStore.summary.isLoading"
					:class="$style.insightsBanner"
				/>
				<div :class="$style.insightsContent">
					<InsightsPaywall
						v-if="!insightsStore.isDashboardEnabled"
						data-test-id="insights-dashboard-unlicensed"
					/>
					<div v-else>
						<div :class="$style.insightsChartWrapper">
							<div v-if="insightsStore.charts.isLoading" :class="$style.chartLoader">
								<svg
									width="22"
									height="22"
									viewBox="0 0 22 22"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M21 11C21 16.5228 16.5228 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1C11.6293 1 12.245 1.05813 12.8421 1.16931"
										stroke="currentColor"
										stroke-width="2"
									/>
								</svg>
								{{ i18n.baseText('insights.chart.loading') }}
							</div>
							<component
								:is="chartComponents[props.insightType]"
								v-else
								:type="props.insightType"
								:data="insightsStore.charts.state"
							/>
						</div>
						<div :class="$style.insightsTableWrapper">
							<InsightsTableWorkflows
								v-model:sort-by="sortTableBy"
								:data="insightsStore.table.state"
								:loading="insightsStore.table.isLoading"
								@update:options="fetchPaginatedTableData"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.insightsView {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 30px;
	overflow: auto;
}

.insightsContainer {
	width: 100%;
	max-width: var(--content-container-width);
	padding: var(--spacing-l) var(--spacing-2xl);
	margin: 0 auto;
}

.insightsBanner {
	padding-bottom: 0;

	ul {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
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

.chartLoader {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 9px;
}
</style>
