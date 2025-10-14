<script setup lang="ts">
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useTelemetry } from '@/composables/useTelemetry';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/insights/insights.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { ProjectSharingData } from '@/features/projects/projects.types';
import type { InsightsDateRange, InsightsSummaryType } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed, defineAsyncComponent, onBeforeMount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { INSIGHT_TYPES, TELEMETRY_TIME_RANGE, UNLICENSED_TIME_RANGE } from '../insights.constants';
import InsightsDateRangeSelect from './InsightsDateRangeSelect.vue';
import InsightsUpgradeModal from './InsightsUpgradeModal.vue';

import { N8nHeading, N8nSpinner } from '@n8n/design-system';
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
const telemetry = useTelemetry();

const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();

const isTimeSavedRoute = computed(() => route.params.insightType === INSIGHT_TYPES.TIME_SAVED);

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

const sortTableBy = ref([{ id: props.insightType, desc: true }]);

const upgradeModalVisible = ref(false);
const selectedDateRange = ref<InsightsDateRange['key']>('week');
const granularity = computed(
	() =>
		insightsStore.dateRanges.find((item) => item.key === selectedDateRange.value)?.granularity ??
		'day',
);
const selectedProject = ref<ProjectSharingData | null>(null);

const fetchPaginatedTableData = ({
	page = 0,
	itemsPerPage = 25,
	sortBy,
	dateRange = selectedDateRange.value,
	projectId = selectedProject.value?.id,
}: {
	page?: number;
	itemsPerPage?: number;
	sortBy: Array<{ id: string; desc: boolean }>;
	dateRange?: InsightsDateRange['key'];
	projectId?: string;
}) => {
	const skip = page * itemsPerPage;
	const take = itemsPerPage;

	const sortKey = sortBy.length ? transformFilter(sortBy[0]) : undefined;

	void insightsStore.table.execute(0, {
		skip,
		take,
		sortBy: sortKey,
		dateRange,
		projectId,
	});
};

function handleTimeChange(value: InsightsDateRange['key'] | typeof UNLICENSED_TIME_RANGE) {
	if (value === UNLICENSED_TIME_RANGE) {
		upgradeModalVisible.value = true;
		return;
	}

	selectedDateRange.value = value;
	telemetry.track('User updated insights time range', { range: TELEMETRY_TIME_RANGE[value] });
}

watch(
	() => [props.insightType, selectedDateRange.value, selectedProject.value],
	() => {
		sortTableBy.value = [{ id: props.insightType, desc: true }];

		if (insightsStore.isSummaryEnabled) {
			void insightsStore.summary.execute(0, {
				dateRange: selectedDateRange.value,
				projectId: selectedProject.value?.id,
			});
		}

		void insightsStore.charts.execute(0, {
			dateRange: selectedDateRange.value,
			projectId: selectedProject.value?.id,
		});
		if (insightsStore.isDashboardEnabled) {
			fetchPaginatedTableData({
				sortBy: sortTableBy.value,
				dateRange: selectedDateRange.value,
				projectId: selectedProject.value?.id,
			});
		}
	},
	{
		immediate: true,
	},
);

onMounted(() => {
	useDocumentTitle().set(i18n.baseText('insights.heading'));
});
onBeforeMount(async () => {
	await projectsStore.getAvailableProjects();
});
</script>

<template>
	<div :class="$style.insightsView">
		<div :class="$style.insightsContainer">
			<N8nHeading bold tag="h2" size="xlarge">
				{{ i18n.baseText('insights.dashboard.title') }}
			</N8nHeading>

			<div class="mt-s" style="display: flex; gap: 12px; align-items: center">
				<ProjectSharing
					v-model="selectedProject"
					:projects="projectsStore.availableProjects"
					:placeholder="i18n.baseText('insights.dashboard.search.placeholder')"
					:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
					size="mini"
					:class="$style.projectSelect"
					clearable
					@clear="selectedProject = null"
				/>

				<InsightsDateRangeSelect
					:model-value="selectedDateRange"
					style="width: 173px"
					data-test-id="range-select"
					@update:model-value="handleTimeChange"
				/>

				<InsightsUpgradeModal v-model="upgradeModalVisible" />
			</div>

			<InsightsSummary
				v-if="insightsStore.isSummaryEnabled"
				:summary="insightsStore.summary.state"
				:loading="insightsStore.summary.isLoading"
				:time-range="selectedDateRange"
				:class="$style.insightsBanner"
			/>
			<div :class="$style.insightsContent">
				<div
					v-if="insightsStore.isDashboardEnabled || isTimeSavedRoute"
					:class="$style.insightsContentWrapper"
				>
					<div
						:class="[
							$style.dataLoader,
							{
								[$style.isDataLoading]:
									insightsStore.charts.isLoading || insightsStore.table.isLoading,
							},
						]"
					>
						<N8nSpinner />
						<span>{{ i18n.baseText('insights.chart.loading') }}</span>
					</div>
					<div :class="$style.insightsChartWrapper">
						<component
							:is="chartComponents[props.insightType]"
							:type="props.insightType"
							:data="insightsStore.charts.state"
							:granularity
						/>
					</div>
					<div :class="$style.insightsTableWrapper">
						<InsightsTableWorkflows
							v-model:sort-by="sortTableBy"
							:data="insightsStore.table.state"
							:loading="insightsStore.table.isLoading"
							:is-dashboard-enabled="insightsStore.isDashboardEnabled"
							@update:options="fetchPaginatedTableData"
						/>
					</div>
				</div>
				<InsightsPaywall v-else />
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
	padding: var(--spacing--lg) var(--spacing--2xl);
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
	padding: var(--spacing--lg) 0;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-top: 0;
	border-bottom-left-radius: 6px;
	border-bottom-right-radius: 6px;
	background: var(--color--background--light-3);
}

.insightsContentWrapper {
	position: relative;
	overflow-x: hidden;
}

.insightsChartWrapper {
	position: relative;
	height: 292px;
	padding: 0 var(--spacing--lg);
	z-index: 1;
}

.insightsTableWrapper {
	position: relative;
	padding: var(--spacing--lg) var(--spacing--lg) 0;
	z-index: 1;
}

.dataLoader {
	position: absolute;
	top: 0;
	left: -100%;
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 9px;
	z-index: 2;

	&.isDataLoading {
		transition: left 0s linear;
		left: 0;
		transition-delay: 0.5s;
	}

	> span {
		position: relative;
		z-index: 2;
	}

	&::before {
		content: '';
		position: absolute;
		display: block;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: var(--color--background--light-3);
		opacity: 0.75;
		z-index: 1;
	}
}

.projectSelect {
	min-width: 200px;
	:global(.el-input--suffix .el-input__inner) {
		padding-right: 26px;
	}
}
</style>
