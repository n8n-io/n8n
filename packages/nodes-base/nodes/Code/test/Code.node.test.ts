import type { INodeType } from 'n8n-workflow';
import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';

import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';
import { Code } from '../../../nodes/Code/Code.node';

describe('Execute Code Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute IF node true/false boolean',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/Code/test/Code.workflow.json'),
			},
			output: {
				nodeData: {
					'Apply New Field': [
						[
							{
								myNewField: 1,
								name: 'foo',
							},
							{
								myNewField: 1,
								name: 'bar',
							},
						],
					],
				},
			},
		},
	];

	const nodes: INodeType[] = [new ManualTrigger(), new Code()];
	const nodeTypes = Helpers.setup(nodes);

	for (const testData of tests) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		test(testData.description, async () => {
			// execute workflow
			const { result } = await executeWorkflow(testData, nodeTypes);

			// check if result node data matches expected test data
			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			expect(result.finished).toEqual(true);
		});
	}
});
