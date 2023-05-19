import { render } from '@testing-library/vue';
import N8nButton from '../Button.vue';
import ElButton from '../overrides/ElButton.vue';

const slots = {
	default: 'Button',
};
const stubs = ['n8n-spinner', 'n8n-icon'];

describe('components', () => {
	describe('N8nButton', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nButton, {
				slots,
				stubs,
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
						stubs,
					});
					expect(wrapper.html()).toMatchSnapshot();
				});
			});

			describe('icon', () => {
				it('should render icon button', () => {
					const wrapper = render(N8nButton, {
						props: {
							icon: 'plus-circle',
						},
						slots,
						stubs,
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
						stubs,
					});
					expect(wrapper.html()).toMatchSnapshot();
				});
			});
		});

		describe('overrides', () => {
			it('should use default (`primary`) type when no type is given', () => {
				const wrapper = render(ElButton, {
					props: {
						icon: 'plus-circle',
					},
					slots,
					stubs,
				});

				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should use given (`secondary`) type', () => {
				const wrapper = render(ElButton, {
					props: {
						icon: 'plus-circle',
						type: 'secondary',
					},
					slots,
					stubs,
				});

				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should render as `secondary` when `text` is given as type', () => {
				const wrapper = render(ElButton, {
					props: {
						icon: 'plus-circle',
						type: 'text',
					},
					slots,
					stubs,
				});

				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should render as `tertiary` when `info` is given as type', () => {
				const wrapper = render(ElButton, {
					props: {
						icon: 'plus-circle',
						type: 'info',
					},
					slots,
					stubs,
				});

				expect(wrapper.html()).toMatchSnapshot();
			});
		});
	});
});
