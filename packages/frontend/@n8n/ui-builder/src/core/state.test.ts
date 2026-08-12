import { describe, expect, it } from 'vitest';

import { writePath } from './state';

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
