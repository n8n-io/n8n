import {
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	validateFieldType,
	type FieldType,
} from 'n8n-workflow';

const WORKFLOW_INPUTS = 'workflowInputs';
const INPUT_OPTIONS = 'inputOptions';
const VALUES = 'values';

type ValueOptions = { name: string; value: FieldType };

const DEFAULT_PLACEHOLDER = null;

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
								noDataExpression: true,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'The field value type',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: [
									// This is not a FieldType type, but will
									// hit the default case in the type check function
									{
										name: 'Allow Any Type',
										value: 'any',
									},
									{
										name: 'String',
										value: 'string',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'Boolean',
										value: 'boolean',
									},
									{
										name: 'Array',
										value: 'array',
									},
									{
										name: 'Object',
										value: 'object',
									},
									// Intentional omission of `dateTime`, `time`, `string-alphanumeric`, `form-fields`, `jwt` and `url`
								] as ValueOptions[],
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
						description: 'Whether type mismatches should be ignored rather than returning an Error',
						noDataExpression: true,
					},
					// REVIEW: Note that by having this here we commit to passing the binary data
					// to the sub-workflow in the first place, otherwise we'd need this on the parent
					// or at least for the parent to read this from this node.
					// Is there significant cost to switching to the sub-workflow or is it all one big workflow under the hood?
					{
						displayName: 'Include Binary Data',
						name: 'includeBinaryData',
						type: 'boolean',
						default: true,
						description:
							'Whether binary data should be included from the parent. If set to false, binary data will be removed.',
						noDataExpression: true,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		if (!this.getNode()) {
			return [];
		}

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
				const attemptToConvertTypes = this.getNodeParameter(
					`${INPUT_OPTIONS}.attemptToConvertTypes`,
					itemIndex,
					false,
				);
				const ignoreTypeErrors = this.getNodeParameter(
					`${INPUT_OPTIONS}.ignoreTypeErrors`,
					itemIndex,
					false,
				);
				const includeBinaryData = this.getNodeParameter(
					`${INPUT_OPTIONS}.includeBinaryData`,
					itemIndex,
					false,
				);

				// Fields listed here will explicitly overwrite original fields
				const newItem: INodeExecutionData = {
					json: {},
					index: itemIndex,
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
						type: FieldType;
					}>;
					for (const { name, type } of newParams) {
						if (!item.json.hasOwnProperty(name)) {
							newItem.json[name] = DEFAULT_PLACEHOLDER;
							continue;
						}

						// We always parse strings rather than blindly accepting anything as a string
						// Which is the behavior of this function
						// Also note we intentionally pass `any` in here for `type`, which hits a
						// permissive default case in the function
						const result = validateFieldType(name, item.json[name], type, {
							strict: !attemptToConvertTypes,
							parseStrings: true,
						});

						if (!result.valid) {
							if (ignoreTypeErrors) {
								newItem.json[name] = item.json[name];
								continue;
							}

							throw new NodeOperationError(this.getNode(), result.errorMessage, {
								itemIndex,
							});
						} else {
							// If the value is `null` or `undefined`, then `newValue` is not in the returned object
							if (result.hasOwnProperty('newValue')) {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								newItem.json[name] = result.newValue;
							} else {
								newItem.json[name] = item.json[name];
							}
						}
					}

					if (includeBinaryData) {
						// Important not to assign directly to avoid modifying upstream data
						items.push(Object.assign({}, item, newItem));
					} else {
						items.push(newItem);
					}
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
