import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { json as generateJsonSchema } from 'generate-schema';
import type { SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import type { z } from 'zod';

function makeAllPropertiesRequired(schema: JSONSchema7): JSONSchema7 {
	function isPropertySchema(property: unknown): property is JSONSchema7 {
		return typeof property === 'object' && property !== null && 'type' in property;
	}

	// Handle object properties
	if (schema.type === 'object' && schema.properties) {
		const properties = Object.keys(schema.properties);
		if (properties.length > 0) {
			schema.required = properties;
		}

		for (const key of properties) {
			if (isPropertySchema(schema.properties[key])) {
				makeAllPropertiesRequired(schema.properties[key]);
			}
		}
	}

	// Handle arrays
	if (schema.type === 'array' && schema.items && isPropertySchema(schema.items)) {
		schema.items = makeAllPropertiesRequired(schema.items);
	}

	return schema;
}

/**
 * The editor stores these fields as JSON strings, but generated workflows store
 * them as raw objects — the node then hands the object to `JSON.parse`, which
 * throws `'"[object Object]" is not valid JSON'` before the model is ever called.
 */
function asSchemaText(raw: unknown): string {
	if (typeof raw === 'object' && raw !== null) return JSON.stringify(raw);
	// `String()` is what `JSON.parse` already did to a non-string, so every value
	// that parsed before still parses the same way.
	return String(raw);
}

/** `schemaType: 'manual'` counterpart — the field already holds a JSON Schema. */
export function parseJsonSchemaParameter(raw: unknown): JSONSchema7 {
	return jsonParse<JSONSchema7>(asSchemaText(raw));
}

export function generateSchemaFromExample(
	exampleJson: unknown,
	allFieldsRequired = false,
): JSONSchema7 {
	const parsedExample = jsonParse<SchemaObject>(asSchemaText(exampleJson));

	const schema = generateJsonSchema(parsedExample) as JSONSchema7;

	if (allFieldsRequired) {
		return makeAllPropertiesRequired(schema);
	}

	return schema;
}

export function convertJsonSchemaToZod<T extends z.ZodTypeAny = z.ZodTypeAny>(schema: JSONSchema7) {
	return jsonSchemaToZod<T>(schema);
}

export function throwIfToolSchema(ctx: IExecuteFunctions, error: Error) {
	if (error?.message?.includes('tool input did not match expected schema')) {
		throw new NodeOperationError(
			ctx.getNode(),
			`${error.message}.
			This is most likely because some of your tools are configured to require a specific schema. This is not supported by Conversational Agent. Remove the schema from the tool configuration or use Tools agent instead.`,
		);
	}
}
