import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import TriggerExecuteButton from '@/features/setupPanel/components/TriggerExecuteButton.vue';

const renderComponent = createComponentRenderer(TriggerExecuteButton);

const defaultProps = {
	label: 'Test step',
	icon: 'flask-conical' as const,
	disabled: false,
	loading: false,
	tooltipText: '',
};

describe('TriggerExecuteButton', () => {
	it('should render the execute button with given label', () => {
		const { getByTestId } = renderComponent({
			props: defaultProps,
		});

		const button = getByTestId('trigger-execute-button');
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent('Test step');
	});

	it('should emit click on button click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: defaultProps,
		});

		await userEvent.click(getByTestId('trigger-execute-button'));

		expect(emitted('click')).toHaveLength(1);
	});

	it('should be disabled when disabled prop is true', () => {
		const { getByTestId } = renderComponent({
			props: { ...defaultProps, disabled: true },
		});

		expect(getByTestId('trigger-execute-button')).toBeDisabled();
	});

	it('should show loading state when loading prop is true', () => {
		const { getByTestId } = renderComponent({
			props: { ...defaultProps, loading: true },
		});

		expect(getByTestId('trigger-execute-button')).toBeDisabled();
	});

	it('should not emit click when disabled', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { ...defaultProps, disabled: true },
		});

		await userEvent.click(getByTestId('trigger-execute-button'));

		expect(emitted('click')).toBeUndefined();
	});
});
