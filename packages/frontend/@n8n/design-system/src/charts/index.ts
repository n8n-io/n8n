import {
	BarController,
	BarElement,
	CategoryScale,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	Title,
	Tooltip,
} from 'chart.js';
import type { Bar as VueChartjsBar, Line as VueChartjsLine } from 'vue-chartjs';
import { createTypedChart } from 'vue-chartjs';

export type { ChartComponentRef } from 'vue-chartjs';

/**
 * The scales, elements and plugins that every n8n chart uses. The editor does not register
 * Chart.js at startup, so that Chart.js stays out of the startup JS. The chart components below
 * register these parts with their controller when this module loads.
 */
const sharedParts = [
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	Title,
	Tooltip,
	Legend,
];

/**
 * A `vue-chartjs` bar chart with the Chart.js parts that n8n charts use already registered.
 * Use it instead of `Bar` from `vue-chartjs`, which registers only its own controller.
 *
 * The registration is part of the value of this export, so a bundler cannot drop it while a
 * chart uses the component. The type is the type of `Bar` from `vue-chartjs`, which the published
 * declarations can name.
 */
export const Bar: typeof VueChartjsBar = createTypedChart('bar', [BarController, ...sharedParts]);

/**
 * A `vue-chartjs` line chart with the Chart.js parts that n8n charts use already registered.
 * Use it instead of `Line` from `vue-chartjs`, which registers only its own controller.
 */
export const Line: typeof VueChartjsLine = createTypedChart('line', [
	LineController,
	...sharedParts,
]);
