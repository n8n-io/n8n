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
});
