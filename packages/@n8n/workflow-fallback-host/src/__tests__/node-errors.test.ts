/**
 * Node errors under "continue on fail", as n8n's `WorkflowExecute` handles them:
 * - a failure of the whole node passes the input on, and `reportError` gives the
 *   error that v1 records on the node;
 * - `continueErrorOutput` adds the error output, and an If that fails sends the
 *   item to its false output (`IfV2`), not to the error output.
 */
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';

describe('node errors under continue on fail', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	it('passes the input on and reports the error of a node that fails whole', async () => {
		const out = await runner.run(
			parseNodeStepArgs({
				name: 'DB',
				type: 'n8n-nodes-base.postgres',
				typeVersion: 2.6,
				parameters: { operation: 'executeQuery', query: 'SELECT 1', options: {} },
				onError: 'continueRegularOutput',
				outputs: 'all',
				reportError: true,
				items: [{ a: 1 }],
			}),
			{ step: 'DB', key: 'k1' },
		);
		expect(out[0]).toEqual({ items: [{ a: 1 }] });
		expect(out[1]).toEqual({ nodeError: expect.any(String) });
	});

	it('sends an If item whose condition fails to the false output', async () => {
		const out = await runner.run(
			parseNodeStepArgs({
				name: 'If',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				parameters: {
					conditions: {
						options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
						conditions: [
							{
								id: 'c',
								leftValue: '={{ $json.missing.toDateTime() }}',
								rightValue: 'x',
								operator: { type: 'string', operation: 'equals' },
							},
						],
						combinator: 'and',
					},
					options: {},
				},
				onError: 'continueErrorOutput',
				outputs: 'all',
				items: [{ a: 1 }],
			}),
			{ step: 'If', key: 'k2' },
		);
		expect(out).toEqual([{ items: [] }, { items: [{ a: 1 }] }, { items: [] }]);
	});

	it('gives a node the time zone of the workflow ($now), as v1 does', async () => {
		const out = await runner.run(
			parseNodeStepArgs({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				parameters: {
					assignments: {
						assignments: [{ id: '1', name: 'zone', value: '={{ $now.zoneName }}', type: 'string' }],
					},
					options: {},
				},
				settings: { timezone: 'Asia/Tokyo' },
				items: [{}],
			}),
			{ step: 'Set', key: 'k3' },
		);
		expect(out).toEqual([{ zone: 'Asia/Tokyo' }]);
	});
});
