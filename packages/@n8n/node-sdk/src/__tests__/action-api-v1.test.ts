import type { INode } from 'n8n-workflow';

import { fromActionApiV1, type RunContextV1 } from '../action-api-v1';
import { defineNode, t } from '../index';
import { executorOf, type ExecutorHost } from '../runtime';

const node: INode = {
	id: '1',
	name: 'Pages',
	type: 'pages',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const pages = defineNode({ id: 'pages', displayName: 'Pages', baseUrl: 'https://pages.test' });
const head = pages.action('list', {
	action: 'List pages',
	summary: 'List pages.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: t.obj({ id: t.str() }),
	async run() {
		return { id: 'unused' };
	},
});

/** An @1 action that emits the items of each page body and sends one request per page. */
const v1Of = (bodies: unknown[][]) => {
	const requests: unknown[] = [];
	const action = fromActionApiV1({
		...head,
		async run({ http, emit }: RunContextV1) {
			for (const _body of bodies) {
				const body = await http.request({ path: '/pages' });
				(Array.isArray(body) ? body : []).forEach(emit);
			}
		},
	});
	const host: ExecutorHost = {
		items: [{ json: {} }],
		node,
		parameter: () => undefined,
		request: async () => {
			requests.push(null);
			return bodies[requests.length - 1];
		},
		continueOnFail: () => false,
	};
	if (!action) throw new Error('not an @1 action');
	return { run: async () => await executorOf(action)(host), requests, action };
};

describe('fromActionApiV1', () => {
	it('runs an @1 action as a 1:N @2 action, with all emitted items in order', async () => {
		const { run, action } = v1Of([[{ id: 'a' }, { id: 'b' }], [], [{ id: 'c' }]]);

		expect(action.flow.cardinality).toBe('1:N');
		expect((await run())[0]?.map(({ json }) => json.id)).toEqual(['a', 'b', 'c']);
	});

	it('stops the run at the first invalid item', async () => {
		const { run, requests } = v1Of([[{ id: 1 }], [{ id: 'b' }], [{ id: 'c' }]]);

		await expect(run()).rejects.toThrow('Output does not match the contract');
		expect(requests).toHaveLength(1);
	});

	it('gives the error of the run to the host', async () => {
		const action = fromActionApiV1({
			...head,
			async run({ emit }: RunContextV1) {
				emit({ id: 'a' });
				throw new Error('page 2 failed');
			},
		});
		if (!action) throw new Error('not an @1 action');
		const host: ExecutorHost = {
			items: [{ json: {} }],
			node,
			parameter: () => undefined,
			request: async () => undefined,
			continueOnFail: () => true,
		};

		expect(await executorOf(action)(host)).toEqual([
			[{ json: { error: 'page 2 failed' }, pairedItem: { item: 0 } }],
		]);
	});

	it('refuses an export that is not an action', () => {
		expect(fromActionApiV1({ id: 'x' })).toBeUndefined();
	});
});
