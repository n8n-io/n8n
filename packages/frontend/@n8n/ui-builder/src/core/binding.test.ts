import { describe, expect, it, vi } from 'vitest';

import { placeResponse, requestBody, writeState } from './binding';
import type { UiState, UiWebhookStep } from './types';

const step = (fields: Partial<UiWebhookStep> = {}): UiWebhookStep => ({
	kind: 'webhook',
	url: 'http://x/y',
	...fields,
});

describe('requestBody', () => {
	const state: UiState = { form: { name: 'Widget' }, orders: [] };

	it('sends all of state when the step names no part of it', () => {
		expect(requestBody(state, step())).toBe(state);
	});

	it('sends only the part the step names', () => {
		expect(requestBody(state, step({ request: 'form' }))).toEqual({ name: 'Widget' });
	});

	it('sends nothing for a path state does not have', () => {
		expect(requestBody(state, step({ request: 'nope.deeper' }))).toBeUndefined();
	});
});

describe('placeResponse', () => {
	it('discards the reply of a step with no binding', () => {
		const state: UiState = {};

		expect(placeResponse(state, undefined, [{ id: 1 }])).toEqual([]);
		expect(state).toEqual({});
	});

	it('writes the whole body at the path a string names', () => {
		const state: UiState = {};

		expect(placeResponse(state, 'orders', [{ id: 1 }])).toEqual(['orders']);
		expect(state).toEqual({ orders: [{ id: 1 }] });
	});

	it('keeps a one-row list a list', () => {
		const state: UiState = {};
		placeResponse(state, 'orders', [{ id: 1 }]);

		expect(state.orders).toEqual([{ id: 1 }]);
	});

	it('replaces rather than merges, so a shorter list is shorter', () => {
		const state: UiState = { orders: [{ id: 1 }, { id: 2 }] };
		placeResponse(state, 'orders', [{ id: 3 }]);

		expect(state.orders).toEqual([{ id: 3 }]);
	});

	it('fills several paths from one reply', () => {
		const state: UiState = {};
		const body = { data: { items: [{ id: 1 }], count: 1 } };

		expect(placeResponse(state, { orders: 'data.items', total: 'data.count' }, body)).toEqual([
			'orders',
			'total',
		]);
		expect(state).toEqual({ orders: [{ id: 1 }], total: 1 });
	});

	it('writes undefined for a path the reply does not have, rather than skipping it', () => {
		const state: UiState = { orders: [{ id: 1 }] };
		placeResponse(state, { orders: 'data.items' }, {});

		expect(state.orders).toBeUndefined();
	});

	it('writes into a nested state path', () => {
		const state: UiState = {};
		placeResponse(state, 'page.orders', [{ id: 1 }]);

		expect(state).toEqual({ page: { orders: [{ id: 1 }] } });
	});
});

describe('writeState', () => {
	it('refuses to write into the client’s own corner of state', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const state: UiState = {};

		expect(writeState(state, '$app.route', { path: '/nope' })).toBe(false);
		expect(state).toEqual({});
		expect(warn).toHaveBeenCalled();

		warn.mockRestore();
	});

	it('refuses an empty path', () => {
		expect(writeState({}, '', 1)).toBe(false);
	});
});
