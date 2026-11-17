/**
 * A webhook run in which no Respond to Webhook node runs. v1 answers the request with an
 * empty body. The runtime answers with the result of the run, and a run without a result
 * has an empty body.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const filter = {
	name: 'Filter',
	type: 'n8n-nodes-base.filter',
	typeVersion: 2.2,
	position: [200, 0],
	parameters: {
		conditions: {
			options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
			conditions: [
				{
					id: 'a',
					leftValue: '={{ $json.body.amount }}',
					rightValue: 100,
					operator: { type: 'number', operation: 'gt' },
				},
			],
			combinator: 'and',
		},
		options: {},
	},
};

const respond = {
	name: 'Respond',
	type: 'n8n-nodes-base.respondToWebhook',
	typeVersion: 1.1,
	position: [400, 0],
	parameters: { respondWith: 'allIncomingItems' },
};

const noOp = {
	name: 'Last',
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [400, 0],
	parameters: {},
};

const workflow = (responseMode: string, last: { name: string }) => ({
	name: 'No response',
	nodes: [
		{
			name: 'Hook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { path: 'a', httpMethod: 'POST', responseMode },
		},
		filter,
		last,
	],
	connections: {
		Hook: { main: [[{ node: 'Filter', type: 'main', index: 0 }]] },
		Filter: { main: [[{ node: last.name, type: 'main', index: 0 }]] },
	},
});

async function run(source: string, amount: number) {
	return await runReference(source, {
		trigger: { body: { amount }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: {},
	});
}

describe('a webhook run without a response of a Respond to Webhook node', () => {
	const converted = convertWorkflow(workflow('responseNode', respond));

	it('has no result when no item reaches the Respond to Webhook node', async () => {
		expect(converted.ok).toBe(true);
		const out = await run(converted.source, 2);
		expect(out.status).toBe('ok');
		expect(out.effects.filter((e) => e.kind === 'respond')).toEqual([]);
		expect(out.result).toBeUndefined();
	});

	it('keeps the result when the Respond to Webhook node sends the response', async () => {
		const out = await run(converted.source, 200);
		expect(out.status).toBe('ok');
		const responses = out.effects.filter((e) => e.kind === 'respond');
		expect(responses).toHaveLength(1);
		expect(responses[0].args).toMatchObject({ body: [{ body: { amount: 200 } }] });
		expect(out.result).toMatchObject({ Respond: [{ body: { amount: 200 } }] });
	});

	it('keeps the result of a workflow that has no Respond to Webhook node', async () => {
		// v1 refuses such a request before the run, so the runtime does not answer it.
		const other = convertWorkflow(workflow('responseNode', noOp));
		expect(other.ok).toBe(true);
		expect(other.source).not.toContain('$responded');
		const out = await run(other.source, 2);
		expect(out.result).toEqual({ Last: [] });
	});

	it('keeps the result in the other response modes', async () => {
		for (const mode of ['onReceived', 'lastNode']) {
			const other = convertWorkflow(workflow(mode, respond));
			expect(other.ok).toBe(true);
			expect(other.source).not.toContain('$responded');
			const out = await run(other.source, 2);
			expect(out.result).toEqual({ Respond: [] });
		}
	});
});
