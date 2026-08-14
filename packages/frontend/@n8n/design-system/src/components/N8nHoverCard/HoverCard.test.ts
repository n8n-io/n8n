import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';

import N8nHoverCard from './HoverCard.vue';

const defaultStubs = {
	HoverCardContent: {
		template:
			'<mock-hover-card-content v-bind="$attrs" :style="$attrs.style" :data-reference="reference ? String(reference) : undefined"><slot /></mock-hover-card-content>',
		props: ['side', 'align', 'sideOffset', 'class', 'style', 'reference'],
	},
	HoverCardPortal: { template: '<mock-hover-card-portal><slot /></mock-hover-card-portal>' },
	HoverCardRoot: {
		template:
			'<mock-hover-card-root v-bind="$attrs" :data-open="String(open)" @click="$emit(\'update:open\', true)"><slot /></mock-hover-card-root>',
		props: ['open', 'defaultOpen', 'openDelay', 'closeDelay'],
		emits: ['update:open'],
	},
	HoverCardTrigger: {
		template: '<mock-hover-card-trigger v-bind="$attrs"><slot /></mock-hover-card-trigger>',
		props: ['asChild'],
	},
};

describe('N8nHoverCard', () => {
	it('should render correctly with default props', () => {
		const wrapper = render(N8nHoverCard, {
			global: { stubs: defaultStubs },
			slots: {
				trigger: '<button>Trigger</button>',
				content: '<div>Hover content</div>',
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
		expect(wrapper.html()).toContain('Trigger');
		expect(wrapper.html()).toContain('Hover content');
	});

	it('should emit update:open with false when close function is called', () => {
		let closeFunction: (() => void) | undefined;

		const wrapper = render(N8nHoverCard, {
			global: { stubs: defaultStubs },
			slots: {
				trigger: '<button>Trigger</button>',
				content: ({ close }: { close: () => void }) => {
					closeFunction = close;
					return '<button>Close</button>';
				},
			},
		});

		closeFunction?.();

		expect(wrapper.emitted()).toHaveProperty('update:open');
		expect(wrapper.emitted()['update:open']).toContainEqual([false]);
	});

	it('should render a hidden trigger for reference-based usage', () => {
		const reference = document.createElement('button');
		const wrapper = mount(N8nHoverCard, {
			props: { hideTrigger: true, reference },
			global: { stubs: defaultStubs },
			slots: { content: '<div>Shared content</div>' },
		});

		expect(wrapper.find('mock-hover-card-trigger').classes()).toContain('hiddenTrigger');
		expect(wrapper.find('mock-hover-card-content').attributes('data-reference')).toBe(
			'[object HTMLButtonElement]',
		);
	});

	it('should wrap content in scroll area when enableScrolling is true', () => {
		const wrapper = render(N8nHoverCard, {
			props: { enableScrolling: true, maxHeight: '240px' },
			global: { stubs: defaultStubs },
			slots: {
				trigger: '<button>Trigger</button>',
				content: '<div>Scrollable content</div>',
			},
		});

		expect(wrapper.html()).toContain('Scrollable content');
		expect(wrapper.html()).toContain('data-reka-scroll-area-viewport');
	});

	it('should emit lifecycle events when controlled open state changes', async () => {
		const wrapper = mount(N8nHoverCard, {
			props: { open: false },
			global: { stubs: defaultStubs },
			slots: {
				trigger: '<button>Trigger</button>',
				content: '<div>Hover content</div>',
			},
		});

		await wrapper.setProps({ open: true });
		await wrapper.setProps({ open: false });

		expect(wrapper.emitted('before-enter')).toHaveLength(1);
		expect(wrapper.emitted('after-leave')).toHaveLength(1);
	});

	it('should force controlled open state to false when disabled', () => {
		const wrapper = mount(N8nHoverCard, {
			props: { open: true, disabled: true },
			global: { stubs: defaultStubs },
			slots: {
				trigger: '<button>Trigger</button>',
				content: '<div>Hover content</div>',
			},
		});

		expect(wrapper.find('mock-hover-card-root').attributes('data-open')).toBe('false');
	});

	it('should pass update:open events through from reka root', async () => {
		const wrapper = mount(N8nHoverCard, {
			global: { stubs: defaultStubs },
			slots: {
				trigger: '<button>Trigger</button>',
				content: '<div>Hover content</div>',
			},
		});

		await wrapper.find('mock-hover-card-root').trigger('click');

		expect(wrapper.emitted('update:open')).toContainEqual([true]);
	});
});
