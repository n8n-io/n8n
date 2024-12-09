import { mock } from 'jest-mock-extended';
import type { FieldValueOption, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { ExecuteWorkflowTrigger } from './ExecuteWorkflowTrigger.node';
import * as genericFunctions from '../GenericFunctions';

describe('ExecuteWorkflowTrigger', () => {
	it('should return its input data on V1', async () => {
		const mockInputData: INodeExecutionData[] = [
			{ json: { item: 0, foo: 'bar' } },
			{ json: { item: 1, foo: 'quz' } },
		];
		const mockNode = mock<INode>({ typeVersion: 1 });
		const executeFns = mock<IExecuteFunctions>({
			getInputData: () => mockInputData,
			getNode: () => mockNode,
			getNodeParameter: jest.fn(),
		});

		executeFns.getNodeParameter.mockReturnValueOnce('passthrough');
		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
	});

	it('should return transformed input data based on newParams when input source is not passthrough', async () => {
		const mockInputData: INodeExecutionData[] = [
			{ json: { item: 0, foo: 'bar' } },
			{ json: { item: 1, foo: 'quz' } },
		];
		const mockNode = mock<INode>({ typeVersion: 1.1 });
		const executeFns = mock<IExecuteFunctions>({
			getInputData: () => mockInputData,
			getNode: () => mockNode,
			getNodeParameter: jest.fn(),
		});

		executeFns.getNodeParameter.mockReturnValueOnce('usingFieldsBelow');
		const mockNewParams = [
			{ name: 'value1', type: 'string' },
			{ name: 'value2', type: 'number' },
		] as FieldValueOption[];
		const getFieldEntries = jest
			.spyOn(genericFunctions, 'getFieldEntries')
			.mockReturnValue(mockNewParams);
		const getWorkflowInputData = jest
			.spyOn(genericFunctions, 'getWorkflowInputData')
			.mockReturnValue(mockInputData);

		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
		expect(getFieldEntries).toHaveBeenCalledWith(executeFns);
		expect(getWorkflowInputData).toHaveBeenCalledWith(mockInputData, mockNewParams);
	});
});
