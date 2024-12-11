import { json as generateSchemaFromExample, type SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { FieldType, FieldValueOption, IWorkflowNodeContext } from 'n8n-workflow';

// TODO: Export these (consts and functions) so we can reuse in nodes-base
export const INPUT_SOURCE = 'inputSource';
export const WORKFLOW_INPUTS = 'workflowInputs';
export const JSON_EXAMPLE = 'jsonExample';
export const PASSTHROUGH = 'passthrough';
export const VALUES = 'values';
export const TYPE_OPTIONS: Array<{ name: string; value: FieldType | 'any' }> = [
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
		} else if (inputSource === PASSTHROUGH) {
			result = [];
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
