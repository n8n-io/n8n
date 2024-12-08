import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { ExecuteWorkflowTrigger } from '../ExecuteWorkflowTrigger.node';

describe('ExecuteWorkflowTrigger', () => {
	it('should return its input data on V1', async () => {
		const mockInputData: INodeExecutionData[] = [
			{ json: { item: 0, foo: 'bar' } },
			{ json: { item: 1, foo: 'quz' } },
		];
		const mockNode = { typeVersion: 1 } as INode;
		const executeFns = mock<IExecuteFunctions>({
			getInputData: () => mockInputData,
			getNode: () => mockNode,
		});
		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
	});
});
