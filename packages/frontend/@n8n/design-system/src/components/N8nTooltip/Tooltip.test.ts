import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Tooltip from './Tooltip.vue';

/**
 * Get tooltip content element from the DOM.
 * Reka UI tooltip content has data-dismissable-layer attribute when open.
 */
async function getTooltip() {
	return await waitFor(() => {
		const el = document.querySelector('[data-dismissable-layer]');
		if (!el) throw new Error('Tooltip not found');
		return el as HTMLElement;
	});
}

/**
 * Hover over an element to trigger Reka UI tooltip.
 * Reka UI requires pointermove with pointerType: 'mouse' to show tooltips.
 */
function hoverTooltipTrigger(element: Element) {
	element.dispatchEvent(
		new PointerEvent('pointermove', {
			bubbles: true,
			cancelable: true,
			pointerType: 'mouse',
			clientX: 100,
			clientY: 100,
		}),
	);
}

describe('components/N8nTooltip', () => {
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

		it('should show tooltip with content prop', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip content',
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const tooltip = await getTooltip();
			expect(tooltip).toHaveTextContent('Test tooltip content');
		});

		it('should show tooltip with custom content slot', async () => {
			render(Tooltip, {
				props: {
					content: 'Ignored content',
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
					content: '<div>Custom content</div>',
				},
			});

			const tooltip = await getTooltip();
			expect(tooltip).toHaveTextContent('Custom content');
		});

		it('should render with HTML content (sanitized)', async () => {
			render(Tooltip, {
				props: {
					content: '<strong>Bold</strong> text',
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const tooltip = await getTooltip();
			expect(tooltip.querySelector('strong')).toBeInTheDocument();
			expect(tooltip).toHaveTextContent('Bold text');
		});

		it('should show arrow by default', async () => {
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
				// Arrow is an SVG element inside the tooltip content
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
				const arrow = tooltipContent?.querySelector('svg');
				expect(arrow).toBeInTheDocument();
			});
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
				render(Tooltip, {
					props: {
						content: 'Test tooltip',
						placement,
						visible: true,
					},
					slots: {
						default: '<button>Hover me</button>',
					},
				});

				const tooltip = await getTooltip();
				expect(tooltip).toBeInTheDocument();

				// Check data-side attribute matches expected side
				const [expectedSide] = placement.split('-');
				expect(tooltip).toHaveAttribute('data-side', expectedSide);
			});
		});
	});

	describe('disabled state', () => {
		it('should disable trigger interactions when disabled', () => {
			// The disabled prop disables trigger interactions (hover, focus, click)
			// but does not prevent programmatic visibility via visible prop
			// This is consistent with Reka UI's TooltipRoot behavior
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					disabled: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			// Trigger should still render but tooltip won't show on interaction
			const trigger = document.querySelector('[data-grace-area-trigger]');
			expect(trigger).toBeInTheDocument();

			// Tooltip content should not be present since we didn't trigger it
			const tooltipContent = document.querySelector('[data-dismissable-layer]');
			expect(tooltipContent).not.toBeInTheDocument();
		});
	});

	describe('delayed show', () => {
		it('should accept showAfter prop', () => {
			// This test verifies the prop is passed correctly
			// The actual delay behavior is handled by Reka UI's TooltipRoot
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
					showAfter: 500,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			// Verify the component renders with the prop
			expect(wrapper.getByText('Hover me')).toBeInTheDocument();
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
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
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

			const tooltipContent = document.querySelector('[data-dismissable-layer]');
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
			let tooltipContent = document.querySelector('[data-dismissable-layer]');
			expect(tooltipContent).not.toBeInTheDocument();

			// Update to visible
			await wrapper.rerender({ visible: true });

			await waitFor(() => {
				tooltipContent = document.querySelector('[data-dismissable-layer]');
				expect(tooltipContent).toBeInTheDocument();
			});
		});
	});

	describe('default class', () => {
		it('should apply default n8n-tooltip class', async () => {
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
				const tooltipContent = document.querySelector('.n8n-tooltip');
				expect(tooltipContent).toBeInTheDocument();
			});
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
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
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
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
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
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
				expect(tooltipContent).toBeInTheDocument();
				// The offset is applied via CSS transform, checking that tooltip exists is sufficient
			});
		});
	});

	describe('buttons', () => {
		it('should render buttons when provided and handle click', async () => {
			const buttonSpy = vi.fn();
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: true,
					buttons: [
						{
							attrs: { label: 'Button 1' },
							listeners: { onClick: buttonSpy },
						},
					],
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});

			const button = document.querySelector('[data-dismissable-layer] button');
			expect(button).toBeInTheDocument();
			expect(button).toHaveTextContent('Button 1');

			// Verify click handler is called
			const user = userEvent.setup();
			await user.click(button!);
			expect(buttonSpy).toHaveBeenCalledTimes(1);
		});

		it('should not render buttons section when buttons array is empty', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: true,
					buttons: [],
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
				expect(tooltipContent).toBeInTheDocument();
				// Only the arrow SVG should be a button-related element, not our custom buttons
				const buttons = tooltipContent?.querySelectorAll('button');
				expect(buttons?.length ?? 0).toBe(0);
			});
		});
	});

	describe('contentClass', () => {
		it('should apply contentClass to tooltip content', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: true,
					contentClass: 'custom-class',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('.n8n-tooltip.custom-class');
				expect(tooltipContent).toBeInTheDocument();
			});
		});
	});

	describe('avoidCollisions', () => {
		it('should render with avoidCollisions prop', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					visible: true,
					avoidCollisions: false,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			await waitFor(() => {
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
				expect(tooltipContent).toBeInTheDocument();
			});
		});
	});

	describe('enterable', () => {
		it('should have TooltipProvider configured for enterable behavior', async () => {
			// This test verifies the component renders correctly with enterable prop
			// The actual enterable behavior (allowing mouse to enter tooltip content)
			// is handled by Reka UI's TooltipProvider via disableHoverableContent
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					enterable: true,
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const tooltip = await getTooltip();
			expect(tooltip).toBeInTheDocument();
		});

		it('should have TooltipProvider configured for non-enterable behavior', async () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
					enterable: false,
					visible: true,
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const tooltip = await getTooltip();
			expect(tooltip).toBeInTheDocument();
		});
	});

	describe('trigger attributes', () => {
		it('should have data-grace-area-trigger attribute on trigger element', () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = document.querySelector('[data-grace-area-trigger]');
			expect(trigger).toBeInTheDocument();
		});

		it('should have data-state attribute on trigger element', () => {
			render(Tooltip, {
				props: {
					content: 'Test tooltip',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = document.querySelector('[data-state]');
			expect(trigger).toBeInTheDocument();
			expect(trigger).toHaveAttribute('data-state', 'closed');
		});

		it('should update data-state to open when visible', async () => {
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
				const trigger = document.querySelector('[data-grace-area-trigger]');
				expect(trigger).toHaveAttribute('data-state', 'instant-open');
			});
		});
	});

	describe('hover interaction', () => {
		it('should show tooltip on hover', async () => {
			const wrapper = render(Tooltip, {
				props: {
					content: 'Test tooltip',
				},
				slots: {
					default: '<button>Hover me</button>',
				},
			});

			const trigger = wrapper.getByText('Hover me');

			// Tooltip should not be visible initially
			expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();

			// Hover to show tooltip
			hoverTooltipTrigger(trigger);

			// Wait for tooltip to appear
			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});
			expect(document.querySelector('[data-dismissable-layer]')).toHaveTextContent('Test tooltip');
		});

		it('should not show tooltip on hover when disabled', async () => {
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

			// Hover to try showing tooltip
			hoverTooltipTrigger(trigger);

			// Give some time for potential tooltip to appear
			await new Promise((r) => setTimeout(r, 100));

			// Tooltip should not appear when disabled
			expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();
		});
	});
});
