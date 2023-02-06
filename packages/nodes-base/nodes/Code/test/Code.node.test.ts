import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';

describe('Execute Code Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'run once for All and Each items',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/Code/test/Code.workflow.json'),
			},
			output: {
				nodeData: {
					'Run Once for All Items': [
						[
							{
								sum: 3,
							},
						],
					],
					'Run Once for Each Item': [
						[
							{
								value: 1,
								myNewField: 1,
							},
							{
								value: 2,
								myNewField: 2,
							},
						],
					],
				},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

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
