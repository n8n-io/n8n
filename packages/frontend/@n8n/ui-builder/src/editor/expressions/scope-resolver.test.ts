import { reactive } from 'vue';

import { uiScopeResolver } from './scope-resolver';
import type { UiScope, UiState } from '../../core/types';

const scope: UiScope = {
	$state: {
		title: 'Hi',
		count: 2,
		rows: [{ id: 'test' }, { id: 'test2' }],
		user: { name: 'Ada' },
		missing: null,
		at: new Date('2026-08-12T10:00:00.000Z'),
	},
};

const { resolve } = uiScopeResolver(() => scope);

describe('uiScopeResolver', () => {
	it('passes primitives through untouched', async () => {
		expect((await resolve('{{ $state.title }}')).resolved).toBe('Hi');
		expect((await resolve('{{ $state.count }}')).resolved).toBe(2);
		expect((await resolve('{{ $state.missing }}')).resolved).toBe(null);
	});

	it('names and serialises arrays and objects', async () => {
		expect((await resolve('{{ $state.rows }}')).resolved).toBe(
			'[Array: [{"id": "test"},{"id": "test2"}]]',
		);
		expect((await resolve('{{ $state.user }}')).resolved).toBe('[Object: {"name": "Ada"}]');
	});

	it('serialises dates as an ISO string', async () => {
		expect((await resolve('{{ $state.at }}')).resolved).toBe('[Date: 2026-08-12T10:00:00.000Z]');
	});

	it('moves what the editor re-resolves on when state changes under a held scope', () => {
		const state = reactive<UiState>({});
		const held: UiScope = { $state: state };
		const { watchImmediate } = uiScopeResolver(() => held);

		const before = watchImmediate?.();
		state.form = { qty: '8' };

		expect(watchImmediate?.()).not.toBe(before);
	});
});
