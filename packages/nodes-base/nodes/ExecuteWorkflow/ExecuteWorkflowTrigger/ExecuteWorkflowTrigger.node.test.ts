import { mock } from 'vitest-mock-extended';
import {
	getNodeParameters,
	getNodeParametersIssues,
	type FieldValueOption,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
} from 'n8n-workflow';

import { ExecuteWorkflowTrigger } from './ExecuteWorkflowTrigger.node';
import { WORKFLOW_INPUTS } from '../../../utils/workflowInputsResourceMapping/constants';
import { getFieldEntries } from '../../../utils/workflowInputsResourceMapping/GenericFunctions';
import type { Mock } from 'vitest';

vi.mock('../../../utils/workflowInputsResourceMapping/GenericFunctions', () => ({
	getFieldEntries: vi.fn(),
	getWorkflowInputData: vi.fn(),
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
		getNodeParameter: vi.fn(),
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
		const getFieldEntriesMock = (getFieldEntries as Mock).mockReturnValue(mockNewParams);

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

	describe('empty workflow input schema', () => {
		it('should pass input data through when the schema defines no fields', async () => {
			// With no fields to map there is nothing to trim the caller's data to, so
			// the documented behaviour is to forward it unchanged.
			executeFns.getNodeParameter.mockReturnValueOnce(WORKFLOW_INPUTS);
			(getFieldEntries as Mock).mockReturnValue({ fields: [] });

			const result = await new ExecuteWorkflowTrigger().execute.call(executeFns);

			expect(result).toEqual([mockInputData]);
		});

		it('should not report parameter issues for a trigger stored with empty parameters', () => {
			// Workflows created through `POST /api/v1/workflows` store nodes with
			// `parameters: {}`. The engine fills in the node defaults before it validates
			// the workflow, so those defaults have to be valid on their own.
			const nodeType = new ExecuteWorkflowTrigger();
			const { version } = nodeType.description;
			const declaredVersions = Array.isArray(version) ? version : [version];

			for (const typeVersion of declaredVersions) {
				const parameters = getNodeParameters(
					nodeType.description.properties,
					{},
					true,
					false,
					{ typeVersion },
					nodeType.description,
				);

				if (typeVersion !== 1) {
					expect(parameters).toMatchObject({
						inputSource: WORKFLOW_INPUTS,
						workflowInputs: {},
					});
				}

				const node = {
					id: '9abdbdac-5f32-4876-b4d5-895d8ca4cb00',
					name: 'When Executed by Another Workflow',
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion,
					position: [0, 0],
					parameters: parameters ?? {},
				} as INode;

				const issues = getNodeParametersIssues(
					nodeType.description.properties,
					node,
					nodeType.description,
				);

				expect(issues, `typeVersion ${typeVersion}`).toBeNull();
			}
		});

		it('should keep reading declared fields as a schema when inputSource was never saved', () => {
			// Triggers written before the input-source dropdown existed can carry
			// `workflowInputs.values` without an `inputSource` key. n8n's activation
			// migration already treats that combination as a real input schema, so the
			// normalized defaults must keep resolving to `workflowInputs`. Defaulting
			// `inputSource` to `passthrough` instead would silently stop filtering the
			// data those workflows declare.
			const nodeType = new ExecuteWorkflowTrigger();
			const parameters = getNodeParameters(
				nodeType.description.properties,
				{ workflowInputs: { values: [{ name: 'city', type: 'string' }] } },
				true,
				false,
				{ typeVersion: 1.1 },
				nodeType.description,
			);

			expect(parameters).toMatchObject({ inputSource: WORKFLOW_INPUTS });
		});
	});
});
