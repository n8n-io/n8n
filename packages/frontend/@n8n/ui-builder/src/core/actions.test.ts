import { describe, expect, it } from 'vitest';

import { createStep, normaliseAction, replyKeyFor } from './actions';

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

	it('reads what a webhook step sends, and what its reply is called', () => {
		expect(
			normaliseAction([
				{ kind: 'webhook', url: 'http://x/y', request: '={{ $state.form }}', key: 'orders' },
			]),
		).toEqual([
			{
				kind: 'webhook',
				url: 'http://x/y',
				method: 'POST',
				request: '={{ $state.form }}',
				key: 'orders',
			},
		]);
	});

	it('reads a body saved as a bare state path as the expression it means', () => {
		expect(
			normaliseAction([{ kind: 'webhook', url: 'http://x/y', request: 'form' }]),
		).toMatchObject([{ request: '={{ $state.form }}' }]);
	});

	it('turns a legacy response binding into the set step it stood for', () => {
		expect(
			normaliseAction([{ kind: 'webhook', url: 'http://x/y', response: 'orders' }]),
		).toMatchObject([
			{ kind: 'webhook', url: 'http://x/y' },
			{ kind: 'set', path: 'orders', value: '={{ $response }}' },
		]);
	});

	it('turns a legacy mapped binding into one set step per path', () => {
		expect(
			normaliseAction([
				{ kind: 'webhook', url: 'http://x/y', response: { orders: 'data.items', total: 'count' } },
			]),
		).toMatchObject([
			{ kind: 'webhook' },
			{ kind: 'set', path: 'orders', value: '={{ $response.data.items }}' },
			{ kind: 'set', path: 'total', value: '={{ $response.count }}' },
		]);
	});

	it('drops legacy map entries that do not name a path', () => {
		expect(
			normaliseAction([{ kind: 'webhook', url: 'http://x/y', response: { orders: 5 } }]),
		).toHaveLength(1);
	});

	it('reads an empty request as no request, so all of state is sent', () => {
		expect(
			normaliseAction([{ kind: 'webhook', url: 'http://x/y', request: '', key: '' }]),
		).toMatchObject([{ request: undefined, key: undefined }]);
	});

	it('reads a set step, keeping a value that is not a string', () => {
		expect(normaliseAction([{ kind: 'set', path: 'form', value: {} }])).toEqual([
			{ kind: 'set', path: 'form', value: {} },
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

	it('starts a set step with an empty path and value', () => {
		expect(createStep('set')).toEqual({ kind: 'set', path: '', value: '' });
	});

	it('keeps a method an API Router endpoint can actually be on', () => {
		expect(normaliseAction({ url: 'http://x/y', method: 'PUT' })).toEqual([
			{ kind: 'webhook', url: 'http://x/y', method: 'PUT' },
		]);
	});

	it('falls back to POST for a method nothing serves', () => {
		expect(normaliseAction({ url: 'http://x/y', method: 'TRACE' })).toEqual([
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

describe('replyKeyFor', () => {
	it('names a reply after the endpoint that answers it', () => {
		expect(replyKeyFor('http://x/webhook/orders-app/orders', [])).toBe('orders');
	});

	it('keeps the keys of one chain apart', () => {
		expect(replyKeyFor('http://x/webhook/orders', ['orders'])).toBe('orders2');
		expect(replyKeyFor('http://x/webhook/orders', ['orders', 'orders2'])).toBe('orders3');
	});

	it('produces something an expression can name', () => {
		expect(replyKeyFor('http://x/webhook/my-orders/2024', [])).toBe('reply_2024');
	});

	it('falls back when there is no path to name it after', () => {
		expect(replyKeyFor('', [])).toBe('reply');
	});
});
