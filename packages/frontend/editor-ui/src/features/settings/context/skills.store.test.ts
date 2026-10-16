import type { SkillListItem, SkillListResponse } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useSkillsStore } from './skills.store';

const list = vi.fn();

vi.mock('./skills.api', () => ({
	getSkills: async (...args: unknown[]) => await list(...args),
}));

function deferred<T>() {
	let settle: (value: T) => void = () => {};
	const promise = new Promise<T>((resolve) => {
		settle = resolve;
	});
	return { promise, settle };
}

function page(name: string, count = 1): SkillListResponse {
	return { count, data: [{ id: name, name } as SkillListItem] };
}

describe('useSkillsStore', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		list.mockReset();
	});

	it('keeps the newest list when an older request answers last', async () => {
		const older = deferred<SkillListResponse>();
		const newer = deferred<SkillListResponse>();
		list.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const store = useSkillsStore();

		const first = store.fetchSkills({ search: 'b' });
		const second = store.fetchSkills({ search: 'brand' });
		newer.settle(page('brand-voice', 1));
		await second;
		older.settle(page('bulk-skill', 9));
		await first;

		expect(store.skills.map((skill) => skill.name)).toEqual(['brand-voice']);
		expect(store.count).toBe(1);
		expect(store.loading).toBe(false);
	});

	it('stays loading until the newest request answers', async () => {
		const older = deferred<SkillListResponse>();
		const newer = deferred<SkillListResponse>();
		list.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const store = useSkillsStore();

		const first = store.fetchSkills();
		const second = store.fetchSkills();
		older.settle(page('a'));
		await first;

		expect(store.loading).toBe(true);
		newer.settle(page('b'));
		await second;
		expect(store.loading).toBe(false);
	});

	it('asks for one row for the overview count', async () => {
		list.mockResolvedValue(page('a', 7));
		const store = useSkillsStore();

		await store.fetchSkillCount();

		expect(list).toHaveBeenCalledWith(expect.anything(), { take: 1 });
		expect(store.count).toBe(7);
	});
});
