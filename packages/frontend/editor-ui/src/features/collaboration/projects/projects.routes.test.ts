import type { NavigationGuardWithThis, RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import type { Scope } from '@n8n/permissions';
import { VIEWS } from '@/app/constants';
import type { CustomMiddlewareOptions } from '@/app/types/router';
import { projectsRoutes } from './projects.routes';
import { ProjectTypes } from './projects.types';

const mocks = vi.hoisted(() => ({
	isSummaryEnabled: true,
	execute: vi.fn(),
	myProjects: [] as Array<{ id: string; type: string; scopes: Scope[] }>,
}));

vi.mock('./projects.store', () => ({
	useProjectsStore: () => ({ myProjects: mocks.myProjects }),
}));

vi.mock('@n8n/frontend-module-insights', () => ({
	useInsightsStore: () => ({
		isSummaryEnabled: mocks.isSummaryEnabled,
		weeklySummary: { execute: mocks.execute },
	}),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isChatFeatureEnabled: false }),
}));

vi.mock('@/app/utils/rbac/checks', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/utils/rbac/checks')>()),
	hasRole: () => false,
}));

function homeGuard() {
	const home = projectsRoutes.find((route) => route.name === VIEWS.HOMEPAGE);
	return home?.beforeEnter as NavigationGuardWithThis<undefined>;
}

const location = {} as RouteLocationNormalized;

describe('home route guard', () => {
	beforeEach(() => {
		mocks.execute.mockClear();
		mocks.isSummaryEnabled = true;
	});

	it('continues navigation without waiting for the insights chunk', () => {
		const next = vi.fn();
		homeGuard()?.call(undefined, location, location, next);

		expect(next).toHaveBeenCalledWith();
		expect(mocks.execute).not.toHaveBeenCalled();
	});

	it('refreshes the weekly summary once the chunk resolves', async () => {
		homeGuard()?.call(undefined, location, location, vi.fn());

		await vi.waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(1));
	});

	it('does not refresh the weekly summary when the summary is disabled', async () => {
		mocks.isSummaryEnabled = false;
		homeGuard()?.call(undefined, location, location, vi.fn());

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(mocks.execute).not.toHaveBeenCalled();
	});
});

function findRoute(routes: RouteRecordRaw[], name: string): RouteRecordRaw | undefined {
	for (const route of routes) {
		if (route.name === name) return route;
		const child = route.children && findRoute(route.children, name);
		if (child) return child;
	}
	return undefined;
}

function canEnterSettings(projectId: string) {
	const route = findRoute(projectsRoutes, VIEWS.PROJECT_SETTINGS);
	const custom = route?.meta?.middlewareOptions?.custom as CustomMiddlewareOptions;
	const to = { params: { projectId } } as unknown as RouteLocationNormalized;
	return custom({ to, from: location, next: vi.fn() });
}

describe('project settings route guard', () => {
	beforeEach(() => {
		mocks.myProjects = [];
	});

	it('allows a team project when the user can manage members', () => {
		mocks.myProjects = [
			{ id: 'team-1', type: ProjectTypes.Team, scopes: ['project:manageMembers'] },
		];

		expect(canEnterSettings('team-1')).toBe(true);
	});

	it('rejects a personal project even when the user has project scopes', () => {
		mocks.myProjects = [
			{
				id: 'personal-1',
				type: ProjectTypes.Personal,
				scopes: ['project:update', 'project:manageMembers'],
			},
		];

		expect(canEnterSettings('personal-1')).toBe(false);
	});

	it('rejects a project that is not in the list of the user projects', () => {
		expect(canEnterSettings('unknown')).toBe(false);
	});
});
