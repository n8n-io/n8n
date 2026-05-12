import { setActivePinia, createPinia } from 'pinia';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureThread } from '../instanceAi.api';
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

describe('useInstanceAiStore - threads', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
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
