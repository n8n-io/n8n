import { AI_PREFERENCES_MAX_IDS_FILTER } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useContextStore } from './context.store';
import type { Preference } from './context.types';

const list = vi.fn();
const countOnly = vi.fn();
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();

vi.mock('./context.api', () => ({
	getPreferences: async (...args: unknown[]) => await list(...args),
	getPreferenceCount: async (...args: unknown[]) => await countOnly(...args),
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
		user: null,
		projectId: null,
		project: null,
		source: 'ui',
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
		countOnly.mockResolvedValue(1);
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

	it('looks rows up by id in one request, without touching the paged list', async () => {
		const store = useContextStore();
		list.mockResolvedValueOnce({ count: 2, data: [row({ id: 'a' }), row({ id: 'b' })] });

		const rows = await store.fetchPreferencesByIds(['a', 'b']);

		expect(list).toHaveBeenCalledTimes(1);
		expect(list).toHaveBeenCalledWith(expect.anything(), { ids: ['a', 'b'], take: 2 });
		expect(rows.map(({ id }) => id)).toEqual(['a', 'b']);
		expect(store.preferences).toEqual([]);
		expect(store.count).toBe(0);
	});

	it('splits a long id list into page-sized requests and joins the answers', async () => {
		const store = useContextStore();
		const ids = Array.from({ length: AI_PREFERENCES_MAX_IDS_FILTER + 1 }, (_, i) => `id-${i}`);
		list.mockImplementation(async (_context: unknown, query: { ids: string[] }) => ({
			count: query.ids.length,
			data: query.ids.map((id) => row({ id })),
		}));

		const rows = await store.fetchPreferencesByIds(ids);

		expect(list).toHaveBeenCalledTimes(2);
		expect(list.mock.calls[0][1]).toEqual({
			ids: ids.slice(0, AI_PREFERENCES_MAX_IDS_FILTER),
			take: AI_PREFERENCES_MAX_IDS_FILTER,
		});
		expect(list.mock.calls[1][1]).toEqual({ ids: [ids[AI_PREFERENCES_MAX_IDS_FILTER]], take: 1 });
		expect(rows.map(({ id }) => id)).toEqual(ids);
	});

	it('reads the total without holding a page', async () => {
		countOnly.mockResolvedValue(7);
		const store = useContextStore();

		await expect(store.fetchPreferenceCount()).resolves.toBe(7);
		expect(countOnly).toHaveBeenCalledTimes(1);
		expect(list).not.toHaveBeenCalled();
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
		const countRead = deferred<number>();
		list.mockReturnValueOnce(listRead.promise);
		countOnly.mockReturnValueOnce(countRead.promise);
		const store = useContextStore();

		const rows = store.fetchPreferences({ skip: 0, take: 50 });
		const total = store.fetchPreferenceCount();

		countRead.settle(4);
		await total;
		listRead.settle({ count: 4, data: [row({ id: 'page' })] });
		await rows;

		// Stranding this leaves the table spinning over stale rows forever.
		expect(store.loading).toBe(false);
		expect(store.preferences.map((p) => p.id)).toEqual(['page']);
	});

	it('lets the newer count read win over an older list read', async () => {
		const listRead = deferred<{ count: number; data: Preference[] }>();
		const countRead = deferred<number>();
		list.mockReturnValueOnce(listRead.promise);
		countOnly.mockReturnValueOnce(countRead.promise);
		const store = useContextStore();

		const rows = store.fetchPreferences({ skip: 0, take: 50 });
		const total = store.fetchPreferenceCount();

		countRead.settle(9);
		await total;
		listRead.settle({ count: 1, data: [row({ id: 'page' })] });
		await rows;

		expect(store.count).toBe(9);
	});

	it('deletes the rest and reports the failures when a bulk delete fails part way', async () => {
		remove
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('gone'))
			.mockResolvedValueOnce(undefined);
		const store = useContextStore();

		const result = await store.deletePreferences(['a', 'b', 'c']);

		// One failed row must not leave the rows after it behind.
		expect(remove).toHaveBeenCalledTimes(3);
		expect(result.deleted).toEqual(['a', 'c']);
		expect(result.failed).toEqual([{ id: 'b', error: new Error('gone') }]);
	});

	it('reports every row as failed when every delete of a bulk run fails', async () => {
		remove.mockRejectedValue(new Error('gone'));
		const store = useContextStore();

		const result = await store.deletePreferences(['a', 'b']);

		expect(result.deleted).toEqual([]);
		expect(result.failed).toHaveLength(2);
	});

	// The settings page and a chat card read the same row. A write on one must not leave the
	// other painting the state it replaced.
	describe('settings writes and the lookup cache', () => {
		it('records the row an update returned', async () => {
			const store = useContextStore();
			update.mockResolvedValue(row({ id: 'a', userId: null, projectId: 'p-1' }));

			await store.updatePreference('a', { content: 'Rule.', scope: 'project', projectId: 'p-1' });

			expect(store.rowById.get('a')).toMatchObject({ projectId: 'p-1' });
		});

		it('records the row a create returned', async () => {
			const store = useContextStore();
			create.mockResolvedValue(row({ id: 'a' }));

			await store.createPreference({ content: 'Rule.', scope: 'user' });

			expect(store.rowById.get('a')?.id).toBe('a');
		});

		it('drops a row a delete removed', async () => {
			const store = useContextStore();
			store.setRow(row({ id: 'a' }));

			await store.deletePreference('a');

			expect(store.rowById.has('a')).toBe(false);
		});

		it('drops every row a bulk delete removed, and keeps the ones that failed', async () => {
			const store = useContextStore();
			store.setRow(row({ id: 'a' }));
			store.setRow(row({ id: 'b' }));
			remove.mockImplementation(async (_ctx: unknown, id: string) => {
				if (id === 'b') throw new Error('gone');
			});

			await store.deletePreferences(['a', 'b']);

			expect(store.rowById.has('a')).toBe(false);
			expect(store.rowById.has('b')).toBe(true);
		});
	});

	describe('resolveRows', () => {
		it('turns every ask in the same tick into one read', async () => {
			const store = useContextStore();
			list.mockResolvedValueOnce({ count: 2, data: [row({ id: 'a' }), row({ id: 'b' })] });

			await Promise.all([store.resolveRows(['a']), store.resolveRows(['b'])]);

			expect(list).toHaveBeenCalledTimes(1);
			expect(list).toHaveBeenCalledWith(expect.anything(), { ids: ['a', 'b'], take: 2 });
			expect(store.rowById.get('a')?.id).toBe('a');
			expect(store.rowById.get('b')?.id).toBe('b');
		});

		it('leaves an id the read did not return unresolved', async () => {
			const store = useContextStore();
			// 'gone' is deleted or invisible, so the read answers without it.
			list.mockResolvedValueOnce({ count: 1, data: [row({ id: 'a' })] });

			await store.resolveRows(['a', 'gone']);

			expect(store.rowById.has('a')).toBe(true);
			expect(store.rowById.has('gone')).toBe(false);
		});

		it('resolves nothing and throws nothing when the read fails', async () => {
			const store = useContextStore();
			list.mockRejectedValueOnce(new Error('offline'));

			await expect(store.resolveRows(['a'])).resolves.toBeUndefined();

			expect(store.rowById.size).toBe(0);
		});

		it('keeps rows already resolved when a later read fails', async () => {
			const store = useContextStore();
			list.mockResolvedValueOnce({ count: 1, data: [row({ id: 'a' })] });
			await store.resolveRows(['a']);
			list.mockRejectedValueOnce(new Error('offline'));

			await store.resolveRows(['b']);

			expect(store.rowById.get('a')?.id).toBe('a');
		});

		// A read begun before a write must not put back what the write replaced.
		it('does not let a read in flight undo a save that landed while it ran', async () => {
			const store = useContextStore();
			const { promise, settle } = deferred<{ count: number; data: Preference[] }>();
			list.mockReturnValueOnce(promise);

			const reading = store.resolveRows(['a']);
			// The save lands first, with the row in its new project.
			store.setRow(row({ id: 'a', userId: null, projectId: 'p-1' }));
			// The read answers with the row as it was before that save.
			settle({ count: 1, data: [row({ id: 'a', userId: 'user-1', projectId: null })] });
			await reading;

			expect(store.rowById.get('a')).toMatchObject({ userId: null, projectId: 'p-1' });
		});

		it('does not let a read in flight bring back a row a removal deleted', async () => {
			const store = useContextStore();
			const { promise, settle } = deferred<{ count: number; data: Preference[] }>();
			list.mockReturnValueOnce(promise);

			const reading = store.resolveRows(['a']);
			// Nothing is cached yet, so the removal has no entry to drop, only a write to record.
			store.forgetRow('a');
			settle({ count: 1, data: [row({ id: 'a' })] });
			await reading;

			expect(store.rowById.has('a')).toBe(false);
		});

		it('records a row a write returned and drops one a write removed', () => {
			const store = useContextStore();

			store.setRow(row({ id: 'a', projectId: 'p-1', userId: null }));
			expect(store.rowById.get('a')?.projectId).toBe('p-1');

			store.forgetRow('a');
			expect(store.rowById.has('a')).toBe(false);
		});
	});
});
