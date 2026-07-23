import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { InstanceAiModule } from '../module.descriptor';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_SETTINGS_VIEW } from '../constants';

const stub = { render: () => null };

// Swap real lazy components for a stub so navigation doesn't pull the view tree.
function withStubbedComponents(route: RouteRecordRaw): RouteRecordRaw {
	const clone = { ...route } as Record<string, unknown>;
	if (clone.component) clone.component = stub;
	if (Array.isArray(clone.children)) {
		clone.children = (clone.children as RouteRecordRaw[]).map(withStubbedComponents);
	}
	return clone as unknown as RouteRecordRaw;
}

const moduleRoutes = (InstanceAiModule.routes ?? []).map(withStubbedComponents);

// Absolute-path routes register at the top level; relative ones nest under `/settings`.
function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			...moduleRoutes.filter((route) => route.path.startsWith('/')),
			{
				path: '/settings',
				component: stub,
				children: moduleRoutes.filter((route) => !route.path.startsWith('/')),
			},
		],
	});
}

describe('InstanceAiModule legacy route redirects', () => {
	it('redirects /instance-ai to the /assistant view', async () => {
		const router = createTestRouter();
		await router.push('/instance-ai');

		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_VIEW);
		expect(router.currentRoute.value.path).toBe('/assistant');
	});

	it('redirects /instance-ai/:threadId preserving thread id, query and hash', async () => {
		const router = createTestRouter();
		await router.push('/instance-ai/thread-1?foo=bar#section');

		const current = router.currentRoute.value;
		expect(current.name).toBe(INSTANCE_AI_THREAD_VIEW);
		expect(current.params).toEqual({ threadId: 'thread-1' });
		expect(current.query).toEqual({ foo: 'bar' });
		expect(current.hash).toBe('#section');
		expect(current.path).toBe('/assistant/thread-1');
	});

	it('redirects /settings/instance-ai to /settings/assistant', async () => {
		const router = createTestRouter();
		await router.push('/settings/instance-ai');

		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_SETTINGS_VIEW);
		expect(router.currentRoute.value.path).toBe('/settings/assistant');
	});
});
