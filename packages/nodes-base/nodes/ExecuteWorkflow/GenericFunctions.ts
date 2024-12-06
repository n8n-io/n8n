import { json as generateSchemaFromExample, type SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';
import type {
	FieldValueOption,
	FieldType,
	IWorkflowNodeContext,
	INodeExecutionData,
	IExecuteFunctions,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError, validateFieldType } from 'n8n-workflow';

import {
	JSON_EXAMPLE,
	INPUT_SOURCE,
	WORKFLOW_INPUTS,
	VALUES,
	TYPE_OPTIONS,
	INPUT_OPTIONS,
	FALLBACK_DEFAULT_VALUE,
} from './constants';

const SUPPORTED_TYPES = TYPE_OPTIONS.map((x) => x.value);

function parseJsonSchema(schema: JSONSchema7): FieldValueOption[] | string {
	if (!schema?.properties) {
		return 'Invalid JSON schema. Missing key `properties` in schema';
	}

	if (typeof schema.properties !== 'object') {
		return 'Invalid JSON schema. Key `properties` is not an object';
	}

	const result: FieldValueOption[] = [];
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

function parseJsonExample(context: IWorkflowNodeContext): JSONSchema7 {
	const jsonString = context.getNodeParameter(JSON_EXAMPLE, 0, '') as string;
	const json = jsonParse<SchemaObject>(jsonString);

	return generateSchemaFromExample(json) as JSONSchema7;
}

export function getFieldEntries(context: IWorkflowNodeContext): FieldValueOption[] {
	const inputSource = context.getNodeParameter(INPUT_SOURCE, 0);
	let result: FieldValueOption[] | string = 'Internal Error: Invalid input source';
	try {
		if (inputSource === WORKFLOW_INPUTS) {
			result = context.getNodeParameter(
				`${WORKFLOW_INPUTS}.${VALUES}`,
				0,
				[],
			) as FieldValueOption[];
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

export function getWorkflowInputData(
	this: IExecuteFunctions,
	inputData: INodeExecutionData[],
	newParams: FieldValueOption[],
): INodeExecutionData[] {
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
			for (const { name, type } of newParams) {
				if (!item.json.hasOwnProperty(name)) {
					newItem.json[name] = FALLBACK_DEFAULT_VALUE;
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

	return items;
}
