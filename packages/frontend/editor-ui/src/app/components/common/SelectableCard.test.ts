import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SelectableCard from './SelectableCard.vue';

const renderComponent = createComponentRenderer(SelectableCard, {
	props: {
		checkboxAriaLabel: 'Select card',
	},
	slots: {
		default: '<div data-test-id="card-content">Card content</div>',
	},
});

describe('SelectableCard', () => {
	it('should only render the checkbox for selectable cards', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('card-selection-checkbox')).not.toBeInTheDocument();
		expect(queryByTestId('card-content')).toBeInTheDocument();
	});

	it('should place the checkbox before the card content and expose active selection state', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { selectable: true },
		});
		const checkboxContainer = getByTestId('card-selection-checkbox');

		expect(checkboxContainer.nextElementSibling).toBe(getByTestId('card-content'));
		expect(checkboxContainer).toHaveAttribute('data-selection-visible', 'false');

		await rerender({ selectionActive: true });

		expect(checkboxContainer).toHaveAttribute('data-selection-visible', 'true');
	});

	it('should emit an update when the checkbox is toggled', async () => {
		const { getByRole, emitted } = renderComponent({
			props: { selectable: true },
		});

		await userEvent.click(getByRole('checkbox', { name: 'Select card' }));

		expect(emitted('update:modelValue')).toEqual([[true]]);
	});

	it('should disable selection when the limit is reached', () => {
		const { getByRole } = renderComponent({
			props: { selectable: true, selectionDisabled: true },
		});

		expect(getByRole('checkbox', { name: 'Select card' })).toBeDisabled();
	});
});
