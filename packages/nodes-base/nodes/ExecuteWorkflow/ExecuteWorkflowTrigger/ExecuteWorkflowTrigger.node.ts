import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	INPUT_SOURCE,
	WORKFLOW_INPUTS,
	JSON_EXAMPLE,
	VALUES,
	INPUT_OPTIONS,
	TYPE_OPTIONS,
	PASSTHROUGH,
} from '../../../utils/workflowInputsResourceMapping/constants';
import {
	getFieldEntries,
	getWorkflowInputData,
} from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

export class ExecuteWorkflowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow Trigger',
		name: 'executeWorkflowTrigger',
		icon: 'fa:sign-out-alt',
		group: ['trigger'],
		version: [1, 1.1],
		description:
			'Helpers for calling other n8n workflows. Used for designing modular, microservice-like workflows.',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'Workflow Input Trigger',
			color: '#ff6d5a',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		hints: [
			{
				message:
					'You need to define your input fields explicitly. Otherwise the parent cannot provide data and you will not receive input data.',
				// This condition checks if we have no input fields, which gets a bit awkward:
				// For WORKFLOW_INPUTS: keys() only contains `VALUES` if at least one value is provided
				// For JSON_EXAMPLE: We remove all whitespace and check if we're left with an empty object. Note that we already error if the example is not valid JSON
				displayCondition:
					`={{$parameter['${INPUT_SOURCE}'] === '${WORKFLOW_INPUTS}' && !$parameter['${WORKFLOW_INPUTS}'].keys().length ` +
					`|| $parameter['${INPUT_SOURCE}'] === '${JSON_EXAMPLE}' && $parameter['${JSON_EXAMPLE}'].toString().replaceAll(' ', '').replaceAll('\\n', '') === '{}' }}`,
				whenToDisplay: 'always',
				location: 'ndv',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'hidden',
				noDataExpression: true,
				options: [
					{
						name: 'Workflow Call',
						value: 'worklfow_call',
						description: 'When called by another workflow using Execute Workflow Trigger',
						action: 'When Called by Another Workflow',
					},
				],
				default: 'worklfow_call',
			},
			{
				displayName: 'Input Source',
				name: INPUT_SOURCE,
				type: 'options',
				options: [
					{
						name: 'Using Fields Below',
						value: WORKFLOW_INPUTS,
						description: 'Provide input fields via UI',
					},
					{
						name: 'Using JSON Example',
						value: JSON_EXAMPLE,
						description: 'Generate a schema from an example JSON object',
					},
					{
						name: 'Using Parent Workflow Data',
						value: PASSTHROUGH,
						description: 'Use all incoming data from the parent workflow',
					},
				],
				default: WORKFLOW_INPUTS,
				noDataExpression: true,
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }] },
				},
			},
			{
				displayName:
					'Provide an example object to infer fields and their types.<br>To allow any type for a given field, set the value to null.',
				name: `${JSON_EXAMPLE}_notice`,
				type: 'notice',
				default: '',
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }], inputSource: [JSON_EXAMPLE] },
				},
			},
			{
				displayName: 'JSON Example',
				name: JSON_EXAMPLE,
				type: 'json',
				default: JSON.stringify(
					{
						aField: 'a string',
						aNumber: 123,
						thisFieldAcceptsAnyType: null,
						anArray: [],
					},
					null,
					2,
				),
				noDataExpression: true,
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }], inputSource: [JSON_EXAMPLE] },
				},
			},
			{
				displayName: 'Workflow Inputs',
				name: WORKFLOW_INPUTS,
				placeholder: 'Add Field',
				type: 'fixedCollection',
				description:
					'Define expected input fields. If no inputs are provided, all data from the calling workflow will be passed through.',
				typeOptions: {
					multipleValues: true,
					sortable: true,
					minRequiredFields: 1,
				},
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }], inputSource: [WORKFLOW_INPUTS] },
				},
				default: {},
				options: [
					{
						name: VALUES,
						displayName: 'Values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. fieldName',
								description: 'Name of the field',
								noDataExpression: true,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'The field value type',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: TYPE_OPTIONS,
								default: 'string',
								noDataExpression: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Input Options',
				name: INPUT_OPTIONS,
				placeholder: 'Options',
				type: 'collection',
				description: 'Options controlling how input data is handled, converted and rejected',
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }] },
				},
				default: {},
				// Note that, while the defaults are true, the user has to add these in the first place
				// We default to false if absent in the execute function below
				options: [
					{
						displayName: 'Attempt to Convert Types',
						name: 'attemptToConvertTypes',
						type: 'boolean',
						default: true,
						description:
							'Whether to attempt conversion on type mismatch, rather than directly returning an Error',
						noDataExpression: true,
					},
					{
						displayName: 'Ignore Type Mismatch Errors',
						name: 'ignoreTypeErrors',
						type: 'boolean',
						default: true,
						description:
							'Whether type mismatches should be ignored, rather than returning an Error',
						noDataExpression: true,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const inputData = this.getInputData();
		const inputSource = this.getNodeParameter(INPUT_SOURCE, 0, PASSTHROUGH) as string;

		if (inputSource === PASSTHROUGH) {
			return [inputData];
		} else {
			const newParams = getFieldEntries(this);

			return [getWorkflowInputData.call(this, inputData, newParams)];
		}
	}
}
