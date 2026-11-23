import {
	BarElement,
	CategoryScale,
	Chart,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	Title,
	Tooltip,
} from 'chart.js';

let registered = false;

/**
 * Registers the Chart.js scales, elements, controllers and plugins that the n8n charts use.
 *
 * The editor does not register Chart.js at startup, so that Chart.js stays out of the startup JS.
 * Call this function in the `<script setup>` of each component that renders a `vue-chartjs` chart,
 * before the chart mounts. The `Bar` and `Line` components of `vue-chartjs` register only their own
 * controller. Without this call, the chart throws `"category" is not a registered scale`.
 *
 * Chart.js keeps one global registry. A second call does nothing.
 */
export function registerCharts(): void {
	if (registered) return;

	Chart.register(
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		PointElement,
		Title,
		Tooltip,
		Legend,
		LineController,
	);
	registered = true;
}
