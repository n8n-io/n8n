import {
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

const WORKFLOW_INPUTS = 'workflowInputs';
const VALUES = 'values';

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
			name: 'Execute Workflow Trigger',
			color: '#ff6d5a',
		},

		inputs: [],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName:
					"When an ‘execute workflow’ node calls this workflow, the execution starts here. Any data passed into the 'execute workflow' node will be output by this node.",
				name: 'notice',
				type: 'notice',
				default: '',
			},
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
				displayName: 'Workflow Inputs',
				name: WORKFLOW_INPUTS,
				placeholder: 'Add Field',
				type: 'fixedCollection',
				description:
					'Define expected input fields. If no inputs are provided, all data from the calling workflow will be passed through.',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }] },
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
							},
							// {
							// 	displayName: 'Type',
							// 	name: 'type',
							// 	type: 'options',
							// 	description: 'The field value type',
							// 	// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
							// 	options: [
							// 		{
							// 			name: 'String',
							// 			value: 'stringValue',
							// 		},
							// 		{
							// 			name: 'Number',
							// 			value: 'numberValue',
							// 		},
							// 		{
							// 			name: 'Boolean',
							// 			value: 'booleanValue',
							// 		},
							// 		{
							// 			name: 'Array',
							// 			value: 'arrayValue',
							// 		},
							// 		{
							// 			name: 'Object',
							// 			value: 'objectValue',
							// 		},
							// 	],
							// 	default: 'stringValue',
							// },
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const inputData = this.getInputData();

		if (this.getNode().typeVersion < 1.1) {
			return [inputData];
		} else {
			// Need to mask type due to bad `getNodeParameter` typing
			const marker = Symbol() as unknown as object;
			const hasFields =
				inputData.length >= 0 &&
				inputData.some(
					(_x, i) => this.getNodeParameter(`${WORKFLOW_INPUTS}.${VALUES}`, i, marker) !== marker,
				);

			if (!hasFields) {
				return [inputData];
			}

			const items: INodeExecutionData[] = [];

			for (const [itemIndex, item] of inputData.entries()) {
				// Fields listed here will explicitly overwrite original fields
				const newItem: INodeExecutionData = {
					json: {},
					// TODO: Ensure we handle sub-execution jumps correctly.
					// metadata: {
					// 	subExecution: {
					// 		executionId: 'uhh',
					// 		workflowId: 'maybe?',
					// 	},
					// },
					pairedItem: { item: itemIndex },
				};
				try {
					const newParams = this.getNodeParameter(
						`${WORKFLOW_INPUTS}.${VALUES}`,
						itemIndex,
						[],
					) as Array<{
						name: string;
					}>;
					for (const { name } of newParams) {
						/** TODO type check goes here */
						newItem.json[name] = name in item.json ? item.json[name] : /* TODO default */ null;
					}

					// TODO Do we want to copy non-json data (e.g. binary) as well?
					items.push(Object.assign({}, item, newItem));
				} catch (error) {
					if (this.continueOnFail()) {
						/** todo error case? */
					} else {
						throw new NodeOperationError(this.getNode(), error, {
							itemIndex,
						});
					}
				}
			}

			return [items];
		}
	}
}
