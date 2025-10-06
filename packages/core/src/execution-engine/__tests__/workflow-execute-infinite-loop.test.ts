import type { IConnections, INode, IRun } from 'n8n-workflow';
import { createDeferredPromise, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

const nodeTypes = Helpers.NodeTypes();

describe('WorkflowExecute - assertNoDefiniteInfiniteLoops', () => {
	test('should throw error when SplitInBatches done output connects to own input', () => {
		const nodes: INode[] = [
			{
				id: 'splitInBatches',
				name: 'Split In Batches',
				type: 'splitInBatches',
				typeVersion: 4,
				position: [0, 0],
				parameters: {},
			},
		];

		const connections: IConnections = {
			'Split In Batches': {
				main: [
					// Done output (index 0) connects back to own input - INVALID
					[{ node: 'Split In Batches', type: NodeConnectionTypes.Main, index: 0 }],
					[],
				],
			},
		};

		const workflowInstance = new Workflow({
			id: 'test-infinite-loop',
			nodes,
			connections,
			active: false,
			nodeTypes,
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		expect(() => {
			workflowExecute.processRunExecutionData(workflowInstance);
		}).toThrow(
			'Stopped execution: Loop Over Items (Split in Batches) node has its "done" output connected back to its own input',
		);
	});

	test('should not throw error when SplitInBatches loop output connects to own input', () => {
		const nodes: INode[] = [
			{
				id: 'splitInBatches',
				name: 'Split In Batches',
				type: 'splitInBatches',
				typeVersion: 4,
				position: [0, 0],
				parameters: {},
			},
		];

		const connections: IConnections = {
			'Split In Batches': {
				main: [
					[], // Done output (index 0) - no connection
					// Loop output (index 1) connects back to own input - VALID
					[{ node: 'Split In Batches', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
		};

		const workflowInstance = new Workflow({
			id: 'test-valid-loop',
			nodes,
			connections,
			active: false,
			nodeTypes,
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		// Should not throw
		expect(() => {
			workflowExecute.processRunExecutionData(workflowInstance);
		}).not.toThrow();
	});

	test('should not throw error when SplitInBatches has no done output connection', () => {
		const nodes: INode[] = [
			{
				id: 'splitInBatches',
				name: 'Split In Batches',
				type: 'splitInBatches',
				typeVersion: 4,
				position: [0, 0],
				parameters: {},
			},
		];

		const connections: IConnections = {
			'Split In Batches': {
				main: [
					// Done output (index 0) - no connection - VALID
					null,
					[],
				],
			},
		};

		const workflowInstance = new Workflow({
			id: 'test-no-connection',
			nodes,
			connections,
			active: false,
			nodeTypes,
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		// Should not throw
		expect(() => {
			workflowExecute.processRunExecutionData(workflowInstance);
		}).not.toThrow();
	});
});
