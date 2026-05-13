import { setActivePinia, createPinia } from 'pinia';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureThread, postMessage } from '../instanceAi.api';
import { deleteThread as deleteThreadApi } from '../instanceAi.memory.api';
import { useInstanceAiStore } from '../instanceAi.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/api' },
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
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
	getInstanceAiCredits: vi.fn(),
	postCancel: vi.fn(),
	postCancelTask: vi.fn(),
	postConfirmation: vi.fn(),
	postFeedback: vi.fn(),
	postMessage: vi.fn(),
}));

vi.mock('../instanceAi.memory.api', () => ({
	fetchThreads: vi.fn().mockResolvedValue({ threads: [], total: 0, page: 1, hasMore: false }),
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
const mockPostMessage = vi.mocked(postMessage);

class FakeEventSource {
	url: string;
	withCredentials: boolean;
	readyState = 0;
	onopen: ((ev?: unknown) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onerror: ((ev?: unknown) => void) | null = null;
	constructor(url: string, init?: { withCredentials?: boolean }) {
		this.url = url;
		this.withCredentials = init?.withCredentials ?? false;
	}
	addEventListener() {}
	removeEventListener() {}
	close() {
		this.readyState = 2;
	}
}

beforeAll(() => {
	vi.stubGlobal('localStorage', localStorageStub);
	vi.stubGlobal('EventSource', FakeEventSource);
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

	it('disposes and removes all runtimes', () => {
		const store = useInstanceAiStore();
		const first = store.getOrCreateRuntime('thread-1');
		const second = store.getOrCreateRuntime('thread-2');
		const firstDisposeSpy = vi.spyOn(first, 'dispose');
		const secondDisposeSpy = vi.spyOn(second, 'dispose');

		store.disposeRuntimes();

		expect(firstDisposeSpy).toHaveBeenCalledOnce();
		expect(secondDisposeSpy).toHaveBeenCalledOnce();
		expect(store.getRuntime('thread-1')).toBeUndefined();
		expect(store.getRuntime('thread-2')).toBeUndefined();
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
			},
			created: true,
		});

		await store.syncThread('thread-1');

		expect(store.threads).toEqual([
			{
				id: 'thread-1',
				title: 'Thread title',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-02T00:00:00.000Z',
			},
		]);
	});

	it('deleteThread deletes persisted threads and disposes their runtime', async () => {
		const store = useInstanceAiStore();
		await store.syncThread('thread-1');
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

describe('useInstanceAiStore - workflow-chat runtime', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });
	});

	const snapshot = {
		workflowId: 'wf-1',
		name: 'Demo',
		nodes: [{ name: 'Trigger', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0] }],
		connections: {},
	};

	it('forwards the live snapshot via postMessage when sendMessage runs', async () => {
		const store = useInstanceAiStore();
		const getWorkflowContext = vi.fn().mockReturnValue(snapshot);
		const runtime = store.createWorkflowChatRuntime('thread-1', { getWorkflowContext });

		await runtime.sendMessage('what triggers this workflow?');

		// Hook is invoked exactly once per send — the provider must be read at
		// dispatch time, not at runtime-creation time, so subsequent sends see
		// the fresh editor state instead of a stale closure capture.
		expect(getWorkflowContext).toHaveBeenCalledOnce();
		expect(mockPostMessage).toHaveBeenCalledOnce();
		const args = mockPostMessage.mock.calls[0];
		// Last positional arg of postMessage is the workflowContext.
		expect(args[args.length - 1]).toEqual(snapshot);
	});

	it('reads the snapshot at every sendMessage so live edits are picked up', async () => {
		const store = useInstanceAiStore();
		let current = snapshot;
		const runtime = store.createWorkflowChatRuntime('thread-1', {
			getWorkflowContext: () => current,
		});

		await runtime.sendMessage('first');
		current = { ...snapshot, name: 'Renamed Workflow' };
		await runtime.sendMessage('second');

		expect(mockPostMessage).toHaveBeenCalledTimes(2);
		const firstArgs = mockPostMessage.mock.calls[0];
		const secondArgs = mockPostMessage.mock.calls[1];
		expect(firstArgs[firstArgs.length - 1]).toMatchObject({ name: 'Demo' });
		expect(secondArgs[secondArgs.length - 1]).toMatchObject({ name: 'Renamed Workflow' });
	});

	it('does not send a workflowContext for runtimes created without the workflow-chat hook', async () => {
		const store = useInstanceAiStore();
		const runtime = store.getOrCreateRuntime('thread-1');

		await runtime.sendMessage('hello');

		expect(mockPostMessage).toHaveBeenCalledOnce();
		const args = mockPostMessage.mock.calls[0];
		expect(args[args.length - 1]).toBeUndefined();
	});
});

describe('useInstanceAiStore - credits', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('isLowCredits', () => {
		it('returns false when credits are undefined', () => {
			const store = useInstanceAiStore();
			expect(store.isLowCredits).toBe(false);
		});

		it('returns false when credits are above 10%', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 89;
			expect(store.isLowCredits).toBe(false);
		});

		it('returns true when credits are exactly 10%', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 90;
			expect(store.isLowCredits).toBe(true);
		});

		it('returns true when credits are below 10%', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 95;
			expect(store.isLowCredits).toBe(true);
		});

		it('returns false when quota is unlimited', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = -1;
			store.creditsClaimed = 50;
			expect(store.isLowCredits).toBe(false);
		});

		it('returns true when quota is 0', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = 0;
			store.creditsClaimed = 0;
			expect(store.isLowCredits).toBe(true);
		});

		it('returns true when all credits are consumed', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 100;
			expect(store.isLowCredits).toBe(true);
		});
	});

	describe('creditsPercentageRemaining', () => {
		it('returns undefined when credits are not initialized', () => {
			const store = useInstanceAiStore();
			expect(store.creditsPercentageRemaining).toBeUndefined();
		});

		it('returns undefined when quota is unlimited', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = -1;
			store.creditsClaimed = 50;
			expect(store.creditsPercentageRemaining).toBeUndefined();
		});

		it('returns 0 when quota is 0', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = 0;
			store.creditsClaimed = 0;
			expect(store.creditsPercentageRemaining).toBe(0);
		});

		it('calculates percentage correctly', () => {
			const store = useInstanceAiStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 75;
			expect(store.creditsPercentageRemaining).toBe(25);
		});
	});
});
