import { render } from '@testing-library/vue';

import N8nButton from './Button.vue';

const slots = {
	default: 'Button',
};
const stubs = ['n8n-spinner', 'n8n-icon'];

describe('components', () => {
	describe('N8nButton', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nButton, {
				slots,
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		describe('props', () => {
			describe('loading', () => {
				it('should render loading spinner', () => {
					const wrapper = render(N8nButton, {
						props: {
							loading: true,
						},
						slots,
						global: {
							stubs,
						},
					});
					expect(wrapper.html()).toMatchSnapshot();
				});
			});

			describe('icon', () => {
				it('should render icon button', () => {
					const wrapper = render(N8nButton, {
						props: {
							icon: 'circle-plus',
						},
						slots,
						global: {
							stubs,
						},
					});
					expect(wrapper.html()).toMatchSnapshot();
				});
			});

			describe('square', () => {
				it('should render square button', () => {
					const wrapper = render(N8nButton, {
						props: {
							square: true,
							label: '48',
						},
						global: {
							stubs,
						},
					});
					expect(wrapper.html()).toMatchSnapshot();
				});
			});
		});
	});
});
