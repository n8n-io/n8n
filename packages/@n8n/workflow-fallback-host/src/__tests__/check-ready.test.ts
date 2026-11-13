/**
 * The readiness check (`n8n-compiled.check`): before a manual run, n8n fails
 * with the parameter issues of the start node and the nodes after it
 * (`WorkflowExecute.checkReadyForExecution`, `WorkflowHasIssuesError`).
 */
import { readinessIssues } from '../check-ready';
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';
import { HostNodeTypes } from '../node-types';
import type { JsonObject } from '../protocol';

const check = (url: string) =>
	parseNodeStepArgs({
		name: 'n8n readiness check',
		type: 'n8n-compiled.check',
		parameters: {
			nodes: [
				{ name: 'T', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, parameters: {} },
				{ name: 'H', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, parameters: { url } },
			],
			connections: { T: { main: [[{ node: 'H', type: 'main', index: 0 }]] } },
			startNode: 'T',
			pinDataNodeNames: [],
		},
		items: [{}],
	});

describe('the readiness check', () => {
	it('checks every node when no start node is given (publish), and skips disabled nodes', () => {
		const types = new HostNodeTypes();
		const nodes: JsonObject[] = [
			{ name: 'T', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, parameters: {} },
			{ name: 'H', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, parameters: { url: '' } },
			{
				name: 'Off',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				disabled: true,
				parameters: { url: '' },
			},
		];
		// H is not connected: a run from T does not check it, a publish does.
		expect(readinessIssues({ nodes, connections: {}, startNode: 'T' }, types)).toBeNull();
		expect(readinessIssues({ nodes, connections: {} }, types)).toMatch(/^The 'H' node has issues/);
	});

	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	it('fails with the issues of a node, as n8n does', async () => {
		await expect(runner.run(check(''), { step: 'c', key: 'k1' })).rejects.toThrow(
			"The 'H' node has issues",
		);
	});

	it('passes a workflow without issues', async () => {
		await expect(
			runner.run(check('https://example.test'), { step: 'c', key: 'k2' }),
		).resolves.toEqual([]);
	});
});
