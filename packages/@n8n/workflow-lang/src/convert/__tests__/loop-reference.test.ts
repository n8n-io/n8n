/**
 * Inside a Loop Over Items loop, `$('Loop').first()` and `$('Loop').item` read
 * the current batch (output 1), as v1 finds the output on the path back to the
 * node (`Workflow.getNodeConnectionIndexes`), not the "done" output.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const workflow = {
	name: 'Loop',
	nodes: [
		{
			name: 'T',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			name: 'Items',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [200, 0],
			parameters: { jsCode: "return [{ json: { n: 'a' } }, { json: { n: 'b' } }];" },
		},
		{
			name: 'Loop',
			type: 'n8n-nodes-base.splitInBatches',
			typeVersion: 3,
			position: [400, 0],
			parameters: { options: {} },
		},
		{
			name: 'Body',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [600, 0],
			parameters: {
				assignments: {
					assignments: [
						{ id: 'a', name: 'first', type: 'string', value: "={{ $('Loop').first().json.n }}" },
						{ id: 'b', name: 'item', type: 'string', value: "={{ $('Loop').item.json.n }}" },
					],
				},
				options: {},
			},
		},
		{
			name: 'Done',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [600, 200],
			parameters: {},
		},
	],
	connections: {
		T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
		Items: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
		Loop: {
			main: [
				[{ node: 'Done', type: 'main', index: 0 }],
				[{ node: 'Body', type: 'main', index: 0 }],
			],
		},
		Body: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
	},
	settings: { executionOrder: 'v1' },
};

describe('node references in a loop', () => {
	it('read the current batch, as in v1', async () => {
		const v1 = await runOracle(workflow, {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		const converted = convertWorkflow(workflow, { trace: 'all' });
		expect(converted.ok).toBe(true);
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {},
			trace: true,
		});
		expect(out.status).toBe('ok');
		const body = (out.trace ?? [])
			.filter((t) => t.step === 'Body')
			.flatMap((t) => t.items as unknown[]);
		expect(v1.nodes.Body?.[0]).toEqual([
			{ first: 'a', item: 'a' },
			{ first: 'b', item: 'b' },
		]);
		expect(body).toEqual(v1.nodes.Body?.[0]);
	});
});
