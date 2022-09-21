import {render} from '@testing-library/vue';
import N8nInfoTip from "../InfoTip.vue";

const slots = {
	default: [
		'Need help doing something?',
		'<a href="/docs" target="_blank">Open docs</a>',
	],
};
const stubs = ['n8n-tooltip'];

describe('N8nInfoTip', () => {
	it('should render correctly as note', () => {
		const wrapper = render(N8nInfoTip, {
			slots,
			stubs,
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly as tooltip', () => {
		const wrapper = render(N8nInfoTip, {
			slots,
			stubs,
			props: {
				type: 'tooltip',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
