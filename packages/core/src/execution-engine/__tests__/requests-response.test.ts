import { mock } from 'jest-mock-extended';
import type { IExecuteData, IRunData, EngineRequest } from 'n8n-workflow';

import { DirectedGraph } from '../partial-execution-utils';
import { createNodeData } from '../partial-execution-utils/__tests__/helpers';
import { handleRequest } from '../requests-response';
import { nodeTypes, types } from './mock-node-types';

describe('handleRequests', () => {
	test('throws if an action mentions a node that does not exist in the workflow', () => {
		// ARRANGE
		const request: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'does not exist',
					input: { data: 'first node input' },
					type: 'ai_tool',
					id: 'first_action',
					metadata: {},
				},
			],
			metadata: {},
		};
		const currentNode = createNodeData({ name: 'trigger', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(currentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });
		// ACT

		// ASSERT
		expect(() =>
			handleRequest({
				workflow,
				currentNode,
				request,
				runIndex: 1,
				executionData: mock<IExecuteData>(),
				runData: mock<IRunData>(),
			}),
		).toThrowError('Workflow does not contain a node with the name of "does not exist".');
	});
});
