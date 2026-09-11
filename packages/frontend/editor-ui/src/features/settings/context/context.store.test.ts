import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useContextStore } from './context.store';
import type { Preference } from './context.types';

const list = vi.fn();
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();

vi.mock('./context.api', () => ({
	getPreferences: async (...args: unknown[]) => await list(...args),
	createPreference: async (...args: unknown[]) => await create(...args),
	updatePreference: async (...args: unknown[]) => await update(...args),
	deletePreference: async (...args: unknown[]) => await remove(...args),
}));

function deferred<T>() {
	let settle: (value: T) => void = () => {};
	const promise = new Promise<T>((resolve) => {
		settle = resolve;
	});
	return { promise, settle };
}

function row(overrides: Partial<Preference> = {}): Preference {
	return {
		id: 'p1',
		content: 'Keep replies short.',
		userId: 'user-1',
		projectId: null,
		project: null,
		scopes: [],
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
		...overrides,
	};
}

describe('context.store', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.clearAllMocks();
		list.mockResolvedValue({ count: 1, data: [row()] });
		create.mockResolvedValue(row());
		update.mockResolvedValue(row());
		remove.mockResolvedValue(undefined);
	});

	it('stores the page and the total from a fetch', async () => {
		const store = useContextStore();

		await store.fetchPreferences({ skip: 0, take: 50 });

		expect(store.preferences).toHaveLength(1);
		expect(store.count).toBe(1);
	});

	it('reads the total without holding a page', async () => {
		list.mockResolvedValue({ count: 7, data: [row()] });
		const store = useContextStore();

		await expect(store.fetchPreferenceCount()).resolves.toBe(7);
		expect(list).toHaveBeenCalledWith(expect.anything(), { skip: 0, take: 1 });
	});

	// Reads land in completion order, so the newest must win regardless.
	it('ignores a read that lands after a newer one', async () => {
		const slowFirst = deferred<{ count: number; data: Preference[] }>();
		const fastSecond = deferred<{ count: number; data: Preference[] }>();
		list.mockReturnValueOnce(slowFirst.promise).mockReturnValueOnce(fastSecond.promise);
		const store = useContextStore();

		const first = store.fetchPreferences({ skip: 0, take: 50 });
		const second = store.fetchPreferences({ skip: 50, take: 50 });

		fastSecond.settle({ count: 2, data: [row({ id: 'newer' })] });
		await second;
		slowFirst.settle({ count: 99, data: [row({ id: 'older' })] });
		await first;

		expect(store.preferences.map((p) => p.id)).toEqual(['newer']);
		expect(store.count).toBe(2);
		expect(store.loading).toBe(false);
	});

	it('keeps loading true until the newest read settles', async () => {
		const slowFirst = deferred<{ count: number; data: Preference[] }>();
		const fastSecond = deferred<{ count: number; data: Preference[] }>();
		list.mockReturnValueOnce(slowFirst.promise).mockReturnValueOnce(fastSecond.promise);
		const store = useContextStore();

		const first = store.fetchPreferences({ skip: 0, take: 50 });
		const second = store.fetchPreferences({ skip: 50, take: 50 });

		// The superseded read finishing first must not clear the flag.
		slowFirst.settle({ count: 99, data: [row({ id: 'older' })] });
		await first;
		expect(store.loading).toBe(true);

		fastSecond.settle({ count: 2, data: [row({ id: 'newer' })] });
		await second;
		expect(store.loading).toBe(false);
	});

	// `loading` belongs to the list read alone; a count read must not adopt it.
	it('clears loading when a count read starts mid-flight', async () => {
		const listRead = deferred<{ count: number; data: Preference[] }>();
		const countRead = deferred<{ count: number; data: Preference[] }>();
		list.mockReturnValueOnce(listRead.promise).mockReturnValueOnce(countRead.promise);
		const store = useContextStore();

		const rows = store.fetchPreferences({ skip: 0, take: 50 });
		const total = store.fetchPreferenceCount();

		countRead.settle({ count: 4, data: [row()] });
		await total;
		listRead.settle({ count: 4, data: [row({ id: 'page' })] });
		await rows;

		// Stranding this leaves the table spinning over stale rows forever.
		expect(store.loading).toBe(false);
		expect(store.preferences.map((p) => p.id)).toEqual(['page']);
	});

	it('lets the newer count read win over an older list read', async () => {
		const listRead = deferred<{ count: number; data: Preference[] }>();
		const countRead = deferred<{ count: number; data: Preference[] }>();
		list.mockReturnValueOnce(listRead.promise).mockReturnValueOnce(countRead.promise);
		const store = useContextStore();

		const rows = store.fetchPreferences({ skip: 0, take: 50 });
		const total = store.fetchPreferenceCount();

		countRead.settle({ count: 9, data: [row()] });
		await total;
		listRead.settle({ count: 1, data: [row({ id: 'page' })] });
		await rows;

		expect(store.count).toBe(9);
	});

	// The list watches this, because the modal cannot reach it to say it saved.
	it.each([
		[
			'createPreference',
			async (s: ReturnType<typeof useContextStore>) =>
				await s.createPreference({ content: 'x', scope: 'user' }),
		],
		[
			'updatePreference',
			async (s: ReturnType<typeof useContextStore>) =>
				await s.updatePreference('p1', { content: 'x', scope: 'user' }),
		],
		[
			'deletePreference',
			async (s: ReturnType<typeof useContextStore>) => await s.deletePreference('p1'),
		],
		[
			'deletePreferences',
			async (s: ReturnType<typeof useContextStore>) => await s.deletePreferences(['p1', 'p2']),
		],
	])('bumps changeVersion after %s', async (_name, run) => {
		const store = useContextStore();
		const before = store.changeVersion;

		await run(store);

		expect(store.changeVersion).toBe(before + 1);
	});

	it('does not bump changeVersion when a write fails', async () => {
		create.mockRejectedValue(new Error('nope'));
		const store = useContextStore();
		const before = store.changeVersion;

		await expect(store.createPreference({ content: 'x', scope: 'user' })).rejects.toThrow();

		expect(store.changeVersion).toBe(before);
	});

	it('still signals a change when a bulk delete fails part way', async () => {
		remove.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('gone'));
		const store = useContextStore();
		const before = store.changeVersion;

		// Two rows were asked for, one went. The survivor is still on screen.
		await expect(store.deletePreferences(['a', 'b'])).rejects.toThrow('gone');

		expect(store.changeVersion).toBe(before + 1);
	});

	it('does not signal a change when the first delete of a bulk run fails', async () => {
		remove.mockRejectedValueOnce(new Error('gone'));
		const store = useContextStore();
		const before = store.changeVersion;

		await expect(store.deletePreferences(['a', 'b'])).rejects.toThrow('gone');

		expect(store.changeVersion).toBe(before);
	});

	it('bumps changeVersion once for a bulk delete', async () => {
		const store = useContextStore();
		const before = store.changeVersion;

		await store.deletePreferences(['a', 'b', 'c']);

		expect(remove).toHaveBeenCalledTimes(3);
		expect(store.changeVersion).toBe(before + 1);
	});
});
