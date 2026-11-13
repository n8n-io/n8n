/**
 * The evaluate step (`n8n-compiled.evaluate`): n8n's expression engine gives
 * the values of v1 expressions for each input item, with the run data of the
 * nodes that they name.
 */
import { NodeStepRunner } from '../node-step';

describe('the evaluate step', () => {
	it('gives the v1 values of the expressions for each item', async () => {
		const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });
		const out = await runner.run(
			{
				name: 'Respond (values)',
				type: 'n8n-compiled.evaluate',
				typeVersion: 1,
				parameters: {
					node: 'Respond',
					values: {
						p0: "={{ DateTime.fromISO('2026-01-02T03:04:05Z', { zone: 'utc' }).toFormat('yyyy-MM') }}",
						p1: '={{ $json.n.toString() }}',
						p2: "={{ /^a/.test($('Hook').item.json.s) }}",
						p3: '={{ { ok: true, n: $json.n } }}',
					},
				},
				inputs: [[{ n: 1 }, { n: 2 }]],
				subNodes: [],
				allOutputs: false,
				runData: {
					nodes: [{ name: 'Hook', type: 'n8n-nodes-base.noOp', typeVersion: 1, parameters: {} }],
					connections: [['Hook', 0, 'Respond', 0]],
					runs: { Hook: [[[{ s: 'abc' }, { s: 'xyz' }]]] },
				},
			},
			{ step: 'Respond (values)', key: 'k' },
		);
		expect(out).toEqual([
			{ p0: '2026-01', p1: '1', p2: true, p3: { ok: true, n: 1 } },
			{ p0: '2026-01', p1: '2', p2: false, p3: { ok: true, n: 2 } },
		]);
	});
});
