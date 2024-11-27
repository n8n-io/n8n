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

const INPUT_SOURCE = 'inputSource';
const FIELDS = 'fields';
const WORKFLOW_INPUTS = 'workflowInputs';
const INPUT_OPTIONS = 'inputOptions';
const VALUES = 'values';
const DEFAULT_PLACEHOLDER = null;

type ValueOptions = { name: string; type: FieldType };

function hasFields(context: IExecuteFunctions, index: number): boolean {
	const inputSource = context.getNodeParameter(INPUT_SOURCE, index) as string;
	if (inputSource === FIELDS) {
		const fields = context.getNodeParameter(`${WORKFLOW_INPUTS}.${VALUES}`, index, []) as Array<{
			name: string;
		}>;
		return fields.length > 0;
	} else {
		return false;
	}
}

function parseJson(_context: IExecuteFunctions, _index: number): ValueOptions[] {
	return [{ name: 'Placeholder', type: 'number' }];
}

function getSchema(context: IExecuteFunctions, index: number): ValueOptions[] {
	const inputSource = context.getNodeParameter(INPUT_SOURCE, index) as string;
	if (inputSource === FIELDS) {
		const fields = context.getNodeParameter(`${WORKFLOW_INPUTS}.${VALUES}`, index, []) as Array<{
			name: string;
			type: FieldType;
		}>;
		return fields;
	} else {
		return parseJson(context, index);
	}
}

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
					'We strongly recommend defining your input fields explicitly. If no inputs are provided, all data from the calling workflow will be available, and issues will be more difficult to debug later on.',
				// keys() on WORKFLOW_INPUTS contains `VALUES` if at least one value is provided
				displayCondition: `={{ $parameter["${INPUT_SOURCE}"] === '${FIELDS}' && !$parameter["${WORKFLOW_INPUTS}"].keys().length  }}`, // TODO json mode condition
				whenToDisplay: 'always',
				location: 'ndv',
			},
		],
		properties: [
			{
				displayName: `When an ‘Execute Workflow’ node calls this workflow, the execution starts here.<br><br>
Specified fields below will be output by this node with values provided by the calling workflow.<br><br>
If you don't provide fields, all data passed into the 'Execute Workflow' node will be passed through instead.`,
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
				displayName: 'Input Source',
				name: INPUT_SOURCE,
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Using fields below',
						value: FIELDS,
						description: 'Provide via UI',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Using JSON',
						value: 'json',
						description: 'Provide via JSON schema',
					},
				],
				default: FIELDS,
				noDataExpression: true,
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
					show: { '@version': [{ _cnd: { gte: 1.1 } }], inputSource: [FIELDS] },
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
								// noDataExpression: true,
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
								] as Array<{ name: string; value: FieldType }>,
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
						// noDataExpression: true,
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
		const inputData = this.getInputData();

		if (this.getNode().typeVersion < 1.1) {
			return [inputData];
		} else {
			if (!hasFields(this, 0)) {
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
					const newParams = getSchema(this, itemIndex);

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
