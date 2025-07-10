import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsView from '@/views/SettingsView.vue';
import { VIEWS } from '@/constants';
import { routes as originalRoutes } from '@/router';

const component = { template: '<div />' };
const settingsRoute = originalRoutes.find((route) => route.name === VIEWS.SETTINGS);

const settingsRouteChildren =
	settingsRoute?.children?.map(({ name, path }) => ({
		name,
		path,
		component,
	})) ?? [];

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			redirect: '/home',
		},
		{
			path: '/home',
			name: 'Homepage',
			redirect: '/home/workflows',
			children: [
				{
					path: 'workflows',
					name: 'Workflows',
					component,
				},
				{
					path: 'credentials',
					name: 'Credentials',
					component,
				},
				{
					path: 'executions',
					name: 'Executions',
					component,
				},
			],
		},
		{
			path: '/settings',
			name: VIEWS.SETTINGS,
			component: SettingsView,
			props: true,
			redirect: { name: VIEWS.PERSONAL_SETTINGS },
			children: settingsRouteChildren,
		},
	],
});

const renderView = createComponentRenderer(SettingsView, {
	pinia: createTestingPinia(),
	global: {
		plugins: [router],
	},
});

const renderApp = createComponentRenderer(
	{
		template: '<router-view />',
	},
	{
		pinia: createTestingPinia(),
		global: {
			plugins: [router],
			stubs: {
				SettingsSidebar: {
					template: '<div><button data-test-id="back" @click="$emit(\'return\')"></button></div>',
				},
			},
		},
	},
);

describe('SettingsView', () => {
	it('should render the view without throwing', () => {
		expect(() => renderView()).not.toThrow();
	});

	test.each([
		['/', ['/settings', '/settings/users'], '/home/workflows'],
		['/home', ['/settings', '/settings/users'], '/home/workflows'],
		['/home/workflows', ['/settings', '/settings/personal'], '/home/workflows'],
		[
			'/home/credentials',
			['/settings', '/settings/personal', '/settings/api', '/settings/environments'],
			'/home/credentials',
		],
		['/home/executions', ['/settings'], '/home/executions'],
		['/settings', [], '/home/workflows'],
		[
			'/settings',
			['/settings/personal', '/settings/api', '/settings/environments'],
			'/home/workflows',
		],
		['/settings/personal', [], '/home/workflows'],
		['/settings/usage', ['/settings/api', '/settings/environments'], '/home/workflows'],
	])(
		'should start from "%s" and visit %s routes and go back to "%s"',
		async (startRoute, routes, expectedRoute) => {
			const { getByTestId } = renderApp();

			await router.push(startRoute);

			for (const route of routes) {
				await router.push(route);
			}

			await userEvent.click(getByTestId('back'));

			expect(router.currentRoute.value.path).toBe(expectedRoute);
		},
	);
});
