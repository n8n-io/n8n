import type { ChartData, ChartOptions } from 'chart.js';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import dateFormat from 'dateformat';
import type { AppliedThemeOption } from '@/Interface';

const THEME_COLORS = {
	light: {
		primary: 'rgb(255, 110, 92)',
		text: {
			primary: 'rgb(68, 68, 68)',
			secondary: 'rgb(102, 102, 102)',
		},
		background: 'rgb(255, 255, 255)',
		grid: 'rgba(68, 68, 68, 0.1)',
	},
	dark: {
		primary: 'rgb(255, 110, 92)',
		text: {
			primary: 'rgb(255, 255, 255)',
			secondary: 'rgba(255, 255, 255, 0.7)',
		},
		background: 'rgb(32, 32, 32)',
		grid: 'rgba(255, 255, 255, 0.1)',
	},
};

export function useMetricsChart(mode: AppliedThemeOption = 'light') {
	const colors = THEME_COLORS[mode];
	const toRGBA = (color: string, alpha: number) => {
		if (color.includes('rgba')) return color;
		return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
	};
	function generateChartData(runs: TestRunRecord[], metric: string): ChartData<'line'> {
		const sortedRuns = [...runs]
			.sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime())
			.filter((run) => run.metrics?.[metric]);

		return {
			labels: sortedRuns.map((run) => {
				return dateFormat(run.runAt, 'yyyy-mm-dd HH:MM');
			}),
			datasets: [
				{
					label: metric,
					data: sortedRuns.map((run) => run.metrics?.[metric] ?? 0),
					borderColor: colors.primary,
					backgroundColor: toRGBA(colors.primary, 0.1),
					borderWidth: 2,
					pointRadius: 4,
					pointHoverRadius: 6,
					pointBackgroundColor: colors.primary,
					pointBorderColor: colors.primary,
					pointHoverBackgroundColor: colors.background,
					pointHoverBorderColor: colors.primary,
					tension: 0.4,
					fill: true,
				},
			],
		};
	}

	function generateChartOptions(params: { metric: string; xTitle: string }): ChartOptions<'line'> {
		return {
			responsive: true,
			maintainAspectRatio: false,
			devicePixelRatio: 2,
			interaction: {
				mode: 'index' as const,
				intersect: false,
			},
			scales: {
				y: {
					beginAtZero: true,
					grid: {
						color: colors.grid,
					},
					ticks: {
						padding: 8,
						color: colors.text.primary,
					},
					title: {
						display: false,
						text: params.metric,
						padding: 16,
						color: colors.text.primary,
					},
				},
				x: {
					grid: {
						display: false,
					},
					ticks: {
						display: false,
					},
					title: {
						text: params.xTitle,
						padding: 1,
						color: colors.text.primary,
					},
				},
			},
			plugins: {
				tooltip: {
					backgroundColor: colors.background,
					titleColor: colors.text.primary,
					titleFont: {
						weight: '600',
					},
					bodyColor: colors.text.secondary,
					bodySpacing: 4,
					padding: 12,
					borderColor: toRGBA(colors.primary, 0.2),
					borderWidth: 1,
					displayColors: true,
					callbacks: {
						title: (tooltipItems) => tooltipItems[0].label,
						label: (context) => `${params.metric}: ${context.parsed.y.toFixed(2)}`,
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
