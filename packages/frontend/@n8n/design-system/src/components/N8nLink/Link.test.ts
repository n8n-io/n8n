import { render } from '@testing-library/vue';

import N8nLink from './Link.vue';

describe('N8nLink', () => {
	it('should render internal router links', () => {
		const wrapper = render(N8nLink, {
			props: {
				to: '/test',
			},
			global: {
				stubs: ['RouterLink'],
			},
			slots: {
				default: 'Test Link',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render external links', () => {
		const wrapper = render(N8nLink, {
			props: {
				to: 'https://example.com/',
			},
			global: {
				stubs: ['RouterLink'],
			},
			slots: {
				default: 'External Link',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render title attribute on external links', () => {
		const wrapper = render(N8nLink, {
			props: {
				to: 'https://example.com/',
				title: 'Visit Example Website',
			},
			global: {
				stubs: ['RouterLink'],
			},
			slots: {
				default: 'External Link',
			},
		});
		const linkElement = wrapper.getByRole('link');
		expect(linkElement).toHaveAttribute('title', 'Visit Example Website');
	});

	it('should render title attribute on internal links with newWindow=true', () => {
		const wrapper = render(N8nLink, {
			props: {
				to: '/internal',
				newWindow: true,
				title: 'Open in New Window',
			},
			global: {
				stubs: ['RouterLink'],
			},
			slots: {
				default: 'Internal Link',
			},
		});
		const linkElement = wrapper.getByRole('link');
		expect(linkElement).toHaveAttribute('title', 'Open in New Window');
	});

	it('should render with different themes', () => {
		const wrapper = render(N8nLink, {
			props: {
				to: '/test',
				theme: 'danger',
			},
			global: {
				stubs: ['RouterLink'],
			},
			slots: {
				default: 'Danger Link',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render with underline', () => {
		const wrapper = render(N8nLink, {
			props: {
				to: '/test',
				underline: true,
			},
			global: {
				stubs: ['RouterLink'],
			},
			slots: {
				default: 'Underlined Link',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render with bold text', () => {
		const wrapper = render(N8nLink, {
			props: {
				to: '/test',
				bold: true,
			},
			global: {
				stubs: ['RouterLink'],
			},
			slots: {
				default: 'Bold Link',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
