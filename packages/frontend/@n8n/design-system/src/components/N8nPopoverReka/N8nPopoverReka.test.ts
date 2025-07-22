import { render } from '@testing-library/vue';

import N8nPopoverReka from './N8nPopoverReka.vue';

const defaultStubs = {
	PopoverContent: {
		template: '<mock-popover-content><slot /></mock-popover-content>',
		props: ['open'],
	},
	PopoverPortal: { template: '<mock-popover-portal><slot /></mock-popover-portal>' },
	PopoverRoot: { template: '<mock-popover-root><slot /></mock-popover-root>' },
	PopoverTrigger: { template: '<mock-popover-trigger><slot /></mock-popover-trigger>' },
};

describe('N8nPopoverReka', () => {
	it('should render correctly', () => {
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
	});
});
