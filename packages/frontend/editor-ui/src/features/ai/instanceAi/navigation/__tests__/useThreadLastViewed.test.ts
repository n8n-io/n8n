import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { useInstanceAiStore } from '../../instanceAi.store';
import {
	MAX_LAST_VIEWED_ENTRIES,
	resetThreadLastViewedState,
	useMarkThreadViewed,
	useThreadLastViewed,
} from '../useThreadLastViewed';

const NOW = '2026-03-01T10:00:00.000Z';
const keyFor = (userId: string) => `n8n:instance-ai:last-viewed:${userId}`;
const secondsAfterNow = (seconds: number) =>
	new Date(Date.parse(NOW) + seconds * 1000).toISOString();

const storage = new Map<string, string>();

function createStorageStub() {
	return {
		getItem: vi.fn((key: string): string | null => storage.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
		}),
	};
}

let storageStub: ReturnType<typeof createStorageStub>;

/** A fresh page: Map-backed storage, a fixed clock and a signed-in user. */
function setUpPage() {
	createTestingPinia();
	storage.clear();
	storageStub = createStorageStub();
	vi.stubGlobal('localStorage', storageStub);
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetThreadLastViewedState();
	signIn('user-1');
}

function tearDownPage() {
	vi.useRealTimers();
	vi.unstubAllGlobals();
}

function signIn(id: string | null) {
	useUsersStore().currentUserId = id;
}

function storedViews(userId: string): unknown {
	const raw = storage.get(keyFor(userId));
	return raw === undefined ? undefined : JSON.parse(raw);
}

/** Starts a new page: the shared state is empty and the next read loads the stored copy. */
function reloadPage() {
	resetThreadLastViewedState();
}

describe('useThreadLastViewed', () => {
	beforeEach(setUpPage);
	afterEach(tearDownPage);

	it('stores the view time for each user and reads it back after a reload', () => {
		const { markViewed, lastViewedAt } = useThreadLastViewed();

		markViewed('thread-a');

		expect(lastViewedAt('thread-a')).toBe(NOW);
		expect(storedViews('user-1')).toEqual({ 'thread-a': NOW });

		reloadPage();
		expect(useThreadLastViewed().lastViewedAt('thread-a')).toBe(NOW);
		expect(lastViewedAt('thread-b')).toBeUndefined();
	});

	it('keeps the views of each user apart', () => {
		const { markViewed, lastViewedAt } = useThreadLastViewed();
		markViewed('thread-a');

		signIn('user-2');

		expect(lastViewedAt('thread-a')).toBeUndefined();
		markViewed('thread-b');
		expect(storedViews('user-2')).toEqual({ 'thread-b': NOW });
		expect(storedViews('user-1')).toEqual({ 'thread-a': NOW });
	});

	it('keeps the other views when it marks a chat again', () => {
		storage.set(keyFor('user-1'), JSON.stringify({ old: '2026-02-01T00:00:00.000Z' }));
		const { markViewed } = useThreadLastViewed();

		markViewed('thread-a');
		vi.setSystemTime(secondsAfterNow(30));
		markViewed('thread-a');

		expect(storedViews('user-1')).toEqual({
			'thread-a': secondsAfterNow(30),
			old: '2026-02-01T00:00:00.000Z',
		});
	});

	it('reads and stores nothing without a signed-in user', () => {
		signIn(null);
		const { markViewed, lastViewedAt } = useThreadLastViewed();

		markViewed('thread-a');

		expect(lastViewedAt('thread-a')).toBeUndefined();
		expect(storageStub.getItem).not.toHaveBeenCalled();
		expect(storageStub.setItem).not.toHaveBeenCalled();
	});

	describe('the time it stores', () => {
		it('is the activity time when the server clock is ahead of this one', () => {
			const { markViewed, lastViewedAt } = useThreadLastViewed();

			markViewed('thread-a', secondsAfterNow(90));

			expect(lastViewedAt('thread-a')).toBe(secondsAfterNow(90));
		});

		it.each([
			['an older activity time', secondsAfterNow(-90)],
			['no activity time', undefined],
			['an invalid activity time', 'not a date'],
		])('is now for %s', (_, seenActivityAt) => {
			const { markViewed, lastViewedAt } = useThreadLastViewed();

			markViewed('thread-a', seenActivityAt);

			expect(lastViewedAt('thread-a')).toBe(NOW);
		});
	});

	describe('stored data it cannot use', () => {
		it('drops entries without a valid time and keeps the others', () => {
			storage.set(
				keyFor('user-1'),
				JSON.stringify({ good: NOW, text: 'yesterday', empty: '', count: 5, nothing: null }),
			);

			const { lastViewedAt } = useThreadLastViewed();

			expect(lastViewedAt('good')).toBe(NOW);
			for (const id of ['text', 'empty', 'count', 'nothing']) {
				expect(lastViewedAt(id)).toBeUndefined();
			}
		});

		it.each(['{broken', '[1, 2]', 'null', '"text"', '42'])('ignores the stored value %s', (raw) => {
			storage.set(keyFor('user-1'), raw);
			const { markViewed, lastViewedAt } = useThreadLastViewed();

			expect(lastViewedAt('thread-a')).toBeUndefined();
			markViewed('thread-a');
			expect(storedViews('user-1')).toEqual({ 'thread-a': NOW });
		});

		it('does not read a key that the object inherits', () => {
			const { lastViewedAt } = useThreadLastViewed();

			expect(lastViewedAt('constructor')).toBeUndefined();
			expect(lastViewedAt('__proto__')).toBeUndefined();
		});
	});

	describe('when storage fails', () => {
		it('returns no view when reading throws, and keeps a new view for this page', () => {
			storageStub.getItem.mockImplementation(() => {
				throw new Error('Storage is blocked');
			});
			storageStub.setItem.mockImplementation(() => {
				throw new Error('Storage is full');
			});
			const { markViewed, lastViewedAt } = useThreadLastViewed();

			expect(lastViewedAt('thread-a')).toBeUndefined();
			expect(() => markViewed('thread-a')).not.toThrow();
			expect(lastViewedAt('thread-a')).toBe(NOW);
		});

		it('returns no view when the browser refuses access to storage', () => {
			const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
			Object.defineProperty(globalThis, 'localStorage', {
				configurable: true,
				get: () => {
					throw new DOMException('Access is denied', 'SecurityError');
				},
			});
			try {
				const { markViewed, lastViewedAt } = useThreadLastViewed();

				expect(lastViewedAt('thread-a')).toBeUndefined();
				expect(() => markViewed('thread-a')).not.toThrow();
				expect(lastViewedAt('thread-a')).toBe(NOW);
			} finally {
				if (original) Object.defineProperty(globalThis, 'localStorage', original);
			}
		});
	});

	describe(`the limit of ${MAX_LAST_VIEWED_ENTRIES} entries`, () => {
		// `thread-0` is the newest view. The map lists the oldest view first, so that only a
		// sort by time (not the order of the stored keys) finds the views to keep.
		const olderViews = (count: number) =>
			Object.fromEntries(
				Array.from({ length: count }, (_, index) => [
					`thread-${index}`,
					secondsAfterNow(-index - 1),
				]).reverse(),
			);

		it('drops the oldest view when a new chat is marked', () => {
			storage.set(keyFor('user-1'), JSON.stringify(olderViews(MAX_LAST_VIEWED_ENTRIES)));
			const { markViewed } = useThreadLastViewed();

			markViewed('thread-new');

			const stored = storedViews('user-1') as Record<string, string>;
			expect(Object.keys(stored)).toHaveLength(MAX_LAST_VIEWED_ENTRIES);
			expect(stored['thread-new']).toBe(NOW);
			expect(stored).not.toHaveProperty(`thread-${MAX_LAST_VIEWED_ENTRIES - 1}`);
			expect(stored).toHaveProperty(`thread-${MAX_LAST_VIEWED_ENTRIES - 2}`);
		});

		it('keeps the limit when it marks a chat that is already stored', () => {
			storage.set(keyFor('user-1'), JSON.stringify(olderViews(MAX_LAST_VIEWED_ENTRIES)));
			const { markViewed } = useThreadLastViewed();

			markViewed('thread-150');

			const stored = storedViews('user-1') as Record<string, string>;
			expect(Object.keys(stored)).toHaveLength(MAX_LAST_VIEWED_ENTRIES);
			expect(stored['thread-150']).toBe(NOW);
			expect(stored).toHaveProperty(`thread-${MAX_LAST_VIEWED_ENTRIES - 1}`);
		});

		it('keeps only the newest views from a larger stored map', () => {
			storage.set(keyFor('user-1'), JSON.stringify(olderViews(MAX_LAST_VIEWED_ENTRIES + 50)));
			const { lastViewedAt } = useThreadLastViewed();

			expect(lastViewedAt('thread-0')).toBe(secondsAfterNow(-1));
			expect(lastViewedAt(`thread-${MAX_LAST_VIEWED_ENTRIES - 1}`)).toBeDefined();
			expect(lastViewedAt(`thread-${MAX_LAST_VIEWED_ENTRIES}`)).toBeUndefined();
		});
	});

	it('updates every reader at once when one of them marks a chat', () => {
		const sidebar = useThreadLastViewed();
		const threadView = useThreadLastViewed();
		const shown = computed(() => sidebar.lastViewedAt('thread-a'));
		expect(shown.value).toBeUndefined();

		threadView.markViewed('thread-a');

		expect(shown.value).toBe(NOW);
	});

	it('reads the views again after another tab stores them', () => {
		const { lastViewedAt } = useThreadLastViewed();
		const shown = computed(() => lastViewedAt('thread-a'));
		expect(shown.value).toBeUndefined();

		storage.set(keyFor('user-1'), JSON.stringify({ 'thread-a': NOW }));
		window.dispatchEvent(new StorageEvent('storage', { key: keyFor('user-1') }));
		expect(shown.value).toBe(NOW);

		// A key of another feature, with the same length and the same user ID at the end.
		storage.clear();
		window.dispatchEvent(
			new StorageEvent('storage', { key: 'n8n:instance-ai:other-thing:user-1' }),
		);
		expect(shown.value).toBe(NOW);

		window.dispatchEvent(new StorageEvent('storage', { key: null }));
		expect(shown.value).toBeUndefined();
	});

	it('keeps reading views from other tabs after another reader unmounts', () => {
		const threadViewScope = effectScope();
		threadViewScope.run(() => useThreadLastViewed());
		const sidebarScope = effectScope();
		const sidebar = sidebarScope.run(() => useThreadLastViewed());
		const shown = computed(() => sidebar?.lastViewedAt('thread-a'));
		expect(shown.value).toBeUndefined();

		threadViewScope.stop();
		storage.set(keyFor('user-1'), JSON.stringify({ 'thread-a': NOW }));
		window.dispatchEvent(new StorageEvent('storage', { key: keyFor('user-1') }));

		expect(shown.value).toBe(NOW);
		sidebarScope.stop();
	});
});

describe('useMarkThreadViewed', () => {
	function thread(id: string, lastActivityAt?: string): InstanceAiThreadSummary {
		return { id, title: id, createdAt: NOW, updatedAt: NOW, state: 'idle', lastActivityAt };
	}

	function mountView(threadId: string, working: boolean) {
		const scope = effectScope();
		const id = ref(threadId);
		const isWorking = ref(working);
		scope.run(() => useMarkThreadViewed(() => id.value, isWorking));
		return { id, isWorking, stop: () => scope.stop() };
	}

	beforeEach(setUpPage);
	afterEach(tearDownPage);

	it('marks the chat as seen when the user enters it', () => {
		const view = mountView('thread-a', false);

		expect(useThreadLastViewed().lastViewedAt('thread-a')).toBe(NOW);
		view.stop();
	});

	it('waits until the chat stops working, then marks it', async () => {
		const view = mountView('thread-a', true);
		const { lastViewedAt } = useThreadLastViewed();
		expect(lastViewedAt('thread-a')).toBeUndefined();

		vi.setSystemTime(secondsAfterNow(40));
		view.isWorking.value = false;
		await nextTick();

		expect(lastViewedAt('thread-a')).toBe(secondsAfterNow(40));
		view.stop();
	});

	it('marks the chat again when new activity arrives while it is open', async () => {
		const store = useInstanceAiStore();
		const otherChat = thread('thread-other', secondsAfterNow(600));
		store.threads = [otherChat, thread('thread-a', NOW)];
		const view = mountView('thread-a', false);
		const { lastViewedAt } = useThreadLastViewed();

		// The server clock is ahead: the activity time is later than this clock.
		store.threads = [otherChat, thread('thread-a', secondsAfterNow(120))];
		await nextTick();

		expect(lastViewedAt('thread-a')).toBe(secondsAfterNow(120));
		expect(lastViewedAt('thread-other')).toBeUndefined();
		view.stop();
	});

	it('marks the next chat when the route changes to it', async () => {
		const view = mountView('thread-a', false);

		view.id.value = 'thread-b';
		await nextTick();

		expect(useThreadLastViewed().lastViewedAt('thread-b')).toBe(NOW);
		view.stop();
	});

	it('does not mark the chat while it works', async () => {
		const store = useInstanceAiStore();
		const view = mountView('thread-a', true);

		store.threads = [thread('thread-a', secondsAfterNow(5))];
		await nextTick();

		expect(storageStub.setItem).not.toHaveBeenCalled();
		view.stop();
	});
});
