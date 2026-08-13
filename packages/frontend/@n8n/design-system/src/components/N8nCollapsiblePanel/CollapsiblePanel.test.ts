import { fireEvent, render, screen } from '@testing-library/vue';

import N8nCollapsiblePanel from './CollapsiblePanel.vue';

describe('N8nCollapsiblePanel', () => {
	it('renders with title', () => {
		render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Collection Item',
				modelValue: true,
			},
		});

		expect(screen.getByText('Test Collection Item')).toBeInTheDocument();
	});

	it('toggles open/closed state when chevron is clicked', async () => {
		const wrapper = render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
			},
		});

		const chevron = screen.getByRole('button', { name: /test item/i });
		await fireEvent.click(chevron);

		expect(wrapper.emitted()).toHaveProperty('update:modelValue');
		expect(wrapper.emitted()['update:modelValue'][0]).toEqual([false]);
	});

	it('renders action buttons when actions slot is provided', () => {
		render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
			},
			slots: {
				actions: `
					<button aria-label="Drag to reorder">Drag to reorder</button>
					<button aria-label="Delete">Delete</button>
				`,
			},
		});

		expect(screen.getByRole('button', { name: 'Drag to reorder' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	});

	it('calls action onClick handler when action button is clicked', async () => {
		const onClickMock = vi.fn();
		render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
			},
			slots: {
				actions: '<button aria-label="Delete" data-test-id="delete-btn">Delete</button>',
			},
		});

		const button = screen.getByTestId('delete-btn');
		button.addEventListener('click', onClickMock);
		await fireEvent.click(button);

		expect(onClickMock).toHaveBeenCalled();
	});

	it('does not have always-visible class by default (showActionsOnHover: true)', () => {
		const { container } = render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
				showActionsOnHover: true,
			},
			slots: {
				actions: '<button>Delete</button>',
			},
		});

		const actionsContainer = container.querySelector('[class*="actions"]');
		expect(actionsContainer?.className).not.toContain('actionsAlwaysVisible');
	});

	it('has always-visible class when showActionsOnHover is false', () => {
		const { container } = render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
				showActionsOnHover: false,
			},
			slots: {
				actions: '<button>Add</button>',
			},
		});

		const actionsContainer = container.querySelector('[class*="actions"]');
		expect(actionsContainer?.className).toContain('actionsAlwaysVisible');
	});

	it('renders slot content', () => {
		render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
			},
			slots: {
				default: '<div>Slot Content</div>',
			},
		});

		expect(screen.getByText('Slot Content')).toBeInTheDocument();
	});
});
