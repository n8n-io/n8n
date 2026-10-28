import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';

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
	it('renders an icon before the label of an item that has one', async () => {
		const { container } = render(ActionToggle, {
			props: {
				actions: [
					{ label: 'Edit', value: 'edit', icon: 'pencil' },
					{ label: 'Duplicate', value: 'duplicate' },
				],
			},
		});

		await openMenu(container);

		const items = document.querySelectorAll('[role="menuitem"]');
		const icon = items[0]?.querySelector('[data-icon="pencil"]');
		const label = within(items[0] as HTMLElement).getByText('Edit');
		expect(icon).not.toBeNull();
		expect(icon?.compareDocumentPosition(label)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(items[1]?.querySelector('[data-icon]')).toBeNull();
	});

	it('renders the horizontal ellipsis icon', function () {
		const { getByRole } = render(ActionToggle, {
			props: {
				actions: [{ label: 'Duplicate', value: 'duplicate' }],
			},
		});

		expect(getByRole('button').querySelector('svg')).toHaveAttribute('data-icon', 'ellipsis-12');
	});
	it('renders the icon at the default size', function () {
		const { getByRole } = render(ActionToggle, {
			props: {
				actions: [{ label: 'Duplicate', value: 'duplicate' }],
			},
		});

		expect(getByRole('button').querySelector('svg')).toHaveAttribute('width', '12px');
	});
	it('renders the icon at the given iconSize', function () {
		const { getByRole } = render(ActionToggle, {
			props: {
				actions: [{ label: 'Duplicate', value: 'duplicate' }],
				iconSize: 'medium',
			},
		});

		expect(getByRole('button').querySelector('svg')).toHaveAttribute('width', '14px');
	});
	it('renders the button at the default size', function () {
		const { getByRole } = render(ActionToggle, {
			props: {
				actions: [{ label: 'Duplicate', value: 'duplicate' }],
			},
		});

		const button = getByRole('button');
		expect(button.className).toMatch(/small/);
		expect(button.className).not.toMatch(/xsmall/);
	});
	it('renders the button at the given size and keeps the icon size', function () {
		const { getByRole } = render(ActionToggle, {
			props: {
				actions: [{ label: 'Duplicate', value: 'duplicate' }],
				size: 'xsmall',
			},
		});

		const button = getByRole('button');
		expect(button.className).toMatch(/xsmall/);
		expect(button.querySelector('svg')).toHaveAttribute('width', '12px');
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
