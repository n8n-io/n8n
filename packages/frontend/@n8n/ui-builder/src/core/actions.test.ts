import { describe, expect, it } from 'vitest';

import { createStep, normaliseAction } from './actions';

describe('normaliseAction', () => {
	it('reads an unset action prop as no steps', () => {
		expect(normaliseAction(undefined)).toEqual([]);
	});

	it('reads the empty object an unset prop defaults to as no steps', () => {
		expect(normaliseAction({})).toEqual([]);
	});

	it('reads an empty list as no steps', () => {
		expect(normaliseAction([])).toEqual([]);
	});

	it('reads the older single-call shape as a one-step webhook chain', () => {
		expect(normaliseAction({ url: 'https://example.test/hook', method: 'GET' })).toEqual([
			{ kind: 'webhook', url: 'https://example.test/hook', method: 'GET' },
		]);
	});

	it('defaults the older shape to POST when it names no method', () => {
		expect(normaliseAction({ url: 'https://example.test/hook' })).toEqual([
			{ kind: 'webhook', url: 'https://example.test/hook', method: 'POST' },
		]);
	});

	it('keeps a chain of three steps in the order it was written', () => {
		const chain = [
			{ kind: 'webhook', url: 'https://example.test/save', method: 'POST' },
			{ kind: 'notify', message: 'Saved', type: 'success' },
			{ kind: 'navigate', to: '/orders' },
		];

		expect(normaliseAction(chain)).toEqual(chain);
	});

	it('keeps a webhook step that has no url yet, since a step can be added before it is pointed at a trigger', () => {
		expect(normaliseAction([{ kind: 'webhook', url: '' }])).toEqual([
			{ kind: 'webhook', url: '', method: 'POST' },
		]);
	});

	it('drops a step of a kind it does not know', () => {
		expect(normaliseAction([{ kind: 'teleport', to: 'the moon' }])).toEqual([]);
	});

	it('keeps the steps around one it had to drop', () => {
		expect(
			normaliseAction([
				{ kind: 'notify', message: 'first' },
				{ kind: 'teleport' },
				{ kind: 'navigate', to: '/last' },
			]),
		).toEqual([
			{ kind: 'notify', message: 'first', type: 'success' },
			{ kind: 'navigate', to: '/last' },
		]);
	});

	it('falls back to a success notification for an unknown toast type', () => {
		expect(normaliseAction([{ kind: 'notify', message: 'hi', type: 'shouty' }])).toEqual([
			{ kind: 'notify', message: 'hi', type: 'success' },
		]);
	});

	it('reads a bare url in a chain as a webhook, since that is all a step used to be', () => {
		expect(normaliseAction([{ url: 'https://example.test/hook' }])).toEqual([
			{ kind: 'webhook', url: 'https://example.test/hook', method: 'POST' },
		]);
	});
});

describe('createStep', () => {
	it('starts a webhook step with an empty url and POST', () => {
		expect(createStep('webhook')).toEqual({ kind: 'webhook', url: '', method: 'POST' });
	});

	it('starts a notify step with an empty message and a success type', () => {
		expect(createStep('notify')).toEqual({ kind: 'notify', message: '', type: 'success' });
	});

	it('starts a navigate step with an empty destination', () => {
		expect(createStep('navigate')).toEqual({ kind: 'navigate', to: '' });
	});

	it('clamps a method the older shape smuggled in', () => {
		// The two readers must agree: a hand-written PUT was surviving the legacy
		// path and being coerced on the list path, against a type allowing neither.
		expect(normaliseAction({ url: 'http://x/y', method: 'PUT' })).toEqual([
			{ kind: 'webhook', url: 'http://x/y', method: 'POST' },
		]);
	});

	it('keeps a GET from the older shape', () => {
		expect(normaliseAction({ url: 'http://x/y', method: 'GET' })).toEqual([
			{ kind: 'webhook', url: 'http://x/y', method: 'GET' },
		]);
	});

	it('gives every call its own object', () => {
		const first = createStep('notify');
		const second = createStep('notify');

		expect(first).not.toBe(second);
	});
});
