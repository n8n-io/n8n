import { createComponentRenderer } from '@/__tests__/render';
import CanvasControlButtons from './CanvasControlButtons.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

const renderComponent = createComponentRenderer(CanvasControlButtons, {
	global: {
		stubs: {
			N8nIconButton: true,
			N8nButton: true,
		},
	},
});

describe('CanvasControlButtons', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	it('should render correctly', () => {
		const wrapper = renderComponent();

		expect(wrapper.getByTestId('zoom-in-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-out-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-to-fit')).toBeVisible();
		expect(wrapper.getByTestId('tidy-up-button')).toBeVisible();

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should hide the tidy up button when canvas is read-only', () => {
		const wrapper = renderComponent({
			props: {
				readOnly: true,
			},
		});

		expect(wrapper.queryByTestId('tidy-up-button')).not.toBeInTheDocument();
	});
});
