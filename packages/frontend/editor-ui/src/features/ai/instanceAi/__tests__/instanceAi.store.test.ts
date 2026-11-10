import { setActivePinia, createPinia } from 'pinia';
import { effectScope, nextTick } from 'vue';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureThread } from '../instanceAi.api';
import {
	deleteThread as deleteThreadApi,
	fetchThreadHistory,
	fetchThread,
	renameThread as renameThreadApi,
} from '../instanceAi.memory.api';
import { useInstanceAiStore } from '../instanceAi.store';
import type { InstanceAiThreadHistoryResponse, InstanceAiThreadSummary } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/api' },
		instanceId: 'instance-1',
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(() => ({ addEventListener: vi.fn(() => () => {}) })),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: vi.fn(),
	}),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({
		track: vi.fn(),
	}),
}));

vi.mock('../instanceAi.api', () => ({
	ensureThread: vi.fn().mockResolvedValue({
		thread: {
			id: 'thread-1',
			title: '',
			resourceId: 'user-1',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		},
		created: true,
	}),
	postCancel: vi.fn(),
	postCancelTask: vi.fn(),
	postConfirmation: vi.fn(),
	postFeedback: vi.fn(),
	postMessage: vi.fn(),
}));

vi.mock('../instanceAi.memory.api', () => ({
	fetchThreads: vi.fn().mockResolvedValue({ threads: [], total: 0, page: 1, hasMore: false }),
	fetchThread: vi.fn(),
	fetchThreadHistory: vi.fn().mockResolvedValue({ threads: [], nextCursor: null, hasMore: false }),
	fetchThreadMessages: vi
		.fn()
		.mockResolvedValue({ threadId: 'thread-1', messages: [], nextEventId: 0 }),
	fetchThreadStatus: vi
		.fn()
		.mockResolvedValue({ hasActiveRun: false, isSuspended: false, backgroundTasks: [] }),
	deleteThread: vi.fn().mockResolvedValue(undefined),
	renameThread: vi.fn().mockResolvedValue({ thread: {} }),
	updateThreadMetadata: vi.fn().mockResolvedValue({ thread: {} }),
}));

const localStorageStub = {
	getItem: vi.fn(() => 'false'),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

const originalLocalStorage = globalThis.localStorage;
const mockEnsureThread = vi.mocked(ensureThread);
const mockDeleteThread = vi.mocked(deleteThreadApi);

beforeAll(() => {
	vi.stubGlobal('localStorage', localStorageStub);
});

afterAll(() => {
	if (typeof originalLocalStorage === 'undefined') {
		Reflect.deleteProperty(globalThis, 'localStorage');
	} else {
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			value: originalLocalStorage,
		});
	}
});

describe('useInstanceAiStore - runtime registry', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	function historyThread(id: string) {
		return { id, title: id, resourceId: 'user', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
	}

	it('pages the chat history once per row and drops a response that predates a reset', async () => {
		const store = useInstanceAiStore();
		vi.mocked(fetchThreadHistory)
			.mockResolvedValueOnce({
				threads: [historyThread('a'), historyThread('b')],
				nextCursor: 'cursor-1',
				hasMore: true,
			})
			.mockResolvedValueOnce({
				threads: [historyThread('b'), historyThread('c')],
				nextCursor: null,
				hasMore: false,
			});
		await store.loadThreadHistoryPage();
		await store.loadThreadHistoryPage();
		expect(fetchThreadHistory).toHaveBeenLastCalledWith(expect.anything(), {
			limit: 30,
			search: undefined,
			cursor: 'cursor-1',
		});
		expect(store.threadHistory.threads.map((thread) => thread.id)).toEqual(['a', 'b', 'c']);
		expect(store.threadHistory.hasMore).toBe(false);

		const late = Promise.withResolvers<InstanceAiThreadHistoryResponse>();
		vi.mocked(fetchThreadHistory).mockReturnValueOnce(late.promise);
		store.resetThreadHistory('old');
		const pending = store.loadThreadHistoryPage();
		store.resetThreadHistory('new');
		late.resolve({ threads: [historyThread('late')], nextCursor: null, hasMore: false });
		await pending;
		expect(store.threadHistory).toMatchObject({ search: 'new', threads: [], loading: false });
	});

	it('renames and deletes threads on the history page and rolls back a failed rename', async () => {
		const store = useInstanceAiStore();
		vi.mocked(fetchThreadHistory).mockResolvedValueOnce({
			threads: [historyThread('a'), historyThread('b')],
			nextCursor: null,
			hasMore: false,
		});
		await store.loadThreadHistoryPage();

		await store.renameThread('a', 'Renamed');
		expect(renameThreadApi).toHaveBeenCalledWith(expect.anything(), 'a', 'Renamed');
		expect(store.threadHistory.threads[0].title).toBe('Renamed');

		vi.mocked(renameThreadApi).mockRejectedValueOnce(new Error('offline'));
		await expect(store.renameThread('a', 'Rejected')).rejects.toThrow('offline');
		expect(store.threadHistory.threads[0].title).toBe('Renamed');

		await store.deleteThread('b');
		expect(mockDeleteThread).toHaveBeenCalledWith(expect.anything(), 'b');
		expect(store.threadHistory.threads.map((thread) => thread.id)).toEqual(['a']);
	});

	it('loadThread adds a thread the sidebar list does not hold, once', async () => {
		const store = useInstanceAiStore();
		vi.mocked(fetchThread).mockResolvedValue({ thread: historyThread('old') });
		await store.loadThread('old');
		await store.loadThread('old');
		expect(store.threads.map((thread) => thread.id)).toEqual(['old']);
	});

	it('returns the same runtime for the same thread id', () => {
		const store = useInstanceAiStore();

		const first = store.getOrCreateRuntime('thread-1');
		const second = store.getOrCreateRuntime('thread-1');
		const other = store.getOrCreateRuntime('thread-2');

		expect(second).toBe(first);
		expect(other).not.toBe(first);
	});

	it('disposes and removes a single runtime', () => {
		const store = useInstanceAiStore();
		const runtime = store.getOrCreateRuntime('thread-1');
		const disposeSpy = vi.spyOn(runtime, 'dispose');

		store.disposeRuntime('thread-1');

		expect(disposeSpy).toHaveBeenCalledOnce();
		expect(store.getRuntime('thread-1')).toBeUndefined();
	});

	it('keeps the runtime watchers alive after the creating scope stops', async () => {
		const store = useInstanceAiStore();
		// The thread view creates the runtime in setup. A Suspense duplicate of the
		// view is discarded before it mounts, which stops that component scope.
		const creatorScope = effectScope();
		const runtime = creatorScope.run(() => store.getOrCreateRuntime('thread-1'));
		creatorScope.stop();

		runtime?.messages.push({
			id: 'm1',
			role: 'user',
			createdAt: '2026-01-01T00:00:00.000Z',
			content: '',
			reasoning: '',
			isStreaming: false,
			attachments: [{ type: 'workflow', id: 'wf-1', name: 'My workflow' }],
		});
		await nextTick();

		expect(runtime?.producedArtifacts.get('wf-1')?.name).toBe('My workflow');
	});

	it('syncs a thread into the sidebar list', async () => {
		const store = useInstanceAiStore();
		mockEnsureThread.mockResolvedValueOnce({
			thread: {
				id: 'thread-1',
				title: 'Thread title',
				resourceId: 'user-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-02T00:00:00.000Z',
				metadata: { source: 'assistant_page', origin: 'internal' },
			},
			created: true,
		});

		await store.syncThread('thread-1', 'project-1', {
			source: 'assistant_page',
			origin: 'internal',
		});

		expect(store.threads).toEqual([
			{
				id: 'thread-1',
				title: 'Thread title',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-02T00:00:00.000Z',
				metadata: { source: 'assistant_page', origin: 'internal' },
			},
		]);
	});

	it('deleteThread deletes persisted threads and disposes their runtime', async () => {
		const store = useInstanceAiStore();
		await store.syncThread('thread-1', 'project-1', {
			source: 'assistant_page',
			origin: 'internal',
		});
		const runtime = store.getOrCreateRuntime('thread-1');
		const disposeSpy = vi.spyOn(runtime, 'dispose');

		await expect(store.deleteThread('thread-1')).resolves.toBe(true);

		expect(mockDeleteThread).toHaveBeenCalledWith(
			expect.objectContaining({ baseUrl: 'http://localhost:5678/api' }),
			'thread-1',
		);
		expect(disposeSpy).toHaveBeenCalledOnce();
		expect(store.getRuntime('thread-1')).toBeUndefined();
		expect(store.threads).toEqual([]);
	});
});

describe('useInstanceAiStore - credits', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	const makeThread = (id: string, metadata: Record<string, unknown>): InstanceAiThreadSummary =>
		({ id, title: 'T', metadata }) as unknown as InstanceAiThreadSummary;

	describe('threadCreditsUsed', () => {
		it('returns the creditsUsed stored in the thread metadata', () => {
			const store = useInstanceAiStore();
			store.threads.push(makeThread('t1', { creditsUsed: 2.5 }));

			expect(store.threadCreditsUsed('t1')).toBe(2.5);
		});

		it('returns undefined when the thread has no creditsUsed', () => {
			const store = useInstanceAiStore();
			store.threads.push(makeThread('t1', {}));

			expect(store.threadCreditsUsed('t1')).toBeUndefined();
			expect(store.threadCreditsUsed('missing')).toBeUndefined();
		});
	});

	describe('setThreadCreditsUsed', () => {
		it('writes creditsUsed onto the matching thread', () => {
			const store = useInstanceAiStore();
			store.threads.push(makeThread('t1', { other: true }));

			store.setThreadCreditsUsed('t1', 2.5);
			store.setThreadCreditsUsed('missing', 1);

			expect(store.threadCreditsUsed('t1')).toBe(2.5);
			expect(store.getThreadMetadata('t1')).toEqual({ other: true, creditsUsed: 2.5 });
			expect(store.threadCreditsUsed('missing')).toBeUndefined();
		});
	});
});

describe('useInstanceAiStore - onboarding exit', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('leaveOnboarding keeps the exit in the thread metadata and tracks the end once', () => {
		const store = useInstanceAiStore();
		store.threads = [
			{
				id: 'thread-1',
				title: 'Onboarding',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
				metadata: { source: 'onboarding', origin: 'external' },
			},
		];

		store.leaveOnboarding('thread-1', 'left', 'stop');
		// A second exit (the failed run after the leave call) is a no-op.
		store.leaveOnboarding('thread-1', 'run_failed');

		expect(store.threads[0].metadata).toMatchObject({ onboardingLeft: true });
		expect(store.isOnboardingChromeHidden('thread-1')).toBe(false);
		const { track } = useTelemetry();
		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_ONBOARDING_ENDED, {
			thread_id: 'thread-1',
			instance_id: 'instance-1',
			outcome: 'left',
			leave_reason: 'stop',
		});
	});
});
