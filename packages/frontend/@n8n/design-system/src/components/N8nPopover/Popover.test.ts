import { render, waitFor } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';

import N8nPopover from './Popover.vue';

const defaultStubs = {
	PopoverContent: {
		template:
			'<mock-popover-content v-bind="$attrs" :style="$attrs.style"><slot /></mock-popover-content>',
		props: ['open', 'side', 'sideOffset', 'class', 'style'],
	},
	PopoverPortal: { template: '<mock-popover-portal><slot /></mock-popover-portal>' },
	PopoverRoot: {
		template:
			'<mock-popover-root v-bind="$attrs" @update:open="$emit(\'update:open\', $event)"><slot /></mock-popover-root>',
		props: ['open'],
		emits: ['update:open'],
	},
	PopoverTrigger: {
		template: '<mock-popover-trigger v-bind="$attrs"><slot /></mock-popover-trigger>',
		props: ['asChild'],
	},
};

describe('N8nPopover', () => {
	it('should render correctly with default props', () => {
		const wrapper = render(N8nPopover, {
			props: {},
			global: {
				stubs: defaultStubs,
			},
			slots: {
				trigger: '<button />',
				content: '<content />',
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
		expect(wrapper.html()).toContain('<button></button>');
		expect(wrapper.html()).toContain('<content></content>');
	});

	it('should emit update:open with false when close function is called', () => {
		let closeFunction: (() => void) | undefined;

		const wrapper = render(N8nPopover, {
			props: {},
			global: {
				stubs: {
					...defaultStubs,
					PopoverContent: {
						template:
							'<mock-popover-content v-bind="$attrs"><slot :close="mockClose" /></mock-popover-content>',
						props: ['side', 'sideOffset', 'class'],
						setup() {
							const mockClose = vi.fn(() => {
								if (closeFunction) {
									closeFunction();
								}
							});
							return { mockClose };
						},
					},
				},
			},
			slots: {
				trigger: '<button />',
				content: ({ close }: { close: () => void }) => {
					closeFunction = close;
					return '<button>Close</button>';
				},
			},
		});

		// Call the close function
		if (closeFunction) {
			closeFunction();
		}

		expect(wrapper.emitted()).toHaveProperty('update:open');
		expect(wrapper.emitted()['update:open']).toContainEqual([false]);
	});

	it('should apply maxHeight style when maxHeight prop is provided', () => {
		const wrapper = mount(N8nPopover, {
			props: {
				maxHeight: '200px',
			},
			global: {
				stubs: defaultStubs,
			},
			slots: {
				trigger: '<button />',
				content: '<content />',
			},
		});

		expect(wrapper.props('maxHeight')).toBe('200px');
	});

	it('should not apply maxHeight style when maxHeight prop is not provided', () => {
		const wrapper = mount(N8nPopover, {
			props: {},
			global: {
				stubs: defaultStubs,
			},
			slots: {
				trigger: '<button />',
				content: '<content />',
			},
		});

		expect(wrapper.props('maxHeight')).toBeUndefined();
	});

	describe('footer slot', () => {
		it('renders the footer outside the scroll area and caps the whole card', () => {
			const wrapper = render(N8nPopover, {
				props: { maxHeight: '200px' },
				global: { stubs: defaultStubs },
				slots: {
					trigger: '<button />',
					content: '<content />',
					footer: '<footer-content />',
				},
			});

			const footer = wrapper.getByTestId('popover-footer');
			const viewport = wrapper.container.querySelector('[data-reka-scroll-area-viewport]')!;

			expect(footer).toContainHTML('<footer-content></footer-content>');
			expect(viewport).not.toContainElement(footer);
			// The footer follows the scroll area, and the cap moves from the viewport to the card.
			expect(viewport.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
			expect(viewport).not.toHaveStyle({ maxHeight: '200px' });
		});

		it('renders no footer container without the slot', () => {
			const wrapper = render(N8nPopover, {
				props: { maxHeight: '200px' },
				global: { stubs: defaultStubs },
				slots: {
					trigger: '<button />',
					content: '<content />',
				},
			});

			expect(wrapper.queryByTestId('popover-footer')).not.toBeInTheDocument();
			expect(wrapper.container.querySelector('[data-reka-scroll-area-viewport]')).toHaveStyle({
				maxHeight: '200px',
			});
		});
	});

	describe('auto-focus behavior', () => {
		it('should focus an element in the content slot by default', async () => {
			const wrapper = render(N8nPopover, {
				props: { open: true },
				slots: {
					trigger: '<button />',
					content: '<input />',
				},
			});
			const popover = await wrapper.findByRole('dialog');

			expect(popover.contains(document.activeElement)).toBe(true);
		});

		it('should suppress auto-focus when suppressAutoFocus is true', async () => {
			const wrapper = render(N8nPopover, {
				props: { open: true, suppressAutoFocus: true },
				slots: {
					trigger: '<button />',
					content: '<input />',
				},
			});
			const popover = await wrapper.findByRole('dialog');

			expect(popover.contains(document.activeElement)).toBe(false);
		});

		it('should suppress focus restore on close when suppressAutoFocus is true', async () => {
			const triggerHandle = document.createElement('button');
			triggerHandle.textContent = 'trigger';
			document.body.appendChild(triggerHandle);

			const externalInput = document.createElement('input');
			document.body.appendChild(externalInput);

			const wrapper = render(N8nPopover, {
				props: { open: true, suppressAutoFocus: true },
				slots: {
					trigger: '<button>trigger</button>',
					content: '<input />',
				},
			});
			await wrapper.findByRole('dialog');

			externalInput.focus();
			expect(document.activeElement).toBe(externalInput);

			await wrapper.rerender({ open: false, suppressAutoFocus: true });
			await waitFor(() => expect(wrapper.queryByRole('dialog')).not.toBeInTheDocument());

			expect(document.activeElement).toBe(externalInput);

			triggerHandle.remove();
			externalInput.remove();
		});
	});
});
