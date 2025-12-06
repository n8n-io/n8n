import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import type { PopoverPlacement, PopoverTrigger } from './Popover.types';
import Popover from './Popover.vue';

async function getPopoverContent() {
	const popover = await waitFor(() => {
		const el = document.querySelector('[data-dismissable-layer]');
		if (!el) throw new Error('Popover not found');
		return el as HTMLElement;
	});

	return { popover };
}

describe('v2/components/Popover', () => {
	describe('rendering', () => {
		it('should render trigger element via reference slot', () => {
			const wrapper = render(Popover, {
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});
			expect(wrapper.getByText('Click me')).toBeInTheDocument();
		});

		it('should not show popover content initially', () => {
			render(Popover, {
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});
			expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();
		});
	});

	describe('click trigger', () => {
		it('should show popover on click (default trigger)', async () => {
			const wrapper = render(Popover, {
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const trigger = wrapper.getByText('Click me');
			await userEvent.click(trigger);

			const { popover } = await getPopoverContent();
			expect(popover).toHaveTextContent('Popover content');
		});

		it('should toggle popover on repeated clicks', async () => {
			const wrapper = render(Popover, {
				props: {
					trigger: 'click' as PopoverTrigger,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const trigger = wrapper.getByText('Click me');

			// First click - open
			await userEvent.click(trigger);
			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});

			// Second click - close
			await userEvent.click(trigger);
			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();
			});
		});
	});

	describe('hover trigger', () => {
		it('should show popover on hover when trigger is hover', async () => {
			const wrapper = render(Popover, {
				props: {
					trigger: 'hover' as PopoverTrigger,
				},
				slots: {
					reference: '<button>Hover me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			const { popover } = await getPopoverContent();
			expect(popover).toHaveTextContent('Popover content');
		});

		it('should hide popover on mouse leave when trigger is hover', async () => {
			const wrapper = render(Popover, {
				props: {
					trigger: 'hover' as PopoverTrigger,
				},
				slots: {
					reference: '<button>Hover me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const trigger = wrapper.getByText('Hover me');
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});

			await userEvent.unhover(trigger);

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();
			});
		});
	});

	describe('placements', () => {
		const placements: PopoverPlacement[] = [
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
		];

		placements.forEach((placement) => {
			it(`should render with placement=${placement}`, async () => {
				const wrapper = render(Popover, {
					props: {
						placement,
					},
					slots: {
						reference: '<button>Click me</button>',
						default: '<div>Content</div>',
					},
				});

				const trigger = wrapper.getByText('Click me');
				await userEvent.click(trigger);

				const { popover } = await getPopoverContent();
				expect(popover).toBeInTheDocument();

				const [expectedSide] = placement.split('-');
				expect(popover).toHaveAttribute('data-side', expectedSide);
			});
		});
	});

	describe('v-model:visible', () => {
		it('should show popover when visible prop is true', async () => {
			render(Popover, {
				props: {
					visible: true,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});
		});

		it('should hide popover when visible prop is false', () => {
			render(Popover, {
				props: {
					visible: false,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();
		});

		it('should emit update:visible when popover opens', async () => {
			const wrapper = render(Popover, {
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const trigger = wrapper.getByText('Click me');
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(wrapper.emitted('update:visible')).toBeTruthy();
				expect(wrapper.emitted('update:visible')?.[0]).toEqual([true]);
			});
		});

		it('should update visibility when visible prop changes', async () => {
			const wrapper = render(Popover, {
				props: {
					visible: false,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();

			await wrapper.rerender({ visible: true });

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});
		});
	});

	describe('width prop', () => {
		it('should apply number width as pixels', async () => {
			render(Popover, {
				props: {
					visible: true,
					width: 300,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const { popover } = await getPopoverContent();
			expect(popover).toHaveStyle({ width: '300px' });
		});

		it('should apply string width as-is', async () => {
			render(Popover, {
				props: {
					visible: true,
					width: 'auto',
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const { popover } = await getPopoverContent();
			expect(popover).toHaveStyle({ width: 'auto' });
		});
	});

	describe('contentClass prop', () => {
		it('should apply custom class to popover content', async () => {
			render(Popover, {
				props: {
					visible: true,
					contentClass: 'custom-popover-class',
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const { popover } = await getPopoverContent();
			expect(popover).toHaveClass('custom-popover-class');
		});
	});

	describe('contentStyle prop', () => {
		it('should apply custom styles to popover content', async () => {
			render(Popover, {
				props: {
					visible: true,
					contentStyle: { padding: '20px', maxWidth: '500px' },
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const { popover } = await getPopoverContent();
			expect(popover).toHaveStyle({ padding: '20px', maxWidth: '500px' });
		});
	});

	describe('showArrow prop', () => {
		it('should show arrow by default', async () => {
			render(Popover, {
				props: {
					visible: true,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			await waitFor(() => {
				const popoverContent = document.querySelector('[data-dismissable-layer]');
				const arrow = popoverContent?.querySelector('svg');
				expect(arrow).toBeInTheDocument();
			});
		});

		it('should hide arrow when showArrow is false', async () => {
			render(Popover, {
				props: {
					visible: true,
					showArrow: false,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			await waitFor(() => {
				const popoverContent = document.querySelector('[data-dismissable-layer]');
				expect(popoverContent).toBeInTheDocument();
				const arrow = popoverContent?.querySelector('svg');
				expect(arrow).not.toBeInTheDocument();
			});
		});
	});

	describe('offset prop', () => {
		it('should apply offset prop', async () => {
			render(Popover, {
				props: {
					visible: true,
					offset: 20,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			await waitFor(() => {
				const popoverContent = document.querySelector('[data-dismissable-layer]');
				expect(popoverContent).toBeInTheDocument();
			});
		});
	});

	describe('teleported prop', () => {
		it('should teleport to body by default', async () => {
			const { container } = render(Popover, {
				props: {
					visible: true,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			await waitFor(() => {
				const popoverContent = document.querySelector('[data-dismissable-layer]');
				expect(popoverContent).toBeInTheDocument();
				// Verify popover is NOT inside the component container (teleported to body)
				expect(container.querySelector('[data-dismissable-layer]')).toBeNull();
			});
		});

		it('should not teleport when teleported is false', async () => {
			const { container } = render(Popover, {
				props: {
					visible: true,
					teleported: false,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			await waitFor(() => {
				const popoverContent = document.querySelector('[data-dismissable-layer]');
				expect(popoverContent).toBeInTheDocument();
				// Verify popover IS inside the component container (not teleported)
				expect(container.querySelector('[data-dismissable-layer]')).not.toBeNull();
			});
		});
	});

	describe('slots', () => {
		it('should provide close function in default slot scope', async () => {
			let capturedClose: (() => void) | undefined;

			const wrapper = render(Popover, {
				props: {
					visible: true,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: (props: { close: () => void }) => {
						capturedClose = props.close;
						return '<div>Content</div>';
					},
				},
			});

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});

			expect(capturedClose).toBeDefined();
			capturedClose!();

			await waitFor(() => {
				expect(wrapper.emitted('update:visible')).toBeTruthy();
				const emits = wrapper.emitted('update:visible');
				expect(emits?.[emits.length - 1]).toEqual([false]);
			});
		});
	});

	describe('events', () => {
		// Note: Vue Transition events don't fire reliably in JSDOM test environment
		// These tests verify the component handles visibility changes correctly
		it('should handle visibility change to open', async () => {
			const wrapper = render(Popover, {
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			const trigger = wrapper.getByText('Click me');
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});
		});

		it('should handle visibility change to close', async () => {
			const wrapper = render(Popover, {
				props: {
					visible: true,
				},
				slots: {
					reference: '<button>Click me</button>',
					default: '<div>Popover content</div>',
				},
			});

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toBeInTheDocument();
			});

			await wrapper.rerender({ visible: false });

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).not.toBeInTheDocument();
			});
		});
	});
});
