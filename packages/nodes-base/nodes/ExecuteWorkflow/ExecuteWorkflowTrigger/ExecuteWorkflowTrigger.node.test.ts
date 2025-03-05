import { mock } from 'jest-mock-extended';
import type { FieldValueOption, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { ExecuteWorkflowTrigger } from './ExecuteWorkflowTrigger.node';
import { WORKFLOW_INPUTS } from '../../../utils/workflowInputsResourceMapping/constants';
import { getFieldEntries } from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

jest.mock('../../../utils/workflowInputsResourceMapping/GenericFunctions', () => ({
	getFieldEntries: jest.fn(),
	getWorkflowInputData: jest.fn(),
}));

describe('ExecuteWorkflowTrigger', () => {
	const mockInputData: INodeExecutionData[] = [
		{ json: { item: 0, foo: 'bar' }, index: 0 },
		{ json: { item: 1, foo: 'quz' }, index: 1 },
	];
	const mockNode = mock<INode>({ typeVersion: 1 });
	const executeFns = mock<IExecuteFunctions>({
		getInputData: () => mockInputData,
		getNode: () => mockNode,
		getNodeParameter: jest.fn(),
	});

	it('should return its input data on V1 or V1.1 passthrough', async () => {
		// User selection in V1.1, or fallback return value in V1 with dropdown not displayed
		executeFns.getNodeParameter.mockReturnValueOnce('passthrough');
		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

		expect(result).toEqual([mockInputData]);
	});

	it('should filter out parent input in `Using Fields below` mode', async () => {
		executeFns.getNodeParameter.mockReturnValueOnce(WORKFLOW_INPUTS);
		const mockNewParams: {
			fields: FieldValueOption[];
			noFieldsMessage?: string;
		} = {
			fields: [
				{ name: 'value1', type: 'string' },
				{ name: 'value2', type: 'number' },
				{ name: 'foo', type: 'string' },
			],
		};
		const getFieldEntriesMock = (getFieldEntries as jest.Mock).mockReturnValue(mockNewParams);

		const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);
		const expected = [
			[
				{ index: 0, json: { value1: null, value2: null, foo: mockInputData[0].json.foo } },
				{ index: 1, json: { value1: null, value2: null, foo: mockInputData[1].json.foo } },
			],
		];

		expect(result).toEqual(expected);
		expect(getFieldEntriesMock).toHaveBeenCalledWith(executeFns);
	});
});
