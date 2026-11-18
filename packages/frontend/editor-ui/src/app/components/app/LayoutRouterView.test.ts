import { defineComponent } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { render } from '@testing-library/vue';
import LayoutRouterView from './LayoutRouterView.vue';

const page = (text: string) => defineComponent({ template: `<div>${text}</div>` });

function setup() {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/settings', component: page('Settings page'), meta: { layout: 'settings' } },
			{ path: '/users', component: page('Users page'), meta: { layout: 'settings' } },
			{ path: '/insights', component: page('Insights page') },
		],
	});
	return router;
}

describe('LayoutRouterView', () => {
	it('follows the routes of its own layout', async () => {
		const router = setup();
		await router.push('/settings');
		const { findByText } = render(LayoutRouterView, { global: { plugins: [router] } });
		expect(await findByText('Settings page')).toBeInTheDocument();

		await router.push('/users');
		expect(await findByText('Users page')).toBeInTheDocument();
	});

	it('keeps its last page while the app switches to another layout', async () => {
		const router = setup();
		await router.push('/settings');
		const { findByText, queryByText } = render(LayoutRouterView, {
			global: { plugins: [router] },
		});
		expect(await findByText('Settings page')).toBeInTheDocument();

		await router.push('/insights');
		expect(await findByText('Settings page')).toBeInTheDocument();
		expect(queryByText('Insights page')).not.toBeInTheDocument();
	});
});
