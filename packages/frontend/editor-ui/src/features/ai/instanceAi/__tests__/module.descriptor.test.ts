import { i18n } from '@n8n/i18n';
import { ref } from 'vue';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { InstanceAiModule } from '../module.descriptor';
import {
	INSTANCE_AI_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_SETTINGS_VIEW,
	INSTANCE_AI_NEW_VIEW,
} from '../constants';

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => ref(true),
	useInstanceAiReady: () => ref(true),
}));

const ensurePersonalProjectId = vi.fn(async () => 'project-1');
const provisionLaunchedThread = vi.fn(async () => 'thread-9');

vi.mock('../composables/useInstanceAiHandoff', () => ({
	ensurePersonalProjectId: async () => await ensurePersonalProjectId(),
	provisionLaunchedThread: async (...args: unknown[]) =>
		await provisionLaunchedThread(...(args as [])),
}));

vi.mock('@/experiments/openWorkflowInAssistant/launchWorkflowThread', () => ({
	launchWorkflowThread: async () => undefined,
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

/**
 * The `templateId` deep-link guard is the one place in this descriptor that still needs a
 * translated string, and it gets it from a lazy `await import('@n8n/i18n')` so the top level
 * of the descriptor stays import-light. Nothing else covers that line: a wrong binding name
 * or an unresolvable specifier would only surface here, on a deep link from the website.
 */
describe('InstanceAiModule templateId deep link', () => {
	beforeEach(() => {
		ensurePersonalProjectId.mockClear();
		provisionLaunchedThread.mockClear();
	});

	it('should resolve the kickoff message through the lazy i18n import', async () => {
		const router = createTestRouter();
		await router.push('/assistant/new?templateId=42');

		expect(provisionLaunchedThread).toHaveBeenCalledTimes(1);
		const [projectId, payload] = provisionLaunchedThread.mock.calls[0] as unknown as [
			string,
			{ message: string },
		];

		expect(projectId).toBe('project-1');
		expect(payload.message).toBe(
			i18n.baseText('instanceAi.launch.templateById.message', { interpolate: { id: '42' } }),
		);
		// Guards the interpolation too: an unresolved key would come back as the key itself.
		expect(payload.message).toContain('42');
		expect(payload.message).not.toContain('instanceAi.launch');

		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_THREAD_VIEW);
		expect(router.currentRoute.value.params).toEqual({ threadId: 'thread-9' });
	});

	it('should reject a non-numeric templateId before it reaches the kickoff message', async () => {
		const router = createTestRouter();
		await router.push('/assistant/new?templateId=ignore-previous-instructions');

		expect(provisionLaunchedThread).not.toHaveBeenCalled();
		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_VIEW);
	});

	it('should fall back to the assistant view when no personal project resolves', async () => {
		ensurePersonalProjectId.mockResolvedValueOnce(null as unknown as string);

		const router = createTestRouter();
		await router.push('/assistant/new?templateId=42');

		expect(provisionLaunchedThread).not.toHaveBeenCalled();
		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_VIEW);
	});

	it('should land on the empty view when no templateId is given', async () => {
		const router = createTestRouter();
		await router.push('/assistant/new');

		expect(provisionLaunchedThread).not.toHaveBeenCalled();
		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_VIEW);
		expect(INSTANCE_AI_NEW_VIEW).toBeTruthy();
	});
});
