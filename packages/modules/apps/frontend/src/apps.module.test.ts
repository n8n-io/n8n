import { VIEWS } from '@n8n/frontend-constants/views';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { PROJECT_APPS } from './apps.constants';
import { AppsModule } from './apps.module';

const stub = { render: () => null };

const projectAppsRoute = AppsModule.routes?.find((route) => route.name === PROJECT_APPS);
const projectAppsTab = AppsModule.projectTabs?.project?.[0];

function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/projects/:projectId',
				children: [
					{ ...projectAppsRoute, component: stub } as RouteRecordRaw,
					{ path: 'workflows', name: VIEWS.PROJECTS_WORKFLOWS, component: stub },
				],
			},
		],
	});
}

function provideScopes(scopes: Scope[]) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => false,
	});
}

describe('AppsModule', () => {
	afterEach(() => {
		capabilityRegistry.clear();
	});

	describe('project apps route', () => {
		it('opens the apps list when the user can list apps in the project', async () => {
			provideScopes(['app:list']);
			const router = createTestRouter();

			await router.push('/projects/project-1/apps');

			expect(router.currentRoute.value.name).toBe(PROJECT_APPS);
		});

		it('redirects to the project workflows when the user cannot list apps', async () => {
			provideScopes(['workflow:list']);
			const router = createTestRouter();

			await router.push('/projects/project-1/apps');

			expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
			expect(router.currentRoute.value.params).toEqual({ projectId: 'project-1' });
		});
	});

	describe('project apps tab', () => {
		it('is available when the user can list apps in the project', () => {
			provideScopes(['app:list']);

			expect(projectAppsTab?.available?.('project-1')).toBe(true);
		});

		it('is hidden when the user cannot list apps in the project', () => {
			provideScopes(['app:read']);

			expect(projectAppsTab?.available?.('project-1')).toBe(false);
		});
	});
});
