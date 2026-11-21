<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { getLocalTimeZone, today } from '@internationalized/date';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { useCssVar } from '@vueuse/core';
import {
	N8nDataTableServer,
	N8nEmptyState,
	N8nHeading,
	N8nLoading,
	N8nText,
	N8nUserInfo,
} from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system';
import type {
	AssistantUsageDay,
	AssistantUsageResponse,
	AssistantUsageSummary,
	AssistantUsageUser,
	AssistantUsageUsersResponse,
	AssistantUsageUsersSortBy,
} from '@n8n/api-types';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import {
	capabilities,
	capabilityRegistry,
	componentRegistry,
	type SlotProjectSelection,
} from '@n8n/frontend-module-sdk';

import { getAdjustedDateRange, getTimeRangeLabels, timeRangeMappings } from '../insights.utils';
import InsightsDataRangePicker from './InsightsDataRangePicker.vue';
import InsightsTabs from './InsightsTabs.vue';

type SortBy = TableOptions['sortBy'];

type CreatedKey = keyof Pick<
	AssistantUsageSummary,
	'workflowsCreated' | 'agentsCreated' | 'dataTablesCreated'
>;

const KPIS: Array<{ key: keyof AssistantUsageSummary; labelKey: BaseTextKey }> = [
	{ key: 'conversations', labelKey: 'insights.assistant.kpi.conversations' },
	{ key: 'messages', labelKey: 'insights.assistant.kpi.messages' },
	{ key: 'activeUsers', labelKey: 'insights.assistant.kpi.activeUsers' },
	{ key: 'workflowsCreated', labelKey: 'insights.assistant.kpi.workflowsCreated' },
	{ key: 'agentsCreated', labelKey: 'insights.assistant.kpi.agentsCreated' },
	{ key: 'dataTablesCreated', labelKey: 'insights.assistant.kpi.dataTablesCreated' },
];

/** The series of the created chart, bottom of the stack first. */
const CREATED_SERIES: Array<{ key: CreatedKey; labelKey: BaseTextKey; colorToken: string }> = [
	{
		key: 'workflowsCreated',
		labelKey: 'insights.assistant.types.workflow',
		colorToken: '--chart--color--series-1',
	},
	{
		key: 'agentsCreated',
		labelKey: 'insights.assistant.types.agent',
		colorToken: '--chart--color--series-2',
	},
	{
		key: 'dataTablesCreated',
		labelKey: 'insights.assistant.types.dataTable',
		colorToken: '--chart--color--series-3',
	},
];

const SORTABLE_COLUMNS = new Set<string>([
	'conversations',
	'messages',
	'workflowsCreated',
	'agentsCreated',
	'dataTablesCreated',
	'lastUsedAt',
]);

function isSortOption(value: string): value is AssistantUsageUsersSortBy {
	const [column, direction] = value.split(':');
	return SORTABLE_COLUMNS.has(column) && (direction === 'asc' || direction === 'desc');
}

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
// The insights store shows this page only when the shell provides the usage.
const usageSource = capabilityRegistry.use(capabilities.assistantUsage);

// The same range picker as the workflow insights, with every preset open: usage needs no license.
const maxDate = today(getLocalTimeZone());
const timeRangeLabels = getTimeRangeLabels();
const presets = Object.entries(timeRangeMappings).map(([key, days]) => ({
	value: days,
	label: timeRangeLabels[key as keyof typeof timeRangeLabels],
}));
// The shell's project picker, as on the Workflows tab. Unregistered means no picker.
const projectFilter = computed(() => componentRegistry.get('project-filter'));
const selectedProject = ref<SlotProjectSelection>(null);
const range = shallowRef<{ start: DateValue; end: DateValue }>({
	start: maxDate.copy().subtract({ days: 7 }),
	end: maxDate.copy(),
});
const usage = ref<AssistantUsageResponse | null>(null);
const isLoading = ref(false);

const users = ref<AssistantUsageUsersResponse>({ count: 0, data: [] });
const isUsersLoading = ref(false);
const userSortBy = ref<SortBy>([{ id: 'messages', desc: true }]);
const userPage = ref(0);
const userPageSize = ref(10);

// A newer request replaces an older one, so a slow response never overwrites newer data.
let usageRequest = 0;
let usersRequest = 0;

// Read once, like the other insights charts.
const colorPrimary = useCssVar('--color--primary', document.body);
const colorText = useCssVar('--color--text', document.body);
const colorTextDark = useCssVar('--color--text--shade-1', document.body);
const colorForeground = useCssVar('--color--foreground', document.body);
const colorBackground = useCssVar('--color--background--light-3', document.body);
const seriesColors = CREATED_SERIES.map(({ colorToken }) => useCssVar(colorToken, document.body));

const hasUsage = computed(() => {
	const summary = usage.value?.summary;
	return !!summary && (summary.messages > 0 || CREATED_SERIES.some(({ key }) => summary[key] > 0));
});

const numberFormat = new Intl.NumberFormat();
const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
	day: '2-digit',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});

function formatNumber(value: number): string {
	return numberFormat.format(value);
}

/** `YYYY-MM-DD` in the viewer's time zone, as the backend buckets it. */
function formatDay(isoDate: string): string {
	const [year, month, day] = isoDate.split('-').map(Number);
	return dayFormat.format(new Date(year, month - 1, day));
}

function formatDateTime(iso: string | null): string {
	return iso ? dateTimeFormat.format(new Date(iso)) : '—';
}

const days = computed<AssistantUsageDay[]>(() => usage.value?.byDay ?? []);

const chartData = computed<ChartData<'bar'>>(() => ({
	labels: days.value.map((day) => formatDay(day.date)),
	datasets: [
		{
			label: i18n.baseText('insights.assistant.chart.conversations'),
			data: days.value.map((day) => day.conversations),
			backgroundColor: colorPrimary.value,
			borderRadius: 4,
			maxBarThickness: 32,
		},
	],
}));

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	animation: false,
	plugins: {
		legend: { display: false },
		tooltip: {
			backgroundColor: colorBackground.value,
			titleColor: colorTextDark.value,
			bodyColor: colorTextDark.value,
			borderColor: colorForeground.value,
			borderWidth: 1,
			padding: 12,
			callbacks: {
				afterLabel: (item: TooltipItem<'bar'>) => {
					const day = days.value[item.dataIndex];
					return day
						? i18n.baseText('insights.assistant.chart.messages', {
								interpolate: { count: formatNumber(day.messages) },
							})
						: '';
				},
			},
		},
	},
	scales: {
		x: {
			grid: { display: false },
			ticks: { color: colorText.value, maxRotation: 0, autoSkip: true },
		},
		y: {
			beginAtZero: true,
			border: { display: false },
			grid: { color: colorForeground.value },
			ticks: { color: colorText.value, precision: 0 },
		},
	},
}));

/** For each day, the topmost series with resources. Only that segment gets rounded corners. */
const topSeriesByDay = computed(() =>
	days.value.map((day) => CREATED_SERIES.findLastIndex(({ key }) => day[key] > 0)),
);

const createdChartData = computed<ChartData<'bar'>>(() => ({
	labels: days.value.map((day) => formatDay(day.date)),
	datasets: CREATED_SERIES.map(({ key, labelKey }, seriesIndex) => ({
		label: i18n.baseText(labelKey),
		data: days.value.map((day) => day[key]),
		backgroundColor: seriesColors[seriesIndex].value,
		hoverBackgroundColor: seriesColors[seriesIndex].value,
		// A surface-colored top border leaves a gap between stacked segments.
		borderColor: colorBackground.value,
		hoverBorderColor: colorBackground.value,
		borderWidth: { top: 2 },
		borderRadius: (context: { dataIndex: number }) =>
			topSeriesByDay.value[context.dataIndex] === seriesIndex
				? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
				: 0,
		borderSkipped: 'start' as const,
		maxBarThickness: 32,
	})),
}));

const createdChartOptions = computed<ChartOptions<'bar'>>(() => ({
	...chartOptions.value,
	interaction: { mode: 'index', intersect: false },
	plugins: {
		...chartOptions.value.plugins,
		tooltip: {
			...chartOptions.value.plugins?.tooltip,
			// The top of the stack first, as on the chart. Series without resources stay out.
			itemSort: (a: TooltipItem<'bar'>, b: TooltipItem<'bar'>) => b.datasetIndex - a.datasetIndex,
			filter: (item: TooltipItem<'bar'>) => Number(item.raw) > 0,
			callbacks: {
				label: (item: TooltipItem<'bar'>) =>
					i18n.baseText('insights.assistant.types.count', {
						interpolate: {
							type: item.dataset.label ?? '',
							count: formatNumber(Number(item.raw)),
						},
					}),
				footer: (items: Array<TooltipItem<'bar'>>) =>
					i18n.baseText('insights.assistant.types.total', {
						interpolate: {
							count: formatNumber(items.reduce((sum, item) => sum + Number(item.raw), 0)),
						},
					}),
			},
		},
	},
	scales: {
		x: { ...chartOptions.value.scales?.x, stacked: true },
		y: { ...chartOptions.value.scales?.y, stacked: true },
	},
}));

function userLabel(user: AssistantUsageUser): string {
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return name || user.email || i18n.baseText('insights.assistant.deletedUser');
}

const userHeaders: Array<TableHeader<AssistantUsageUser>> = [
	{
		title: i18n.baseText('insights.assistant.col.user'),
		key: 'name',
		value: (user) => userLabel(user),
		minWidth: 240,
		disableSort: true,
	},
	{ title: i18n.baseText('insights.assistant.col.conversations'), key: 'conversations' },
	{ title: i18n.baseText('insights.assistant.col.messages'), key: 'messages' },
	{ title: i18n.baseText('insights.assistant.col.workflowsCreated'), key: 'workflowsCreated' },
	{ title: i18n.baseText('insights.assistant.col.agentsCreated'), key: 'agentsCreated' },
	{ title: i18n.baseText('insights.assistant.col.dataTablesCreated'), key: 'dataTablesCreated' },
	{ title: i18n.baseText('insights.assistant.col.lastUsed'), key: 'lastUsedAt', width: 200 },
];

function currentFilter() {
	return { ...getAdjustedDateRange(range.value), projectId: selectedProject.value?.id };
}

async function loadUsage(): Promise<void> {
	const request = ++usageRequest;
	isLoading.value = true;
	try {
		const result = await usageSource.fetchUsage(currentFilter());
		if (request === usageRequest) usage.value = result;
	} catch (error) {
		if (request === usageRequest)
			toast.showError(error, i18n.baseText('insights.assistant.loadError'));
	} finally {
		if (request === usageRequest) isLoading.value = false;
	}
}

async function loadUsers(): Promise<void> {
	const request = ++usersRequest;
	const [sort] = userSortBy.value;
	const sortBy = sort ? `${sort.id}:${sort.desc ? 'desc' : 'asc'}` : undefined;
	isUsersLoading.value = true;
	try {
		const result = await usageSource.fetchUsers({
			...currentFilter(),
			skip: userPage.value * userPageSize.value,
			take: userPageSize.value,
			...(sortBy && isSortOption(sortBy) ? { sortBy } : {}),
		});
		if (request === usersRequest) users.value = result;
	} catch (error) {
		if (request === usersRequest)
			toast.showError(error, i18n.baseText('insights.assistant.loadError'));
	} finally {
		if (request === usersRequest) isUsersLoading.value = false;
	}
}

watch([range, selectedProject], async () => {
	userPage.value = 0;
	await Promise.all([loadUsage(), loadUsers()]);
});

watch(userSortBy, async () => {
	if (userPage.value !== 0) {
		// The page watcher loads the first page.
		userPage.value = 0;
		return;
	}
	await loadUsers();
});

watch([userPage, userPageSize], loadUsers);

onMounted(async () => {
	documentTitle.set(i18n.baseText('insights.assistant.title'));
	await Promise.all([loadUsage(), loadUsers()]);
});
</script>

<template>
	<div :class="$style.insightsView">
		<div
			:class="[$style.insightsContainer, $style.container]"
			data-test-id="insights-assistant-usage"
		>
			<header :class="$style.header">
				<N8nHeading bold tag="h2" size="xlarge">
					{{ i18n.baseText('insights.dashboard.title') }}
				</N8nHeading>
				<InsightsTabs />
				<div :class="$style.filters">
					<component
						:is="projectFilter"
						v-if="projectFilter"
						v-model="selectedProject"
						:placeholder="i18n.baseText('insights.dashboard.search.placeholder')"
						size="mini"
						:class="$style.projectSelect"
					/>
					<InsightsDataRangePicker
						v-model="range"
						:max-value="maxDate"
						:min-value="maxDate.copy().subtract({ days: 365 })"
						:presets
						data-test-id="assistant-usage-range"
					/>
				</div>
			</header>

			<div v-if="isLoading && !usage">
				<N8nLoading :loading="true" variant="h1" />
				<N8nLoading :loading="true" variant="p" :rows="6" :shrink-last="false" />
			</div>

			<template v-else-if="usage">
				<section
					:class="[$style.kpis, { [$style.refreshing]: isLoading }]"
					data-test-id="assistant-usage-kpis"
				>
					<div v-for="kpi in KPIS" :key="kpi.key" :class="$style.kpi">
						<N8nText size="small" color="text-light">{{ i18n.baseText(kpi.labelKey) }}</N8nText>
						<span :class="$style.kpiValue" :data-test-id="`assistant-usage-kpi-${kpi.key}`">
							{{ formatNumber(usage.summary[kpi.key]) }}
						</span>
					</div>
				</section>

				<N8nEmptyState
					v-if="!hasUsage"
					:heading="i18n.baseText('insights.assistant.empty.heading')"
					:description="i18n.baseText('insights.assistant.empty.description')"
					data-test-id="assistant-usage-empty"
				/>

				<template v-else>
					<section :class="[$style.card, { [$style.refreshing]: isLoading }]">
						<N8nHeading size="medium" :bold="true">
							{{ i18n.baseText('insights.assistant.chart.title') }}
						</N8nHeading>
						<div :class="$style.chart">
							<Bar :data="chartData" :options="chartOptions" />
						</div>
					</section>

					<section
						:class="[$style.card, { [$style.refreshing]: isLoading }]"
						data-test-id="assistant-usage-types"
					>
						<N8nHeading size="medium" :bold="true">
							{{ i18n.baseText('insights.assistant.types.title') }}
						</N8nHeading>
						<ul :class="$style.legend">
							<li
								v-for="(series, seriesIndex) in CREATED_SERIES"
								:key="series.key"
								:class="$style.legendItem"
							>
								<span
									:class="$style.swatch"
									:style="{ backgroundColor: seriesColors[seriesIndex].value }"
									aria-hidden="true"
								/>
								<N8nText size="small">{{ i18n.baseText(series.labelKey) }}</N8nText>
							</li>
						</ul>
						<div :class="$style.chart">
							<Bar :data="createdChartData" :options="createdChartOptions" />
						</div>
					</section>

					<section :class="$style.tableSection">
						<N8nHeading size="medium" :bold="true">
							{{ i18n.baseText('insights.assistant.users.title') }}
						</N8nHeading>
						<N8nDataTableServer
							v-model:sort-by="userSortBy"
							v-model:page="userPage"
							v-model:items-per-page="userPageSize"
							:headers="userHeaders"
							:items="users.data"
							:items-length="users.count"
							:item-value="(row) => row.userId ?? 'deleted'"
							:loading="isUsersLoading"
							data-test-id="assistant-usage-users"
						>
							<template #[`item.name`]="{ item }">
								<N8nUserInfo
									v-if="item.email"
									:first-name="item.firstName"
									:last-name="item.lastName"
									:email="item.email"
								/>
								<N8nText v-else color="text-light">{{ userLabel(item) }}</N8nText>
							</template>
							<template #[`item.conversations`]="{ item }">
								{{ formatNumber(item.conversations) }}
							</template>
							<template #[`item.messages`]="{ item }">{{ formatNumber(item.messages) }}</template>
							<template #[`item.workflowsCreated`]="{ item }">
								{{ formatNumber(item.workflowsCreated) }}
							</template>
							<template #[`item.agentsCreated`]="{ item }">
								{{ formatNumber(item.agentsCreated) }}
							</template>
							<template #[`item.dataTablesCreated`]="{ item }">
								{{ formatNumber(item.dataTablesCreated) }}
							</template>
							<template #[`item.lastUsedAt`]="{ item }">
								{{ formatDateTime(item.lastUsedAt) }}
							</template>
						</N8nDataTableServer>
					</section>
				</template>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-bottom: var(--spacing--2xl);
}

.insightsView {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: auto;
}

.insightsContainer {
	width: 100%;
	max-width: var(--content-container--width);
	padding: var(--spacing--lg) var(--spacing--2xl);
	margin: 0 auto;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.filters {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.projectSelect {
	min-width: 200px;
	:global(.el-input--suffix .el-input__inner) {
		padding-right: 26px;
	}
}

.kpis {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: var(--spacing--sm);
}

.kpi,
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.card {
	gap: var(--spacing--sm);
}

.kpiValue {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	line-height: var(--line-height--sm);
}

.chart {
	height: 240px;
}

.legend {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--md);
	margin: 0;
	padding: 0;
	list-style: none;
}

.legendItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.swatch {
	flex-shrink: 0;
	width: var(--spacing--xs);
	height: var(--spacing--xs);
	border-radius: var(--radius--sm);
}

/* Keeps the old numbers readable while new ones load. */
.refreshing {
	opacity: 0.6;
}

.tableSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
