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

	it('bumps changeVersion once for a bulk delete', async () => {
		const store = useContextStore();
		const before = store.changeVersion;

		await store.deletePreferences(['a', 'b', 'c']);

		expect(remove).toHaveBeenCalledTimes(3);
		expect(store.changeVersion).toBe(before + 1);
	});
});
