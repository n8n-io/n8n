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

		const chevron = screen.getByRole('button', { name: /collapse/i });
		await fireEvent.click(chevron);

		expect(wrapper.emitted()).toHaveProperty('update:modelValue');
		expect(wrapper.emitted()['update:modelValue'][0]).toEqual([false]);
	});

	it('renders action buttons when actions are provided', () => {
		render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
				actions: [
					{
						icon: 'grip-vertical',
						label: 'Drag to reorder',
						onClick: () => {},
					},
					{
						icon: 'trash-2',
						label: 'Delete',
						onClick: () => {},
					},
				],
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
				actions: [
					{
						icon: 'trash-2',
						label: 'Delete',
						onClick: onClickMock,
					},
				],
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

		expect(onClickMock).toHaveBeenCalledOnce();
	});

	it('does not have always-visible class by default (showActionsOnHover: true)', () => {
		const { container } = render(N8nCollapsiblePanel, {
			props: {
				title: 'Test Item',
				modelValue: true,
				showActionsOnHover: true,
				actions: [
					{
						icon: 'trash-2',
						label: 'Delete',
						onClick: () => {},
					},
				],
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
				actions: [
					{
						icon: 'plus',
						label: 'Add',
						onClick: () => {},
					},
				],
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
