import type { INodeType } from 'n8n-workflow';
import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';

import { ExecuteCommand } from '../ExecuteCommand.node';
import { ManualTrigger } from '../../ManualTrigger/ManualTrigger.node';
import { Set } from '../../Set/Set.node';
import { ItemLists } from '../../ItemLists/ItemLists.node';

describe('Execute Execute Command Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute Execute Command node',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/ExecuteCommand/test/workflow.json'),
			},
			output: {
				nodeData: {
					'EC Once': [
						[
							{
								exitCode: 0,
								stderr: '',
								stdout: 'n8n',
							},
						],
					],
					'EC All': [
						[
							{
								exitCode: 0,
								stderr: '',
								stdout: 'n8n',
							},
							{
								exitCode: 0,
								stderr: '',
								stdout: 'test',
							},
						],
					],
				},
			},
		},
	];

	const nodes: INodeType[] = [
		new ManualTrigger(),
		new Set(),
		new ItemLists(),
		new ExecuteCommand(),
	];
	const nodeTypes = Helpers.setup(nodes);

	for (const testData of tests) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);
			const resultNodeData = Helpers.getResultNodeData(result, testData);

			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			expect(result.finished).toEqual(true);
		});
	}
});
