import pickBy from 'lodash/pickBy';
import {
	type INodeExecutionData,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	INPUT_SOURCE,
	WORKFLOW_INPUTS,
	JSON_EXAMPLE,
	VALUES,
	TYPE_OPTIONS,
	PASSTHROUGH,
	FALLBACK_DEFAULT_VALUE,
} from '../../../utils/workflowInputsResourceMapping/constants';
import { getFieldEntries } from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

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
			name: 'When Executed by Another Workflow',
			color: '#ff6d5a',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		hints: [
			{
				message:
					"This workflow isn't set to accept any input data. Fill out the workflow input schema or change the workflow to accept any data passed to it.",
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
						description: 'When executed by another workflow using Execute Workflow Trigger',
						action: 'When executed by Another Workflow',
					},
				],
				default: 'worklfow_call',
			},
			{
				displayName:
					"When an ‘execute workflow’ node calls this workflow, the execution starts here. Any data passed into the 'execute workflow' node will be output by this node.",
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: { '@version': [{ _cnd: { eq: 1 } }] },
				},
			},
			{
				displayName: 'This node is out of date. Please upgrade by removing it and adding a new one',
				name: 'outdatedVersionWarning',
				type: 'notice',
				displayOptions: { show: { '@version': [{ _cnd: { eq: 1 } }] } },
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Input data mode',
				name: INPUT_SOURCE,
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Define using fields below',
						value: WORKFLOW_INPUTS,
						description: 'Provide input fields via UI',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Define using JSON example',
						value: JSON_EXAMPLE,
						description: 'Generate a schema from an example JSON object',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Accept all data',
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
				displayName: 'Workflow Input Schema',
				name: WORKFLOW_INPUTS,
				placeholder: 'Add field',
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
								description:
									'A unique name for this workflow input, used to reference it from another workflows',
								required: true,
								noDataExpression: true,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description:
									"Expected data type for this input value. Determines how this field's values are stored, validated, and displayed.",
								options: TYPE_OPTIONS,
								required: true,
								default: 'string',
								noDataExpression: true,
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const inputData = this.getInputData();
		const inputSource = this.getNodeParameter(INPUT_SOURCE, 0, PASSTHROUGH) as string;

		// Note on the data we receive from ExecuteWorkflow caller:
		//
		// The ExecuteWorkflow node typechecks all fields explicitly provided by the user here via the resourceMapper
		// and removes all fields that are in the schema, but `removed` in the resourceMapper.
		//
		// In passthrough and legacy node versions, inputData will line up since the resourceMapper is empty,
		// in which case all input is passed through.
		// In other cases we will already have matching types and fields provided by the resource mapper,
		// so we just need to be permissive on this end,
		// while ensuring we provide default values for fields in our schema, which are removed in the resourceMapper.

		if (inputSource === PASSTHROUGH) {
			return [inputData];
		} else {
			const newParams = getFieldEntries(this);
			const newKeys = new Set(newParams.fields.map((x) => x.name));
			const itemsInSchema: INodeExecutionData[] = inputData.map(({ json, binary }, index) => ({
				json: {
					...Object.fromEntries(newParams.fields.map((x) => [x.name, FALLBACK_DEFAULT_VALUE])),
					// Need to trim to the expected schema to support legacy Execute Workflow callers passing through all their data
					// which we do not want to expose past this node.
					...pickBy(json, (_value, key) => newKeys.has(key)),
				},
				index,
				binary,
			}));

			return [itemsInSchema];
		}
	}
}
