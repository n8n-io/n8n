import type { Meta, StoryObj } from '@storybook/vue3-vite';

import { Bar, Line } from './index';

const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// No `component`: the stories render both chart components, and each needs its own `data`.
const meta = {
	title: 'Core/Charts',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const BarChart: Story = {
	render: function renderBarChart() {
		return {
			components: { Bar },
			setup: function setup() {
				return {
					data: {
						labels,
						datasets: [
							{ label: 'Succeeded', data: [12, 19, 8, 15, 22, 4, 6] },
							{ label: 'Failed', data: [2, 1, 3, 0, 4, 1, 0] },
						],
					},
					options: { scales: { x: { stacked: true }, y: { stacked: true } } },
				};
			},
			template: '<Bar :data="data" :options="options" />',
		};
	},
};

export const LineChart: Story = {
	render: function renderLineChart() {
		return {
			components: { Line },
			setup: function setup() {
				return {
					data: {
						labels,
						datasets: [
							{ label: 'Average run time (s)', data: [1.2, 0.9, 1.4, 1.1, 0.8, 1.6, 1.0] },
						],
					},
				};
			},
			template: '<Line :data="data" />',
		};
	},
};
