/**
 * Set fields whose name is an expression, against v1: the workflow runs in
 * n8n's engine and, converted, on the reference runner.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const ITEMS = [
	{ k: 'a', v: 1 },
	{ k: 'b.c', v: 2 },
];

function workflow(dotNotation: boolean) {
	return {
		name: 'Set names',
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
				parameters: { jsCode: `return ${JSON.stringify(ITEMS)}.map((json) => ({ json }));` },
			},
			{
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: '1',
								name: '={{ "field_" + $json.k }}',
								value: '={{ $json.v }}',
								type: 'number',
							},
							{ id: '2', name: '=Body', value: 'text', type: 'string' },
							{ id: '3', name: '=nested.{{ $json.k }}', value: true, type: 'boolean' },
						],
					},
					includeOtherFields: true,
					options: dotNotation ? {} : { dotNotation: false },
				},
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

describe('Set field names that are expressions, and v1', () => {
	it.each([true, false])('dot notation %s', async (dot) => {
		const v1 = await runOracle(workflow(dot), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		const converted = convertWorkflow(workflow(dot), { trace: 'all' });
		expect(converted.fallbackNodes).toEqual([]);
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {},
			trace: true,
		});
		expect(out.status).toBe('ok');
		const traced = (out.trace ?? []).find((t) => t.step === 'Set')?.items;
		expect(traced).toEqual(v1.nodes.Set?.[0]);
	});
});
