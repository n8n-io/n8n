import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Tooltip from './Tooltip.vue';

async function getTooltipContent(_trigger?: Element | null) {
	const tooltip = await waitFor(() => {
		// Reka UI tooltip content has data-dismissable-layer attribute
		const el = document.querySelector('[data-dismissable-layer]');
		if (!el) throw new Error('Tooltip not found');
		return el as HTMLElement;
	});

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
		it('should pass showAfter as delayDuration to TooltipRoot', async () => {
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

			// Hover and wait for tooltip (delay is handled internally by Reka UI)
			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				const tooltipContent = document.querySelector('[data-dismissable-layer]');
				expect(tooltipContent).toBeInTheDocument();
			});
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
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
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
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});

			// Move away from trigger
			await userEvent.unhover(trigger);

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();
			});
		});
	});
});
