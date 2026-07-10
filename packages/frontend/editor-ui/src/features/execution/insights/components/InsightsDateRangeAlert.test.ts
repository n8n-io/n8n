import { CalendarDate } from '@internationalized/date';
import InsightsDateRangeAlert from '@/features/execution/insights/components/InsightsDateRangeAlert.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@/__tests__/defaults';

const renderComponent = createComponentRenderer(InsightsDateRangeAlert, {
	global: {
		stubs: { N8nIcon: true },
	},
});

describe('InsightsDateRangeAlert', () => {
	beforeEach(() => {
		createTestingPinia({
			initialState: { settings: { settings: defaultSettings } },
		});
	});

	it('does not render when earliestDataDate is null', () => {
		const { queryByTestId } = renderComponent({
			props: {
				earliestDataDate: null,
				rangeStart: new CalendarDate(2026, 6, 1),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(queryByTestId('insights-date-range-alert')).not.toBeInTheDocument();
	});

	it('does not render when rangeStart is on the earliest data date', () => {
		const { queryByTestId } = renderComponent({
			props: {
				earliestDataDate: '2026-06-11T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 11),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(queryByTestId('insights-date-range-alert')).not.toBeInTheDocument();
	});

	it('does not render when rangeStart is after the earliest data date', () => {
		const { queryByTestId } = renderComponent({
			props: {
				earliestDataDate: '2026-06-11T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 15),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(queryByTestId('insights-date-range-alert')).not.toBeInTheDocument();
	});

	it('renders the alert when rangeStart is before the earliest data date', () => {
		const { getByTestId } = renderComponent({
			props: {
				earliestDataDate: '2026-06-11T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 9),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(getByTestId('insights-date-range-alert')).toBeInTheDocument();
	});

	it('shows the correct title', () => {
		const { getByText } = renderComponent({
			props: {
				earliestDataDate: '2026-06-11T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 9),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(getByText('Your selected range goes back further than your data')).toBeInTheDocument();
	});

	it('uses the singular form when exactly 1 day has no data', () => {
		const { getByTestId } = renderComponent({
			props: {
				earliestDataDate: '2026-06-11T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 10),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(getByTestId('insights-date-range-alert').textContent).toContain('1 earlier day');
	});

	it('uses the plural form when multiple days have no data', () => {
		const { getByTestId } = renderComponent({
			props: {
				earliestDataDate: '2026-06-11T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 9),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(getByTestId('insights-date-range-alert').textContent).toContain('2 earlier days');
	});

	it('shows no-data description when the entire range is before the earliest data date', () => {
		const { getByTestId } = renderComponent({
			props: {
				earliestDataDate: '2026-06-25T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 1),
				rangeEnd: new CalendarDate(2026, 6, 10),
			},
		});

		expect(getByTestId('insights-date-range-alert').textContent).toContain(
			'Your selected range does not have any data available.',
		);
	});

	it('hides the alert and emits dismiss when the dismiss button is clicked', async () => {
		const { getByTestId, queryByTestId, emitted } = renderComponent({
			props: {
				earliestDataDate: '2026-06-11T00:00:00.000Z',
				rangeStart: new CalendarDate(2026, 6, 9),
				rangeEnd: new CalendarDate(2026, 6, 30),
			},
		});

		expect(getByTestId('insights-date-range-alert')).toBeInTheDocument();

		await getByTestId('insights-date-range-alert-dismiss').click();

		expect(queryByTestId('insights-date-range-alert')).not.toBeInTheDocument();
		expect(emitted('dismiss')).toHaveLength(1);
	});
});
