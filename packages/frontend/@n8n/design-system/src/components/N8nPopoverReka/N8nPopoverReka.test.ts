import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';

import N8nPopoverReka from './N8nPopoverReka.vue';

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

describe('N8nPopoverReka', () => {
	it('should render correctly with default props', () => {
		const wrapper = render(N8nPopoverReka, {
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

		const wrapper = render(N8nPopoverReka, {
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
		const wrapper = mount(N8nPopoverReka, {
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
		const wrapper = mount(N8nPopoverReka, {
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
});
