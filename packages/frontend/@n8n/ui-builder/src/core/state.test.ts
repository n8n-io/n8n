import { describe, expect, it } from 'vitest';

import { deepMerge, writePath } from './state';

describe('deepMerge', () => {
	it('merges a nested plain object key by key', () => {
		const state = { form: { name: 'Ada', email: 'ada@example.test' } };

		deepMerge(state, { form: { name: 'Grace' } });

		expect(state).toEqual({ form: { name: 'Grace', email: 'ada@example.test' } });
	});

	it('adds a key the state did not have', () => {
		const state: Record<string, unknown> = { a: 1 };

		deepMerge(state, { b: 2 });

		expect(state).toEqual({ a: 1, b: 2 });
	});

	it('replaces an array wholesale rather than merging it index by index', () => {
		const state = { rows: [1, 2, 3] };

		deepMerge(state, { rows: [9] });

		expect(state.rows).toEqual([9]);
	});

	it('replaces a primitive', () => {
		const state = { count: 1 };

		deepMerge(state, { count: 2 });

		expect(state.count).toBe(2);
	});

	it('replaces an object with a primitive when that is what came back', () => {
		const state: Record<string, unknown> = { form: { name: 'Ada' } };

		deepMerge(state, { form: null });

		expect(state.form).toBeNull();
	});

	it('ignores a partial that is not an object', () => {
		const state = { a: 1 };

		deepMerge(state, 'nonsense');
		deepMerge(state, undefined);
		deepMerge(state, [1, 2]);

		expect(state).toEqual({ a: 1 });
	});
});

describe('writePath', () => {
	it('writes a dotted path', () => {
		const state: Record<string, unknown> = { form: { name: '' } };

		writePath(state, 'form.name', 'Ada');

		expect(state).toEqual({ form: { name: 'Ada' } });
	});

	it('creates the objects along a path that does not exist yet', () => {
		const state: Record<string, unknown> = {};

		writePath(state, 'form.address.city', 'Vienna');

		expect(state).toEqual({ form: { address: { city: 'Vienna' } } });
	});

	it('writes a single key with no dots in it', () => {
		const state: Record<string, unknown> = {};

		writePath(state, 'name', 'Ada');

		expect(state).toEqual({ name: 'Ada' });
	});

	it('ignores an empty path', () => {
		const state: Record<string, unknown> = { a: 1 };

		writePath(state, '', 'Ada');

		expect(state).toEqual({ a: 1 });
	});
});
