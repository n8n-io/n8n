import type { ChartData, ChartOptions } from 'chart.js';
import { convertToDisplayDate } from '@/utils/typesUtils';
import type { TestRunRecord } from '@/api/testDefinition.ee';

const formatDate = (date: string) => convertToDisplayDate(new Date(date).getTime());
export function useMetricsChart() {
	function generateChartData(runs: TestRunRecord[], metric: string): ChartData<'line'> {
		const sortedRuns = [...runs]
			.sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime())
			.filter((run) => run.metrics?.[metric]);

		return {
			labels: sortedRuns.map((run) => formatDate(run.runAt)),
			datasets: [
				{
					label: metric,
					data: sortedRuns.map((run) => run.metrics?.[metric] ?? 0),
					borderColor: 'rgb(255, 110, 92)',
					backgroundColor: 'rgba(255, 110, 92, 0.1)',
					borderWidth: 2,
					pointRadius: 4,
					pointHoverRadius: 6,
					pointBackgroundColor: 'rgb(255, 110, 92)',
					pointBorderColor: '#fff',
					pointHoverBackgroundColor: '#fff',
					pointHoverBorderColor: 'rgb(255, 110, 92)',
					tension: 0.4,
					fill: true,
				},
			],
		};
	}

	function generateChartOptions(metric: string): ChartOptions<'line'> {
		return {
			responsive: true,
			maintainAspectRatio: false,
			devicePixelRatio: 2, // Improve rendering quality
			interaction: {
				mode: 'index' as const,
				intersect: false,
			},
			scales: {
				y: {
					beginAtZero: true,
					grid: {
						color: 'rgba(255, 110, 92, 0.05)',
					},
					ticks: {
						padding: 8,
					},
					title: {
						display: true,
						text: metric,
						padding: 16,
					},
				},
				x: {
					grid: {
						display: false,
					},
					ticks: {
						maxRotation: 45,
						minRotation: 45,
					},
					title: {
						display: true,
						text: 'Run Date',
						padding: 16,
					},
				},
			},
			plugins: {
				tooltip: {
					backgroundColor: 'rgba(255, 255, 255, 0.95)',
					titleColor: '#444',
					titleFont: {
						weight: '600',
					},
					bodyColor: '#666',
					bodySpacing: 4,
					padding: 12,
					borderColor: 'rgba(255, 110, 92, 0.2)',
					borderWidth: 1,
					displayColors: true,
					callbacks: {
						title: (tooltipItems) => {
							return tooltipItems[0].label;
						},
						label: (context) => `${metric}: ${context.parsed.y.toFixed(2)}`,
					},
				},
				legend: {
					display: false,
				},
			},
			animation: {
				duration: 750,
				easing: 'easeInOutQuart',
			},
			transitions: {
				active: {
					animation: {
						duration: 300,
					},
				},
			},
		};
	}

	return {
		generateChartData,
		generateChartOptions,
	};
}
