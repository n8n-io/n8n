<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { N8nHeading, N8nSelect, N8nButton, N8nCard } from '@n8n/design-system';
import { useTelemetryStore } from '../stores/telemetry.store';
import StatsCard from '../components/StatsCard.vue';
import LineChart from '../components/LineChart.vue';
import TopEventsList from '../components/TopEventsList.vue';
import { format } from 'date-fns';

const telemetryStore = useTelemetryStore();

const timeRange = ref(30);
const timeRangeOptions = [
	{ label: '最近 7 天', value: 7 },
	{ label: '最近 30 天', value: 30 },
	{ label: '最近 90 天', value: 90 },
];

const loading = ref(false);

// 活跃用户图表数据
const activeUsersChartData = computed(() => {
	if (!telemetryStore.activeUsersData) {
		return { labels: [], datasets: [] };
	}

	const labels = telemetryStore.activeUsersData.map((item) =>
		format(new Date(item.date), 'MM-dd'),
	);
	const data = telemetryStore.activeUsersData.map((item) => item.active_users);

	return {
		labels,
		datasets: [
			{
				label: '活跃用户数',
				data,
				borderColor: '#FF6B6B',
				backgroundColor: 'rgba(255, 107, 107, 0.1)',
			},
		],
	};
});

async function loadData() {
	loading.value = true;
	try {
		await Promise.all([
			telemetryStore.fetchOverview(timeRange.value),
			telemetryStore.fetchTopEvents(20, timeRange.value),
			telemetryStore.fetchActiveUsers(timeRange.value),
		]);
	} finally {
		loading.value = false;
	}
}

function handleTimeRangeChange() {
	loadData();
}

function handleRefresh() {
	loadData();
}

onMounted(() => {
	loadData();
});
</script>

<template>
	<div :class="$style.container">
		<!-- Header -->
		<div :class="$style.header">
			<div>
				<N8nHeading tag="h1" size="2xlarge">Telemetry 仪表板</N8nHeading>
				<p :class="$style.subtitle">实时监控和分析应用程序遥测数据</p>
			</div>
			<div :class="$style.actions">
				<N8nSelect
					v-model="timeRange"
					:options="timeRangeOptions"
					size="small"
					@update:model-value="handleTimeRangeChange"
				/>
				<N8nButton type="secondary" size="small" icon="sync-alt" @click="handleRefresh">
					刷新
				</N8nButton>
			</div>
		</div>

		<!-- Stats Cards -->
		<div :class="$style.statsGrid">
			<StatsCard
				title="总事件数"
				:value="telemetryStore.overview?.totalEvents || 0"
				icon="chart-line"
				:loading="loading"
			/>
			<StatsCard
				title="活跃用户"
				:value="telemetryStore.overview?.activeUsers || 0"
				icon="users"
				:loading="loading"
			/>
			<StatsCard
				title="唯一事件类型"
				:value="telemetryStore.topEvents?.length || 0"
				icon="tags"
				:loading="loading"
			/>
			<StatsCard
				title="平均每日事件"
				:value="
					telemetryStore.overview
						? Math.round(telemetryStore.overview.totalEvents / timeRange)
						: 0
				"
				icon="calendar-day"
				:loading="loading"
			/>
		</div>

		<!-- Charts -->
		<div :class="$style.chartsGrid">
			<!-- 活跃用户趋势 -->
			<N8nCard :class="$style.chartCard">
				<template #header>
					<N8nHeading tag="h3" size="medium">活跃用户趋势</N8nHeading>
				</template>
				<LineChart
					v-if="activeUsersChartData.labels.length > 0"
					:labels="activeUsersChartData.labels"
					:datasets="activeUsersChartData.datasets"
					:height="300"
				/>
				<div v-else :class="$style.emptyChart">
					<font-awesome-icon icon="chart-line" />
					<p>暂无数据</p>
				</div>
			</N8nCard>

			<!-- 热门事件 -->
			<N8nCard :class="$style.chartCard">
				<template #header>
					<N8nHeading tag="h3" size="medium">热门事件 Top 20</N8nHeading>
				</template>
				<TopEventsList :events="telemetryStore.topEvents" :loading="loading" :limit="20" />
			</N8nCard>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--xl);
	max-width: 1600px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--xl);
}

.subtitle {
	margin-top: var(--spacing--xs);
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
}

.actions {
	display: flex;
	gap: var(--spacing--sm);
	align-items: center;
}

.statsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: var(--spacing--md);
	margin-bottom: var(--spacing--xl);
}

.chartsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
	gap: var(--spacing--md);
}

.chartCard {
	min-height: 400px;
}

.emptyChart {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 300px;
	color: var(--color--text--tint-2);
	gap: var(--spacing--sm);

	svg {
		font-size: 48px;
	}
}
</style>
