import { mock } from 'jest-mock-extended';
import type { FieldValueOption, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { ExecuteWorkflowTrigger } from './ExecuteWorkflowTrigger.node';
import {
	getFieldEntries,
	getWorkflowInputData,
} from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

jest.mock('../GenericFunctions');

describe('ExecuteWorkflowTrigger', () => {
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

	it('should return its input data on V1', async () => {
		executeFns.getNodeParameter.mockReturnValueOnce('passthrough');
		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
	});

	it('should return transformed input data based on newParams when input source is not passthrough', async () => {
		executeFns.getNodeParameter.mockReturnValueOnce('usingFieldsBelow');
		const mockNewParams = [
			{ name: 'value1', type: 'string' },
			{ name: 'value2', type: 'number' },
		] as FieldValueOption[];
		const getFieldEntriesMock = (getFieldEntries as jest.Mock).mockReturnValue(mockNewParams);
		const getWorkflowInputDataMock = (getWorkflowInputData as jest.Mock).mockReturnValue(
			mockInputData,
		);

		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
		expect(getFieldEntriesMock).toHaveBeenCalledWith(executeFns);
		expect(getWorkflowInputDataMock).toHaveBeenCalledWith(mockInputData, mockNewParams);
	});
});
