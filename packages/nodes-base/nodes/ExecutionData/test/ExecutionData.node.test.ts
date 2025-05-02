import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { ExecutionData } from '../ExecutionData.node';

describe('ExecutionData Node', () => {
	it('should return its input data', async () => {
		const mockInputData: INodeExecutionData[] = [
			{ json: { item: 0, foo: 'bar' } },
			{ json: { item: 1, foo: 'quz' } },
		];
		const executeFns = mock<IExecuteFunctions>({
			getInputData: () => mockInputData,
		});
		const result = await new ExecutionData().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
	});
});

describe('ExecutionData -> Should run the workflow', () => {
	new NodeTestHarness().setupTests();
});
