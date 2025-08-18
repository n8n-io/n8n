import { reactive } from 'vue';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

const renderComponent = createComponentRenderer(InsightsSummary, {
	global: {
		stubs: {
			'router-link': {
				template: '<a><slot /></a>',
			},
			N8nIcon: true,
		},
	},
});

describe('InsightsSummary', () => {
	it('should render without error', () => {
		expect(() =>
			renderComponent({
				props: {
					summary: [],
					timeRange: 'week',
				},
			}),
		).not.toThrow();
	});

	test.each<InsightsSummaryDisplay[]>([
		[[]],
		[
			[
				{ id: 'total', value: 525, deviation: 85, unit: '', deviationUnit: '%' },
				{ id: 'failed', value: 14, deviation: 3, unit: '', deviationUnit: '%' },
				{ id: 'failureRate', value: 1.9, deviation: -0.8, unit: '%', deviationUnit: 'pp' },
				{
					id: 'timeSaved',
					value: 55.55555555555556,
					deviation: -5.164722222222222,
					unit: 'h',
					deviationUnit: 'h',
				},
				{ id: 'averageRunTime', value: 2.5, deviation: -0.5, unit: 's', deviationUnit: 's' },
			],
		],
		[
			[
				{ id: 'total', value: 525, deviation: 85, unit: '', deviationUnit: '%' },
				{ id: 'failed', value: 14, deviation: 3, unit: '', deviationUnit: '%' },
				{ id: 'failureRate', value: 1.9, deviation: -0.8, unit: '%', deviationUnit: 'pp' },
				{ id: 'timeSaved', value: 0, deviation: 0, unit: 'h', deviationUnit: 'h' },
				{ id: 'averageRunTime', value: 2.5, deviation: -0.5, unit: 's', deviationUnit: 's' },
			],
		],
		[
			[
				{ id: 'total', value: 525, deviation: -2, unit: '', deviationUnit: '%' },
				{ id: 'failed', value: 14, deviation: -3, unit: '', deviationUnit: '%' },
				{ id: 'failureRate', value: 1.9, deviation: 0.8, unit: '%', deviationUnit: 'pp' },
				{ id: 'timeSaved', value: 55.55555555555556, deviation: 0, unit: 'h', deviationUnit: 'h' },
				{ id: 'averageRunTime', value: 2.5, deviation: 0.5, unit: 's', deviationUnit: 's' },
			],
		],
		[
			[
				{ id: 'total', value: 525, deviation: null, unit: '', deviationUnit: '%' },
				{ id: 'failed', value: 14, deviation: null, unit: '', deviationUnit: '%' },
				{ id: 'failureRate', value: 1.9, deviation: null, unit: '%', deviationUnit: 'pp' },
				{
					id: 'timeSaved',
					value: 55.55555555555556,
					deviation: null,
					unit: 'h',
					deviationUnit: 'h',
				},
				{ id: 'averageRunTime', value: 2.5, deviation: null, unit: 's', deviationUnit: 's' },
			],
		],
		[
			[
				{ id: 'total', value: 0, deviation: 0, unit: '', deviationUnit: '%' },
				{ id: 'failed', value: 0, deviation: 0, unit: '', deviationUnit: '%' },
				{ id: 'failureRate', value: 0, deviation: 0, unit: '%', deviationUnit: 'pp' },
				{ id: 'timeSaved', value: 0, deviation: 0, unit: 'h', deviationUnit: 'h' },
				{ id: 'averageRunTime', value: 0, deviation: 0, unit: 's', deviationUnit: 's' },
			],
		],
	])('should render the summary correctly', (summary) => {
		const { html } = renderComponent({
			props: {
				summary,
				timeRange: 'week',
			},
		});

		expect(html()).toMatchSnapshot();
	});
});
