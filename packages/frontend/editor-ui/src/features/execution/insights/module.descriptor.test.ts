import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { InsightsModule } from './module.descriptor';

const mocks = vi.hoisted(() => ({ isInsightsEnabled: true }));

vi.mock('./insights.store', () => ({
	useInsightsStore: () => ({
		get isInsightsEnabled() {
			return mocks.isInsightsEnabled;
		},
	}),
}));

const stub = { render: () => null };

// Swap the lazy dashboard for a stub so navigation doesn't pull the chart tree.
function withStubbedComponents(route: RouteRecordRaw): RouteRecordRaw {
	const clone = { ...route } as Record<string, unknown>;
	if (Array.isArray(clone.children)) {
		clone.children = (clone.children as RouteRecordRaw[]).map(withStubbedComponents);
	} else if (clone.component) {
		clone.component = stub;
	}
	return clone as unknown as RouteRecordRaw;
}

function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			...(InsightsModule.routes ?? []).map(withStubbedComponents),
			{ path: '/:pathMatch(.*)*', name: VIEWS.NOT_FOUND, component: stub },
		],
	});
}

describe('InsightsModule routes', () => {
	beforeEach(() => {
		mocks.isInsightsEnabled = true;
	});

	it('enters the dashboard with a default insight type when insights is enabled', async () => {
		const router = createTestRouter();
		await router.push('/insights');

		expect(router.currentRoute.value.name).toBe(VIEWS.INSIGHTS);
		expect(router.currentRoute.value.params).toEqual({ insightType: 'total' });
	});

	it('redirects to not found when insights is disabled', async () => {
		mocks.isInsightsEnabled = false;
		const router = createTestRouter();
		await router.push('/insights');

		expect(router.currentRoute.value.name).toBe(VIEWS.NOT_FOUND);
	});
});
