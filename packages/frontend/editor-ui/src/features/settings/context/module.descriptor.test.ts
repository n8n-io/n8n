import { createTestingPinia } from '@pinia/testing';
import {
	CONTEXT_PREFERENCES_CONTROL_VARIANT,
	CONTEXT_PREFERENCES_ENABLED_VARIANT,
	CONTEXT_PREFERENCES_FLAG,
} from '@n8n/api-types';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { ContextModule } from './module.descriptor';

const stub = { render: () => null };

// Avoid loading the views during route tests.
const moduleRoutes = (ContextModule.routes ?? []).map(
	(route) => ({ ...route, component: stub }) as RouteRecordRaw,
);

const createTestRouter = () =>
	createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/home', name: VIEWS.HOMEPAGE, component: stub },
			{ path: '/settings', component: stub, children: moduleRoutes },
		],
	});

/** The flag is multivariate, so only the enabled arm opens the pages. */
const setup = (value?: string | boolean, skillsHubEnabled = false) => {
	createTestingPinia({ stubActions: false });
	if (value !== undefined) usePostHog().overrides[CONTEXT_PREFERENCES_FLAG] = { value };
	useSettingsStore().moduleSettings.agents = { skillsHubEnabled } as never;
};

describe('ContextModule routes', () => {
	test.each([
		['/settings/context', VIEWS.SETTINGS_CONTEXT],
		['/settings/context/preferences', VIEWS.SETTINGS_CONTEXT_PREFERENCES],
	])('opens %s for enrolled users', async (path, name) => {
		setup(CONTEXT_PREFERENCES_ENABLED_VARIANT);
		const router = createTestRouter();

		await router.push(path);

		expect(router.currentRoute.value.name).toBe(name);
	});

	test.each([
		['unassigned', undefined],
		['control', CONTEXT_PREFERENCES_CONTROL_VARIANT],
		['a boolean', true],
	])('redirects %s users to the homepage', async (_, value) => {
		setup(value);
		const router = createTestRouter();

		for (const path of ['/settings/context', '/settings/context/preferences']) {
			await router.push(path);

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		}
	});

	describe('skills', () => {
		it('opens the skills page and the overview when the backend reports the skills hub on', async () => {
			setup(undefined, true);
			const router = createTestRouter();

			await router.push('/settings/context/skills');
			expect(router.currentRoute.value.name).toBe(VIEWS.SETTINGS_CONTEXT_SKILLS);

			await router.push('/settings/context');
			expect(router.currentRoute.value.name).toBe(VIEWS.SETTINGS_CONTEXT);
		});

		it('redirects to the homepage while the skills hub is off', async () => {
			setup(CONTEXT_PREFERENCES_ENABLED_VARIANT, false);
			const router = createTestRouter();

			await router.push('/settings/context/skills');

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		});

		it('keeps the preferences page closed when only the skills hub is on', async () => {
			setup(undefined, true);
			const router = createTestRouter();

			await router.push('/settings/context/preferences');

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		});
	});

	it('lists no custom middleware, so the initializer does not gate it on a backend module', () => {
		for (const route of ContextModule.routes ?? []) {
			expect(route.meta?.middleware).toEqual(['authenticated']);
			expect(route.meta?.telemetry?.pageCategory).toBe('settings');
		}
	});
});
