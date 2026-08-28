import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

/**
 * Repro for https://github.com/n8n-io/n8n/issues/30662 (CAT-3156).
 *
 * Two merge nodes wait for input while a feedback edge makes the graph
 * cyclic. Each merge node then appears among the other's (transitive)
 * parents, the waiting-nodes dispatcher skips both forever, and the
 * execution silently finishes without ever running them.
 */
describe('waiting nodes in a cyclic workflow', () => {
	const nodeTypes = Helpers.NodeTypes();

	const workflowData: Pick<IWorkflowBase, 'nodes' | 'connections'> = {
		nodes: [
			{
				parameters: {},
				id: '9f62a1a2-0000-0000-0000-000000000001',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
			},
			{
				parameters: {},
				id: '9f62a1a2-0000-0000-0000-000000000002',
				name: 'NoOp',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [200, 0],
			},
			{
				// No conditions -> every item goes to the true branch
				parameters: {},
				id: '9f62a1a2-0000-0000-0000-000000000003',
				name: 'IfBranch',
				type: 'n8n-nodes-base.if',
				typeVersion: 1,
				position: [400, 100],
			},
			{
				parameters: {},
				id: '9f62a1a2-0000-0000-0000-000000000004',
				name: 'MergeInner',
				type: 'n8n-nodes-base.merge',
				typeVersion: 2.1,
				position: [600, 100],
			},
			{
				parameters: {},
				id: '9f62a1a2-0000-0000-0000-000000000005',
				name: 'MergeOuter',
				type: 'n8n-nodes-base.merge',
				typeVersion: 2.1,
				position: [800, 0],
			},
			{
				// Condition never matches -> nothing is ever sent around the loop,
				// the edge back to NoOp only exists structurally.
				parameters: {
					conditions: {
						number: [
							{
								value1: '={{ $json.counter || 0 }}',
								operation: 'larger',
								value2: 3,
							},
						],
					},
				},
				id: '9f62a1a2-0000-0000-0000-000000000006',
				name: 'IfLoop',
				type: 'n8n-nodes-base.if',
				typeVersion: 1,
				position: [1000, 0],
			},
		],
		connections: {
			Start: {
				main: [[{ node: 'NoOp', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			NoOp: {
				main: [
					[
						{ node: 'MergeOuter', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'IfBranch', type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
			IfBranch: {
				main: [
					[{ node: 'MergeInner', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'MergeInner', type: NodeConnectionTypes.Main, index: 1 }],
				],
			},
			MergeInner: {
				main: [[{ node: 'MergeOuter', type: NodeConnectionTypes.Main, index: 1 }]],
			},
			MergeOuter: {
				main: [[{ node: 'IfLoop', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			IfLoop: {
				main: [[{ node: 'NoOp', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		},
	};

	test('merge nodes still execute when a feedback edge makes the workflow cyclic', async () => {
		const workflowInstance = new Workflow({
			id: 'test',
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes,
			settings: { executionOrder: 'v1' },
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		await workflowExecute.run({ workflow: workflowInstance });
		const result = await waitPromise.promise;

		const runData = result.data.resultData.runData;
		expect(Object.keys(runData)).toEqual([
			'Start',
			'NoOp',
			'IfBranch',
			'MergeInner',
			'MergeOuter',
			'IfLoop',
		]);

		// MergeInner must run before MergeOuter, as in the acyclic variant
		expect(runData.MergeInner[0].executionIndex).toBeLessThan(runData.MergeOuter[0].executionIndex);
		// MergeOuter appends its direct input and MergeInner's output
		expect(runData.MergeOuter[0].data!.main[0]).toHaveLength(2);
		expect(result.finished).toEqual(true);
	});
});
