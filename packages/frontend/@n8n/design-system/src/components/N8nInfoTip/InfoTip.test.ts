import { render } from '@testing-library/vue';

import N8nInfoTip from './InfoTip.vue';

const slots = {
	default: ['Need help doing something?', '<a href="/docs" target="_blank">Open docs</a>'],
};
const stubs = ['N8nTooltip', 'N8nIcon'];

describe('N8nInfoTip', () => {
	it('should render correctly as note', () => {
		const wrapper = render(N8nInfoTip, {
			slots,
			global: {
				stubs,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly as tooltip', () => {
		const wrapper = render(N8nInfoTip, {
			slots,
			props: {
				type: 'tooltip',
			},
			global: {
				stubs,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a specific size', () => {
		const wrapper = render(N8nInfoTip, {
			slots,
			props: {
				size: 'large',
			},
			global: {
				stubs,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
