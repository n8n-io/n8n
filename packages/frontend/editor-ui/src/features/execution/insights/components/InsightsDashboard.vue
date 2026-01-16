<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import type { DateValue } from '@internationalized/date';
import { getLocalTimeZone, now, toCalendarDateTime, today } from '@internationalized/date';
import type { InsightsSummaryType } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import {
	computed,
	defineAsyncComponent,
	onBeforeMount,
	onMounted,
	ref,
	shallowRef,
	watch,
} from 'vue';
import { useRoute } from 'vue-router';
import { INSIGHT_TYPES } from '../insights.constants';
import { getTimeRangeLabels, timeRangeMappings } from '../insights.utils';
import InsightsDataRangePicker from './InsightsDataRangePicker.vue';

import { N8nHeading, N8nSpinner } from '@n8n/design-system';
const InsightsPaywall = defineAsyncComponent(
	async () => await import('@/features/execution/insights/components/InsightsPaywall.vue'),
);
const InsightsChartTotal = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartTotal.vue'),
);
const InsightsChartFailed = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartFailed.vue'),
);
const InsightsChartFailureRate = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartFailureRate.vue'),
);
const InsightsChartTimeSaved = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartTimeSaved.vue'),
);
const InsightsChartAverageRuntime = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartAverageRuntime.vue'),
);
const InsightsTableWorkflows = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/tables/InsightsTableWorkflows.vue'),
);

const props = defineProps<{
	insightType: InsightsSummaryType;
}>();

const route = useRoute();
const i18n = useI18n();

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

const granularity = computed(() => {
	const { start, end } = range.value;
	if (!start || !end) return 'day';

	const comparison = end.compare(start);

	if (comparison <= 0) return 'hour';
	if (comparison <= 30) return 'day';
	return 'week';
});
const selectedProject = ref<ProjectSharingData | null>(null);

const maxDate = today(getLocalTimeZone());

const maxLicensedDate =
	insightsStore.dateRanges.toReversed().find((dateRange) => dateRange.licensed)?.key ?? 'week';

const timeRangeLabels = getTimeRangeLabels();
const presets = computed(() =>
	insightsStore.dateRanges.map((item) => {
		return {
			value: timeRangeMappings[item.key],
			label: timeRangeLabels[item.key],
			disabled: !item.licensed,
		};
	}),
);

const maximumValue = shallowRef(maxDate.copy());
const minimumValue = shallowRef(
	maxDate.copy().subtract({ days: timeRangeMappings[maxLicensedDate] }),
);

const range = shallowRef<{
	start: DateValue;
	end: DateValue;
}>({
	start: maxDate.copy().subtract({ days: 7 }),
	end: maxDate.copy(),
});

/**
 * Converts the range to a UTC date range with the current time
 */
const getFilteredRange = () => {
	const timezone = getLocalTimeZone();
	const startDate = toCalendarDateTime(range.value.start, now(timezone)).toDate(timezone);
	const endDate = toCalendarDateTime(range.value.end, now(timezone)).toDate(timezone);

	return {
		startDate,
		endDate,
	};
};

const fetchPaginatedTableData = ({
	page = 0,
	itemsPerPage = 25,
	sortBy,
	projectId = selectedProject.value?.id,
}: {
	page?: number;
	itemsPerPage?: number;
	sortBy: Array<{ id: string; desc: boolean }>;
	projectId?: string;
}) => {
	const skip = page * itemsPerPage;
	const take = itemsPerPage;

	const sortKey = sortBy.length ? transformFilter(sortBy[0]) : undefined;

	const { startDate, endDate } = getFilteredRange();
	void insightsStore.table.execute(0, {
		skip,
		take,
		sortBy: sortKey,
		startDate,
		endDate,
		projectId,
	});
};

watch(
	() => [props.insightType, selectedProject.value, range.value],
	() => {
		sortTableBy.value = [{ id: props.insightType, desc: true }];

		const { startDate, endDate } = getFilteredRange();

		if (insightsStore.isSummaryEnabled) {
			void insightsStore.summary.execute(0, {
				startDate,
				endDate,
				projectId: selectedProject.value?.id,
			});
		}

		void insightsStore.charts.execute(0, {
			startDate,
			endDate,
			projectId: selectedProject.value?.id,
		});

		if (insightsStore.isDashboardEnabled) {
			fetchPaginatedTableData({
				sortBy: sortTableBy.value,
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

// Must be *only* <email> — no extra text before or after
const emailPattern = /^<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>$/;

const projects = computed(() =>
	projectsStore.availableProjects.filter(
		(project) => project.name && !emailPattern.test(project.name.trim()),
	),
);
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
					:projects="projects"
					:placeholder="i18n.baseText('insights.dashboard.search.placeholder')"
					:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
					size="mini"
					:class="$style.projectSelect"
					clearable
					@clear="selectedProject = null"
				/>

				<InsightsDataRangePicker
					v-model="range"
					:max-value="maximumValue"
					:min-value="minimumValue"
					:presets
				/>
			</div>

			<InsightsSummary
				v-if="insightsStore.isSummaryEnabled"
				:summary="insightsStore.summary.state"
				:loading="insightsStore.summary.isLoading"
				:start-date="range.start"
				:end-date="range.end"
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
						{{ granularity }}
						<component
							:is="chartComponents[props.insightType]"
							:type="props.insightType"
							:data="insightsStore.charts.state"
							:granularity
							:start-date="range.start.toString()"
							:end-date="range.end.toString()"
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
	max-width: var(--content-container--width);
	padding: var(--spacing--lg) var(--spacing--2xl);
	margin: 0 auto;
}

.insightsBanner {
	margin-bottom: 0;

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

.PresetButton {
	background-color: transparent;
	border: none;
	transition-property:
		color,
		background-color,
		border-color,
		text-decoration-color,
		fill,
		stroke,
		opacity,
		box-shadow,
		transform,
		filter,
		backdrop-filter,
		-webkit-backdrop-filter;
	transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	transition-duration: 0.15s;
	border-radius: 0.375rem;
	padding-left: 0.75rem;
	padding-right: 0.75rem;
	padding-top: 0.5rem;
	padding-bottom: 0.5rem;
	text-align: left;
	font-size: 13px;
	cursor: pointer;
	color: var(--color--text);
	font-weight: 400;
	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}
</style>
