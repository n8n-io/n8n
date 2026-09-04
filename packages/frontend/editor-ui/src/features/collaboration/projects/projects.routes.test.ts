import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { projectsRoutes } from './projects.routes';

const mocks = vi.hoisted(() => ({
	isSummaryEnabled: true,
	execute: vi.fn(),
}));

vi.mock('@/features/execution/insights', () => ({
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
