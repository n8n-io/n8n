/**
 * A TypeError in an expression: v1 gives null for a whole `{{ }}` value, and
 * an empty string for one part of a text template (the other parts stay).
 */
import { convertWorkflow } from '../index.ts';
import { runReference } from '../../reference/runner.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const workflow = {
	name: 'Template',
	nodes: [
		{
			name: 'T',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			name: 'S',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [200, 0],
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'a',
							name: 'f',
							type: 'string',
							value: '={id}="{{ $json.body.invoice.id }}" and {{ $json.x }}',
						},
						{ id: 'b', name: 'g', type: 'string', value: '={{ $json.body.invoice.id }}' },
					],
				},
				options: {},
			},
		},
	],
	connections: { T: { main: [[{ node: 'S', type: 'main', index: 0 }]] } },
};

describe('expressions that throw a TypeError', () => {
	it('give the values of v1', async () => {
		const item = {};
		const v1 = await runOracle(workflow, { start: 'T', item, mode: 'trigger', timeoutMs: 10_000 });
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
		const traced = (out.trace ?? []).find((t) => t.step === 'S')?.items;
		expect(v1.nodes.S?.[0]).toEqual([{ f: '{id}="" and ', g: null }]);
		expect(traced).toEqual(v1.nodes.S?.[0]);
	});
});
