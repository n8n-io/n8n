import { createComponentRenderer } from '@/__tests__/render';
import CanvasControlButtons from './CanvasControlButtons.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

const MOCK_URL = 'mock-url';

vi.mock('@/composables/useBugReporting', () => ({
	useBugReporting: () => ({ getReportingURL: () => MOCK_URL }),
}));

const renderComponent = createComponentRenderer(CanvasControlButtons);

describe('CanvasControlButtons', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	it('should render correctly', () => {
		const wrapper = renderComponent({
			props: {
				showBugReportingButton: true,
			},
		});

		expect(wrapper.getByTestId('zoom-in-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-out-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-to-fit')).toBeVisible();
		expect(wrapper.getByTestId('report-bug')).toBeVisible();

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly without bug reporting button', () => {
		const wrapper = renderComponent();

		expect(wrapper.getByTestId('zoom-in-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-out-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-to-fit')).toBeVisible();
		expect(wrapper.queryByTestId('report-bug')).not.toBeInTheDocument();

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should show reset zoom button when zoom is not equal to 1', () => {
		const wrapper = renderComponent({
			props: {
				zoom: 1.5,
			},
		});

		expect(wrapper.getByTestId('reset-zoom-button')).toBeVisible();
	});
});
