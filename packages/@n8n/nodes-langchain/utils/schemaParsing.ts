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
		const properties = Object.keys(schema.properties as Record<string, JSONSchema7>);
		if (properties.length > 0) {
			schema.required = properties;
		}

		for (const key of properties) {
			const prop = (schema.properties as Record<string, unknown>)[key];
			if (isPropertySchema(prop)) {
				makeAllPropertiesRequired(prop);
			}
		}
	}

	// Handle arrays
	if (schema.type === 'array' && schema.items && isPropertySchema(schema.items)) {
		schema.items = makeAllPropertiesRequired(schema.items);
	}

	return schema;
}

export function generateSchemaFromExample(
	exampleJsonString: string,
	allFieldsRequired = false,
): JSONSchema7 {
	const parsedExample = jsonParse<SchemaObject>(exampleJsonString);

	const generated = generateJsonSchema(parsedExample);

	function isJsonSchema7(value: unknown): value is JSONSchema7 {
		if (!value || typeof value !== 'object') return false;
		// Basic shape checks to avoid unsafe casting
		const obj = value as Record<string, unknown>;
		return 'type' in obj || 'properties' in obj || 'items' in obj || '$schema' in obj;
	}

	if (!isJsonSchema7(generated)) {
		throw new Error('Generated schema is not a valid JSONSchema7');
	}

	const schema = generated;

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
