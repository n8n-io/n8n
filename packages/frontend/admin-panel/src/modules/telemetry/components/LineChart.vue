<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
	type ChartOptions,
	type ChartData,
} from 'chart.js';

// 注册 Chart.js 组件
ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
);

interface Props {
	labels: string[];
	datasets: Array<{
		label: string;
		data: number[];
		borderColor?: string;
		backgroundColor?: string;
	}>;
	title?: string;
	height?: number;
}

const props = withDefaults(defineProps<Props>(), {
	height: 300,
});

const chartData = computed<ChartData<'line'>>(() => ({
	labels: props.labels,
	datasets: props.datasets.map((dataset) => ({
		...dataset,
		borderColor: dataset.borderColor || '#FF6B6B',
		backgroundColor: dataset.backgroundColor || 'rgba(255, 107, 107, 0.1)',
		tension: 0.4,
		fill: true,
		pointRadius: 4,
		pointHoverRadius: 6,
	})),
}));

const chartOptions = computed<ChartOptions<'line'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: {
			display: true,
			position: 'top',
		},
		title: {
			display: !!props.title,
			text: props.title,
		},
		tooltip: {
			mode: 'index',
			intersect: false,
		},
	},
	scales: {
		y: {
			beginAtZero: true,
			ticks: {
				precision: 0,
			},
		},
	},
	interaction: {
		mode: 'nearest',
		axis: 'x',
		intersect: false,
	},
}));
</script>

<template>
	<div :class="$style.chartContainer" :style="{ height: `${height}px` }">
		<Line :data="chartData" :options="chartOptions" />
	</div>
</template>

<style lang="scss" module>
.chartContainer {
	position: relative;
	width: 100%;
}
</style>
