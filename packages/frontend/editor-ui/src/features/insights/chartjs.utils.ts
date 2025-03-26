import { type ChartOptions } from 'chart.js';
import { useCssVar } from '@vueuse/core';

/**
 *
 * Chart js configuration
 */

export const generateLinearGradient = (ctx: CanvasRenderingContext2D, height: number) => {
	const gradient = ctx.createLinearGradient(0, 0, 0, height);
	gradient.addColorStop(0, 'rgba(255, 111,92, 1)');
	gradient.addColorStop(0.8, 'rgba(255, 111, 92, 0.25)');
	gradient.addColorStop(1, 'rgba(255, 111, 92, 0)');
	return gradient;
};

export const generateLineChartOptions = (): ChartOptions<'line'> => {
	const colorTextDark = useCssVar('--color-text-dark', document.body);
	const colorBackgroundLight = useCssVar('--color-background-xlight', document.body);
	const colorForeGroundBase = useCssVar('--color-foreground-base', document.body);

	const colorTextLight = useCssVar('--color-text-light', document.body);

	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				caretSize: 0,
				xAlign: 'center',
				yAlign: 'bottom',
				padding: 16,
				backgroundColor: colorBackgroundLight.value,
				titleColor: colorTextDark.value,
				bodyColor: colorTextDark.value,
				borderWidth: 1,
				borderColor: colorForeGroundBase.value,
				itemSort(a /*, b, data */) {
					// Keep success label on top
					return a.dataset.label === 'Success' ? -1 : 1;
				},
				callbacks: {
					label(context) {
						const label = context.dataset.label ?? '';
						return `${label} ${context.parsed.y.toFixed(2)}`;
					},
					labelColor(context) {
						return {
							borderColor: 'rgba(0, 0, 0, 0)',
							backgroundColor: context.dataset.backgroundColor as string,
							borderWidth: 0,
							borderRadius: 2,
						};
					},
				},
			},
		},
		interaction: {
			mode: 'nearest',
			axis: 'x',
			intersect: false,
		},
		scales: {
			x: {
				grid: {
					display: false,
				},
				stacked: true,
				beginAtZero: true,
				border: {
					display: false,
				},
				ticks: {
					color: colorTextLight.value,
				},
			},
			y: {
				grid: {
					color: colorTextLight.value,
				},
				stacked: true,
				border: {
					display: false,
				},
				ticks: {
					maxTicksLimit: 3,
					color: colorTextLight.value,
				},
			},
		},
	};
};

export const generateBarChartOptions = (): ChartOptions<'bar'> => {
	const colorTextLight = useCssVar('--color-text-light', document.body);
	const colorTextDark = useCssVar('--color-text-dark', document.body);
	const colorBackgroundLight = useCssVar('--color-background-xlight', document.body);
	const colorForeGroundBase = useCssVar('--color-foreground-base', document.body);

	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				align: 'end',
				reverse: true,
				position: 'top',
				labels: {
					boxWidth: 8,
					boxHeight: 8,
					borderRadius: 2,
					useBorderRadius: true,
					// padding: 0,
				},
			},
			tooltip: {
				caretSize: 0,
				xAlign: 'center',
				yAlign: 'bottom',
				padding: 16,
				backgroundColor: colorBackgroundLight.value,
				titleColor: colorTextDark.value,
				bodyColor: colorTextDark.value,
				borderWidth: 1,
				borderColor: colorForeGroundBase.value,
				itemSort(a /*, b, data */) {
					// Keep success label on top
					return a.dataset.label === 'Success' ? -1 : 1;
				},
				callbacks: {
					label(context) {
						const label = context.dataset.label ?? '';
						return `${label} ${context.parsed.y}`;
					},
					labelColor(context) {
						return {
							borderColor: 'rgba(0, 0, 0, 0)',
							backgroundColor: context.dataset.backgroundColor as string,
							borderWidth: 0,
							borderRadius: 2,
						};
					},
				},
			},
		},
		interaction: {
			mode: 'nearest',
			axis: 'x',
			intersect: false,
		},
		datasets: {
			bar: {
				maxBarThickness: 32,
				borderRadius: 4,
			},
		},
		scales: {
			x: {
				grid: {
					display: false,
				},
				stacked: true,
				beginAtZero: true,
				border: {
					display: false,
				},
				ticks: {
					color: colorTextLight.value,
				},
			},
			y: {
				grid: {
					color: colorTextLight.value,
				},
				stacked: true,
				border: {
					display: false,
				},
				ticks: {
					maxTicksLimit: 3,
					color: colorTextLight.value,
				},
			},
		},
	};
};
