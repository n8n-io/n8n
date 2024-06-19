import { render } from '@testing-library/vue';
import { beforeAll, describe } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import ConditionalRouterLink from '../ConditionalRouterLink.vue';

const slots = {
	default: 'Button',
};

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'home',
			redirect: '/home',
		},
	],
});

describe('ConditionalRouterLink', () => {
	beforeAll(async () => {
		await router.push('/');

		await router.isReady();
	});

	it("renders router-link when 'to' prop is passed", () => {
		const wrapper = render(ConditionalRouterLink, {
			props: {
				to: { name: 'home' },
			},
			slots,
			global: {
				plugins: [router],
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
	});

	it("renders <a> when 'href' attr is passed", () => {
		const wrapper = render(ConditionalRouterLink, {
			attrs: {
				href: 'https://n8n.io',
				target: '_blank',
			},
			slots,
			global: {
				plugins: [router],
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders only the slot when neither to nor href is given', () => {
		const wrapper = render(ConditionalRouterLink, {
			slots,
			global: {
				plugins: [router],
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
	});
});
