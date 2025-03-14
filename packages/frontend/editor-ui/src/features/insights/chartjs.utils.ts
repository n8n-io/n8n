import {
	type ChartOptions,
	type ChartData,
	type ScriptableContext,
	type Plugin,
	type LegendItem,
} from 'chart.js';
import { ref } from 'vue';
import { useCssVar } from '@vueuse/core';

/**
 *
 * Random data generation
 */

export const randomDataPoint = (max: number): number => Math.floor(Math.random() * max);

export const getRandomIntBetween = (min: number, max: number) => Math.random() * (max - min) + min;

export const randomCumulativeData = (dataLabel: string[], max: number) => {
	const start = 0;
	const totalSteps = max - start;
	const step = totalSteps / (dataLabel.length - 1);

	return dataLabel.reduce<ChartDataType[]>((acc, item) => {
		const previous = acc.at(-1) ?? { count: 0 };
		const randomFactor = 1 + (Math.random() - 0.5) * 0.5;
		acc.push({ date: item, count: previous.count + step * randomFactor });
		return acc;
	}, []);
};

export const getDatesArrayFromToday = (days: number) => {
	const dates = [];
	const today = new Date();

	for (let i = 0; i <= days; i++) {
		const date = new Date();
		date.setDate(today.getDate() - i);
		dates.unshift(date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }));
	}

	return dates;
};

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

type ChartDataType = { date: string; count: number };

const parsing = {
	xAxisKey: 'date',
	yAxisKey: 'count',
} as const;

export const lineDatasetWithGradient = ({
	label,
	data,
}: { label: string; data: ChartDataType[] }): ChartData<
	'line',
	ChartDataType[]
>['datasets'][number] => {
	return {
		label,
		data,
		parsing: {
			xAxisKey: 'date',
			yAxisKey: 'count',
		},
		cubicInterpolationMode: 'monotone' as const,
		fill: true,
		backgroundColor: (ctx: ScriptableContext<'line'>) => generateLinearGradient(ctx.chart.ctx, 292),
		borderColor: 'rgba(255, 64, 39, 1)',
	};
};

export const dashedLineDatasetWithGradient = ({
	label,
	data,
}: { label: string; data: ChartDataType[] }) => {
	return {
		label,
		data,
		parsing,
		fill: true,
		backgroundColor: 'rgba(255, 255, 255, 0.5)',
		borderColor: 'rgba(116, 116, 116, 1)',
		borderDash: [5, 5],
		pointStyle: false,
	};
};

export const barDataset = ({
	label,
	data,
	backgroundColor,
}: { label: string; data: ChartDataType[]; backgroundColor: ChartOptions['backgroundColor'] }) => {
	return {
		label,
		data,
		parsing,
		backgroundColor,
	};
};

type CustomLegend = LegendItem & { onClick: () => void };
export const useLegendPlugin = () => {
	const legends = ref<CustomLegend[]>();
	const plugin: Plugin = {
		id: 'custom-legend',
		afterUpdate(chart) {
			const items = chart.options.plugins?.legend?.labels?.generateLabels?.(chart);
			if (!items) return;

			legends.value = items.map((item) => ({
				...item,
				onClick: () => {
					if (item.datasetIndex === undefined) return;
					chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
					chart.update();
				},
			}));
		},
		beforeDestroy() {
			legends.value = undefined;
		},
	};

	return {
		legends,
		LegendPlugin: plugin,
	};
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
		layout: {
			padding: 20,
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
		animation: false,
		// parsing: false,
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
		layout: {
			padding: 20,
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
