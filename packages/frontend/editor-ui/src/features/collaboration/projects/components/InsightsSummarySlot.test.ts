import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { reactive } from 'vue';

import InsightsSummarySlot from './InsightsSummarySlot.vue';

const insightsStore = reactive({
	isSummaryEnabled: true,
	weeklySummary: { isLoading: false, state: [], execute: vi.fn() },
});

vi.mock('@n8n/frontend-module-insights', () => ({
	useInsightsStore: () => insightsStore,
	InsightsSummary: { template: '<div data-test-id="insights-summary" />' },
}));

const renderComponent = createComponentRenderer(InsightsSummarySlot);

describe('InsightsSummarySlot', () => {
	afterEach(() => {
		insightsStore.isSummaryEnabled = true;
		vi.clearAllMocks();
	});

	it('loads and shows the weekly summary', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('insights-summary')).toBeInTheDocument();
		expect(insightsStore.weeklySummary.execute).toHaveBeenCalledTimes(1);
	});

	it('shows nothing when the summary is not available', () => {
		insightsStore.isSummaryEnabled = false;
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('insights-summary')).not.toBeInTheDocument();
		expect(insightsStore.weeklySummary.execute).not.toHaveBeenCalled();
	});
});
