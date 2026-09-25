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
});
