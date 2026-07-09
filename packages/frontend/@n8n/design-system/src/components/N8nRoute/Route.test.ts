import { render } from '@testing-library/vue';

import N8nRoute from './Route.vue';

describe('N8nRoute', () => {
	it('should render internal router links', () => {
		const wrapper = render(N8nRoute, {
			props: {
				to: '/test',
			},
			global: {
				stubs: ['RouterLink'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render internal links with newWindow=true', () => {
		const wrapper = render(N8nRoute, {
			props: {
				to: '/test',
				newWindow: true,
			},
			global: {
				stubs: ['RouterLink'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render external links', () => {
		const wrapper = render(N8nRoute, {
			props: {
				to: 'https://example.com/',
			},
			global: {
				stubs: ['RouterLink'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render title attribute on external links', () => {
		const wrapper = render(N8nRoute, {
			props: {
				to: 'https://example.com/',
				title: 'Visit Example',
			},
			global: {
				stubs: ['RouterLink'],
			},
		});
		const linkElement = wrapper.getByRole('link');
		expect(linkElement).toHaveAttribute('title', 'Visit Example');
	});

	it('should render title attribute on internal links with newWindow=true', () => {
		const wrapper = render(N8nRoute, {
			props: {
				to: '/test',
				newWindow: true,
				title: 'Internal Link in New Window',
			},
			global: {
				stubs: ['RouterLink'],
			},
		});
		const linkElement = wrapper.getByRole('link');
		expect(linkElement).toHaveAttribute('title', 'Internal Link in New Window');
	});
});
