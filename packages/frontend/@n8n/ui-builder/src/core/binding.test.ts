import { describe, expect, it, vi } from 'vitest';

import { requestBody, writeState } from './binding';
import type { UiScope, UiState, UiWebhookStep } from './types';

const step = (fields: Partial<UiWebhookStep> = {}): UiWebhookStep => ({
	kind: 'webhook',
	url: 'http://x/y',
	...fields,
});

describe('requestBody', () => {
	const state: UiState = { form: { name: 'Widget' }, orders: [] };
	const scope: UiScope = { $state: state };

	it('sends all of state when the step names no part of it', () => {
		expect(requestBody(step(), scope)).toBe(state);
	});

	it('sends the part of state its body names', () => {
		expect(requestBody(step({ request: '={{ $state.form }}' }), scope)).toEqual({
			name: 'Widget',
		});
	});

	it('sends nothing for a path state does not have', () => {
		expect(requestBody(step({ request: '={{ $state.nope.deeper }}' }), scope)).toBeUndefined();
	});

	it('sends a shape the body makes up', () => {
		expect(requestBody(step({ request: '={{ { name: $state.form.name } }}' }), scope)).toEqual({
			name: 'Widget',
		});
	});

	it('resolves an expression against the whole scope, not only state', () => {
		expect(
			requestBody(step({ request: '={{ { id: $item.id } }}' }), { ...scope, $item: { id: 7 } }),
		).toEqual({ id: 7 });
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
