import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import BackToWorkflowBanner from '../components/BackToWorkflowBanner.vue';

const renderComponent = createComponentRenderer(BackToWorkflowBanner);

describe('BackToWorkflowBanner', () => {
	it('renders the back-to-workflow control', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('agent-back-to-workflow')).toBeInTheDocument();
	});

	it('emits "back" when the control is clicked', async () => {
		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(emitted().back).toHaveLength(1);
	});
});
