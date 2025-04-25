import { createComponentRenderer } from '@/__tests__/render';
import InsightsDashboard from './InsightsDashboard.vue';
import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@/__tests__/defaults';
import { useInsightsStore } from '@/features/insights/insights.store';
import { mockedStore } from '@/__tests__/utils';

const renderComponent = createComponentRenderer(InsightsDashboard, {
	props: {
		insightType: 'total',
	},
});

describe('InsightsSummary', () => {
	beforeEach(() => {
		createTestingPinia({ initialState: { settings: { settings: defaultSettings } } });
	});

	it('should render without error', () => {
		mockedStore(useInsightsStore);
		expect(() => renderComponent()).not.toThrow();
	});
});
