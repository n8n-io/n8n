import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { InstanceAiModule } from '@/features/ai/instanceAi/module.descriptor';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { AgentsModule } from '../module.descriptor';
import { AGENT_N8N_CHAT_VIEW, AGENT_N8N_CHAT_LIBRARY_VIEW } from '../constants';

let flagEnabled = true;
let instanceAiAvailable = true;

vi.mock('../composables/useAgentsN8nChatFlag', () => ({
	isAgentsN8nChatFlagEnabledOnceEvaluated: async () => flagEnabled,
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => ref(instanceAiAvailable),
}));

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

// The n8n Chat route is a standalone top-level route (not nested under
// `/assistant`), registered alongside instanceAi's own `/assistant` tree —
// both must coexist in the real router, so build one from both modules here.
function createTestRouter() {
	const agentN8nChatRoutes = (AgentsModule.routes ?? []).filter(
		(route) => route.name === AGENT_N8N_CHAT_VIEW || route.name === AGENT_N8N_CHAT_LIBRARY_VIEW,
	);
	if (agentN8nChatRoutes.length !== 2) throw new Error('n8n Chat routes not found');
	const instanceAiRoutes = (InstanceAiModule.routes ?? []).filter((route) =>
		route.path.startsWith('/'),
	);

	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/home', name: VIEWS.HOMEPAGE, component: stub },
			...agentN8nChatRoutes.map(withStubbedComponents),
			...instanceAiRoutes.map(withStubbedComponents),
		],
	});
}

beforeEach(() => {
	setActivePinia(createTestingPinia());
	flagEnabled = true;
	instanceAiAvailable = true;
});

describe('AgentsModule n8n Chat route', () => {
	it('ranks above the instanceAi /assistant/:threadId route', () => {
		const router = createTestRouter();

		expect(router.resolve('/assistant/agents/agent-1').name).toBe(AGENT_N8N_CHAT_VIEW);
		expect(router.resolve('/assistant/agents/agent-1/thread-1').name).toBe(AGENT_N8N_CHAT_VIEW);
		expect(router.resolve('/assistant/some-thread').name).toBe(INSTANCE_AI_THREAD_VIEW);
	});

	it('resolves /assistant/agents to the library, not the instanceAi /assistant/:threadId child', () => {
		const router = createTestRouter();

		expect(router.resolve('/assistant/agents').name).toBe(AGENT_N8N_CHAT_LIBRARY_VIEW);
	});

	it.each(['/assistant/agents', '/assistant/agents/agent-1'])(
		'redirects home when n8n Assistant is unavailable (%s)',
		async (path) => {
			instanceAiAvailable = false;
			const router = createTestRouter();

			await router.push(path);

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		},
	);

	it.each(['/assistant/agents', '/assistant/agents/agent-1'])(
		'redirects to the Assistant view when the flag is off (%s)',
		async (path) => {
			flagEnabled = false;
			const router = createTestRouter();

			await router.push(path);

			expect(router.currentRoute.value.name).toBe(INSTANCE_AI_VIEW);
		},
	);

	it('requires the custom middleware (module availability check) on both routes', () => {
		const agentN8nChatRoutes = (AgentsModule.routes ?? []).filter(
			(route) => route.name === AGENT_N8N_CHAT_VIEW || route.name === AGENT_N8N_CHAT_LIBRARY_VIEW,
		);
		expect(agentN8nChatRoutes).toHaveLength(2);
		for (const route of agentN8nChatRoutes) {
			expect(route.meta?.middleware).toContain('custom');
		}
	});

	it('resolves agentId and agentThreadId as route params once available and flagged on', async () => {
		const router = createTestRouter();

		await router.push('/assistant/agents/agent-1/thread-1');

		expect(router.currentRoute.value.name).toBe(AGENT_N8N_CHAT_VIEW);
		expect(router.currentRoute.value.params).toEqual({
			agentId: 'agent-1',
			agentThreadId: 'thread-1',
		});
	});
});
