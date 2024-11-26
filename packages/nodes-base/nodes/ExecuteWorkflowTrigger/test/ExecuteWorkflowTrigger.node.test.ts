import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { ExecuteWorkflowTrigger } from '../ExecuteWorkflowTrigger.node';

describe('ExecuteWorkflowTrigger', () => {
	it('should return its input data', async () => {
		const mockInputData: INodeExecutionData[] = [
			{ json: { item: 0, foo: 'bar' } },
			{ json: { item: 1, foo: 'quz' } },
		];
		const mockNode: INode = { typeVersion: 1 };
		const executeFns = mock<IExecuteFunctions>({
			getInputData: () => mockInputData,
			getNode: () => mockNode,
		});
		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
	});
});
