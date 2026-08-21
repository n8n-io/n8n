import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router';
import { DATA_TABLE_VIEW } from './constants';
import { DataTableModule } from './module.descriptor';

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

function dataTablesGuard() {
	const route = DataTableModule.routes?.find((entry) => entry.name === DATA_TABLE_VIEW);
	return route?.beforeEnter as NavigationGuardWithThis<undefined>;
}

const location = {} as RouteLocationNormalized;

describe('data tables route guard', () => {
	beforeEach(() => {
		mocks.execute.mockClear();
		mocks.isSummaryEnabled = true;
	});

	it('continues navigation without waiting for the insights chunk', () => {
		const next = vi.fn();
		dataTablesGuard()?.call(undefined, location, location, next);

		expect(next).toHaveBeenCalledWith();
		expect(mocks.execute).not.toHaveBeenCalled();
	});

	it('refreshes the weekly summary once the chunk resolves', async () => {
		dataTablesGuard()?.call(undefined, location, location, vi.fn());

		await vi.waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(1));
	});

	it('does not refresh the weekly summary when the summary is disabled', async () => {
		mocks.isSummaryEnabled = false;
		dataTablesGuard()?.call(undefined, location, location, vi.fn());

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(mocks.execute).not.toHaveBeenCalled();
	});
});
