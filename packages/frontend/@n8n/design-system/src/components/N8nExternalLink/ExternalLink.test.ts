import { render } from '@testing-library/vue';

import N8nExternalLink from './ExternalLink.vue';

const stubs = ['n8n-icon'];

describe('components', () => {
	describe('N8nExternalLink', () => {
		it('should render correctly with href', () => {
			const wrapper = render(N8nExternalLink, {
				props: {
					href: 'https://n8n.io',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render correctly without href', () => {
			const wrapper = render(N8nExternalLink, {
				props: {},
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render correctly with slot content', () => {
			const wrapper = render(N8nExternalLink, {
				props: { href: 'https://n8n.io' },
				slots: { default: 'Visit n8n' },
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		describe('props', () => {
			describe('href', () => {
				it('should set href attribute', () => {
					const href = 'https://example.com';
					const wrapper = render(N8nExternalLink, {
						props: { href },
						global: { stubs },
					});
					const link = wrapper.getByRole('link');
					expect(link.getAttribute('href')).toBe(href);
				});
			});

			describe('newWindow', () => {
				it('should open in new window by default', () => {
					const wrapper = render(N8nExternalLink, {
						props: { href: 'https://n8n.io' },
						global: { stubs },
					});
					const link = wrapper.getByRole('link');
					expect(link.getAttribute('target')).toBe('_blank');
					expect(link.getAttribute('rel')).toBe('noopener noreferrer');
				});

				it('should not open in new window when newWindow is false', () => {
					const wrapper = render(N8nExternalLink, {
						props: {
							href: 'https://n8n.io',
							newWindow: false,
						},
						global: { stubs },
					});
					const link = wrapper.getByRole('link');
					expect(link.getAttribute('target')).toBeNull();
					expect(link.getAttribute('rel')).toBeNull();
				});
			});

			describe('size', () => {
				it('should pass size prop to icon', () => {
					const wrapper = render(N8nExternalLink, {
						props: {
							href: 'https://n8n.io',
							size: 'large',
						},
						global: { stubs },
					});
					const iconStub = wrapper.html();
					expect(iconStub).toContain('size="large"');
				});
			});
		});

		describe('element type', () => {
			it('should render as anchor when href is provided', () => {
				const wrapper = render(N8nExternalLink, {
					props: { href: 'https://n8n.io' },
					global: { stubs },
				});
				const element = wrapper.getByRole('link');
				expect(element.tagName).toBe('A');
			});

			it('should render as button when href is not provided', () => {
				const wrapper = render(N8nExternalLink, {
					props: {},
					global: { stubs },
				});
				const element = wrapper.getByRole('button');
				expect(element.tagName).toBe('BUTTON');
			});
		});

		describe('slot content', () => {
			it('should display slot content before icon', () => {
				const wrapper = render(N8nExternalLink, {
					props: { href: 'https://n8n.io' },
					slots: { default: 'Visit n8n' },
					global: { stubs },
				});
				const link = wrapper.getByRole('link');
				expect(link).toHaveTextContent('Visit n8n');
			});
		});

		describe('styling', () => {
			it('should have base text color initially', () => {
				const wrapper = render(N8nExternalLink, {
					props: { href: 'https://n8n.io' },
					global: { stubs },
				});
				const link = wrapper.getByRole('link');
				expect(link).toHaveClass('link');
			});
		});
	});
});
