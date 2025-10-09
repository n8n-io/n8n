import { render } from '@testing-library/vue';

import { N8nText } from '@n8n/design-system/components';
import { n8nHtml } from '@n8n/design-system/directives';

import N8nNotice from './Notice.vue';

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
				global: {
					stubs: ['N8nText'],
				},
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
						global: {
							stubs: ['N8nText'],
						},
					});
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should render HTML', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: '<strong>Hello world!</strong> This is a notice.',
						},
						global: {
							directives: {
								n8nHtml,
							},
							components: {
								N8nText,
							},
						},
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
						global: {
							stubs: ['N8nText'],
						},
					});

					expect(wrapper.container.querySelector('script')).not.toBeTruthy();
					expect(wrapper.html()).toMatchSnapshot();
				});
			});
		});
	});
});
