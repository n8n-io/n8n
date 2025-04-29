import { createComponentRenderer } from '@/__tests__/render';
import InsightsDashboard from './InsightsDashboard.vue';
import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@/__tests__/defaults';
import { useInsightsStore } from '@/features/insights/insights.store';
import { mockedStore } from '@/__tests__/utils';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(InsightsDashboard, {
	props: {
		insightType: 'total',
	},
});

describe('InsightsDashboard', () => {
	beforeEach(() => {
		createTestingPinia({ initialState: { settings: { settings: defaultSettings } } });
	});

	it('should render without error', () => {
		mockedStore(useInsightsStore);
		expect(() => renderComponent()).not.toThrow();
	});

	it('should update the selected time range', async () => {
		mockedStore(useInsightsStore);

		const { getByTestId } = renderComponent();

		expect(getByTestId('range-select')).toBeVisible();
		const select = within(getByTestId('range-select')).getByRole('combobox');
		await userEvent.click(select);

		const controllingId = select.getAttribute('aria-controls');
		const actions = document.querySelector(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}

		await userEvent.click(actions.querySelectorAll('li')[0]);
		expect((select as HTMLInputElement).value).toBe('Last 24 hours');
	});
});
