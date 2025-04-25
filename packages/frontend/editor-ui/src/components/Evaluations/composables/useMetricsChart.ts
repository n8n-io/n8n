import type { ChartData, ChartOptions } from 'chart.js';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import dateFormat from 'dateformat';
import { useCssVar } from '@vueuse/core';

export function useMetricsChart() {
	const colors = {
		primary: useCssVar('--color-primary', document.body).value,
		textBase: useCssVar('--color-text-base', document.body).value,
		backgroundXLight: useCssVar('--color-background-xlight', document.body).value,
		foregroundLight: useCssVar('--color-foreground-light', document.body).value,
		foregroundBase: useCssVar('--color-foreground-base', document.body).value,
		foregroundDark: useCssVar('--color-foreground-dark', document.body).value,
	};

	function generateChartData(
		runs: Array<TestRunRecord & { index: number }>,
		metric: string,
	): ChartData<'line'> {
		/**
		 * @see https://www.chartjs.org/docs/latest/general/data-structures.html#object-using-custom-properties
		 */
		const data: ChartData<'line', TestRunRecord[]> = {
			datasets: [
				{
					data: runs,
					parsing: {
						xAxisKey: 'id',
						yAxisKey: `metrics.${metric}`,
					},
					borderColor: colors.primary,
					backgroundColor: colors.backgroundXLight,
					borderWidth: 1,
					pointRadius: 2,
					pointHoverRadius: 4,
					pointBackgroundColor: colors.backgroundXLight,
					pointHoverBackgroundColor: colors.backgroundXLight,
				},
			],
		};

		// casting to keep vue-chartjs happy!!
		return data as unknown as ChartData<'line'>;
	}

	function generateChartOptions({
		metric,
		data,
	}: { metric: string; data: Array<TestRunRecord & { index: number }> }): ChartOptions<'line'> {
		return {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			devicePixelRatio: 2,
			interaction: {
				mode: 'index' as const,
				intersect: false,
			},
			scales: {
				y: {
					border: {
						display: false,
					},
					grid: {
						color: colors.foregroundBase,
					},
					ticks: {
						padding: 8,
						color: colors.textBase,
					},
				},
				x: {
					border: {
						display: false,
					},
					grid: {
						display: false,
					},
					ticks: {
						color: colors.textBase,
						// eslint-disable-next-line id-denylist
						callback(_tickValue, index) {
							return `#${data[index].index}`;
						},
					},
				},
			},
			plugins: {
				tooltip: {
					backgroundColor: colors.backgroundXLight,
					titleColor: colors.textBase,
					titleFont: {
						weight: '600',
					},
					bodyColor: colors.textBase,
					bodySpacing: 4,
					padding: 12,
					borderColor: colors.foregroundBase,
					borderWidth: 1,
					displayColors: true,
					callbacks: {
						title: (tooltipItems) => {
							return dateFormat((tooltipItems[0].raw as TestRunRecord).runAt, 'yyyy-mm-dd HH:MM');
						},
						label: (context) => `${metric}: ${context.parsed.y.toFixed(2)}`,
						labelColor() {
							return {
								borderColor: 'rgba(29, 21, 21, 0)',
								backgroundColor: colors.primary,
								borderWidth: 0,
								borderRadius: 5,
							};
						},
					},
				},
				legend: {
					display: false,
				},
			},
		};
	}

	return {
		generateChartData,
		generateChartOptions,
	};
}
