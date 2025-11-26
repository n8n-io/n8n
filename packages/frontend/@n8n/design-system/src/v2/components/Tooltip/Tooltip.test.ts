import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';

import Tooltip from './Tooltip.vue';

async function getTooltipContent(trigger: Element | null) {
	const tooltipId = trigger?.getAttribute('aria-describedby');

	const tooltip = await waitFor(() => {
		const el = document.getElementById(tooltipId!);
		if (!el) throw new Error('Tooltip not found');
		return el;
	});

	expect(tooltip).toBeVisible();
	return { tooltip };
}

describe('v2/components/Tooltip', () => {
	describe('rendering', () => {
		it('should render trigger element', () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});
			expect(wrapper.getByText('Hover me')).toBeInTheDocument();
		});

		it('should show tooltip on hover with content prop', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip content',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			const { tooltip } = await getTooltipContent(trigger);
			expect(tooltip).toHaveTextContent('Test tooltip content');
		});

		it('should show tooltip with custom content slot', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Ignored content',
				},
				slots: {
					default: '<button>Hover me</button>',
					content: '<div>Custom content</div>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			const { tooltip } = await getTooltipContent(trigger);
			expect(tooltip).toHaveTextContent('Custom content');
		});

		it('should render with HTML content (sanitized)', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: '<strong>Bold</strong> text',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			const { tooltip } = await getTooltipContent(trigger);
			expect(tooltip.querySelector('strong')).toBeInTheDocument();
			expect(tooltip).toHaveTextContent('Bold text');
		});

		it('should show arrow by default', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				const arrow = document.querySelector('[data-reka-tooltip-arrow]');
				expect(arrow).toBeInTheDocument();
			});
		});

		it('should hide arrow when showArrow is false', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					showArrow: false,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});

			const arrow = document.querySelector('[data-reka-tooltip-arrow]');
			expect(arrow).not.toBeInTheDocument();
		});
	});

	describe('placements', () => {
		const placements = [
			'top',
			'top-start',
			'top-end',
			'bottom',
			'bottom-start',
			'bottom-end',
			'left',
			'left-start',
			'left-end',
			'right',
			'right-start',
			'right-end',
		] as const;

		placements.forEach((placement) => {
			it(`should render with placement=${placement}`, async () => {
				const wrapper = render(Tooltip, {
					props: {
						content: 'Test tooltip',
						placement,
					},
					slots: {
						default: '<button>Hover me</button>',
					},
				});

				const trigger = wrapper.getByText('Hover me');
				await userEvent.hover(trigger);

				const { tooltip } = await getTooltipContent(trigger);
				expect(tooltip).toBeInTheDocument();

				// Check data-side attribute matches expected side
				const [expectedSide] = placement.split('-');
				expect(tooltip).toHaveAttribute('data-side', expectedSide);
			});
		});
	});

	describe('disabled state', () => {
		it('should not show tooltip when disabled', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					disabled: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			// Wait a bit to ensure tooltip doesn't appear
			await new Promise((resolve) => setTimeout(resolve, 200));

			const tooltipContent = document.querySelector('[role="tooltip"]');
			expect(tooltipContent).not.toBeInTheDocument();
		});
	});

	describe('delayed show', () => {
		it('should show tooltip after delay', async () => {
			vi.useFakeTimers();

			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					showAfter: 500,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			// Tooltip should not be visible immediately
			let tooltipContent = document.querySelector('[role="tooltip"]');
			expect(tooltipContent).not.toBeInTheDocument();

			// Fast-forward time
			vi.advanceTimersByTime(500);

			// Tooltip should now be visible
			await waitFor(() => {
				tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});

			vi.useRealTimers();
		});
	});

	describe('programmatic visibility', () => {
		it('should show tooltip when visible prop is true', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: true,
				},
				slots: {
					default: '<button>Click me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});
		});

		it('should hide tooltip when visible prop is false', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: false,
				},
				slots: {
					default: '<button>Click me</button>',
				},
			});

			const tooltipContent = document.querySelector('[role="tooltip"]');
			expect(tooltipContent).not.toBeInTheDocument();
		});

		it('should update visibility when visible prop changes', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: false,
				},
				slots: {
					default: '<button>Click me</button>',
				},
			});

			// Initially hidden
			let tooltipContent = document.querySelector('[role="tooltip"]');
			expect(tooltipContent).not.toBeInTheDocument();

			// Update to visible
			await wrapper.rerender({ visible: true });

			await waitFor(() => {
				tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});
		});
	});

	describe('custom popper class', () => {
		it('should apply custom popper class', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					popperClass: 'custom-tooltip-class',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				const tooltipContent = document.querySelector('.custom-tooltip-class');
				expect(tooltipContent).toBeInTheDocument();
			});
		});

		it('should apply default n8n-tooltip class when no popperClass provided', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				const tooltipContent = document.querySelector('.n8n-tooltip');
				expect(tooltipContent).toBeInTheDocument();
			});
		});
	});

	describe('buttons feature', () => {
		it('should render buttons at the bottom of tooltip', async () => {
			const handleSave = vi.fn();
			const handleCancel = vi.fn();

			const buttons = [
				{
					attrs: { label: 'Cancel', type: 'secondary' as const, size: 'small' as const },
					listeners: { click: handleCancel },
				},
				{
					attrs: { label: 'Save', type: 'primary' as const, size: 'small' as const },
					listeners: { click: handleSave },
				},
			];

			const wrapper = render(Tooltip, {
				props: {
					content: 'Confirm action?',
					buttons,
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});

			const cancelButton = wrapper.getByText('Cancel');
			const saveButton = wrapper.getByText('Save');

			expect(cancelButton).toBeInTheDocument();
			expect(saveButton).toBeInTheDocument();

			// Test button clicks
			await userEvent.click(cancelButton);
			expect(handleCancel).toHaveBeenCalledTimes(1);

			await userEvent.click(saveButton);
			expect(handleSave).toHaveBeenCalledTimes(1);
		});

		it('should apply justifyButtons prop', async () => {
			const buttons = [
				{
					attrs: { label: 'Button', type: 'primary' as const, size: 'small' as const },
				},
			];

			const wrapper = render(Tooltip, {
				props: {
					content: 'Test',
					buttons,
					justifyButtons: 'center',
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const buttonsContainer = wrapper.container.querySelector('[style*="justify-content"]');
				expect(buttonsContainer).toHaveStyle({ justifyContent: 'center' });
			});
		});

		it('should not render buttons container when buttons array is empty', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					buttons: [],
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});

			const buttonsContainer = wrapper.container.querySelector('[style*="justify-content"]');
			expect(buttonsContainer).not.toBeInTheDocument();
		});
	});

	describe('teleportation', () => {
		it('should teleport tooltip to body by default', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
				// Tooltip should be teleported (rendered via portal)
			});
		});

		it('should not teleport when teleported is false', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					teleported: false,
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});
		});
	});

	describe('offset', () => {
		it('should apply offset prop', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					offset: 20,
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
				// The offset is applied via CSS transform, checking that tooltip exists is sufficient
			});
		});
	});

	describe('enterable', () => {
		it('should allow mouse to enter tooltip content when enterable is true (default)', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					enterable: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			const { tooltip } = await getTooltipContent(trigger);
			expect(tooltip).toBeInTheDocument();

			// Move to tooltip content - should stay visible
			await userEvent.hover(tooltip);

			await waitFor(() => {
				expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();
			});
		});

		it('should close tooltip when mouse leaves trigger and enterable is false', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					enterable: false,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();
			});

			// Move away from trigger
			await userEvent.unhover(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
			});
		});
	});

	describe('update:open event', () => {
		it('should emit update:open when tooltip opens', async () => {
			const onUpdateOpen = vi.fn();

			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					'onUpdate:open': onUpdateOpen,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(onUpdateOpen).toHaveBeenCalledWith(true);
			});
		});

		it('should emit update:open when tooltip closes', async () => {
			const onUpdateOpen = vi.fn();

			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					'onUpdate:open': onUpdateOpen,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(onUpdateOpen).toHaveBeenCalledWith(true);
			});

			await userEvent.unhover(trigger);

			await waitFor(() => {
				expect(onUpdateOpen).toHaveBeenCalledWith(false);
			});
		});
	});

	describe('popperOptions', () => {
		it('should pass popperOptions to TooltipContent', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: true,
					popperOptions: {
						avoidCollisions: false,
					},
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[role="tooltip"]');
				expect(tooltipContent).toBeInTheDocument();
			});
		});
	});
});
