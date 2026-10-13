import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import ActionToggle from './ActionToggle.vue';

async function openMenu(container: Element) {
	const trigger = container.querySelector('button');
	if (!trigger) throw new Error('Trigger not found');
	await userEvent.click(trigger);
	await waitFor(() => {
		if (!document.querySelector('[role="menu"]')) throw new Error('Menu not open');
	});
}

describe('N8nActionToggle', () => {
	it('renders labels for items with and without a tooltip', async () => {
		const { container, getByText } = render(ActionToggle, {
			props: {
				actions: [
					{ label: 'Duplicate', value: 'duplicate' },
					{ label: 'Delete', value: 'delete', disabled: true, tooltip: 'Cannot delete' },
				],
			},
		});

		await openMenu(container);

		// The custom item-label slot must not drop the label for either item.
		expect(getByText('Duplicate')).toBeInTheDocument();
		expect(getByText('Delete')).toBeInTheDocument();
	});
	it('defaults icon to horizontal orientation and is ellipsis', function () {
		const { getByRole } = render(ActionToggle, {
			props: {
				actions: [{ label: 'Duplicate', value: 'duplicate' }],
			},
		});

		expect(getByRole('button').querySelector('svg')).toHaveAttribute('data-icon', 'ellipsis');
	});
	it('should have bottom-end as default placement', async function () {
		const { container, getByRole } = render(ActionToggle, {
			props: {
				actions: [{ label: 'Duplicate', value: 'duplicate' }],
			},
		});

		await openMenu(container);

		await waitFor(function () {
			expect(getByRole('menu')).toHaveAttribute('data-side', 'bottom');
			expect(getByRole('menu')).toHaveAttribute('data-align', 'end');
		});
	});
});
