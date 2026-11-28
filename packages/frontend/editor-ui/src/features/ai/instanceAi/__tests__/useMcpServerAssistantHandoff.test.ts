import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import {
	createMemoryHistory,
	createRouter,
	isNavigationFailure,
	NavigationFailureType,
	type NavigationFailure,
} from 'vue-router';

import { useInstanceAiStore } from '../instanceAi.store';
import { useMcpServerAssistantHandoff } from '../composables/useMcpServerAssistantHandoff';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import {
	clearPendingThreadHandoff,
	provisionLaunchedSubjectThread,
	stashPendingComposerDraft,
} from '../composables/useInstanceAiHandoff';

const { available, currentRoute, push, showError } = vi.hoisted(() => ({
	available: { value: true },
	currentRoute: { value: {} as object },
	push: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ currentRoute, push }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => available,
}));
vi.mock('../composables/useInstanceAiHandoff', () => ({
	provisionLaunchedSubjectThread: vi.fn(),
	stashPendingComposerDraft: vi.fn(),
	clearPendingThreadHandoff: vi.fn(),
}));

const SERVER_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f71';
const server = { serverId: SERVER_ID, projectId: 'project-1', serverName: 'Marketing tools' };

describe('useMcpServerAssistantHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		available.value = true;
		currentRoute.value = { name: 'McpServerView', params: { serverId: SERVER_ID } };
		vi.mocked(provisionLaunchedSubjectThread).mockResolvedValue('thread-new');
	});

	it('does not open the Assistant when it is not available', async () => {
		available.value = false;

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(false);
		expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	});

	it('always opens a new Assistant thread bound to the server', async () => {
		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);

		expect(provisionLaunchedSubjectThread).toHaveBeenCalledWith(
			{ type: 'mcpServer', id: SERVER_ID, projectId: 'project-1', name: 'Marketing tools' },
			{ source: 'mcp_server_page', origin: 'internal', sourceContext: { serverId: SERVER_ID } },
		);
		expect(stashPendingComposerDraft).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-new' },
		});
	});

	it('stashes the prompt when opened from "Build with Assistant"', async () => {
		const prefill = {
			text: 'Build out the MCP server "Marketing tools".',
			prefillType: 'mcp_server_build_prompt' as const,
		};

		await expect(useMcpServerAssistantHandoff().openServer({ ...server, prefill })).resolves.toBe(
			true,
		);

		expect(stashPendingComposerDraft).toHaveBeenCalledWith('thread-new', prefill);
		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-new' },
		});
	});

	it('drops the hand-off if navigation left the server page while provisioning', async () => {
		vi.mocked(provisionLaunchedSubjectThread).mockImplementation(async () => {
			currentRoute.value = { name: 'OtherView' };
			return 'thread-new';
		});

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);

		expect(clearPendingThreadHandoff).toHaveBeenCalledWith('thread-new');
		expect(useInstanceAiStore().deleteThread).toHaveBeenCalledWith('thread-new', { silent: true });
		expect(push).not.toHaveBeenCalled();
	});

	it('ignores a second click while a hand-off is already in flight', async () => {
		let resolveThread!: (id: string) => void;
		vi.mocked(provisionLaunchedSubjectThread).mockImplementationOnce(
			async () =>
				await new Promise<string>((resolve) => {
					resolveThread = resolve;
				}),
		);
		const handoff = useMcpServerAssistantHandoff();

		const first = handoff.openServer(server);
		const second = handoff.openServer(server);

		await expect(second).resolves.toBe(false);
		expect(provisionLaunchedSubjectThread).toHaveBeenCalledTimes(1);

		resolveThread('thread-first');
		await expect(first).resolves.toBe(true);
		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-first' },
		});

		// Once settled, a subsequent click works again.
		await expect(handoff.openServer(server)).resolves.toBe(true);
		expect(provisionLaunchedSubjectThread).toHaveBeenCalledTimes(2);
	});

	it('deletes the provisioned thread when navigation fails', async () => {
		const error = new Error('Navigation failed');
		push.mockRejectedValueOnce(error);

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(false);

		expect(clearPendingThreadHandoff).toHaveBeenCalledWith('thread-new');
		expect(useInstanceAiStore().deleteThread).toHaveBeenCalledWith('thread-new', { silent: true });
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
	});

	it('silently deletes the provisioned thread when navigation is cancelled or aborted', async () => {
		let releaseGuard!: () => void;
		const guardGate = new Promise<void>((resolve) => {
			releaseGuard = resolve;
		});
		const stub = { render: () => null };
		const testRouter = createRouter({
			history: createMemoryHistory(),
			routes: [
				{ path: '/', component: stub },
				{ path: '/aborted', component: stub, beforeEnter: () => false },
				{ path: '/slow', component: stub, beforeEnter: async () => await guardGate },
				{ path: '/other', component: stub },
			],
		});
		await testRouter.push('/');
		await testRouter.isReady();

		const abortedFailure = (await testRouter.push('/aborted')) as NavigationFailure;
		expect(isNavigationFailure(abortedFailure, NavigationFailureType.aborted)).toBe(true);
		push.mockResolvedValueOnce(abortedFailure);

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);
		expect(clearPendingThreadHandoff).toHaveBeenCalledWith('thread-new');
		expect(useInstanceAiStore().deleteThread).toHaveBeenCalledWith('thread-new', { silent: true });
		expect(showError).not.toHaveBeenCalled();

		vi.clearAllMocks();
		vi.mocked(provisionLaunchedSubjectThread).mockResolvedValue('thread-cancelled');

		const slowPush = testRouter.push('/slow');
		const otherPush = testRouter.push('/other');
		releaseGuard();
		const cancelledFailure = (await slowPush) as NavigationFailure;
		await otherPush;
		expect(isNavigationFailure(cancelledFailure, NavigationFailureType.cancelled)).toBe(true);
		push.mockResolvedValueOnce(cancelledFailure);

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);
		expect(clearPendingThreadHandoff).toHaveBeenCalledWith('thread-cancelled');
		expect(useInstanceAiStore().deleteThread).toHaveBeenCalledWith('thread-cancelled', {
			silent: true,
		});
		expect(showError).not.toHaveBeenCalled();
	});

	it('shows an error toast when navigation resolves with a non-cancelled failure', async () => {
		const stub = { render: () => null };
		const testRouter = createRouter({
			history: createMemoryHistory(),
			routes: [{ path: '/', component: stub }],
		});
		await testRouter.push('/');
		await testRouter.isReady();
		const duplicatedFailure = (await testRouter.push('/')) as NavigationFailure;
		expect(isNavigationFailure(duplicatedFailure, NavigationFailureType.duplicated)).toBe(true);
		push.mockResolvedValueOnce(duplicatedFailure);

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(false);

		expect(clearPendingThreadHandoff).toHaveBeenCalledWith('thread-new');
		expect(useInstanceAiStore().deleteThread).toHaveBeenCalledWith('thread-new', { silent: true });
		expect(showError).toHaveBeenCalledWith(duplicatedFailure, expect.any(String));
	});

	it('shows an error toast when provisioning fails', async () => {
		const error = new Error('Network failed');
		vi.mocked(provisionLaunchedSubjectThread).mockRejectedValue(error);

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(false);

		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		expect(push).not.toHaveBeenCalled();
	});
});
