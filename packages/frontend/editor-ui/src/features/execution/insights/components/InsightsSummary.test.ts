import { reactive } from 'vue';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { InsightsSummaryDisplay } from '@/features/execution/insights/insights.types';
import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@/__tests__/defaults';
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';

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
			RouterLink: {
				template: '<a><slot /></a>',
			},
			N8nIcon: true,
		},
	},
});

describe('InsightsSummary', () => {
	const endDate = today(getLocalTimeZone());
	const startDate = endDate.subtract({ days: 7 });

	beforeEach(() => {
		createTestingPinia({
			initialState: { settings: { settings: defaultSettings } },
		});
	});

	it('should render without error', () => {
		expect(() =>
			renderComponent({
				props: {
					summary: [],
					startDate,
					endDate,
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
				startDate,
				endDate,
			},
		});

		expect(html()).toMatchSnapshot();
	});

	describe('with different date ranges', () => {
		const testSummary: InsightsSummaryDisplay = [
			{ id: 'total', value: 525, deviation: 85, unit: '', deviationUnit: '%' },
			{ id: 'failed', value: 14, deviation: 3, unit: '', deviationUnit: '%' },
			{ id: 'failureRate', value: 1.9, deviation: -0.8, unit: '%', deviationUnit: 'pp' },
			{ id: 'timeSaved', value: 55.55, deviation: -5.16, unit: 'h', deviationUnit: 'h' },
			{ id: 'averageRunTime', value: 2.5, deviation: -0.5, unit: 's', deviationUnit: 's' },
		];

		test.each<{
			description: string;
			getDates: () => { start: ReturnType<typeof today>; end?: ReturnType<typeof today> };
		}>([
			{
				description: 'last 24 hours (day preset)',
				getDates: () => {
					const end = today(getLocalTimeZone());
					return { start: end.subtract({ days: 1 }), end };
				},
			},
			{
				description: 'last 7 days (week preset)',
				getDates: () => {
					const end = today(getLocalTimeZone());
					return { start: end.subtract({ days: 7 }), end };
				},
			},
			{
				description: 'last 14 days (2weeks preset)',
				getDates: () => {
					const end = today(getLocalTimeZone());
					return { start: end.subtract({ days: 14 }), end };
				},
			},
			{
				description: 'last 30 days (month preset)',
				getDates: () => {
					const end = today(getLocalTimeZone());
					return { start: end.subtract({ days: 30 }), end };
				},
			},
			{
				description: 'last 90 days (quarter preset)',
				getDates: () => {
					const end = today(getLocalTimeZone());
					return { start: end.subtract({ days: 90 }), end };
				},
			},
			{
				description: 'last 180 days (6months preset)',
				getDates: () => {
					const end = today(getLocalTimeZone());
					return { start: end.subtract({ days: 180 }), end };
				},
			},
			{
				description: 'last 365 days (year preset)',
				getDates: () => {
					const end = today(getLocalTimeZone());
					return { start: end.subtract({ days: 365 }), end };
				},
			},
			{
				description: 'custom range',
				getDates: () => {
					return {
						start: new CalendarDate(2025, 9, 6),
						end: new CalendarDate(2025, 9, 13),
					};
				},
			},
		])('should render with $description', ({ getDates }) => {
			const { start, end } = getDates();

			const { html } = renderComponent({
				props: {
					summary: testSummary,
					startDate: start,
					endDate: end,
				},
			});

			expect(html()).toMatchSnapshot();
		});
	});
});
