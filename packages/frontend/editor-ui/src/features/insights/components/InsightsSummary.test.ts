import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';

const renderComponent = createComponentRenderer(InsightsSummary);

describe('InsightsSummary', () => {
	it('should render without error', () => {
		expect(() =>
			renderComponent({
				props: {
					summary: [],
				},
			}),
		).not.toThrow();
	});

	test.each<InsightsSummaryDisplay[]>([
		[[]],
		[
			[
				{ id: 'total', value: 525, deviation: 85, unit: '' },
				{ id: 'failed', value: 14, deviation: 3, unit: '' },
				{ id: 'failureRate', value: 1.9, deviation: -0.8, unit: '%' },
				{ id: 'timeSaved', value: 55.55555555555556, deviation: -5.164722222222222, unit: 'h' },
				{ id: 'averageRunTime', value: 2.5, deviation: -0.5, unit: 's' },
			],
		],
		[
			[
				{ id: 'total', value: 525, deviation: 85, unit: '' },
				{ id: 'failed', value: 14, deviation: 3, unit: '' },
				{ id: 'failureRate', value: 1.9, deviation: -0.8, unit: '%' },
				{ id: 'timeSaved', value: 0, deviation: 0, unit: 'h' },
				{ id: 'averageRunTime', value: 2.5, deviation: -0.5, unit: 's' },
			],
		],
		[
			[
				{ id: 'total', value: 525, deviation: -2, unit: '' },
				{ id: 'failed', value: 14, deviation: -3, unit: '' },
				{ id: 'failureRate', value: 1.9, deviation: 0.8, unit: '%' },
				{ id: 'timeSaved', value: 55.55555555555556, deviation: 0, unit: 'h' },
				{ id: 'averageRunTime', value: 2.5, deviation: 0.5, unit: 's' },
			],
		],
		[
			[
				{ id: 'total', value: 525, deviation: null, unit: '' },
				{ id: 'failed', value: 14, deviation: null, unit: '' },
				{ id: 'failureRate', value: 1.9, deviation: null, unit: '%' },
				{ id: 'timeSaved', value: 55.55555555555556, deviation: null, unit: 'h' },
				{ id: 'averageRunTime', value: 2.5, deviation: null, unit: 's' },
			],
		],
	])('should render the summary correctly', (summary) => {
		const { html } = renderComponent({
			props: {
				summary,
			},
		});

		expect(html()).toMatchSnapshot();
	});
});
