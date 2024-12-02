import { json as generateSchemaFromExample, type SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';
import {
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	validateFieldType,
	type FieldType,
	jsonParse,
} from 'n8n-workflow';

const INPUT_SOURCE = 'inputSource';
const WORKFLOW_INPUTS = 'workflowInputs';
const INPUT_OPTIONS = 'inputOptions';
const VALUES = 'values';
const JSON_EXAMPLE = 'jsonExample';
const TYPE_OPTIONS: Array<{ name: string; value: FieldType | 'any' }> = [
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
];
const SUPPORTED_TYPES = TYPE_OPTIONS.map((x) => x.value);

const DEFAULT_PLACEHOLDER = null;

type ValueOptions = { name: string; type: FieldType | 'any' };

function parseJsonSchema(schema: JSONSchema7): ValueOptions[] | string {
	if (!schema?.properties) {
		return 'Invalid JSON schema. Missing key `properties` in schema';
	}

	if (typeof schema.properties !== 'object') {
		return 'Invalid JSON schema. Key `properties` is not an object';
	}

	const result: ValueOptions[] = [];
	for (const [name, v] of Object.entries(schema.properties)) {
		if (typeof v !== 'object') {
			return `Invalid JSON schema. Value for property '${name}' is not an object`;
		}

		const type = v?.type;

		if (type === 'null') {
			result.push({ name, type: 'any' });
		} else if (Array.isArray(type)) {
			// Schema allows an array of types, but we don't
			return `Invalid JSON schema. Array of types for property '${name}' is not supported by n8n. Either provide a single type or use type 'any' to allow any type`;
		} else if (typeof type !== 'string') {
			return `Invalid JSON schema. Unexpected non-string type ${type} for property '${name}'`;
		} else if (!SUPPORTED_TYPES.includes(type as never)) {
			return `Invalid JSON schema. Unsupported type ${type} for property '${name}'. Supported types are ${JSON.stringify(SUPPORTED_TYPES, null, 1)}`;
		} else {
			result.push({ name, type: type as FieldType });
		}
	}
	return result;
}

function parseJsonExample(context: IExecuteFunctions): JSONSchema7 {
	const jsonString = context.getNodeParameter(JSON_EXAMPLE, 0, '') as string;
	const json = jsonParse<SchemaObject>(jsonString);

	return generateSchemaFromExample(json) as JSONSchema7;
}

function getFieldEntries(context: IExecuteFunctions): ValueOptions[] {
	const inputSource = context.getNodeParameter(INPUT_SOURCE, 0) as string;
	let result: ValueOptions[] | string = 'Internal Error: Invalid input source';
	try {
		if (inputSource === WORKFLOW_INPUTS) {
			result = context.getNodeParameter(`${WORKFLOW_INPUTS}.${VALUES}`, 0, []) as Array<{
				name: string;
				type: FieldType;
			}>;
		} else if (inputSource === JSON_EXAMPLE) {
			const schema = parseJsonExample(context);
			result = parseJsonSchema(schema);
		}
	} catch (e: unknown) {
		result =
			e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
				? e.message
				: `Unknown error occurred: ${JSON.stringify(e)}`;
	}

	if (Array.isArray(result)) {
		return result;
	}
	throw new NodeOperationError(context.getNode(), result);
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
						description: 'Provide via UI',
					},
					{
						name: 'Using JSON Example',
						value: JSON_EXAMPLE,
						description: 'Infer JSON schema via JSON example output',
					},
				],
				default: WORKFLOW_INPUTS,
				noDataExpression: true,
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

		if (this.getNode().typeVersion < 1.1) {
			return [inputData];
		} else {
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
					const newParams = getFieldEntries(this);

					for (const { name, type } of newParams) {
						if (!item.json.hasOwnProperty(name)) {
							newItem.json[name] = DEFAULT_PLACEHOLDER;
							continue;
						}

						const result =
							type === 'any'
								? ({ valid: true, newValue: item.json[name] } as const)
								: validateFieldType(name, item.json[name], type, {
										strict: !attemptToConvertTypes,
										parseStrings: true, // Default behavior is to accept anything as a string, this is a good opportunity for a stricter boundary
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

					items.push(newItem);
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
