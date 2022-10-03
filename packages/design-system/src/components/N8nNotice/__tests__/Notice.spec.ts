import { render } from '@testing-library/vue';
import N8nNotice from "../Notice.vue";

describe('components', () => {
	describe('N8nNotice', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nNotice, {
				props: {
					id: 'notice',
				},
				slots: {
					default: 'This is a notice.',
				},
				stubs: ['n8n-text'],
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		describe('props', () => {
			describe('content', () => {
				it('should render correctly with content prop', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: 'This is a notice.',
						},
						stubs: ['n8n-text'],
					});
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should render HTML', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: '<strong>Hello world!</strong> This is a notice.',
						},
						stubs: ['n8n-text'],
					});

					expect(wrapper.container.querySelectorAll('strong')).toHaveLength(1);
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should sanitize rendered HTML', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: '<script>alert(1);</script> This is a notice.',
						},
						stubs: ['n8n-text'],
					});

					expect(wrapper.container.querySelector('script')).not.toBeTruthy();
					expect(wrapper.html()).toMatchSnapshot();
				});
			});
		});
	});
});
