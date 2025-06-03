import { createComponentRenderer } from '@/__tests__/render';
import CanvasRunWorkflowButton from './CanvasRunWorkflowButton.vue';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

const renderComponent = createComponentRenderer(CanvasRunWorkflowButton);

describe('CanvasRunWorkflowButton', () => {
	it('should render correctly', () => {
		const wrapper = renderComponent();

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render different label when executing', () => {
		const wrapper = renderComponent({
			props: {
				executing: true,
			},
		});

		expect(wrapper.getAllByText('Executing workflow')).toHaveLength(2);
	});

	it('should render different label when executing and waiting for webhook', () => {
		const wrapper = renderComponent({
			props: {
				executing: true,
				waitingForWebhook: true,
			},
		});

		expect(wrapper.getAllByText('Waiting for trigger event')).toHaveLength(2);
	});

	it("should only show the tooltip when it's not executing", async () => {
		const wrapper = renderComponent({ props: { executing: false } });
		await userEvent.hover(wrapper.getByRole('button'));

		function isTooltipVisible(isVisible: boolean) {
			return wrapper.baseElement.querySelector(
				`[id^="el-popper-container"] div[aria-hidden="${!isVisible}"]`,
			);
		}

		await waitFor(() => expect(isTooltipVisible(true)).toBeTruthy());

		await wrapper.rerender({ executing: true });
		await userEvent.hover(wrapper.getByRole('button'));

		await waitFor(() => expect(isTooltipVisible(false)).toBeTruthy());
	});
});
