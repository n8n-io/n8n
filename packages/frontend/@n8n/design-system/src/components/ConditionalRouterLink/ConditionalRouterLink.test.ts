import { render } from '@testing-library/vue';
import { beforeAll, describe } from 'vitest';
import { createRouter, createWebHistory, RouterLink } from 'vue-router';

import CondtionalRouterLink from './CondtionalRouterLink.vue';

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

describe('CondtionalRouterLink', () => {
	beforeAll(async () => {
		await router.push('/');

		await router.isReady();
	});

	it("renders router-link when 'to' prop is passed", () => {
		const wrapper = render(CondtionalRouterLink, {
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
		const wrapper = render(CondtionalRouterLink, {
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
		const wrapper = render(CondtionalRouterLink, {
			slots,
			global: {
				plugins: [router],
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
	});

	/**
	 * The props are declared explicitly rather than spread from `RouterLink.props`
	 * (typed `any`, which collapsed the emitted declaration to `{}`), so nothing
	 * keeps the two lists in step any more. This pins them.
	 *
	 * `RouterLinkProps` — the *type* — also carries `viewTransition`, but the
	 * component does not declare it: it is an option of `useLink()`, and
	 * `RouterLinkImpl.setup` calls `useLink(props)` with only the declared props,
	 * so `viewTransition` is unreachable through `<RouterLink>` in vue-router
	 * 4.5.0. Declaring it here would add a prop RouterLink itself does not have.
	 * If a future vue-router promotes it to a real prop, this fails and we add it.
	 */
	it("declares exactly RouterLink's runtime props, with `to` optional", () => {
		type PropsOf = { props: Record<string, { type?: unknown; required?: boolean }> };
		const routerLinkProps = (RouterLink as unknown as PropsOf).props;
		const ourProps = (CondtionalRouterLink as unknown as PropsOf).props;

		expect(Object.keys(ourProps).sort()).toEqual(Object.keys(routerLinkProps).sort());
		expect(Object.keys(routerLinkProps)).not.toContain('viewTransition');

		// `to` accepts the same shapes RouterLink accepts — the name matching is not
		// enough on its own, since a collapsed prop would still carry the right key.
		expect(ourProps.to.type).toEqual([String, Object]);
		expect(routerLinkProps.to.type).toEqual([String, Object]);

		// The one deliberate divergence, and the only one: RouterLink requires `to`,
		// we do not, because without it this component renders an `<a>` or the slot.
		expect(routerLinkProps.to.required).toBe(true);
		expect(ourProps.to.required).toBeFalsy();
	});
});
