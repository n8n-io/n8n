import { mock } from 'jest-mock-extended';
import type { IExecuteData, IRunData, LoggerProxy, Request } from 'n8n-workflow';

import { DirectedGraph } from '../partial-execution-utils';
import { createNodeData } from '../partial-execution-utils/__tests__/helpers';
import { handleRequests } from '../requests-response';
import { nodeTypes, types } from './mock-node-types';

describe('handleRequests', () => {
	test('throws if an action is mentions a node that does not exist in the workflow', async () => {
		// ARRANGE
		const request: Request = {
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
			handleRequests({
				workflow,
				currentNode,
				request,
				runIndex: 1,
				executionData: mock<IExecuteData>(),
				runData: mock<IRunData>(),
				logger: mock<typeof LoggerProxy>(),
			}),
		).toThrowError('Workflow does not contain a node with the name of "does not exist".');
	});
});
